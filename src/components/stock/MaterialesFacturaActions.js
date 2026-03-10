import React, { useState, useCallback } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper,
  Autocomplete,
  TextField,
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import InventoryIcon from '@mui/icons-material/Inventory';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import UndoIcon from '@mui/icons-material/Undo';
import api from 'src/services/axiosConfig';

/**
 * MaterialesFacturaActions
 *
 * Muestra las opciones de destino para materiales extraídos de una factura de caja.
 * Solo se renderiza si la empresa tiene stock_config.
 *
 * Props:
 *  - materiales: array de { descripcion, cantidad, valorUnitario?, SKU? }
 *  - empresaId: string
 *  - empresaNombre: string (optional)
 *  - movimientoId: string (ID del movimiento de caja en Firestore)
 *  - movimiento: object (movimiento de caja completo, para leer referencias existentes)
 *  - stockConfig: object { acopio_habilitado, validacion_movimientos, ... }
 *  - proyectos: array de { id, nombre } (proyectos de la empresa)
 *  - proveedores: array de strings (nombres de proveedores)
 *  - nombreProveedor: string (proveedor de la factura, pre-seleccionar para acopio)
 *  - onComplete: (result) => void — callback después de una acción exitosa
 *  - onError: (errorMsg) => void — callback en caso de error
 */
const MaterialesFacturaActions = ({
  materiales = [],
  empresaId,
  empresaNombre = null,
  movimientoId,
  movimiento = null,
  stockConfig = {},
  proyectos = [],
  proveedores = [],
  nombreProveedor = '',
  onComplete,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [accion, setAccion] = useState(null); // 'deposito' | 'obra' | 'acopio' | 'pendiente'
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [proveedorAcopio, setProveedorAcopio] = useState(nombreProveedor || '');
  const [resultado, setResultado] = useState(null); // { tipo, id, ... } después de ejecutar acción

  // Detectar si ya tiene referencia cruzada (ya se asignó destino)
  const solicitudStockId = movimiento?.solicitud_stock_id || null;
  const acopioId = movimiento?.acopio_id || null;
  const yaVinculado = Boolean(solicitudStockId || acopioId);

  const materialesValidos = (materiales || []).filter(
    (m) => (m.descripcion || m.nombre) && parseFloat(m.cantidad) > 0
  );

  // --- Acciones ---

  const handleEnviarADeposito = useCallback(async () => {
    setLoading(true);
    setAccion('deposito');
    try {
      const res = await api.post('/solicitud-material/from-caja', {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        movimiento_caja_id: movimientoId,
        materiales: materialesValidos,
        proyecto_id: null,
        proyecto_nombre: null,
        subtipo: 'COMPRA',
        proveedor: nombreProveedor ? { nombre: nombreProveedor } : null,
        validacion_movimientos: stockConfig.validacion_movimientos || false,
      });
      const data = res.data?.data || res.data;
      setResultado({ tipo: 'solicitud', id: data.solicitud_id, data });
      onComplete?.({ tipo: 'solicitud', solicitud_stock_id: data.solicitud_id });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Error al enviar a depósito';
      onError?.(msg);
    } finally {
      setLoading(false);
      setAccion(null);
    }
  }, [empresaId, empresaNombre, movimientoId, materialesValidos, nombreProveedor, stockConfig, onComplete, onError]);

  const handleEnviarAObra = useCallback(async () => {
    if (!proyectoSeleccionado) {
      onError?.('Seleccioná un proyecto/obra primero.');
      return;
    }
    setLoading(true);
    setAccion('obra');
    try {
      const res = await api.post('/solicitud-material/from-caja', {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        movimiento_caja_id: movimientoId,
        materiales: materialesValidos,
        proyecto_id: proyectoSeleccionado.id || proyectoSeleccionado._id,
        proyecto_nombre: proyectoSeleccionado.nombre,
        subtipo: 'COMPRA',
        proveedor: nombreProveedor ? { nombre: nombreProveedor } : null,
        validacion_movimientos: stockConfig.validacion_movimientos || false,
      });
      const data = res.data?.data || res.data;
      setResultado({ tipo: 'solicitud', id: data.solicitud_id, data });
      onComplete?.({ tipo: 'solicitud', solicitud_stock_id: data.solicitud_id });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Error al enviar a obra';
      onError?.(msg);
    } finally {
      setLoading(false);
      setAccion(null);
    }
  }, [empresaId, empresaNombre, movimientoId, materialesValidos, proyectoSeleccionado, nombreProveedor, stockConfig, onComplete, onError]);

  const handleCrearAcopio = useCallback(async () => {
    if (!proveedorAcopio) {
      onError?.('Seleccioná un proveedor para el acopio.');
      return;
    }
    setLoading(true);
    setAccion('acopio');
    try {
      const res = await api.post('/acopio/from-caja', {
        empresa_id: empresaId,
        proveedor: proveedorAcopio,
        proyecto_id: null,
        materiales: materialesValidos,
        movimiento_caja_id: movimientoId,
        url_imagen_compra: movimiento?.url_imagen ? [movimiento.url_imagen] : [],
      });
      const data = res.data;
      setResultado({ tipo: 'acopio', id: data.acopio_id, data });
      onComplete?.({ tipo: 'acopio', acopio_id: data.acopio_id });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Error al crear acopio';
      onError?.(msg);
    } finally {
      setLoading(false);
      setAccion(null);
    }
  }, [empresaId, proveedorAcopio, materialesValidos, movimientoId, movimiento, onComplete, onError]);

  const handlePendienteAsignar = useCallback(async () => {
    setLoading(true);
    setAccion('pendiente');
    try {
      const res = await api.post('/solicitud-material/from-caja', {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        movimiento_caja_id: movimientoId,
        materiales: materialesValidos,
        proyecto_id: null,
        proyecto_nombre: null,
        subtipo: 'PENDIENTE_ASIGNAR',
        proveedor: nombreProveedor ? { nombre: nombreProveedor } : null,
        validacion_movimientos: stockConfig.validacion_movimientos || false,
      });
      const data = res.data?.data || res.data;
      setResultado({ tipo: 'solicitud', id: data.solicitud_id, data });
      onComplete?.({ tipo: 'solicitud', solicitud_stock_id: data.solicitud_id });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Error al marcar como pendiente';
      onError?.(msg);
    } finally {
      setLoading(false);
      setAccion(null);
    }
  }, [empresaId, empresaNombre, movimientoId, materialesValidos, nombreProveedor, stockConfig, onComplete, onError]);

  const handleDeshacer = useCallback(async () => {
    // TODO: implementar deshacimiento (eliminar solicitud/acopio y limpiar referencia)
    setResultado(null);
    onComplete?.({ tipo: 'deshacer' });
  }, [onComplete]);

  // --- Sin materiales ---
  if (materialesValidos.length === 0) {
    return (
      <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
        No hay materiales detectados para procesar. Podés agregarlos manualmente arriba.
      </Alert>
    );
  }

  // --- Ya vinculado (tiene referencia cruzada) ---
  if (yaVinculado || resultado) {
    const refId = resultado?.id || solicitudStockId || acopioId;
    const tipoRef = resultado?.tipo || (solicitudStockId ? 'solicitud' : 'acopio');

    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'success.50', borderColor: 'success.light' }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LinkIcon color="success" fontSize="small" />
            <Typography variant="subtitle2" color="success.dark">
              {tipoRef === 'solicitud'
                ? '📦 Materiales enviados a stock'
                : '📦 Acopio creado'}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {tipoRef === 'solicitud'
              ? `Solicitud de stock: ${refId}`
              : `Acopio: ${refId}`}
          </Typography>

          {resultado?.data?.materiales_creados?.length > 0 && (
            <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
              {resultado.data.materiales_creados.length} material(es) nuevo(s) creados en el catálogo.
            </Alert>
          )}

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkIcon />}
              href={
                tipoRef === 'solicitud'
                  ? `/stockSolicitudes?solicitudId=${refId}`
                  : `/movimientosAcopio?acopioId=${refId}`
              }
            >
              {tipoRef === 'solicitud' ? 'Ver solicitud' : 'Ver acopio'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<UndoIcon />}
              onClick={handleDeshacer}
            >
              Deshacer
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  // --- Opciones de destino ---
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <WarehouseIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">
            ¿Qué hacer con estos materiales? ({materialesValidos.length} items)
          </Typography>
        </Stack>

        <Divider />

        {/* Resumen rápido */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {materialesValidos.slice(0, 5).map((m, idx) => (
            <Chip
              key={idx}
              label={`${m.descripcion || m.nombre} × ${m.cantidad}`}
              size="small"
              variant="outlined"
            />
          ))}
          {materialesValidos.length > 5 && (
            <Chip label={`+${materialesValidos.length - 5} más`} size="small" />
          )}
        </Box>

        <Divider />

        {/* Opciones */}
        <Stack spacing={1.5}>
          {/* Enviar a depósito */}
          <Button
            variant="outlined"
            startIcon={loading && accion === 'deposito' ? <CircularProgress size={18} /> : <WarehouseIcon />}
            onClick={handleEnviarADeposito}
            disabled={loading}
            fullWidth
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            🏭 Enviar a depósito (stock)
          </Button>

          {/* Enviar a obra */}
          <Stack spacing={1}>
            <Autocomplete
              options={proyectos}
              getOptionLabel={(opt) => opt.nombre || ''}
              value={proyectoSeleccionado}
              onChange={(_, val) => setProyectoSeleccionado(val)}
              renderInput={(params) => (
                <TextField {...params} label="Seleccionar obra/proyecto" size="small" />
              )}
              size="small"
              disabled={loading}
            />
            <Button
              variant="outlined"
              startIcon={loading && accion === 'obra' ? <CircularProgress size={18} /> : <HomeWorkIcon />}
              onClick={handleEnviarAObra}
              disabled={loading || !proyectoSeleccionado}
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              🏗️ Enviar a obra{proyectoSeleccionado ? `: ${proyectoSeleccionado.nombre}` : ''}
            </Button>
          </Stack>

          {/* Crear acopio — solo si acopio_habilitado */}
          {stockConfig.acopio_habilitado && (
            <Stack spacing={1}>
              <Autocomplete
                freeSolo
                options={proveedores}
                value={proveedorAcopio}
                onChange={(_, val) => setProveedorAcopio(val || '')}
                onInputChange={(_, val) => setProveedorAcopio(val || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Proveedor para acopio" size="small" />
                )}
                size="small"
                disabled={loading}
              />
              <Button
                variant="outlined"
                startIcon={loading && accion === 'acopio' ? <CircularProgress size={18} /> : <InventoryIcon />}
                onClick={handleCrearAcopio}
                disabled={loading || !proveedorAcopio}
                fullWidth
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                📦 Crear acopio{proveedorAcopio ? `: ${proveedorAcopio}` : ''}
              </Button>
            </Stack>
          )}

          <Divider />

          {/* Pendiente de asignar */}
          <Button
            variant="text"
            startIcon={loading && accion === 'pendiente' ? <CircularProgress size={18} /> : <HourglassEmptyIcon />}
            onClick={handlePendienteAsignar}
            disabled={loading}
            fullWidth
            sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'text.secondary' }}
          >
            ⏳ Pendiente de asignar (no sé a dónde van todavía)
          </Button>

          {/* No hacer nada */}
          <Button
            variant="text"
            startIcon={<CloseIcon />}
            disabled={loading}
            fullWidth
            sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'text.disabled' }}
          >
            ❌ No hacer nada
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default MaterialesFacturaActions;
