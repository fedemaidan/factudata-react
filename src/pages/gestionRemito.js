import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Button, Container, Stack, Typography, TextField, Snackbar, Alert,
  Grid, Paper, CircularProgress, Dialog, DialogContent, IconButton, Chip,
  Skeleton, Slider, Fab, Tooltip, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useRouter } from 'next/router';

import AcopioService from 'src/services/acopioService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import RemitoReadOnlyTable from 'src/components/remitoReadOnlyTable';
import RemitoItemEditDialog from 'src/components/remitoItemEditDialog';
import ProductosFormSelect from 'src/components/ProductosFormSelect';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { formatCurrency } from 'src/utils/formatters';

function normalizar(t) {
  return (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function completarPorFuzzy(m, baseMateriales) {
  const desc = normalizar(m.descripcion);
  let mejor = null, mejorScore = -1;
  for (const b of baseMateriales) {
    const bd = normalizar(b.descripcion);
    let score = 0;
    for (const p of desc.split(/\s+/)) if (p && bd.includes(p)) score++;
    if (score > mejorScore) { mejorScore = score; mejor = b; }
  }
  return {
    ...m,
    codigo: m.codigo || (mejor && mejor.codigo) || '',
    descripcion: m.descripcion || (mejor && mejor.descripcion) || '',
    valorUnitario: m.valorUnitario != null ? m.valorUnitario : (mejor && mejor.valorUnitario) || 0
  };
}

const GestionRemitoPage = () => {
  const router = useRouter();
  const { acopioId, remitoId: ridQuery, empresaId } = router.query || {};
  const { setBreadcrumbs } = useBreadcrumbs();

  // Datos del acopio
  const [acopio, setAcopio] = useState(null);

  // Metadatos remito
  const [numeroRemito, setNumeroRemito] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]); // Default: hoy
  const [remitoId, setRemitoId] = useState(null);
  const [tipoAcopio, setTipoAcopio] = useState('materiales');

  // Archivo/preview
  const [archivoRemitoUrl, setArchivoRemitoUrl] = useState(null);
  const [archivoRemitoFile, setArchivoRemitoFile] = useState(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Datos
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);

  // UI state
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingProceso, setLoadingProceso] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mover remito
  const [dialogoMoverAbierto, setDialogoMoverAbierto] = useState(false);
  const [acopiosDisponibles, setAcopiosDisponibles] = useState([]);
  const [nuevoAcopioSeleccionado, setNuevoAcopioSeleccionado] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [editItem, setEditItem] = useState(null);

  // Total calculado
  const valorTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.valorUnitario || 0) * Number(it.cantidad || 0)), 0),
    [items]
  );

  // Detectar cambios no guardados
  useEffect(() => {
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(originalItems);
    setHasUnsavedChanges(itemsChanged);
  }, [items, originalItems]);

  // Breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Acopios', href: `/acopios?empresaId=${empresaId || acopio?.empresaId || ''}`, icon: <InventoryIcon fontSize="small" /> },
      { label: acopio?.codigo || 'Acopio', href: `/movimientosAcopio?acopioId=${acopioId}&empresaId=${empresaId || acopio?.empresaId || ''}`, icon: <InventoryIcon fontSize="small" /> },
      { label: remitoId ? 'Editar Remito' : 'Nuevo Remito', icon: <ReceiptIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [acopio, acopioId, empresaId, remitoId, setBreadcrumbs]);

  // Cargar datos iniciales
  useEffect(() => {
    const cargar = async () => {
      if (!acopioId) return;
      setLoadingInit(true);
      try {
        const acopioData = await AcopioService.obtenerAcopio(acopioId);
        setAcopio(acopioData);
        setTipoAcopio((acopioData && acopioData.tipo) || 'materiales');

        // Base para fuzzy matching
        const disponibles = await AcopioService.getMaterialesAcopiados(acopioId);
        setMaterialesDisponibles(disponibles || []);

        // Si es edición
        const rid = ridQuery;
        if (rid) {
          setRemitoId(rid);
          const remito = await AcopioService.obtenerRemito(acopioId, rid);
          setFecha(remito.fecha || new Date().toISOString().split('T')[0]);
          setNumeroRemito(remito.numero_remito || '');
          const url = Array.isArray(remito.url_remito) ? remito.url_remito[0] : remito.url_remito;
          setArchivoRemitoUrl(url || null);
          const movs = remito.movimientos || [];
          setItems(movs);
          setOriginalItems(movs);

          const todos = await AcopioService.listarAcopios(acopioData.empresaId);
          setAcopiosDisponibles((todos || []).filter(a => a.id !== acopioId));
        }
      } catch (e) {
        console.error(e);
        setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
      } finally {
        setLoadingInit(false);
      }
    };
    cargar();
  }, [acopioId, ridQuery]);

  // Handlers de edición
  const openEdit = (idx) => {
    const it = items[idx];
    setEditIndex(idx);
    setEditItem(it);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setTimeout(() => { setEditItem(null); setEditIndex(-1); }, 0);
  };

  const saveEdit = (updated) => {
    const next = items.slice();
    next[editIndex] = { ...next[editIndex], ...updated };
    setItems(next);
    closeEdit();
    setAlert({ open: true, message: 'Ítem actualizado', severity: 'success' });
  };

  const deleteFromDialog = () => {
    if (editIndex < 0) return;
    const next = items.slice();
    next.splice(editIndex, 1);
    setItems(next);
    closeEdit();
    setAlert({ open: true, message: 'Ítem eliminado', severity: 'success' });
  };

  const deleteFromTable = (idx) => {
    const next = items.slice();
    next.splice(idx, 1);
    setItems(next);
    setAlert({ open: true, message: 'Ítem eliminado', severity: 'success' });
  };

  const agregarItemManual = () => {
    setItems([...items, {
      codigo: '',
      descripcion: '',
      cantidad: 1,
      valorUnitario: 0
    }]);
  };

  // Handlers de archivo
  const handleArchivoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setArchivoRemitoFile(file);
    setArchivoRemitoUrl(URL.createObjectURL(file));
    setZoom(100);
    setRotation(0);
  };

  const extraer = async () => {
    try {
      if (!archivoRemitoFile && !archivoRemitoUrl) {
        setAlert({ open: true, message: 'Primero subí un archivo del remito.', severity: 'warning' });
        return;
      }
      setLoadingProceso(true);

      const data = await AcopioService.extraerDatosDesdeArchivo(
        acopioId, archivoRemitoFile, archivoRemitoUrl, { sinMateriales: false }
      );

      if (data && data.materiales) {
        let mats = data.materiales.map(m => ({
          ...m,
          cantidad: Number(m.cantidad || 0),
          valorUnitario: Number(m.valorUnitario || 0)
        }));

        if (mats.some(m => !m.codigo)) {
          const base = materialesDisponibles || [];
          mats = mats.map(m => completarPorFuzzy(m, base));
        }

        setItems(mats);
        setAlert({ open: true, message: `Datos extraídos: ${mats.length} materiales encontrados.`, severity: 'success' });
      } else {
        setAlert({ open: true, message: 'No se detectaron materiales.', severity: 'warning' });
      }
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al extraer datos del remito.', severity: 'error' });
    } finally {
      setLoadingProceso(false);
    }
  };

  const guardarRemito = useCallback(async () => {
    try {
      if (!fecha || items.length === 0) {
        setAlert({ open: true, message: 'Completá fecha y al menos un ítem.', severity: 'warning' });
        return;
      }
      setLoadingProceso(true);

      if (remitoId) {
        await AcopioService.editarRemito(
          acopioId, remitoId, items,
          { fecha, valorOperacion: valorTotal, estado: 'confirmado', numero_remito: numeroRemito },
          archivoRemitoFile || undefined
        );
        setAlert({ open: true, message: 'Remito actualizado con éxito', severity: 'success' });
        setTimeout(() => router.push(`/movimientosAcopio?acopioId=${acopioId}&tab=remitos`), 500);
      } else {
        await AcopioService.crearRemitoConMovimientos(acopioId, items, {
          fecha,
          archivo: archivoRemitoFile || undefined,
          numero_remito: numeroRemito
        });
        setAlert({ open: true, message: 'Remito creado con éxito', severity: 'success' });
        setTimeout(() => router.push(`/movimientosAcopio?acopioId=${acopioId}`), 500);
      }
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al guardar remito', severity: 'error' });
    } finally {
      setLoadingProceso(false);
    }
  }, [fecha, items, remitoId, acopioId, valorTotal, numeroRemito, archivoRemitoFile, router]);

  const handleVolver = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmado = confirm('Tenés cambios sin guardar. ¿Querés salir igual?');
      if (!confirmado) return;
    }
    router.push(`/movimientosAcopio?acopioId=${acopioId || ''}`);
  }, [hasUnsavedChanges, acopioId, router]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S o Cmd+S para guardar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!loadingProceso && items.length > 0 && fecha) {
          guardarRemito();
        }
      }
      // Escape para volver
      if (e.key === 'Escape' && !fullscreenOpen && !editOpen && !dialogoMoverAbierto) {
        handleVolver();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadingProceso, items, fecha, fullscreenOpen, editOpen, dialogoMoverAbierto, guardarRemito, handleVolver]);

  // Validación de ítems
  const itemsConError = items.filter(it => !it.codigo || !it.cantidad || it.cantidad <= 0);

  // Cálculo de impacto
  const saldoDisponible = (acopio?.valor_acopio || 0) - (acopio?.valor_desacopio || 0);
  const nuevoSaldo = saldoDisponible - valorTotal;

  // Skeleton loader
  if (loadingInit) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  const isPdf = archivoRemitoUrl && (archivoRemitoUrl.endsWith('.pdf') || archivoRemitoUrl.includes('application/pdf'));

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        {/* Header con info del acopio */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h5">
                {remitoId ? 'Editar Remito' : 'Crear nuevo Remito'}
              </Typography>
              <Chip 
                size="small" 
                label={remitoId ? 'Editando' : 'Nuevo'} 
                color={remitoId ? 'info' : 'success'} 
              />
              {hasUnsavedChanges && (
                <Chip 
                  size="small" 
                  label="Sin guardar" 
                  color="warning" 
                  icon={<WarningAmberIcon />}
                />
              )}
            </Stack>
            {acopio && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Acopio: <strong>{acopio.codigo}</strong> • Proveedor: {acopio.proveedor || '—'}
              </Typography>
            )}
          </Box>
          <Button 
            variant="text" 
            startIcon={<ArrowBackIcon />} 
            onClick={handleVolver}
          >
            Volver
          </Button>
        </Stack>

        <Grid container spacing={3}>
          {/* Columna izquierda: Archivo del remito */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                📄 Archivo del Remito
              </Typography>

              {archivoRemitoUrl ? (
                isPdf ? (
                  <iframe src={archivoRemitoUrl} width="100%" height="450" title="Remito PDF" style={{ border: 'none', borderRadius: 8 }} />
                ) : (
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        width: '100%',
                        height: 400,
                        overflow: 'hidden',
                        borderRadius: 1,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'zoom-in'
                      }}
                      onClick={() => setFullscreenOpen(true)}
                    >
                      <img
                        src={archivoRemitoUrl}
                        alt="Remito"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </Box>

                    {/* Controles de zoom y rotación */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                      <IconButton size="small" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                        <ZoomOutIcon />
                      </IconButton>
                      <Slider
                        value={zoom}
                        onChange={(_, v) => setZoom(v)}
                        min={25}
                        max={200}
                        step={25}
                        sx={{ flex: 1 }}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `${v}%`}
                      />
                      <IconButton size="small" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                        <ZoomInIcon />
                      </IconButton>
                      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                      <IconButton size="small" onClick={() => setRotation(rotation - 90)}>
                        <RotateLeftIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => setRotation(rotation + 90)}>
                        <RotateRightIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                )
              ) : (
                <Box sx={{ 
                  height: 400, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: 'grey.300'
                }}>
                  <UploadFileIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No hay archivo cargado
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Subí una imagen o PDF del remito
                  </Typography>
                </Box>
              )}

              <Stack direction="row" spacing={1} mt={2}>
                <Button component="label" variant="outlined" fullWidth startIcon={<UploadFileIcon />}>
                  {archivoRemitoUrl ? 'Cambiar archivo' : 'Subir archivo'}
                  <input type="file" hidden accept="image/*,.pdf" onChange={handleArchivoChange} />
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={extraer}
                  disabled={loadingProceso || (!archivoRemitoFile && !archivoRemitoUrl)}
                  startIcon={loadingProceso ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                >
                  Extraer datos
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Columna derecha: Datos del remito */}
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              {/* Datos básicos */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  📝 Datos del Remito
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Número de Remito"
                      placeholder="Ej: 0001-123456"
                      value={numeroRemito}
                      onChange={(e) => setNumeroRemito(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Fecha"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      fullWidth
                      size="small"
                      required
                    />
                  </Stack>
                </Stack>
              </Paper>

              {/* Resumen cards */}
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
                    <Typography variant="caption" color="text.secondary">Ítems</Typography>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                      {items.length}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter' }}>
                    <Typography variant="caption" color="text.secondary">Valor Total</Typography>
                    <Typography variant="h6" color="error.main" fontWeight="bold">
                      {formatCurrency(valorTotal)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    bgcolor: nuevoSaldo < 0 ? 'error.lighter' : nuevoSaldo < saldoDisponible * 0.2 ? 'warning.lighter' : 'success.lighter' 
                  }}>
                    <Typography variant="caption" color="text.secondary">Saldo restante</Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      color={nuevoSaldo < 0 ? 'error.main' : nuevoSaldo < saldoDisponible * 0.2 ? 'warning.main' : 'success.main'}
                    >
                      {formatCurrency(nuevoSaldo)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Alerta de validación */}
              {itemsConError.length > 0 && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  Hay {itemsConError.length} ítem(s) sin código o con cantidad inválida
                </Alert>
              )}

              {/* Lista de ítems */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    📦 Materiales ({items.length})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={agregarItemManual}
                  >
                    Agregar ítem
                  </Button>
                </Stack>

                {items.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay materiales cargados. Subí un archivo y presioná "Extraer datos", o agregá ítems manualmente.
                    </Typography>
                  </Box>
                ) : (
                  <ProductosFormSelect
                    productos={items}
                    setProductos={setItems}
                    valorTotal={valorTotal}
                    opcionesMateriales={materialesDisponibles}
                    acopioId={acopioId}
                    autoCompletarValoresUnitarios
                  />
                )}
              </Paper>

              {/* Botones de acción */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={guardarRemito}
                  disabled={loadingProceso || !items.length || !fecha}
                  startIcon={loadingProceso ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {loadingProceso ? 'Guardando...' : 'Guardar Remito'}
                </Button>
              </Stack>

              {remitoId && (
                <Button 
                  variant="outlined" 
                  color="warning" 
                  onClick={() => setDialogoMoverAbierto(true)}
                  fullWidth
                >
                  Mover este remito a otro acopio
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>

        {/* FAB para guardar en mobile */}
        <Tooltip title="Guardar (Ctrl+S)">
          <Fab
            color="primary"
            sx={{ 
              position: 'fixed', 
              bottom: 24, 
              right: 24,
              display: { xs: 'flex', md: 'none' }
            }}
            onClick={guardarRemito}
            disabled={loadingProceso || !items.length || !fecha}
          >
            <SaveIcon />
          </Fab>
        </Tooltip>

        {/* Dialog de edición de ítem */}
        <RemitoItemEditDialog
          open={editOpen}
          item={editItem}
          onClose={closeEdit}
          onSave={saveEdit}
          onDelete={deleteFromDialog}
        />

        {/* Snackbar */}
        <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Imagen fullscreen con controles */}
        <Dialog open={fullscreenOpen} onClose={() => setFullscreenOpen(false)} maxWidth={false} fullScreen>
          <DialogContent sx={{ p: 0, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconButton 
              onClick={() => setFullscreenOpen(false)} 
              sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>

            {/* Controles en fullscreen */}
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.7)', p: 1, borderRadius: 2 }}
            >
              <IconButton sx={{ color: '#fff' }} onClick={() => setZoom(Math.max(25, zoom - 25))}>
                <ZoomOutIcon />
              </IconButton>
              <Typography sx={{ color: '#fff', display: 'flex', alignItems: 'center', px: 2 }}>{zoom}%</Typography>
              <IconButton sx={{ color: '#fff' }} onClick={() => setZoom(Math.min(300, zoom + 25))}>
                <ZoomInIcon />
              </IconButton>
              <IconButton sx={{ color: '#fff' }} onClick={() => setRotation(rotation - 90)}>
                <RotateLeftIcon />
              </IconButton>
              <IconButton sx={{ color: '#fff' }} onClick={() => setRotation(rotation + 90)}>
                <RotateRightIcon />
              </IconButton>
            </Stack>

            {archivoRemitoUrl && (
              <img 
                src={archivoRemitoUrl} 
                alt="Remito Completo" 
                style={{ 
                  maxWidth: '95%', 
                  maxHeight: '90%', 
                  objectFit: 'contain',
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease'
                }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Mover remito */}
        <Dialog open={dialogoMoverAbierto} onClose={() => setDialogoMoverAbierto(false)} fullWidth maxWidth="sm">
          <DialogContent>
            <Typography variant="h6" gutterBottom>Mover remito a otro acopio</Typography>
            <TextField
              select
              fullWidth
              label="Seleccioná un acopio de destino"
              value={nuevoAcopioSeleccionado}
              onChange={(e) => setNuevoAcopioSeleccionado(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">-- Seleccionar --</option>
              {acopiosDisponibles.map(a => (
                <option key={a.id} value={a.id}>{a.codigo} - {a.proveedor} ({a.proyecto_nombre})</option>
              ))}
            </TextField>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => setDialogoMoverAbierto(false)}>Cancelar</Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!nuevoAcopioSeleccionado}
                onClick={async () => {
                  const confirmado = confirm('¿Mover este remito al nuevo acopio?');
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
