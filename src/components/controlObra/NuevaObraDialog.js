import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Autocomplete, Box, Button, Card, CardContent, MenuItem, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';
import { getProyectosByEmpresaId } from 'src/services/proyectosService';

const CAC_TIPOS = [
  { value: 'general', label: 'General' },
  { value: 'mano_obra', label: 'Mano de obra' },
  { value: 'materiales', label: 'Materiales' },
];

// Porcentaje libre: vacío = 0, se clampea a 0–100.
const pct = (v) => Math.min(100, Math.max(0, Number(v) || 0));

// Alta de obra: desde un presupuesto profesional (se arma sola) o carga manual.
export default function NuevaObraDialog({ open, onClose, empresaId, proyectoId: proyectoIdProp = null, onCreated }) {
  const [origen, setOrigen] = useState('pp'); // 'pp' | 'manual'
  const [ppId, setPpId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [anticipoPct, setAnticipoPct] = useState('');
  const [retencionPct, setRetencionPct] = useState('');
  const [indexacion, setIndexacion] = useState('');
  const [cacTipo, setCacTipo] = useState('general');
  const [fechaBase, setFechaBase] = useState('');
  const [proyecto, setProyecto] = useState(null);
  const [rubros, setRubros] = useState([{ nombre: '', subrubros: [{ nombre: '', monto: '' }] }]);
  const [archivos, setArchivos] = useState([]); // origen 'archivo': Excel/PDF (1) o imágenes (hasta 10)
  const [warnings, setWarnings] = useState([]); // observaciones que devuelve la extracción
  const [error, setError] = useState(null);

  const ppsQ = useQuery({
    queryKey: ['control-obra', 'pps', empresaId],
    queryFn: () => PresupuestoProfesionalService.listar({ empresa_id: empresaId }),
    enabled: open && origen === 'pp' && !!empresaId,
  });
  const pps = ppsQ.data?.items || [];

  const proyectosQ = useQuery({
    queryKey: ['proyectos', empresaId],
    queryFn: () => getProyectosByEmpresaId(empresaId),
    enabled: open && !!empresaId,
  });
  const proyectos = proyectosQ.data || [];
  const proyectoId = proyecto?.id || proyecto?._id || proyectoIdProp || null;

  // Condiciones del contrato: van siempre explícitas (perfil 'custom' = sin preset).
  const condiciones = {
    perfil: 'custom',
    anticipo_pct: pct(anticipoPct),
    retencion_pct: pct(retencionPct),
    indexacion: indexacion || null,
    cac_tipo: indexacion === 'CAC' ? cacTipo : null,
    fecha_base: indexacion === 'CAC' ? (fechaBase || null) : null,
  };

  const crear = useMutation({
    mutationFn: () => {
      if (origen === 'pp') {
        if (!ppId) throw new Error('Elegí un presupuesto profesional');
        return ControlObraService.crearObra({ empresa_id: empresaId, proyecto_id: proyectoId, ...condiciones, origen: { tipo: 'pp', ref_id: ppId } });
      }
      if (origen === 'archivo') {
        if (!archivos.length) throw new Error('Elegí el archivo del presupuesto');
        const fd = new FormData();
        fd.append('empresa_id', empresaId);
        if (proyectoId) fd.append('proyecto_id', proyectoId);
        if (titulo) fd.append('titulo', titulo);
        Object.entries(condiciones).forEach(([k, v]) => { if (v != null) fd.append(k, v); });
        // Varias páginas van como `archivos` (el backend exige que sean imágenes);
        // un Excel/PDF único va como `archivo`.
        if (archivos.length > 1) archivos.forEach((f) => fd.append('archivos', f));
        else fd.append('archivo', archivos[0]);
        return ControlObraService.importarObra(fd);
      }
      if (origen === 'categorias') {
        if (!titulo) throw new Error('Ingresá un título');
        return ControlObraService.crearObra({
          empresa_id: empresaId, proyecto_id: proyectoId, titulo, ...condiciones, origen: { tipo: 'categorias' },
        });
      }
      return ControlObraService.crearObra({
        empresa_id: empresaId, proyecto_id: proyectoId, titulo, ...condiciones, origen: { tipo: 'manual' },
        rubros: rubros.map((r) => ({ nombre: r.nombre, subrubros: r.subrubros.filter((s) => s.nombre && s.monto).map((s) => ({ nombre: s.nombre, monto: Number(s.monto) })) })),
      });
    },
    // El import devuelve { obra, warnings }; el resto devuelve la obra directo.
    onSuccess: (res) => {
      const obra = res?.obra || res;
      const obs = res?.warnings || [];
      if (obs.length) {
        // Hay observaciones de la extracción: las mostramos antes de salir para que
        // el usuario sepa qué no se pudo interpretar del archivo.
        setWarnings(obs);
        return;
      }
      onCreated(obra._id);
    },
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const setSub = (ri, si, key, val) => setRubros((rs) => rs.map((r, i) => i !== ri ? r : { ...r, subrubros: r.subrubros.map((s, j) => j !== si ? s : { ...s, [key]: val }) }));
  const puedeCrear = origen === 'pp' ? !!ppId : (origen === 'archivo' ? archivos.length > 0 : !!titulo);

  return (
    <FormDrawer
      open={open} onClose={onClose} title="Nueva obra" width={520}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={() => { setError(null); crear.mutate(); }} disabled={crear.isPending || !puedeCrear}>Crear</Button>
        </>
      )}
    >
      <Stack spacing={2}>
          <ToggleButtonGroup exclusive size="small" value={origen} onChange={(_, v) => v && setOrigen(v)} sx={{ flexWrap: 'wrap' }}>
            <ToggleButton value="archivo">Desde archivo</ToggleButton>
            <ToggleButton value="pp">Desde presupuesto profesional</ToggleButton>
            <ToggleButton value="categorias">Desde categorías</ToggleButton>
            <ToggleButton value="manual">Carga manual</ToggleButton>
          </ToggleButtonGroup>
          {origen === 'archivo' && (
            <Typography variant="caption" color="text.secondary">
              Subí tu presupuesto (Excel, PDF o fotos) y armamos la obra con sus rubros y montos. Si el archivo trae el avance de cada tarea, la obra arranca con ese porcentaje.
            </Typography>
          )}
          {origen === 'categorias' && (
            <Typography variant="caption" color="text.secondary">
              Arma la estructura desde las categorías/subcategorías de la empresa y suma los presupuestos del proyecto. Después podés borrar los rubros que no apliquen.
            </Typography>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">Condiciones del contrato — todo opcional, vacío = sin deducción</Typography>
            <Stack direction="row" spacing={1} mt={0.5}>
              <TextField
                label="Anticipo %" size="small" type="number" value={anticipoPct}
                onChange={(e) => setAnticipoPct(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.5 }} sx={{ flex: 1 }}
                helperText="Se amortiza en cada certificado"
              />
              <TextField
                label="Fondo de reparo %" size="small" type="number" value={retencionPct}
                onChange={(e) => setRetencionPct(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.5 }} sx={{ flex: 1 }}
                helperText="Se retiene y libera al conforme"
              />
            </Stack>
            <Stack direction="row" spacing={1} mt={1}>
              <TextField
                select label="Indexación" size="small" value={indexacion}
                onChange={(e) => setIndexacion(e.target.value)} sx={{ flex: 1 }}
              >
                <MenuItem value="">Sin indexación</MenuItem>
                <MenuItem value="CAC">CAC</MenuItem>
              </TextField>
              {indexacion === 'CAC' && (
                <>
                  <TextField select label="Índice" size="small" value={cacTipo} onChange={(e) => setCacTipo(e.target.value)} sx={{ flex: 1 }}>
                    {CAC_TIPOS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                  <TextField
                    label="Fecha base" size="small" type="date" value={fechaBase}
                    onChange={(e) => setFechaBase(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ flex: 1 }}
                  />
                </>
              )}
            </Stack>
          </Box>

          <Autocomplete
            options={proyectos}
            loading={proyectosQ.isLoading}
            getOptionLabel={(p) => p?.nombre || p?.name || ''}
            value={proyecto}
            onChange={(_, v) => setProyecto(v)}
            isOptionEqualToValue={(o, v) => (o.id || o._id) === (v.id || v._id)}
            renderInput={(params) => <TextField {...params} label="Proyecto (opcional)" size="small" helperText="Asocia la obra a un proyecto: filtra los egresos a imputar y la caja" />}
          />

          {origen === 'archivo' && (
            <Stack spacing={1.5}>
              <Button variant="outlined" component="label" disabled={crear.isPending}>
                {archivos.length ? `${archivos.length} archivo(s) elegido(s)` : 'Elegir archivo…'}
                <input
                  type="file" hidden multiple
                  accept=".xlsx,.xls,.csv,.pdf,image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 10);
                    setArchivos(files);
                    setWarnings([]);
                    setError(null);
                  }}
                />
              </Button>
              {archivos.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {archivos.map((f) => f.name).join(' · ')}
                </Typography>
              )}
              <TextField
                label="Título (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth size="small"
                helperText="Si lo dejás vacío, usamos el nombre que venga en el archivo."
              />
              {crear.isPending && (
                <Typography variant="caption" color="text.secondary">
                  Leyendo el archivo… esto puede tardar unos segundos.
                </Typography>
              )}
              {warnings.length > 0 && (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
                    La obra se creó. Revisá esto que no pudimos interpretar:
                  </Typography>
                  {warnings.map((w, i) => (
                    <Typography key={i} variant="caption" display="block">· {w}</Typography>
                  ))}
                  <Button
                    size="small" sx={{ mt: 1 }} variant="contained"
                    onClick={() => onCreated(crear.data?.obra?._id)}
                  >
                    Ir a la obra
                  </Button>
                </Box>
              )}
            </Stack>
          )}

          {origen === 'pp' && (
            <TextField
              select label="Presupuesto profesional" value={ppId} onChange={(e) => setPpId(e.target.value)} fullWidth
              helperText={ppsQ.isLoading ? 'Cargando…' : (pps.length === 0 ? 'No hay presupuestos profesionales' : 'La obra hereda rubros, título y proyecto del presupuesto')}
            >
              {pps.map((p) => <MenuItem key={p._id} value={p._id}>{p.titulo || '(sin título)'} · {(p.total_neto || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</MenuItem>)}
            </TextField>
          )}

          {origen === 'categorias' && (
            <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth />
          )}

          {origen === 'manual' && (
            <>
              <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth />
              {rubros.map((r, ri) => (
                <Card key={ri} variant="outlined"><CardContent>
                  <TextField label="Rubro" size="small" fullWidth value={r.nombre} onChange={(e) => setRubros((rs) => rs.map((x, i) => i === ri ? { ...x, nombre: e.target.value } : x))} sx={{ mb: 1 }} />
                  {r.subrubros.map((s, si) => (
                    <Stack key={si} direction="row" spacing={1} mb={1}>
                      <TextField label="Sub-rubro" size="small" value={s.nombre} onChange={(e) => setSub(ri, si, 'nombre', e.target.value)} sx={{ flex: 1 }} />
                      <TextField label="Monto" size="small" type="number" value={s.monto} onChange={(e) => setSub(ri, si, 'monto', e.target.value)} sx={{ width: 130 }} />
                    </Stack>
                  ))}
                  <Button size="small" onClick={() => setRubros((rs) => rs.map((x, i) => i === ri ? { ...x, subrubros: [...x.subrubros, { nombre: '', monto: '' }] } : x))}>+ sub-rubro</Button>
                </CardContent></Card>
              ))}
              <Button size="small" onClick={() => setRubros((rs) => [...rs, { nombre: '', subrubros: [{ nombre: '', monto: '' }] }])}>+ rubro</Button>
            </>
          )}
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
