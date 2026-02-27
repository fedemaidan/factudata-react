# 📚 Documentación del Módulo SDR

## Índice General

El módulo SDR (Sales Development Representative) es el sistema de gestión comercial de Sorby. Permite gestionar contactos, ejecutar cadencias de contacto automatizadas, registrar acciones y coordinar reuniones.

---

### Documentos

| # | Documento | Contenido | Audiencia |
|---|-----------|-----------|-----------|
| 1 | [SDR-FUNCIONAL](SDR-FUNCIONAL.md) | Funcionalidades, flujos de usuario, estados, filtros | Product Owner, SDRs |
| 2 | [SDR-CADENCIAS](SDR-CADENCIAS.md) | Sistema de cadencias: modelo, motor, templates, variantes | Product Owner, Devs |
| 3 | [SDR-TECNICO](SDR-TECNICO.md) | Arquitectura, modelos, API, servicios | Desarrolladores |
| 4 | [SDR-MANUAL](SDR-MANUAL.md) | Guía de uso paso a paso para el SDR | SDRs (usuarios finales) |

---

### Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                │
│                                                     │
│  pages/                                             │
│  ├── gestionSDR.js        → Dashboard + Contactos   │
│  │                          + Reuniones (admin)      │
│  ├── contactosSDR.js      → Lista mis contactos     │
│  │                          (vista SDR individual)   │
│  └── sdr/                                           │
│      ├── cadencias.js     → ABM de cadencias        │
│      └── contacto/[id].js → Detalle contacto        │
│                             (3 tabs: Info/Historial/ │
│                              Chat + barra cadencia)  │
│                                                     │
│  components/sdr/                                    │
│  ├── DrawerDetalleContactoSDR.js                    │
│  ├── ModalRegistrarAccion.js                        │
│  ├── ModalSelectorTemplate.js                       │
│  ├── ModalAgregarContacto.js                        │
│  ├── ModalImportarExcel.js                          │
│  ├── ModalAdminTemplates.js                         │
│  ├── MiniChatViewer.js                              │
│  └── ContactoDrawer.js                              │
│                                                     │
│  services/sdrService.js   → Cliente API             │
│  constant/sdrConstants.js → Diccionarios            │
└────────────────────┬────────────────────────────────┘
                     │ HTTP (axios)
┌────────────────────▼────────────────────────────────┐
│                   BACKEND (Express)                  │
│                                                     │
│  routes/sdrRoutes.js      → ~50 endpoints           │
│  controllers/sdrController.js → Handlers            │
│  services/sdrService.js   → Lógica de negocio       │
│  services/cadenciaEngine.js → Motor de cadencias    │
│  services/leadContactoBridge.js → Bridge Bot→SDR    │
│                                                     │
│  models/sdr/                                        │
│  ├── ContactoSDR.js       → Entidad principal       │
│  ├── EventoHistorialSDR.js → Historial de acciones  │
│  ├── ReunionSDR.js        → Reuniones               │
│  ├── CadenciaSDR.js       → Cadencias multi-paso    │
│  └── VistaGuardadaSDR.js  → Filtros guardados       │
└────────────────────┬────────────────────────────────┘
                     │
              MongoDB (dhn)
```

---

### Flujo Principal

```
Bot captura lead → Bridge crea ContactoSDR (inbound)
                 → Auto-asigna cadencia default inbound
                 → SDR ve en su lista
                 
SDR importa Excel → Contactos creados (outbound)
                  → Asigna cadencia default outbound
                  → Empieza a trabajar

Ciclo diario del SDR:
  1. Abrir contactosSDR
  2. Filtrar: vencidos primero
  3. Abrir contacto
  4. Llamar → registrar resultado
  5. WhatsApp → usar template de cadencia
  6. Programar próximo contacto
  7. → Siguiente contacto
```

---

### Última Actualización

- **Fecha**: Febrero 2026
- **Versión**: 3 tabs (Info/Historial/Chat), cadencias con defaultInbound/defaultOutbound, filtros por segmento y SDR
