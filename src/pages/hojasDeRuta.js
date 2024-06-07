import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Container,
  Stack,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  IconButton,
  Collapse,
  Backdrop,
  CircularProgress
} from '@mui/material';
import AddCircle from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import hojaDeRutaService from 'src/services/hojaDeRutaService';
import { useRouter } from 'next/router';

const generateCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

const formatTimezone = (date) => {
  const offset = -date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() + offset * 60000);
  return adjustedDate.toISOString().slice(0, 16);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return formatTimezone(date);
};

const dateToTimestamp = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString();
};

const HojasDeRutaPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;
  const [hojasDeRuta, setHojasDeRuta] = useState([]);
  const [filteredHojasDeRuta, setFilteredHojasDeRuta] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHojaDeRuta, setEditingHojaDeRuta] = useState(null);
  const [filterEmpresaTransportista, setFilterEmpresaTransportista] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [loading, setLoading] = useState(false); // Estado para el indicador de carga

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    const fetchHojasDeRuta = async () => {
      setLoading(true);
      const hojasDeRutaData = await hojaDeRutaService.getHojasDeRutaByEmpresa(empresaId);
      setHojasDeRuta(hojasDeRutaData);
      setLoading(false);
    };

    if (empresaId) {
      fetchHojasDeRuta();
    }
  }, [empresaId]);

  useEffect(() => {
    let filtered = hojasDeRuta;

    if (filterEmpresaTransportista) {
      filtered = filtered.filter((hoja) => hoja.empresaTransportista.includes(filterEmpresaTransportista));
    }

    if (filterFecha) {
      filtered = filtered.filter((hoja) => hoja.fechaSalida === filterFecha);
    }

    setFilteredHojasDeRuta(filtered);
  }, [filterEmpresaTransportista, filterFecha, hojasDeRuta]);

  const formik = useFormik({
    initialValues: {
      fechaSalida: editingHojaDeRuta ? formatDate(editingHojaDeRuta.fechaSalida) : formatTimezone(new Date()),
      empresaTransportista: editingHojaDeRuta ? editingHojaDeRuta.empresaTransportista : '',
      nombreChofer: editingHojaDeRuta ? editingHojaDeRuta.nombreChofer : '',
      whatsappChofer: editingHojaDeRuta ? editingHojaDeRuta.whatsappChofer : '',
      codigo: editingHojaDeRuta ? editingHojaDeRuta.codigo : "",
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      fechaSalida: Yup.string().required('La fecha de salida es requerida'),
      empresaTransportista: Yup.string().required('La empresa transportista es requerida'),
      nombreChofer: Yup.string().required('El nombre del chofer es requerido'),
      whatsappChofer: Yup.string().required('El WhatsApp del chofer es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        values.fechaSalida = dateToTimestamp(values.fechaSalida);
        values.empresaId = empresaId;
        if (editingHojaDeRuta) {
          await hojaDeRutaService.updateHojaDeRuta(editingHojaDeRuta.id, values);
          setSnackbarMessage('Hoja de Ruta actualizada con éxito');
        } else {
          await hojaDeRutaService.createHojaDeRuta(values);
          setSnackbarMessage('Hoja de Ruta creada con éxito');
        }
        setSnackbarSeverity('success');
        const hojasDeRutaData = await hojaDeRutaService.getHojasDeRutaByEmpresa(empresaId);
        setHojasDeRuta(hojasDeRutaData);
      } catch (error) {
        console.log(error);
        setSnackbarMessage('Error al guardar la Hoja de Ruta');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setIsDialogOpen(false);
        setEditingHojaDeRuta(null);
        setLoading(false);
      }
    },
  });

  const regenerateCode = () => {
    formik.setFieldValue('codigo', generateCode());
  };

  const handleOpenDialog = () => {
    setEditingHojaDeRuta(null);
    formik.resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingHojaDeRuta(null);
    formik.resetForm();
    setIsDialogOpen(false);
  };

  const startEditHojaDeRuta = (hojaDeRuta) => {
    setEditingHojaDeRuta(hojaDeRuta);
    formik.setValues({
      ...hojaDeRuta,
      fechaSalida: formatDate(hojaDeRuta.fechaSalida)
    });
    setIsDialogOpen(true);
  };

  const handleDeleteHojaDeRuta = async (id) => {
    try {
      setLoading(true);
      await hojaDeRutaService.deleteHojaDeRuta(id);
      setSnackbarMessage('Hoja de Ruta eliminada con éxito');
      setSnackbarSeverity('success');
      const hojasDeRutaData = await hojaDeRutaService.getHojasDeRutaByEmpresa(empresaId);
      setHojasDeRuta(hojasDeRutaData);
    } catch (error) {
      setSnackbarMessage('Error al eliminar la Hoja de Ruta');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setLoading(false);
    }
  };

  const navigateToRemitos = (hojaDeRutaId) => {
    router.push(`/remitos?hojaDeRutaId=${hojaDeRutaId}`);
  };

  return (
    <>
      <Head>
        <title>Gestionar Hojas de Ruta</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Gestionar Hojas de Ruta</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="primary" startIcon={<AddCircle />} onClick={handleOpenDialog}>
                Agregar Hoja de Ruta
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                {filtersVisible ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
            </Stack>
            <Collapse in={filtersVisible}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Buscar por empresa transportista"
                  variant="outlined"
                  onChange={(e) => setFilterEmpresaTransportista(e.target.value)}
                />
                <TextField
                  label="Filtrar por fecha"
                  variant="outlined"
                  type="datetime-local"
                  onChange={(e) => setFilterFecha(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Stack>
            </Collapse>
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha de Salida</TableCell>
                    <TableCell>Empresa Transportista</TableCell>
                    <TableCell>Nombre del Chofer</TableCell>
                    <TableCell>WhatsApp del Chofer</TableCell>
                    <TableCell>Remitos</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHojasDeRuta.map((hoja) => (
                    <TableRow key={hoja.id}>
                      <TableCell>{formatDate(hoja.fechaSalida)}</TableCell>
                      <TableCell>{hoja.empresaTransportista}</TableCell>
                      <TableCell>{hoja.nombreChofer}</TableCell>
                      <TableCell>{hoja.whatsappChofer}</TableCell>
                      <TableCell>
                        <Button variant="contained" color="primary" onClick={() => navigateToRemitos(hoja.id)}>
                          Ver Remitos
                        </Button>
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => startEditHojaDeRuta(hoja)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteHojaDeRuta(hoja.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>
      </Box>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editingHojaDeRuta ? 'Editar Hoja de Ruta' : 'Agregar Hoja de Ruta'}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              name="fechaSalida"
              label="Fecha de Salida"
              type="datetime-local"
              value={formik.values.fechaSalida}
              onChange={formik.handleChange}
              error={formik.touched.fechaSalida && Boolean(formik.errors.fechaSalida)}
              helperText={formik.touched.fechaSalida && formik.errors.fechaSalida}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              fullWidth
              margin="dense"
              name="empresaTransportista"
              label="Empresa Transportista"
              value={formik.values.empresaTransportista}
              onChange={formik.handleChange}
              error={formik.touched.empresaTransportista && Boolean(formik.errors.empresaTransportista)}
              helperText={formik.touched.empresaTransportista && formik.errors.empresaTransportista}
            />
            <TextField
              fullWidth
              margin="dense"
              name="nombreChofer"
              label="Nombre del Chofer"
              value={formik.values.nombreChofer}
              onChange={formik.handleChange}
              error={formik.touched.nombreChofer && Boolean(formik.errors.nombreChofer)}
              helperText={formik.touched.nombreChofer && formik.errors.nombreChofer}
            />
            <TextField
              fullWidth
              margin="dense"
              name="whatsappChofer"
              label="WhatsApp del Chofer"
              value={formik.values.whatsappChofer}
              onChange={formik.handleChange}
              error={formik.touched.whatsappChofer && Boolean(formik.errors.whatsappChofer)}
              helperText={formik.touched.whatsappChofer && formik.errors.whatsappChofer}
            />
            <TextField
              fullWidth
              margin="dense"
              name="codigo"
              label="Código"
              value={formik.values.codigo}
              onChange={formik.handleChange}
              error={formik.touched.codigo && Boolean(formik.errors.codigo)}
              helperText={formik.touched.codigo && formik.errors.codigo}
              InputProps={{
                endAdornment: (
                  <Button onClick={regenerateCode} color="primary">
                    Regenerar Código
                  </Button>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {editingHojaDeRuta ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </DialogActions>
        </form>
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

      <Backdrop open={loading} style={{ zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};

HojasDeRutaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default HojasDeRutaPage;
