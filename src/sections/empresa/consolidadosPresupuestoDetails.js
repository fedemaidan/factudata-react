import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';
import { CAC_TIPOS, CAC_LABELS } from 'src/components/presupuestosProfesionales/monedaAjusteConfig';

// TAR-423 — Editor de consolidados de presupuesto (config avanzada "Nivel 2").
// Por defecto el control de presupuesto separa el general automáticamente por índice.
// Acá la empresa puede definir consolidados a medida agrupando categorías (ej: "Obra"
// con Materiales + Mano de obra, dejando Honorarios aparte).

const indiceLabel = (c) => {
  if (c?.indexacion === 'CAC') return `CAC ${CAC_LABELS[c.cac_tipo] || CAC_LABELS[CAC_TIPOS.GENERAL]}`;
  if (c?.indexacion === 'USD') return 'USD';
  return 'ARS fijo';
};

const emptyForm = { id: null, nombre: '', indexacion: '', cac_tipo: CAC_TIPOS.GENERAL, categorias: [], techo: '' };

export const ConsolidadosPresupuestoDetails = ({ empresa, refreshEmpresa }) => {
  const [consolidados, setConsolidados] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    setConsolidados(Array.isArray(empresa?.presupuesto_consolidados) ? empresa.presupuesto_consolidados : []);
  }, [empresa?.presupuesto_consolidados]);

  const nombresCategorias = (Array.isArray(empresa?.categorias) ? empresa.categorias : [])
    .map((c) => (typeof c === 'string' ? c : c?.name))
    .filter(Boolean);

  const persistir = async (next) => {
    setConsolidados(next);
    try {
      await updateEmpresaDetails(empresa.id, { presupuesto_consolidados: next });
      await refreshEmpresa?.();
      setSnackbar({ open: true, message: 'Consolidados actualizados', severity: 'success' });
    } catch (error) {
      console.error('Error guardando consolidados:', error);
      setSnackbar({ open: true, message: 'Error al guardar', severity: 'error' });
    }
  };

  const abrirNuevo = () => { setForm(emptyForm); setOpenModal(true); };
  const abrirEdicion = (c) => {
    setForm({
      id: c.id,
      nombre: c.nombre || '',
      indexacion: c.indexacion || '',
      cac_tipo: c.cac_tipo || CAC_TIPOS.GENERAL,
      categorias: Array.isArray(c.categorias) ? c.categorias : [],
      techo: c.techo != null ? String(c.techo) : '',
    });
    setOpenModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      setSnackbar({ open: true, message: 'El nombre es requerido', severity: 'error' });
      return;
    }
    const item = {
      id: form.id || `cons_${Date.now()}`,
      nombre: form.nombre.trim(),
      indexacion: form.indexacion || null,
      cac_tipo: form.indexacion === 'CAC' ? (form.cac_tipo || CAC_TIPOS.GENERAL) : null,
      categorias: form.categorias,
      techo: form.techo !== '' && !Number.isNaN(Number(form.techo)) ? Number(form.techo) : null,
    };
    const next = form.id
      ? consolidados.map((c) => (c.id === form.id ? item : c))
      : [...consolidados, item];
    setOpenModal(false);
    await persistir(next);
  };

  const eliminar = async (id) => {
    await persistir(consolidados.filter((c) => c.id !== id));
  };

  return (
    <>
      <Card sx={{ mt: 3 }}>
        <CardHeader
          title="Consolidados de presupuesto"
          subheader="Avanzado · opcional. Sin configurar, el presupuesto general se separa solo por índice (CAC, USD, ARS)."
        />
        <Divider />
        <CardContent>
          {consolidados.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay consolidados a medida. Agregá uno para agrupar categorías a tu manera
              (por ejemplo, una obra ajustada por CAC y los honorarios por dólar aparte).
            </Typography>
          ) : (
            <List>
              {consolidados.map((c) => (
                <ListItem key={c.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <span>{c.nombre}</span>
                        <Chip label={indiceLabel(c)} size="small" color="secondary" variant="outlined" />
                        {c.techo != null && (
                          <Chip label={`Techo: ${Number(c.techo).toLocaleString('es-AR')}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={(c.categorias || []).length > 0 ? (c.categorias || []).join(' · ') : 'Sin categorías asignadas'}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => abrirEdicion(c)}><EditIcon /></IconButton>
                    <IconButton edge="end" onClick={() => eliminar(c.id)}><DeleteIcon /></IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddCircleIcon />} onClick={abrirNuevo}>
            Agregar consolidado
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Editar consolidado' : 'Nuevo consolidado'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: General Obra"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                fullWidth
                label="Índice"
                value={form.indexacion}
                onChange={(e) => setForm((f) => ({ ...f, indexacion: e.target.value }))}
              >
                <MenuItem value="">ARS fijo</MenuItem>
                <MenuItem value="CAC">CAC</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </TextField>
              {form.indexacion === 'CAC' && (
                <TextField
                  select
                  fullWidth
                  label="Subíndice CAC"
                  value={form.cac_tipo}
                  onChange={(e) => setForm((f) => ({ ...f, cac_tipo: e.target.value }))}
                >
                  {Object.values(CAC_TIPOS).map((t) => (
                    <MenuItem key={t} value={t}>{CAC_LABELS[t]}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
            <TextField
              select
              fullWidth
              label="Categorías incluidas"
              value={form.categorias}
              onChange={(e) => setForm((f) => ({ ...f, categorias: e.target.value }))}
              SelectProps={{
                multiple: true,
                renderValue: (sel) => (sel || []).join(', '),
              }}
              helperText="Los presupuestos de estas categorías suman a este consolidado"
            >
              {nombresCategorias.map((nombre) => (
                <MenuItem key={nombre} value={nombre}>{nombre}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="Techo (opcional)"
              value={form.techo}
              onChange={(e) => setForm((f) => ({ ...f, techo: e.target.value }))}
              helperText="Monto general del consolidado en su índice. Dejalo vacío para usar la suma de las categorías."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={guardar}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
