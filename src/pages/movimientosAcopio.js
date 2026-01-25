// pages/MovimientosAcopioPage.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Button, Container, Stack, Typography, Tabs, Tab, Paper, Grid, Snackbar, Alert,
  Dialog, DialogContent, TextField, Divider, LinearProgress, IconButton, Tooltip
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import AcopioService from 'src/services/acopioService';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Nuevos componentes:
import HeaderAcopioSummary from 'src/components/headerAcopioSummary';
import MaterialesTableV2 from 'src/components/materialesTableV2';
import AcopioVisor from 'src/components/acopioVisor';

// Tu tabla actual de Remitos:
import RemitosTable from 'src/components/remitosTable';

// Buscador (para lista de precios)
import ListaPreciosBuscador from 'src/components/listaPreciosBuscador';

/** ------------------------------
 *  FLAGS DE FUNCIONALIDAD (configurables)
 *  ------------------------------ */
const ENABLE_HOJA_UPLOAD = false;  // activar cuando backend listo
const ENABLE_HOJA_DELETE = false;  // activar cuando backend listo

const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();

  // Estado principal
  const [tabActiva, setTabActiva] = useState('acopio');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [acopio, setAcopio] = useState(null);

  // Setear breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Acopios', href: `/acopios?empresaId=${acopio?.empresaId || ''}`, icon: <InventoryIcon fontSize="small" /> },
      { label: acopio?.codigo || 'Movimientos', icon: <VisibilityIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [acopio?.codigo, acopio?.empresaId, setBreadcrumbs]);
  const [compras, setCompras] = useState([]);
  const [remitos, setRemitos] = useState([]);
  const [remitoMovimientos, setRemitoMovimientos] = useState({});
  const [remitosDuplicados, setRemitosDuplicados] = useState(new Set());

  const [materialesAgrupados, setMaterialesAgrupados] = useState({});
  const [estadoLoading, setEstadoLoading] = useState(false);

  // Editor ya no se necesita - la edición se hace en página separada

  // Visor
  const [pageIdx, setPageIdx] = useState(0);
  const acopioFileInputRef = useRef(null);

  // Remitos: expand + eliminar
  const [expanded, setExpanded] = useState(null);
  const [remitoAEliminar, setRemitoAEliminar] = useState(null);
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false);

  // Helpers
  const pages = useMemo(
    () => (Array.isArray(acopio?.url_image) ? acopio.url_image.filter(Boolean) : []),
    [acopio]
  );
  const totalPages = pages.length;
  const hasAcopioPages = totalPages > 0;
  const nextUrl = hasAcopioPages ? pages[(pageIdx + 1) % totalPages] : null;

  const va = Number(acopio?.valor_acopio) || 0;
  const vd = Number(acopio?.valor_desacopio) || 0;
  const porcentajeDisponible = va > 0 ? Math.max(0, Math.min(100, (1 - vd / va) * 100)) : 0;

  const formatCurrency = (amount) =>
    amount ? Number(amount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }) : '$ 0';

  // Fetchers
  const fetchAcopio = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const acopioData = await AcopioService.obtenerAcopio(acopioId);

      acopioData.tipo = acopioData.tipo || 'materiales';
      if (typeof acopioData.activo !== 'boolean') {
        acopioData.activo = (acopioData.estado || '').toLowerCase() !== 'inactivo';
      }

      setAcopio(acopioData);

      const comprasData = await AcopioService.obtenerCompras(acopioId);
      setCompras(comprasData || []);
      setPageIdx(0);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener información del acopio', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  const fetchRemitos = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const remitosResp = await AcopioService.obtenerRemitos(acopioId);
      setRemitos(remitosResp || []);
      setRemitosDuplicados(detectarDuplicados(remitosResp || []));
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener remitos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  const fetchMovimientos = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const { movimientos: movs, error } = await AcopioService.obtenerMovimientos(acopioId);
      if (error) throw new Error('Error al obtener movimientos');
      const comprasData = await AcopioService.obtenerCompras(acopioId);
      const union = [...(movs || []), ...(comprasData || [])];

      // Agrupar
      const agrupados = union.reduce((acc, mov) => {
        const key = (mov.codigo || '—') + "_" + (mov.descripcion || '');
        if (!acc[key]) {
          acc[key] = {
            codigo: mov.codigo || "Sin código",
            descripcion: mov.descripcion || '',
            valorUnitario: mov.valorUnitario || 0,
            cantidadAcopiada: 0,
            cantidadDesacopiada: 0,
            valorTotalAcopiado: 0,
            valorTotalDesacopiado: 0,
            detalles: []
          };
        }
        if (mov.tipo === 'acopio') {
          acc[key].cantidadAcopiada += parseInt(mov.cantidad, 10) || 0;
          acc[key].valorTotalAcopiado += Number(mov.valorOperacion) || 0;
        } else if (mov.tipo === 'desacopio') {
          acc[key].cantidadDesacopiada += parseInt(mov.cantidad, 10) || 0;
          acc[key].valorTotalDesacopiado += Number(mov.valorOperacion) || 0;
        }
        acc[key].detalles.push(mov);
        return acc;
      }, {});
      setMaterialesAgrupados(agrupados);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener los movimientos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  // Duplicados por número y por valor/fecha
  const detectarDuplicados = (lista) => {
    const porNumero = {};
    const porVF = {};
    lista.forEach((r) => {
      if (r.numero_remito) {
        const k = r.numero_remito.trim().toLowerCase();
        porNumero[k] = porNumero[k] || [];
        porNumero[k].push(r.id);
      }
      const k2 = `${r.valorOperacion}_${new Date(r.fecha).toISOString().split('T')[0]}`;
      porVF[k2] = porVF[k2] || [];
      porVF[k2].push(r.id);
    });
    const set = new Set();
    Object.values(porNumero).forEach(ids => { if (ids.length > 1) ids.forEach(id => set.add(id)); });
    Object.values(porVF).forEach(ids => { if (ids.length > 1) ids.forEach(id => set.add(id)); });
    return set;
  };

  // Toggle activo
  const handleToggleActivo = async () => {
    if (!acopio) return;
    try {
      setEstadoLoading(true);
      const nuevoActivo = !(acopio.activo !== false);
      const resp = await AcopioService.cambiarEstadoAcopio(acopioId, nuevoActivo);
      setAcopio(prev => ({ ...prev, activo: nuevoActivo, estado: nuevoActivo ? 'activo' : 'inactivo' }));
      setAlert({ open: true, message: resp?.message || `Acopio ${nuevoActivo ? 'activado' : 'desactivado'}`, severity: 'success' });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo cambiar el estado del acopio', severity: 'error' });
    } finally {
      setEstadoLoading(false);
    }
  };

  // Eliminar remito
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

  // Tabs: lazy fetch
  useEffect(() => {
    if (!acopioId) return;
    if (tabActiva === 'acopio') fetchAcopio();
    if (tabActiva === 'remitos') fetchRemitos();
    if (tabActiva === 'materiales') fetchMovimientos();
  }, [tabActiva, acopioId, fetchAcopio, fetchRemitos, fetchMovimientos]);

  const handleChangeTab = (_e, v) => setTabActiva(v);

  const handleEditAcopio = () => {
    // Redirigir a la página de editar acopio
    router.push(`/editarAcopio?empresaId=${acopio?.empresaId}&acopioId=${acopioId}`);
  };

  const handleUploadFromHeader = () => {
    // Lleva a HOJAS; la subida se hace dentro del visor
    setTabActiva('hojas');
  };

  const handleAcopioFilesSelected = async (e) => {
    const files = e.target?.files;
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      await AcopioService.subirHojasAcopio(acopioId, files);
      setAlert({ open: true, message: 'Hojas del acopio subidas correctamente', severity: 'success' });
      await fetchAcopio();
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudieron subir las hojas del acopio', severity: 'error' });
    } finally {
      if (e.target) e.target.value = '';
      setLoading(false);
    }
  };

  const handleEliminarPaginaAcopio = async (index) => {
    try {
      setLoading(true);
      await AcopioService.eliminarHojaAcopio(acopioId, index);
      setAlert({ open: true, message: 'Página eliminada', severity: 'success' });
      const wasLast = index === (pages.length - 1);
      await fetchAcopio();
      if (wasLast) setPageIdx((p) => Math.max(0, p - 1));
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo eliminar la página', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchActualTab = async () => {
    if (tabActiva === 'remitos') fetchRemitos();
    else if (tabActiva === 'materiales') fetchMovimientos();
    else if (tabActiva === 'acopio') fetchAcopio();
  };

  // Navegación con teclado en HOJAS
  useEffect(() => {
    if (tabActiva !== 'hojas') return;
    const onKey = (e) => {
      if (!hasAcopioPages) return;
      if (e.key === 'ArrowRight') setPageIdx((i) => (i + 1) % totalPages);
      if (e.key === 'ArrowLeft') setPageIdx((i) => (i - 1 + totalPages) % totalPages);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabActiva, hasAcopioPages, totalPages]);

  // Render
  return (
    <Box component="main">
      <Container maxWidth="xl">
        {/* HEADER */}
        <HeaderAcopioSummary
          acopio={acopio}
          porcentajeDisponible={porcentajeDisponible}
          onVolver={() => router.push(`/acopios?empresaId=${acopio?.empresaId || ''}`)}
          onEditar={handleEditAcopio}
          onUploadClick={handleUploadFromHeader}
          onRecalibrarImagenes={() => AcopioService.recalibrarImagenes(acopioId)}
          onRefrescar={fetchActualTab}
          isAdmin={Boolean(user?.admin)}
        />

        {/* TABS */}
        <Tabs value={tabActiva} onChange={handleChangeTab}>
          <Tab label="Info Acopio" value="acopio" />
          <Tab label="Remitos" value="remitos" />
          <Tab label="Materiales" value="materiales" />
          {acopio?.tipo === 'lista_precios' && <Tab label="Buscar materiales" value="buscar" />}
          {hasAcopioPages && (
            <Tab label={acopio?.tipo === 'lista_precios' ? 'Lista original' : 'Comprobante original'} value="hojas" />
          )}
        </Tabs>

        {loading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Cargando...</Typography>
          </Stack>
        )}

        {/* MATERIALS */}
        {tabActiva === 'materiales' && (
          <Box sx={{ mt: 2 }}>
            <MaterialesTableV2 materialesAgrupados={materialesAgrupados} loading={loading} tipo={acopio?.tipo || 'materiales'} />
          </Box>
        )}

        {/* REMITOS */}
        {tabActiva === 'remitos' && (
          <Box sx={{ mt: 2 }}>
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

        {/* BUSCAR (para lista de precios) */}
        {tabActiva === 'buscar' && acopio?.tipo === 'lista_precios' && (
          <Box sx={{ mt: 2 }}>
            <ListaPreciosBuscador acopioId={acopioId} />
          </Box>
        )}

        {/* INFO ACOPIO + editor */}
        {tabActiva === 'acopio' && (
          <Box sx={{ mt: 2 }}>
            {acopio && (
              <Paper elevation={2} sx={{ p: 3 }}>
                {/* Estado + toggle + edición */}
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
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
                  <Button variant="outlined" onClick={handleEditAcopio}>Editar Acopio</Button>
                </Stack>

                <Typography variant="h6" gutterBottom>Resumen del Acopio</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Código</Typography>
                    <Typography>{acopio.codigo || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Proveedor</Typography>
                    <Typography>{acopio.proveedor || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Proyecto</Typography>
                    <Typography>{acopio.proyecto_nombre || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Tipo</Typography>
                    <Typography>{(acopio.tipo || 'materiales').replace('_', ' ')}</Typography>
                  </Grid>

                  {/* KPIs */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Valor Total Acopiado</Typography>
                    <Typography>{formatCurrency(acopio?.valor_acopio)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Valor Total Desacopiado</Typography>
                    <Typography>{formatCurrency(acopio?.valor_desacopio)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Disponible {porcentajeDisponible.toFixed(2)}%</Typography>
                    <LinearProgress variant="determinate" value={porcentajeDisponible} />
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        )}

        {/* VISOR */}
        {tabActiva === 'hojas' && hasAcopioPages && (
          <Box sx={{ mt: 2 }}>
            <AcopioVisor
              pages={pages}
              pageIdx={pageIdx}
              setPageIdx={setPageIdx}
              onUploadFiles={handleAcopioFilesSelected}
              onDeletePage={handleEliminarPaginaAcopio}
              enableUpload={ENABLE_HOJA_UPLOAD}
              enableDelete={ENABLE_HOJA_DELETE}
              nextPreviewUrl={nextUrl}
            />
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
                <Button variant="contained" color="error" startIcon={<DeleteOutlineIcon />} onClick={eliminarRemito}>
                  Eliminar
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>
        )}

        {/* Snackbar */}
        <Snackbar
          open={alert.open}
          autoHideDuration={5000}
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
