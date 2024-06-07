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
  InputAdornment,
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Backdrop
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircle from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import remitoService from 'src/services/remitoService';
import { useRouter } from 'next/router';
import hojaDeRutaService from 'src/services/hojaDeRutaService';

const RemitosPage = () => {
  const router = useRouter();
  const { hojaDeRutaId } = router.query;
  const [hojaDeRuta, setHojasDeRuta] = useState([]);
  const [remitos, setRemitos] = useState([]);
  const [filteredRemitos, setFilteredRemitos] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRemito, setEditingRemito] = useState(null);
  const [filterNumero, setFilterNumero] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterVerificacionAutomatica, setFilterVerificacionAutomatica] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [validadoCount, setValidadoCount] = useState(0);
  const [revisarCount, setRevisarCount] = useState(0);
  const [pendienteCount, setPendienteCount] = useState(0);
  const [todosCount, setTodosCount] = useState(0); 

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    if (hojaDeRutaId) {
      const fetchRemitos = async () => {
        setIsLoading(true);
        const remitosData = await remitoService.getRemitosByHojaDeRuta(hojaDeRutaId);
        setRemitos(remitosData);
        const hdr = await hojaDeRutaService.getHojaDeRutaById(hojaDeRutaId);
        setHojasDeRuta(hdr);
        setIsLoading(false);
      };

      fetchRemitos();
    }
  }, [hojaDeRutaId]);

  useEffect(() => {
    let filtered = remitos;

    if (filterNumero) {
      filtered = filtered.filter((remito) => remito.numero.includes(filterNumero));
    }

    if (filterEstado) {
      filtered = filtered.filter((remito) => remito.estado === filterEstado);
    }

    if (filterVerificacionAutomatica) {
      filtered = filtered.filter((remito) => {
        if (filterVerificacionAutomatica === 'true') return remito.verificacionAutomatica === true;
        if (filterVerificacionAutomatica === 'false') return remito.verificacionAutomatica === false;
        return remito.verificacionAutomatica === null;
      });
    }

    setFilteredRemitos(filtered);
    setValidadoCount(remitos.filter(remito => remito.verificacionAutomatica === true).length);
    setRevisarCount(remitos.filter(remito => remito.verificacionAutomatica === false).length);
    setPendienteCount(remitos.filter(remito => remito.verificacionAutomatica === "").length);
    setTodosCount(remitos.length); 
  }, [filterNumero, filterEstado, filterVerificacionAutomatica, remitos]);
  
  const handleUpdateRemitos = async () => {
    setIsLoading(true);
    try {
      const remitosData = await remitoService.getRemitosByHojaDeRuta(hojaDeRutaId);
      setRemitos(remitosData);
      const hdr = await hojaDeRutaService.getHojaDeRutaById(hojaDeRutaId);
      setHojasDeRuta(hdr);
    } catch (error) {
      console.error('Error al actualizar la lista de remitos:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formik = useFormik({
    initialValues: {
      fecha: editingRemito ? editingRemito.fecha : new Date().toISOString().slice(0, 10),
      numero: editingRemito ? editingRemito.numero : '',
      estado: editingRemito ? editingRemito.estado : 'Creado',
      verificacionAutomatica: editingRemito ? editingRemito.verificacionAutomatica : '',
      archivos: editingRemito ? editingRemito.archivos : {},
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      fecha: Yup.string().required('La fecha es requerida'),
      numero: Yup.string().required('El número de remito es requerido'),
      estado: Yup.string().required('El estado es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        if (values.archivos.remitoOriginal instanceof File) {
          const remitoURL = await remitoService.uploadFile(values.archivos.remitoOriginal, values.numero);
          values.archivos.remitoOriginal = remitoURL;
        }

        values.hojaDeRutaId = hojaDeRutaId;

        if (editingRemito) {
          await remitoService.updateRemito(editingRemito.id, values);
          setSnackbarMessage('Remito actualizado con éxito');
        } else {
          await remitoService.createRemito(values);
          setSnackbarMessage('Remito creado con éxito');
        }
        setSnackbarSeverity('success');
        const remitosData = await remitoService.getRemitosByHojaDeRuta(hojaDeRutaId);
        setRemitos(remitosData);
      } catch (error) {
        console.log(error);
        setSnackbarMessage('Error al guardar el remito');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setIsDialogOpen(false);
        setEditingRemito(null);
        setIsLoading(false);
      }
    },
  });

  const handleOpenDialog = () => {
    setEditingRemito(null);
    formik.resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingRemito(null);
    formik.resetForm();
    setIsDialogOpen(false);
  };

  const startEditRemito = (remito) => {
    setEditingRemito(remito);
    formik.setValues(remito);
    setIsDialogOpen(true);
  };

  const handleDeleteRemito = async (id) => {
    setIsLoading(true);
    try {
      await remitoService.deleteRemito(id);
      setSnackbarMessage('Remito eliminado con éxito');
      setSnackbarSeverity('success');
      const remitosData = await remitoService.getRemitosByHojaDeRuta(hojaDeRutaId);
      setRemitos(remitosData);
    } catch (error) {
      setSnackbarMessage('Error al eliminar el remito');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const getChipColor = (verificacionAutomatica) => {
    switch (verificacionAutomatica) {
      case true:
        return 'success';
      case false:
        return 'warning';
      case null:
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Head>
        <title>Gestionar Remitos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Detalle hoja de ruta de {hojaDeRuta.nombreChofer} - Código {hojaDeRuta.codigo}</Typography>
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={handleUpdateRemitos} startIcon={<SyncIcon />}>
                
              </Button>
                <Button variant="contained" color="primary" startIcon={<AddCircle />} onClick={handleOpenDialog}>
                  Agregar Remito
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => setFiltersVisible(!filtersVisible)}
                >
                  {filtersVisible ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </Button>
              </Stack>
              <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => setFilterVerificacionAutomatica('')}
              >
                Todos ({todosCount})
              </Button>
                <Button
                  variant="outlined"
                  onClick={() => setFilterVerificacionAutomatica('true')}
                >
                  Validados ({validadoCount})
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setFilterVerificacionAutomatica('false')}
                >
                  Revisar ({revisarCount})
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setFilterVerificacionAutomatica('null')}
                >
                  Pendientes ({pendienteCount})
                </Button>
              </Stack>
            </Stack>
            <Collapse in={filtersVisible}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Buscar por número de remito"
                  variant="outlined"
                  onChange={(e) => setFilterNumero(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl variant="outlined" sx={{ minWidth: 120 }}>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    label="Estado"
                  >
                    <MenuItem value="">
                      <em>Todos</em>
                    </MenuItem>
                    <MenuItem value="Creado">Creado</MenuItem>
                    <MenuItem value="Transportista confirmado">Transportista confirmado</MenuItem>
                    <MenuItem value="Recibido conforme">Recibido conforme</MenuItem>
                    <MenuItem value="Rechazado">Rechazado</MenuItem>
                    <MenuItem value="Recibido parcialmente conforme">Recibido parcialmente conforme</MenuItem>
                  </Select>
                </FormControl>
                <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                  <InputLabel>Verificación Automática</InputLabel>
                  <Select
                    value={filterVerificacionAutomatica}
                    onChange={(e) => setFilterVerificacionAutomatica(e.target.value)}
                    label="Verificación Automática"
                  >
                    <MenuItem value="">
                      <em>Todos</em>
                    </MenuItem>
                    <MenuItem value="true">Validado</MenuItem>
                    <MenuItem value="false">Revisar</MenuItem>
                    <MenuItem value="null">Pendiente</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Collapse>
            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
                <CircularProgress />
              </Box>
            ) : (
              <Paper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Número de Remito</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Verificación Automática</TableCell>
                      <TableCell>Archivos</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRemitos.map((remito) => (
                      <TableRow key={remito.id}>
                        <TableCell>{remito.fecha}</TableCell>
                        <TableCell>{remito.numero}</TableCell>
                        <TableCell>{remito.estado}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              remito.verificacionAutomatica === false ? "Revisar: " + remito.estadoAutomatico : 
                              remito.verificacionAutomatica === true ? "Validado" : 
                              "Pendiente"
                            }
                            color={getChipColor(remito.verificacionAutomatica)}
                          />
                        </TableCell>
                        <TableCell>
                          {remito.archivos.remitoOriginal && (
                            <Button
                              onClick={() => window.open(remito.archivos.remitoOriginal, '_blank')}
                            >
                              Ver Remito Original
                            </Button>
                          )}
                          {remito.archivos.remitoFirmado && (
                            <Button
                              onClick={() => window.open(remito.archivos.remitoFirmado, '_blank')}
                            >
                              Ver Remito Firmado
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => startEditRemito(remito)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteRemito(remito.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Container>
      </Box>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editingRemito ? 'Editar Remito' : 'Agregar Remito'}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              name="fecha"
              label="Fecha"
              type="date"
              value={formik.values.fecha}
              onChange={formik.handleChange}
              error={formik.touched.fecha && Boolean(formik.errors.fecha)}
              helperText={formik.touched.fecha && formik.errors.fecha}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              fullWidth
              margin="dense"
              name="numero"
              label="Número de Remito"
              value={formik.values.numero}
              onChange={formik.handleChange}
              error={formik.touched.numero && Boolean(formik.errors.numero)}
              helperText={formik.touched.numero && formik.errors.numero}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Estado</InputLabel>
              <Select
                name="estado"
                value={formik.values.estado}
                onChange={formik.handleChange}
                error={formik.touched.estado && Boolean(formik.errors.estado)}
              >
                <MenuItem value="Creado">Creado</MenuItem>
                <MenuItem value="Transportista confirmado">Transportista confirmado</MenuItem>
                <MenuItem value="Recibido conforme">Recibido conforme</MenuItem>
                <MenuItem value="Rechazado">Rechazado</MenuItem>
                <MenuItem value="Recibido parcialmente conforme">Recibido parcialmente conforme</MenuItem>
              </Select>
            </FormControl>
            <input
              type="file"
              accept="application/pdf, image/*"
              onChange={(e) => formik.setFieldValue('archivos.remitoOriginal', e.target.files[0])}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {editingRemito ? 'Guardar Cambios' : 'Agregar'}
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

      <Backdrop open={isLoading} style={{ zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};

RemitosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default RemitosPage;
