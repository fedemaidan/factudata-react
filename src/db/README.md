# IndexedDB cache (Dexie) para conversaciones

Este módulo encapsula la cache local que alimenta el sidebar y la ventana de mensajes. Está diseñado para:

1. Traer las conversaciones recientes de forma instantánea (metadata).
2. Mantener solo mensajes de los últimos 14 días.
3. Sincronizar incrementalmente con el backend usando cursores `(createdAt, _id)`.
4. Registrar cuáles conversaciones están "activas" o fueron abiertas recientemente (TTL).

## Esquema

El DB `factudata-conversaciones` tiene tres tablas:

### `conversations`
- Clave primaria `id` (viene del `ultimoMensaje.id_conversacion` o `_id`).
- Indices `updatedAt` y `recentAt` para ordenar la lista y aplicar TTL.
- Se guarda el objeto completo (`empresa`, `profile`, `ultimoMensaje`) para renderizar rápido el sidebar.

### `messages`
- Clave primaria `_id` (o calculada si no existía).
- Índices `conversationId`, `createdAt` y `[conversationId+createdAt]` para paginar por conversación.
- Se almacenan mensajes con `createdAt` dentro de los últimos 14 días. Al insertar se normaliza fecha y `conversationId`.

### `syncState`
- Clave primaria `conversationId`.
- Guarda `cursorCreatedAt`, `cursorId`, `lastSync` (timestamp) y `recentAt` (para saber qué conversaciones se deben sincronizar).

## Funciones principales

- `cacheConversations(conversations) / cacheConversation(conversation)`
  - Convierte los objetos (agrega `id`, `updatedAt`, `recentAt`) y hace `bulkPut`/`put` para mantener el sidebar cacheado.

- `getCachedConversations(limit = 30)`
  - Lee las conversaciones ordenadas por `recentAt` y las entrega al provider al montar.

- `getCachedMessagesForConversation(conversationId, { limit })`
  - Lee los mensajes más recientes para una conversación específica usando el índice compuesto y devuelve los más antiguos primero (ordenado ascendente para renderizar natural).

- `cacheMessages(messages)`
  - Normaliza cada mensaje (`_id`, `conversationId`, `createdAt`) y los inserta/actualiza en la tabla `messages`.

- `deleteOldMessages({ cutoff, conversationId })`
  - Borra mensajes anteriores al `cutoff` (por defecto ahora - 14 días). Si se pasa `conversationId`, limpia solo esa conversación.

- `touchConversation(conversationId)` / `getRecentConversationIds({ limit, ttlMs })`
  - Marca la conversación como reciente y permite recuperar las conversaciones activas para el job de sync periódico.

- `getSyncCursor(conversationId)` / `saveSyncCursor(conversationId, cursor)`
  - Recupera y persiste el cursor `{ createdAt, _id }` que se usa en los `GET /conversaciones/:id?sinceCreatedAt=…&sinceId=…`.

- `getLastSyncTime(conversationId)`
  - Devuelve la última vez que esa conversación se sincronizó para respetar el intervalo de 5 minutos.

- `getSyncIntervalMs()` y `getMessageWindowCutoff()` exportan valores constantes (5 minutos, ventana de 14 días).

## Flujo completo

1. **Inicialización**: al montar el `<ConversationsProvider />`, se llama a `getCachedConversations` para mostrar el sidebar desde la cache antes de que el backend responda. Los callbacks `handleConversationsLoaded` también hacen `cacheConversations` para mantener sincronizada la cache.

2. **Selección de conversación**: 
   - `useMessagesFetch` lee primero `getCachedMessagesForConversation` y muestra esos mensajes.
   - Luego ejecuta `fetchMessages(... sinceCreatedAt, sinceId ...)` con el cursor guardado (`getSyncCursor`). 
   - Los mensajes nuevos se guardan con `cacheMessages` y se actualiza el cursor (`saveSyncCursor`).
   - Cada vez que se selecciona una conversación se llama a `touchConversation` para que el job de sync la tenga en cuenta.

3. **Sincronización periódica**:
   - Un hook en el provider ejecuta un `setInterval` cada `getSyncIntervalMs()` (5 min).
   - Recupera `recentConversationIds` + la conversación activa (`touchConversation` mantiene el set).
   - Para cada conversación que no sincronizó en los últimos 5 min, llama al backend con `sinceCreatedAt`/`sinceId`, guarda los mensajes y actualiza cursor y `lastSync`.
   - Si la conversación era la activa, mezcla los mensajes nuevos con los cargados en memoria usando `filterUniqueMessages`.

4. **Mantenimiento del tamaño**:
   - Cada vez que se insertan mensajes (manual o en sync), se ejecuta `deleteOldMessages` para mantener solo 14 días.
   - La tabla `syncState` retiene el orden y la recencia para limitar el set de sincronización a las últimas 30 conversaciones abiertas.

5. **Uso del cursor en el backend**:
   - Cuando se solicita `/conversaciones/:id` con `sinceCreatedAt` y `sinceId`, el servidor aplica la condición `(createdAt > sinceCreatedAt) OR (createdAt == sinceCreatedAt AND _id > sinceId)` y devuelve el cursor del último mensaje devuelto. Eso permite que Dexie solo solicite incrementalmente lo nuevo, sin recargar toda la ventana cada vez.

Este README puede mantenerse junto al código para que cualquiera entienda cómo interactúan las piezas de la cache local con las llamadas al servidor. Si necesitás ejemplos adicionales (por ejemplo, diagramas o pasos de debugging), avisame y lo agrego. 
