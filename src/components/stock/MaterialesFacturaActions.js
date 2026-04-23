import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
  Collapse,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from 'src/services/axiosConfig';
import AcopioService from 'src/services/acopioService';
import movimientosService from 'src/services/movimientosService';
import DistribuirMaterialesDialog from './DistribuirMaterialesDialog';

/**
 * Pasos del Dialog:
 * 0 - Elegir destino principal (Acopio / Deposito / Directo Obra / Nada)
 * 1 - Sub-opciones segun destino
 * 2 - Extraccion de materiales (spinner/progreso)
 * 3 - Resolucion de discrepancias (si las hay)
 * 4 - Resultado final (link al ticket/acopio)
 */
const STEP_DESTINO = 0;
const STEP_SUBOPCIONES = 1;
const STEP_EXTRACCION = 2;
const STEP_DISCREPANCIAS = 3;
const STEP_RESULTADO = 4;
// Fase 3: paso de espera mientras DistribuirMaterialesDialog está abierto
const STEP_DISTRIBUIR = 5;

const DESTINOS = {
  ACOPIO: 'acopio',
  DEPOSITO: 'deposito',
  DIRECTO_OBRA: 'directo_obra',
  DISTRIBUIR: 'distribuir',
  NADA: 'nada',
};

const SUB_ACOPIO = {
  TODOS: 'disponible_todos',
  OBRA: 'para_obra',
};

const SUB_DEPOSITO = {
  PENDIENTE: 'pendiente',
  RESERVADO_OBRA: 'reservado_obra',
};

/**
 * MaterialesFacturaActions — Dialog de destino de materiales post-creacion de egreso.
 *
 * Flujo: Elegir destino -> sub-opcion -> extraer materiales con IA (modo preciso) ->
 *        resolver discrepancias -> crear ticket/acopio -> mostrar resultado.
 */
const MaterialesFacturaActions = ({
  open = false,
  onClose,
  empresaId,
  empresaNombre = null,
  movimientoId,
  movimiento = null,
  stockConfig = {},
  proyectos = [],
  proveedores = [],
  nombreProveedor = '',
  onComplete,
  onDismiss,
  onError,
}) => {
  const [step, setStep] = useState(STEP_DESTINO);
  const [destino, setDestino] = useState(null);
  const [subOpcion, setSubOpcion] = useState(null);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [proveedorAcopio, setProveedorAcopio] = useState(nombreProveedor || '');
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [materialesExtraidos, setMaterialesExtraidos] = useState([]);
  const [tieneDiscrepancias, setTieneDiscrepancias] = useState(false);
  const [resoluciones, setResoluciones] = useState({});
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [openDistribuir, setOpenDistribuir] = useState(false);

  const urlImagen = movimiento?.url_imagen || null;

  // --- Helpers ---

  const handleBack = useCallback(() => {
    if (step === STEP_SUBOPCIONES) {
      setStep(STEP_DESTINO);
      setSubOpcion(null);
      setProyectoSeleccionado(null);
    }
  }, [step]);

  // --- Step 0: Elegir destino ---
  const handleSelectDestino = useCallback((dest) => {
    if (dest === DESTINOS.NADA) {
      onDismiss?.();
      return;
    }
    setDestino(dest);
    // Pre-seleccionar la obra del movimiento cuando va directo a obra
    if (dest === DESTINOS.DIRECTO_OBRA && movimiento?.proyecto_id) {
      const obraDelMovimiento = proyectos.find(
        (p) => (p.id || p._id) === movimiento.proyecto_id
      ) || null;
      setProyectoSeleccionado(obraDelMovimiento);
    }
    // DISTRIBUIR no tiene sub-opciones: saltar directo a extracción
    if (dest === DESTINOS.DISTRIBUIR) {
      setStep(STEP_SUBOPCIONES);
      return;
    }
    setStep(STEP_SUBOPCIONES);
  }, [onDismiss, movimiento, proyectos]);

  // --- Crear ticket/acopio con materiales extraidos ---
  const crearDestinoConMateriales = useCallback(async (materiales) => {
    setLoading(true);
    setStep(STEP_RESULTADO);

    try {
      // Limpiar campos internos de verificacion y normalizar nombres de campos
      // La extraccion IA devuelve Nombre (mayusc), SKU, precio_unitario
      // Los endpoints from-caja esperan descripcion/nombre, codigo, valorUnitario
      const materialesLimpios = materiales.map(
        ({ _verificacion, _extraccion_inicial, _requiere_confirmacion_usuario, ...rest }) => {
          const m = { ...rest };
          // Normalizar Nombre → nombre
          if (m.Nombre && !m.nombre && !m.descripcion) {
            m.nombre = m.Nombre;
          }
          // Normalizar SKU → codigo
          if (m.SKU && !m.codigo) {
            m.codigo = m.SKU;
          }
          // Normalizar precio_unitario → valorUnitario
          if (m.precio_unitario != null && m.valorUnitario == null) {
            m.valorUnitario = m.precio_unitario;
          }
          return m;
        }
      );
      const materialesValidos = materialesLimpios.filter(
        (m) => (m.descripcion || m.nombre) && parseFloat(m.cantidad) > 0
      );

      if (materialesValidos.length === 0) {
        throw new Error('No se detectaron materiales validos en la factura.');
      }

      let resultData = null;

      if (destino === DESTINOS.ACOPIO) {
        const proyId = subOpcion === SUB_ACOPIO.OBRA
          ? (proyectoSeleccionado?.id || proyectoSeleccionado?._id)
          : null;
        const res = await api.post('/acopio/from-caja', {
          empresa_id: empresaId,
          proveedor: proveedorAcopio,
          proyecto_id: proyId,
          materiales: materialesValidos,
          movimiento_caja_id: movimientoId,
          url_imagen_compra: urlImagen ? [urlImagen] : [],
        });
        resultData = { tipo: 'acopio', id: res.data?.acopio_id, data: res.data };

        // Persistir acopio_id en Firestore (solo campos nuevos, no spread completo)
        await movimientosService.updateMovimiento(movimientoId, {
          acopio_id: res.data?.acopio_id,
          stock_procesado: true,
        });
      } else {
        // Solicitud de stock (deposito, directo obra, o pendiente)
        // destino_stock: 'deposito' = reservado en deposito, 'obra' = consumido/entregado en obra
        // subtipo: COMPRA = compra normal, COMPRA_DIRECTA = directo a obra, PENDIENTE_ASIGNAR = sin obra
        let subtipo = 'COMPRA';
        let destinoStock = 'deposito';
        let proyId = null;
        let proyNombre = null;

        if (destino === DESTINOS.DEPOSITO && subOpcion === SUB_DEPOSITO.PENDIENTE) {
          subtipo = 'PENDIENTE_ASIGNAR';
          destinoStock = 'pendiente_asignar';
        } else if (destino === DESTINOS.DEPOSITO && subOpcion === SUB_DEPOSITO.RESERVADO_OBRA) {
          subtipo = 'COMPRA';
          destinoStock = 'deposito';
          proyId = proyectoSeleccionado?.id || proyectoSeleccionado?._id;
          proyNombre = proyectoSeleccionado?.nombre;
        } else if (destino === DESTINOS.DIRECTO_OBRA) {
          subtipo = 'COMPRA_DIRECTA';
          destinoStock = 'obra';
          proyId = proyectoSeleccionado?.id || proyectoSeleccionado?._id;
          proyNombre = proyectoSeleccionado?.nombre;
        }

        const res = await api.post('/solicitud-material/from-caja', {
          empresa_id: empresaId,
          empresa_nombre: empresaNombre,
          movimiento_caja_id: movimientoId,
          materiales: materialesValidos,
          proyecto_id: proyId,
          proyecto_nombre: proyNombre,
          subtipo,
          destino: destinoStock,
          proveedor: nombreProveedor ? { nombre: nombreProveedor } : null,
          validacion_movimientos: stockConfig.validacion_movimientos || false,
        });
        const data = res.data?.data || res.data;
        resultData = { tipo: 'solicitud', id: data.solicitud_id, data };

        // Persistir solicitud_stock_id en Firestore (solo campos nuevos, no spread completo)
        await movimientosService.updateMovimiento(movimientoId, {
          solicitud_stock_id: data.solicitud_id,
          stock_procesado: true,
        });
      }

      setResultado(resultData);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.error || err.message || 'Error al procesar materiales.';
      setError(msg);
      onError?.(msg);
    }
  }, [destino, subOpcion, proyectoSeleccionado, proveedorAcopio, empresaId, empresaNombre, movimientoId, movimiento, urlImagen, nombreProveedor, stockConfig, onError]);

  // --- Step 1: Confirmar sub-opcion y lanzar extraccion ---
  const handleConfirmSubOpcion = useCallback(async () => {
    if (!urlImagen) {
      setError('El movimiento no tiene imagen para extraer materiales.');
      return;
    }

    // Validaciones segun destino
    if (destino === DESTINOS.ACOPIO && subOpcion === SUB_ACOPIO.OBRA && !proyectoSeleccionado) {
      setError('Selecciona una obra para el acopio.');
      return;
    }
    if (destino === DESTINOS.DEPOSITO && subOpcion === SUB_DEPOSITO.RESERVADO_OBRA && !proyectoSeleccionado) {
      setError('Selecciona una obra para reservar.');
      return;
    }
    if (destino === DESTINOS.DIRECTO_OBRA && !proyectoSeleccionado) {
      setError('Selecciona la obra de destino.');
      return;
    }
    if (destino === DESTINOS.ACOPIO && !proveedorAcopio) {
      setError('Ingresa un proveedor para el acopio.');
      return;
    }

    setError(null);
    setStep(STEP_EXTRACCION);
    setLoading(true);
    setProgreso(5);

    try {
      // Extraer materiales con modo preciso via url_imagen
      const initRes = await api.post('/acopio/compra/extraer/init', {
        archivo_url: urlImagen,
        modo: 'preciso',
        tipoLista: 'factura',
      });

      const taskId = initRes.data?.taskId;
      if (!taskId) throw new Error('No se recibio taskId del backend.');

      setProgreso(15);

      // Polling
      const maxIntentos = 360;
      let intentos = 0;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));

      while (intentos < maxIntentos) {
        const statusRes = await AcopioService.consultarEstadoExtraccion(taskId);
        const pct = 15 + Math.min(75, Math.floor((intentos / 60) * 75));
        setProgreso(pct);

        if (statusRes.status === 'completado' && Array.isArray(statusRes.materiales)) {
          setMaterialesExtraidos(statusRes.materiales);
          setTieneDiscrepancias(statusRes.tieneDiscrepancias || false);
          setProgreso(100);
          setLoading(false);

          if (statusRes.tieneDiscrepancias) {
            // Inicializar resoluciones con valores verificados por defecto
            const resDefault = {};
            statusRes.materiales.forEach((mat, idx) => {
              if (!mat._verificacion?.requiere_input) return;
              resDefault[idx] = {};
              if (mat._verificacion.requiere_cantidad_input) {
                resDefault[idx].cantidad = String(mat._verificacion.cantidad_verificada ?? mat.cantidad);
              }
              if (mat._verificacion.requiere_precio_input) {
                resDefault[idx].precio = String(mat._verificacion.precio_verificado ?? mat.valorUnitario);
              }
              if (mat._verificacion.requiere_codigo_input) {
                resDefault[idx].codigo = mat._verificacion.codigo_verificado ?? mat.codigo;
              }
            });
            setResoluciones(resDefault);
            setStep(STEP_DISCREPANCIAS);
          } else if (destino === DESTINOS.DISTRIBUIR) {
            setStep(STEP_DISTRIBUIR);
            setOpenDistribuir(true);
          } else {
            await crearDestinoConMateriales(statusRes.materiales);
          }
          return;
        }

        if (statusRes.status === 'error') {
          throw new Error(statusRes.error || 'Error en la extraccion.');
        }

        intentos += 1;
        await wait(5000);
      }

      throw new Error('Tiempo de espera agotado. La extraccion esta tardando demasiado.');
    } catch (err) {
      setLoading(false);
      setProgreso(0);
      setError(err.message || 'Error al extraer materiales.');
      setStep(STEP_SUBOPCIONES);
    }
  }, [destino, subOpcion, proyectoSeleccionado, proveedorAcopio, urlImagen, crearDestinoConMateriales]);

  // --- Step 3: Aplicar resoluciones y crear ---
  const handleConfirmDiscrepancias = useCallback(async () => {
    const materialesResueltos = materialesExtraidos.map((mat, idx) => {
      const res = resoluciones[idx];
      if (!res) return mat;
      const copia = { ...mat };
      if (res.cantidad !== undefined) copia.cantidad = parseFloat(res.cantidad) || mat.cantidad;
      if (res.precio !== undefined) copia.valorUnitario = parseFloat(res.precio) || mat.valorUnitario;
      if (res.codigo !== undefined) copia.codigo = res.codigo || mat.codigo;
      return copia;
    });
    if (destino === DESTINOS.DISTRIBUIR) {
      setMaterialesExtraidos(materialesResueltos);
      setStep(STEP_DISTRIBUIR);
      setOpenDistribuir(true);
      return;
    }
    await crearDestinoConMateriales(materialesResueltos);
  }, [destino, materialesExtraidos, resoluciones, crearDestinoConMateriales]);

  // --- Destinos disponibles segun stock_config ---
  const destinosDisponibles = useMemo(() => {
    const items = [];
    if (stockConfig.acopio_habilitado) {
      items.push({
        key: DESTINOS.ACOPIO,
        label: 'Acopio',
        icon: <InventoryIcon />,
        description: 'Crear un acopio de materiales',
      });
    }
    items.push({
      key: DESTINOS.DEPOSITO,
      label: 'Deposito',
      icon: <WarehouseIcon />,
      description: 'Enviar materiales al deposito',
    });
    items.push({
      key: DESTINOS.DIRECTO_OBRA,
      label: 'Directo a obra',
      icon: <HomeWorkIcon />,
      description: 'Enviar materiales directamente a una obra',
    });
    if (stockConfig.distribucion_por_linea) {
      items.push({
        key: DESTINOS.DISTRIBUIR,
        label: 'Distribuir por línea',
        icon: <InventoryIcon />,
        description: 'Asignar un destino diferente a cada material',
      });
    }
    items.push({
      key: DESTINOS.NADA,
      label: 'No hacer nada',
      icon: <CloseIcon />,
      description: 'Ignorar los materiales por ahora',
    });
    return items;
  }, [stockConfig.acopio_habilitado, stockConfig.distribucion_por_linea]);

  // --- Materiales con discrepancias ---
  const materialesConDiscrepancia = useMemo(() => {
    return materialesExtraidos
      .map((mat, idx) => ({ ...mat, _idx: idx }))
      .filter((mat) => mat._verificacion?.requiere_input);
  }, [materialesExtraidos]);

  // --- Puede confirmar sub-opciones ---
  const canConfirmSub = useMemo(() => {
    if (destino === DESTINOS.DISTRIBUIR) return true; // sin sub-opciones
    if (destino === DESTINOS.ACOPIO) {
      if (!subOpcion || !proveedorAcopio) return false;
      if (subOpcion === SUB_ACOPIO.OBRA && !proyectoSeleccionado) return false;
      return true;
    }
    if (destino === DESTINOS.DEPOSITO) {
      if (!subOpcion) return false;
      if (subOpcion === SUB_DEPOSITO.RESERVADO_OBRA && !proyectoSeleccionado) return false;
      return true;
    }
    if (destino === DESTINOS.DIRECTO_OBRA) return Boolean(proyectoSeleccionado);
    return false;
  }, [destino, subOpcion, proveedorAcopio, proyectoSeleccionado]);

  // --- Titulo del Dialog segun step ---
  const dialogTitle = useMemo(() => {
    if (step === STEP_DESTINO) return 'Que hacer con los materiales?';
    if (step === STEP_SUBOPCIONES) {
      if (destino === DESTINOS.ACOPIO) return 'Acopio - Opciones';
      if (destino === DESTINOS.DEPOSITO) return 'Deposito - Opciones';
      if (destino === DESTINOS.DIRECTO_OBRA) return 'Directo a obra';
      return 'Opciones';
    }
    if (step === STEP_EXTRACCION) return 'Extrayendo materiales...';
    if (step === STEP_DISCREPANCIAS) return 'Revisar datos dudosos';
    if (step === STEP_RESULTADO) return 'Resultado';
    if (step === STEP_DISTRIBUIR) return 'Distribuyendo materiales...';
    return '';
  }, [step, destino]);

  // --- RENDER por step ---

  const renderStepDestino = () => (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Se detecto una factura de materiales. Que queres hacer con estos materiales?
      </Typography>
      {destinosDisponibles.map((d) => (
        <Button
          key={d.key}
          variant={d.key === DESTINOS.NADA ? 'text' : 'outlined'}
          startIcon={d.icon}
          onClick={() => handleSelectDestino(d.key)}
          fullWidth
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
            color: d.key === DESTINOS.NADA ? 'text.secondary' : undefined,
          }}
        >
          <Stack alignItems="flex-start" sx={{ ml: 0.5 }}>
            <Typography variant="body2" fontWeight={500}>{d.label}</Typography>
            <Typography variant="caption" color="text.secondary">{d.description}</Typography>
          </Stack>
        </Button>
      ))}
    </Stack>
  );

  const renderStepSubOpciones = () => {
    if (destino === DESTINOS.ACOPIO) {
      return (
        <Stack spacing={2}>
          <Typography variant="subtitle2">Acopio - Para quien?</Typography>
          <Stack spacing={1}>
            <Button
              variant={subOpcion === SUB_ACOPIO.TODOS ? 'contained' : 'outlined'}
              onClick={() => { setSubOpcion(SUB_ACOPIO.TODOS); setProyectoSeleccionado(null); }}
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              Disponible para todos (sin obra asignada)
            </Button>
            <Button
              variant={subOpcion === SUB_ACOPIO.OBRA ? 'contained' : 'outlined'}
              onClick={() => setSubOpcion(SUB_ACOPIO.OBRA)}
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              Para una obra puntual
            </Button>
          </Stack>

          <Collapse in={subOpcion === SUB_ACOPIO.OBRA}>
            <Autocomplete
              options={proyectos}
              getOptionLabel={(opt) => opt.nombre || ''}
              value={proyectoSeleccionado}
              onChange={(_, val) => setProyectoSeleccionado(val)}
              renderInput={(params) => <TextField {...params} label="Seleccionar obra" size="small" />}
              size="small"
            />
          </Collapse>

          <Autocomplete
            freeSolo
            options={proveedores}
            value={proveedorAcopio}
            onChange={(_, val) => setProveedorAcopio(val || '')}
            onInputChange={(_, val) => setProveedorAcopio(val || '')}
            renderInput={(params) => <TextField {...params} label="Proveedor del acopio" size="small" />}
            size="small"
          />
        </Stack>
      );
    }

    if (destino === DESTINOS.DEPOSITO) {
      return (
        <Stack spacing={2}>
          <Typography variant="subtitle2">Deposito - En que estado?</Typography>
          <Stack spacing={1}>
            <Button
              variant={subOpcion === SUB_DEPOSITO.PENDIENTE ? 'contained' : 'outlined'}
              onClick={() => { setSubOpcion(SUB_DEPOSITO.PENDIENTE); setProyectoSeleccionado(null); }}
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              Pendiente de asignar
            </Button>
            <Button
              variant={subOpcion === SUB_DEPOSITO.RESERVADO_OBRA ? 'contained' : 'outlined'}
              onClick={() => setSubOpcion(SUB_DEPOSITO.RESERVADO_OBRA)}
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              Reservado para una obra
            </Button>
          </Stack>

          <Collapse in={subOpcion === SUB_DEPOSITO.RESERVADO_OBRA}>
            <Autocomplete
              options={proyectos}
              getOptionLabel={(opt) => opt.nombre || ''}
              value={proyectoSeleccionado}
              onChange={(_, val) => setProyectoSeleccionado(val)}
              renderInput={(params) => <TextField {...params} label="Seleccionar obra" size="small" />}
              size="small"
            />
          </Collapse>
        </Stack>
      );
    }

    if (destino === DESTINOS.DIRECTO_OBRA) {
      return (
        <Stack spacing={2}>
          <Typography variant="subtitle2">Directo a obra - A cual?</Typography>
          <Autocomplete
            options={proyectos}
            getOptionLabel={(opt) => opt.nombre || ''}
            value={proyectoSeleccionado}
            onChange={(_, val) => setProyectoSeleccionado(val)}
            renderInput={(params) => <TextField {...params} label="Seleccionar obra" size="small" />}
            size="small"
          />
        </Stack>
      );
    }

    if (destino === DESTINOS.DISTRIBUIR) {
      return (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Distribución por línea</Typography>
          <Typography variant="body2" color="text.secondary">
            Primero vamos a extraer los materiales de la factura con IA.
            Después vas a poder asignarle un destino diferente a cada uno.
          </Typography>
        </Stack>
      );
    }

    return null;
  };

  const renderStepExtraccion = () => (
    <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
      <CircularProgress size={48} />
      <Typography variant="subtitle2">Extrayendo materiales de la factura...</Typography>
      <Typography variant="caption" color="text.secondary">
        Gemini 2.5 Flash + GPT-5.4 · verificacion doble. Puede tardar ~1 min por hoja.
      </Typography>
      <Box sx={{ width: '100%' }}>
        <LinearProgress variant="determinate" value={progreso} sx={{ height: 6, borderRadius: 3 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
          {progreso}%
        </Typography>
      </Box>
    </Stack>
  );

  const renderStepDiscrepancias = () => (
    <Stack spacing={2.5}>
      {/* Imagen de referencia */}
      {urlImagen && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Imagen de la factura — usala para elegir el valor correcto
          </Typography>
          <Box
            component="img"
            src={urlImagen}
            alt="Factura"
            sx={{
              width: '100%',
              maxHeight: 320,
              objectFit: 'contain',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50',
              cursor: 'zoom-in',
              display: 'block',
            }}
            onClick={() => window.open(urlImagen, '_blank')}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Clic para abrir en tamaño completo
          </Typography>
        </Box>
      )}

      <Divider />

      <Typography variant="body2" color="text.secondary">
        La IA leyó dos valores distintos para {materialesConDiscrepancia.length === 1 ? 'este campo' : 'estos campos'}.
        Mirá la imagen y elegí el correcto.
      </Typography>

      {materialesConDiscrepancia.map((mat) => {
        const idx = mat._idx;
        const v = mat._verificacion || {};
        const descripcion = mat.descripcion || mat.nombre || null;
        const codigo = mat.codigo || mat.SKU || null;
        // Título claro del material
        let tituloMaterial = descripcion || (codigo ? `Código ${codigo}` : `Línea ${idx + 1} de la factura`);
        // Subtítulo: si tiene descripción, mostrar el código como referencia
        const subtituloMaterial = descripcion && codigo ? `Cód. ${codigo}` : null;

        return (
          <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: 'warning.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                  ?
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">{tituloMaterial}</Typography>
                {subtituloMaterial && (
                  <Typography variant="caption" color="text.secondary">{subtituloMaterial}</Typography>
                )}
              </Box>
            </Stack>

            {v.requiere_cantidad_input && (
              <FormControl sx={{ mb: 1.5 }} fullWidth>
                <FormLabel sx={{ fontSize: '0.8rem', mb: 0.5 }}>¿Cuál es la cantidad?</FormLabel>
                <RadioGroup
                  value={resoluciones[idx]?.cantidad ?? ''}
                  onChange={(e) => setResoluciones((prev) => ({
                    ...prev,
                    [idx]: { ...prev[idx], cantidad: e.target.value },
                  }))}
                >
                  <FormControlLabel
                    value={String(v.cantidad_original)}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{v.cantidad_original}</Typography>}
                  />
                  <FormControlLabel
                    value={String(v.cantidad_verificada)}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{v.cantidad_verificada}</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            )}

            {v.requiere_precio_input && (
              <FormControl sx={{ mb: 1.5 }} fullWidth>
                <FormLabel sx={{ fontSize: '0.8rem', mb: 0.5 }}>¿Cuál es el precio unitario?</FormLabel>
                <RadioGroup
                  value={resoluciones[idx]?.precio ?? ''}
                  onChange={(e) => setResoluciones((prev) => ({
                    ...prev,
                    [idx]: { ...prev[idx], precio: e.target.value },
                  }))}
                >
                  <FormControlLabel
                    value={String(v.precio_original)}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>${v.precio_original}</Typography>}
                  />
                  <FormControlLabel
                    value={String(v.precio_verificado)}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>${v.precio_verificado}</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            )}

            {v.requiere_codigo_input && (
              <FormControl fullWidth>
                <FormLabel sx={{ fontSize: '0.8rem', mb: 0.5 }}>¿Cuál es el código?</FormLabel>
                <RadioGroup
                  value={resoluciones[idx]?.codigo ?? ''}
                  onChange={(e) => setResoluciones((prev) => ({
                    ...prev,
                    [idx]: { ...prev[idx], codigo: e.target.value },
                  }))}
                >
                  <FormControlLabel
                    value={v.codigo_original || ''}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{v.codigo_original || '(sin código)'}</Typography>}
                  />
                  <FormControlLabel
                    value={v.codigo_verificado || ''}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{v.codigo_verificado || '(sin código)'}</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            )}
          </Paper>
        );
      })}
    </Stack>
  );

  // --- Función para creación distribuida (Fase 3) ---
  const crearDestinoDistribuido = useCallback(async (grupos) => {
    setOpenDistribuir(false);
    setLoading(true);
    setStep(STEP_RESULTADO);

    const normalizarMateriales = (mats) =>
      mats
        .map(({ _verificacion, _extraccion_inicial, _requiere_confirmacion_usuario, ...rest }) => {
          const m = { ...rest };
          if (m.Nombre && !m.nombre && !m.descripcion) m.nombre = m.Nombre;
          if (m.SKU && !m.codigo) m.codigo = m.SKU;
          if (m.precio_unitario != null && m.valorUnitario == null) m.valorUnitario = m.precio_unitario;
          return m;
        })
        .filter((m) => (m.descripcion || m.nombre) && parseFloat(m.cantidad) > 0);

    try {
      const resultados = [];
      let solicitudPrincipal = null;
      let acopioPrincipal = null;

      for (const grupo of grupos) {
        const { destino: dest, proyecto_id, proyecto_nombre, proveedor, materiales: mats } = grupo;
        const materialesNorm = normalizarMateriales(mats);
        if (materialesNorm.length === 0) continue;

        if (dest === 'acopio') {
          const res = await api.post('/acopio/from-caja', {
            empresa_id: empresaId,
            proveedor,
            proyecto_id,
            materiales: materialesNorm,
            movimiento_caja_id: movimientoId,
            url_imagen_compra: urlImagen ? [urlImagen] : [],
          });
          if (!acopioPrincipal) acopioPrincipal = res.data?.acopio_id;
          resultados.push({ tipo: 'acopio', id: res.data?.acopio_id, data: res.data });
        } else {
          let subtipo = 'COMPRA';
          let destinoStock = 'deposito';
          if (dest === 'pendiente_asignar') {
            subtipo = 'PENDIENTE_ASIGNAR';
            destinoStock = 'pendiente_asignar';
          } else if (dest === 'obra') {
            subtipo = 'COMPRA_DIRECTA';
            destinoStock = 'obra';
          }
          const res = await api.post('/solicitud-material/from-caja', {
            empresa_id: empresaId,
            empresa_nombre: empresaNombre,
            movimiento_caja_id: movimientoId,
            materiales: materialesNorm,
            proyecto_id,
            proyecto_nombre,
            subtipo,
            destino: destinoStock,
            proveedor: nombreProveedor ? { nombre: nombreProveedor } : null,
            validacion_movimientos: stockConfig.validacion_movimientos || false,
          });
          const data = res.data?.data || res.data;
          if (!solicitudPrincipal) solicitudPrincipal = data.solicitud_id;
          resultados.push({ tipo: 'solicitud', id: data.solicitud_id, data });
        }
      }

      const updateData = { stock_procesado: true };
      if (solicitudPrincipal) updateData.solicitud_stock_id = solicitudPrincipal;
      if (acopioPrincipal) updateData.acopio_id = acopioPrincipal;
      await movimientosService.updateMovimiento(movimientoId, updateData);

      setResultado({ tipo: 'distribuido', resultados, total: resultados.length });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.error || err.message || 'Error al distribuir materiales.';
      setError(msg);
      onError?.(msg);
    }
  }, [empresaId, empresaNombre, movimientoId, urlImagen, nombreProveedor, stockConfig, onError]);

  const renderStepResultado = () => {
    if (loading) {
      return (
        <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={40} />
          <Typography variant="body2">
            Creando {destino === DESTINOS.ACOPIO ? 'acopio' : destino === DESTINOS.DISTRIBUIR ? 'solicitudes distribuidas' : 'solicitud de stock'}...
          </Typography>
        </Stack>
      );
    }

    if (error) {
      return <Alert severity="error" variant="outlined">{error}</Alert>;
    }

    if (!resultado) return null;

    // Resultado distribuido
    if (resultado.tipo === 'distribuido') {
      return (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50', borderColor: 'success.light' }}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="subtitle2" color="success.dark">
                Distribución completada — {resultado.total} grupo(s) creado(s)
              </Typography>
            </Stack>
            {resultado.resultados.map((r, i) => (
              <Button
                key={i}
                size="small"
                variant="outlined"
                startIcon={<LinkIcon />}
                href={
                  r.tipo === 'solicitud'
                    ? '/stockSolicitudes?solicitudId=' + r.id
                    : '/movimientosAcopio?acopioId=' + r.id
                }
              >
                {r.tipo === 'solicitud' ? `Ver solicitud ${String(r.id || '').slice(-6)}` : `Ver acopio ${String(r.id || '').slice(-6)}`}
              </Button>
            ))}
          </Stack>
        </Paper>
      );
    }

    const refId = resultado.id;
    const tipoRef = resultado.tipo;

    return (
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50', borderColor: 'success.light' }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="subtitle2" color="success.dark">
              {tipoRef === 'acopio' ? 'Acopio creado exitosamente' : 'Solicitud de stock creada'}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {materialesExtraidos.length} material(es) extraidos y procesados.
          </Typography>

          {resultado.data?.materiales_creados?.length > 0 && (
            <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
              {resultado.data.materiales_creados.length} material(es) nuevo(s) agregados al catalogo.
            </Alert>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon />}
            href={
              tipoRef === 'solicitud'
                ? '/stockSolicitudes?solicitudId=' + refId
                : '/movimientosAcopio?acopioId=' + refId
            }
          >
            {tipoRef === 'solicitud' ? 'Ver solicitud de stock' : 'Ver acopio'}
          </Button>
        </Stack>
      </Paper>
    );
  };

  // --- Dialog principal ---
  return (
    <>
    <Dialog
      open={open}
      onClose={step === STEP_EXTRACCION ? undefined : onClose}
      maxWidth={step === STEP_DISCREPANCIAS ? 'md' : 'sm'}
      fullWidth
      PaperProps={{ sx: { minHeight: 300 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {step === STEP_SUBOPCIONES && (
          <IconButton size="small" onClick={handleBack} aria-label="Volver">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ flex: 1 }}>{dialogTitle}</Typography>
        {step !== STEP_EXTRACCION && (
          <IconButton size="small" onClick={onClose} aria-label="Cerrar">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {error && step !== STEP_RESULTADO && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {step === STEP_DESTINO && renderStepDestino()}
        {step === STEP_SUBOPCIONES && renderStepSubOpciones()}
        {step === STEP_EXTRACCION && renderStepExtraccion()}
        {step === STEP_DISCREPANCIAS && renderStepDiscrepancias()}
        {step === STEP_RESULTADO && renderStepResultado()}
      </DialogContent>

      {step === STEP_SUBOPCIONES && (
        <DialogActions>
          <Button onClick={handleBack} variant="outlined">Volver</Button>
          <Button
            onClick={handleConfirmSubOpcion}
            variant="contained"
            disabled={!canConfirmSub || loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Extraer materiales y crear
          </Button>
        </DialogActions>
      )}

      {step === STEP_DISCREPANCIAS && (
        <DialogActions>
          <Button onClick={() => setStep(STEP_SUBOPCIONES)} variant="outlined">Volver</Button>
          <Button
            onClick={handleConfirmDiscrepancias}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Confirmar y crear
          </Button>
        </DialogActions>
      )}

      {step === STEP_RESULTADO && resultado && (
        <DialogActions>
          <Button
            onClick={() => {
              if (resultado.tipo === 'distribuido') {
                onComplete?.({ tipo: 'distribuido', resultados: resultado.resultados });
              } else {
                onComplete?.(
                  resultado.tipo === 'acopio'
                    ? { tipo: 'acopio', acopio_id: resultado.id }
                    : { tipo: 'solicitud', solicitud_stock_id: resultado.id }
                );
              }
            }}
            variant="contained"
          >
            Cerrar
          </Button>
        </DialogActions>
      )}
    </Dialog>

    {/* Fase 3: Dialog de distribución por línea */}
    <DistribuirMaterialesDialog
      open={openDistribuir}
      onClose={() => {
        setOpenDistribuir(false);
        setStep(STEP_SUBOPCIONES);
      }}
      onConfirm={crearDestinoDistribuido}
      materiales={materialesExtraidos}
      proyectos={proyectos}
      proveedores={proveedores}
      acopioHabilitado={Boolean(stockConfig.acopio_habilitado)}
    />
    </>
  );
};

export default MaterialesFacturaActions;
