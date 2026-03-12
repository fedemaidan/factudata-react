# Proyecto Activación & Retención — Documento Funcional

> **Fecha:** Febrero 2026  
> **Autores:** Federico Maidan, Facundo Ferro  
> **Estado:** En desarrollo — Iteración continua  
> **Scope:** Activación post-venta y retención de clientes. Adquisición/SDR comercial queda fuera de scope (tiene documentación propia).

---

## Índice

1. [Visión General](#1-visión-general)
2. [Mapa del Ciclo de Vida del Cliente](#2-mapa-del-ciclo-de-vida-del-cliente)
3. [Eje 1 — Activación (Onboarding Post-Venta)](#3-eje-1--activación-onboarding-post-venta)
4. [Eje 2 — Retención y Salud de Empresa](#4-eje-2--retención-y-salud-de-empresa)
5. [Eje 3 — Calidad de Interacciones en WhatsApp](#5-eje-3--calidad-de-interacciones-en-whatsapp)
6. [Eje 4 — Automatizaciones y Comunicación Proactiva](#6-eje-4--automatizaciones-y-comunicación-proactiva)
7. [Eje 5 — Reportes y Valor Recurrente](#7-eje-5--reportes-y-valor-recurrente)
8. [Vista Unificada de Empresa (Panel CS)](#8-vista-unificada-de-empresa-panel-cs)
9. [Reporte Diario Interno](#9-reporte-diario-interno)
10. [Ejemplo End-to-End: Vida de un Cliente](#10-ejemplo-end-to-end-vida-de-un-cliente)
11. [Plan de Implementación por Olas](#11-plan-de-implementación-por-olas)
12. [Métricas de Éxito](#12-métricas-de-éxito)

---

## 1. Visión General

### El problema

Sorby es un SaaS para empresas de construcción y PyMEs que gestiona caja, compras y materiales a través de WhatsApp y una plataforma web. Tenemos un producto que resuelve problemas reales, pero nos faltan los sistemas para:

1. **Asegurar la activación:** Un cliente que paga no necesariamente usa. Mili y Fala entran empresa por empresa a ver si hay movimientos. No hay datos de adopción por usuario.
2. **Detectar churn antes de que pase:** No hay alertas. Se enteran de que un cliente dejó de usar cuando ya lleva semanas sin entrar.
3. **Medir la calidad de la experiencia:** Si un usuario manda una foto y tiene que corregir 4 veces, es una señal de que algo no funciona. Hoy no tenemos esa data.
4. **Generar valor recurrente:** El usuario carga datos pero no ve retorno. Necesitamos que la plataforma le devuelva información útil (reportes, presupuestos vs ejecutado, alertas).
5. **Automatizar la comunicación proactiva:** Todo lo que CS hace hoy es manual: mandar recordatorios, hacer follow-up, avisar que hay una meet. No escala.

### La solución

Un sistema integral de activación y retención organizado en **5 ejes** que cubren el ciclo de vida del cliente desde la venta en adelante:

| Eje | Nombre | Qué resuelve |
|-----|--------|-------------|
| 1 | Activación (Onboarding Post-Venta) | Que cada usuario haga los pasos clave para experimentar el valor |
| 2 | Retención y Salud de Empresa | Detectar riesgo de churn antes de que pase |
| 3 | Calidad de Interacciones WhatsApp | Medir la experiencia real del usuario operación por operación |
| 4 | Automatizaciones y Comunicación Proactiva | Nudges, recordatorios, cadencias sin intervención manual |
| 5 | Reportes y Valor Recurrente | Que el producto devuelva información útil que genere dependencia |

> **Nota:** La adquisición y calificación de leads (SDR comercial) tiene su documentación propia en [SDR-COMERCIAL-FUNCIONAL.md](SDR-COMERCIAL-FUNCIONAL.md).

### Principios

- **Invisible para el usuario.** No hay pop-ups, no hay tutoriales forzados. Trackeamos lo que ya hace naturalmente.
- **Accionable para CS.** Cada dato produce una acción concreta: llamar, mandar mensaje, agendar meet.
- **Automatizado primero.** Si algo se puede automatizar, se automatiza. El equipo humano interviene solo donde aporta valor.
- **Datos, no intuición.** Cada decisión de CS se basa en un score, un estado o una métrica, no en "me parece que este cliente no está usando".

---

## 2. Mapa del Ciclo de Vida del Cliente

Este documento cubre desde que el cliente paga en adelante:

```
                          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                          │             │    │             │    │             │
   Venta cerrada ────────▶│  CLIENTE    │───▶│  CLIENTE    │───▶│  EXPANSION  │
                          │  ACTIVANDO  │    │  ACTIVO     │    │  / UPSELL   │
                          │  (30 días)  │    │             │    │             │
                          └──────┬──────┘    └──────┬──────┘    └─────────────┘
                                 │                  │
                                 │ ◄── Eje 1+2 ──► │ ◄── Eje 2+4+5 ──►
                                 │                  │
                                 ▼                  ▼
                             No adopta          Churn
                             (sin tracking)     (sin alertas)

            ◄─── Eje 3 (Calidad WhatsApp): transversal a todo ────►
            ◄─── Eje 4 (Automatizaciones): transversal a todo ────►
```

---

## 3. Eje 1 — Activación (Onboarding Post-Venta)

### Problema que resuelve

Un cliente pagó, pero ¿está usando? ¿Todos los usuarios de la empresa están operando o solo el dueño que tuvo la meet? Hoy no hay forma de saberlo sin mirar empresa por empresa manualmente.

### La solución: Onboarding por usuario por módulo

Cada persona en la empresa del cliente tiene un "recorrido" de pasos por módulo. Es invisible: registra lo que ya hace naturalmente. Si carga un gasto, se marca. Si entra a la web, se marca.

### Módulos y pasos

#### Módulo Caja (siempre activo — arrancamos con este)

| Paso | Qué significa | Peso |
|------|--------------|------|
| Crear un gasto | Cargó al menos 1 gasto (por WhatsApp o web) | 40% |
| Editar un gasto | Modificó al menos 1 gasto existente | 20% |
| Eliminar un gasto | Eliminó al menos 1 gasto (para que pierda el miedo) | 20% |
| Acceder a la web | Validó su cuenta web y entró al menos 1 vez | 20% |

**Score del módulo** = suma ponderada de pasos completados.  
Ejemplo: creó y editó pero no eliminó ni entró a la web = 60%.

#### Módulo Nota de Pedido (si está contratado)

| Paso | Qué significa |
|------|--------------|
| Crear o editar 1 nota | Creó o editó al menos una nota de pedido |
| Acceder a la web | Entró a ver notas en la web |

Criterio: todos los usuarios deben completar ambos pasos.

#### Módulo Acopio (si está contratado)

| Paso | Qué significa |
|------|--------------|
| Empresa crea 1 acopio | Al menos un acopio creado (nivel empresa) |
| Registrar 1 remito | Cada usuario registra al menos un remito |
| Acceder a la web | Entrar a ver acopios en la web |

#### Rol "Toma Decisión" (el Dueño, primeros 30 días)

Independiente del módulo. Mide si la persona que decide está consumiendo la información.

| Paso | Qué significa | Plazo |
|------|--------------|-------|
| Ver la caja | Accedió a la vista de caja en la web | 30 días |
| Crear un filtro | Aplicó al menos 1 filtro | 30 días |
| Crear un reporte | Abrió o creó un reporte | 30 días |
| Crear un presupuesto | Creó al menos 1 presupuesto de control | 30 días |
| Exportar un PDF | Exportó al menos 1 reporte como PDF | 30 días |

### Score por empresa

Promedio ponderado de scores de todos los usuarios, ponderado por módulos activos:

- **Solo Caja:** 70% Caja + 30% Toma Decisión
- **Todo activo:** 40% Caja + 15% Notas + 15% Acopio + 30% Toma Decisión

### Reglas importantes

- **Idempotente:** si un usuario ya completó un paso, no se vuelve a marcar. No importa cuántos gastos cree.
- **Invisible:** el usuario no sabe que está siendo trackeado.
- **Extensible:** cuando se agrega un módulo, se le agrega automáticamente a los usuarios que corresponda.

### Estado actual

| Componente | Estado |
|-----------|--------|
| Modelo de datos en MongoDB | ✅ Implementado |
| Servicio de tracking (módulo Caja) | ✅ Implementado |
| Hooks en operaciones de caja | ✅ Implementado |
| Sync de scores a Firestore | ✅ Implementado |
| Hook de acceso web (caja, notas, acopio) | ✅ Implementado (`useTrackPrimeraVisita`) |
| Módulos Nota Pedido / Acopio | ✅ Implementado (config + hooks) |
| Módulo TomaDecisión | 📋 Diseñado, por implementar |
| Creación automática al agregar usuario (desde la web) | ✅ Implementado (`onboardingCreaInicio` + `POST /onboarding/iniciar-usuario`) |
| Notificación de progreso por WhatsApp | ✅ Implementado (tras cada paso) |
| Comando "mi progreso" en bot WhatsApp | ✅ Implementado (`VER_MI_PROGRESO`) |
| Vista en frontend (OnboardingProgress) | ✅ Implementado (en cajaSimple y cajaProyecto) |
| Endpoint progreso (`GET /onboarding/:profileId/progreso`) | ✅ Implementado |

---

## 4. Eje 2 — Retención y Salud de Empresa

### Problema que resuelve

No hay un sistema que diga "este cliente se está cayendo". CS se entera tarde, cuando el cliente ya lleva semanas sin usar.

### La solución: Estado de salud automático

Cada empresa tiene un estado de salud que se calcula todos los días a las 6am. Cualquier dashboard, alerta o automatización lo consume.

### Estados

| Estado | Ícono | Significado | Criterio |
|--------|-------|------------|----------|
| onboarding | 🟢 | Recién arrancó | Es cliente hace < 30 días |
| activo | 🟢 | Usa regularmente | ≥50% usuarios activos Y ≥50% pasó de paso 2 de onboarding |
| en_riesgo | 🟡 | Bajó el uso | <30% usuarios activos O >5 días sin uso O ≥50% no pasó de paso 1 |
| inactivo | 🔴 | No usa | >14 días sin uso |
| churneado | ⚫ | Se fue | >30 días sin uso O se dio de baja |

### Métricas que alimentan el estado

| Métrica | Qué mide | Fuente |
|---------|----------|--------|
| Movimientos últimos 7 días | Volumen de uso reciente | Firestore (movimientos) |
| Ratio usuarios activos | % que usaron en últimos 7 días vs total | Analytics existente |
| Días sin uso | Cuánto hace que nadie toca Sorby | Analytics existente |
| Ratio onboarding paso 2+ | % de usuarios que pasaron del paso 1 | Onboarding service |

### Transiciones y alertas

Cuando una empresa cambia de estado, se dispara una acción:

| Transición | Acción |
|-----------|--------|
| onboarding → en_riesgo | ⚠️ Notificación urgente a CS |
| activo → en_riesgo | ⚠️ Notificación a CS + nudge automático a usuario inactivo |
| en_riesgo → inactivo | 🔴 Escalado: el responsable de CS recibe alerta personal |
| inactivo → churneado | ⚫ Se marca para análisis post-mortem |
| en_riesgo → activo | ✅ Se desactivan nudges, se registra recuperación |

### Estado actual

| Componente | Estado |
|-----------|--------|
| Métricas base en analyticsService | ✅ Implementado |
| Modelo EstadoSaludEmpresa | ✅ Implementado |
| Cálculo de estadoSalud + cron diario (6am) | ✅ Implementado |
| Alertas de transición por WhatsApp a grupo CS | ✅ Implementado (3 transiciones con mensaje real) |
| Reporte diario interno (9am) | ✅ Implementado |

---

## 5. Eje 3 — Calidad de Interacciones en WhatsApp

### Problema que resuelve

No sabemos qué pasa dentro de las interacciones. Un usuario puede haber "completado" la carga de un gasto, pero si tardó 10 minutos y corrigió 4 veces, la experiencia fue mala. Si el 40% de los gastos requieren corrección de categoría, el prompt de IA está mal.

### La solución: Sesiones de flujo

Cada operación que el usuario hace por WhatsApp se registra como una "sesión de flujo":

| Campo | Descripción | Ejemplo |
|-------|------------|---------|
| Flujo | Qué operación hacía | "Crear egreso", "Nota de pedido" |
| Estado | Cómo terminó | completado / cancelado / error / abandonado |
| Duración | Tiempo inicio a fin | 45 segundos |
| Correcciones | Cuántas veces corrigió | 2 |
| Campos corregidos | Qué campos | ["categoría", "total"] |
| Tipo de corrección | Voluntaria vs forzada | voluntaria |
| Origen del input | Cómo envió la info | foto / audio / texto / documento |

### Flujos que se miden

| Operación | Resultado exitoso |
|-----------|------------------|
| Cargar gasto (con imagen/PDF) | Movimiento creado |
| Cargar gasto (texto/audio) | Movimiento creado |
| Registrar ingreso | Ingreso creado |
| Crear nota de pedido | Nota creada |
| Registrar remito/acopio | Remito registrado |
| Editar movimiento | Movimiento editado |
| Eliminar movimiento | Movimiento eliminado |

### Sesión "abandonada"

Si un usuario arrancó un flujo pero nunca lo terminó ni lo canceló, se marca como "abandonada" después de 30 minutos sin respuesta.

### Métricas agregadas

**Por usuario:**
- Tasa de éxito (% flujos completados vs iniciados)
- Correcciones promedio por operación
- Tiempo promedio por tipo de operación
- Flujos abandonados

**Por empresa:**
- Promedios de todos los usuarios
- Comparación entre usuarios (¿uno es mucho más lento?)
- Evolución en el tiempo

**Por flujo (para el equipo de producto):**
- ¿Qué flujo tiene peor tasa de éxito?
- ¿Qué campo se corrige más?
- ¿Foto vs texto vs audio: cuál genera menos correcciones?

### Cómo se usa

- **En la vista de empresa:** sección "Calidad de uso" con tasa de éxito y flags de usuarios con problemas
- **Alertas tempranas:** 3 cancelaciones seguidas en 24h → notificación al equipo
- **Mejora continua:** reporte semanal con flujos peor rankeados + campos más corregidos
- **Enriquecer onboarding:** un usuario con 100% score de onboarding pero 30% tasa de éxito WA = necesita ayuda

### Estado actual

| Componente | Estado |
|-----------|--------|
| Todo | 📋 Diseñado, por implementar |

---

## 6. Eje 4 — Automatizaciones y Comunicación Proactiva

### Problema que resuelve

Todo lo que CS hace hoy es manual: mandar recordatorios, hacer follow-up, avisar que hay una meet, etc. No escala.

### La solución: Capas de automatización

#### Capa 1 — Cadena de eventos post-venta (13 automatizaciones)

Secuencia automática de mensajes al nuevo cliente organizada en 6 etapas:

**Etapa 1 — Bienvenida (Día 0)**

| # | Trigger | Acción |
|---|---------|--------|
| A1 | Se crea la empresa como cliente | Bienvenida + link validación web a cada usuario |
| A2 | Se crea la empresa como cliente | Instrucción: "Mandame una foto de alguna factura para probar" |

**Etapa 2 — Primeras 48h (Día 1-2)**

| # | Trigger | Acción |
|---|---------|--------|
| A3 | Si nadie cargó gasto al día 1 | Recordatorio amigable: "¿Probaste mandar una foto de factura?" |
| A4 | Si usuario cargó gasto y no validó web | "Ahora entrá a la web para ver tus gastos: [link]" |

**Etapa 3 — Pre-meet (Día 2-3)**

| # | Trigger | Acción |
|---|---------|--------|
| A5 | Meet agendada en 24h | Recordatorio a cada usuario: "Mañana meet, preparate tus dudas" |
| A6 | Meet agendada en 24h + nadie cargó gasto | Recordatorio urgente: "Cargá al menos 1 gasto antes de la meet" |

**Etapa 4 — Post-meet (Día 3-5)**

| # | Trigger | Acción |
|---|---------|--------|
| A7 | Meet se realizó | Resumen de lo que se vio + "¿Pudieron probar lo que vimos?" |
| A8 | 2 días post-meet sin actividad nueva | "¿Necesitan una mano con algo de lo que vimos?" |

**Etapa 5 — Seguimiento primera semana (Día 7-14)**

| # | Trigger | Acción |
|---|---------|--------|
| A9 | Score onboarding < 50% al día 7 | Nudge personalizado según lo que falta al usuario |
| A10 | Si estado = en_riesgo al día 14 | Alerta a CS para contacto directo |

**Etapa 6 — Evaluación y refuerzo (Día 21-30)**

| # | Trigger | Acción |
|---|---------|--------|
| A11 | Sigue en_riesgo al día 21 | Segundo contacto de CS + propuesta de re-onboarding |
| A12 | Evaluación al día 30, score < 30% | Marcar para análisis de churn |
| A13 | Evaluación al día 30, score ≥ 70% | Mensaje de felicitación + sugerencia de siguiente módulo |

#### Capa 2 — Nudges inteligentes (por evento)

Mensajes automáticos reactivos (no en cadena, sino disparados por un evento):

| Evento | Nudge | Destino |
|--------|-------|---------|
| Usuario no usa hace 5 días | "¡Hola [nombre]! ¿Necesitás una mano con algo?" | Al usuario |
| Usuario completó onboarding Caja | "🎉 Completaste todos los pasos de Caja. ¿Sabías que podés ver reportes?" | Al usuario |
| Empresa pasa a "activo" | Mensaje de felicitación al dueño | Al dueño |
| 3 cancelaciones seguidas en WA | "Este usuario tuvo problemas" | A CS (no al usuario) |
| Dueño no entró a la web en 10 días | Recordatorio con link directo | Al dueño |
| Nuevo usuario dado de alta | Bienvenida + instrucciones básicas | Al nuevo usuario |
| Usuario con tasa éxito WA < 50% | "Agendemos una call de ayuda" | A CS para intervenir |

#### Capa 3 — Mensajes al dueño con valor

Mensajes periódicos que muestran el valor de Sorby:

| Frecuencia | Contenido |
|-----------|-----------|
| Semanal | "Esta semana tu equipo cargó 23 gastos por $X. [Ver resumen →]" |
| Mensual | PDF resumen del mes con totales, por obra, por categoría |
| Eventual | "Tu presupuesto de [obra] está al 85% de ejecución ⚠️" |

### Infraestructura existente

Todo esto se apoya en dos componentes ya implementados:
- **Follow-up service:** Motor de cadenas de eventos con acciones configurables
- **Mensajes programados:** Envío diferido con soporte Meta API + Baileys, ventana 24h, templates, adjuntos

### Estado actual

| Componente | Estado |
|-----------|--------|
| Follow-up de leads (cadena de eventos) | ✅ Implementado |
| Envío diferido (mensajes programados) | ✅ Implementado |
| Función respuestaConIA | ✅ Implementado |
| Cadena post-venta (13 automatizaciones) | ✅ Implementado |
| Creación automática cadena + bienvenida al agregar usuario | ✅ Implementado (`onboardingCreaInicio` + `POST /onboarding/iniciar-usuario`) |
| Nudges inteligentes | ✅ Implementado |
| Mensajes de valor al dueño (semanal + mensual) | ✅ Implementado |
| Resumen mensual (ventana rolling 30 días) | ✅ Implementado (`getResumenMensual`) |
| PDF resumen mensual | 📋 Diseñado (infraestructura PDF existe) |

---

## 7. Eje 5 — Reportes y Valor Recurrente

### Problema que resuelve

El usuario carga datos en Sorby pero no recibe nada a cambio. Los reportes que necesita se los hace soporte manualmente en Excel (~5 por semana). Si el usuario no ve valor de retorno, no hay razón para seguir cargando.

### La solución: Reportes auto-actualizados + presupuestos con tracking

#### Reportes configurables (diseñado)

4 templates pre-armados listos para usar:

| Template | Qué muestra |
|----------|------------|
| Estado de Obra | Gastos por categoría, evolución mensual, totales — para una obra específica |
| Caja General | Ingresos vs egresos, saldo, evolución — todas las obras |
| Resumen por Proveedor | Gasto acumulado por proveedor, ranking, facturas pendientes |
| Evolución Mensual | Tendencia mes a mes, comparativos, estacionalidad |

- Motor de cómputo frontend
- Filtros interactivos (fecha, obra, categoría, proveedor)
- Multi-moneda (ARS/USD/CAC con indexación)
- Exportación XLSX
- Futuro: reportes programados por email/WA

#### Presupuestos con ejecución real (implementado)

Los presupuestos de control vinculados a proyectos calculan automáticamente el `ejecutado` desde los movimientos reales:

```
Presupuesto: Obra Torre Norte
├── Estructura:     $5.000.000  │  Ejecutado: $4.200.000 (84%) ✅
├── Sanitaria:      $2.000.000  │  Ejecutado: $2.100.000 (105%) ⚠️ SOBREEJECUCIÓN
├── Eléctrica:      $1.500.000  │  Ejecutado:   $800.000 (53%) ✅
└── TOTAL:          $8.500.000  │  Ejecutado: $7.100.000 (84%) ✅
```

Esto genera un loop de engagement: cada gasto que carga actualiza el presupuesto, lo que motiva a seguir cargando.

#### Portal Cliente (implementado con datos mock)

Portal web para clientes finales de las empresas que usan Sorby. Accesible por link único sin login. Muestra estado de contrato, cuotas, servicios, documentos.

- Feature diferenciador para constructoras/desarrolladoras
- Genera dependencia: si la empresa usa el portal para sus clientes, no puede dejar Sorby fácilmente
- Reduce carga de atención al cliente para la empresa

### Estado actual

| Componente | Estado |
|-----------|--------|
| Presupuestos profesionales | ✅ En producción |
| Presupuestos de control con ejecución real | ✅ En producción |
| Portal cliente | 🟡 Implementado con datos mock |
| Módulo de reportes | 📋 Completamente diseñado, por implementar |
| Reportes programados | 📋 Diseñado (V2) |
| PDF resumen mensual | 📋 Por implementar (generación PDF existe) |

---

## 8. Vista Unificada de Empresa (Panel CS)

### Concepto

Cuando el equipo de CS entra a ver un cliente, necesita UNA sola pantalla que le diga todo.

### Secciones

#### Header
- Nombre de la empresa
- Estado de salud (chip de color: 🟢🟡🔴⚫)
- Días como cliente
- Score general de onboarding

#### Bloque 1 — Progreso de onboarding
- Barras de progreso por módulo
- Usuarios completos / totales por módulo

```
── Progreso por módulo ──
Caja          ████████░░░░  60%   (1 de 3 usuarios completo)
Nota Pedido   █████░░░░░░░  50%   (1 de 2 completos)
Acopio        ███░░░░░░░░░  25%   (0 de 2 completos)
Toma decisión ████░░░░░░░░  40%   (2 de 5 pasos)
```

#### Bloque 2 — Usuarios

```
┌────────────┬──────────┬──────┬────────┬──────────┬───────────┐
│ Usuario    │ Rol      │ Caja │ N.Ped. │ Último   │ Éxito WA  │
├────────────┼──────────┼──────┼────────┼──────────┼───────────┤
│ Juan Pérez │ Cargador │  80% │  100%  │ Hoy      │ 92%       │
│ María Sol  │ Cargador │  40% │    0%  │ Hace 5d  │ 60% ⚠️    │
│ Carlos L.  │ Dueño    │  60% │    —   │ Hace 3d  │ —         │
└────────────┴──────────┴──────┴────────┴──────────┴───────────┘

[📩 Enviar recordatorio a María]  [📩 Recordatorio a Carlos]
```

#### Bloque 3 — Calidad de interacciones
- Tasa de éxito promedio
- Correcciones promedio por operación
- Últimas 5 sesiones de flujo (tipo, resultado, duración, correcciones)
- Flag si hay usuarios con problemas

#### Bloque 4 — Timeline / Historial
- Eventos relevantes: cuándo completó cada paso, cuándo se envió recordatorio, cuándo cambió de estado

### Acciones disponibles
- Enviar recordatorio a usuario específico (WhatsApp)
- Enviar recordatorio masivo a todos los inactivos
- Marcar nota/comentario
- Forzar recálculo de score
- Agendar meet de re-onboarding

---

## 9. Reporte Diario Interno

### Concepto

Cada mañana a las 9am, el equipo recibe un mensaje de WhatsApp en el grupo interno:

```
📊 Reporte diario — 24 Feb 2026

🔴 EN RIESGO (3 empresas)
• Constructora López — 5 días sin uso, score 45%
• PyME García — Solo 1 usuario activo de 4
• Obras del Sur — 3 cancelaciones seguidas ayer en WA

🟡 ONBOARDING LENTO (2 empresas)
• Estudio Martínez — Día 8, 0 gastos cargados
• Ing. Fernández — Meet fue hace 4 días, nadie validó web

✅ LOGROS
• Transporte Ruiz completó onboarding Caja (100%)
• Arq. Domínguez: el dueño abrió su primer reporte

📌 PENDIENTES HOY:
• 2 meets de onboarding
• 3 nudges automáticos programados
• 1 re-onboarding agendado
```

---

## 10. Ejemplo End-to-End: Vida de un Cliente

### Día 0: Activación empieza

1. Se cierra la venta. Se configura la empresa como cliente. Se crean 3 perfiles: Carlos (dueño), Juan (capataz), María (administrativa).
2. **Automático (A1+A2):** Se crea onboarding para cada usuario con módulo Caja. Bot envía a Juan y María: link de validación web + "Mandame una foto de alguna factura para probar".
3. Juan manda foto de factura. El bot la procesa. Juan confirma. **Se registra:** paso "crearGasto" completado (score Caja: 40%). **Sesión de flujo:** completada, 0 correcciones, 38 segundos.

### Día 1

4. María no hizo nada. **Automático (A3):** Recordatorio "¿Probaste mandar una foto de factura?"
5. María manda gasto por texto. El bot interpreta mal la categoría. María corrige. **Se registra:** crearGasto completado (40%). **Sesión:** completada, 1 corrección (categoría), 2 min.
6. **Dato para producto:** La corrección de categoría se suma al conteo global.
7. **Automático (A4):** María recibe "Ahora entrá a la web para ver tus gastos: [link]"

### Día 2: Pre-meet

8. **Automático (A5):** Recordatorio a cada usuario "Mañana meet, preparate tus dudas"
9. Carlos no cargó nada. **Automático (A6):** "Cargá al menos 1 gasto antes de la meet"

### Día 3: Meet de onboarding

10. En la meet, muestran cómo editar y eliminar. Juan edita un gasto en vivo. **Se registra:** editarGasto (score: 60%).
11. Carlos entra a la web por primera vez. **Se registra:** accederWeb para Carlos.
12. **Automático (A7):** Resumen post-meet a cada usuario.

### Día 5

13. Sin actividad nueva. **Automático (A8):** "¿Necesitan una mano con algo de lo que vimos?"

### Día 7

14. Score empresa: 55%. **Automático (A9):** Nudge a María (que no validó web) con link directo.
15. María valida web. **Se registra:** accederWeb para María (score: 60%).
16. Juan elimina un gasto. **Se registra:** eliminarGasto (score Caja: 100% 🎉).
17. **Nudge inteligente:** CS recibe notificación "Juan completó onboarding Caja".

### Día 12

18. Nadie cargó gastos en 5 días. **Estado cambia a `en_riesgo`.**
19. **Nudge inteligente:** Mensaje automático a Juan y María. Alerta a CS en reporte diario.
20. CS contacta a Carlos. Carlos dice que estuvieron de vacaciones. OK.

### Día 15

21. Todos vuelven a cargar. **Estado vuelve a `activo`.**
22. **Nudge inteligente:** Felicitación al dueño "Tu empresa volvió a estar activa 🎉"
23. Carlos abre la vista de caja en la web, filtra por obra, y mira el presupuesto. **Se registra:** verCaja, crearFiltro para rol Toma Decisión.

### Día 30: Evaluación

24. Score empresa: 78%. Estado: activo. Toma Decisión: 40% (le falta reporte y PDF).
25. **Automático (A13):** Mensaje a Carlos: "En el último mes tu equipo cargó 47 gastos por $2.3M. ¿Sabías que podés ver un reporte automático? [Ver →]"

---

## 11. Plan de Implementación por Olas

### Ola 1 — Fundamentos (Semana 1-2)

| # | Qué | Eje | Prioridad |
|---|-----|-----|-----------|
| 1.1 | Score de salud de empresa + cron diario | Eje 2 | 🔴 Alta |
| 1.2 | Onboarding por usuario — Módulo Caja | Eje 1 | ✅ Hecho |
| 1.3 | Hook de acceso web (primera vez) | Eje 1 | 🔴 Alta |
| 1.4 | API endpoints onboarding + estadoSalud | Eje 1+2 | 🔴 Alta |
| 1.5 | Reporte diario interno al equipo CS | Eje 4 | 🟡 Media |
| 1.6 | Vista individual de empresa en frontend | Panel CS | 🟡 Media |

### Ola 2 — Calidad WA + Automatizaciones (Semana 3-4)

| # | Qué | Eje | Prioridad |
|---|-----|-----|-----------|
| 2.1 | Modelo FlowSession + servicio base | Eje 3 | 🔴 Alta |
| 2.2 | Hooks inicio/fin/corrección/cancelación en flujos WA | Eje 3 | 🔴 Alta |
| 2.3 | Cron cerrar sesiones abandonadas | Eje 3 | 🟡 Media |
| 2.4 | Sync métricas calidad a Firestore | Eje 3 | 🟡 Media |
| 2.5 | Cadena post-venta automática (A1→A13) | Eje 4 | 🔴 Alta |
| 2.6 | Nudges inteligentes por eventos | Eje 4 | 🟡 Media |
| 2.7 | API endpoints sesiones de flujo + métricas | Eje 3 | 🟡 Media |

### Ola 3 — Expansión y Valor (Semana 5+)

| # | Qué | Eje | Prioridad |
|---|-----|-----|-----------|
| 3.1 | Onboarding módulos Nota Pedido + Acopio | Eje 1 | 🟡 Media |
| 3.2 | Onboarding rol Toma Decisión | Eje 1 | 🟡 Media |
| 3.3 | Score empresa multi-módulo ponderado | Eje 1 | 🟡 Media |
| 3.4 | Módulo de reportes (MVP: templates + engine) | Eje 5 | 🔴 Alta |
| 3.5 | PDF resumen mensual al dueño | Eje 4+5 | 🟡 Media |
| 3.6 | Mensajes de valor periódicos al dueño | Eje 4 | 🟡 Media |
| 3.7 | Dashboard matutino completo para CS | Panel CS | 🟢 Baja |
| 3.8 | Métricas de producto por flujo (para equipo técnico) | Eje 3 | 🟢 Baja |
| 3.9 | Portal cliente con datos reales | Eje 5 | 🟢 Baja |

---

## 12. Métricas de Éxito

### ¿Cómo sabemos que esto funciona?

| Métrica | Hoy | Objetivo 90 días |
|---------|-----|-------------------|
| % clientes que completan onboarding Caja en 10 días | No se mide | >70% |
| Tiempo de activación (venta → 3 gastos) | No se mide | <7 días |
| % clientes en estado "activo" al día 30 | No se mide | >60% |
| Tasa de éxito de flujos WhatsApp | No se mide | >80% |
| Correcciones promedio por operación | No se mide | <0.5 |
| Empresas en estado "en_riesgo" detectadas a tiempo | 0% (no existe) | >90% |
| Churn mensual | Estimado ~X% | Reducir 30% |
| Intervenciones manuales de CS / empresa / mes | Muchas (todo manual) | Reducir 50% |
