import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Button, Container, Stack, Typography, TextField, Snackbar, Alert,
  Grid, Paper, CircularProgress, Dialog, DialogContent, DialogTitle, DialogActions,
  IconButton, Chip, Skeleton, Slider, Fab, Tooltip, Divider,
  FormControlLabel, Radio, RadioGroup, Autocomplete, Collapse, List, ListItem, ListItemText, Checkbox,
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
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ConstructionIcon from '@mui/icons-material/Construction';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useRouter } from 'next/router';

import AcopioService from 'src/services/acopioService';
import notaPedidoService from 'src/services/notaPedidoService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import RemitoReadOnlyTable from 'src/components/remitoReadOnlyTable';
import RemitoItemEditDialog from 'src/components/remitoItemEditDialog';
import ProductosFormSelect from 'src/components/ProductosFormSelect';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { formatCurrency } from 'src/utils/formatters';
import { useAuth } from 'src/hooks/use-auth';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';

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
  const match = mejorScore >= 1 ? mejor : null;
  return {
    ...m,
    codigo: m.codigo || (match && match.codigo) || '',
    descripcion: m.descripcion || (match && match.descripcion) || '',
    valorUnitario: m.valorUnitario != null ? m.valorUnitario : (match && match.valorUnitario) || 0
  };
}

const GestionRemitoPage = () => {
  const router = useRouter();
  const { acopioId, remitoId: ridQuery, empresaId, from: fromParam } = router.query || {};
  const { setBreadcrumbs } = useBreadcrumbs();
  const { user } = useAuth();

  // Datos del acopio
  const [acopio, setAcopio] = useState(null);

  // Metadatos remito
  const [numeroRemito, setNumeroRemito] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [esBorrador, setEsBorrador] = useState(false);
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

  // Destino desacopio (inline — reemplaza el dialog)
  const [destinoDesacopioActivo, setDestinoDesacopioActivo] = useState(false);
  const [destinoInline, setDestinoInline] = useState('deposito');
  const [proyectoDestinoInline, setProyectoDestinoInline] = useState(null);
  const [proyectos, setProyectos] = useState([]);

  // Confirmación genérica (número remito, precio 0)
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }

  // Contexto nota de pedido (cuando se llega desde notaPedido.js)
  const [npContext, setNpContext] = useState(null);
  const [npBannerExpanded, setNpBannerExpanded] = useState(false);

  // Cargar proyectos para el selector de destino
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const projsRaw = await getProyectosFromUser(user);
        setProyectos(
          (projsRaw || []).map((p) => ({ id: p.id || p._id, nombre: p.nombre || p.name || p.id }))
        );
      } catch { setProyectos([]); }
    })();
  }, [user]);

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

        // Cargar flag destino_desacopio de la empresa
        const empId = acopioData?.empresaId || acopioData?.empresa_id;
        if (empId) {
          try {
            const emp = await getEmpresaById(empId);
            setDestinoDesacopioActivo(emp?.stock_config?.destino_desacopio === true);
          } catch { /* best effort */ }
        }

        // Base para fuzzy matching
        const disponibles = await AcopioService.getMaterialesAcopiados(acopioId);
        setMaterialesDisponibles(disponibles || []);

        // Si viene de nota de pedido, pre-cargar ítems desde el contexto
        if (fromParam === 'nota_pedido') {
          try {
            const ctx = JSON.parse(sessionStorage.getItem('np_remito_context') || 'null');
            if (ctx && Array.isArray(ctx.items)) {
              setNpContext(ctx);
              const base = disponibles || [];
              const preItems = ctx.items.map((i) => {
                // completarPorFuzzy devuelve el mejor match; luego buscamos ese código
                // exacto en el catálogo para obtener valorUnitario (igual que actualizarProducto)
                const fuzzy = completarPorFuzzy(
                  { codigo: '', descripcion: i.material_nombre || '', cantidad: i.cantidad || 1 },
                  base
                );
                const exacto = base.find((m) => m.codigo === fuzzy.codigo);
                return {
                  codigo: fuzzy.codigo,
                  descripcion: exacto?.descripcion || fuzzy.descripcion,
                  cantidad: i.cantidad || 1,
                  valorUnitario: exacto ? Number(exacto.valorUnitario || 0) : 0,
                  _npSource: exacto ? 'matcheado' : 'nuevo',
                };
              });
              setItems(preItems);
            }
          } catch (_) { /* contexto inválido, ignorar */ }
        }

        // Si es edición
        const rid = ridQuery;
        if (rid) {
          setRemitoId(rid);
          const remito = await AcopioService.obtenerRemito(acopioId, rid);
          setFecha(remito.fecha ? String(remito.fecha).split('T')[0] : new Date().toISOString().split('T')[0]);
          setNumeroRemito(remito.numero_remito || '');
          setNumeroFactura(remito.numero_factura || '');
          setEtiqueta(remito.etiqueta || '');
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
  }, [acopioId, ridQuery, fromParam]);

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

        // Autocompletar fecha y número de remito si vinieron de la extracción
        if (data.numero_remito && !numeroRemito) {
          setNumeroRemito(data.numero_remito);
        }
        if (data.fecha && !remitoId) {
          // Convertir DD/MM/YYYY a YYYY-MM-DD para el input date
          const partes = data.fecha.split('/');
          if (partes.length === 3) {
            const fechaISO = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            if (!isNaN(Date.parse(fechaISO))) setFecha(fechaISO);
          }
        }

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

  const guardarRemito = useCallback(async (opts = {}) => {
    const { sinNumeroOk = false, precio0Ok = false } = opts;

    if (!fecha || items.length === 0) {
      setAlert({ open: true, message: 'Completá fecha y al menos un ítem.', severity: 'warning' });
      return;
    }

    // 1. Confirmar si no hay número de remito
    if (!numeroRemito.trim() && !sinNumeroOk) {
      setConfirmDialog({
        title: 'Sin número de remito',
        message: 'Estás guardando sin número de remito. Asegurate de que sea una decisión consciente. ¿Querés continuar igual?',
        onConfirm: () => { setConfirmDialog(null); guardarRemito({ ...opts, sinNumeroOk: true }); },
      });
      return;
    }

    // 2. Confirmar si hay ítems con precio 0
    const itemsSinPrecio = items.filter((it) => Number(it.valorUnitario || 0) === 0);
    if (itemsSinPrecio.length > 0 && !precio0Ok) {
      setConfirmDialog({
        title: 'Ítems con precio $0',
        message: `${itemsSinPrecio.length} ítem(s) tienen precio unitario en $0. ¿Querés continuar igual?`,
        onConfirm: () => { setConfirmDialog(null); guardarRemito({ ...opts, precio0Ok: true }); },
      });
      return;
    }

    // 3. Validar destino obra si aplica
    if (destinoDesacopioActivo && !remitoId && destinoInline === 'obra' && !proyectoDestinoInline) {
      setAlert({ open: true, message: 'Seleccioná un proyecto destino antes de guardar.', severity: 'warning' });
      return;
    }

    setLoadingProceso(true);

    const destinoOpts = (destinoDesacopioActivo && !remitoId)
      ? { destino: destinoInline, proyecto_id: proyectoDestinoInline?.id || null, proyecto_nombre: proyectoDestinoInline?.nombre || null }
      : null;

    const itemsParaEnviar = items.map(({ _npSource, ...rest }) => rest);

    try {
      if (remitoId) {
        await AcopioService.editarRemito(
          acopioId, remitoId, itemsParaEnviar,
          { fecha, valorOperacion: valorTotal, estado: 'confirmado', numero_remito: numeroRemito, numero_factura: numeroFactura, etiqueta },
          archivoRemitoFile || undefined
        );
        setAlert({ open: true, message: 'Remito actualizado con éxito', severity: 'success' });
        setTimeout(() => router.push(`/movimientosAcopio?acopioId=${acopioId}&tab=remitos`), 500);
      } else {
        const resultado = await AcopioService.crearRemitoConMovimientos(acopioId, itemsParaEnviar, {
          fecha,
          archivo: archivoRemitoFile || undefined,
          numero_remito: numeroRemito,
          numero_factura: numeroFactura,
          etiqueta,
          es_borrador: esBorrador,
          destino: destinoOpts?.destino || null,
          destino_proyecto_id: destinoOpts?.proyecto_id || null,
          destino_proyecto_nombre: destinoOpts?.proyecto_nombre || null,
        });

        // Agregar materiales nuevos al catálogo del acopio (cantidad 0, sin modificar totales)
        const nuevosAlCatalogo = items.filter(
          (it) => it.codigo?.trim() && !materialesDisponibles.some((m) => m.codigo === it.codigo)
        );
        for (const item of nuevosAlCatalogo) {
          try {
            await AcopioService.agregarProductoAcopio(acopioId, {
              codigo: item.codigo,
              descripcion: item.descripcion,
              cantidad: 0,
              valorUnitario: item.valorUnitario,
            });
          } catch (_) { /* no bloquear si falla */ }
        }

        // Si venimos de nota de pedido, resolver los ítems contra este remito
        if (npContext && resultado?.remitoId) {
          const nuevoRemitoId = resultado.remitoId;
          let resueltos = 0;
          for (const npItem of npContext.items) {
            try {
              const idempotency_key = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`;
              await notaPedidoService.resolverItem(npContext.notaId, npItem.itemId, {
                idempotency_key,
                tipo: 'retiro_acopio',
                acopio_id: npContext.acopioId,
                remito_id_existente: nuevoRemitoId,
                cantidad: npItem.cantidad,
              });
              resueltos += 1;
            } catch (_) { /* no bloquear si falla uno */ }
          }
          sessionStorage.removeItem('np_remito_context');
          setAlert({
            open: true,
            message: `Remito creado con éxito. ${resueltos} ítem(s) de la nota de pedido marcados como entregados.`,
            severity: 'success',
          });
        } else {
          const extraMsg = nuevosAlCatalogo.length > 0
            ? ` ${nuevosAlCatalogo.length} material(es) nuevo(s) agregado(s) al catálogo.`
            : '';
          setAlert({ open: true, message: `Remito creado con éxito. Los materiales fueron registrados en Stock.${extraMsg}`, severity: 'success' });
        }
        setTimeout(() => router.push(`/movimientosAcopio?acopioId=${acopioId}`), 500);
      }
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al guardar remito', severity: 'error' });
    } finally {
      setLoadingProceso(false);
    }
  }, [fecha, items, remitoId, acopioId, valorTotal, numeroRemito, numeroFactura, etiqueta, archivoRemitoFile, router, npContext,
      destinoDesacopioActivo, destinoInline, proyectoDestinoInline]);

  const handleVolver = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmado = confirm('Tenés cambios sin guardar. ¿Querés salir igual?');
      if (!confirmado) return;
    }
    if (npContext) sessionStorage.removeItem('np_remito_context');
    router.push(`/movimientosAcopio?acopioId=${acopioId || ''}`);
  }, [hasUnsavedChanges, acopioId, router, npContext]);

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
        {/* Banner nota de pedido */}
        {npContext && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button size="small" color="inherit" onClick={() => setNpBannerExpanded((v) => !v)}>
                {npBannerExpanded ? 'Ocultar' : `Ver ${npContext.items.length} ítem(s)`}
              </Button>
            }
          >
            Registrando remito para <strong>{npContext.items.length} ítem(s)</strong> de nota de pedido.
            Al guardar, los ítems se marcarán como entregados automáticamente.
            <Collapse in={npBannerExpanded}>
              <List dense disablePadding sx={{ mt: 1 }}>
                {npContext.items.map((i) => (
                  <ListItem key={i.itemId} disableGutters sx={{ py: 0 }}>
                    <ListItemText
                      primary={i.material_nombre}
                      secondary={`${i.cantidad}${i.unidad ? ' ' + i.unidad : ''}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Alert>
        )}

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
          {/* Columna izquierda: Datos + materiales */}
          <Grid item xs={12} md={7}>
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
                      InputProps={!numeroRemito.trim() ? {
                        endAdornment: <Tooltip title="Recomendado — se pedirá confirmación si guardás sin número"><WarningAmberIcon fontSize="small" color="warning" sx={{ mr: 0.5 }} /></Tooltip>
                      } : undefined}
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
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Etiqueta / título"
                      placeholder="Ej: Cemento Corralón X"
                      value={etiqueta}
                      onChange={(e) => setEtiqueta(e.target.value)}
                      fullWidth
                      size="small"
                      helperText="Texto libre para identificar el remito al buscar"
                    />
                    <TextField
                      label="Número de Factura"
                      placeholder="Ej: A-0001-00012345"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Stack>
                  {!remitoId && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={esBorrador}
                          onChange={(e) => setEsBorrador(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Guardar como borrador — no descuenta stock, queda pendiente de validar"
                    />
                  )}

                  {/* Destino desacopio inline */}
                  {destinoDesacopioActivo && !remitoId && (
                    <Box sx={{ pt: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Destino de los materiales
                      </Typography>
                      <RadioGroup
                        row
                        value={destinoInline}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDestinoInline(val);
                          if (val === 'obra') {
                            // Pre-cargar el proyecto asignado al acopio
                            const proyectoAcopio = proyectos.find(
                              (p) => p.id === acopio?.proyecto_id
                            ) || (acopio?.proyecto_id
                              ? { id: acopio.proyecto_id, nombre: acopio.proyecto_nombre || acopio.proyecto_id }
                              : null);
                            setProyectoDestinoInline(proyectoAcopio);
                          } else {
                            setProyectoDestinoInline(null);
                          }
                        }}
                      >
                        <FormControlLabel
                          value="deposito"
                          control={<Radio size="small" />}
                          label={<Stack direction="row" alignItems="center" spacing={0.5}><WarehouseIcon fontSize="small" color="primary" /><Typography variant="body2">A depósito</Typography></Stack>}
                        />
                        <FormControlLabel
                          value="obra"
                          control={<Radio size="small" />}
                          label={<Stack direction="row" alignItems="center" spacing={0.5}><ConstructionIcon fontSize="small" color="warning" /><Typography variant="body2">A obra</Typography></Stack>}
                        />
                      </RadioGroup>
                      {destinoInline === 'obra' && (
                        <Autocomplete
                          options={proyectos}
                          getOptionLabel={(p) => p.nombre || ''}
                          value={proyectoDestinoInline}
                          onChange={(_, v) => setProyectoDestinoInline(v)}
                          renderInput={(params) => <TextField {...params} label="Proyecto / obra destino" size="small" />}
                          isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                          noOptionsText="Sin proyectos"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Resumen cards */}
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
                    <Typography variant="caption" color="text.secondary">Ítems</Typography>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">{items.length}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter' }}>
                    <Typography variant="caption" color="text.secondary">Valor Total</Typography>
                    <Typography variant="h6" color="error.main" fontWeight="bold">{formatCurrency(valorTotal)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: nuevoSaldo < 0 ? 'error.lighter' : nuevoSaldo < saldoDisponible * 0.2 ? 'warning.lighter' : 'success.lighter' }}>
                    <Typography variant="caption" color="text.secondary">Saldo restante</Typography>
                    <Typography variant="h6" fontWeight="bold" color={nuevoSaldo < 0 ? 'error.main' : nuevoSaldo < saldoDisponible * 0.2 ? 'warning.main' : 'success.main'}>
                      {formatCurrency(nuevoSaldo)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Alerta validación */}
              {itemsConError.length > 0 && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  Hay {itemsConError.length} ítem(s) sin código o con cantidad inválida
                </Alert>
              )}

              {/* Lista de ítems */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">📦 Materiales ({items.length})</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={agregarItemManual}>Agregar ítem</Button>
                </Stack>
                {items.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay materiales cargados. Subí un archivo y usá "Extraer datos", o agregá ítems manualmente.
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

              {/* Botón guardar */}
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
                <Button variant="outlined" color="warning" onClick={() => setDialogoMoverAbierto(true)} fullWidth>
                  Mover este remito a otro acopio
                </Button>
              )}
            </Stack>
          </Grid>

          {/* Columna derecha: Archivo del remito */}
          <Grid item xs={12} md={5}>
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

        {/* Diálogo de confirmación genérico (número remito vacío, precio 0) */}
        <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{confirmDialog?.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">{confirmDialog?.message}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button variant="contained" onClick={confirmDialog?.onConfirm}>Continuar igual</Button>
          </DialogActions>
        </Dialog>

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
