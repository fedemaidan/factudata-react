import { useState, useEffect } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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

  // === Estado: UI ===
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      setRecalculando(false);
      setMostrarOverrideCotiz(false);
      setCacOverride('');
      setDolarOverride('');
      setCacHistorial([]);
      setMostrarAdicional(false);
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
        setMostrarHistorial(presupuesto.historial?.length > 0);
      }
    }
  }, [open, mode, tipoDefault, presupuesto]);

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
        // Formulario simplificado (controlProyecto)
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
      await presupuestoService.agregarAdicional(presupuesto.id, {
        concepto: adicionalConcepto || 'Adicional',
        monto: parseFloat(adicionalMonto),
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
              {mode === 'crear' ? 'Nuevo presupuesto' : 'Editar presupuesto'}
            </Typography>
            {label && (
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
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
            <Stack spacing={3}>
              {/* Resumen actual */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Controlás</Typography>
                    <Chip
                      label={presupuesto.tipo === 'ingreso' ? '💰 Cobros' : '💸 Gastos'}
                      size="small"
                      color={presupuesto.tipo === 'ingreso' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="body2" color="text.secondary">Presupuestado</Typography>
                    <Stack alignItems="flex-end">
                      {presupuesto.indexacion ? (
                        <>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              {(() => {
                                // Mostrar en pesos al valor de hoy
                                const cotiz = presupuesto.indexacion === 'CAC' ? cacEfectivo : dolarEfectivo;
                                if (cotiz && presupuesto.monto != null) {
                                  const enPesos = presupuesto.monto * cotiz;
                                  return formatCurrency(enPesos);
                                }
                                return formatMonto(presupuesto.monto_ingresado || presupuesto.monto, presupuesto.moneda_display || 'ARS');
                              })()}
                            </Typography>
                            <Chip label={`idx ${presupuesto.indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {presupuesto.indexacion === 'CAC'
                              ? `${Number(presupuesto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unidades CAC`
                              : `USD ${Number(presupuesto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" fontWeight={600}>
                          {formatMonto(presupuesto.monto, presupuesto.moneda)}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                  {presupuesto.indexacion && presupuesto.cotizacion_snapshot && (
                    <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        {presupuesto.indexacion === 'CAC' ? (
                          <>Indexado por CAC. Almacenado: <strong>CAC {Number(presupuesto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (índice al crear: {presupuesto.cotizacion_snapshot.cac_indice})</>
                        ) : (
                          <>Indexado por USD. Almacenado: <strong>USD {Number(presupuesto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (dólar al crear: ${Number(presupuesto.cotizacion_snapshot.dolar_blue).toLocaleString('es-AR')})</>
                        )}
                      </Typography>
                    </Alert>
                  )}
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Compara contra</Typography>
                    <Chip
                      label={presupuesto.base_calculo === 'subtotal' ? 'Neto (sin imp.)' : 'Total (con imp.)'}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  </Stack>
                  {presupuesto.ejecutado !== undefined && (
                    <>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="body2" color="text.secondary">
                          {presupuesto.tipo === 'ingreso' ? 'Cobrado' : 'Ejecutado'}
                        </Typography>
                        <Stack alignItems="flex-end">
                          {presupuesto.indexacion ? (
                            <>
                              <Typography variant="body2" fontWeight={600}>
                                {(() => {
                                  // Mostrar en pesos (la unidad que el usuario entiende)
                                  const cotiz = presupuesto.indexacion === 'CAC' ? cacEfectivo : dolarEfectivo;
                                  if (cotiz && presupuesto.ejecutado != null) {
                                    const enPesos = presupuesto.ejecutado * cotiz;
                                    return formatCurrency(enPesos);
                                  }
                                  return formatMonto(presupuesto.ejecutado, presupuesto.moneda);
                                })()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {presupuesto.indexacion === 'CAC'
                                  ? `${Number(presupuesto.ejecutado).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unidades CAC`
                                  : `USD ${Number(presupuesto.ejecutado).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                }
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" fontWeight={600}>
                              {formatMonto(presupuesto.ejecutado, presupuesto.moneda)}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(presupuesto.monto > 0 ? (presupuesto.ejecutado / presupuesto.monto) * 100 : 0, 100)}
                        sx={{ height: 6, borderRadius: 3 }}
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
                    </>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Editar monto */}
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
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    ¿Querés protegerte de la inflación?
                  </Typography>
                  <ToggleButtonGroup
                    value={nuevaIndexacion}
                    exclusive
                    onChange={(e, val) => setNuevaIndexacion(val)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value={null} sx={{ flex: 1 }}>Pesos fijos</ToggleButton>
                    <ToggleButton value="CAC" sx={{ flex: 1 }}>Ajustar por CAC</ToggleButton>
                    <ToggleButton value="USD" sx={{ flex: 1 }}>Ajustar por dólar</ToggleButton>
                  </ToggleButtonGroup>

                  {nuevaIndexacion && nuevoMonto && parseFloat(nuevoMonto) > 0 && (
                    <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {nuevaIndexacion === 'CAC' && cacEfectivo ? (
                          <>Equivale a <strong>CAC {(parseFloat(nuevoMonto) / cacEfectivo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>
                        ) : nuevaIndexacion === 'USD' && dolarEfectivo ? (
                          <>Equivale a <strong>USD {(parseFloat(nuevoMonto) / dolarEfectivo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>
                        ) : loadingRates ? 'Cargando cotizaciones...' : 'No se pudo obtener cotización'}
                      </Typography>
                    </Alert>
                  )}

                  {/* Override discreto de cotización */}
                  {nuevaIndexacion && (
                    <Box sx={{ mt: 0.5 }}>
                      {!mostrarOverrideCotiz ? (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}
                          onClick={async () => {
                            setMostrarOverrideCotiz(true);
                            if (nuevaIndexacion === 'CAC' && cacHistorial.length === 0) {
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
                              {nuevaIndexacion === 'CAC' ? 'Índice CAC personalizado' : 'Dólar personalizado'}
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
                  value={nuevaBaseCalculo}
                  exclusive
                  onChange={(e, val) => val && setNuevaBaseCalculo(val)}
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

              <TextField
                label="Motivo del cambio"
                fullWidth
                multiline
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Ajuste por inflación, cambio de alcance, etc."
              />

              <Divider />

              {/* Adicional */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    Adicional
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddCircleIcon />}
                    onClick={() => setMostrarAdicional(!mostrarAdicional)}
                  >
                    {mostrarAdicional ? 'Cancelar' : 'Agregar adicional'}
                  </Button>
                </Stack>

                {mostrarAdicional && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                      label="Concepto"
                      fullWidth
                      size="small"
                      value={adicionalConcepto}
                      onChange={(e) => setAdicionalConcepto(e.target.value)}
                      placeholder="Ej: Adicional por cambio de materiales"
                    />
                    <TextField
                      label="Monto del adicional"
                      type="number"
                      fullWidth
                      size="small"
                      value={adicionalMonto}
                      onChange={(e) => setAdicionalMonto(e.target.value)}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAgregarAdicional}
                      disabled={loading || !adicionalMonto}
                    >
                      Confirmar adicional
                    </Button>
                  </Stack>
                )}
              </Box>

              {/* Historial */}
              {presupuesto.historial?.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      onClick={() => setMostrarHistorial(!mostrarHistorial)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <HistoryIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Historial de cambios
                        </Typography>
                        <Chip label={presupuesto.historial.length} size="small" color="info" variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="primary">
                        {mostrarHistorial ? 'Ocultar' : 'Ver'}
                      </Typography>
                    </Stack>

                    {mostrarHistorial && (
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell align="right">Anterior</TableCell>
                            <TableCell align="right">Nuevo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {presupuesto.historial
                            .sort((a, b) => {
                              const fa = a.fecha?._seconds ? a.fecha._seconds * 1000 : new Date(a.fecha).getTime();
                              const fb = b.fecha?._seconds ? b.fecha._seconds * 1000 : new Date(b.fecha).getTime();
                              return fb - fa;
                            })
                            .map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  {formatFechaHistorial(item.fecha)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={item.tipo === 'adicional' ? 'Adic.' : 'Edición'}
                                    size="small"
                                    color={item.tipo === 'adicional' ? 'primary' : 'secondary'}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  {formatMonto(item.montoAnterior, item.monedaAnterior)}
                                </TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  {formatMonto(item.montoNuevo, item.monedaNueva)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </>
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

          {mode === 'editar' && (
            <Stack spacing={1}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleEditar}
                disabled={loading || !nuevoMonto || parseFloat(nuevoMonto) <= 0}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
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
  );
};

export default PresupuestoDrawer;
