// pages/MovimientosAcopioPage.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Button, Container, Stack, Typography, Tabs, Tab, Paper, Grid, Snackbar, Alert,
  Dialog, DialogContent, TextField, Divider, LinearProgress
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { useAuthContext } from 'src/contexts/auth-context';
import AcopioService from 'src/services/acopioService';

// Nuevos componentes:
import HeaderAcopioSummary from 'src/components/headerAcopioSummary';
import MaterialesTableV2 from 'src/components/materialesTableV2';
import AcopioVisor from 'src/components/acopioVisor';

// Tu tabla actual de Remitos:
import RemitosTable from 'src/components/remitosTable';



const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;
  const { user } = useAuthContext();

  // Estado
  const [tabActiva, setTabActiva] = useState('acopio');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [acopio, setAcopio] = useState(null);
  const [compras, setCompras] = useState([]);
  const [remitos, setRemitos] = useState([]);
  const [remitoMovimientos, setRemitoMovimientos] = useState({});
  const [remitosDuplicados, setRemitosDuplicados] = useState(new Set());

  const [materialesAgrupados, setMaterialesAgrupados] = useState({});
  const [estadoLoading, setEstadoLoading] = useState(false);

  // Editor
  const [editMode, setEditMode] = useState(false);
  const [formAcopio, setFormAcopio] = useState({
    codigo: '',
    proveedor: '',
    proyecto_nombre: '',
    tipo: 'materiales'
  });

  // Visor
  const [pageIdx, setPageIdx] = useState(0);
  const acopioFileInputRef = useRef(null);

  // Helpers
  const pages = useMemo(
    () => (Array.isArray(acopio?.url_image) ? acopio.url_image.filter(Boolean) : []),
    [acopio]
  );
  const totalPages = pages.length;
  const hasAcopioPages = totalPages > 0;

  const va = Number(acopio?.valor_acopio) || 0;
  const vd = Number(acopio?.valor_desacopio) || 0;
  const porcentajeDisponible = va > 0 ? Math.max(0, Math.min(100, (1 - vd / va) * 100)) : 0;

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
      setFormAcopio({
        codigo: acopioData.codigo || '',
        proveedor: acopioData.proveedor || '',
        proyecto_nombre: acopioData.proyecto_nombre || '',
        tipo: acopioData.tipo || 'materiales'
      });

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
        const key = mov.codigo + "_" + mov.descripcion || '(sin código)';
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

  // Tabs: lazy fetch
  useEffect(() => {
    if (!acopioId) return;
    if (tabActiva === 'acopio') fetchAcopio();
    if (tabActiva === 'remitos') fetchRemitos();
    if (tabActiva === 'materiales') fetchMovimientos();
  }, [tabActiva, acopioId, fetchAcopio, fetchRemitos, fetchMovimientos]);

  // Handlers
  const handleChangeTab = (_e, v) => setTabActiva(v);

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

  const handleSaveAcopio = async () => {
    if (!acopio) return;
    try {
      setLoading(true);
      const ok = await AcopioService.editarAcopio(acopioId, {
        codigo: formAcopio.codigo?.trim(),
        proveedor: formAcopio.proveedor?.trim(),
        proyecto_nombre: formAcopio.proyecto_nombre?.trim(),
        tipo: formAcopio.tipo
      });
      if (ok) {
        setAlert({ open: true, message: 'Acopio actualizado', severity: 'success' });
        setEditMode(false);
        await fetchAcopio();
      } else {
        setAlert({ open: true, message: 'No se pudo actualizar el acopio', severity: 'error' });
      }
    } catch {
      setAlert({ open: true, message: 'Error al actualizar el acopio', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFromHeader = () => {
    // Dispara el input del visor cuando estés en la pestaña hojas
    setTabActiva('hojas');
    // El input está dentro del visor
  };

  const handleAcopioFilesSelected = async (e) => {
    const files = e.target.files;
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
      e.target.value = '';
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

  // Render
  return (
    <Box component="main">
      <Container maxWidth="xl">
        {/* HEADER */}
        <HeaderAcopioSummary
          acopio={acopio}
          porcentajeDisponible={porcentajeDisponible}
          onVolver={() => router.push(`/acopios?empresaId=${acopio?.empresaId || ''}`)}
          onEditar={() => setEditMode(true)}
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
              expanded={null}
              setExpanded={() => {}}
              router={router}
              acopioId={acopioId}
              remitosDuplicados={remitosDuplicados}
              setDialogoEliminarAbierto={() => {}}
              setRemitoAEliminar={() => {}}
            />
          </Box>
        )}

        {/* INFO ACOPIO + editor simple */}
        {tabActiva === 'acopio' && (
          <Box sx={{ mt: 2 }}>
            {acopio && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Resumen del Acopio</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2">Código</Typography>
                    {!editMode ? (
                      <Typography>{acopio.codigo || '—'}</Typography>
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
                      <Typography>{acopio.proveedor || '—'}</Typography>
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
                      <Typography>{acopio.proyecto_nombre || '—'}</Typography>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        value={formAcopio.proyecto_nombre}
                        onChange={(e) => setFormAcopio((p) => ({ ...p, proyecto_nombre: e.target.value }))}
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

                  {/* KPIs */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Valor Total Acopiado</Typography>
                    <Typography>
                      {(Number(acopio?.valor_acopio) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Valor Total Desacopiado</Typography>
                    <Typography>
                      {(Number(acopio?.valor_desacopio) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">Disponible {porcentajeDisponible.toFixed(2)}%</Typography>
                    <LinearProgress variant="determinate" value={porcentajeDisponible} />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1}>
                  {!editMode ? (
                    <Button variant="outlined" onClick={() => setEditMode(true)}>Editar</Button>
                  ) : (
                    <>
                      <Button variant="text" onClick={() => {
                        setEditMode(false);
                        setFormAcopio({
                          codigo: acopio.codigo || '',
                          proveedor: acopio.proveedor || '',
                          proyecto_nombre: acopio.proyecto_nombre || '',
                          tipo: acopio.tipo || 'materiales'
                        });
                      }}>Cancelar</Button>
                      <Button variant="contained" onClick={handleSaveAcopio}>Guardar</Button>
                    </>
                  )}
                </Stack>
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
            //   onUploadFiles={!ENABLE_HOJA_UPLOAD ? undefined : handleAcopioFilesSelected}
            //   onDeletePage={!ENABLE_HOJA_DELETE ? undefined : handleEliminarPaginaAcopio}
            //   enableUpload={ENABLE_HOJA_UPLOAD}
            //   enableDelete={ENABLE_HOJA_DELETE}
            onUploadFiles={handleAcopioFilesSelected}
              onDeletePage={handleEliminarPaginaAcopio}
              enableUpload={false}
              enableDelete={false}
            />
          </Box>
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
      </Container>
    </Box>
  );
};

MovimientosAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovimientosAcopioPage;
