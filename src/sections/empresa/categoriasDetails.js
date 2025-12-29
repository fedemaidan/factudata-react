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

//todo - borrar luego
const categoriasDefault = [
  {
      id: 1,
      name: "Mano de obra",
      subcategorias: [
          "Tareas preliminares",
          "Estructura",
          "Albañilería",
          "Instalaciones sanitarios",
          "Instalaciones eléctricas",
          "Instalaciones de gas",
          "Cielorrasos",
          "Colocaciones",
          "Pintura",
          "Climatización",
          "Aire acondicionado",
          "Pileta",
          "Riego",
          "Paisajismo",
          "Limpieza",
      ]
  },
  {
      id: 2,
      name: "Materiales",
      subcategorias: [
          "Aberturas",
          "Baño químico",
          "Corralon",
          "Durlock",
          "Ferretería",
          "Grillo Mov Suelos",
          "Hierros",
          "Hormigón",
          "Maderera",
          "Materiales Eléctricos",
          "Piedra",
          "Pileta",
          "Pintureria",
          "Sanitarios",
          "Volquetes",
          "Zingueria",
      ]
  },
  {
      id: 3,
      name: "Administración",
      subcategorias: [
          "Sueldos",
          "Honorarios",
          "Alquiler oficina",
          "Sistema gestión",
          "Fotografía",
          "Renders",
          "Expensas"
      ]
  }
];
// borrar luego


export const CategoriasDetails = ({ empresa, refreshEmpresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState(empresa.categorias);
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
    setCategorias(Array.isArray(empresa?.categorias) ? empresa.categorias : []);
  }, [empresa?.categorias]);


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
          const nombreAnterior = editingCategoria.name;
          const nuevoNombre = values.name;

          newCategorias = newCategorias.map((cat) =>
            cat.id === editingCategoria.id ? { ...cat, name: values.name } : cat
          );
          if (values.subcategoria) {
            newCategorias = newCategorias.map((cat) =>
            cat.id === editingCategoria.id ? { ...cat, subcategorias: [...cat.subcategorias, values.subcategoria] } : cat
          );
          }

          // Actualizar proveedores si cambió el nombre de la categoría
          let proveedoresActualizados = empresa.proveedores_data || [];
          if (nombreAnterior !== nuevoNombre) {
            proveedoresActualizados = proveedoresActualizados.map(prov => {
              if (!prov.categorias) return prov;
              
              const nuevasCategoriasProv = prov.categorias.map(catString => {
                // Si es exactamente la categoría
                if (catString === nombreAnterior) return nuevoNombre;
                // Si es una subcategoría "Categoria - Sub"
                if (catString.startsWith(`${nombreAnterior} - `)) {
                  return catString.replace(`${nombreAnterior} - `, `${nuevoNombre} - `);
                }
                return catString;
              });

              return { ...prov, categorias: nuevasCategoriasProv };
            });
          }

          setEditingCategoria(null);
          setSnackbarMessage('Categoría actualizada con éxito');
          
          setCategorias(newCategorias);
          await updateEmpresaDetails(empresa.id, { 
            categorias: newCategorias,
            proveedores_data: proveedoresActualizados
          });
        } else {
          const newCategoria = { id: Date.now(), name: values.name, subcategorias: [] };
          newCategorias = [...newCategorias, newCategoria];
          setSnackbarMessage('Categoría creada con éxito');
          
          setCategorias(newCategorias);
          await updateEmpresaDetails(empresa.id, { categorias: newCategorias });
        }

        await refreshEmpresa?.();
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al actualizar/crear la categoría:', error);
        setSnackbarMessage('Error al actualizar/crear la categoría');
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
    console.log(resultado)
    resultado.data.forEach(({ Categoria, Subcategoria }) => {
      if (!Categoria || !Subcategoria) return;

      const catNombre = Categoria.trim();
      const subNombre = Subcategoria.trim();

      let categoriaExistente = nuevasCategorias.find(c => c.name === catNombre);
      if (categoriaExistente) {
        // Verificar si la subcategoría ya existe (manejar strings y objetos)
        const subExiste = categoriaExistente.subcategorias.some(existingSub => {
          const existingName = typeof existingSub === 'string' ? existingSub : existingSub?.name;
          return existingName === subNombre;
        });
        
        if (!subExiste) {
          categoriaExistente.subcategorias.push(subNombre);
        }
      } else {
        nuevasCategorias.push({
          id: Date.now() + Math.random(), // ID único
          name: catNombre,
          subcategorias: [subNombre]
        });
      }
    });

    setCategorias(nuevasCategorias);
    await updateEmpresaDetails(empresa.id, { categorias: nuevasCategorias });
    await refreshEmpresa?.();
    setSnackbarMessage('Categorías importadas con éxito');
    setSnackbarSeverity('success');
  } catch (error) {
    console.error('Error al importar:', error);
    setSnackbarMessage('Error al importar el CSV');
    setSnackbarSeverity('error');
  } finally {
    setSnackbarOpen(true);
  }
};


  const resetCategorias = async () => {
    setIsLoading(true);
    try {
      setCategorias(categoriasDefault);
      await updateEmpresaDetails(empresa.id, { categorias: categoriasDefault });
      await refreshEmpresa?.();
      setSnackbarMessage('Categorías restauradas con éxito');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al restaurar categorías:', error);
      setSnackbarMessage('Error al restaurar categorías');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const eliminarSubcategoria = async (categoriaId, subcategoriaNombre) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar la subcategoría "${subcategoriaNombre}"?`, async () => {
      setIsLoading(true);
      try {
        // 1. Actualizar categorías
        const categoriaAfectada = categorias.find(c => c.id === categoriaId);
        const nombreCategoria = categoriaAfectada?.name;

        const newCategorias = categorias.map((cat) =>
          cat.id === categoriaId 
            ? { 
                ...cat, 
                subcategorias: cat.subcategorias.filter(sub => {
                  const subName = typeof sub === 'string' ? sub : sub?.name;
                  return subName !== subcategoriaNombre;
                })
              } 
            : cat
        );

        // 2. Actualizar proveedores que tengan esa subcategoría
        // Formato esperado en proveedores: "Categoria - Subcategoria"
        const stringBusqueda = `${nombreCategoria} - ${subcategoriaNombre}`;
        
        const proveedoresActualizados = (empresa.proveedores_data || []).map(prov => {
          if (!prov.categorias || !prov.categorias.includes(stringBusqueda)) return prov;
          
          return {
            ...prov,
            categorias: prov.categorias.filter(c => c !== stringBusqueda)
          };
        });

        // 3. Guardar todo junto
        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { 
          categorias: newCategorias,
          proveedores_data: proveedoresActualizados
        });
        
        await refreshEmpresa?.();
        setSnackbarMessage('Subcategoría eliminada y proveedores actualizados');
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
        const categoriaAEliminar = categorias.find(c => c.id === id);
        const nombreCategoria = categoriaAEliminar?.name;

        // 1. Eliminar categoría
        const newCategorias = categorias.filter((cat) => cat.id !== id);

        // 2. Limpiar proveedores
        // Eliminar cualquier string que empiece con "NombreCategoria" o sea igual a "NombreCategoria"
        const proveedoresActualizados = (empresa.proveedores_data || []).map(prov => {
          if (!prov.categorias) return prov;
          
          const nuevasCategoriasProv = prov.categorias.filter(catString => {
            // Si es exactamente la categoría
            if (catString === nombreCategoria) return false;
            // Si es una subcategoría "Categoria - Sub"
            if (catString.startsWith(`${nombreCategoria} - `)) return false;
            return true;
          });

          return { ...prov, categorias: nuevasCategoriasProv };
        });

        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { 
          categorias: newCategorias,
          proveedores_data: proveedoresActualizados
        });
        
        await refreshEmpresa?.();
        setSnackbarMessage('Categoría eliminada y proveedores actualizados');
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
        <CardHeader title="Gestionar Categorías" />
        <Divider />
        <CardContent>
          <List>
            {categorias.map((categoria) => (
              <ListItem key={categoria.id} divider>
                <ListItemText primary={categoria.name} secondary={
                  categoria.subcategorias?.map((sub, index) => {
                    // Manejar tanto strings como objetos {id, name}
                    const subName = typeof sub === 'string' ? sub : sub?.name || '';
                    const subKey = typeof sub === 'string' ? sub : sub?.id || index;
                    
                    return (
                      <Chip
                        key={subKey}
                        label={subName}
                        onDelete={() => eliminarSubcategoria(categoria.id, subName)}
                        color="primary"
                        size="small"
                        style={{ margin: 2 }}
                      />
                    );
                  })
                } />
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
        </CardContent>
        <Divider />
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
            const contenido = "Categoria,Subcategoria\nMateriales,Cemento\nAdministración,Sueldos";
            const blob = new Blob([contenido], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'categorias_template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Descargar ejemplo CSV
        </Button>


        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={iniciarCreacionCategoria}
          >
            Agregar Categoría
          </Button>
          <Button
            color="secondary"
            variant="contained"
            startIcon={<RestoreIcon />}
            onClick={resetCategorias}
          >
            Restaurar Categorías por defecto
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title">
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">{editingCategoria ? 'Editar Categoría' : 'Agregar Categoría'}</DialogTitle>
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
