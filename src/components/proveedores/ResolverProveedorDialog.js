/**
 * ResolverProveedorDialog — resuelve referencias rotas a proveedores.
 *
 * Casos que cubre:
 *  1. "Vínculo roto"     → el movimiento tiene id_proveedor pero no matchea
 *                           ningún proveedor cargado (id legacy, post-merge, etc.)
 *  2. "Proveedor no cargado" → el movimiento solo tiene nombre_proveedor y
 *                              ningún id válido asociado.
 *
 * Opciones que ofrece:
 *  - Fusionar con uno existente (busca por nombre en autocomplete) → POST /rebind
 *  - Crear como proveedor nuevo (con el nombre actual del movimiento)
 *    → POST /crear + POST /rebind
 *  - Dejar así (cancelar)
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import proveedorService from 'src/services/proveedorService';

const TIPOS = [
  { value: 'materiales',   label: 'Materiales' },
  { value: 'mano_de_obra', label: 'Mano de obra' },
];

export default function ResolverProveedorDialog({
  open,
  onClose,
  onResolved,
  empresaId,
  // Origen — al menos uno tiene que venir
  idLegacy = null,
  nombreOrigen = '',
  // Lista de proveedores cargados para el autocomplete (la página la pasa)
  proveedores = [],
}) {
  const [modo, setModo] = useState('fusionar'); // 'fusionar' | 'crear'
  const [destinoSel, setDestinoSel] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('materiales');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Busca un proveedor que matchee por nombre o alias (case-insensitive) con el origen
  const matchExistente = useMemo(() => {
    const needle = (nombreOrigen || '').toLowerCase().trim();
    if (!needle) return null;
    return proveedores.find((p) =>
      (p.nombre || '').toLowerCase().trim() === needle ||
      (p.alias || []).some((a) => (a || '').toLowerCase().trim() === needle),
    ) || null;
  }, [nombreOrigen, proveedores]);

  // Reset al abrir. Si NO hay match en la lista, arranca directo en "Crear".
  // Si hay match, arranca en "Fusionar" con ese proveedor pre-seleccionado.
  useEffect(() => {
    if (!open) return;
    setModo(matchExistente ? 'fusionar' : 'crear');
    setDestinoSel(matchExistente || null);
    setNuevoNombre(nombreOrigen || '');
    setNuevoTipo('materiales');
    setError('');
  }, [open, nombreOrigen, matchExistente]);

  const titulo = idLegacy
    ? `Vínculo roto: "${nombreOrigen || '(sin nombre)'}"`
    : `Proveedor no cargado: "${nombreOrigen || '(sin nombre)'}"`;

  const subtitulo = idLegacy
    ? `El movimiento referencia un id_proveedor que no existe (${idLegacy}). Resolvelo para que aparezca correctamente en cuenta corriente.`
    : 'El movimiento no tiene proveedor vinculado. Asignalo a uno existente o creá uno nuevo.';

  const handleAplicar = async () => {
    setSaving(true);
    setError('');
    try {
      let destinoId = destinoSel?._id || destinoSel?.id;

      if (modo === 'crear') {
        if (!nuevoNombre.trim()) {
          setError('El nombre es obligatorio.');
          setSaving(false);
          return;
        }
        const result = await proveedorService.crear(empresaId, {
          nombre: nuevoNombre.trim(),
          tipo: nuevoTipo,
        });
        destinoId = result.proveedor_id || result._id || result.id;
        if (!destinoId) throw new Error('No se pudo crear el proveedor');
      } else {
        if (!destinoId) {
          setError('Elegí un proveedor destino.');
          setSaving(false);
          return;
        }
      }

      const rebindPayload = { destino_id: destinoId };
      if (idLegacy) rebindPayload.id_legacy = idLegacy;
      if (!idLegacy && nombreOrigen) rebindPayload.nombre_origen = nombreOrigen;

      const result = await proveedorService.rebind(empresaId, rebindPayload);
      onResolved?.(result);
      onClose?.();
    } catch (err) {
      console.error('Error resolviendo proveedor:', err);
      setError(err?.response?.data?.error || 'No se pudo aplicar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  const disabledApply = saving
    || (modo === 'fusionar' && !destinoSel)
    || (modo === 'crear' && !nuevoNombre.trim());

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitulo}
        </Typography>

        {nombreOrigen && (
          <Alert
            severity={matchExistente ? 'success' : 'info'}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            {matchExistente
              ? <>Encontramos un proveedor existente con ese nombre: <strong>{matchExistente.nombre}</strong>. Por defecto se sugiere fusionarlo.</>
              : <>No hay ningún proveedor cargado con el nombre <strong>"{nombreOrigen}"</strong>. Por defecto se sugiere crearlo.</>}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            select
            label="¿Qué querés hacer?"
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            size="small"
          >
            <MenuItem value="fusionar">Fusionar con un proveedor existente</MenuItem>
            <MenuItem value="crear">Crear como proveedor nuevo</MenuItem>
          </TextField>

          <Divider />

          {modo === 'fusionar' && (
            <Autocomplete
              options={proveedores}
              value={destinoSel}
              onChange={(_, v) => setDestinoSel(v)}
              getOptionLabel={(p) => p?.nombre || ''}
              isOptionEqualToValue={(a, b) => (a._id || a.id) === (b._id || b.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor destino"
                  placeholder="Buscar por nombre…"
                  size="small"
                />
              )}
              size="small"
            />
          )}

          {modo === 'crear' && (
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                size="small"
                fullWidth
                autoFocus
              />
              <TextField
                select
                label="Tipo"
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
              >
                {TIPOS.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Alert severity="info" variant="outlined">
            Se van a reasignar <strong>todos</strong> los movimientos, pagos y presupuestos
            que tengan {idLegacy ? `id_proveedor = ${idLegacy}` : `nombre_proveedor = "${nombreOrigen}"`}
            {' '}al proveedor seleccionado. La operación no es reversible automáticamente.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Dejar así</Button>
        <Button
          variant="contained"
          onClick={handleAplicar}
          disabled={disabledApply}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Aplicando…' : (modo === 'crear' ? 'Crear y reasignar' : 'Fusionar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
