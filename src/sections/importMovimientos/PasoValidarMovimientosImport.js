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
import importMovimientosService from 'src/services/importMovimientosService';
import { useAuthContext } from 'src/contexts/auth-context';

const POLL_MS = 4000;
const MONEDA_OPTIONS = ['ARS', 'USD'];
const ESTADO_OPTIONS = ['Pendiente', 'Parcialmente Pagado', 'Pagado'];

const makeClientId = () => `pv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyIaData = () => ({
  accion: 'CREAR_EGRESO',
  fecha_factura: '',
  total: '',
  moneda: 'ARS',
  estado: 'Pendiente',
  proyecto_id: '',
  proyecto_nombre: '',
  nombre_proveedor: '',
  categoria: '',
  subcategoria: '',
  observacion: '',
  medio_pago: 'Efectivo',
});

function mapPreviewToRows(movimientosPreview) {
  return (movimientosPreview || []).map((m) => ({
    clientId: makeClientId(),
    fila: m.fila,
    datos_fila: m.datos_fila || {},
    ia_data: m.ia_data ? { ...m.ia_data } : { ...emptyIaData() },
    error_extraccion: m.error_extraccion || null,
    omitido: false,
  }));
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
  return true;
}

const PasoValidarMovimientosImport = forwardRef(
  ({ empresa, wizardData, updateWizardData, setLoading: _setLoading, setError, hideNavigation, onNext, onBack }, ref) => {
    const { user } = useAuthContext();
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensajeProgreso, setMensajeProgreso] = useState('Iniciando análisis…');
    const [editRow, setEditRow] = useState(null);
    const [formEdicion, setFormEdicion] = useState(null);
    const pollingRef = useRef(null);
    const iniciadoRef = useRef(false);

    const requiereProyecto = useMemo(
      () =>
        wizardData.tipoImportacion === 'general' &&
        Array.isArray(empresa?.proyectos) &&
        empresa.proyectos.length > 0,
      [wizardData.tipoImportacion, empresa?.proyectos],
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
      const invalidos = incluidos.filter((r) => !rowIsValid(r, requiereProyecto));
      if (invalidos.length > 0) {
        setError(
          `Hay ${invalidos.length} movimiento(s) con datos incompletos. Corregilos o excluílos antes de continuar.`,
        );
        throw new Error('Validación');
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
        </Paper>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width={48}>#</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Moneda</TableCell>
                <TableCell>Proyecto</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Validación</TableCell>
                <TableCell align="right" width={120}>
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
                return (
                  <TableRow
                    key={row.clientId}
                    sx={{
                      opacity: row.omitido ? 0.45 : 1,
                      bgcolor: row.omitido ? 'action.hover' : 'inherit',
                    }}
                  >
                    <TableCell>{row.fila}</TableCell>
                    <TableCell>
                      {d.accion === 'CREAR_INGRESO' ? 'Ingreso' : 'Egreso'}
                    </TableCell>
                    <TableCell>{d.fecha_factura || '—'}</TableCell>
                    <TableCell align="right">{d.total !== undefined && d.total !== '' ? d.total : '—'}</TableCell>
                    <TableCell>{d.moneda || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                        {proyectoNombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                        {d.nombre_proveedor || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                        {d.categoria || '—'}
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
                    <TableCell align="right">
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

        <Dialog open={Boolean(editRow)} onClose={() => setEditRow(null)} maxWidth="sm" fullWidth scroll="body">
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
                <TextField
                  size="small"
                  label="Fecha factura"
                  value={formEdicion.fecha_factura || ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, fecha_factura: e.target.value }))
                  }
                  fullWidth
                  required
                />
                <TextField
                  size="small"
                  label="Total"
                  value={formEdicion.total ?? ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, total: e.target.value }))
                  }
                  fullWidth
                  required
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Moneda</InputLabel>
                  <Select
                    label="Moneda"
                    value={formEdicion.moneda || 'ARS'}
                    onChange={(e) =>
                      setFormEdicion((prev) => ({ ...prev, moneda: e.target.value }))
                    }
                  >
                    {MONEDA_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    label="Estado"
                    value={formEdicion.estado || 'Pendiente'}
                    onChange={(e) =>
                      setFormEdicion((prev) => ({ ...prev, estado: e.target.value }))
                    }
                  >
                    {ESTADO_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
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
                <TextField
                  size="small"
                  label="Proveedor"
                  value={formEdicion.nombre_proveedor || ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, nombre_proveedor: e.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Categoría"
                  value={formEdicion.categoria || ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, categoria: e.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Subcategoría"
                  value={formEdicion.subcategoria || ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, subcategoria: e.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Medio de pago"
                  value={formEdicion.medio_pago || ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, medio_pago: e.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Observación"
                  value={formEdicion.observacion || ''}
                  onChange={(e) =>
                    setFormEdicion((prev) => ({ ...prev, observacion: e.target.value }))
                  }
                  fullWidth
                  multiline
                  minRows={2}
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
};

PasoValidarMovimientosImport.defaultProps = {
  hideNavigation: false,
  onNext: undefined,
  onBack: undefined,
};

export default PasoValidarMovimientosImport;
