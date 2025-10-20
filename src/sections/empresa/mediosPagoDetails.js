import React, { useState, useEffect } from 'react';
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
  Chip,
  Radio
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';

export const MediosPagoDetails = ({ empresa, refreshEmpresa }) => {
  const DEFAULT_MEDIOS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'];

  const [mediosPago, setMediosPago] = useState(() => {
    if (!empresa.medios_pago || empresa.medios_pago.length === 0) {
      updateEmpresaDetails(empresa.id, {
        medios_pago: DEFAULT_MEDIOS,
        medio_pago_default: DEFAULT_MEDIOS[0]
      });
      refreshEmpresa?.();
      return DEFAULT_MEDIOS;
    }
    return empresa.medios_pago;
  });

  const [medioPredeterminado, setMedioPredeterminado] = useState(
    empresa.medio_pago_default || empresa.medios_pago?.[0] || DEFAULT_MEDIOS[0]
  );

  const [editing, setEditing] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirm, setConfirm] = useState({ open: false, message: '', action: null });
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: { nombre: editing || '' },
    enableReinitialize: true,
    validationSchema: Yup.object({ nombre: Yup.string().required('Campo requerido') }),
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      try {
        const nuevo = values.nombre;
        const actualizados = editing
          ? mediosPago.map((m) => (m === editing ? nuevo : m))
          : [...mediosPago, nuevo];

        const nuevoDefault = medioPredeterminado === editing ? nuevo : medioPredeterminado;

        setMediosPago(actualizados);
        await updateEmpresaDetails(empresa.id, {
          medios_pago: actualizados,
          medio_pago_default: nuevoDefault
        });
        await refreshEmpresa?.();

        setSnackbar({
          open: true,
          message: editing ? 'Actualizado con éxito' : 'Agregado con éxito',
          severity: 'success'
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
      message: `¿Seguro que querés eliminar "${nombre}"?`,
      action: async () => {
        setLoading(true);
        const actualizados = mediosPago.filter((m) => m !== nombre);
        const resultadoFinal = actualizados.length > 0 ? actualizados : [DEFAULT_MEDIOS[0]];
        const nuevoDefault = nombre === medioPredeterminado ? resultadoFinal[0] : medioPredeterminado;

        setMediosPago(resultadoFinal);
        setMedioPredeterminado(nuevoDefault);

        await updateEmpresaDetails(empresa.id, {
          medios_pago: resultadoFinal,
          medio_pago_default: nuevoDefault
        });
        await refreshEmpresa?.();

        setSnackbar({
          open: true,
          message: actualizados.length > 0 ? 'Eliminado' : 'No se puede eliminar el último, se mantuvo uno por defecto',
          severity: 'success'
        });

        setConfirm({ open: false, message: '', action: null });
        setLoading(false);
      }
    });
  };

  const cambiarPredeterminado = async (medio) => {
    setMedioPredeterminado(medio);
    await updateEmpresaDetails(empresa.id, { medio_pago_default: medio });
    await refreshEmpresa?.();
    setSnackbar({ open: true, message: `Medio predeterminado: ${medio}`, severity: 'info' });
  };

  return (
    <Card>
      <CardHeader title="Gestionar Medios de Pago" />
      <Divider />
      <CardContent>
        <List>
          {mediosPago.map((medio, index) => (
            <ListItem key={index} divider>
              <Radio
                checked={medio === medioPredeterminado}
                onChange={() => cambiarPredeterminado(medio)}
                value={medio}
                name="medio-predeterminado"
              />
              <ListItemText
                primary={medio}
                secondary={medio === medioPredeterminado ? 'Medio predeterminado' : ''}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => { setEditing(medio); setOpenModal(true); }}><EditIcon /></IconButton>
                <IconButton onClick={() => eliminar(medio)}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
      <CardActions>
        <Button
          startIcon={<AddCircleIcon />}
          variant="contained"
          onClick={() => { setEditing(null); setOpenModal(true); }}
        >
          Agregar Medio de Pago
        </Button>
      </CardActions>

      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>{editing ? 'Editar' : 'Agregar'} Medio de Pago</DialogTitle>
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
