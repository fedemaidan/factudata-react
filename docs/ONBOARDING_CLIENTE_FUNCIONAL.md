# Onboarding de Clientes & Métricas de Adopción — Documento Funcional

> **Fecha:** Febrero 2026  
> **Estado:** Diseño — Pre-implementación  
> **Objetivo:** Documentar la funcionalidad completa del sistema de onboarding post-venta, métricas de salud por cliente y medición de calidad de interacciones en WhatsApp.

---

## 1. Visión General

### El problema

Hoy no tenemos forma de saber si un cliente que pagó está realmente usando Sorby. Mili y Fala operan a ciegas: entran a mirar empresa por empresa, preguntan por WhatsApp, y reaccionan tarde. No hay datos de adopción por usuario, no hay alertas, no hay un sistema que diga "este cliente se está cayendo".

Además, no sabemos qué pasa dentro de las interacciones de WhatsApp: si el usuario pudo cargar un gasto sin problemas, si tuvo que corregir algo 3 veces, o si terminó cancelando. Esa información es clave para mejorar el producto y para detectar clientes frustrados.

### La solución

Tres sistemas que se complementan:

1. **Onboarding por usuario:** Cada persona en la empresa del cliente tiene un progreso medible por módulo (Caja, Notas, Acopio, etc.). Sabemos exactamente qué hizo y qué le falta.

2. **Salud de empresa:** Un score automático que dice si la empresa está sana, en riesgo o inactiva. Se calcula solo, todos los días.

3. **Calidad de interacciones WhatsApp:** Cada operación que el usuario hace por WhatsApp (cargar gasto, crear nota, etc.) queda registrada con: si arrancó, si terminó, si tuvo que corregir, y cuánto tardó.

---

## 2. Onboarding por Usuario

### Concepto

Cuando una empresa se vuelve cliente, cada usuario que se da de alta recibe un "recorrido" de pasos que debe completar. Los pasos dependen de qué módulos tiene contratados la empresa.

El onboarding no es una pantalla ni un tutorial. Es invisible para el usuario: simplemente registra lo que ya hace naturalmente. Si carga un gasto, se marca. Si entra a la web, se marca. No hay pop-ups, no hay pasos obligatorios.

### Módulos y pasos

#### Módulo Caja (siempre activo)

Es el módulo base. Todo cliente arranca con esto.

| Paso | Qué significa | Peso |
|------|--------------|------|
| Crear un gasto | El usuario cargó al menos 1 gasto (por WhatsApp o por web) | 40% |
| Editar un gasto | El usuario modificó al menos 1 gasto existente | 20% |
| Eliminar un gasto | El usuario eliminó al menos 1 gasto (para que pierda el miedo) | 20% |
| Acceder a la web | El usuario validó su cuenta web y entró al menos 1 vez | 20% |

**Score del módulo** = suma de los pesos de los pasos completados.  
Ejemplo: un usuario que creó y editó pero no eliminó ni entró a la web = 60%.

#### Módulo Nota de Pedido (si está contratado)

| Paso | Qué significa |
|------|--------------|
| Crear o editar 1 nota | El usuario creó o editó al menos una nota de pedido |
| Acceder a la web | Entró a ver notas en la web |

**Criterio:** Todos los usuarios del cliente deben completar ambos pasos.  
**Score** = porcentaje de usuarios que completaron ambos.

#### Módulo Acopio (si está contratado)

| Paso | Qué significa |
|------|--------------|
| Empresa crea 1 acopio | Al menos un acopio creado (esto es a nivel empresa, no usuario) |
| Registrar 1 remito | Cada usuario registra al menos un remito |
| Acceder a la web | Entrar a ver acopios en la web |

**Criterio:** Todos los usuarios deben completar remito + web. El acopio es un piso de empresa.

#### Rol "Toma decisión" (el Dueño, primeros 30 días)

Es independiente del módulo. Mide si la persona que decide está consumiendo la información, no solo cargando datos.

| Paso | Qué significa | Plazo |
|------|--------------|-------|
| Ver la caja | Accedió a la vista de caja en la web | 30 días |
| Crear un filtro | Aplicó al menos 1 filtro para ver datos específicos | 30 días |
| Crear un reporte | Abrió o creó un reporte del módulo de reportes | 30 días |
| Crear un presupuesto | Creó al menos 1 presupuesto de control | 30 días |
| Exportar un PDF | Exportó al menos 1 reporte como PDF | 30 días |

### Score por empresa

El score general de la empresa es el promedio de los scores de todos sus usuarios, ponderado por los módulos que tiene activos.

Si solo tiene Caja:
- 70% peso Caja + 30% peso Toma decisión

Si tiene todo:
- 40% Caja + 15% Notas + 15% Acopio + 30% Toma decisión

### Cómo se ve

En la vista de empresa, el equipo de CS ve:

```
Constructora López          🟡 en riesgo
Cliente hace 12 días        Score general: 45%

── Progreso por módulo ──
Caja          ████████░░░░  60%   (1 de 3 usuarios completo)
Nota Pedido   █████░░░░░░░  50%   (1 de 2 completos)
Acopio        ███░░░░░░░░░  25%   (0 de 2 completos)
Toma decisión ████░░░░░░░░  40%   (2 de 5 pasos)

── Detalle por usuario ──
┌────────────┬──────────┬──────┬────────┬────────┬──────────┐
│ Usuario    │ Rol      │ Caja │ N.Ped. │ Acopio │ Último   │
├────────────┼──────────┼──────┼────────┼────────┼──────────┤
│ Juan Pérez │ Cargador │  80% │  100%  │   50%  │ Hoy      │
│ María Sol  │ Cargador │  40% │    0%  │    0%  │ Hace 5d  │
│ Carlos L.  │ Dueño    │  60% │    —   │    —   │ Hace 3d  │
└────────────┴──────────┴──────┴────────┴────────┴──────────┘

[📩 Enviar recordatorio a María]  [📩 Recordatorio a Carlos]
```

### Reglas importantes

- **Es idempotente:** si un usuario ya completó un paso, no se vuelve a marcar. No importa cuántos gastos cree, el paso "crear gasto" se marca una sola vez.
- **Es invisible:** el usuario no sabe que está siendo trackeado. No hay badges, no hay gamification (por ahora).
- **Es extensible:** cuando se agrega un módulo nuevo, se le agrega automáticamente a los usuarios que corresponda. Los pasos ya completados (como "acceder web") se comparten.

---

## 3. Salud de Empresa (estadoSalud)

### Concepto

Cada empresa tiene un estado de salud que se calcula automáticamente. Es un campo que vive en el sistema y que cualquier dashboard, alerta o automatización puede consumir.

### Estados

| Estado | Significado | Criterio |
|--------|------------|----------|
| 🟢 **onboarding** | Recién arrancó | Es cliente hace menos de 30 días |
| 🟢 **activo** | Usa Sorby regularmente | ≥3 movimientos en 7 días Y ≥50% de usuarios activos |
| 🟡 **en_riesgo** | Bajó el uso | <3 movimientos en 7 días O <30% de usuarios activos O >5 días sin uso |
| 🔴 **inactivo** | No usa | >14 días sin uso |
| ⚫ **churneado** | Se fue | >30 días sin uso O se dio de baja |

### Métricas que alimentan el estado

| Métrica | Qué mide |
|---------|----------|
| Movimientos últimos 7 días | Volumen de uso reciente |
| Días con uso últimos 10 | Frecuencia (¿usa todos los días o 1 día a la semana?) |
| Usuarios activos / Usuarios totales | Ratio de adopción (¿lo usa 1 solo o todo el equipo?) |
| Días sin uso | Cuánto hace que nadie toca Sorby |

### Cómo se usa

- **Dashboard de CS:** ordenar empresas por salud, ver las rojas primero.
- **Alertas automáticas:** cuando una empresa pasa de "activo" a "en riesgo", notificar al equipo.
- **Reporte diario interno:** mensaje al grupo de CS cada mañana con empresas en riesgo.
- **Follow-up automatizado:** disparar nudges por WhatsApp cuando hay inactividad.

---

## 4. Calidad de Interacciones en WhatsApp

### Concepto

Cada vez que un usuario hace una operación por WhatsApp (cargar un gasto, crear una nota de pedido, registrar un remito, etc.), registramos una "sesión de flujo" que captura:

- **¿Arrancó?** — el usuario inició la operación
- **¿Terminó?** — completó la operación con éxito
- **¿Tuvo que corregir?** — el sistema interpretó algo mal y el usuario lo corrigió
- **¿Canceló?** — abandonó la operación antes de terminar
- **¿Cuánto tardó?** — tiempo desde que arrancó hasta que terminó/canceló

### Por qué importa

1. **Detectar usuarios frustrados:** si alguien cancela 3 operaciones seguidas, está teniendo problemas. Deberíamos contactarlo.
2. **Mejorar el producto:** si el 40% de los gastos requieren corrección de "categoría", el prompt de IA está mal.
3. **Medir el onboarding real:** un usuario puede haber "completado" el paso de crear gasto, pero si tardó 10 minutos y corrigió 4 veces, la experiencia fue mala.
4. **Comparar calidad entre empresas/usuarios:** permite detectar patrones (ej: "los usuarios que mandan foto tardan menos que los que mandan texto").

### Qué se registra por sesión

| Campo | Descripción | Ejemplo |
|-------|------------|---------|
| Flujo | Qué operación estaba haciendo | "Crear egreso", "Nota de pedido" |
| Estado | Cómo terminó | completado / cancelado / error / abandonado |
| Duración | Tiempo desde inicio hasta fin | 45 segundos |
| Correcciones | Cuántas veces corrigió algo | 2 |
| Campos corregidos | Qué campos se corrigieron | ["categoría", "total"] |
| Tipo de corrección | Voluntaria (usuario eligió "corregir") o forzada (campo vacío) | voluntaria |
| Origen del input | Cómo envió la información | foto / audio / texto / documento |
| Pasos recorridos | Cuántos pasos del flujo pasó | 4 |

### Flujos que se miden

| Operación | Flujo principal | Resultado exitoso |
|-----------|----------------|------------------|
| Cargar gasto (con archivo) | Enviar imagen/PDF → confirmar | Movimiento creado |
| Cargar gasto (texto/audio) | Enviar texto/audio → confirmar | Movimiento creado |
| Registrar ingreso | Flujo ingreso → confirmar | Ingreso creado |
| Crear nota de pedido | Flujo nota → confirmar | Nota creada |
| Registrar remito/acopio | Flujo remito → confirmar | Remito registrado |
| Editar movimiento existente | Seleccionar → editar → confirmar | Movimiento editado |
| Eliminar movimiento | Seleccionar → confirmar eliminación | Movimiento eliminado |

### Sesión "abandonada"

Si un usuario arrancó un flujo pero nunca lo terminó ni lo canceló (simplemente dejó de responder), la sesión se marca como "abandonada" después de un timeout (ej: 30 minutos sin respuesta dentro del flujo).

### Métricas agregadas

A partir de las sesiones individuales, se calculan métricas agregadas:

#### Por usuario
- **Tasa de éxito:** % de flujos completados vs iniciados
- **Correcciones promedio:** cuántas correcciones necesita por operación
- **Tiempo promedio:** cuánto tarda en completar cada tipo de operación
- **Flujos abandonados:** cuántos dejó a medias

#### Por empresa
- Promedios de todos los usuarios
- Comparación entre usuarios (¿uno es mucho más lento que otro?)
- Evolución en el tiempo (¿mejora o empeora?)

#### Por flujo (para el equipo de producto)
- ¿Qué flujo tiene peor tasa de éxito?
- ¿Qué campo se corrige más?
- ¿Foto vs texto vs audio: cuál genera menos correcciones?

### Cómo se usa

- **En la vista de empresa:** sección "Calidad de uso" con tasa de éxito, correcciones promedio, y flag si hay usuarios con tasa baja.
- **Alertas tempranas:** si un usuario tiene 3 cancelaciones seguidas en 24hs, notificar al equipo.
- **Mejora continua del bot:** reporte semanal interno con los flujos peor rankeados + campos más corregidos.
- **Enriquecer el onboarding:** un usuario con 100% score de onboarding pero 30% tasa de éxito en WhatsApp = necesita ayuda.

---

## 5. Vista de Empresa (Panel de CS)

### Concepto

Cuando el equipo de CS entra a ver un cliente, necesita una sola pantalla que le diga todo: cómo está el onboarding, cuál es el estado de salud, y cómo son las interacciones.

### Secciones de la vista

#### Header
- Nombre de la empresa
- Estado de salud (chip de color)
- Días como cliente
- Score general de onboarding

#### Bloque 1 — Progreso de onboarding
- Barras de progreso por módulo
- Usuarios completos / totales por módulo

#### Bloque 2 — Usuarios
- Tabla con: nombre, teléfono, rol, score por módulo, último uso, tasa de éxito WA
- Botón por usuario: "Enviar recordatorio" (crea un mensaje programado)

#### Bloque 3 — Calidad de interacciones
- Tasa de éxito promedio de la empresa
- Correcciones promedio por operación
- Últimas 5 sesiones de flujo (tipo, resultado, duración, correcciones)
- Flag si hay usuarios con problemas

#### Bloque 4 — Timeline / Historial
- Eventos relevantes: cuándo completó cada paso, cuándo se envió recordatorio, cuándo cambió de estado de salud

### Acciones disponibles
- Enviar recordatorio a usuario específico (WhatsApp)
- Enviar recordatorio masivo a todos los inactivos
- Marcar nota/comentario sobre el cliente
- Forzar recálculo de score (si creen que algo no refleja la realidad)

---

## 6. Reporte Diario Interno (para el equipo de CS)

### Concepto

Cada mañana a las 9am, el equipo recibe un mensaje de WhatsApp en el grupo interno con un resumen accionable.

### Contenido del mensaje

```
📊 Reporte diario — 23 Feb 2026

🔴 EN RIESGO (3 empresas)
• Constructora López — 5 días sin uso, score 45%
• PyME García — Solo 1 usuario activo de 4
• Obras del Sur — 3 cancelaciones seguidas ayer

🟡 ONBOARDING LENTO (2 empresas)
• Estudio Martínez — Día 8, 0 gastos cargados
• Ing. Fernández — Meet fue hace 4 días, nadie validó web

✅ LOGROS
• Transporte Ruiz completó onboarding Caja (100%)
• Arq. Domínguez: el dueño abrió su primer reporte

📌 Pendientes hoy:
• 2 meets agendadas
• 3 usuarios esperando recordatorio pre-meet
```

---

## 7. Flujo completo — Ejemplo de vida real

### Día 0: Se cierra la venta
1. Ventas confirma el cierre y pasa la info a CS: nombre empresa, responsable, 3 usuarios con teléfono y rol.
2. CS carga el cliente en Sorby. Se crean 3 perfiles.
3. **El sistema automáticamente crea el onboarding de cada usuario** con los módulos que correspondan.
4. Score de la empresa: 0%. Estado: `onboarding`.

### Día 0: Mensajes automáticos
5. El bot envía WhatsApp a cada usuario: link de validación web + pedido de 1er gasto.
6. Juan (cargador) manda una foto de factura. El bot la procesa. Juan confirma.
7. **Se registra:** paso "crearGasto" completado para Juan (score Caja: 40%). Sesión de flujo: completada, 0 correcciones, 38 segundos.

### Día 1: Antes de la meet
8. María no hizo nada. El sistema muestra en la vista de empresa: María = 0%.
9. CS toca "Enviar recordatorio" → le llega un mensaje personalizado.
10. María manda un gasto por texto. El bot lo interpreta mal (categoría incorrecta). María corrige.
11. **Se registra:** paso "crearGasto" completado para María (score Caja: 40%). Sesión de flujo: completada, 1 corrección (campo: categoría), 2 minutos.

### Día 3: Meet
12. En la meet, el equipo muestra cómo editar y eliminar. Juan edita un gasto en vivo.
13. **Se registra:** paso "editarGasto" completado para Juan (score Caja: 60%).

### Día 5: Post-meet
14. Carlos (dueño) entra a la web por primera vez.
15. **Se registra:** paso "accederWeb" completado para Carlos (score Caja de Toma decisión avanza).
16. María sigue sin validar web. Score empresa: 50%. Estado: `onboarding` (aún en los primeros 30 días).

### Día 12: Alerta
17. Nadie cargó gastos en los últimos 5 días.
18. **El estado pasa a `en_riesgo`.**
19. En el reporte diario: "Constructora López — 5 días sin uso, score 50%".
20. CS contacta al responsable.

---

## 8. Plan de Implementación por Olas

### Ola 1 — Fundamentos (Semana 1)
- Score de salud de empresa (cálculo automático)
- Onboarding por usuario (solo Caja)
- Vista individual de empresa (con progreso + usuarios)
- Botón "enviar recordatorio"
- Reporte diario interno al equipo

### Ola 2 — Automatizaciones core (Semana 2-3)
- Follow-up automático post-venta (cadena de eventos)
- Mensajes automáticos a usuarios nuevos
- PDF resumen semanal al dueño
- Nudge automático a inactivos
- Registro de calidad de interacciones WhatsApp (sesiones de flujo)

### Ola 3 — Expansión (Semana 4+)
- Onboarding para Notas de Pedido y Acopio
- Onboarding rol "Toma decisión"
- Score de salud ponderado con tendencia
- Dashboard matutino para CS
- Métricas agregadas de calidad de interacciones

---

## 9. Métricas de éxito del proyecto

¿Cómo sabemos que esto funciona?

| Métrica | Hoy | Objetivo 90 días |
|---------|-----|-------------------|
| % clientes que completan onboarding Caja en 10 días | No se mide | >70% |
| Tiempo promedio de activación (de venta a 3 gastos) | No se mide | <7 días |
| % clientes en estado "activo" al día 30 | No se mide | >60% |
| Tasa de éxito de flujos WhatsApp | No se mide | >80% |
| Correcciones promedio por operación | No se mide | <0.5 |
| Churn mensual | ~X% (estimado) | Reducir 30% |
