import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogContent,
  Paper,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  TextField
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';
import RemitosTable from 'src/components/remitosTable';
import MaterialesTable from 'src/components/materialesTable';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListaPreciosBuscador from 'src/components/listaPreciosBuscador';
import { useAuthContext } from 'src/contexts/auth-context';


/** ------------------------------
 *  FLAGS DE FUNCIONALIDAD (configurables)
 *  ------------------------------ */
const ENABLE_HOJA_UPLOAD = true; // activar cuando el backend esté listo
const ENABLE_HOJA_DELETE = true; // activar cuando el backend esté listo

const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;

  const { user } = useAuthContext();
  const [movimientos, setMovimientos] = useState([]);
  const [materialesAgrupados, setMaterialesAgrupados] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [expanded, setExpanded] = useState(null);
  const [tabActiva, setTabActiva] = useState('acopio');

  const [acopio, setAcopio] = useState(null);
  const [compras, setCompras] = useState([]);
  const [remitoMovimientos, setRemitoMovimientos] = useState({});
  const [loading, setLoading] = useState(false);

  const [remitoAEliminar, setRemitoAEliminar] = useState(null);
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false);
  const [remitosDuplicados, setRemitosDuplicados] = useState(new Set());

  // ---- Hojas del ACOPIO ----
  const acopioFileInputRef = useRef(null);
  const [pageIdx, setPageIdx] = useState(0);

  const pages = Array.isArray(acopio?.url_image) ? acopio.url_image.filter(Boolean) : [];
  const hasAcopioPages = pages.length > 0;

  const totalPages = pages.length;
  const currentUrl = hasAcopioPages ? pages[pageIdx] : null;
  const nextIdx = hasAcopioPages ? (pageIdx + 1) % totalPages : 0;
  const prevIdx = hasAcopioPages ? (pageIdx - 1 + totalPages) % totalPages : 0;
  const nextUrl = hasAcopioPages ? pages[nextIdx] : null;
  const [estadoLoading, setEstadoLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [formAcopio, setFormAcopio] = useState({
    codigo: '',
    proveedor: '',
    proyecto_nombre: '',
    tipo: 'materiales' // 'materiales' | 'lista_precios'
  });

  const formatCurrency = (amount) =>
    amount ? amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }) : '$ 0';

  const fetchAcopio = useCallback(async () => {
    try {
      if (!acopioId) return;
      setLoading(true);
      const acopioData = await AcopioService.obtenerAcopio(acopioId);
      acopioData.tipo = acopioData.tipo || 'materiales';
      acopioData.tipo = acopioData.tipo || 'materiales';
      // si no existe el flag, lo consideramos activo por defecto
      if (typeof acopioData.activo !== 'boolean') {
        acopioData.activo = (acopioData.estado || '').toLowerCase() !== 'inactivo';
      }
      setAcopio(acopioData);
      setFormAcopio({
       codigo: acopioData.codigo || '',
       proveedor: acopioData.proveedor || '',
       proyecto_nombre: acopioData.proyecto_nombre || '',
       tipo: acopioData.tipo || 'materiales'
     });

      const comprasData = await AcopioService.obtenerCompras(acopioId);
      setCompras(comprasData || []);
      // si cambian las páginas, reseteo el índice a 0
      setPageIdx(0);
    } catch (error) {
      console.error('Error al obtener acopio o compras:', error);
      setAlert({ open: true, message: 'Error al obtener información del acopio', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  const [remitos, setRemitos] = useState([]);
  
  const handleToggleActivo = async () => {
    if (!acopio) return;
    try {
      setEstadoLoading(true);
      const activoActual = acopio.activo !== false; // true salvo que sea false explícito
      const nuevoActivo = !activoActual;
  
      const resp = await AcopioService.cambiarEstadoAcopio(acopioId, nuevoActivo);
      // Optimistic UI
      setAcopio(prev => ({
        ...prev,
        activo: nuevoActivo,
        estado: nuevoActivo ? 'activo' : 'inactivo'
      }));
      setAlert({ open: true, message: resp?.message || `Acopio ${nuevoActivo ? 'activado' : 'desactivado'} correctamente`, severity: 'success' });
    } catch (error) {
      console.error('Error al cambiar estado de acopio:', error);
      setAlert({ open: true, message: 'No se pudo cambiar el estado del acopio', severity: 'error' });
    } finally {
      setEstadoLoading(false);
    }
  };
  
  const fetchRemitos = useCallback(async () => {
    try {
      if (!acopioId) return;
      setLoading(true);
      const remitosResp = await AcopioService.obtenerRemitos(acopioId);
      setRemitos(remitosResp || []);
      setRemitosDuplicados(detectarDuplicados(remitosResp || []));
    } catch (error) {
      console.error('Error al obtener remitos:', error);
      setAlert({ open: true, message: 'Error al obtener remitos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  const eliminarRemito = async () => {
    try {
      const exito = await AcopioService.eliminarRemito(acopioId, remitoAEliminar);
      if (exito) {
        setAlert({ open: true, message: 'Remito eliminado con éxito', severity: 'success' });
        await fetchRemitos();
      } else {
        setAlert({ open: true, message: 'No se pudo eliminar el remito', severity: 'error' });
      }
    } catch (error) {
      console.error('Error al eliminar remito:', error);
      setAlert({ open: true, message: 'Error al eliminar remito', severity: 'error' });
    } finally {
      setDialogoEliminarAbierto(false);
      setRemitoAEliminar(null);
    }
  };

  useEffect(() => {
    if (acopioId) fetchAcopio();
  }, [fetchAcopio, acopioId]);

  useEffect(() => {
    if (acopioId) fetchRemitos();
  }, [fetchRemitos, acopioId]);

  const handleChangeTab = async (_e, newValue) => {
    setTabActiva(newValue);
    if (newValue === 'remitos') fetchRemitos();
    else if (newValue === 'materiales') fetchMovimientos();
    else if (newValue === 'acopio') fetchAcopio();
  };

  const fetchActualTab = async () => {
    if (tabActiva === 'remitos') fetchRemitos();
    else if (tabActiva === 'materiales') fetchMovimientos();
    else if (tabActiva === 'acopio') fetchAcopio();
  };

  // Obtener movimientos y agrupar materiales
  const fetchMovimientos = useCallback(async () => {
    try {
      if (!acopioId) return;
      setLoading(true);
      const { movimientos: movs, error } = await AcopioService.obtenerMovimientos(acopioId);
      const comprasData = await AcopioService.obtenerCompras(acopioId);
      if (error) {
        console.error('Error al obtener movimientos:', error);
        throw new Error('Error al obtener movimientos');
      }
      const union_movimientos = [...(movs || []), ...(comprasData || [])];
      setMovimientos(union_movimientos);

      const agrupados = union_movimientos.reduce((acc, mov) => {
        if (!acc[mov.codigo]) {
          acc[mov.codigo] = {
            codigo: mov.codigo,
            descripcion: mov.descripcion,
            cantidadAcopiada: 0,
            cantidadDesacopiada: 0,
            valorTotalAcopiado: 0,
            valorTotalDesacopiado: 0,
            detalles: []
          };
        }

        if (mov.tipo === 'acopio') {
          acc[mov.codigo].cantidadAcopiada += parseInt(mov.cantidad, 10);
          acc[mov.codigo].valorTotalAcopiado += mov.valorOperacion || 0;
        } else if (mov.tipo === 'desacopio') {
          acc[mov.codigo].cantidadDesacopiada += parseInt(mov.cantidad,10);
          acc[mov.codigo].valorTotalDesacopiado += mov.valorOperacion || 0;
        }

        acc[mov.codigo].detalles.push(mov);
        return acc;
      }, {});

      setMaterialesAgrupados(agrupados);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      setAlert({ open: true, message: 'Error al obtener los movimientos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  const handleSaveAcopio = async () => {
   if (!acopio) return;
   try {
     setLoading(true);
     const payload = {
       codigo: formAcopio.codigo?.trim(),
       proveedor: formAcopio.proveedor?.trim(),
       proyecto_nombre: formAcopio.proyecto_nombre?.trim(),
       tipo: formAcopio.tipo
     };
     const ok = await AcopioService.editarAcopio(acopioId, payload);
     if (ok) {
       setAlert({ open: true, message: 'Acopio actualizado', severity: 'success' });
       setEditMode(false);
       await fetchAcopio();
     } else {
       setAlert({ open: true, message: 'No se pudo actualizar el acopio', severity: 'error' });
     }
   } catch (e) {
     setAlert({ open: true, message: 'Error al actualizar el acopio', severity: 'error' });
   } finally {
     setLoading(false);
   }
 };

  const detectarDuplicados = (lista) => {
    const duplicadosPorNumero = {};
    const duplicadosPorValorYFecha = {};
    lista.forEach((r) => {
      if (r.numero_remito) {
        const claveNumero = r.numero_remito.trim().toLowerCase();
        duplicadosPorNumero[claveNumero] = duplicadosPorNumero[claveNumero] || [];
        duplicadosPorNumero[claveNumero].push(r.id);
      }
      const claveVF = `${r.valorOperacion}_${new Date(r.fecha).toISOString().split('T')[0]}`;
      duplicadosPorValorYFecha[claveVF] = duplicadosPorValorYFecha[claveVF] || [];
      duplicadosPorValorYFecha[claveVF].push(r.id);
    });
    const duplicadosSet = new Set();
    Object.values(duplicadosPorNumero).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicadosSet.add(id));
    });
    Object.values(duplicadosPorValorYFecha).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicadosSet.add(id));
    });
    return duplicadosSet;
  };

const va = Number(acopio?.valor_acopio) || 0;
const vd = Number(acopio?.valor_desacopio) || 0;
const porcentajeDisponible = va > 0 ? Math.max(0, Math.min(100, (1 - vd / va) * 100)) : 0;


  // ----- Handlers Hojas (acopio nivel) -----
  const handleAcopioUploadClick = () => {
    if (!ENABLE_HOJA_UPLOAD) return;
    acopioFileInputRef.current?.click();
  };

  const handleAcopioFilesSelected = async (e) => {
    if (!ENABLE_HOJA_UPLOAD) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      await AcopioService.subirHojasAcopio(acopioId, files);
      setAlert({ open: true, message: 'Hojas del acopio subidas correctamente', severity: 'success' });
      await fetchAcopio(); // refresca url_image
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudieron subir las hojas del acopio', severity: 'error' });
    } finally {
      e.target.value = '';
      setLoading(false);
    }
  };

 const handleUploadListaPrecios = async (e) => {
   const files = e.target.files;
   if (!files || files.length === 0) return;
   try {
     setLoading(true);
     await AcopioService.subirHojasAcopio(acopioId, files);
     setAlert({ open: true, message: 'Imagen/es de lista subidas', severity: 'success' });
     await fetchAcopio();
   } catch (err) {
     console.error(err);
     setAlert({ open: true, message: 'Error al subir imagen', severity: 'error' });
   } finally {
     e.target.value = '';
     setLoading(false);
   }
 };


  const handleEliminarPaginaAcopio = async (index) => {
    if (!ENABLE_HOJA_DELETE) return;
    try {
      setLoading(true);
      await AcopioService.eliminarHojaAcopio(acopioId, index);
      setAlert({ open: true, message: 'Página eliminada', severity: 'success' });
      // Ajusto el índice si eliminé la última
      const wasLast = index === totalPages - 1;
      await fetchAcopio();
      if (wasLast) setPageIdx((p) => Math.max(0, p - 1));
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo eliminar la página', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => setPageIdx((i) => (i + 1) % (totalPages || 1));
  const goPrev = () => setPageIdx((i) => (i - 1 + (totalPages || 1)) % (totalPages || 1));

  // Navegación con teclado
  useEffect(() => {
    const onKey = (e) => {
      if (tabActiva !== 'hojas') return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabActiva, totalPages]);

  // Render
  return (
    <Box component="main">
      <Container maxWidth="xl">
        <Box sx={{ mt: 2 }}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(`/acopios?empresaId=${acopio?.empresaId || ''}`)}
          >
            Volver a la lista de acopios
          </Button>
        </Box>

        <Tabs value={tabActiva} onChange={handleChangeTab}>
          <Tab label="Info Acopio" value="acopio" />
          <Tab label="Remitos" value="remitos" />
          <Tab label="Materiales" value="materiales" />
          {hasAcopioPages && <Tab label={acopio?.tipo === 'lista_precios' ? "Lista original": "Comprobante original"} value="hojas" />}
        </Tabs>

        {loading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Cargando...</Typography>
          </Stack>
        )}

        {/* Materiales */}
        {tabActiva === 'materiales' && (
          <MaterialesTable
            materialesAgrupados={materialesAgrupados}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        )}

        {/* Remitos */}
        {tabActiva === 'remitos' && (
          <Box>
            <RemitosTable
              remitos={remitos}
              remitoMovimientos={remitoMovimientos}
              expanded={expanded}
              setExpanded={setExpanded}
              router={router}
              acopioId={acopioId}
              remitosDuplicados={remitosDuplicados}
              setDialogoEliminarAbierto={setDialogoEliminarAbierto}
              setRemitoAEliminar={setRemitoAEliminar}
            />
          </Box>
        )}

        {/* Info Acopio + compras */}
        {tabActiva === 'acopio' && (
          <Box mt={3}>
            {acopio && (
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={acopio?.activo === false ? 'Inactivo' : 'Activo'}
                        color={acopio?.activo === false ? 'default' : 'success'}
                        variant="outlined"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={acopio?.activo !== false}
                            onChange={handleToggleActivo}
                            disabled={estadoLoading}
                          />
                        }
                        label={acopio?.activo !== false ? 'Desactivar' : 'Activar'}
                      />
         <Stack direction="row" spacing={1}>
           {!editMode ? (
             <Button variant="outlined" onClick={() => setEditMode(true)}>Editar</Button>
           ) : (
             <>
               <Button variant="text" onClick={() => { setEditMode(false); setFormAcopio({
                 codigo: acopio.codigo || '', proveedor: acopio.proveedor || '',
                 proyecto_nombre: acopio.proyecto_nombre || '', tipo: acopio.tipo || 'materiales'
               }); }}>Cancelar</Button>
               <Button variant="contained" onClick={handleSaveAcopio}>Guardar</Button>
             </>
           )}
         </Stack>
                    </Stack>
                <Typography variant="h6" gutterBottom>Resumen del Acopio</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Código</Typography>
                  {!editMode ? (
                    <Typography>{acopio.codigo}</Typography>
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      value={formAcopio.codigo}
                      onChange={(e) => setFormAcopio((p) => ({ ...p, codigo: e.target.value }))}
                    />
                  )}
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Proveedor</Typography>
                    {!editMode ? (
                      <Typography>{acopio.proveedor}</Typography>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        value={formAcopio.proveedor}
                        onChange={(e) => setFormAcopio((p) => ({ ...p, proveedor: e.target.value }))}
                      />
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Proyecto</Typography>
                    {!editMode ? (
                      <Typography>{acopio.proyecto_nombre}</Typography>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        value={formAcopio.proyecto_nombre}
                        onChange={(e) => setFormAcopio((p) => ({ ...p, proyecto_nombre: e.target.value }))}
                        placeholder="Nombre visible del proyecto"
                      />
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Tipo</Typography>
                    {!editMode ? (
                      <Typography>{(acopio.tipo || 'materiales').replace('_', ' ')}</Typography>
                    ) : (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={formAcopio.tipo}
                        onChange={(e) => setFormAcopio((p) => ({ ...p, tipo: e.target.value }))}
                        SelectProps={{ native: true }}
                      >
                        <option value="materiales">materiales</option>
                        <option value="lista_precios">lista_precios</option>
                      </TextField>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Valor Total Acopiado</Typography>
                    <Typography>{formatCurrency(acopio.valor_acopio)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Valor Total Desacopiado</Typography>
                    <Typography>{formatCurrency(acopio.valor_desacopio)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Disponible {porcentajeDisponible.toFixed(2)}%</Typography>
                    <LinearProgress variant="determinate" value={porcentajeDisponible} />
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {formatCurrency((acopio.valor_acopio || 0) - (acopio.valor_desacopio || 0))}
                    </Typography>
                  </Grid>
                  {formAcopio.tipo === 'lista_precios' && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" spacing={2} alignItems="center">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          style={{ display: 'none' }}
                          ref={acopioFileInputRef}
                          onChange={handleUploadListaPrecios}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<UploadFileIcon />}
                          onClick={() => acopioFileInputRef.current?.click()}
                        >
                          Agregar imagen/lista
                        </Button>
                        {(user.admin) && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<UploadFileIcon />}
                          onClick={() => AcopioService.recalibrarImagenes(acopioId)}
                        >
                          Recalibrar imagenes
                        </Button>)}
                        <Typography variant="body2" color="text.secondary">
                          Se mostrará en la pestaña “{hasAcopioPages ? 'Lista original' : 'Comprobante original'}”.
                        </Typography>
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Valor Unitario</TableCell>
                    <TableCell>Valor Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compras.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{mov.fecha ? new Date(mov.fecha).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{mov.codigo}</TableCell>
                      <TableCell>{mov.descripcion}</TableCell>
                      <TableCell>{mov.cantidad}</TableCell>
                      <TableCell>{formatCurrency(mov.valorUnitario)}</TableCell>
                      <TableCell>{formatCurrency(mov.valorOperacion)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </Box>
        )}

        {/* Hojas: VISOR FULL */}
        {tabActiva === 'hojas' && hasAcopioPages && (
          <Box mt={2}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1, md: 2 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Barra superior del visor */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 1, py: 1 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Página {pageIdx + 1} de {totalPages}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  {ENABLE_HOJA_UPLOAD && (
                    <>
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        ref={acopioFileInputRef}
                        onChange={handleAcopioFilesSelected}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={handleAcopioUploadClick}
                      >
                        Agregar hojas
                      </Button>
                    </>
                  )}
                  {ENABLE_HOJA_DELETE && (
                    <Tooltip title="Eliminar página actual">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleEliminarPaginaAcopio(pageIdx)}
                        >
                          Eliminar
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>

              <Divider sx={{ mb: 1 }} />

              {/* Área principal full (alto de viewport) */}
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: '70vh', md: '78vh' },
                  bgcolor: 'background.default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Botón anterior */}
                <IconButton
                  onClick={goPrev}
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ArrowBackIosNewIcon />
                </IconButton>

                {/* Imagen/PDF actual en modo contain */}
                <a href={currentUrl} target="_blank" rel="noreferrer" style={{ width: '100%', textAlign: 'center' }}>
                  <img
                    src={currentUrl}
                    alt={`Acopio - Página ${pageIdx + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto'
                    }}
                    onError={(e) => { e.currentTarget.style.objectFit = 'contain'; }}
                  />
                </a>

                {/* Botón siguiente con mini preview */}
                <Button
                  onClick={goNext}
                  endIcon={<ArrowForwardIosIcon />}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 36,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundImage: `url("${nextUrl}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <Typography variant="body2">Siguiente</Typography>
                </Button>
              </Box>

              {/* Tira de miniaturas (opcional) */}
              <Stack direction="row" spacing={1} sx={{ mt: 1, px: 1, pb: 1, overflowX: 'auto' }}>
                {pages.map((u, i) => (
                  <Box
                    key={`thumb-${i}`}
                    onClick={() => setPageIdx(i)}
                    sx={{
                      width: 80,
                      height: 56,
                      borderRadius: 1,
                      border: '2px solid',
                      borderColor: i === pageIdx ? 'primary.main' : 'divider',
                      backgroundImage: `url("${u}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'pointer',
                      flex: '0 0 auto'
                    }}
                    title={`Ir a página ${i + 1}`}
                  />
                ))}
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Confirmación eliminar remito */}
        {dialogoEliminarAbierto && (
          <Dialog open={dialogoEliminarAbierto} onClose={() => setDialogoEliminarAbierto(false)}>
            <DialogContent>
              <Typography variant="h6" gutterBottom>
                ¿Estás seguro de que querés eliminar este remito?
              </Typography>
              <Stack direction="row" spacing={2} mt={2}>
                <Button variant="outlined" onClick={() => setDialogoEliminarAbierto(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={eliminarRemito}>Eliminar</Button>
              </Stack>
            </DialogContent>
          </Dialog>
        )}

        {/* Snackbar */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Botón actualizar flotante */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchActualTab}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            Actualizar
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

MovimientosAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovimientosAcopioPage;
