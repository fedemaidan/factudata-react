import React, { useEffect, useState } from 'react';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import { updateEmpresaDetails } from 'src/services/empresaService';
import Papa from 'papaparse';

// Categorías por defecto para materiales de construcción
const categoriasMaterialesDefault = [
  {
    id: 1,
    name: "Estructurales",
    subcategorias: [
      "Hierros",
      "Hormigón",
      "Cemento",
      "Arena",
      "Piedra",
      "Cal",
      "Ladrillos",
      "Bloques"
    ]
  },
  {
    id: 2,
    name: "Terminaciones",
    subcategorias: [
      "Cerámicos",
      "Porcelanatos",
      "Pinturas",
      "Revestimientos",
      "Pisos",
      "Zócalos",
      "Mesadas"
    ]
  },
  {
    id: 3,
    name: "Instalaciones Eléctricas",
    subcategorias: [
      "Cables",
      "Caños",
      "Tableros",
      "Llaves",
      "Tomacorrientes",
      "Luminarias",
      "Interruptores"
    ]
  },
  {
    id: 4,
    name: "Instalaciones Sanitarias",
    subcategorias: [
      "Caños PVC",
      "Caños PPR",
      "Griferías",
      "Sanitarios",
      "Tanques",
      "Bombas",
      "Termotanques"
    ]
  },
  {
    id: 5,
    name: "Instalaciones de Gas",
    subcategorias: [
      "Caños de gas",
      "Válvulas",
      "Reguladores",
      "Flexibles",
      "Accesorios gas"
    ]
  },
  {
    id: 6,
    name: "Aberturas",
    subcategorias: [
      "Puertas",
      "Ventanas",
      "Portones",
      "Herrajes",
      "Cerraduras",
      "Vidrios"
    ]
  },
  {
    id: 7,
    name: "Aislaciones",
    subcategorias: [
      "Membranas",
      "Poliestireno",
      "Lana de vidrio",
      "Hidrófugos",
      "Impermeabilizantes"
    ]
  },
  {
    id: 8,
    name: "Ferretería",
    subcategorias: [
      "Tornillos",
      "Clavos",
      "Bulones",
      "Fijaciones",
      "Adhesivos",
      "Selladores"
    ]
  },
  {
    id: 9,
    name: "Durlock / Construcción en seco",
    subcategorias: [
      "Placas standard",
      "Placas resistentes",
      "Perfiles",
      "Masilla",
      "Cinta papel"
    ]
  },
  {
    id: 10,
    name: "Maderas",
    subcategorias: [
      "Tirantes",
      "Tablas",
      "Fenólico",
      "MDF",
      "Melamina",
      "Machimbre"
    ]
  }
];


export const CategoriasMaterialesDetails = ({ empresa, refreshEmpresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    // Usar el campo categorias_materiales de la empresa
    setCategorias(Array.isArray(empresa?.categorias_materiales) ? empresa.categorias_materiales : []);
  }, [empresa?.categorias_materiales]);


  const formik = useFormik({
    initialValues: {
      name: editingCategoria ? editingCategoria.name : '',
      subcategoria: '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required('El nombre de la categoría es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      let newCategorias = [...categorias];
      try {
        if (editingCategoria) {
          newCategorias = newCategorias.map((cat) =>
            cat.id === editingCategoria.id ? { ...cat, name: values.name } : cat
          );
          if (values.subcategoria) {
            newCategorias = newCategorias.map((cat) =>
              cat.id === editingCategoria.id ? { ...cat, subcategorias: [...(cat.subcategorias || []), values.subcategoria] } : cat
            );
          }

          setEditingCategoria(null);
          setSnackbarMessage('Categoría de material actualizada con éxito');
        } else {
          const newCategoria = { id: Date.now(), name: values.name, subcategorias: [] };
          newCategorias = [...newCategorias, newCategoria];
          setSnackbarMessage('Categoría de material creada con éxito');
        }

        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { categorias_materiales: newCategorias });
        await refreshEmpresa?.();
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al actualizar/crear la categoría de material:', error);
        setSnackbarMessage('Error al actualizar/crear la categoría de material');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setOpenModal(false);
        setIsLoading(false);
      }
    },
  });

  const confirmarEliminacion = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const handleImportarCSV = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    try {
      const texto = await archivo.text();
      const resultado = Papa.parse(texto, {
        header: true,
        skipEmptyLines: true
      });

      const nuevasCategorias = [...categorias];
      resultado.data.forEach(({ Categoria, Subcategoria }) => {
        if (!Categoria || !Subcategoria) return;

        const catNombre = Categoria.trim();
        const subNombre = Subcategoria.trim();

        let categoriaExistente = nuevasCategorias.find(c => c.name === catNombre);
        if (categoriaExistente) {
          if (!categoriaExistente.subcategorias.includes(subNombre)) {
            categoriaExistente.subcategorias.push(subNombre);
          }
        } else {
          nuevasCategorias.push({
            id: Date.now() + Math.random(),
            name: catNombre,
            subcategorias: [subNombre]
          });
        }
      });

      setCategorias(nuevasCategorias);
      await updateEmpresaDetails(empresa.id, { categorias_materiales: nuevasCategorias });
      await refreshEmpresa?.();
      setSnackbarMessage('Categorías de materiales importadas con éxito');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al importar:', error);
      setSnackbarMessage('Error al importar el CSV');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      // Limpiar el input para permitir reimportar el mismo archivo
      e.target.value = '';
    }
  };


  const resetCategorias = async () => {
    confirmarEliminacion('¿Estás seguro de que deseas restaurar las categorías de materiales por defecto? Se perderán las categorías actuales.', async () => {
      setIsLoading(true);
      try {
        setCategorias(categoriasMaterialesDefault);
        await updateEmpresaDetails(empresa.id, { categorias_materiales: categoriasMaterialesDefault });
        await refreshEmpresa?.();
        setSnackbarMessage('Categorías de materiales restauradas con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al restaurar categorías de materiales:', error);
        setSnackbarMessage('Error al restaurar categorías de materiales');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const eliminarSubcategoria = async (categoriaId, subcategoria) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar la subcategoría "${subcategoria}"?`, async () => {
      setIsLoading(true);
      try {
        const newCategorias = categorias.map((cat) =>
          cat.id === categoriaId ? { ...cat, subcategorias: cat.subcategorias.filter(sub => sub !== subcategoria) } : cat
        );
        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { categorias_materiales: newCategorias });
        await refreshEmpresa?.();
        setSnackbarMessage('Subcategoría eliminada con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar subcategoría:', error);
        setSnackbarMessage('Error al eliminar subcategoría');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const eliminarCategoria = async (id) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar la categoría?`, async () => {
      setIsLoading(true);
      try {
        const newCategorias = categorias.filter((cat) => cat.id !== id);
        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { categorias_materiales: newCategorias });
        await refreshEmpresa?.();
        setSnackbarMessage('Categoría eliminada con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar categoría:', error);
        setSnackbarMessage('Error al eliminar categoría');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const startEditCategoria = (categoria) => {
    setEditingCategoria(categoria);
    formik.setValues({ name: categoria.name, subcategoria: '' });
    setOpenModal(true);
  };

  const iniciarCreacionCategoria = () => {
    setEditingCategoria(null);
    formik.resetForm();
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingCategoria(null);
    formik.resetForm();
    setOpenModal(false);
  };

  return (
    <>
      <Card>
        <CardHeader 
          title="Gestionar Categorías de Materiales" 
          subheader="Configura las categorías y subcategorías para clasificar los materiales de stock"
        />
        <Divider />
        <CardContent>
          {categorias.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary" gutterBottom>
                No hay categorías de materiales configuradas.
              </Typography>
              <Button
                variant="contained"
                startIcon={<RestoreIcon />}
                onClick={resetCategorias}
                sx={{ mt: 2 }}
              >
                Cargar categorías por defecto
              </Button>
            </Box>
          ) : (
            <List>
              {categorias.map((categoria) => (
                <ListItem key={categoria.id} divider>
                  <ListItemText 
                    primary={
                      <Typography variant="subtitle1" fontWeight={600}>
                        {categoria.name}
                      </Typography>
                    } 
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {categoria.subcategorias?.map(sub => (
                          <Chip
                            key={sub}
                            label={sub}
                            onDelete={() => eliminarSubcategoria(categoria.id, sub)}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ margin: 0.5 }}
                          />
                        ))}
                        {(!categoria.subcategorias || categoria.subcategorias.length === 0) && (
                          <Typography variant="caption" color="text.secondary">
                            Sin subcategorías
                          </Typography>
                        )}
                      </Box>
                    } 
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => startEditCategoria(categoria)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => eliminarCategoria(categoria.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            color="primary"
            variant="outlined"
            component="label"
          >
            Importar desde CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleImportarCSV}
            />
          </Button>
          <Button
            variant="text"
            onClick={() => {
              const contenido = "Categoria,Subcategoria\nEstructurales,Hierros\nEstructurales,Cemento\nTerminaciones,Cerámicos\nTerminaciones,Pinturas";
              const blob = new Blob([contenido], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'categorias_materiales_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Descargar ejemplo CSV
          </Button>
        </Box>
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={iniciarCreacionCategoria}
          >
            Agregar Categoría
          </Button>
          {categorias.length > 0 && (
            <Button
              color="secondary"
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={resetCategorias}
            >
              Restaurar por defecto
            </Button>
          )}
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title" maxWidth="sm" fullWidth>
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">
            {editingCategoria ? 'Editar Categoría de Material' : 'Agregar Categoría de Material'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              name="name"
              label="Nombre de la Categoría"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              style={{ marginTop: '1rem' }}
            />
            {editingCategoria && (
              <TextField
                fullWidth
                name="subcategoria"
                label="Añadir Subcategoría"
                value={formik.values.subcategoria}
                onChange={formik.handleChange}
                placeholder="Ej: Hormigón armado"
                helperText="Escribe el nombre y guarda para agregar una nueva subcategoría"
                style={{ marginTop: '1rem' }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelarEdicion} color="primary">
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              type="submit"
              sx={{ ml: 2 }}
            >
              {editingCategoria ? 'Guardar Cambios' : 'Agregar Categoría'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={confirmAction}
            color="primary"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {isLoading && <LinearProgress />}
    </>
  );
};
