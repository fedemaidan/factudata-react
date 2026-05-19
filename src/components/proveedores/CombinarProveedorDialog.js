/**
 * CombinarProveedorDialog — combina dos proveedores en uno solo.
 *
 * El proveedor "origen" se elimina; sus movimientos, pagos, presupuestos
 * y pretendidos se reasignan al "destino" elegido. El nombre del origen
 * queda como alias del destino.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import proveedorService from 'src/services/proveedorService';

export default function CombinarProveedorDialog({
  open,
  onClose,
  onSuccess,
  empresaId,
  proveedorOrigen,
}) {
  const [destino, setDestino] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);

  const origenId = proveedorOrigen ? (proveedorOrigen._id || proveedorOrigen.id) : null;

  useEffect(() => {
    if (!open) return;
    setDestino(null);
    setError(null);
    setResumen(null);

    if (!empresaId || !origenId) return;
    setLoadingOpciones(true);
    proveedorService.getByEmpresa(empresaId)
      .then((data) => {
        const filtrados = (data || []).filter((p) => {
          const id = p._id || p.id;
          return id !== origenId && !p.archivado;
        });
        setOpciones(filtrados);
      })
      .catch(() => setOpciones([]))
      .finally(() => setLoadingOpciones(false));
  }, [open, empresaId, origenId]);

  if (!proveedorOrigen) return null;

  const handleConfirmar = async () => {
    if (!destino) return;
    const destinoId = destino._id || destino.id;
    setLoading(true);
    setError(null);
    try {
      const result = await proveedorService.mergear(empresaId, destinoId, origenId);
      setResumen(result);
      // Esperar un momento para que el user vea el resumen y después cerrar
      setTimeout(() => {
        onSuccess?.(result);
        onClose?.();
      }, 1800);
    } catch (err) {
      console.error('Error mergeando proveedores:', err);
      setError(err.response?.data?.error || 'No se pudo combinar los proveedores.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberIcon color="warning" />
          <span>Combinar proveedores</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {resumen ? (
          <Alert severity="success">
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Proveedores combinados correctamente
            </Typography>
            <Typography variant="body2">
              · Movimientos reasignados: {resumen.movimientos_actualizados}
            </Typography>
            <Typography variant="body2">
              · Pagos reasignados: {resumen.pagos_actualizados}
            </Typography>
            <Typography variant="body2">
              · Presupuestos reasignados: {resumen.presupuestos_actualizados}
            </Typography>
            <Typography variant="body2">
              · Pretendidos reasignados: {resumen.pretendidos_actualizados}
            </Typography>
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Vas a combinar <strong>{proveedorOrigen.nombre}</strong> dentro de otro proveedor.
              Todos sus movimientos, pagos, presupuestos y pretendidos pasarán al proveedor destino.
              El nombre <strong>{proveedorOrigen.nombre}</strong> quedará como alias para que coincidencias futuras se vinculen automáticamente.
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }}>
              Esta acción <strong>no se puede deshacer</strong>: el proveedor <strong>{proveedorOrigen.nombre}</strong> se elimina.
            </Alert>

            <Autocomplete
              options={opciones}
              value={destino}
              onChange={(_, v) => setDestino(v)}
              getOptionLabel={(p) => p.nombre || ''}
              isOptionEqualToValue={(a, b) => (a._id || a.id) === (b._id || b.id)}
              loading={loadingOpciones}
              disabled={loadingOpciones}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor destino"
                  placeholder={loadingOpciones ? 'Cargando proveedores…' : 'Buscar proveedor…'}
                  autoFocus
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingOpciones ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option._id || option.id}>
                  <Box>
                    <Typography variant="body2">{option.nombre}</Typography>
                    {option.alias?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Alias: {option.alias.join(', ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            />
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {resumen ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!resumen && (
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmar}
            disabled={loading || !destino}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Combinar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
