import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Stack,
  Alert,
  LinearProgress,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestoreIcon from '@mui/icons-material/Restore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import importMovimientosService from 'src/services/importMovimientosService';
import { useAuthContext } from 'src/contexts/auth-context';
import BatchValidationForm from 'src/components/movimientos/cargaMasiva/BatchValidationForm';
import { getCamposVisibles } from 'src/components/movementFieldsConfig';
import { formatNumberWithThousands } from 'src/utils/celulandia/separacionMiles';

const POLL_MS = 4000;
const MONEDA_OPTIONS = ['ARS', 'USD'];
const ESTADO_OPTIONS = ['Pendiente', 'Parcialmente Pagado', 'Pagado'];

// Columnas de la tabla derivadas de los campos visibles de la empresa. Se excluyen los campos
// que ya tienen su propia columna (tipo, estado) o que no aportan en una grilla (USD readonly).
const COLUMNAS_CAMPO_EXCLUIDAS = new Set(['type', 'estado', 'subtotal_dolar', 'total_dolar']);
// Orden preferido al frente; el resto sigue el orden de definición de los campos.
const COLUMNAS_CAMPO_PRIORITARIAS = ['fecha_factura', 'total', 'moneda', 'subtotal', 'total_original'];
const COLUMNAS_CAMPO_NUMERICAS = new Set([
  'total',
  'subtotal',
  'total_original',
  'monto_aprobado',
  'dolar_referencia',
]);

const esColumnaNumerica = (campo) =>
  COLUMNAS_CAMPO_NUMERICAS.has(campo.name) || campo.type === 'impuestos';

// Render compacto del valor de un campo en una celda de la tabla, según su tipo.
function renderValorCeldaCampo(campo, d) {
  const v = d?.[campo.name];
  if (v === undefined || v === null || v === '') return '—';
  if (campo.type === 'boolean') return v === true || v === 'true' ? 'Sí' : 'No';
  if (campo.type === 'tags') return Array.isArray(v) ? (v.length ? v.join(', ') : '—') : String(v);
  if (campo.type === 'impuestos') return Array.isArray(v) && v.length ? String(v.length) : '—';
  if (COLUMNAS_CAMPO_NUMERICAS.has(campo.name)) return formatNumberWithThousands(v);
  return String(v);
}

const makeClientId = () => `pv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyIaData = () => ({
  accion: 'CREAR_EGRESO',
  fecha_factura: '',
  total: '',
  moneda: 'ARS',
  estado: 'Pendiente',
  monto_pagado: null,
  proyecto_id: '',
  proyecto_nombre: '',
  nombre_proveedor: '',
  categoria: '',
  subcategoria: '',
  observacion: '',
  medio_pago: 'Efectivo',
  user_phone: '',
});

function mapPreviewToRows(movimientosPreview) {
  return (movimientosPreview || []).map((m) => {
    const ia = m.ia_data ? { ...m.ia_data } : { ...emptyIaData() };
    return {
      clientId: makeClientId(),
      fila: m.fila,
      datos_fila: m.datos_fila || {},
      ia_data: ia,
      error_extraccion: m.error_extraccion || null,
      omitido: false,
    };
  });
}

function rowIsValid(row, requiereProyecto) {
  if (row.omitido) return true;
  const d = row.ia_data;
  if (!d) return false;
  if (d.accion !== 'CREAR_EGRESO' && d.accion !== 'CREAR_INGRESO') return false;
  const moneda = String(d.moneda || 'ARS').toUpperCase();
  if (!MONEDA_OPTIONS.includes(moneda)) return false;
  if (d.estado && !ESTADO_OPTIONS.includes(String(d.estado))) return false;
  if (!d.fecha_factura || String(d.fecha_factura).trim() === '') return false;
  if (d.total === undefined || d.total === null || String(d.total).trim() === '') return false;
  if (requiereProyecto && (!d.proyecto_id || String(d.proyecto_id).trim() === '')) return false;
  if (d.estado === 'Parcialmente Pagado' && d.accion === 'CREAR_EGRESO') {
    const mp = Number(d.monto_pagado);
    const tot = Number(d.total);
    if (!Number.isFinite(mp) || mp <= 0) return false;
    if (Number.isFinite(tot) && mp >= tot) return false;
  }
  return true;
}

const PasoValidarMovimientosImport = forwardRef(
  (
    {
      empresa,
      wizardData,
      updateWizardData,
      perfiles = [],
      setLoading: _setLoading,
      setError,
      hideNavigation,
      onNext,
      onBack,
      proveedores = [],
      categorias = [],
      tagsExtra = [],
      mediosPago = [],
      etapas = [],
      obrasOptions = [],
      clientesOptions = [],
    },
    ref,
  ) => {
    const { user } = useAuthContext();
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensajeProgreso, setMensajeProgreso] = useState('Iniciando análisis…');
    const [editRow, setEditRow] = useState(null);
    const [formEdicion, setFormEdicion] = useState(null);
    const [mostrarColumnasVacias, setMostrarColumnasVacias] = useState(false);
    const pollingRef = useRef(null);
    const iniciadoRef = useRef(false);

    const requiereProyecto = useMemo(
      () =>
        wizardData.tipoImportacion === 'general' &&
        Array.isArray(empresa?.proyectos) &&
        empresa.proyectos.length > 0,
      [wizardData.tipoImportacion, empresa?.proyectos],
    );

    // El tipo (egreso/ingreso) define qué campos visibles aplican (comprobante_info vs ingreso_info).
    const tipoMovEdicion =
      formEdicion?.accion === 'CREAR_INGRESO' ? 'ingreso' : 'egreso';

    // Tipos de movimiento presentes en los datos. Definen qué config de visibilidad aplica
    // (comprobante_info para egresos, ingreso_info para ingresos). Evita arrastrar columnas
    // de un tipo que no está en la importación (ej. campos visibles solo en ingreso cuando
    // la carga es 100% egresos).
    const tiposPresentes = useMemo(() => {
      const tipos = new Set();
      filas.forEach((r) => {
        tipos.add(r?.ia_data?.accion === 'CREAR_INGRESO' ? 'ingreso' : 'egreso');
      });
      return tipos.size ? tipos : new Set(['egreso']);
    }, [filas]);

    // Columnas dinámicas de la tabla: campos visibles según la config, pero solo de los tipos
    // presentes. Son los mismos campos que muestra el formulario de movimiento (movementForm).
    const columnasCampos = useMemo(() => {
      const ci = empresa?.comprobante_info || {};
      const ii = empresa?.ingreso_info || {};
      const union = new Map();
      const fuentes = [];
      if (tiposPresentes.has('egreso')) fuentes.push(getCamposVisibles(ci, empresa, ii, 'egreso'));
      if (tiposPresentes.has('ingreso')) fuentes.push(getCamposVisibles(ci, empresa, ii, 'ingreso'));
      fuentes.flat().forEach((campo) => {
        if (COLUMNAS_CAMPO_EXCLUIDAS.has(campo.name) || union.has(campo.name)) return;
        union.set(campo.name, campo);
      });
      const peso = (name) => {
        const i = COLUMNAS_CAMPO_PRIORITARIAS.indexOf(name);
        return i === -1 ? COLUMNAS_CAMPO_PRIORITARIAS.length : i;
      };
      return [...union.values()].sort((a, b) => peso(a.name) - peso(b.name));
    }, [empresa, tiposPresentes]);

    // Columnas cuyo valor está vacío en TODAS las filas: ocupan espacio y estorban al validar.
    // Por defecto se ocultan; el toggle las vuelve a mostrar al final de la tabla.
    const columnasVaciasNombres = useMemo(() => {
      if (filas.length === 0) return new Set();
      const vacias = new Set();
      columnasCampos.forEach((campo) => {
        const todasVacias = filas.every(
          (r) => renderValorCeldaCampo(campo, r.ia_data || {}) === '—',
        );
        if (todasVacias) vacias.add(campo.name);
      });
      return vacias;
    }, [columnasCampos, filas]);

    // Orden final de columnas: primero las que tienen datos; las vacías solo si se piden ver,
    // y siempre al final para no estorbar.
    const columnasVisibles = useMemo(() => {
      const conDatos = columnasCampos.filter((c) => !columnasVaciasNombres.has(c.name));
      if (!mostrarColumnasVacias) return conDatos;
      const vacias = columnasCampos.filter((c) => columnasVaciasNombres.has(c.name));
      return [...conDatos, ...vacias];
    }, [columnasCampos, columnasVaciasNombres, mostrarColumnasVacias]);

    // BatchValidationForm rinde los campos configurables; el Tipo, Proyecto, Estado y Creador
    // se manejan acá explícitamente (lógica específica del import). Por eso suprimimos en el
    // form interno el campo proyecto (proyecto: false) y el estado (con_estados: false) para
    // no duplicarlos.
    const empresaCamposExtra = useMemo(
      () => ({ ...(empresa || {}), con_estados: false }),
      [empresa],
    );
    const comprobanteInfoCampos = useMemo(
      () => ({ ...(empresa?.comprobante_info || {}), proyecto: false }),
      [empresa],
    );
    const ingresoInfoCampos = useMemo(
      () => ({ ...(empresa?.ingreso_info || {}), proyecto: false }),
      [empresa],
    );

    // Catálogos para los selects/autocompletes de los campos. Se prefieren los que llegan
    // por props (CargaMasivaDialog ya los trae cargados); si no, se derivan de `empresa`
    // para que la página standalone (importMovimientos.js) siga funcionando.
    const catalogos = useMemo(
      () => ({
        proveedores,
        categorias: categorias.length ? categorias : empresa?.categorias || [],
        tagsExtra: tagsExtra.length ? tagsExtra : empresa?.tags_extra || [],
        mediosPago: mediosPago.length
          ? mediosPago
          : empresa?.medios_pago?.length
            ? empresa.medios_pago
            : ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'],
        etapas: etapas.length ? etapas : empresa?.etapas || [],
        obrasOptions: obrasOptions.length
          ? obrasOptions
          : (empresa?.obras || []).map((o) => o.nombre).filter(Boolean),
        clientesOptions: clientesOptions.length
          ? clientesOptions
          : [...new Set((empresa?.obras || []).map((o) => o.cliente).filter(Boolean))],
      }),
      [
        empresa,
        proveedores,
        categorias,
        tagsExtra,
        mediosPago,
        etapas,
        obrasOptions,
        clientesOptions,
      ],
    );

    const limpiarPolling = useCallback(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, []);

    useEffect(() => {
      return () => limpiarPolling();
    }, [limpiarPolling]);

    useEffect(() => {
      if (iniciadoRef.current) return undefined;
      const urls = wizardData.analisisCsv?._archivosUrls;
      if (!urls?.length || !empresa?.id || !user?.id) {
        setCargando(false);
        setError('Faltan archivos o datos de sesión para analizar.');
        return undefined;
      }

      if (wizardData.previewRowsForValidation?.length > 0) {
        setFilas(wizardData.previewRowsForValidation);
        setCargando(false);
        iniciadoRef.current = true;
        return undefined;
      }

      iniciadoRef.current = true;

      const run = async () => {
        try {
          setCargando(true);
          setError('');
          setMensajeProgreso('Enviando planilla al motor de análisis…');

          const proyectoId =
            wizardData.tipoImportacion === 'proyecto_especifico'
              ? wizardData.proyectoSeleccionado?.id
              : null;

          const mapeosCategoriasDescartadas =
            wizardData.mapeosCategorias
              ?.filter((m) => m.accion === 'mapear_a_existente' && m.categoriaDestino)
              ?.map((m) => ({
                categoriaOriginal: m.nombre,
                categoriaDestino: m.categoriaDestino,
              })) || [];

          const { codigo } = await importMovimientosService.previsualizarImportacion(
            urls,
            empresa.id,
            user.id,
            `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Usuario',
            proyectoId,
            wizardData.aclaracionesUsuario || '',
            mapeosCategoriasDescartadas,
            wizardData.hojasSeleccionadas || null,
            wizardData.analisisCsv?._archivoNombresOrden || null,
          );

          updateWizardData({ codigoPrevisualizacion: codigo });
          setMensajeProgreso('Interpretando filas con IA (puede tardar varios minutos)…');

          const pollOnce = async () => {
            try {
              const estado = await importMovimientosService.consultarEstadoImportacion(codigo);
              if (estado?.resultado !== null && estado?.resultado !== undefined) {
                limpiarPolling();
                const res = estado.resultado;
                if (!res.success) {
                  setError(res.error || 'Error en la previsualización');
                  setFilas([]);
                  setCargando(false);
                  return true;
                }
                const rows = mapPreviewToRows(res.movimientos_preview);
                setFilas(rows);
                updateWizardData({
                  movimientosPreviewBruto: res.movimientos_preview,
                  previewRowsForValidation: rows,
                });
                setCargando(false);
                return true;
              }
            } catch (e) {
              console.warn('[PasoValidarMovimientosImport] polling:', e);
            }
            return false;
          };

          await new Promise((r) => setTimeout(r, 1200));
          const done = await pollOnce();
          if (!done) {
            pollingRef.current = setInterval(() => {
              void pollOnce();
            }, POLL_MS);
          }
        } catch (e) {
          setError(e.message || 'Error al previsualizar');
          setCargando(false);
        }
      };

      run();
      return () => limpiarPolling();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for this step
    }, []);

    const abrirEdicion = useCallback((row) => {
      const d = row.ia_data || emptyIaData();
      setEditRow(row.clientId);
      setFormEdicion({ ...d });
    }, []);

    const guardarEdicion = useCallback(() => {
      if (!editRow || !formEdicion) return;
      setFilas((prev) =>
        prev.map((r) =>
          r.clientId === editRow
            ? {
                ...r,
                ia_data: { ...formEdicion },
                error_extraccion: null,
              }
            : r,
        ),
      );
      setEditRow(null);
      setFormEdicion(null);
    }, [editRow, formEdicion]);

    const toggleOmitir = useCallback((clientId) => {
      setFilas((prev) =>
        prev.map((r) => (r.clientId === clientId ? { ...r, omitido: !r.omitido } : r)),
      );
    }, []);

    const incluidos = useMemo(() => filas.filter((r) => !r.omitido), [filas]);
    const validos = useMemo(
      () => incluidos.filter((r) => rowIsValid(r, requiereProyecto)),
      [incluidos, requiereProyecto],
    );

    const handleSubmitStep = useCallback(() => {
      if (cargando) {
        throw new Error('Aún se está analizando');
      }
      if (incluidos.length === 0) {
        setError('Incluí al menos un movimiento (no podés continuar con todos excluidos).');
        throw new Error('Sin movimientos');
      }
      // Las filas incompletas NO se bloquean: se envían igual y el backend las
      // rechaza, apareciendo en el resumen final con su motivo (ticket TAR-284).
      // Solo avisamos para que el usuario sepa que no se importarán.
      const invalidos = incluidos.filter((r) => !rowIsValid(r, requiereProyecto));
      if (invalidos.length > 0) {
        setError(
          `${invalidos.length} movimiento(s) con datos incompletos no se importarán y aparecerán como rechazados en el resumen.`,
        );
      } else {
        setError('');
      }

      const payload = incluidos.map((r) => ({
        fila: r.fila,
        omitido: false,
        ia_data: r.ia_data,
        datos_fila: r.datos_fila,
      }));

      updateWizardData({
        movimientosValidadosParaCrear: payload,
        previewRowsForValidation: filas,
      });
      setError('');
    }, [cargando, filas, incluidos, requiereProyecto, updateWizardData, setError]);

    const handleContinuarDesdePaso = useCallback(async () => {
      try {
        handleSubmitStep();
        if (typeof onNext === 'function') {
          onNext();
        }
      } catch {
        /* setError ya aplicado */
      }
    }, [handleSubmitStep, onNext]);

    useImperativeHandle(ref, () => ({
      submitStep: handleSubmitStep,
    }));

    const proyectos = empresa?.proyectos || [];

    if (cargando && filas.length === 0) {
      return (
        <Stack spacing={2} alignItems="center" sx={{ py: 4, px: 2 }}>
          {hideNavigation && (
            <Typography variant="subtitle1" fontWeight={600} alignSelf="stretch">
              Validación de movimientos
            </Typography>
          )}
          <LinearProgress sx={{ width: '100%', maxWidth: 480, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {mensajeProgreso}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            No cierres esta ventana. El análisis sigue en segundo plano.
          </Typography>
        </Stack>
      );
    }

    return (
      <Box>
        {!hideNavigation && onBack && (
          <Button variant="text" size="small" onClick={onBack} sx={{ mb: 1, px: 0 }}>
            ← Aclaraciones
          </Button>
        )}
        {hideNavigation ? (
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Validación de movimientos
          </Typography>
        ) : (
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Validar movimientos
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Revisá cada fila detectada. Podés editar datos, excluir movimientos que no correspondan o corregir
          advertencias antes de confirmar la importación en el paso siguiente.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            bgcolor: 'grey.50',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              icon={<CheckCircleOutlineIcon />}
              label={`${validos.length} listos`}
              color="success"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${filas.length - incluidos.length} excluidos`}
              variant="outlined"
            />
            <Chip size="small" label={`${filas.length} detectados`} variant="outlined" />
          </Stack>
          {requiereProyecto && (
            <Typography variant="caption" color="text.secondary">
              En modo general, cada movimiento debe tener proyecto asignado.
            </Typography>
          )}
          {columnasVaciasNombres.size > 0 && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={mostrarColumnasVacias ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
              onClick={() => setMostrarColumnasVacias((v) => !v)}
              sx={{ ml: 'auto', textTransform: 'none', color: 'text.secondary' }}
            >
              {mostrarColumnasVacias
                ? 'Ocultar columnas sin datos'
                : `Ver ${columnasVaciasNombres.size} columna${columnasVaciasNombres.size === 1 ? '' : 's'} sin datos`}
            </Button>
          )}
        </Paper>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 460 }}>
          <Table
            size="small"
            stickyHeader
            sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', width: 48 }}>
                  #
                </TableCell>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 48,
                    zIndex: 3,
                    bgcolor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  Tipo
                </TableCell>
                <TableCell>Proyecto</TableCell>
                {columnasVisibles.map((campo) => (
                  <TableCell key={campo.name} align={esColumnaNumerica(campo) ? 'right' : 'left'}>
                    {campo.label}
                  </TableCell>
                ))}
                <TableCell>Estado</TableCell>
                <TableCell>Creador</TableCell>
                <TableCell>Validación</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    position: 'sticky',
                    right: 0,
                    zIndex: 3,
                    bgcolor: 'background.paper',
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    width: 120,
                  }}
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((row) => {
                const d = row.ia_data || {};
                const ok = row.omitido || rowIsValid(row, requiereProyecto);
                const proyectoNombre =
                  d.proyecto_nombre ||
                  proyectos.find((p) => p.id === d.proyecto_id)?.nombre ||
                  '—';
                const stickyBg = row.omitido ? 'grey.100' : 'background.paper';
                return (
                  <TableRow key={row.clientId} sx={{ opacity: row.omitido ? 0.5 : 1 }}>
                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: stickyBg }}>
                      {row.fila}
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 48,
                        zIndex: 1,
                        bgcolor: stickyBg,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {d.accion === 'CREAR_INGRESO' ? 'Ingreso' : 'Egreso'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                        {proyectoNombre}
                      </Typography>
                    </TableCell>
                    {columnasVisibles.map((campo) => {
                      const numerica = esColumnaNumerica(campo);
                      const contenido = renderValorCeldaCampo(campo, d);
                      return numerica ? (
                        <TableCell key={campo.name} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {contenido}
                        </TableCell>
                      ) : (
                        <TableCell key={campo.name}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                            {contenido}
                          </Typography>
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      {d.estado ? (
                        <Chip
                          size="small"
                          label={
                            d.estado === 'Parcialmente Pagado' && d.accion === 'CREAR_EGRESO' && d.monto_pagado
                              ? `Parcial · ${d.monto_pagado}`
                              : d.estado
                          }
                          variant="outlined"
                          color={
                            d.estado === 'Pagado'
                              ? 'success'
                              : d.estado === 'Parcialmente Pagado'
                                ? 'warning'
                                : 'default'
                          }
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                        {(() => {
                          const p = perfiles.find((pp) => pp.phone === d.user_phone);
                          if (p) return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.phone;
                          return d.user_phone || '—';
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.omitido ? (
                        <Chip size="small" label="Excluido" />
                      ) : row.error_extraccion ? (
                        <Tooltip title={row.error_extraccion}>
                          <Chip
                            size="small"
                            icon={<ErrorOutlineIcon />}
                            label="Revisar"
                            color="warning"
                            variant="outlined"
                          />
                        </Tooltip>
                      ) : ok ? (
                        <Chip
                          size="small"
                          icon={<CheckCircleOutlineIcon />}
                          label="OK"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="Incompleto" color="error" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        position: 'sticky',
                        right: 0,
                        zIndex: 1,
                        bgcolor: stickyBg,
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Tooltip title={row.omitido ? 'Incluir de nuevo' : 'Excluir'}>
                        <IconButton
                          size="small"
                          onClick={() => toggleOmitir(row.clientId)}
                          aria-label={row.omitido ? 'Incluir movimiento' : 'Excluir movimiento'}
                        >
                          {row.omitido ? <RestoreIcon fontSize="small" /> : <DeleteOutlineIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => abrirEdicion(row)}
                            disabled={row.omitido}
                            aria-label="Editar movimiento"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {filas.length === 0 && !cargando && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No se detectaron filas para importar. Volvé al paso anterior y revisá las hojas o el archivo.
          </Alert>
        )}

        {!hideNavigation && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleContinuarDesdePaso}
              disabled={cargando || filas.length === 0}
            >
              Continuar al resumen
            </Button>
          </Box>
        )}

        <Dialog open={Boolean(editRow)} onClose={() => setEditRow(null)} maxWidth="md" fullWidth scroll="body">
          <DialogTitle>Editar movimiento</DialogTitle>
          <DialogContent dividers>
            {formEdicion && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    label="Tipo"
                    value={formEdicion.accion || 'CREAR_EGRESO'}
                    onChange={(e) =>
                      setFormEdicion((prev) => ({ ...prev, accion: e.target.value }))
                    }
                  >
                    <MenuItem value="CREAR_EGRESO">Egreso</MenuItem>
                    <MenuItem value="CREAR_INGRESO">Ingreso</MenuItem>
                  </Select>
                </FormControl>
                {proyectos.length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Proyecto</InputLabel>
                    <Select
                      label="Proyecto"
                      value={formEdicion.proyecto_id || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const p = proyectos.find((x) => x.id === id);
                        setFormEdicion((prev) => ({
                          ...prev,
                          proyecto_id: id,
                          proyecto_nombre: p?.nombre || '',
                        }));
                      }}
                    >
                      <MenuItem value="">
                        <em>Sin proyecto</em>
                      </MenuItem>
                      {proyectos.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    label="Estado"
                    value={formEdicion.estado || 'Pendiente'}
                    onChange={(e) => {
                      const nuevoEstado = e.target.value;
                      setFormEdicion((prev) => ({
                        ...prev,
                        estado: nuevoEstado,
                        monto_pagado:
                          nuevoEstado === 'Parcialmente Pagado' ? prev.monto_pagado : null,
                      }));
                    }}
                  >
                    {ESTADO_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formEdicion.estado === 'Parcialmente Pagado' &&
                  formEdicion.accion === 'CREAR_EGRESO' && (
                    <TextField
                      size="small"
                      type="number"
                      label="Monto pagado"
                      value={formEdicion.monto_pagado ?? ''}
                      onChange={(e) =>
                        setFormEdicion((prev) => ({ ...prev, monto_pagado: e.target.value }))
                      }
                      fullWidth
                      required
                      helperText="Debe ser mayor a 0 y menor al total."
                    />
                  )}
                {perfiles.length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Creador</InputLabel>
                    <Select
                      label="Creador"
                      value={formEdicion.user_phone || ''}
                      onChange={(e) =>
                        setFormEdicion((prev) => ({ ...prev, user_phone: e.target.value }))
                      }
                    >
                      {perfiles.map((p) => (
                        <MenuItem key={p.id || p.phone} value={p.phone}>
                          {`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.phone}
                          {p.phone ? ` (${p.phone})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {/* Campos del movimiento según la configuración de la empresa
                    (comprobante_info / ingreso_info). Mismo motor que el flujo OCR. */}
                <BatchValidationForm
                  form={formEdicion}
                  onFormChange={setFormEdicion}
                  empresa={empresaCamposExtra}
                  comprobanteInfo={comprobanteInfoCampos}
                  ingresoInfo={ingresoInfoCampos}
                  proveedores={catalogos.proveedores}
                  categorias={catalogos.categorias}
                  tagsExtra={catalogos.tagsExtra}
                  mediosPago={catalogos.mediosPago}
                  etapas={catalogos.etapas}
                  obrasOptions={catalogos.obrasOptions}
                  clientesOptions={catalogos.clientesOptions}
                  tipoMov={tipoMovEdicion}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditRow(null)} color="inherit">
              Cancelar
            </Button>
            <Button variant="contained" onClick={guardarEdicion}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  },
);

PasoValidarMovimientosImport.displayName = 'PasoValidarMovimientosImport';

PasoValidarMovimientosImport.propTypes = {
  empresa: PropTypes.object.isRequired,
  wizardData: PropTypes.object.isRequired,
  updateWizardData: PropTypes.func.isRequired,
  setLoading: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  hideNavigation: PropTypes.bool,
  onNext: PropTypes.func,
  onBack: PropTypes.func,
  proveedores: PropTypes.array,
  categorias: PropTypes.array,
  tagsExtra: PropTypes.array,
  mediosPago: PropTypes.array,
  etapas: PropTypes.array,
  obrasOptions: PropTypes.array,
  clientesOptions: PropTypes.array,
};

PasoValidarMovimientosImport.defaultProps = {
  hideNavigation: false,
  onNext: undefined,
  onBack: undefined,
  proveedores: [],
  categorias: [],
  tagsExtra: [],
  mediosPago: [],
  etapas: [],
  obrasOptions: [],
  clientesOptions: [],
};

export default PasoValidarMovimientosImport;
