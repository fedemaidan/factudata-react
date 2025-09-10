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
  Radio
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import Papa from 'papaparse';
import { updateEmpresaDetails } from 'src/services/empresaService';

export const SubEmpresasDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);

  const [subEmpresasData, setSubEmpresasData] = useState(() => {
    if (empresa.sub_empresas_data?.length > 0) return empresa.sub_empresas_data;
    return (empresa.sub_empresas ?? []).map((fantasia) => ({
      id: crypto.randomUUID(),
      fantasia,
      razon_social: '',
      direccion: '',
      cuit: ''
    }));
  });

  // Default: si no hay guardado, tomo la primera
  const [defaultId, setDefaultId] = useState(
    empresa.sub_empresa_default_id ??
      (subEmpresasData.length > 0 ? subEmpresasData[0].id : null)
  );

  const [editingIndex, setEditingIndex] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const handleSnackbarClose = () => setSnackbarOpen(false);

  const formik = useFormik({
    initialValues: {
      fantasia: '',
      razon_social: '',
      direccion: '',
      cuit: ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      fantasia: Yup.string().required('El nombre de fantasía es obligatorio'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        const nuevo = {
          id: editingIndex !== null
            ? subEmpresasData[editingIndex].id
            : crypto.randomUUID(),
          fantasia: values.fantasia.trim(),
          razon_social: values.razon_social.trim(),
          direccion: values.direccion.trim(),
          cuit: values.cuit.replace(/\D/g, '') // normalizo dígitos
        };

        const nuevosData = [...subEmpresasData];
        if (editingIndex !== null) {
          nuevosData[editingIndex] = nuevo;
        } else {
          nuevosData.push(nuevo);
        }

        const nombres = nuevosData.map(s => s.fantasia);
        setSubEmpresasData(nuevosData);

        // Si no hay defaultId, seteo el primero
        let nextDefault = defaultId;
        if (!nextDefault && nuevosData.length > 0) {
          nextDefault = nuevosData[0].id;
          setDefaultId(nextDefault);
        }

        await updateEmpresaDetails(empresa.id, {
          sub_empresas: nombres,
          sub_empresas_data: nuevosData,
          sub_empresa_default_id: nextDefault
        });

        setSnackbarMessage(editingIndex !== null ? 'Sub-empresa actualizada' : 'Sub-empresa agregada');
        setSnackbarSeverity('success');
      } catch (err) {
        console.error(err);
        setSnackbarMessage('Error al guardar la sub-empresa');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setOpenModal(false);
        setEditingIndex(null);
        resetForm();
        setIsLoading(false);
      }
    }
  });

  const confirmar = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarSubEmpresa = async (fantasia) => {
    confirmar(`¿Eliminar la sub-empresa "${fantasia}"?`, async () => {
      setIsLoading(true);
      try {
        const nuevosData = subEmpresasData.filter((s) => s.fantasia !== fantasia);
        const nombres = nuevosData.map(s => s.fantasia);
        setSubEmpresasData(nuevosData);

        let nextDefault = defaultId;
        if (defaultId && !nuevosData.find(s => s.id === defaultId)) {
          nextDefault = nuevosData.length > 0 ? nuevosData[0].id : null;
          setDefaultId(nextDefault);
        }

        await updateEmpresaDetails(empresa.id, {
          sub_empresas: nombres,
          sub_empresas_data: nuevosData,
          sub_empresa_default_id: nextDefault
        });

        setSnackbarMessage('Sub-empresa eliminada con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar sub-empresa:', error);
        setSnackbarMessage('Error al eliminar sub-empresa');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const iniciarEdicion = (index) => {
    const s = subEmpresasData[index];
    setEditingIndex(index);
    formik.setValues({
      fantasia: s.fantasia ?? '',
      razon_social: s.razon_social ?? '',
      direccion: s.direccion ?? '',
      cuit: s.cuit ?? ''
    });
    setOpenModal(true);
  };

  const iniciarCreacion = () => {
    setEditingIndex(null);
    formik.resetForm();
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingIndex(null);
    formik.resetForm();
    setOpenModal(false);
  };

  const marcarComoDefault = async (id) => {
    setDefaultId(id);
    try {
      await updateEmpresaDetails(empresa.id, {
        sub_empresas: subEmpresasData.map(s => s.fantasia),
        sub_empresas_data: subEmpresasData,
        sub_empresa_default_id: id
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportarCSV = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    try {
      const texto = await archivo.text();
      const resultado = Papa.parse(texto, { header: true, skipEmptyLines: true });

      const nuevos = resultado.data
        .map(row => ({
          id: crypto.randomUUID(),
          fantasia: row['Nombre de fantasía']?.trim() ?? row['fantasia']?.trim() ?? '',
          razon_social: row['Razon Social']?.trim() ?? '',
          direccion: row['Direccion']?.trim() ?? '',
          cuit: (row['CUIT'] ?? '').replace(/\D/g, '')
        }))
        .filter(s => s.fantasia);

      const actualizados = [...subEmpresasData, ...nuevos];
      const nombres = actualizados.map(s => s.fantasia);
      setSubEmpresasData(actualizados);

      let nextDefault = defaultId;
      if (!nextDefault && actualizados.length > 0) {
        nextDefault = actualizados[0].id;
        setDefaultId(nextDefault);
      }

      await updateEmpresaDetails(empresa.id, {
        sub_empresas: nombres,
        sub_empresas_data: actualizados,
        sub_empresa_default_id: nextDefault
      });

      setSnackbarMessage('Sub-empresas importadas con éxito');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al importar sub-empresas:', error);
      setSnackbarMessage('Error al importar el CSV');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
    }
  };

  const descargarTemplate = () => {
    const contenido = "Nombre de fantasía,Razon Social,Direccion,CUIT\nSucursal Norte,Sucursal Norte SRL,Calle Falsa 123,20123456789\n";
    const blob = new Blob([contenido], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub_empresas_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader title="Gestionar Sub-empresas" />
        <Divider />
        <CardContent>
          <List>
            {subEmpresasData.map((s, index) => (
              <ListItem key={s.id} divider>
                <Radio
                  checked={defaultId === s.id}
                  onChange={() => marcarComoDefault(s.id)}
                  sx={{ mr: 2 }}
                />
                <ListItemText
                  primary={s.fantasia}
                  secondary={`CUIT: ${s.cuit || '-'} | Razón social: ${s.razon_social || '-'} | Dirección: ${s.direccion || '-'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => iniciarEdicion(index)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => eliminarSubEmpresa(s.fantasia)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Button color="primary" variant="outlined" component="label">
            Importar desde CSV
            <input type="file" accept=".csv" hidden onChange={handleImportarCSV} />
          </Button>
          <Button variant="text" onClick={descargarTemplate}>
            Descargar ejemplo CSV
          </Button>
          <Button color="primary" variant="contained" startIcon={<AddCircleIcon />} onClick={iniciarCreacion}>
            Agregar Sub-empresa
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelarEdicion}>
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle>{editingIndex !== null ? 'Editar Sub-empresa' : 'Agregar Sub-empresa'}</DialogTitle>
          <DialogContent>
            <TextField fullWidth name="fantasia" label="Nombre de fantasía" value={formik.values.fantasia} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <TextField fullWidth name="razon_social" label="Razón Social" value={formik.values.razon_social} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <TextField fullWidth name="direccion" label="Dirección" value={formik.values.direccion} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <TextField fullWidth name="cuit" label="CUIT" value={formik.values.cuit} onChange={formik.handleChange} sx={{ mt: 2 }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelarEdicion}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent><Typography>{confirmMessage}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmAction} variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {isLoading && <LinearProgress />}
    </>
  );
};
