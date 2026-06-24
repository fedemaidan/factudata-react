import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { CubeIcon, PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';
import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import StockMovimientosService from 'src/services/stock/stockMovimientosService';

// Tokens de diseño tomados de movementForm.js (movementFields.js) para mantener uniformidad.
const inputCls =
  'w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main';

// Grilla de columnas compartida por encabezados y filas (alineación tipo tabla).
const gridCls =
  'grid grid-cols-[minmax(180px,1.4fr)_5rem_6rem_5.5rem_minmax(120px,1fr)_2rem] items-center gap-2';

// El MaterialAutocomplete es MUI; lo achicamos para que matchee los inputs nativos del form.
const autocompleteSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
  '& .MuiOutlinedInput-input': { padding: '7px 8px', fontSize: 14 },
  '& .MuiAutocomplete-endAdornment': { top: 'calc(50% - 13px)' },
};

const estadoPill = (estado) => {
  switch (String(estado || '').toUpperCase()) {
    case 'ENTREGADO':
      return { label: 'Entregado', cls: 'border-success-main/30 bg-success-main/10 text-success-dark' };
    case 'PARCIALMENTE_ENTREGADO':
      return { label: 'Parcial', cls: 'border-warning-main/30 bg-warning-main/10 text-warning-dark' };
    default:
      return { label: 'Pendiente', cls: 'border-neutral-200 bg-neutral-100 text-neutral-600' };
  }
};

const noEnter = (e) => { if (e.key === 'Enter') e.preventDefault(); };

/** Tarjeta con el mismo lenguaje visual que las secciones del formulario (StitchBlock). */
const Card = ({ children }) => (
  <section className="flex shrink-0 flex-col rounded-xl border border-divider bg-white shadow-sm">
    {children}
  </section>
);

const solicitudToForm = (s = {}) => ({
  tipo: s.tipo || 'INGRESO',
  subtipo: s.subtipo || '',
  fecha: s.fecha ? String(s.fecha).substring(0, 10) : '',
  responsable: s.responsable || '',
  proveedor_nombre: s?.proveedor?.nombre || '',
  proveedor_id: s?.proveedor?.id || '',
  proveedor_cuit: s?.proveedor?.cuit || '',
  id_compra: s.id_compra || '',
  url_doc: s.url_doc || '',
  documentos: Array.isArray(s.documentos) ? s.documentos : (s.url_doc ? [s.url_doc] : []),
  proyecto_id: s.proyecto_id || '',
  proyecto_nombre: s.proyecto_nombre || '',
  numero_documento: s.numero_documento || s.numero_remito || s.numero_factura || '',
  etiqueta: s.etiqueta || '',
});

// cantidad en valor absoluto; el signo lo maneja el back vía tipo.
const movimientoToFila = (mm = {}) => ({
  nombre_item: mm.nombre_item || '',
  cantidad: Math.abs(mm.cantidad ?? 0),
  tipo: mm.tipo || 'INGRESO',
  subtipo: mm.subtipo || 'GENERAL',
  fecha_movimiento: mm.fecha_movimiento ? String(mm.fecha_movimiento).substring(0, 10) : '',
  proyecto_id: mm.proyecto_id || '',
  proyecto_nombre: mm.proyecto_nombre || '',
  observacion: mm.observacion || '',
  id_material: mm.id_material || '',
  _id: mm._id || undefined,
  estado: mm.estado || 'PENDIENTE',
  precio_unitario: mm.precio_unitario ?? null,
});

/**
 * Vista y edición inline de los materiales extraídos de una solicitud de stock,
 * incrustada al final de movementForm. Misma funcionalidad que la tabla de
 * Movimientos de la página de solicitudes (material con buscador/creación,
 * cantidad, estado, precio y observación). Se oculta sola si no hay materiales.
 *
 * NO tiene botón de guardar propio: el guardado se dispara desde los botones
 * "Guardar" del formulario vía ref (validar / guardar).
 *
 * Props: solicitudId, user, onError?
 * Ref:   { validar(): {ok, message}, guardar(): Promise<void>, hasPendingChanges(): bool }
 */
function SolicitudMaterialesInline({ solicitudId, user, onError }, ref) {
  const [form, setForm] = useState(null);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const eliminadosRef = useRef([]); // ids reales a borrar en el back al guardar

  const cargar = useCallback(() => {
    if (!solicitudId) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    StockSolicitudesService.obtenerSolicitud({ solicitudId })
      .then((entry) => {
        if (cancelled) return;
        const s = entry?.solicitud || {};
        const lineas = Array.isArray(entry?.movimientos) ? entry.movimientos : [];
        setForm(solicitudToForm(s));
        setMovs(lineas.map(movimientoToFila));
        eliminadosRef.current = [];
        setDirty(false);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [solicitudId]);

  useEffect(() => cargar(), [cargar]);

  const setRow = useCallback((idx, patch) => {
    setMovs((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
    setDirty(true);
  }, []);

  const agregarLinea = useCallback(() => {
    setMovs((prev) => [
      ...prev,
      {
        nombre_item: '', cantidad: 1,
        tipo: form?.tipo || 'INGRESO', subtipo: form?.subtipo || 'GENERAL',
        proyecto_id: form?.proyecto_id || '', proyecto_nombre: form?.proyecto_nombre || '',
        observacion: '', id_material: '', precio_unitario: null, estado: 'PENDIENTE',
      },
    ]);
    setDirty(true);
  }, [form]);

  const quitarLinea = useCallback((idx) => {
    setMovs((prev) => {
      const m = prev[idx];
      if (m?._id) eliminadosRef.current.push(m._id);
      return prev.filter((_, i) => i !== idx);
    });
    setDirty(true);
  }, []);

  const filaInvalida = (m) => !(m.nombre_item?.trim() || m.id_material) || !Number(m.cantidad);
  const hayInvalidas = movs.some(filaInvalida);

  const guardar = useCallback(async () => {
    await Promise.all(
      eliminadosRef.current.map((id) => StockMovimientosService.eliminarMovimiento(id)),
    );
    await StockSolicitudesService.guardarSolicitud({
      user,
      form: { ...form, responsable: user?.email || form?.responsable || '' },
      movs, editMode: true, editId: solicitudId,
    });
  }, [user, form, movs, solicitudId]);

  // Guardado disparado desde los botones "Guardar" del formulario.
  useImperativeHandle(ref, () => ({
    hasPendingChanges: () => dirty,
    validar: () => (hayInvalidas
      ? { ok: false, message: 'Completá material y cantidad en los materiales extraídos' }
      : { ok: true }),
    guardar: async () => {
      if (!dirty) return;
      try {
        await guardar();
        cargar();
      } catch (e) {
        onError?.(e?.message || 'No se pudieron guardar los materiales');
        throw e;
      }
    },
  }), [dirty, hayInvalidas, guardar, cargar, onError]);

  if (loadError) {
    return (
      <Card>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <p className="flex-1 text-sm text-error-dark">No se pudieron cargar los materiales extraídos.</p>
          <button type="button" onClick={cargar} className="inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline">
            <ArrowPathIcon className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-2 px-3 py-2.5">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-9 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-9 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </Card>
    );
  }

  // "Solo si hay materiales extraídos": vacía y sin cambios → no mostramos la sección.
  if (movs.length === 0 && !dirty) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-divider px-2 py-1">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-main text-white" aria-hidden>
          <CubeIcon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-xs font-semibold tracking-tight text-neutral-900">Materiales extraídos</h2>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">{movs.length}</span>
        <span className="ml-auto hidden text-[11px] text-neutral-400 sm:block">Revisá y corregí lo detectado en la factura</span>
      </div>

      <div className="overflow-x-auto px-2 py-1.5">
        <div className="min-w-[680px]">
          {/* Encabezados de columna */}
          <div className={`${gridCls} px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500`}>
            <div>Material</div>
            <div className="text-right">Cant.</div>
            <div className="text-center">Estado</div>
            <div className="text-right">Precio $</div>
            <div>Observación</div>
            <div />
          </div>

          {movs.map((m, idx) => {
            const pill = estadoPill(m.estado);
            return (
              <div key={m._id || `nuevo-${idx}`} className={`${gridCls} border-t border-divider/70 py-1.5`}>
                <Box sx={autocompleteSx} className="min-w-0">
                  <MaterialAutocomplete
                    user={user}
                    value={m.id_material || ''}
                    fallbackText={m.nombre_item || ''}
                    onTextChange={(texto) => setRow(idx, { id_material: null, nombre_item: texto || '' })}
                    onMaterialSelect={(mat) => setRow(idx, {
                      id_material: mat.id || null,
                      nombre_item: mat.label || mat.nombre || '',
                      ...(mat.precio_unitario != null ? { precio_unitario: mat.precio_unitario } : {}),
                    })}
                    onMaterialCreated={(mat) => setRow(idx, { id_material: mat.id, nombre_item: mat.nombre })}
                    label=""
                    placeholder="Buscar o escribir material…"
                    fullWidth
                    showCreateOption
                  />
                </Box>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={m.cantidad ?? ''}
                  onChange={(e) => setRow(idx, { cantidad: e.target.value })}
                  onKeyDown={noEnter}
                  className={`${inputCls} text-right ${!Number(m.cantidad) ? 'border-error-main focus:border-error-main focus:ring-error-main' : ''}`}
                />
                <div className="flex justify-center">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${pill.cls}`}>
                    {pill.label}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={m.precio_unitario ?? ''}
                  onChange={(e) => setRow(idx, { precio_unitario: e.target.value === '' ? null : Number(e.target.value) })}
                  onKeyDown={noEnter}
                  placeholder="0"
                  className={`${inputCls} text-right`}
                />
                <input
                  type="text"
                  value={m.observacion || ''}
                  onChange={(e) => setRow(idx, { observacion: e.target.value })}
                  onKeyDown={noEnter}
                  placeholder="—"
                  className={`${inputCls} min-w-0`}
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => quitarLinea(idx)}
                    title="Quitar material"
                    className="rounded-md p-1 text-neutral-400 hover:bg-error-main/10 hover:text-error-dark"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-divider/70 pt-2">
          <button type="button" onClick={agregarLinea} className="inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline">
            <PlusIcon className="h-4 w-4" /> Agregar material
          </button>
          <span className="hidden text-[11px] text-neutral-400 sm:block">Se guardan al guardar el movimiento</span>
        </div>
      </div>
    </Card>
  );
}

export default forwardRef(SolicitudMaterialesInline);
