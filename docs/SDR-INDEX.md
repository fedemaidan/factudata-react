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
│      ├── reuniones.js     → Gestión de reuniones    │
│      │                      (6 tabs: Hoy/Próximas/  │
│      │                       Sin registrar/Realizadas│
│      │                       /No show/Propuestas)    │
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
│  ├── ModalCrearReunion.js                           │
│  ├── ModalResultadoReunion.js                       │
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
│  routes/sdrRoutes.js      → ~58 endpoints           │
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
  1. Abrir /sdr/reuniones → Tab "Hoy" → prepararse con resumen IA
  2. Enviar recordatorio WA a cada contacto del día
  3. Post-reunión → registrar resultado (comentario + transcripción + módulos + próximo contacto)
  4. Abrir contactosSDR → Filtrar vencidos primero
  5. Abrir contacto
  6. Llamar → registrar resultado
  7. WhatsApp → usar template contextual
  8. Programar próximo contacto
  9. → Siguiente contacto
```

---

### Última Actualización

- **Fecha**: Marzo 2026
- **Versión**: Fase 3 completa — templates contextuales (tags), gestión avanzada de reuniones (/sdr/reuniones), resumen SDR con IA
