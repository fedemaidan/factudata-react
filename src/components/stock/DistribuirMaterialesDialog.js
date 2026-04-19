import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

const DESTINO_OPTS = (acopioHabilitado) => [
  { value: 'deposito',         label: '🏭 Depósito' },
  { value: 'obra',             label: '🏗️ Directo a obra' },
  ...(acopioHabilitado ? [{ value: 'acopio', label: '📦 Acopio (en proveedor)' }] : []),
  { value: 'pendiente_asignar', label: '⏳ Pendiente de asignar' },
];

/**
 * DistribuirMaterialesDialog — Fase 3: Distribución por línea.
 *
 * Muestra una tabla con un selector de destino por cada material.
 * Cuando el usuario confirma, agrupa los materiales por (destino + proyecto/proveedor)
 * y llama a onConfirm(grupos).
 *
 * Props:
 *  open            boolean
 *  onClose         () => void
 *  onConfirm       (grupos: Array<{destino, materiales, proyecto_id?, proyecto_nombre?, proveedor?}>) => void
 *  materiales      Array — materiales ya extraídos (con .descripcion/.nombre, .cantidad)
 *  proyectos       Array<{ id, nombre }>
 *  proveedores     Array<string>
 *  acopioHabilitado boolean
 *  loading         boolean
 */
export default function DistribuirMaterialesDialog({
  open,
  onClose,
  onConfirm,
  materiales = [],
  proyectos = [],
  proveedores = [],
  acopioHabilitado = false,
  loading = false,
}) {
  // asignaciones[i] = { destino, proyecto_id, proyecto_nombre, proveedor }
  const [asignaciones, setAsignaciones] = useState([]);

  useEffect(() => {
    if (open) {
      setAsignaciones(materiales.map(() => ({
        destino: 'deposito',
        proyecto_id: null,
        proyecto_nombre: null,
        proveedor: '',
      })));
    }
  }, [open, materiales]);

  const setAsignacion = (idx, patch) => {
    setAsignaciones((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const optsDestino = useMemo(() => DESTINO_OPTS(acopioHabilitado), [acopioHabilitado]);

  const isValid = asignaciones.every((a) => {
    if (!a.destino) return false;
    if (a.destino === 'obra' && !a.proyecto_id) return false;
    if (a.destino === 'acopio' && !a.proveedor) return false;
    return true;
  });

  const handleConfirm = () => {
    // Agrupar por (destino, proyecto_id, proveedor)
    const grupos = [];
    asignaciones.forEach((asig, idx) => {
      const mat = materiales[idx];
      const { destino, proyecto_id, proyecto_nombre, proveedor } = asig;
      const key = `${destino}||${proyecto_id || ''}||${proveedor || ''}`;
      const existing = grupos.find((g) => g._key === key);
      if (existing) {
        existing.materiales.push(mat);
      } else {
        grupos.push({ _key: key, destino, proyecto_id, proyecto_nombre, proveedor, materiales: [mat] });
      }
    });
    // eslint-disable-next-line no-unused-vars
    onConfirm(grupos.map(({ _key, ...rest }) => rest));
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Distribuir materiales por destino</DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Asigná un destino a cada material. Los que tengan el mismo destino y obra se agrupan en una sola solicitud.
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Material</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Cantidad</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>Destino</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>Obra / Proveedor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materiales.map((mat, idx) => {
              const asig = asignaciones[idx] || {};
              const nombreMat = mat.descripcion || mat.nombre || mat.Nombre || `Material ${idx + 1}`;
              const cantidad = mat.cantidad ?? '—';
              const proyectoVal = proyectos.find((p) => p.id === asig.proyecto_id) || null;

              return (
                <TableRow key={idx}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{nombreMat}</Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2">{cantidad}</Typography>
                  </TableCell>

                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={asig.destino || 'deposito'}
                        onChange={(e) =>
                          setAsignacion(idx, {
                            destino: e.target.value,
                            proyecto_id: null,
                            proyecto_nombre: null,
                            proveedor: '',
                          })
                        }
                      >
                        {optsDestino.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  <TableCell>
                    {asig.destino === 'obra' && (
                      <Autocomplete
                        options={proyectos}
                        getOptionLabel={(p) => p.nombre || ''}
                        value={proyectoVal}
                        onChange={(_, val) =>
                          setAsignacion(idx, {
                            proyecto_id: val?.id || null,
                            proyecto_nombre: val?.nombre || null,
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Seleccionar obra" size="small" />
                        )}
                        isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                        noOptionsText="Sin proyectos"
                        size="small"
                      />
                    )}

                    {asig.destino === 'acopio' && (
                      <Autocomplete
                        freeSolo
                        options={proveedores}
                        value={asig.proveedor || ''}
                        onChange={(_, val) => setAsignacion(idx, { proveedor: val || '' })}
                        onInputChange={(_, val) => setAsignacion(idx, { proveedor: val || '' })}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Proveedor" size="small" />
                        )}
                        size="small"
                      />
                    )}

                    {(asig.destino === 'deposito' || asig.destino === 'pendiente_asignar') && (
                      <Stack direction="row" alignItems="center" sx={{ height: 40 }}>
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!isValid || loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Confirmar distribución
        </Button>
      </DialogActions>
    </Dialog>
  );
}
