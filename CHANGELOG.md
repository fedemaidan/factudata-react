## Mayo 2026 — Notas de Pedido con ítems y resoluciones

### Qué es esto

Hasta ahora las Notas de Pedido eran texto libre: se describía lo que se necesitaba en un mensaje y el sistema lo guardaba como un comentario. A partir de este cambio existe un nuevo modo donde **cada ítem se carga individualmente** con nombre, cantidad y unidad, y el sistema lleva el estado de cada uno (pendiente, en gestión, parcialmente resuelto, resuelto, cancelado).

Esto le da a la empresa una visión mucho más precisa de qué se pidió, qué ya llegó y qué falta.

### Novedades principales

**Ítems por nota de pedido**
- Al crear o editar una nota, se pueden cargar los materiales uno por uno en lugar de escribirlos como texto libre.
- El sistema cruza automáticamente cada ítem contra el catálogo de materiales de la empresa para reconocerlos.
- Cada ítem tiene su propio estado de avance independiente.

**Resolución de ítems**
- Cada material pendiente se puede resolver de tres maneras: registrando una compra, retirando del depósito de stock, o descontando de un acopio existente.
- Al resolver un ítem, el sistema genera automáticamente el movimiento correspondiente (egreso de caja, solicitud de stock o remito de acopio).
- Se puede revertir una resolución si se cargó por error.

**Bot de WhatsApp**
- El bot ahora puede mostrar los ítems pendientes de una nota y guiar al usuario para resolver cada uno por chat.
- Soporta los tres tipos de resolución mencionados arriba, sin necesidad de entrar a la plataforma web.

**PDF actualizado**
- Cuando la nota tiene ítems estructurados, el PDF incluye una tabla con el detalle de materiales, cantidades, precios estimados y estado de cada ítem.

**Exportación de movimientos de presupuesto**
- Nueva opción para exportar en Excel el detalle de todos los movimientos que componen el ejecutado de un presupuesto.

### Mejoras en acopio de materiales

**Informe de remitos (Excel)**
- El informe ahora muestra el importe total de cada remito en una fila destacada, además del saldo acumulado. Antes solo se veían los ítems sin un subtotal claro por entrega.
- Se unificó el estilo visual: todos los saldos tienen el mismo color y tipografía, sin el semáforo verde/naranja/rojo anterior.

**Filtros de remitos**
- El botón "Limpiar" ahora borra todos los filtros activos, incluido el filtro por número de remito. Antes podía quedarse activo sin que el usuario lo notara.

### Correcciones

- Al revertir un retiro de acopio, el movimiento inverso ahora queda bien asociado al acopio correspondiente (antes apuntaba al remito por error, lo que generaba inconsistencias en el historial).
- Cuando el bot extrae ítems de un mensaje y no se menciona cantidad, registra automáticamente "1" en lugar de fallar al guardar.
- La exportación de movimientos de un presupuesto solo está disponible para usuarios de la misma empresa — antes cualquier usuario autenticado podía acceder con el ID del presupuesto.

---

## v3.0.0

###### Feb 24, 2023

- Update dependencies
- Update design system
- Refactor components
- Replace authentication

## v2.1.0

###### Sep 15, 2022

- Integrate Zalter Authentication
- Update dependencies

## v2.0.0

###### Nov 8, 2021

- Migrate to Next.js
- Update design system

# Change Log

## v1.0.0

###### Aug 7, 2020

- Add `eslint`
- Add `Feather Icons`
- Add `Formik` for login/register pages
- Implement `react-router` v6 routing method
- Remove extra views
- Remove `node-sass` dependency
- Update all components to match the PRO version style
- Update dependencies
- Update folder structure to remove folder depth
- Update theme configuration

## v0.4.0

###### Jul 24, 2019

- Adjust theme colors
- Implement `useStyle` hook instead of `withStyles` HOC
- Implement a custom Route component to wrap views in layouts
- Remove `services` and `data` folders, each component has its own data
- Remove unused `.scss` files from `assets` folder
- Replace `.jsx` with `.js`
- Replace Class Components with Function Components
- Replace custom components (Portlet) with Material-UI built-in components
- Replace dependency `classnames` with `clsx`
- Update dependencies
- Update the layout to match the PRO version

## v0.3.0

###### May 13, 2019

- Implement `jsconfig.json` file and removed `.env` to match React v16.8.6 absolute paths
- Update chart styles and options
- Update Dashboard view top widgets styles and structure
- Update few icons to match @material-ui v4 updates
- Update React version to 16.8.6 to support React Hooks
- Update to @material-ui to 4.0.0-beta

## v0.2.0

###### May 11, 2019

- Add docs for IE11 polyfill
- Fix `DisplayMode` component size, when used as a flex child it could grow/shrink
- Fix `ProductCard` component description height
- Fix `Typography` view responsiveness for small devices
- Fix charts responsiveness
- Remove "status" from `ProductCard` component since it was not part of released design
- Remove `auth` service folder since it won't be implemented for this version
- Remove `authGuard` since it won't be used in this version
- Remove unused components from shared components
- Remove unused scss from assets
- Update README.md

## v0.1.0

###### May 2, 2019

### Initial commit
