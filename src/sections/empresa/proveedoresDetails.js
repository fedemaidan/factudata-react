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
  Chip,
  Autocomplete
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';
import Papa from 'papaparse';

export const ProveedoresDetails = ({ empresa, refreshEmpresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aliasInput, setAliasInput] = useState('');

  const [proveedoresData, setProveedoresData] = useState(() => {
    if (empresa.proveedores_data?.length > 0) return empresa.proveedores_data;
    return (empresa.proveedores ?? []).map((nombre) => ({
      id: crypto.randomUUID(),
      nombre,
      razon_social: '',
      cuit: '',
      direccion: '',
      alias: [],
      categorias: []
    }));
  });
  const [editingProveedorIndex, setEditingProveedorIndex] = useState(null);
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
        const nuevoProveedor = {
          id: editingProveedorIndex !== null
            ? proveedoresData[editingProveedorIndex].id
            : crypto.randomUUID(), 
          nombre: values.nombre.trim(),
          razon_social: values.razon_social.trim(),
          cuit: values.cuit.trim(),
          direccion: values.direccion.trim(),
          alias: values.alias,
          categorias: values.categorias,
        };

        const nuevosData = [...proveedoresData];
        if (editingProveedorIndex !== null) {
          nuevosData[editingProveedorIndex] = nuevoProveedor;
        } else {
          nuevosData.push(nuevoProveedor);
        }

        const nuevosNombres = nuevosData.map(p => p.nombre);
        setProveedoresData(nuevosData);
        await updateEmpresaDetails(empresa.id, {
          proveedores: nuevosNombres,
          proveedores_data: nuevosData
        });
        await refreshEmpresa?.();

        setSnackbarMessage(editingProveedorIndex !== null ? 'Proveedor actualizado' : 'Proveedor agregado');
        setSnackbarSeverity('success');
      } catch (err) {
        console.error(err);
        setSnackbarMessage('Error al guardar el proveedor');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setOpenModal(false);
        setEditingProveedorIndex(null);
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

  const eliminarProveedor = async (nombreProveedor) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar el proveedor "${nombreProveedor}"?`, async () => {
      setIsLoading(true);
      try {
        const nuevosData = proveedoresData.filter((prov) => prov.nombre !== nombreProveedor);
        const nuevosNombres = nuevosData.map(p => p.nombre);
        setProveedoresData(nuevosData);
        await updateEmpresaDetails(empresa.id, {
          proveedores: nuevosNombres,
          proveedores_data: nuevosData
        });
        await refreshEmpresa?.();
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

  const iniciarEdicionProveedor = (index) => {
    const p = proveedoresData[index];
    setEditingProveedorIndex(index);
    formik.setValues({
      nombre: p.nombre,
      razon_social: p.razon_social ?? '',
      cuit: p.cuit,
      direccion: p.direccion,
      alias: p.alias ?? [],
      categorias: p.categorias ?? []
    });
    setOpenModal(true);
  };

  const iniciarCreacionProveedor = () => {
    setEditingProveedorIndex(null);
    formik.resetForm();
    setAliasInput('');
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingProveedorIndex(null);
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
          id: crypto.randomUUID(),
          nombre: row.Nombre?.trim() ?? '',
          cuit: row.CUIT?.trim() ?? '',
          razon_social: row['Razon Social']?.trim() ?? '',
          direccion: row.Direccion?.trim() ?? '',
          alias: row.Alias?.split(',').map(a => a.trim()).filter(Boolean) ?? [],
          categorias: categoriasFiltradas
        };
      }).filter(p => p.nombre);
  
      const actualizados = [...proveedoresData, ...nuevos];
      const nombres = actualizados.map(p => p.nombre);
      setProveedoresData(actualizados);
  
      await updateEmpresaDetails(empresa.id, {
        proveedores: nombres,
        proveedores_data: actualizados
      });
      await refreshEmpresa?.();
  
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
            {proveedoresData.map((prov, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={prov.nombre}
                  secondary={`CUIT: ${prov.cuit} | Razón social: ${prov.razon_social} | Dirección: ${prov.direccion} | Alias: ${prov.alias.join(', ')} | Categorías: ${prov.categorias.join(', ')}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => iniciarEdicionProveedor(index)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => eliminarProveedor(prov.nombre)}>
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
            {editingProveedorIndex !== null ? 'Editar Proveedor' : 'Agregar Proveedor'}
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
