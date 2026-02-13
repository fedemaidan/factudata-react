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

  // === Estado: Indexación ===
  const [indexacion, setIndexacion] = useState(null); // null | 'CAC' | 'USD'
  const [nuevaIndexacion, setNuevaIndexacion] = useState(null);
  const [dolarRate, setDolarRate] = useState(null);
  const [cacIndice, setCacIndice] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);

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
      await presupuestoService.editarPresupuesto(presupuesto.id, {
        nuevoMonto: parseFloat(nuevoMonto),
        motivo: motivo || 'Edición de monto',
        creadoPor: userId,
        nuevaMoneda: nuevaMoneda,
        nuevaIndexacion: nuevaMoneda === 'ARS' ? (nuevaIndexacion || null) : null,
        nuevaBaseCalculo: nuevaBaseCalculo || 'total',
      });
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
              {mode === 'crear' ? 'Crear Presupuesto' : 'Editar Presupuesto'}
            </Typography>
            {label && (
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            )}
          </Stack>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

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
                  Tipo de presupuesto
                </Typography>
                <ToggleButtonGroup
                  value={tipo}
                  exclusive
                  onChange={(e, val) => val && setTipo(val)}
                  size="small"
                  fullWidth
                  color={tipo === 'ingreso' ? 'success' : 'error'}
                >
                  <ToggleButton value="egreso" sx={{ flex: 1 }}>Egreso</ToggleButton>
                  <ToggleButton value="ingreso" sx={{ flex: 1 }}>Ingreso</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Monto + Moneda */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Monto
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    type="number"
                    fullWidth
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Ej: 5000000"
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
              </Box>

              {/* Indexación (solo para ARS) */}
              {moneda === 'ARS' && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Indexación
                  </Typography>
                  <ToggleButtonGroup
                    value={indexacion}
                    exclusive
                    onChange={(e, val) => setIndexacion(val)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value={null} sx={{ flex: 1 }}>
                      Sin indexar
                    </ToggleButton>
                    <ToggleButton value="CAC" sx={{ flex: 1 }}>
                      <Tooltip title="Índice CAC (construcción) — se ajusta por inflación" arrow>
                        <span>Indexar CAC</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="USD" sx={{ flex: 1 }}>
                      <Tooltip title="Se guarda en USD y se muestra en pesos al valor actual" arrow>
                        <span>Indexar USD</span>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Preview de equivalencia */}
                  {indexacion && monto && parseFloat(monto) > 0 && (
                    <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {indexacion === 'CAC' && cacIndice ? (
                          <>Equivale a <strong>CAC {(parseFloat(monto) / cacIndice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (1 CAC = ${Number(cacIndice).toLocaleString('es-AR')}). Se ajusta automáticamente por inflación.</>
                        ) : indexacion === 'USD' && dolarRate ? (
                          <>Equivale a <strong>USD {(parseFloat(monto) / dolarRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (1 USD = ${Number(dolarRate).toLocaleString('es-AR')}). Se ajusta al valor del dólar.</>
                        ) : loadingRates ? (
                          <>Cargando cotizaciones...</>
                        ) : (
                          <>No se pudo obtener la cotización actual. Se guardará en pesos sin indexar.</>
                        )}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}

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

                  <Divider />
                  <Typography variant="subtitle2" color="text.secondary">
                    Información adicional (opcional)
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

              {/* Base de cálculo */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Base de cálculo
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

              {/* Preview */}
              {monto && parseFloat(monto) > 0 && (
                <Alert severity="info" variant="outlined">
                  <Typography variant="body2">
                    {tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de{' '}
                    <strong>{formatMonto(parseFloat(monto), moneda)}</strong>
                    {indexacion && <> (indexado {indexacion})</>}
                    {baseCalculo === 'subtotal' && <> · base neta</>}
                    {showFullForm && proyectoSel && (
                      <> en <strong>{proyectos.find(p => p.id === proyectoSel)?.nombre}</strong></>
                    )}
                    {!showFullForm && label && <> para <strong>{label}</strong></>}
                    {proveedorInput && <>, proveedor: <strong>{proveedorInput}</strong></>}
                    {etapaSel && <>, etapa: <strong>{etapaSel}</strong></>}
                    {categoriaSel && <>, categoría: <strong>{categoriaSel}</strong></>}
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
                    <Typography variant="body2" color="text.secondary">Tipo</Typography>
                    <Chip
                      label={presupuesto.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      size="small"
                      color={presupuesto.tipo === 'ingreso' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Monto actual</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {presupuesto.indexacion ? (
                        <>
                          <Typography variant="body2" fontWeight={600}>
                            {formatMonto(presupuesto.monto_ingresado || presupuesto.monto, presupuesto.moneda_display || 'ARS')}
                          </Typography>
                          <Chip label={`idx ${presupuesto.indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
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
                    <Typography variant="body2" color="text.secondary">Base de cálculo</Typography>
                    <Chip
                      label={presupuesto.base_calculo === 'subtotal' ? 'Neto (sin imp.)' : 'Total (con imp.)'}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  </Stack>
                  {presupuesto.ejecutado !== undefined && (
                    <>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          {presupuesto.tipo === 'ingreso' ? 'Cobrado' : 'Ejecutado'}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatMonto(presupuesto.ejecutado, presupuesto.moneda)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(presupuesto.monto > 0 ? (presupuesto.ejecutado / presupuesto.monto) * 100 : 0, 100)}
                        sx={{ height: 6, borderRadius: 3 }}
                        color={presupuesto.ejecutado > presupuesto.monto ? 'error' : 'primary'}
                      />
                    </>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Editar monto */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Nuevo monto {nuevaIndexacion ? '(en pesos, se indexará)' : ''}
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
              </Box>

              {/* Indexación (solo para ARS) */}
              {nuevaMoneda === 'ARS' && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Indexación
                  </Typography>
                  <ToggleButtonGroup
                    value={nuevaIndexacion}
                    exclusive
                    onChange={(e, val) => setNuevaIndexacion(val)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value={null} sx={{ flex: 1 }}>Sin indexar</ToggleButton>
                    <ToggleButton value="CAC" sx={{ flex: 1 }}>Indexar CAC</ToggleButton>
                    <ToggleButton value="USD" sx={{ flex: 1 }}>Indexar USD</ToggleButton>
                  </ToggleButtonGroup>

                  {nuevaIndexacion && nuevoMonto && parseFloat(nuevoMonto) > 0 && (
                    <Alert severity="info" variant="outlined" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {nuevaIndexacion === 'CAC' && cacIndice ? (
                          <>Equivale a <strong>CAC {(parseFloat(nuevoMonto) / cacIndice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>
                        ) : nuevaIndexacion === 'USD' && dolarRate ? (
                          <>Equivale a <strong>USD {(parseFloat(nuevoMonto) / dolarRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></>
                        ) : loadingRates ? 'Cargando cotizaciones...' : 'No se pudo obtener cotización'}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Base de cálculo */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Base de cálculo
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
              {loading ? 'Creando...' : 'Crear Presupuesto'}
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
                    onClick={() => { onRecalcular(presupuesto.id); onClose(); }}
                    disabled={loading}
                    variant="outlined"
                    startIcon={<AutorenewIcon />}
                  >
                    Recalcular
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
