import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';

/**
 * Gestión de la lista de "asignados" de una empresa.
 *
 * Espejo simplificado de MediosPagoDetails: lista plana de strings persistida en
 * empresa.asignados. Sin defaults hardcodeados — el cliente arranca con []
 * y agrega los valores que correspondan (ej. "Cliente Final", "Juan", "Facundo").
 */
export const AsignadosDetails = ({ empresa, refreshEmpresa, onEmpresaChange }) => {
  const [asignados, setAsignados] = useState(
    Array.isArray(empresa?.asignados) ? empresa.asignados.filter(Boolean) : []
  );
  const [editing, setEditing] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirm, setConfirm] = useState({ open: false, message: '', action: null });
  const [loading, setLoading] = useState(false);

  const persistir = async (nuevos) => {
    setAsignados(nuevos);
    onEmpresaChange?.({ asignados: nuevos });
    await updateEmpresaDetails(empresa.id, { asignados: nuevos });
    await refreshEmpresa?.();
  };

  const formik = useFormik({
    initialValues: { nombre: editing || '' },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string()
        .trim()
        .required('Campo requerido')
        .test('unico', 'Ya existe un asignado con ese nombre', (value) => {
          const v = (value || '').trim();
          if (!v) return true;
          return !asignados.some((a) => a !== editing && a.toLowerCase() === v.toLowerCase());
        }),
    }),
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      try {
        const nuevo = values.nombre.trim();
        const actualizados = editing
          ? asignados.map((a) => (a === editing ? nuevo : a))
          : [...asignados, nuevo];
        await persistir(actualizados);
        setSnackbar({
          open: true,
          message: editing ? 'Actualizado con éxito' : 'Agregado con éxito',
          severity: 'success',
        });
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: 'Error al guardar', severity: 'error' });
      } finally {
        setEditing(null);
        setOpenModal(false);
        setLoading(false);
        resetForm();
      }
    },
  });

  const eliminar = (nombre) => {
    setConfirm({
      open: true,
      message: `¿Eliminar "${nombre}"? Los movimientos ya cargados con este valor mantienen el string como está; solo deja de aparecer en el selector.`,
      action: async () => {
        setLoading(true);
        try {
          await persistir(asignados.filter((a) => a !== nombre));
          setSnackbar({ open: true, message: 'Eliminado', severity: 'success' });
        } catch (e) {
          console.error(e);
          setSnackbar({ open: true, message: 'Error al eliminar', severity: 'error' });
        } finally {
          setConfirm({ open: false, message: '', action: null });
          setLoading(false);
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader
        title="Gestionar Asignados"
        subheader='Lista de personas o entidades a las que se puede atribuir un movimiento (ej. "Cliente Final", "Juan", "Administración"). Sirve para armar vistas filtradas y para el campo "Asignado" del formulario de carga.'
      />
      <Divider />
      <CardContent>
        {asignados.length === 0 ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No hay asignados configurados. Agregá uno para empezar.
            </Typography>
          </Box>
        ) : (
          <List>
            {asignados.map((nombre, index) => (
              <ListItem key={`${nombre}-${index}`} divider>
                <ListItemText primary={nombre} />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => { setEditing(nombre); setOpenModal(true); }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => eliminar(nombre)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <CardActions>
        <Button
          startIcon={<AddCircleIcon />}
          variant="contained"
          onClick={() => { setEditing(null); setOpenModal(true); }}
        >
          Agregar Asignado
        </Button>
      </CardActions>

      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>{editing ? 'Editar' : 'Agregar'} Asignado</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="nombre"
              label="Nombre"
              type="text"
              fullWidth
              value={formik.values.nombre}
              onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirm.open} onClose={() => setConfirm({ open: false })}>
        <DialogTitle>Confirmar</DialogTitle>
        <DialogContent><Typography>{confirm.message}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm({ open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={confirm.action}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      {loading && <LinearProgress />}
    </Card>
  );
};
