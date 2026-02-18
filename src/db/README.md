# IndexedDB cache (Dexie) para conversaciones

Este módulo encapsula la cache local que alimenta el sidebar y la ventana de mensajes. La versión actual prioriza simplicidad, eficiencia y legibilidad:

1. Se muestran conversaciones y mensajes directamente desde la cache local.
2. Guardamos solo los mensajes con `createdAt` en los últimos 14 días. Si una conversación tiene menos de 1.000 mensajes cacheados, el hook solicita al backend todo lo necesario (dentro de la misma ventana) hasta llegar a ese mínimo o agotar el historial disponible.
3. Cada 30 segundos (mientras el módulo esté montado) se dispara una sincronización global: el backend devuelve todos los mensajes de todas las conversaciones producidos en los últimos 30 segundos y el cliente los agrupa y persiste en IndexedDB.
4. El backend solo depende de filtros por `createdAt`, lo que mantiene la consulta muy eficiente sobre el índice existente.

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
- Guarda `lastSync` (timestamp) y el `cursorGlobal` opcional para saber desde cuándo pedir datos en la próxima sincronización global. No hay cursores por conversación, solo se mantiene un marcador general basado en `createdAt`.

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
  - Manejan el `lastSync` global y el cursor basado en `createdAt` para la siguiente sincronización cada 30 segundos.
- `getSyncIntervalMs()` y `getMessageWindowCutoff()` devuelven los valores constantes (30 segundos y 14 días).

## Flujo completo

1. **Inicialización**: al montar `<ConversationsProvider />`, se leen conversaciones desde Dexie para renderizar el sidebar instantáneamente. Si la cache está vacía o hace más de 12 horas que no se sincroniza (`lastSync` ausente), `src/pages/conversaciones.js` muestra un overlay de pantalla completa (“Sincronizando mensajes…”) hasta que llega la primera carga completa.

2. **Selección de conversación**:
   - `useMessagesFetch` muestra los mensajes cacheados (`getCachedMessagesForConversation`) y, en segundo plano, completa los 1.000 registros solicitando al backend los mensajes faltantes dentro de la ventana de 14 días.
   - Esta carga inicial usa `sinceCreatedAt` igual al último mensaje local (o `null` si no hay datos) para evitar volver a traer mensajes viejos.

3. **Sincronización global cada 30 segundos**:
   - Un efecto en el provider ejecuta `setInterval` con `getSyncIntervalMs()` mientras el módulo esté montado.
   - Cada ciclo pide `/conversaciones/sync` con `sinceCreatedAt` igual al máximo entre `lastSync` y `now - 30s`.
   - El backend devuelve todos los mensajes producidos en ese lapso; el cliente los agrupa por conversación y los guarda con `cacheMessages`. Si una conversación está activa, los nuevos mensajes se mezclan sin duplicados para mostrarlos.
   - No se realizan múltiples requests por conversación durante el ciclo: solo una petición global por todas las conversaciones.

4. **Mantenimiento del tamaño**:
   - La sincronización actualiza `syncState` (que incluye `lastSync` y opcionalmente `cursorGlobal`) para controlar desde qué `createdAt` se pide lo siguiente.

5. **Uso de `createdAt` en el backend**:
   - El endpoint `/conversaciones/sync` acepta `sinceCreatedAt` y usa `{ createdAt: { $gte: sinceCreatedAt } }` para aprovechar el índice de `createdAt`.
   - Mantener un cursor global basado en `createdAt` evita tener cursos por conversación y simplifica el código.

Este README complementa el código real: la UI solo necesita un loading global inicial, los hooks reutilizan helpers de Dexie y la sincronización periódica se basa en filtros de `createdAt` para mantener la implementación DRY/SOLID. Si necesitas diagramas o ejemplos adicionales, decímelo y los agrego.
