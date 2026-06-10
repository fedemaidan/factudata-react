/**
 * NuevaVentaDrawer — alta de venta en un drawer lateral compacto (vertical
 * corralón). Pensado para ser ágil: no saca al usuario de /ventas.
 *
 * Estilo inspirado en movementForm.js (bloques numerados, chips pill, header y
 * footer sticky, densidad alta). Flujo único:
 *   tipo de operación → datos → productos → modalidad de pago.
 * El acopio tiene sus propios campos.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clienteService from 'src/services/clienteService';
import materialService from 'src/services/materialService';
import sucursalService from 'src/services/sucursalService';
import ventaService from 'src/services/ventaService';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const MODALIDADES = [
  { key: 'contado', titulo: 'Contado', desc: 'Se cobra al momento de la venta.' },
  { key: 'cc', titulo: 'Cuenta corriente', desc: 'Se cobra después.' },
  { key: 'contra_entrega', titulo: 'Contra entrega', desc: 'Se cobra al entregar.' },
];

const emptyRow = () => ({ material_id: '', nombre: '', descripcion: '', cantidad: 1, precio_unitario: 0, libre: false });

// Bloque de sección con badge numerado (estilo StitchBlock de movementForm).
function StepBlock({ step, title, action, children }) {
  return (
    <section className="rounded-xl border border-divider bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-divider px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-main text-[11px] font-bold text-white">
            {step}
          </span>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        </div>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

// Toggle segmentado tipo pill.
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              active ? 'bg-white text-primary-dark shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {o.titulo}
          </button>
        );
      })}
    </div>
  );
}

function toDateInput(d) {
  if (!d) return '';
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
}

export default function NuevaVentaDrawer({ open, onClose, empresa, onCreated, ventaEdit = null }) {
  const empresaId = empresa?.id || empresa?._id;
  const { sucursalId: sucursalGlobal } = useSucursalContext();
  const esEdicion = Boolean(ventaEdit?._id);
  const esInerte = ['borrador', 'cotizada'].includes(ventaEdit?.estado_venta);
  const etiquetaInerte = ventaEdit?.estado_venta === 'cotizada' ? 'cotización' : 'borrador';

  const [operacion, setOperacion] = useState('productos'); // 'productos' | 'acopio'

  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [sucursalSel, setSucursalSel] = useState('');
  const [fecha, setFecha] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [notas, setNotas] = useState('');

  const [items, setItems] = useState([emptyRow()]);
  const [matOptions, setMatOptions] = useState({});
  const [matLoading, setMatLoading] = useState({});
  const [stockByMaterial, setStockByMaterial] = useState({}); // material_id -> { total, sucursales }

  const [modalidad, setModalidad] = useState('contado');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [cobrado, setCobrado] = useState(true);

  // Modo acopio (corralón): el cliente deja plata y retira a precios congelados.
  const [montoAcopio, setMontoAcopio] = useState('');
  const [tipoAcopio, setTipoAcopio] = useState('lista_precios'); // 'lista_precios' | 'materiales'
  const [cobradoAcopio, setCobradoAcopio] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Alta rápida de cliente ocasional desde la venta.
  const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteRazon, setNuevoClienteRazon] = useState('');
  const [creandoCliente, setCreandoCliente] = useState(false);

  // Reset / prefill al abrir.
  useEffect(() => {
    if (!open) return;
    setMatOptions({});
    setStockByMaterial({});
    setError('');
    if (esEdicion) {
      setOperacion('productos');
      setClienteSel(ventaEdit.cliente_id ? { _id: ventaEdit.cliente_id, nombre: ventaEdit.cliente_nombre } : null);
      setSucursalSel(ventaEdit.sucursal_id || '');
      setFecha(toDateInput(ventaEdit.fecha));
      setMoneda(ventaEdit.moneda || 'ARS');
      setNotas(ventaEdit.notas || '');
      setModalidad((esInerte ? ventaEdit.borrador_data?.modalidad : ventaEdit.tipo) || 'contado');
      setFechaEntrega(toDateInput(esInerte ? ventaEdit.borrador_data?.fecha_entrega_estimada : ventaEdit.fecha_entrega_estimada));
      setCobrado(ventaEdit.cobro?.estado === 'pagado');
      const fuenteMats = (esInerte ? ventaEdit.borrador_data?.materiales : ventaEdit.materiales) || [];
      const rows = fuenteMats.map((m) => {
        const mid = m.material_id || m.id_material || '';
        return {
          material_id: mid,
          nombre: m.nombre || '',
          descripcion: mid ? '' : (m.nombre || ''),
          cantidad: m.cantidad || 1,
          precio_unitario: m.precio_unitario || 0,
          libre: !mid,
        };
      });
      setItems(rows.length ? [...rows, emptyRow()] : [emptyRow()]);
    } else {
      setOperacion('productos');
      setClienteSel(null);
      setSucursalSel(sucursalGlobal || '');
      setFecha('');
      setMoneda('ARS');
      setNotas('');
      setItems([emptyRow()]);
      setModalidad('contado');
      setFechaEntrega('');
      setCobrado(true);
      setMontoAcopio('');
      setTipoAcopio('lista_precios');
      setCobradoAcopio(false);
    }
  }, [open, sucursalGlobal, esEdicion, ventaEdit]);

  useEffect(() => {
    if (!open || !empresaId) return;
    clienteService.getByEmpresa(empresaId).then((c) => setClientes(c || [])).catch(() => {});
    sucursalService?.getByEmpresa?.(empresaId)?.then?.((s) => setSucursales(s || [])).catch?.(() => {});
  }, [open, empresaId]);

  const sucursalNombre = useMemo(() => {
    const m = {};
    sucursales.forEach((s) => { m[String(s._id || s.id)] = s.nombre; });
    return m;
  }, [sucursales]);

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0),
    [items]
  );
  const itemsValidos = useMemo(
    () => items.filter((it) => (it.nombre || it.descripcion) && Number(it.cantidad) > 0),
    [items]
  );
  // Acopio: las líneas son la lista de precios (precio requerido; cantidad solo
  // relevante en "por cantidades" — en lista_precios el backend la fuerza a 0).
  const itemsValidosAcopio = useMemo(
    () => items
      .filter((it) => (it.nombre || it.descripcion) && Number(it.precio_unitario) > 0)
      .map((it) => ({
        material_id: it.material_id || null,
        nombre: it.nombre || it.descripcion,
        cantidad: Number(it.cantidad) || 0,
        precio_unitario: Number(it.precio_unitario) || 0,
      })),
    [items]
  );

  // Mantiene una única fila vacía al final para carga ágil.
  function ensureTrailingEmpty(arr) {
    const last = arr[arr.length - 1];
    const lastFilled = last && (last.nombre || last.descripcion);
    return lastFilled ? [...arr, emptyRow()] : arr;
  }
  function updateItem(idx, patch) {
    setItems((prev) => ensureTrailingEmpty(prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))));
  }
  function removeItem(idx) {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [emptyRow()];
    });
  }
  function addItemLibre() {
    setItems((prev) => [...prev, { ...emptyRow(), libre: true }]);
  }

  async function buscarMateriales(idx, q) {
    if (!q || q.length < 2) return;
    setMatLoading((m) => ({ ...m, [idx]: true }));
    try {
      const res = await materialService.searchMateriales(empresaId, q);
      setMatOptions((m) => ({ ...m, [idx]: res || [] }));
      // Traer stock por sucursal de los materiales encontrados.
      const ids = (res || []).map((o) => o._id || o.id).filter(Boolean);
      if (ids.length) {
        const data = await materialService.getStockPorSucursal(empresaId, ids);
        if (data && Object.keys(data).length) {
          setStockByMaterial((prev) => ({ ...prev, ...data }));
        }
      }
    } finally {
      setMatLoading((m) => ({ ...m, [idx]: false }));
    }
  }

  async function crearClienteRapido() {
    const nombre = nuevoClienteNombre.trim();
    if (!nombre) { setError('Ingresá el nombre del cliente'); return; }
    setCreandoCliente(true);
    setError('');
    try {
      const res = await clienteService.crear(empresaId, {
        nombre,
        razon_social: nuevoClienteRazon.trim() || undefined,
        ocasional: true,
      });
      const nuevo = { _id: res.cliente_id, nombre: res.nombre || nombre, ocasional: true };
      // Refrescar lista y seleccionar el nuevo.
      const lista = await clienteService.getByEmpresa(empresaId).catch(() => null);
      if (Array.isArray(lista)) {
        setClientes(lista);
        const enLista = lista.find((c) => String(c._id || c.id) === String(res.cliente_id));
        setClienteSel(enLista || nuevo);
      } else {
        setClienteSel(nuevo);
      }
      setNuevoClienteOpen(false);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setCreandoCliente(false);
    }
  }

  function validar() {
    if (!clienteSel) return 'Seleccioná un cliente';
    if (itemsValidos.length === 0) return 'Agregá al menos un producto con cantidad';
    const sinPrecio = itemsValidos.find((it) => !(Number(it.precio_unitario) > 0));
    if (sinPrecio) return `Falta el precio de "${sinPrecio.nombre || sinPrecio.descripcion}"`;
    if (total <= 0) return 'El total debe ser mayor a 0';
    return null;
  }

  function buildPayload() {
    const cliente_id = clienteSel._id || clienteSel.id;
    const sucursal_id = sucursalSel || null;
    return {
      cliente_id, sucursal_id, fecha: fecha || null,
      fecha_entrega_estimada: modalidad === 'contra_entrega' ? (fechaEntrega || null) : null,
      moneda, modalidad,
      cobrado: modalidad === 'contado' ? cobrado : false,
      notas: notas || null,
      materiales: itemsValidos.map((it) => ({
        material_id: it.material_id || null,
        nombre: it.nombre || it.descripcion,
        descripcion: it.descripcion || null,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario) || 0,
      })),
    };
  }

  async function submitAcopio() {
    setError('');
    if (!clienteSel) { setError('Seleccioná un cliente'); return; }
    const lineas = itemsValidosAcopio;
    const monto = Number(montoAcopio) || (tipoAcopio === 'materiales' ? total : 0);
    if (!(monto > 0)) { setError('Ingresá el monto del acopio'); return; }
    setSubmitting(true);
    try {
      const res = await ventaService.crearAcopio(empresaId, {
        cliente_id: clienteSel._id || clienteSel.id,
        sucursal_id: sucursalSel || null,
        fecha: fecha || null,
        moneda,
        total: monto,
        tipo: tipoAcopio,
        cobrado: cobradoAcopio,
        materiales: lineas,
        descripcion: notas || null,
        notas: notas || null,
      });
      onCreated?.(res?.venta || res || null);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (operacion === 'acopio') return submitAcopio();
    setError('');
    const msg = validar();
    if (msg) { setError(msg); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let res;
      if (esInerte) res = await ventaService.editarBorrador(empresaId, ventaEdit._id, payload);
      else if (esEdicion) res = await ventaService.editar(empresaId, ventaEdit._id, payload);
      else res = await ventaService.crear(empresaId, payload);
      onCreated?.(res?.venta || res || null);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Guarda la venta como BORRADOR (sin confirmar). Disponible al crear o editando un borrador.
  async function guardarComoBorrador() {
    if (operacion === 'acopio') return;
    setError('');
    if (!clienteSel) { setError('Seleccioná un cliente'); return; }
    if (itemsValidos.length === 0) { setError('Agregá al menos un producto con cantidad'); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = esInerte
        ? await ventaService.editarBorrador(empresaId, ventaEdit._id, payload)
        : await ventaService.crearBorrador(empresaId, payload);
      onCreated?.(res?.venta || res || null);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Confirma un borrador → crea la venta real.
  async function confirmarBorradorAhora() {
    setError('');
    const msg = validar();
    if (msg) { setError(msg); return; }
    setSubmitting(true);
    try {
      // Guardamos primero los cambios del snapshot y luego confirmamos.
      await ventaService.editarBorrador(empresaId, ventaEdit._id, buildPayload());
      const res = await ventaService.confirmarBorrador(empresaId, ventaEdit._id);
      onCreated?.(res?.venta || res || null);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const modalidadMeta = MODALIDADES.find((m) => m.key === modalidad);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}
    >
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        {/* Header sticky */}
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-900">{esInerte ? `Editar ${etiquetaInerte}` : (esEdicion ? 'Editar venta' : 'Nueva venta')}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {clienteSel && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">
                    {clienteSel.nombre}
                  </span>
                )}
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{moneda}</span>
                {operacion === 'productos' && (
                  <span className="rounded-full bg-primary-main/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-primary-dark">
                    {modalidadMeta?.titulo}
                  </span>
                )}
              </div>
            </div>
            <IconButton onClick={onClose} size="small">
              <XMarkIcon className="h-5 w-5" />
            </IconButton>
          </div>
          <div className="mt-3" hidden={esEdicion}>
            <Segmented
              value={operacion}
              onChange={setOperacion}
              options={[{ key: 'productos', titulo: 'Venta de productos' }, { key: 'acopio', titulo: 'Acopio' }]}
            />
          </div>
        </header>

        {/* Body scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {error && (
              <div className="rounded-lg border border-error-main/40 bg-error-main/10 px-3 py-2 text-sm text-error-dark">
                {error}
              </div>
            )}

            {(
              <>
                <StepBlock step={1} title="Datos generales">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-1.5">
                      <Autocomplete
                        sx={{ flex: 1 }}
                        options={clientes}
                        getOptionLabel={(o) => o?.nombre || ''}
                        isOptionEqualToValue={(o, v) => String(o._id || o.id) === String(v._id || v.id)}
                        value={clienteSel}
                        onChange={(_, v) => setClienteSel(v)}
                        renderInput={(params) => <TextField {...params} label="Cliente *" size="small" />}
                      />
                      <button
                        type="button"
                        onClick={() => { setNuevoClienteNombre(''); setNuevoClienteRazon(''); setNuevoClienteOpen(true); }}
                        className="mb-0.5 shrink-0 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        + Nuevo
                      </button>
                    </div>
                    {clienteSel && (clienteSel.descuento_default != null || clienteSel.notas_pricing) && (
                      <p className="text-[11px] text-primary-dark">
                        {clienteSel.descuento_default != null ? `Descuento ref.: ${clienteSel.descuento_default}%` : ''}
                        {clienteSel.descuento_default != null && clienteSel.notas_pricing ? ' · ' : ''}
                        {clienteSel.notas_pricing || ''}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <FormControl fullWidth size="small">
                        <InputLabel>Sucursal</InputLabel>
                        <Select label="Sucursal" value={sucursalSel} onChange={(e) => setSucursalSel(e.target.value)}>
                          <MenuItem value="">(ninguna)</MenuItem>
                          {sucursales.map((s) => (
                            <MenuItem key={s._id || s.id} value={s._id || s.id}>{s.nombre}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>Moneda</InputLabel>
                        <Select label="Moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                          <MenuItem value="ARS">ARS</MenuItem>
                          <MenuItem value="USD">USD</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    <TextField
                      size="small" label="Fecha" type="date" value={fecha}
                      onChange={(e) => setFecha(e.target.value)} InputLabelProps={{ shrink: true }}
                    />
                  </div>
                </StepBlock>

                {operacion === 'acopio' && (
                  <StepBlock step={2} title="Acopio">
                    <div className="flex flex-col gap-2">
                      <Segmented
                        value={tipoAcopio}
                        onChange={setTipoAcopio}
                        options={[
                          { key: 'lista_precios', titulo: 'Por plata' },
                          { key: 'materiales', titulo: 'Por cantidades' },
                        ]}
                      />
                      <p className="text-xs text-neutral-500">
                        {tipoAcopio === 'lista_precios'
                          ? 'El cliente deja plata y retira a los precios congelados de la lista. El saldo es en dinero (puede quedar negativo).'
                          : 'Se acopian cantidades concretas de material.'}
                      </p>
                      <TextField
                        size="small" type="number" label="Monto del acopio (ARS) *"
                        value={montoAcopio} onChange={(e) => setMontoAcopio(e.target.value)}
                        inputProps={{ min: 0 }}
                        helperText={total > 0 ? `Sugerido por la lista: ${formatCurrencyWithCode(total, moneda)}` : undefined}
                      />
                      <FormControlLabel
                        control={<Checkbox size="small" checked={cobradoAcopio} onChange={(e) => setCobradoAcopio(e.target.checked)} />}
                        label="Pagado al momento (si no, queda a cobrar en la cuenta corriente)"
                      />
                    </div>
                  </StepBlock>
                )}

                <StepBlock
                  step={operacion === 'acopio' ? 3 : 2}
                  title={operacion === 'acopio' ? 'Lista de precios (congelados)' : 'Productos'}
                  action={
                    <button
                      type="button"
                      onClick={addItemLibre}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <PlusIcon className="h-3.5 w-3.5" /> Línea libre
                    </button>
                  }
                >
                  <div className="flex flex-col gap-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <div className="min-w-0 flex-1">
                          {it.libre ? (
                            <TextField
                              fullWidth size="small" placeholder="Descripción libre"
                              value={it.descripcion}
                              onChange={(e) => updateItem(idx, { descripcion: e.target.value, nombre: e.target.value })}
                            />
                          ) : (
                            <Autocomplete
                              freeSolo size="small"
                              options={matOptions[idx] || []}
                              getOptionLabel={(o) => (typeof o === 'string' ? o : o?.nombre || '')}
                              loading={!!matLoading[idx]}
                              filterOptions={(x) => x}
                              inputValue={it.nombre || ''}
                              onInputChange={(_, v, reason) => {
                                if (reason === 'reset') return; // evita borrar el texto al perder foco
                                updateItem(idx, { nombre: v });
                                buscarMateriales(idx, v);
                              }}
                              onChange={(_, v) => {
                                if (v && typeof v === 'object') {
                                  updateItem(idx, {
                                    material_id: v._id || v.id || '',
                                    nombre: v.nombre,
                                    precio_unitario: Number(v.precio_unitario) || it.precio_unitario || 0,
                                  });
                                }
                              }}
                              renderOption={(props, option) => {
                                const { key, ...rest } = props;
                                const st = stockByMaterial[String(option._id || option.id)];
                                return (
                                  <li key={option._id || option.id} {...rest}>
                                    <div className="flex w-full flex-col py-0.5">
                                      <span className="text-sm text-neutral-900">{option.nombre}</span>
                                      {st && Array.isArray(st.sucursales) && st.sucursales.length > 0 ? (
                                        <span className="mt-1 flex flex-wrap gap-1">
                                          {st.sucursales.map((s, i) => (
                                            <span
                                              key={i}
                                              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                                s.sucursal_id ? 'bg-neutral-100 text-neutral-700' : 'bg-warning-main/15 text-warning-dark'
                                              }`}
                                            >
                                              {s.sucursal_id ? (sucursalNombre[s.sucursal_id] || 'Sucursal') : 'Sin asignar'}: {s.stock}
                                            </span>
                                          ))}
                                        </span>
                                      ) : (
                                        <span className="mt-0.5 text-[10px] text-neutral-400">Sin stock registrado</span>
                                      )}
                                    </div>
                                  </li>
                                );
                              }}
                              renderInput={(params) => <TextField {...params} placeholder="Buscar material..." />}
                            />
                          )}
                        </div>
                        <TextField
                          size="small" type="number" value={it.cantidad}
                          onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                          sx={{ width: 64 }} inputProps={{ 'aria-label': 'cantidad' }}
                        />
                        <TextField
                          size="small" type="number" value={it.precio_unitario}
                          onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })}
                          sx={{ width: 92 }} inputProps={{ 'aria-label': 'precio' }}
                        />
                        <IconButton size="small" onClick={() => removeItem(idx)} sx={{ mt: 0.25 }}>
                          <TrashIcon className="h-4 w-4 text-neutral-500" />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                </StepBlock>

                {operacion !== 'acopio' && (
                <StepBlock step={3} title="¿Cuándo paga?">
                  <Segmented value={modalidad} onChange={setModalidad} options={MODALIDADES} />
                  <p className="mt-2 text-xs text-neutral-500">{modalidadMeta?.desc}</p>
                  {modalidad === 'contra_entrega' && (
                    <TextField
                      sx={{ mt: 2 }} fullWidth size="small" label="Fecha entrega estimada" type="date"
                      value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                  {modalidad === 'contado' && (
                    <FormControlLabel
                      sx={{ mt: 1 }}
                      control={<Checkbox size="small" checked={cobrado} onChange={(e) => setCobrado(e.target.checked)} />}
                      label="Marcar cobrado al crear"
                    />
                  )}
                </StepBlock>
                )}

                <StepBlock step={4} title="Notas">
                  <TextField
                    fullWidth size="small" multiline minRows={2} placeholder="Opcional"
                    value={notas} onChange={(e) => setNotas(e.target.value)}
                  />
                </StepBlock>
              </>
            )}
          </div>
        </div>

        {/* Footer sticky */}
        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          {error && (
            <div className="mb-2 rounded-lg border border-error-main/40 bg-error-main/10 px-3 py-1.5 text-xs text-error-dark">
              {error}
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500">{operacion === 'acopio' ? 'Monto del acopio' : 'Total'}</span>
            <span className="text-lg font-bold text-neutral-900">
              {formatCurrencyWithCode(operacion === 'acopio' ? (Number(montoAcopio) || (tipoAcopio === 'materiales' ? total : 0)) : total, moneda)}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            {(!esEdicion || esInerte) && operacion !== 'acopio' && (
              <button
                type="button"
                onClick={guardarComoBorrador}
                disabled={submitting}
                className="rounded-lg border border-primary-main bg-white px-4 py-1.5 text-sm font-semibold text-primary-dark hover:bg-primary-main/5 disabled:opacity-50"
              >
                {esInerte ? `Guardar ${etiquetaInerte}` : 'Guardar borrador'}
              </button>
            )}
            <button
              type="button"
              onClick={esInerte ? confirmarBorradorAhora : submit}
              disabled={submitting}
              className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : (esInerte ? 'Confirmar venta' : (esEdicion ? 'Guardar cambios' : (operacion === 'acopio' ? 'Crear acopio' : 'Crear venta')))}
            </button>
          </div>
        </footer>
      </div>

      {/* Alta rápida de cliente ocasional */}
      <Dialog open={nuevoClienteOpen} onClose={() => setNuevoClienteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nuevo cliente</DialogTitle>
        <DialogContent>
          <p className="mb-2 text-xs text-neutral-500">Se crea como ocasional; podés completar los datos después.</p>
          <TextField
            fullWidth size="small" label="Nombre *" sx={{ mb: 2 }} autoFocus
            value={nuevoClienteNombre} onChange={(e) => setNuevoClienteNombre(e.target.value)}
          />
          <TextField
            fullWidth size="small" label="Razón social (opcional)"
            value={nuevoClienteRazon} onChange={(e) => setNuevoClienteRazon(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <button type="button" onClick={() => setNuevoClienteOpen(false)} disabled={creandoCliente} className="px-3 py-1.5 text-sm text-neutral-600">Cancelar</button>
          <button type="button" onClick={crearClienteRapido} disabled={creandoCliente} className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            {creandoCliente ? 'Creando…' : 'Crear y seleccionar'}
          </button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
