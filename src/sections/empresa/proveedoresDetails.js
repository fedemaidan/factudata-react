import React, { useState, useEffect, useCallback } from 'react';
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
  Autocomplete
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import proveedorService from 'src/services/proveedorService';
import Papa from 'papaparse';

export const ProveedoresDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aliasInput, setAliasInput] = useState('');

  const [proveedoresData, setProveedoresData] = useState([]);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const fetchProveedores = useCallback(async () => {
    if (!empresa?.id) return;
    try {
      const data = await proveedorService.getByEmpresa(empresa.id);
      setProveedoresData(data);
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  }, [empresa?.id]);

  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);

  const formik = useFormik({
    initialValues: {
      nombre: '',
      razon_social: '',
      cuit: '',
      direccion: '',
      alias: [],
      categorias: []
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre es obligatorio'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        if (editingProveedor) {
          await proveedorService.actualizar(empresa.id, editingProveedor._id, {
            nombre: values.nombre.trim(),
            razon_social: values.razon_social.trim(),
            cuit: values.cuit.trim(),
            direccion: values.direccion.trim(),
            alias: values.alias,
            categorias: values.categorias,
          });
          setSnackbarMessage('Proveedor actualizado');
        } else {
          await proveedorService.crear(empresa.id, {
            nombre: values.nombre.trim(),
            razon_social: values.razon_social.trim(),
            cuit: values.cuit.trim(),
            direccion: values.direccion.trim(),
            alias: values.alias,
            categorias: values.categorias,
          });
          setSnackbarMessage('Proveedor agregado');
        }
        setSnackbarSeverity('success');
        await fetchProveedores();
      } catch (err) {
        console.error(err);
        setSnackbarMessage('Error al guardar el proveedor');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setOpenModal(false);
        setEditingProveedor(null);
        resetForm();
        setIsLoading(false);
      }
    }
  });

  const categoriasOptions = (empresa.categorias || []).flatMap(cat => [
    cat.name,
    ...(cat.subcategorias || []).map(sub => `${cat.name} - ${sub}`)
  ]);

  const confirmarEliminacion = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarProveedor = async (prov) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar el proveedor "${prov.nombre}"?`, async () => {
      setIsLoading(true);
      try {
        await proveedorService.eliminar(empresa.id, prov._id);
        await fetchProveedores();
        setSnackbarMessage('Proveedor eliminado con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        setSnackbarMessage('Error al eliminar proveedor');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const iniciarEdicionProveedor = (prov) => {
    setEditingProveedor(prov);
    formik.setValues({
      nombre: prov.nombre,
      razon_social: prov.razon_social ?? '',
      cuit: prov.cuit ?? '',
      direccion: prov.direccion ?? '',
      alias: prov.alias ?? [],
      categorias: prov.categorias ?? []
    });
    setOpenModal(true);
  };

  const iniciarCreacionProveedor = () => {
    setEditingProveedor(null);
    formik.resetForm();
    setAliasInput('');
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingProveedor(null);
    formik.resetForm();
    setAliasInput('');
    setOpenModal(false);
  };
  const handleAliasKeyDown = (e) => {
    if (e.key === 'Enter' && aliasInput.trim()) {
      e.preventDefault();
      if (!formik.values.alias.includes(aliasInput.trim())) {
        formik.setFieldValue('alias', [...formik.values.alias, aliasInput.trim()]);
      }
      setAliasInput('');
    }
  };
  
  const eliminarAlias = (alias) => {
    formik.setFieldValue('alias', formik.values.alias.filter(a => a !== alias));
  };
  

  const handleImportarProveedoresCSV = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
  
    try {
      const texto = await archivo.text();
      const resultado = Papa.parse(texto, {
        header: true,
        skipEmptyLines: true
      });
  
      const categoriasValidas = new Set(categoriasOptions);
  
      const nuevos = resultado.data.map(row => {
        const categoriasRaw = row.Categorias?.split(',') ?? [];
        const categoriasFiltradas = categoriasRaw
          .map(c => c.trim())
          .filter(c => categoriasValidas.has(c));
  
        return {
          nombre: row.Nombre?.trim() ?? '',
          cuit: row.CUIT?.trim() ?? '',
          razon_social: row['Razon Social']?.trim() ?? '',
          direccion: row.Direccion?.trim() ?? '',
          alias: row.Alias?.split(',').map(a => a.trim()).filter(Boolean) ?? [],
          categorias: categoriasFiltradas
        };
      }).filter(p => p.nombre);
  
      await proveedorService.importar(empresa.id, nuevos);
      await fetchProveedores();
  
      setSnackbarMessage('Proveedores importados con éxito');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al importar proveedores:', error);
      setSnackbarMessage('Error al importar el CSV de proveedores');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
    }
  };
  

  return (
    <>
      <Card>
        <CardHeader title="Gestionar Proveedores" />
        <Divider />
        <CardContent>
          <List>
            {proveedoresData.map((prov) => (
              <ListItem key={prov._id} divider>
                <ListItemText
                  primary={prov.nombre}
                  secondary={`CUIT: ${prov.cuit || ''} | Razón social: ${prov.razon_social || ''} | Dirección: ${prov.direccion || ''} | Alias: ${(prov.alias || []).join(', ')} | Categorías: ${(prov.categorias || []).join(', ')}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => iniciarEdicionProveedor(prov)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => eliminarProveedor(prov)}>
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
            <input type="file" accept=".csv" hidden onChange={handleImportarProveedoresCSV} />
          </Button>
          <Button
            variant="text"
            onClick={() => {
              const contenido = "Nombre,CUIT,Razon Social, Direccion,Alias,Categorias\nGomez,Gomez SRL,20123456789,Calle Falsa 123,Construcciones,Materiales";
              const blob = new Blob([contenido], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'proveedores_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Descargar ejemplo CSV
          </Button>
          <Button color="primary" variant="contained" startIcon={<AddCircleIcon />} onClick={iniciarCreacionProveedor}>
            Agregar Proveedor
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title">
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">
            {editingProveedor ? 'Editar Proveedor' : 'Agregar Proveedor'}
          </DialogTitle>
          <DialogContent>
            <TextField fullWidth name="nombre" label="Nombre" value={formik.values.nombre} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <TextField fullWidth name="cuit" label="CUIT" value={formik.values.cuit} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <TextField fullWidth name="razon_social" label="Razón Social" value={formik.values.razon_social} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <TextField fullWidth name="direccion" label="Dirección" value={formik.values.direccion} onChange={formik.handleChange} sx={{ mt: 2 }} />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Alias</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {formik.values.alias.map((a, index) => (
                  <Chip key={index} label={a} onDelete={() => eliminarAlias(a)} />
                ))}
              </Box>
              <TextField
                fullWidth
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={handleAliasKeyDown}
                placeholder="Escribí y presioná Enter"
                sx={{ mt: 1 }}
              />
            </Box>

            <Autocomplete
              multiple
              options={categoriasOptions}
              value={formik.values.categorias}
              onChange={(event, newValue) => formik.setFieldValue('categorias', newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={index} variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Categorías" placeholder="Seleccioná" sx={{ mt: 2 }} />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelarEdicion}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmAction} variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {isLoading && <LinearProgress />}
    </>
  );
};
