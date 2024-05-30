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
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  IconButton,
  MenuItem,
  Collapse,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircle from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import mensajeProgramadoService from 'src/services/mensajeProgramadoService';
import { useRouter } from 'next/router';
import CancelIcon from '@mui/icons-material/Cancel';

const tiposMensajes = [
  { tipo: 'Recordatorio', texto: 'Este es un recordatorio para...' },
  { tipo: 'Hoja de ruta', texto: 'Hola! Hoy seré tu asistente en este viaje. Solo tienes que enviarme una foto de cada remito que entregues y yo me encargo de registrarlo en el sistema. Para comenzar debes ingresar tu código asignado para que pueda verificar tu identidad.' }
];

const formatTimezone = (date) => {
    const offset = -date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() + offset * 60000);
    return adjustedDate.toISOString().slice(0, 16);
  };

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return formatTimezone(date)
};

const dateToTimestamp = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString();
};

const MensajesProgramadosPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;
  const [mensajes, setMensajes] = useState([]);
  const [filteredMensajes, setFilteredMensajes] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMensaje, setEditingMensaje] = useState(null);
  const [filterTexto, setFilterTexto] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [filtersVisible, setFiltersVisible] = useState(false);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    if (empresaId) {
      const fetchMensajes = async () => {
        const mensajesData = await mensajeProgramadoService.getMensajesProgramadosByEmpresa(empresaId);
        setMensajes(mensajesData);
      };

      fetchMensajes();
    }
  }, [empresaId]);

  useEffect(() => {
    let filtered = mensajes;

    if (filterTexto) {
      filtered = filtered.filter((mensaje) => mensaje.texto.includes(filterTexto));
    }

    if (filterNumero) {
      filtered = filtered.filter((mensaje) => mensaje.numero.includes(filterNumero));
    }

    if (filterFecha) {
      filtered = filtered.filter((mensaje) => mensaje.fecha.startsWith(filterFecha));
    }

    if (filterTipo) {
      filtered = filtered.filter((mensaje) => mensaje.tipo === filterTipo);
    }

    if (filterEstado) {
      filtered = filtered.filter((mensaje) => mensaje.estado === filterEstado);
    }

    setFilteredMensajes(filtered);
  }, [filterTexto, filterNumero, filterFecha, filterTipo, filterEstado, mensajes]);

  const formik = useFormik({
    initialValues: {
      fecha: editingMensaje ? formatDate(editingMensaje.fecha) : formatTimezone(new Date()),
      texto: editingMensaje ? editingMensaje.texto : '',
      numero: editingMensaje ? editingMensaje.numero : '',
      tipo: editingMensaje ? editingMensaje.tipo : '',
      estado: editingMensaje ? editingMensaje.estado : 'Pendiente',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      fecha: Yup.string().required('La fecha es requerida'),
      texto: Yup.string().required('El texto es requerido'),
      numero: Yup.string().required('El número es requerido'),
      tipo: Yup.string().required('El tipo es requerido'),
      estado: Yup.string().required('El estado es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        values.fecha = dateToTimestamp(values.fecha);
        values.empresaId = empresaId;
        if (editingMensaje) {
          await mensajeProgramadoService.updateMensajeProgramado(editingMensaje.id, values);
          setSnackbarMessage('Mensaje actualizado con éxito');
        } else {
          await mensajeProgramadoService.createMensajeProgramado(values);
          setSnackbarMessage('Mensaje creado con éxito');
        }
        setSnackbarSeverity('success');
        const mensajesData = await mensajeProgramadoService.getMensajesProgramadosByEmpresa(empresaId);
        setMensajes(mensajesData);
      } catch (error) {
        console.log(error);
        setSnackbarMessage('Error al guardar el mensaje');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setIsDialogOpen(false);
        setEditingMensaje(null);
      }
    },
  });

  const handleOpenDialog = () => {
    setEditingMensaje(null);
    formik.resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingMensaje(null);
    formik.resetForm();
    setIsDialogOpen(false);
  };

  const startEditMensaje = (mensaje) => {
    setEditingMensaje(mensaje);
    formik.setValues({
      ...mensaje,
      fecha: formatDate(mensaje.fecha)
    });
    setIsDialogOpen(true);
  };

  const handleCancelarMensaje = async (id) => {
    try {
      await mensajeProgramadoService.cancelarMensajeProgramado(id);
      setSnackbarMessage('Mensaje cancelado con éxito');
      setSnackbarSeverity('success');
      const mensajesData = await mensajeProgramadoService.getMensajesProgramadosByEmpresa(empresaId);
      setMensajes(mensajesData);
    } catch (error) {
      setSnackbarMessage('Error al cancelar el mensaje');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleTipoChange = (e) => {
    const tipoSeleccionado = e.target.value;
    const textoAsignado = tiposMensajes.find(tipo => tipo.tipo === tipoSeleccionado)?.texto || '';
    formik.setFieldValue('tipo', tipoSeleccionado);
    formik.setFieldValue('texto', textoAsignado);
  };

  const getChipColor = (estado) => {
    switch (estado) {
      case 'Pendiente':
        return 'default';
      case 'Enviado':
        return 'success';
      case 'Cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Head>
        <title>Gestionar Mensajes Programados</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Gestionar Mensajes Programados</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="primary" startIcon={<AddCircle />} onClick={handleOpenDialog}>
                Agregar Mensaje
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
                  label="Buscar por texto"
                  variant="outlined"
                  onChange={(e) => setFilterTexto(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Buscar por número de teléfono"
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
                <TextField
                  label="Filtrar por fecha"
                  variant="outlined"
                  type="datetime-local"
                  onChange={(e) => setFilterFecha(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <FormControl>
                  <InputLabel>Filtrar por tipo</InputLabel>
                  <Select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    label="Filtrar por tipo"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {tiposMensajes.map(({ tipo }) => (
                      <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel>Filtrar por estado</InputLabel>
                  <Select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    label="Filtrar por estado"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="Pendiente">Pendiente</MenuItem>
                    <MenuItem value="Enviado">Enviado</MenuItem>
                    <MenuItem value="Cancelado">Cancelado</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Collapse>
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Texto del Mensaje</TableCell>
                    <TableCell>Número de Teléfono</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMensajes.map((mensaje) => (
                    <TableRow key={mensaje.id}>
                      <TableCell>{formatDate(mensaje.fecha)}</TableCell>
                      <TableCell>{mensaje.tipo}</TableCell>
                      <TableCell>{mensaje.texto}</TableCell>
                      <TableCell>{mensaje.numero}</TableCell>
                      <TableCell>
                        <Chip label={mensaje.estado} color={getChipColor(mensaje.estado)} />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => startEditMensaje(mensaje)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleCancelarMensaje(mensaje.id)} disabled={mensaje.estado !== 'Pendiente'}>
                          <CancelIcon />
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
        <DialogTitle>{editingMensaje ? 'Editar Mensaje' : 'Agregar Mensaje'}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              name="fecha"
              label="Fecha"
              type="datetime-local"
              value={formik.values.fecha}
              onChange={formik.handleChange}
              error={formik.touched.fecha && Boolean(formik.errors.fecha)}
              helperText={formik.touched.fecha && formik.errors.fecha}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Tipo</InputLabel>
              <Select
                name="tipo"
                value={formik.values.tipo}
                onChange={handleTipoChange}
                error={formik.touched.tipo && Boolean(formik.errors.tipo)}
              >
                {tiposMensajes.map(({ tipo }) => (
                  <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="dense"
              name="texto"
              label="Texto del Mensaje"
              value={formik.values.texto}
              onChange={formik.handleChange}
              error={formik.touched.texto && Boolean(formik.errors.texto)}
              helperText={formik.touched.texto && formik.errors.texto}
            />
            <TextField
              fullWidth
              margin="dense"
              name="numero"
              label="Número de Teléfono"
              value={formik.values.numero}
              onChange={formik.handleChange}
              error={formik.touched.numero && Boolean(formik.errors.numero)}
              helperText={formik.touched.numero && formik.errors.numero}
            />
            {editingMensaje  &&
            <FormControl fullWidth margin="dense">
              <InputLabel>Estado</InputLabel>
              <Select
                name="estado"
                value={formik.values.estado}
                onChange={formik.handleChange}
                error={formik.touched.estado && Boolean(formik.errors.estado)}
              >
                <MenuItem value="Pendiente">Pendiente</MenuItem>
                <MenuItem value="Enviado">Enviado</MenuItem>
                <MenuItem value="Cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {editingMensaje ? 'Guardar Cambios' : 'Agregar'}
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
    </>
  );
};

MensajesProgramadosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MensajesProgramadosPage;
