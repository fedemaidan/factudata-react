import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Box,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuthContext } from 'src/contexts/auth-context';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';

const ITEM_VACIO = () => ({
  material_id: '',
  material_nombre: '',
  cantidad: '',
  unidad: '',
  precio_estimado: '',
});

const formatDateValue = (value) => {
  if (!value) return '';

  const date = new Date(value instanceof Object && value.seconds ? value.seconds * 1000 : value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const mapItemToForm = (item) => ({
  ...ITEM_VACIO(),
  ...item,
  material_id: item?.material_id || '',
  material_nombre: item?.material_nombre || '',
  cantidad: item?.cantidad ?? '',
  unidad: item?.unidad || '',
  precio_estimado: item?.precio_estimado ?? '',
  _original: item || null,
});

export const NotaPedidoAddDialog = ({
  open,
  onClose,
  onSave,
  profiles,
  proyectos,
  empresa,
  proveedores = [],
  initialData = null,
  title = 'Añadir Nota',
  submitLabel = 'Guardar',
  showEstado = false,
  estados = [],
}) => {
  const { user } = useAuthContext();
  const modoDefault = empresa?.nota_pedido_modo_default || 'texto_libre';

  const [newNoteData, setNewNoteData] = useState({ descripcion: '', proyecto_id: '', proveedor: '', owner: '', fechaEstimadaFin: '', estado: '' });
  const [modoNota, setModoNota] = useState(modoDefault);
  const [items, setItems] = useState([ITEM_VACIO()]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setNewNoteData({
          descripcion: initialData.descripcion || '',
          proyecto_id: initialData.proyecto_id || '',
          proveedor: initialData.proveedor || '',
          owner: initialData.owner || '',
          fechaEstimadaFin: formatDateValue(initialData.fechaEstimadaFin),
          estado: initialData.estado || '',
        });
        setModoNota(initialData.modo || modoDefault);
        setItems(
          initialData.modo === 'items_estructurados' && Array.isArray(initialData.items) && initialData.items.length > 0
            ? initialData.items.map(mapItemToForm)
            : [ITEM_VACIO()]
        );
      } else {
        setNewNoteData({ descripcion: '', proyecto_id: '', proveedor: '', owner: '', fechaEstimadaFin: '', estado: '' });
        setModoNota(modoDefault);
        setItems([ITEM_VACIO()]);
      }
      setFormError('');
    }
  }, [open, modoDefault, initialData]);

  const handleItemChange = (idx, field, value) => {
    setFormError('');
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => setItems((prev) => [...prev, ITEM_VACIO()]);

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.length === 1 ? [ITEM_VACIO()] : prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const data = { ...newNoteData };
    if (modoNota === 'items_estructurados') {
      const itemsValidos = items.filter((it) => it.material_nombre.trim() && it.cantidad);
      if (itemsValidos.length === 0) {
        setFormError('Agrega al menos un ítem válido para guardar una nota estructurada.');
        return;
      }

      data.modo = 'items_estructurados';
      data.items = itemsValidos.map((it) => ({
        ...(it._original || {}),
        material_id: it.material_id || null,
        material_nombre: it.material_nombre.trim(),
        cantidad: parseFloat(it.cantidad),
        unidad: it.unidad.trim() || null,
        precio_estimado: it.precio_estimado ? parseFloat(it.precio_estimado) : null,
      }));
    } else {
      data.modo = 'texto_libre';
      data.items = [];
    }
    onSave(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={modoNota === 'items_estructurados' ? 'md' : 'sm'} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Toggle modo — siempre visible */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Modo de nota
            </Typography>
            <ToggleButtonGroup
              value={modoNota}
              exclusive
              onChange={(_, val) => { if (val) setModoNota(val); }}
              size="small"
            >
              <ToggleButton value="texto_libre">Texto libre</ToggleButton>
              <ToggleButton value="items_estructurados">Ítems estructurados</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <TextField
            label="Descripción"
            value={newNoteData.descripcion}
            onChange={(e) => setNewNoteData({ ...newNoteData, descripcion: e.target.value })}
            multiline
            rows={modoNota === 'items_estructurados' ? 2 : 3}
            fullWidth
          />

          <Autocomplete
            freeSolo
            options={proveedores}
            value={newNoteData.proveedor}
            onChange={(_, val) => setNewNoteData({ ...newNoteData, proveedor: val || '' })}
            onInputChange={(_, val, reason) => {
              if (reason === 'input') setNewNoteData({ ...newNoteData, proveedor: val || '' });
            }}
            renderInput={(params) => (
              <TextField {...params} label="Proveedor" fullWidth />
            )}
          />
          {showEstado && (
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={newNoteData.estado || ''}
                label="Estado"
                onChange={(e) => setNewNoteData({ ...newNoteData, estado: e.target.value })}
              >
                {estados.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {estado}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth>
            <InputLabel>Asignar a</InputLabel>
            <Select
              label="Asignar a"
              value={newNoteData.owner || ''}
              onChange={(e) => setNewNoteData({ ...newNoteData, owner: e.target.value })}
            >
              {profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.firstName + " " + profile.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Proyecto</InputLabel>
            <Select
              label="Proyecto"
              value={newNoteData.proyecto_id || ''}
              onChange={(e) => setNewNoteData({ ...newNoteData, proyecto_id: e.target.value })}
            >
              <MenuItem value="">No definido</MenuItem>
              {proyectos.map((proyecto) => (
                <MenuItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Fecha estimada de finalización"
            type="date"
            value={newNoteData.fechaEstimadaFin || ''}
            onChange={(e) => setNewNoteData({ ...newNoteData, fechaEstimadaFin: e.target.value || null })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          {/* Tabla de ítems — solo visible en modo items_estructurados */}
          {modoNota === 'items_estructurados' && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Ítems del pedido
              </Typography>
              {formError && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  {formError}
                </Typography>
              )}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell sx={{ width: 90 }}>Cantidad</TableCell>
                    <TableCell sx={{ width: 80 }}>Unidad</TableCell>
                    <TableCell sx={{ width: 110 }}>Precio est.</TableCell>
                    <TableCell sx={{ width: 40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item._id || idx}>
                      <TableCell>
                        <MaterialAutocomplete
                          user={user}
                          value={item.material_id || ''}
                          fallbackText={item.material_nombre || ''}
                          syncFallbackText={false}
                          allowAliasSuggestion={false}
                          onTextChange={(text) => {
                            handleItemChange(idx, 'material_nombre', text);
                            handleItemChange(idx, 'material_id', '');
                          }}
                          onMaterialSelect={(material) => {
                            handleItemChange(idx, 'material_id', material?.id || '');
                            handleItemChange(idx, 'material_nombre', material?.nombre || material?.label || '');
                            if (item.unidad) return;
                            const unidadSugerida = material?._raw?.unidad || material?._raw?.unidad_medida || '';
                            if (unidadSugerida) {
                              handleItemChange(idx, 'unidad', unidadSugerida);
                            }
                          }}
                          label="Buscar material"
                          placeholder="Buscar por nombre, SKU o descripción..."
                          fullWidth
                          showCreateOption={false}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          type="number"
                          inputProps={{ min: 0, step: 'any' }}
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          placeholder="m², kg…"
                          value={item.unidad}
                          onChange={(e) => handleItemChange(idx, 'unidad', e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          type="number"
                          inputProps={{ min: 0, step: 'any' }}
                          placeholder="Opcional"
                          value={item.precio_estimado}
                          onChange={(e) => handleItemChange(idx, 'precio_estimado', e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleRemoveItem(idx)} tabIndex={-1}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                sx={{ mt: 1, textTransform: 'none' }}
              >
                Agregar ítem
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
