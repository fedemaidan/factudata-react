import { useState, useEffect, Fragment } from 'react';
import {
  Drawer,
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditIcon from '@mui/icons-material/Edit';
import Tooltip from '@mui/material/Tooltip';
import Link from 'next/link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import presupuestoService from 'src/services/presupuestoService';
import MonedasService from 'src/services/monedasService';
import { formatCurrency } from 'src/utils/formatters';

/**
 * PresupuestoDrawer - Drawer reutilizable para crear, editar y gestionar presupuestos
 * 
 * Props:
 * @param {boolean} open - Si el drawer está abierto
 * @param {function} onClose - Callback al cerrar
 * @param {function} onSuccess - Callback cuando una operación es exitosa (para recargar datos)
 * @param {string} mode - 'crear' | 'editar'
 * @param {string} empresaId - ID de la empresa
 * @param {string} proyectoId - ID del proyecto (para crear)
 * @param {string} userId - UID del usuario
 * 
 * Props para modo CREAR:
 * @param {string} tipoAgrupacion - 'categoria' | 'etapa' | 'proveedor' | null
 * @param {string} valorAgrupacion - Nombre de la categoría/etapa/proveedor
 * @param {string} tipoDefault - 'egreso' | 'ingreso' (default: 'egreso')
 * @param {Array} proveedoresEmpresa - Lista de proveedores para el autocomplete
 * 
 * Props para modo EDITAR:
 * @param {Object} presupuesto - Datos del presupuesto a editar { id, monto, moneda, tipo, label, historial, ejecutado }
 */
const PresupuestoDrawer = ({
  open,
  onClose,
  onSuccess,
  mode = 'crear',
  empresaId,
  proyectoId,
  userId,
  // Crear
  tipoAgrupacion = null,
  valorAgrupacion = null,
  tipoDefault = 'egreso',
  proveedoresEmpresa = [],
  // Editar
  presupuesto = null,
  // Acción recalcular (opcional)
  onRecalcular = null,
  // Vista del drawer: 'full' (editar todo), 'adicional' (solo agregar adicional), 'historial' (solo ver historial)
  drawerView = 'full',
  // Formulario completo (página presupuestos.js)
  showFullForm = false,
  proyectos = [],
  categorias = [],
  etapas = [],
}) => {
  // === Estado: Crear ===
  const [tipo, setTipo] = useState(tipoDefault);
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [proveedorInput, setProveedorInput] = useState('');

  // === Estado: Formulario completo ===
  const [proyectoSel, setProyectoSel] = useState(proyectoId || '');
  const [categoriaSel, setCategoriaSel] = useState('');
  const [subcategoriaSel, setSubcategoriaSel] = useState('');
  const [etapaSel, setEtapaSel] = useState('');

  // === Estado: Editar ===
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaMoneda, setNuevaMoneda] = useState('ARS');
  const [motivo, setMotivo] = useState('');

  // === Estado: Adicional ===
  const [mostrarAdicional, setMostrarAdicional] = useState(false);
  const [adicionalConcepto, setAdicionalConcepto] = useState('');
  const [adicionalMonto, setAdicionalMonto] = useState('');

  // === Estado: Historial ===
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // === Estado: Tabs del drawer (modo editar) ===
  const TAB_MAP = { full: 0, adicional: 1, historial: 2 };
  const [activeTab, setActiveTab] = useState(TAB_MAP[drawerView] ?? 0);

  // === Estado: UI ===
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmGuardar, setConfirmGuardar] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  // === Estado: Indexación ===
  const [indexacion, setIndexacion] = useState(null); // null | 'CAC' | 'USD'
  const [nuevaIndexacion, setNuevaIndexacion] = useState(null);
  const [dolarRate, setDolarRate] = useState(null);
  const [cacIndice, setCacIndice] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // === Estado: Override cotización ===
  const [mostrarOverrideCotiz, setMostrarOverrideCotiz] = useState(false);
  const [cacHistorial, setCacHistorial] = useState([]);
  const [cacOverride, setCacOverride] = useState('');
  const [dolarOverride, setDolarOverride] = useState('');
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Valor efectivo de CAC/dólar (override o el cargado automáticamente)
  const cacEfectivo = cacOverride ? parseFloat(cacOverride) : cacIndice;
  const dolarEfectivo = dolarOverride ? parseFloat(dolarOverride) : dolarRate;

  // === Estado: Base de cálculo ===
  const [baseCalculo, setBaseCalculo] = useState('total'); // 'total' | 'subtotal'
  const [nuevaBaseCalculo, setNuevaBaseCalculo] = useState('total');

  // Cargar cotizaciones al abrir el drawer
  useEffect(() => {
    if (!open) return;
    const cargarCotizaciones = async () => {
      setLoadingRates(true);
      try {
        const [dolarData, cacData] = await Promise.all([
          MonedasService.listarDolar({ limit: 1 }).catch(() => null),
          MonedasService.listarCAC({ limit: 1 }).catch(() => null),
        ]);
        if (dolarData?.[0]) {
          const d = dolarData[0];
          setDolarRate(d.blue?.venta || d.blue?.promedio || d.oficial?.venta || null);
        }
        if (cacData?.[0]) {
          setCacIndice(cacData[0].general || cacData[0].valor || null);
        }
      } catch (err) {
        console.warn('No se pudieron cargar cotizaciones:', err);
      } finally {
        setLoadingRates(false);
      }
    };
    cargarCotizaciones();
  }, [open]);

  // Reset al abrir/cambiar modo
  useEffect(() => {
    if (open) {
      setError(null);
      setConfirmDelete(false);
      setConfirmGuardar(false);
      setRecalculando(false);
      setMostrarOverrideCotiz(false);
      setCacOverride('');
      setDolarOverride('');
      setCacHistorial([]);
      setMostrarAdicional(drawerView === 'adicional');
      setActiveTab(TAB_MAP[drawerView] ?? 0);
      setAdicionalConcepto('');
      setAdicionalMonto('');
      setLoading(false);

      if (mode === 'crear') {
        setTipo(tipoDefault);
        setMonto('');
        setMoneda('ARS');
        setIndexacion(null);
        setBaseCalculo('total');
        setProveedorInput('');
        setProyectoSel(proyectoId || '');
        setCategoriaSel('');
        setSubcategoriaSel('');
        setEtapaSel('');
      } else if (mode === 'editar' && presupuesto) {
        setNuevoMonto(presupuesto.monto_ingresado || presupuesto.monto || '');
        setNuevaMoneda(presupuesto.moneda_display || presupuesto.moneda || 'ARS');
        setNuevaIndexacion(presupuesto.indexacion || null);
        setNuevaBaseCalculo(presupuesto.base_calculo || 'total');
        setMotivo('');
        setMostrarHistorial(drawerView === 'historial' || presupuesto.historial?.length > 0);
      }
    }
  }, [open, mode, tipoDefault, presupuesto, drawerView]);

  // === Handlers ===

  const handleCrear = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      setError('Ingresá un monto válido mayor a 0');
      return;
    }

    const proyectoFinal = showFullForm ? proyectoSel : proyectoId;
    if (showFullForm && !proyectoFinal) {
      setError('Seleccioná un proyecto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        empresa_id: empresaId,
        proyecto_id: proyectoFinal,
        tipo: tipo,
        monto: parseFloat(monto),
        moneda: moneda,
        indexacion: moneda === 'ARS' ? (indexacion || null) : null,
        base_calculo: baseCalculo || 'total',
      };

      // Si el usuario hizo override del índice, enviarlo al backend
      if (indexacion === 'CAC' && cacOverride) {
        data.cotizacion_override = { cac_indice: parseFloat(cacOverride) };
      } else if (indexacion === 'USD' && dolarOverride) {
        data.cotizacion_override = { dolar_blue: parseFloat(dolarOverride) };
      }

      if (showFullForm) {
        // Formulario completo: asignar campos opcionales
        if (proveedorInput) data.proveedor = proveedorInput;
        if (etapaSel) data.etapa = etapaSel;
        if (categoriaSel) data.categoria = categoriaSel;
        if (subcategoriaSel) data.subcategoria = subcategoriaSel;
      } else {
        // Formulario simplificado (control-presupuestos)
        if (tipoAgrupacion === 'categoria') data.categoria = valorAgrupacion;
        else if (tipoAgrupacion === 'etapa') data.etapa = valorAgrupacion;
        else if (tipoAgrupacion === 'proveedor') data.proveedor = valorAgrupacion || proveedorInput;

        if (!tipoAgrupacion && proveedorInput) {
          data.proveedor = proveedorInput;
        }
      }

      const result = await presupuestoService.crearPresupuesto(data);
      onSuccess?.('Presupuesto creado correctamente', result?.presupuesto);
      onClose();
    } catch (err) {
      console.error('Error al crear presupuesto:', err);
      setError('Error al crear presupuesto. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = async () => {
    if (!nuevoMonto || parseFloat(nuevoMonto) <= 0) {
      setError('Ingresá un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const editData = {
        nuevoMonto: parseFloat(nuevoMonto),
        motivo: motivo || 'Edición de monto',
        creadoPor: userId,
        nuevaMoneda: nuevaMoneda,
        nuevaIndexacion: nuevaMoneda === 'ARS' ? (nuevaIndexacion || null) : null,
        nuevaBaseCalculo: nuevaBaseCalculo || 'total',
      };

      // Si el usuario hizo override del índice, enviarlo al backend
      if (nuevaIndexacion === 'CAC' && cacOverride) {
        editData.cotizacion_override = { cac_indice: parseFloat(cacOverride) };
      } else if (nuevaIndexacion === 'USD' && dolarOverride) {
        editData.cotizacion_override = { dolar_blue: parseFloat(dolarOverride) };
      }

      await presupuestoService.editarPresupuesto(presupuesto.id, editData);
      onSuccess?.('Presupuesto editado correctamente');
      onClose();
    } catch (err) {
      console.error('Error al editar presupuesto:', err);
      setError('Error al editar presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await presupuestoService.eliminarPresupuestoPorId(presupuesto.id);
      onSuccess?.('Presupuesto eliminado correctamente');
      onClose();
    } catch (err) {
      console.error('Error al eliminar presupuesto:', err);
      setError('Error al eliminar presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarAdicional = async () => {
    if (!adicionalMonto || parseFloat(adicionalMonto) <= 0) {
      setError('Ingresá un monto válido para el adicional');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Si el presupuesto está indexado, convertir de pesos a la unidad de almacenamiento
      let montoFinal = parseFloat(adicionalMonto);
      if (presupuesto?.indexacion === 'CAC' && cacEfectivo) {
        montoFinal = parseFloat(adicionalMonto) / cacEfectivo;
      } else if (presupuesto?.indexacion === 'USD' && dolarEfectivo) {
        montoFinal = parseFloat(adicionalMonto) / dolarEfectivo;
      }

      await presupuestoService.agregarAdicional(presupuesto.id, {
        concepto: adicionalConcepto || 'Adicional',
        monto: montoFinal,
        creadoPor: userId,
      });
      setAdicionalConcepto('');
      setAdicionalMonto('');
      setMostrarAdicional(false);
      onSuccess?.('Adicional agregado correctamente');
      onClose();
    } catch (err) {
      console.error('Error al agregar adicional:', err);
      setError('Error al agregar adicional');
    } finally {
      setLoading(false);
    }
  };

  const formatMonto = (valor, mon) => {
    if (valor === null || valor === undefined) return '-';
    if (mon === 'USD') {
      return `USD ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (mon === 'CAC') {
      return `CAC ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrency(valor);
  };

  const formatFechaHistorial = (fecha) => {
    if (!fecha) return '-';
    if (fecha._seconds) return new Date(fecha._seconds * 1000).toLocaleDateString('es-AR');
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  // === Render ===

  const label = mode === 'editar' ? presupuesto?.label : valorAgrupacion;

  return (
    <>
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack>
            <Typography variant="h6">
              {mode === 'crear' ? 'Nuevo presupuesto' : label || 'Presupuesto'}
            </Typography>
            {mode === 'crear' ? (
              <Typography variant="body2" color="text.secondary">
                {tipo === 'ingreso' ? 'Cobros' : 'Gastos'}{label ? ` · ${label}` : ''}
              </Typography>
            ) : (
              label && (
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
              )
            )}
          </Stack>
          <IconButton onClick={onClose} disabled={recalculando}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {/* Banner de recalculando */}
        {recalculando && (
          <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
            <Alert severity="info" icon={<AutorenewIcon sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />}>
              <Typography variant="body2">
                Recalculando ejecutado… Esto puede tardar si hay muchos movimientos.
              </Typography>
              <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
            </Alert>
          </Box>
        )}

        {/* Body */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {mode === 'crear' && (
            <Stack spacing={3}>
              {/* Tipo */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  ¿Qué querés controlar?
                </Typography>
                <ToggleButtonGroup
                  value={tipo}
                  exclusive
                  onChange={(e, val) => val && setTipo(val)}
                  size="small"
                  fullWidth
                  color={tipo === 'ingreso' ? 'success' : 'error'}
                >
                  <ToggleButton value="egreso" sx={{ flex: 1 }}>
                    <Tooltip title="Controlá cuánto gastás vs lo presupuestado" arrow>
                      <span>💸 Gastos</span>
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="ingreso" sx={{ flex: 1 }}>
                    <Tooltip title="Controlá cuánto cobrás vs lo esperado" arrow>
                      <span>💰 Cobros</span>
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Monto + Moneda */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {tipo === 'ingreso' ? '¿Cuánto esperás cobrar?' : '¿Cuánto pensás gastar?'}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    type="number"
                    fullWidth
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder={tipo === 'ingreso' ? 'Ej: 10000000' : 'Ej: 5000000'}
                    autoFocus
                  />
                  <ToggleButtonGroup
                    value={moneda}
                    exclusive
                    onChange={(e, val) => {
                      if (!val) return;
                      setMoneda(val);
                      if (val === 'USD') setIndexacion(null);
                    }}
                    size="small"
                  >
                    <ToggleButton value="ARS">ARS</ToggleButton>
                    <ToggleButton value="USD">USD</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                {monto && parseFloat(monto) > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {moneda === 'USD' ? 'USD ' : '$'}
                    {Number(parseFloat(monto)).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    {moneda === 'ARS' ? ' ARS' : ''}
                    {indexacion === 'CAC' && ' indexados por CAC'}
                    {indexacion === 'USD' && ' indexados por dólar'}
                    {!indexacion && moneda === 'ARS' && ' sin indexar'}
                  </Typography>
                )}
              </Box>

              {/* Indexación (solo para ARS) */}
              {moneda === 'ARS' && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    ¿Querés protegerte de la inflación?
                  </Typography>
                  <ToggleButtonGroup
                    value={indexacion}
                    exclusive
                    onChange={(e, val) => setIndexacion(val)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value={null} sx={{ flex: 1 }}>
                      Pesos fijos
                    </ToggleButton>
                    <ToggleButton value="CAC" sx={{ flex: 1 }}>
                      <Tooltip title="Ajusta automáticamente por el índice de construcción (CAC)" arrow>
                        <span>Ajustar por CAC</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="USD" sx={{ flex: 1 }}>
                      <Tooltip title="Se guarda en dólares y se muestra al valor del día" arrow>
                        <span>Ajustar por dólar</span>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Preview de equivalencia */}
                  {indexacion && monto && parseFloat(monto) > 0 && (
                    <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {indexacion === 'CAC' && cacEfectivo ? (
                          <>Equivale a <strong>CAC {(parseFloat(monto) / cacEfectivo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (1 CAC = ${Number(cacEfectivo).toLocaleString('es-AR')}). Se ajusta automáticamente por inflación.</>
                        ) : indexacion === 'USD' && dolarEfectivo ? (
                          <>Equivale a <strong>USD {(parseFloat(monto) / dolarEfectivo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (1 USD = ${Number(dolarEfectivo).toLocaleString('es-AR')}). Se ajusta al valor del dólar.</>
                        ) : loadingRates ? (
                          <>Cargando cotizaciones...</>
                        ) : (
                          <>No se pudo obtener la cotización actual. Se guardará en pesos sin indexar.</>
                        )}
                      </Typography>
                    </Alert>
                  )}

                  {/* Override discreto de cotización */}
                  {indexacion && (
                    <Box sx={{ mt: 0.5 }}>
                      {!mostrarOverrideCotiz ? (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}
                          onClick={async () => {
                            setMostrarOverrideCotiz(true);
                            if (indexacion === 'CAC' && cacHistorial.length === 0) {
                              setLoadingHistorial(true);
                              try {
                                const data = await MonedasService.listarCAC({ limit: 12 });
                                setCacHistorial(data || []);
                              } catch (e) { console.warn(e); }
                              finally { setLoadingHistorial(false); }
                            }
                          }}
                        >
                          Usar otro índice…
                        </Typography>
                      ) : (
                        <Stack spacing={1} sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {indexacion === 'CAC' ? 'Índice CAC personalizado' : 'Dólar personalizado'}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                setMostrarOverrideCotiz(false);
                                setCacOverride('');
                                setDolarOverride('');
                              }}
                            >
                              Usar automático
                            </Typography>
                          </Stack>
                          {indexacion === 'CAC' ? (
                            <>
                              <Autocomplete
                                freeSolo
                                size="small"
                                options={cacHistorial}
                                loading={loadingHistorial}
                                getOptionLabel={(opt) =>
                                  typeof opt === 'string' ? opt
                                    : `${opt.fecha} — CAC ${Number(opt.general || opt.valor || 0).toLocaleString('es-AR')}`
                                }
                                inputValue={cacOverride}
                                onInputChange={(e, val, reason) => {
                                  if (reason === 'input') setCacOverride(val);
                                }}
                                onChange={(e, val) => {
                                  if (val && typeof val !== 'string') {
                                    setCacOverride(String(val.general || val.valor || ''));
                                  }
                                }}
                                renderInput={(params) => (
                                  <TextField {...params} placeholder="Ej: 1042.5" />
                                )}
                              />
                              {cacOverride && !isNaN(Number(cacOverride)) && (
                                <Typography variant="caption" color="text.secondary">
                                  Usando CAC = {Number(cacOverride).toLocaleString('es-AR')} en vez de {cacIndice ? Number(cacIndice).toLocaleString('es-AR') : '(no cargado)'}
                                </Typography>
                              )}
                            </>
                          ) : (
                            <>
                              <TextField
                                size="small"
                                type="number"
                                placeholder="Ej: 1250"
                                value={dolarOverride}
                                onChange={(e) => setDolarOverride(e.target.value)}
                              />
                              {dolarOverride && !isNaN(Number(dolarOverride)) && (
                                <Typography variant="caption" color="text.secondary">
                                  Usando USD = ${Number(dolarOverride).toLocaleString('es-AR')} en vez de ${dolarRate ? Number(dolarRate).toLocaleString('es-AR') : '(no cargado)'}
                                </Typography>
                              )}
                            </>
                          )}
                        </Stack>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {/* Base de cálculo */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  ¿Cómo comparás contra las facturas?
                </Typography>
                <ToggleButtonGroup
                  value={baseCalculo}
                  exclusive
                  onChange={(e, val) => val && setBaseCalculo(val)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="total" sx={{ flex: 1 }}>
                    <Tooltip title="Suma el total de cada factura (incluye impuestos)" arrow>
                      <span>Total (con imp.)</span>
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="subtotal" sx={{ flex: 1 }}>
                    <Tooltip title="Suma el subtotal neto de cada factura (sin impuestos)" arrow>
                      <span>Neto (sin imp.)</span>
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Proveedor (simplificado: solo si agrupación proveedor sin valor) */}
              {!showFullForm && tipoAgrupacion === 'proveedor' && !valorAgrupacion && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Proveedor
                  </Typography>
                  <Autocomplete
                    freeSolo
                    options={proveedoresEmpresa}
                    value={proveedorInput}
                    onChange={(e, val) => setProveedorInput(val || '')}
                    onInputChange={(e, val) => setProveedorInput(val || '')}
                    getOptionLabel={(option) => option || ''}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Buscar o crear proveedor..." />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StorefrontIcon fontSize="small" color="action" />
                          <Typography>{option}</Typography>
                        </Stack>
                      </li>
                    )}
                  />
                </Box>
              )}

              {/* Formulario completo (página presupuestos) */}
              {showFullForm && (
                <>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Proyecto <Typography component="span" color="error.main">*</Typography>
                    </Typography>
                    <FormControl fullWidth size="small" error={!proyectoSel} required>
                      <Select
                        value={proyectoSel}
                        onChange={(e) => setProyectoSel(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="" disabled><em>Seleccionar proyecto</em></MenuItem>
                        {proyectos.map(p => (
                          <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {tipo !== 'ingreso' && (
                    <>
                      <Divider />
                      <Typography variant="subtitle2" color="text.secondary">
                        Opcional: ¿querés filtrar el seguimiento?
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: -1.5 }}>
                        Asociá categoría, proveedor o etapa para un control más preciso
                      </Typography>

                      <FormControl fullWidth size="small">
                        <InputLabel>Categoría</InputLabel>
                        <Select
                          value={categoriaSel}
                          onChange={(e) => { setCategoriaSel(e.target.value); setSubcategoriaSel(''); }}
                          label="Categoría"
                        >
                          <MenuItem value=""><em>Sin categoría</em></MenuItem>
                          {categorias.map((cat, idx) => (
                            <MenuItem key={idx} value={cat.name}>{cat.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Proveedor
                        </Typography>
                        <Autocomplete
                          freeSolo
                          options={proveedoresEmpresa}
                          value={proveedorInput}
                          onChange={(e, val) => setProveedorInput(val || '')}
                          onInputChange={(e, val) => setProveedorInput(val || '')}
                          getOptionLabel={(option) => option || ''}
                          size="small"
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Buscar o crear proveedor..." />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <StorefrontIcon fontSize="small" color="action" />
                                <Typography>{option}</Typography>
                              </Stack>
                            </li>
                          )}
                        />
                      </Box>

                      <FormControl fullWidth size="small">
                        <InputLabel>Etapa</InputLabel>
                        <Select
                          value={etapaSel}
                          onChange={(e) => setEtapaSel(e.target.value)}
                          label="Etapa"
                        >
                          <MenuItem value=""><em>Sin etapa</em></MenuItem>
                          {etapas.map((et, idx) => (
                            <MenuItem key={idx} value={et}>{et}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" disabled={!categoriaSel}>
                        <InputLabel>Subcategoría</InputLabel>
                        <Select
                          value={subcategoriaSel}
                          onChange={(e) => setSubcategoriaSel(e.target.value)}
                          label="Subcategoría"
                        >
                          <MenuItem value=""><em>Sin subcategoría</em></MenuItem>
                          {(categorias.find(c => c.name === categoriaSel)?.subcategorias || []).map((sub, idx) => (
                            <MenuItem key={idx} value={sub}>{sub}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </>
                  )}
                </>
              )}

              {/* Preview */}
              {monto && parseFloat(monto) > 0 && (
                <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />}>
                  <Typography variant="body2">
                    Vas a controlar {tipo === 'ingreso' ? 'cobros' : 'gastos'} por{' '}
                    <strong>{formatMonto(parseFloat(monto), moneda)}</strong>
                    {indexacion && <> ajustado por {indexacion === 'CAC' ? 'inflación (CAC)' : 'dólar'}</>}
                    {baseCalculo === 'subtotal' && <> · comparando contra neto sin impuestos</>}
                    {showFullForm && proyectoSel && (
                      <> en <strong>{proyectos.find(p => p.id === proyectoSel)?.nombre}</strong></>
                    )}
                    {!showFullForm && label && <> para <strong>{label}</strong></>}
                    {proveedorInput && <> · proveedor: <strong>{proveedorInput}</strong></>}
                    {etapaSel && <> · etapa: <strong>{etapaSel}</strong></>}
                    {categoriaSel && <> · categoría: <strong>{categoriaSel}</strong></>}
                    {subcategoriaSel && <> / <strong>{subcategoriaSel}</strong></>}
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}

          {mode === 'editar' && presupuesto && (
            <Stack spacing={0} sx={{ flex: 1, minHeight: 0 }}>
              {/* Resumen compacto */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip
                      label={presupuesto.tipo === 'ingreso' ? '💰 Cobros' : '💸 Gastos'}
                      size="small"
                      color={presupuesto.tipo === 'ingreso' ? 'success' : 'error'}
                      variant="outlined"
                    />
                    {presupuesto.indexacion && (
                      <Chip label={`idx ${presupuesto.indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                    )}
                  </Stack>
                  {/* Métricas en fila */}
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">Presupuestado</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {presupuesto.indexacion ? (() => {
                          const cotiz = presupuesto.indexacion === 'CAC' ? cacEfectivo : dolarEfectivo;
                          if (cotiz && presupuesto.monto != null) return formatCurrency(presupuesto.monto * cotiz);
                          return formatMonto(presupuesto.monto_ingresado || presupuesto.monto, presupuesto.moneda_display || 'ARS');
                        })() : formatMonto(presupuesto.monto, presupuesto.moneda)}
                      </Typography>
                      {presupuesto.indexacion && (
                        <Typography variant="caption" color="text.secondary">
                          {presupuesto.indexacion === 'CAC'
                            ? `${Number(presupuesto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAC`
                            : `USD ${Number(presupuesto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          }
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{presupuesto.tipo === 'ingreso' ? 'Cobrado' : 'Ejecutado'}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {presupuesto.indexacion ? (() => {
                          const cotiz = presupuesto.indexacion === 'CAC' ? cacEfectivo : dolarEfectivo;
                          if (cotiz && presupuesto.ejecutado != null) return formatCurrency(presupuesto.ejecutado * cotiz);
                          return formatMonto(presupuesto.ejecutado, presupuesto.moneda);
                        })() : formatMonto(presupuesto.ejecutado, presupuesto.moneda)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">Avance</Typography>
                      <Typography variant="body2" fontWeight={600} color={
                        presupuesto.monto > 0 && (presupuesto.ejecutado / presupuesto.monto) > 1 ? 'error.main' : 'text.primary'
                      }>
                        {presupuesto.monto > 0 ? `${((presupuesto.ejecutado / presupuesto.monto) * 100).toFixed(1)}%` : '0%'}
                      </Typography>
                    </Box>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(presupuesto.monto > 0 ? (presupuesto.ejecutado / presupuesto.monto) * 100 : 0, 100)}
                    sx={{ height: 5, borderRadius: 3 }}
                    color={presupuesto.ejecutado > presupuesto.monto ? 'error' : 'primary'}
                  />
                  {(proyectoId || presupuesto.proyecto_id) && presupuesto.ejecutado > 0 && (
                    <Link
                      href={(() => {
                        const params = new URLSearchParams();
                        params.set('proyectoId', proyectoId || presupuesto.proyecto_id);
                        if (presupuesto.tipo) params.set('tipo', presupuesto.tipo);
                        if (presupuesto.proveedor) params.set('proveedores', presupuesto.proveedor);
                        if (presupuesto.categoria) params.set('categorias', presupuesto.categoria);
                        if (presupuesto.subcategoria) params.set('subcategorias', presupuesto.subcategoria);
                        if (presupuesto.etapa) params.set('etapa', presupuesto.etapa);
                        return `/cajaProyecto?${params.toString()}`;
                      })()}
                      passHref
                      legacyBehavior
                    >
                      <Typography
                        component="a"
                        variant="caption"
                        color="primary"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        Ver movimientos <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Typography>
                    </Link>
                  )}
                </Stack>
              </Box>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onChange={(e, v) => {
                  setActiveTab(v);
                  if (v === 1) setMostrarAdicional(true);
                }}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontSize: '0.85rem' } }}
              >
                <Tab icon={<EditIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Editar" />
                <Tab icon={<AddCircleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Adicional" />
                <Tab
                  icon={<HistoryIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label={`Historial${presupuesto.historial?.length ? ` (${presupuesto.historial.length})` : ''}`}
                />
              </Tabs>

              {/* ── TAB 0: Editar ── */}
              {activeTab === 0 && (
                <Stack spacing={2.5} sx={{ p: 2 }}>
                  {/* Monto */}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Nuevo monto {nuevaIndexacion ? '(ingresá en pesos, se va a indexar)' : ''}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        type="number"
                        fullWidth
                        value={nuevoMonto}
                        onChange={(e) => setNuevoMonto(e.target.value)}
                        autoFocus
                      />
                      <ToggleButtonGroup
                        value={nuevaMoneda}
                        exclusive
                        onChange={(e, val) => {
                          if (!val) return;
                          setNuevaMoneda(val);
                          if (val === 'USD') setNuevaIndexacion(null);
                        }}
                        size="small"
                      >
                        <ToggleButton value="ARS">ARS</ToggleButton>
                        <ToggleButton value="USD">USD</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>
                    {nuevoMonto && parseFloat(nuevoMonto) > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {nuevaMoneda === 'USD' ? 'USD ' : '$'}
                        {Number(parseFloat(nuevoMonto)).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        {nuevaMoneda === 'ARS' ? ' ARS' : ''}
                        {nuevaIndexacion === 'CAC' && ' indexados por CAC'}
                        {nuevaIndexacion === 'USD' && ' indexados por dólar'}
                        {!nuevaIndexacion && nuevaMoneda === 'ARS' && ' sin indexar'}
                      </Typography>
                    )}
                  </Box>

                  {/* Indexación (solo para ARS) */}
                  {nuevaMoneda === 'ARS' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        Protección contra inflación
                      </Typography>
                      <ToggleButtonGroup
                        value={nuevaIndexacion}
                        exclusive
                        onChange={(e, val) => setNuevaIndexacion(val)}
                        size="small"
                        fullWidth
                      >
                        <ToggleButton value={null} sx={{ flex: 1, fontSize: '0.75rem' }}>Pesos fijos</ToggleButton>
                        <ToggleButton value="CAC" sx={{ flex: 1, fontSize: '0.75rem' }}>Ajustar por CAC</ToggleButton>
                        <ToggleButton value="USD" sx={{ flex: 1, fontSize: '0.75rem' }}>Ajustar por dólar</ToggleButton>
                      </ToggleButtonGroup>
                      {nuevaIndexacion && nuevoMonto && parseFloat(nuevoMonto) > 0 && (
                        <Alert
                          severity="info"
                          variant="outlined"
                          icon={<InfoOutlinedIcon fontSize="small" />}
                          sx={{ mt: 1, py: 0.5 }}
                          action={
                            <IconButton
                              size="small"
                              onClick={async () => {
                                setMostrarOverrideCotiz(!mostrarOverrideCotiz);
                                if (!mostrarOverrideCotiz) {
                                  if (nuevaIndexacion === 'USD' && dolarRate && !dolarOverride) {
                                    setDolarOverride(String(dolarRate));
                                  }
                                  if (nuevaIndexacion === 'CAC' && cacHistorial.length === 0) {
                                    setLoadingHistorial(true);
                                    try {
                                      const data = await MonedasService.listarCAC({ limit: 12 });
                                      setCacHistorial(data || []);
                                    } catch (e) { console.warn(e); }
                                    finally { setLoadingHistorial(false); }
                                  }
                                }
                              }}
                              sx={{ color: mostrarOverrideCotiz ? 'primary.main' : 'action.active' }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          }
                        >
                          <Typography variant="caption">
                            {nuevaIndexacion === 'CAC' && cacEfectivo ? (
                              <>Equivale a <strong>CAC {(parseFloat(nuevoMonto) / cacEfectivo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>
                            ) : nuevaIndexacion === 'USD' && dolarEfectivo ? (
                              <>Equivale a <strong>USD {(parseFloat(nuevoMonto) / dolarEfectivo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>
                            ) : loadingRates ? 'Cargando cotizaciones...' : 'No se pudo obtener cotización'}
                          </Typography>
                        </Alert>
                      )}
                      {/* Override de cotización */}
                      {nuevaIndexacion && mostrarOverrideCotiz && (
                        <Stack spacing={1} sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {nuevaIndexacion === 'CAC' ? 'Índice CAC personalizado' : 'Dólar personalizado'}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => { setMostrarOverrideCotiz(false); setCacOverride(''); setDolarOverride(''); }}
                            >
                              Usar automático
                            </Typography>
                          </Stack>
                          {nuevaIndexacion === 'CAC' ? (
                            <>
                              <Autocomplete
                                freeSolo
                                size="small"
                                options={cacHistorial}
                                loading={loadingHistorial}
                                getOptionLabel={(opt) =>
                                  typeof opt === 'string' ? opt
                                    : `${opt.fecha} — CAC ${Number(opt.general || opt.valor || 0).toLocaleString('es-AR')}`
                                }
                                inputValue={cacOverride}
                                onInputChange={(e, val, reason) => { if (reason === 'input') setCacOverride(val); }}
                                onChange={(e, val) => { if (val && typeof val !== 'string') setCacOverride(String(val.general || val.valor || '')); }}
                                renderInput={(params) => <TextField {...params} placeholder="Ej: 1042.5" />}
                              />
                              {cacOverride && !isNaN(Number(cacOverride)) && (
                                <Typography variant="caption" color="text.secondary">
                                  Usando CAC = {Number(cacOverride).toLocaleString('es-AR')} en vez de {cacIndice ? Number(cacIndice).toLocaleString('es-AR') : '(no cargado)'}
                                </Typography>
                              )}
                            </>
                          ) : (
                            <>
                              <TextField size="small" type="number" placeholder="Ej: 1250" value={dolarOverride} onChange={(e) => setDolarOverride(e.target.value)} />
                              {dolarOverride && !isNaN(Number(dolarOverride)) && (
                                <Typography variant="caption" color="text.secondary">
                                  Usando USD = ${Number(dolarOverride).toLocaleString('es-AR')} en vez de ${dolarRate ? Number(dolarRate).toLocaleString('es-AR') : '(no cargado)'}
                                </Typography>
                              )}
                            </>
                          )}
                        </Stack>
                      )}
                    </Box>
                  )}

                  {/* Base de cálculo */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                      Comparar contra facturas
                    </Typography>
                    <ToggleButtonGroup
                      value={nuevaBaseCalculo}
                      exclusive
                      onChange={(e, val) => val && setNuevaBaseCalculo(val)}
                      size="small"
                      fullWidth
                    >
                      <ToggleButton value="total" sx={{ flex: 1, fontSize: '0.75rem' }}>
                        <Tooltip title="Suma el total de cada factura (incluye impuestos)" arrow>
                          <span>Total (con imp.)</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value="subtotal" sx={{ flex: 1, fontSize: '0.75rem' }}>
                        <Tooltip title="Suma el subtotal neto de cada factura (sin impuestos)" arrow>
                          <span>Neto (sin imp.)</span>
                        </Tooltip>
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Stack>
              )}

              {/* ── TAB 1: Adicional ── */}
              {activeTab === 1 && (
                <Stack spacing={2} sx={{ p: 2 }}>
                  {/* Adicionales previos */}
                  {presupuesto?.adicionales?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        Adicionales previos ({presupuesto.adicionales.length})
                      </Typography>
                      <Stack spacing={0.5}>
                        {presupuesto.adicionales.map((adic, idx) => (
                          <Stack
                            key={idx}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ px: 1.5, py: 0.75, bgcolor: 'grey.50', borderRadius: 1 }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                              <Chip label="Adic." size="small" color="primary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                {adic.concepto || 'Adicional'}
                              </Typography>
                            </Stack>
                            <Stack alignItems="flex-end" sx={{ ml: 1, flexShrink: 0 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {presupuesto.indexacion
                                  ? `${presupuesto.indexacion === 'CAC' ? 'CAC' : 'USD'} ${Number(adic.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : formatMonto(adic.monto, presupuesto.moneda)
                                }
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatFechaHistorial(adic.fecha)}
                              </Typography>
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Divider />

                  {/* Formulario nuevo adicional */}
                  <Typography variant="subtitle2" color="text.secondary">Nuevo adicional</Typography>
                  <TextField
                    label="Concepto"
                    fullWidth
                    size="small"
                    value={adicionalConcepto}
                    onChange={(e) => setAdicionalConcepto(e.target.value)}
                    placeholder="Ej: Adicional por cambio de materiales"
                  />
                  <TextField
                    label={presupuesto?.indexacion ? `Monto del adicional (en pesos, se convertirá)` : 'Monto del adicional'}
                    type="number"
                    fullWidth
                    size="small"
                    value={adicionalMonto}
                    onChange={(e) => setAdicionalMonto(e.target.value)}
                  />
                  {presupuesto?.indexacion && adicionalMonto && parseFloat(adicionalMonto) > 0 && (() => {
                    const cotiz = presupuesto.indexacion === 'CAC' ? cacEfectivo : dolarEfectivo;
                    const unidad = presupuesto.indexacion === 'CAC' ? 'CAC' : 'USD';
                    if (!cotiz) return null;
                    const convertido = parseFloat(adicionalMonto) / cotiz;
                    return (
                      <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ py: 0.5 }}>
                        <Typography variant="caption">
                          ${Number(parseFloat(adicionalMonto)).toLocaleString('es-AR')} ARS ÷ {Number(cotiz).toLocaleString('es-AR')} = <strong>{convertido.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {unidad}</strong> que se sumarán
                        </Typography>
                      </Alert>
                    );
                  })()}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAgregarAdicional}
                    disabled={loading || !adicionalMonto}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddCircleIcon />}
                  >
                    {loading ? 'Agregando...' : 'Confirmar adicional'}
                  </Button>
                </Stack>
              )}

              {/* ── TAB 2: Historial ── */}
              {activeTab === 2 && (
                <Box sx={{ p: 2 }}>
                  {presupuesto.historial?.length > 0 ? (() => {
                    const isIndexed = !!presupuesto.indexacion;
                    const idxLabel = presupuesto.indexacion === 'CAC' ? 'CAC' : presupuesto.indexacion === 'USD' ? 'USD' : null;
                    const rate = presupuesto.indexacion === 'CAC' ? cacEfectivo : presupuesto.indexacion === 'USD' ? dolarEfectivo : null;
                    // Moneda de almacenamiento real (para adicionales que no traen monedaAnterior/monedaNueva)
                    const storageMoneda = isIndexed ? idxLabel : (presupuesto.moneda || 'ARS');

                    const sorted = [...presupuesto.historial].sort((a, b) => {
                      const fa = a.fecha?._seconds ? a.fecha._seconds * 1000 : new Date(a.fecha).getTime();
                      const fb = b.fecha?._seconds ? b.fecha._seconds * 1000 : new Date(b.fecha).getTime();
                      return fb - fa;
                    });

                    const cellSx = { px: 1, py: 0.5, fontSize: '0.75rem', lineHeight: 1.3 };
                    const subCellSx = { ...cellSx, pt: 0, pb: 0.75, fontSize: '0.68rem', color: 'text.secondary', borderBottom: 1, borderColor: 'divider' };

                    return (
                      <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { px: 1, py: 0.75, fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' } }}>
                              <TableCell>Mov.</TableCell>
                              <TableCell align="right">Anterior</TableCell>
                              <TableCell align="right">Nuevo</TableCell>
                              <TableCell align="right">Diferencia</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sorted.map((item, idx) => {
                              const monAnt = item.monedaAnterior || storageMoneda;
                              const monNue = item.monedaNueva || storageMoneda;
                              const diff = item.tipo === 'adicional'
                                ? (item.monto || 0)
                                : (item.diferencia != null ? item.diferencia : ((item.montoNuevo || 0) - (item.montoAnterior || 0)));

                              return (
                                <Fragment key={idx}>
                                  {/* Fila principal – moneda de almacenamiento */}
                                  <TableRow sx={{ '& td': { ...cellSx, borderBottom: (isIndexed && rate) || (item.motivo || item.concepto) ? 0 : undefined } }}>
                                    <TableCell>
                                      <Chip
                                        label={item.tipo === 'adicional' ? 'Adic.' : 'Edit.'}
                                        size="small"
                                        color={item.tipo === 'adicional' ? 'primary' : 'secondary'}
                                        variant="outlined"
                                        sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
                                      />
                                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.68rem' }}>
                                        {formatFechaHistorial(item.fecha)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      {formatMonto(item.montoAnterior, monAnt)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                      {formatMonto(item.montoNuevo, monNue)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: diff >= 0 ? 'success.main' : 'error.main' }}>
                                      {diff >= 0 ? '+' : ''}{formatMonto(diff, storageMoneda)}
                                    </TableCell>
                                  </TableRow>

                                  {/* Sub-fila – equivalente ARS (solo si está indexado) */}
                                  {isIndexed && rate ? (
                                    <TableRow sx={{ '& td': { ...subCellSx, borderBottom: (item.motivo || item.concepto) ? 0 : undefined } }}>
                                      <TableCell sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>≈ ARS</TableCell>
                                      <TableCell align="right">
                                        {formatCurrency((item.montoAnterior || 0) * rate)}
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatCurrency((item.montoNuevo || 0) * rate)}
                                      </TableCell>
                                      <TableCell align="right" sx={{ color: diff >= 0 ? 'success.main' : 'error.main' }}>
                                        {diff >= 0 ? '+' : ''}{formatCurrency(Math.abs(diff) * rate)}
                                      </TableCell>
                                    </TableRow>
                                  ) : null}

                                  {/* Sub-fila – motivo/concepto */}
                                  {(item.motivo || item.concepto) ? (
                                    <TableRow>
                                      <TableCell colSpan={4} sx={{ ...cellSx, pt: 0, fontStyle: 'italic', color: 'text.secondary', fontSize: '0.68rem' }}>
                                        💬 {item.motivo || item.concepto}
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    );
                  })() : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <HistoryIcon sx={{ fontSize: 40, color: 'grey.300', mb: 1 }} />
                      <Typography color="text.secondary" variant="body2">Sin cambios registrados</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {mode === 'crear' && (
            <Button
              variant="contained"
              fullWidth
              onClick={handleCrear}
              disabled={loading || !monto || parseFloat(monto) <= 0 || (showFullForm && !proyectoSel)}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? 'Creando...' : tipo === 'ingreso' ? 'Crear control de cobros' : 'Crear control de gastos'}
            </Button>
          )}

          {mode === 'editar' && activeTab === 0 && (
            <Stack spacing={1}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => { setMotivo(''); setConfirmGuardar(true); }}
                disabled={loading || !nuevoMonto || parseFloat(nuevoMonto) <= 0}
              >
                Guardar cambios
              </Button>
              <Stack direction="row" spacing={1}>
                {onRecalcular && (
                  <Button
                    color="info"
                    fullWidth
                    onClick={async () => {
                      setRecalculando(true);
                      setError(null);
                      try {
                        await onRecalcular(presupuesto.id);
                      } catch (err) {
                        console.error('Error al recalcular:', err);
                        setError('Error al recalcular presupuesto');
                      } finally {
                        setRecalculando(false);
                        onClose();
                      }
                    }}
                    disabled={loading || recalculando}
                    variant="outlined"
                    startIcon={recalculando ? <CircularProgress size={16} color="inherit" /> : <AutorenewIcon />}
                  >
                    {recalculando ? 'Recalculando…' : 'Recalcular'}
                  </Button>
                )}
                <Button
                  color="error"
                  fullWidth
                  onClick={handleEliminar}
                  disabled={loading}
                  variant={confirmDelete ? 'contained' : 'text'}
                  startIcon={<DeleteIcon />}
                >
                  {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
                </Button>
              </Stack>
              {confirmDelete && (
                <Button
                  size="small"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>

    {/* Dialog de confirmación para guardar */}
    <Dialog open={confirmGuardar} onClose={() => setConfirmGuardar(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Motivo del cambio</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Ajuste por inflación, cambio de alcance..."
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmGuardar(false)}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => { setConfirmGuardar(false); handleEditar(); }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Guardando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default PresupuestoDrawer;
