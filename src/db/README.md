# IndexedDB cache (Dexie) para conversaciones

Este módulo encapsula la cache local que alimenta el sidebar y la ventana de mensajes. La versión actual prioriza simplicidad, eficiencia y legibilidad:

1. Se muestran conversaciones y mensajes directamente desde la cache local.
2. Guardamos solo los mensajes con `createdAt` en los últimos 14 días. Si una conversación tiene menos de 1.000 mensajes cacheados, el hook solicita al backend todo lo necesario (dentro de la misma ventana) hasta llegar a ese mínimo o agotar el historial disponible.
3. Cada 30 segundos (mientras el módulo esté montado) se dispara una sincronización global: el backend devuelve todos los mensajes de todas las conversaciones que fueron creados o actualizados en los últimos 30 segundos y el cliente los agrupa y persiste en IndexedDB.
4. El backend depende de filtros por `updatedAt`, lo que permite detectar tanto mensajes nuevos como actualizaciones en mensajes existentes sin perder eficiencia.

## Esquema

El DB `factudata-conversaciones` usa estas tablas:

### `conversations`
- Clave primaria `id` (extraída de los metadatos).
- Almacena metadata completa (`empresa`, `profile`, `ultimoMensaje`, `updatedAt`, etc.) para renderizar el sidebar sin esperar al servidor.

### `messages`
- Clave primaria `_id` (o generada si no existe).
- Índices `conversationId`, `createdAt` y `[conversationId+createdAt]` permiten leer rápido los mensajes recientes de cada conversación.
- Solo se guardan mensajes cuyo `createdAt` cae dentro de los últimos 14 días. Si una conversación queda con menos de 1.000 mensajes almacenados, se piden al backend los registros faltantes hasta completar ese umbral (o agotar la ventana de 14 días) y todo lo recibido se agrupa y guarda en Dexie.

### `syncState`
- Clave primaria `id`.
- Guarda `lastSync` (timestamp) y el `cursorGlobal` opcional para saber desde cuándo pedir datos en la próxima sincronización global. No hay cursores por conversación, solo se mantiene un marcador general basado en `updatedAt`.

## Funciones principales

- `cacheConversations(conversations)` / `cacheConversation(conversation)`
  - Normaliza cada conversación y la guarda para que el sidebar siempre use datos locales.
- `getCachedConversations({ filters, limit = 30 })`
  - Lee conversaciones ordenadas por `updatedAt`, aplica los filtros locales (`estadoCliente`, `empresaId`, `tipoContacto`, rangos de fecha/creación, insights, etc.) y las entrega al provider sin recurrir al backend.
- `getCachedMessagesForConversation(conversationId, { limit })`
  - Recupera mensajes recientes de una conversación. Si hay menos de 1.000 resultados, el hook pide al backend los faltantes (dentro de los últimos 14 días) y los incorpora con `cacheMessages`.
- `cacheMessages(messages, options)`
  - Normaliza y guarda los mensajes. Al recibir la respuesta global de `/conversaciones/sync`, el helper agrupa por `conversationId` y mantiene el índice de 1.000 registros como mínimo por conversación dentro de la ventana.
- `getGlobalSyncTime()` / `saveGlobalSyncTime(timestamp)`
  - Manejan el `lastSync` global y el cursor basado en `updatedAt` para la siguiente sincronización cada 30 segundos.
- `getSyncIntervalMs()` y `getMessageWindowCutoff()` devuelven los valores constantes (30 segundos y 14 días).

## Flujo completo

1. **Inicialización**: al montar `<ConversationsProvider />`, se leen conversaciones desde Dexie para renderizar el sidebar instantáneamente. Si la cache está vacía o hace más de 12 horas que no se sincroniza (`lastSync` ausente), `src/pages/conversaciones.js` muestra un overlay de pantalla completa (“Sincronizando mensajes…”) hasta que llega la primera carga completa.

2. **Selección de conversación**:
   - `useMessagesFetch` muestra los mensajes cacheados (`getCachedMessagesForConversation`) y, en segundo plano, completa los 1.000 registros solicitando al backend los mensajes faltantes dentro de la ventana de 14 días.
   - Esta carga inicial usa `sinceCreatedAt` igual al último mensaje local (o `null` si no hay datos) para evitar volver a traer mensajes viejos.

3. **Sincronización global cada 30 segundos**:
   - Un efecto en el provider ejecuta `setInterval` con `getSyncIntervalMs()` mientras el módulo esté montado.
   - Cada ciclo pide `/conversaciones/sync` con `sinceUpdatedAt` igual al máximo entre `lastSync` y `now - 30s`.
   - El backend devuelve todos los mensajes producidos o actualizados en ese lapso; el cliente los agrupa por conversación y los guarda con `cacheMessages`. Si una conversación está activa, los nuevos mensajes o updates se mezclan sin duplicados para mostrarlos.
   - No se realizan múltiples requests por conversación durante el ciclo: solo una petición global por todas las conversaciones.

4. **Mantenimiento del tamaño**:
   - La sincronización actualiza `syncState` (que incluye `lastSync` y opcionalmente `cursorGlobal`) para controlar desde qué `updatedAt` se pide lo siguiente.

5. **Uso de `updatedAt` en el backend**:
   - El endpoint `/conversaciones/sync` acepta `sinceUpdatedAt` (con fallback a `sinceCreatedAt` para compatibilidad) y usa `{ updatedAt: { $gte: sinceUpdatedAt } }` para aprovechar el índice de `updatedAt`.
   - Mantener un cursor global basado en `updatedAt` evita tener cursos por conversación y simplifica el código, pero ahora también garantiza que las ediciones (notas, insights, etc.) se propagan rápidamente.

6. **Envío de mensajes desde el front**:
   - Al enviar un mensaje la UI hace `POST /conversaciones/message` con `{ userId, message }`. El `userId` puede ser `wPid`, `lid` o el número; el backend normaliza a `@s.whatsapp.net` y verifica que haya texto.
   - El controlador llama a `enviarMensajeService`, guarda el resultado con `saveOutgoingMessage` y devuelve el mensaje persistido (`_id`, `id_conversacion`, `createdAt`, `updatedAt`, `message`, `fromMe`, etc.).
   - El cliente cachea ese mensaje en IndexedDB, actualiza el estado local y dispara inmediatamente el mismo proceso de sincronización global (`/conversaciones/sync` con `sinceUpdatedAt` calculado como si hubieran pasado 30 segundos). Así el historial activo y el sidebar se refrescan antes de que el intervalo automático ocurra.


## Insights y cache

Cuando `showInsight` está activo, la ventana debe mostrar los mensajes que tienen insights, incluso si un script nocturno los marcó después de que se guardaron en IndexedDB.

### Flujo normal (insights en tiempo real)

- El insight se genera junto con el mensaje; el backend actualiza `updatedAt` y `insightId`.
- El sync global de `/conversaciones/sync` trae ese mensaje con `insightId` y `cacheMessages` lo persiste correctamente.
- `patchInsightIdsInCache` no escribe nada porque el mensaje ya lo tenía.

### Flujo excepcional (script nocturno)

- El cron nocturno añade `insightId` a mensajes que ya estaban cacheados, y puede no reescribir `createdAt`, por lo que `cacheMessages` no los vuelve a persisting.
- Al abrir la conversación con `showInsight`, `getInsightMessageIds` devuelve todos los IDs nuevos.
  - `patchInsightIdsInCache(conversationId, ids)` actualiza solo los mensajes existentes en la cache que todavía no tenían `insightId`.
  - `refreshMessagesFromCache()` vuelve a leer la ventana y la UI muestra los insights sin tener que limpiar la cache completa.
- Este patch es idempotente: solo escribe registros que ya existen y carecen del flag. No altera el flujo normal.

### Tips rápidos

- `patchInsightIdsInCache` se exporta desde Dexie y se ejecuta cada vez que se reciben IDs nuevos.
- Solo actualiza mensajes que ya existen en cache y no tienen `insightId`, así que el flujo normal no se ve afectado.

### Filtros de insights y lista de conversaciones

La lista del sidebar usa un flujo híbrido según los filtros activos:

- **Con filtros de insights activos** (`showInsight`, `insightCategory`, `insightTypes`): se llama a `fetchConversations` en el backend. El backend devuelve conversaciones con `insightCount`. Se filtran las que tienen `insightCount > 0`, se cachean y se muestran. El badge de insights en el sidebar usa ese `insightCount`.
- **Sin filtros de insights**: se usa solo `getCachedConversations` (IndexedDB). `filterConversations` aplica el resto de filtros (estado, empresa, fechas, etc.).
- Cuando se cachean conversaciones del backend con insights, `insightCount` se conserva en IndexedDB. Si luego se lee desde cache con `showInsight` activo, `filterConversations` excluye las que tienen `insightCount <= 0`.

Este README complementa el código real: la UI solo necesita un loading global inicial, los hooks reutilizan helpers de Dexie y la sincronización periódica se basa en filtros de `updatedAt` para mantener la implementación DRY/SOLID. Si necesitas diagramas o ejemplos adicionales, decímelo y los agrego.