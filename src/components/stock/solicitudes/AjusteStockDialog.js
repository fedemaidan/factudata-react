import { useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';

/**
 * Dialog para realizar ajustes de stock (conteo físico, correcciones).
 *
 * Props:
 *  - open          : boolean
 *  - onClose       : () => void
 *  - onGuardar     : (lineasConDiferencia: Array) => Promise<void>
 *  - proyectos     : Array<{ id, nombre }>
 *  - user          : objeto de autenticación
 *  - loading       : boolean
 */
export default function AjusteStockDialog({
  open,
  onClose,
  onGuardar,
  proyectos = [],
  user,
  loading = false,
}) {
  const [lineas, setLineas] = useState([emptyLinea()]);
  const [proyecto, setProyecto] = useState('');

  function emptyLinea() {
    return {
      id_material: '',
      nombre_item: '',
      stock_actual: 0,
      cantidad_objetivo: 0,
      proyecto_id: '',
      proyecto_nombre: '',
      motivo: '',
    };
  }

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      {
        ...emptyLinea(),
        proyecto_id: proyecto,
        proyecto_nombre: proyectos.find((p) => p.id === proyecto)?.nombre || '',
      },
    ]);
  };

  const quitarLinea = (idx) => setLineas((prev) => prev.filter((_, i) => i !== idx));

  const patchLinea = (idx, field, value) => {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const calcDiferencia = (linea) => (linea.cantidad_objetivo || 0) - (linea.stock_actual || 0);

  // Cuando se selecciona un material, obtener su stock actual
  const handleMaterialSelect = async (idx, mat) => {
    if (!mat?.id) {
      patchLinea(idx, 'id_material', null);
      patchLinea(idx, 'nombre_item', mat?.label || '');
      patchLinea(idx, 'stock_actual', 0);
      return;
    }

    patchLinea(idx, 'id_material', mat.id);
    patchLinea(idx, 'nombre_item', mat.label || mat.nombre || '');

    // Si el material ya tiene stock en sus datos, usarlo directamente
    if (mat.stock !== undefined) {
      const proyectoId = proyecto || lineas[idx]?.proyecto_id;
      let stockActual = mat.stock || 0;
      if (proyectoId && mat.porProyecto?.length > 0) {
        const sp = mat.porProyecto.find((p) => p.proyecto_id === proyectoId);
        stockActual = sp?.stock || 0;
      }
      patchLinea(idx, 'stock_actual', stockActual);
      patchLinea(idx, 'cantidad_objetivo', stockActual);
      return;
    }

    // Si no, obtenerlo del backend
    try {
      const resp = await StockMaterialesService.obtenerMaterialPorId(mat.id);
      const material = resp?.data || resp;
      if (material) {
        const proyectoId = proyecto || lineas[idx]?.proyecto_id;
        let stockActual = material.stock || 0;
        if (proyectoId && material.porProyecto?.length > 0) {
          const sp = material.porProyecto.find((p) => p.proyecto_id === proyectoId);
          stockActual = sp?.stock || 0;
        }
        patchLinea(idx, 'stock_actual', stockActual);
        patchLinea(idx, 'cantidad_objetivo', stockActual);
      }
    } catch {
      patchLinea(idx, 'stock_actual', 0);
    }
  };

  const lineasConDiferencia = lineas.filter((l) => l.id_material && calcDiferencia(l) !== 0);

  const handleGuardar = () => {
    onGuardar(lineasConDiferencia, proyecto);
  };

  const handleClose = () => {
    if (loading) return;
    setLineas([emptyLinea()]);
    setProyecto('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TuneIcon color="secondary" />
          <span>Ajustar Stock</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            Ajustá el stock de materiales indicando la <strong>cantidad real</strong> que tenés.
            El sistema calculará automáticamente la diferencia y generará los movimientos correspondientes.
          </Alert>

          {/* Selector de proyecto */}
          <FormControl fullWidth>
            <InputLabel id="ajuste-proyecto-label">Proyecto (opcional)</InputLabel>
            <Select
              labelId="ajuste-proyecto-label"
              label="Proyecto (opcional)"
              value={proyecto}
              onChange={(e) => {
                setProyecto(e.target.value);
                const nombre = proyectos.find((p) => p.id === e.target.value)?.nombre || '';
                setLineas((prev) =>
                  prev.map((l) => ({ ...l, proyecto_id: e.target.value, proyecto_nombre: nombre }))
                );
              }}
            >
              <MenuItem value=""><em>Sin proyecto (stock general)</em></MenuItem>
              {proyectos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tabla de ajustes */}
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={350}>Material</TableCell>
                  <TableCell align="center" width={120}>Stock Actual</TableCell>
                  <TableCell align="center" width={150}>Cantidad Real</TableCell>
                  <TableCell align="center" width={120}>Diferencia</TableCell>
                  <TableCell width={200}>Motivo</TableCell>
                  <TableCell align="right" width={60}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineas.map((linea, idx) => {
                  const dif = calcDiferencia(linea);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <MaterialAutocomplete
                          user={user}
                          value={linea.id_material || ''}
                          fallbackText={linea.nombre_item || ''}
                          onTextChange={(text) => {
                            patchLinea(idx, 'nombre_item', text);
                            patchLinea(idx, 'id_material', null);
                          }}
                          onMaterialSelect={(mat) => handleMaterialSelect(idx, mat)}
                          label="Buscar material..."
                          fullWidth
                          showCreateOption={false}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={linea.stock_actual || 0} size="small" variant="outlined" color="default" />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={linea.cantidad_objetivo || 0}
                          onChange={(e) => patchLinea(idx, 'cantidad_objetivo', Number(e.target.value) || 0)}
                          size="small"
                          sx={{ width: 100 }}
                          inputProps={{ min: 0, step: 1 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {linea.id_material && dif !== 0 ? (
                          <Chip
                            label={dif > 0 ? `+${dif}` : dif}
                            size="small"
                            color={dif > 0 ? 'success' : 'error'}
                            variant="filled"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={linea.motivo || ''}
                          onChange={(e) => patchLinea(idx, 'motivo', e.target.value)}
                          size="small"
                          fullWidth
                          placeholder="Ej: Conteo físico"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => quitarLinea(idx)}
                          disabled={lineas.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>

          <Button onClick={agregarLinea} startIcon={<AddIcon />} variant="outlined" fullWidth>
            Agregar otro material
          </Button>

          {/* Resumen */}
          {lineasConDiferencia.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>Resumen de ajustes:</Typography>
              <Stack spacing={1}>
                {lineasConDiferencia.map((l, i) => {
                  const d = calcDiferencia(l);
                  return (
                    <Stack key={i} direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2">
                        <strong>{l.nombre_item}</strong>: {l.stock_actual} → {l.cantidad_objetivo}
                      </Typography>
                      <Chip
                        label={d > 0 ? `Ingreso: +${d}` : `Egreso: ${d}`}
                        size="small"
                        color={d > 0 ? 'success' : 'error'}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleGuardar}
          disabled={loading || lineasConDiferencia.length === 0}
          startIcon={loading ? null : <TuneIcon />}
        >
          {loading ? 'Procesando...' : 'Aplicar Ajuste'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
