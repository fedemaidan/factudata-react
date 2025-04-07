import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  TextField,
  Snackbar,
  Alert,
  Grid,
  Paper,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton
} from '@mui/material';
import { useRouter } from 'next/router';
import AcopioService from 'src/services/acopioService';
import ProductosFormSelect from 'src/components/ProductosFormSelect';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import CloseIcon from '@mui/icons-material/Close';

const GestionRemitoPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;

  const [fecha, setFecha] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [valorTotal, setValorTotal] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [remitoId, setRemitoId] = useState(null);
  const [estado, setEstado] = useState('');
  const [archivoRemitoUrl, setArchivoRemitoUrl] = useState(null);
  const [archivoRemitoFile, setArchivoRemitoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showArchivo, setShowArchivo] = useState(true);
  const [showFormulario, setShowFormulario] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [loadingDatosRemito, setLoadingDatosRemito] = useState(false);
  const [loadingProceso, setLoadingProceso] = useState(false);
  const [acopiosDisponibles, setAcopiosDisponibles] = useState([]);
  const [dialogoMoverAbierto, setDialogoMoverAbierto] = useState(false);
  const [nuevoAcopioSeleccionado, setNuevoAcopioSeleccionado] = useState('');
  
  
  useEffect(() => {
  const cargarDatos = async () => {
    try {
      if (!acopioId) return;
      setLoadingDatosRemito(true);

      const disponibles = await AcopioService.getMaterialesAcopiados(acopioId);
      setMaterialesDisponibles(disponibles);

      if (router.query.remitoId) {
        setRemitoId(router.query.remitoId);
        const remito = await AcopioService.obtenerRemito(acopioId, router.query.remitoId);
        setFecha(remito.fecha || '');
        setEstado(remito.estado || '');
        setMovimientos(remito.movimientos || []);
        const url_remito = Array.isArray(remito.url_remito) ? remito.url_remito[0] : remito.url_remito;
        setArchivoRemitoUrl(url_remito || null);
        const total = remito.movimientos?.reduce((sum, m) => sum + (m.valorUnitario * m.cantidad), 0) || 0;
        setValorTotal(total);

        if (acopioId) {
            const acopio = await AcopioService.obtenerAcopio(acopioId);
            const todos = await AcopioService.listarAcopios(acopio.empresaId); // o el método que uses
            setAcopiosDisponibles(todos.filter((a) => a.id !== acopioId));
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del remito:', error);
      setAlert({ open: true, message: 'Error al cargar datos del remito', severity: 'error' });
    } finally {
      setLoadingDatosRemito(false);
    }

  };

  cargarDatos();
  
}, [acopioId, router.query.remitoId]);


  const guardarRemito = async () => {
    try {
      if (!fecha || movimientos.length === 0) {
        setAlert({ open: true, message: 'Completá todos los campos antes de guardar.', severity: 'warning' });
        return;
      }

      setLoadingProceso(true);
      if (remitoId) {
        await AcopioService.editarRemito(acopioId, remitoId, movimientos, {
            fecha,
            valorOperacion: valorTotal,
            estado: 'confirmado'
        }, archivoRemitoFile); 
        
        setAlert({ open: true, message: 'Remito actualizado con éxito', severity: 'success' });
        router.push(`/movimientosAcopio?acopioId=${acopioId}&tab=remitos`);
      } else {
        const resultado = await AcopioService.crearRemitoConMovimientos(acopioId, movimientos, {
          fecha,
          archivo: archivoRemitoFile
        });
  
        setAlert({ open: true, message: 'Remito creado con éxito', severity: 'success' });
        router.push(`/movimientosAcopio?acopioId=${acopioId}`);
      }
    } catch (error) {
      console.error('Error al guardar remito:', error);
      setAlert({ open: true, message: 'Error al guardar remito', severity: 'error' });
    } finally {
      setLoadingProceso(false);
    }
  };
  
  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivoRemitoFile(file);
    setArchivoRemitoUrl(URL.createObjectURL(file));
  };

  const extraerDatosDelArchivo = async () => {
    try {
      if (!archivoRemitoFile && !archivoRemitoUrl) {
        setAlert({ open: true, message: 'Primero subí un archivo del remito.', severity: 'warning' });
        return;
      }
      setLoadingProceso(true);

      const data = await AcopioService.extraerDatosDesdeArchivo(acopioId, archivoRemitoFile, archivoRemitoUrl);

      if (data.materiales) {
        setMovimientos(data.materiales);
        const total = data.materiales.reduce((sum, m) => sum + (m.valorUnitario * m.cantidad), 0);
        setValorTotal(total);
      }

      setAlert({ open: true, message: 'Datos extraídos con éxito.', severity: 'success' });
    } catch (error) {
      console.error('Error al extraer datos del remito:', error);
      setAlert({ open: true, message: 'Error al extraer datos del remito.', severity: 'error' });
    } finally {
      setLoadingProceso(false);
    }
  };

  const getGridColumnSize = () => {
    if (showArchivo && showFormulario) return 6;
    return 12;
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        {loadingDatosRemito && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
            )}
      <Container maxWidth="xl">
        <Typography variant="h5" gutterBottom>
          {remitoId ? 'Editar Remito' : 'Crear nuevo Remito'}
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2} gap={1}>
          <Button onClick={() => setShowArchivo(!showArchivo)} variant="outlined" size="small">
            {showArchivo ? 'Ocultar archivo' : 'Mostrar archivo'}
          </Button>
          <Button onClick={() => setShowFormulario(!showFormulario)} variant="outlined" size="small">
            {showFormulario ? 'Ocultar formulario' : 'Mostrar formulario'}
          </Button>
        </Box>

        <Grid container spacing={4}>
          {showArchivo && (
            <Grid item xs={12} md={getGridColumnSize()}>
              <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1">Archivo del Remito</Typography>
                {archivoRemitoUrl ? (
                  archivoRemitoUrl.endsWith('.pdf') ? (
                    <iframe
                      src={archivoRemitoUrl}
                      width="100%"
                      height="600px"
                      title="Remito PDF"
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '600px',
                        backgroundImage: `url(${archivoRemitoUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        cursor: 'zoom-in'
                      }}
                      onClick={() => setFullscreenOpen(true)}
                    />
                  )
                ) : (
                  <Typography variant="body2">No hay archivo cargado.</Typography>
                )}
                <Button component="label" variant="outlined" fullWidth sx={{ mt: 2 }}>
                  {archivoRemitoUrl ? 'Cambiar archivo' : 'Subir archivo'}
                  <input type="file" hidden onChange={handleArchivoChange} />
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={extraerDatosDelArchivo}
                  disabled={loadingProceso}
                >
                    {loadingProceso ? <CircularProgress size={20} /> : 'Extraer datos'}
                </Button>
                {loading && (
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    <CircularProgress size={20} /> Cargando...
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}

          {showFormulario && (
            <Grid item xs={12} md={getGridColumnSize()}>
              <Stack spacing={3}>
                <TextField
                  label="Fecha"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  fullWidth
                />

                <ProductosFormSelect
                  productos={movimientos}
                  setProductos={setMovimientos}
                  valorTotal={valorTotal}
                  setValorTotal={setValorTotal}
                  opcionesMateriales={materialesDisponibles}
                  acopioId={acopioId}
                  autoCompletarValoresUnitarios
                />

                <Typography variant="subtitle1">
                  Valor total: ${valorTotal.toLocaleString()}
                </Typography>

                <Button variant="contained" onClick={guardarRemito}  disabled={loadingProceso}>
                    {loadingProceso ? <CircularProgress size={20} /> : 'Guardar Remito'}
                </Button>
                {remitoId && (
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setDialogoMoverAbierto(true)}
                    >
                        Mover este remito a otro acopio
                    </Button>
                )}

              </Stack>
            </Grid>
          )}
        </Grid>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Modal fullscreen para imagen */}
        <Dialog open={fullscreenOpen} onClose={() => setFullscreenOpen(false)} maxWidth={false} fullScreen>
          <DialogContent sx={{ p: 0, backgroundColor: '#000' }}>
            <IconButton
              onClick={() => setFullscreenOpen(false)}
              sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>
            <img
              src={archivoRemitoUrl}
              alt="Remito Completo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={dialogoMoverAbierto} onClose={() => setDialogoMoverAbierto(false)} fullWidth maxWidth="sm">
        <DialogContent>
            <Typography variant="h6" gutterBottom>
            Mover remito a otro acopio
            </Typography>

            <TextField
            select
            fullWidth
            label="Seleccioná un acopio de destino"
            value={nuevoAcopioSeleccionado}
            onChange={(e) => setNuevoAcopioSeleccionado(e.target.value)}
            SelectProps={{ native: true }}
            >
            <option value="">-- Seleccionar --</option>
            {acopiosDisponibles.map((a) => (
                <option key={a.id} value={a.id}>
                {a.codigo} - {a.proveedor} ({a.proyecto_nombre})
                </option>
            ))}
            </TextField>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button onClick={() => setDialogoMoverAbierto(false)}>Cancelar</Button>
            <Button
                variant="contained"
                color="primary"
                disabled={!nuevoAcopioSeleccionado}
                onClick={async () => {
                const confirmado = confirm('¿Estás seguro de mover este remito al nuevo acopio?');
                if (!confirmado) return;

                setLoadingProceso(true);
                const ok = await AcopioService.moverRemitoAotroAcopio(remitoId, acopioId, nuevoAcopioSeleccionado);
                setLoadingProceso(false);

                if (ok) {
                    setAlert({ open: true, message: 'Remito movido con éxito', severity: 'success' });
                    router.push(`/movimientosAcopio?acopioId=${nuevoAcopioSeleccionado}&tab=remitos`);
                } else {
                    setAlert({ open: true, message: 'No se pudo mover el remito', severity: 'error' });
                }

                setDialogoMoverAbierto(false);
                }}
            >
                Confirmar movimiento
            </Button>
            </Stack>
        </DialogContent>
        </Dialog>

      </Container>
    </Box>
  );
};

GestionRemitoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default GestionRemitoPage;
