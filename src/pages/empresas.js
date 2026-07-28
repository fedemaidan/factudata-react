import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import BusinessIcon from '@mui/icons-material/Business';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import ConstructionIcon from '@mui/icons-material/Construction';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Stepper, Step, StepLabel } from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { getAllEmpresas, deleteEmpresa, getInfoToDeleteEmpresa, crearEmpresa, updateEmpresaDetails } from 'src/services/empresaService';
import { getProyectosByEmpresaId, crearProyecto } from 'src/services/proyectosService';
import profileService from 'src/services/profileService';
import sucursalService from 'src/services/sucursalService';
import clienteService from 'src/services/clienteService';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';
import * as XLSX from 'xlsx';
import { normalizePhone, isValidEmail } from 'src/utils/phone';
import { CORRALON_ACCIONES } from 'src/constants/accionesCorralon';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

function escapeCsvValue(value) {
  const normalizedValue = String(value ?? '');
  if (!/[",\n]/.test(normalizedValue)) return normalizedValue;
  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getActionLabels(value) {
  if (!value) return [];

  const labels = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string' || typeof item === 'number') {
        labels.push(String(item));
        return;
      }

      if (isPlainObject(item)) {
        const candidate = item.label || item.nombre || item.name || item.tipo || item.key || item.id;
        if (candidate) labels.push(String(candidate));
      }
    });
  } else if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (!nestedValue) return;
      if (typeof nestedValue === 'string') {
        labels.push(nestedValue);
        return;
      }
      labels.push(key);
    });
  } else {
    labels.push(String(value));
  }

  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
}

function matchesTriState(value, filterValue) {
  if (filterValue === 'all') return true;
  return Boolean(value).toString() === filterValue;
}

function toValidDate(value) {
  if (!value) return null;
  const parsedDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function matchesDateRange(value, from, to) {
  if (!from && !to) return true;

  const parsedDate = toValidDate(value);
  if (!parsedDate) return false;

  if (from) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    if (parsedDate < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (parsedDate > toDate) return false;
  }

  return true;
}

function formatDateTime(value) {
  const parsedDate = toValidDate(value);
  if (!parsedDate) return '—';

  return parsedDate.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compareValues(left, right, direction) {
  if (left == null && right == null) return 0;
  if (left == null) return direction === 'asc' ? -1 : 1;
  if (right == null) return direction === 'asc' ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') {
    return direction === 'asc' ? left - right : right - left;
  }
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);
  if (leftText < rightText) return direction === 'asc' ? -1 : 1;
  if (leftText > rightText) return direction === 'asc' ? 1 : -1;
  return 0;
}

const StatCard = React.memo(function StatCard({ title, value, subtitle, icon }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold">{value}</Typography>
            {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
          </Box>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
});

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node.isRequired,
};

StatCard.defaultProps = {
  subtitle: '',
};

const VERTICALES = [
  {
    key: 'Constructora',
    label: 'Constructora',
    description: 'Gestión de obras, notas de pedido, presupuestos y caja por proyecto.',
    icon: <ConstructionIcon fontSize="large" />,
    disponible: true,
  },
  {
    key: 'Corralon',
    label: 'Corralón',
    description: 'Venta de materiales, sucursales, clientes con cuenta corriente, acopios y stock.',
    icon: <StorefrontIcon fontSize="large" />,
    disponible: true,
  },
];

// Categorías default para corralón. Más simples que constructora.
const CORRALON_CATEGORIAS = [
  {
    id: 1,
    name: 'Materiales',
    subcategorias: [
      'Cemento', 'Hierro', 'Áridos', 'Aberturas', 'Sanitarios',
      'Ferretería', 'Pintura', 'Maderera', 'Cerámicos', 'Eléctricos',
    ],
  },
  {
    id: 2,
    name: 'Gastos operativos',
    subcategorias: [
      'Sueldos', 'Combustible', 'Mantenimiento vehículos',
      'Servicios', 'Impuestos', 'Alquiler', 'Insumos oficina',
    ],
  },
  {
    id: 3,
    name: 'Logística',
    subcategorias: ['Fletes terceros', 'Combustible camiones', 'Mantenimiento camiones'],
  },
];

function buildCorralonPayload({ nombre, razon_social, cuit, esCliente }) {
  return {
    tipo: 'Corralon',
    vertical: 'corralon',
    nombre,
    razon_social: razon_social || '',
    cuit: cuit || '',
    esCliente: Boolean(esCliente),
    fechaRegistroCliente: esCliente ? new Date().toISOString() : null,
    acciones: [...CORRALON_ACCIONES],
    conf_fecha: 'REAL',
    camposObligatorios: ['total'],
    categorias: CORRALON_CATEGORIAS,
    onboarding: ['verSaldoCaja', 'verClientes', 'verAcopios', 'finCorralon'],
    con_estados: true,
    estado_default_movimiento: 'Pendiente',
    estados: ['Pendiente', 'Pagado', 'Parcialmente Pagado'],
    medios_pago: ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Mercado Pago'],
    medio_pago_default: 'Efectivo',
    proveedores: [],
    proyectosIds: [],
    obras: [],
    tags_extra: [],
    comprobante_info: {
      observacion: true, categoria: true, subcategoria: true,
      proveedor: true, medio_pago: true,
      cliente: true, sucursal: true,
      proyecto: false, obra: false, etapa: false,
      tipo_factura: true, total_original: false, factura_cliente: false,
      fecha_pago: true, numero_factura: true, tags_extra: false, impuestos: true,
    },
    ingreso_info: {
      observacion: true, medio_pago: true, categoria: false,
      cliente: true, sucursal: true,
    },
  };
}

// Helpers para parsear Excel/CSV en los steps de import del wizard corralón.
async function parseExcelToRows(file) {
  // CSV → leer como string UTF-8 explícito (preserva tildes/eñes).
  // XLSX → leer como Uint8Array binario.
  const isCsv = /\.csv$/i.test(file?.name || '');
  let wb;
  if (isCsv) {
    const text = await file.text();
    wb = XLSX.read(text, { type: 'string' });
  } else {
    const buf = await file.arrayBuffer();
    wb = XLSX.read(buf, { type: 'array' });
  }
  const sheet = wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });
}

const normKey = (k) => String(k || '').trim().toLowerCase().replace(/\s+/g, '_');

const MATERIAL_ALIASES = {
  nombre: ['nombre', 'material', 'producto'],
  SKU: ['sku', 'codigo', 'cod'],
  categoria: ['categoria', 'rubro'],
  subcategoria: ['subcategoria', 'sub_rubro'],
  precio_unitario: ['precio_unitario', 'precio', 'pu'],
  stock_minimo: ['stock_minimo', 'minimo', 'min'],
  alias: ['alias', 'aliases'],
  desc_material: ['desc_material', 'descripcion', 'detalle'],
};

const CLIENTE_ALIASES = {
  nombre: ['nombre', 'cliente', 'nombre_cliente'],
  razon_social: ['razon_social', 'razonsocial', 'razon'],
  cuit: ['cuit', 'cuil', 'documento'],
  direccion: ['direccion', 'domicilio'],
  telefono: ['telefono', 'tel', 'celular', 'whatsapp'],
  email: ['email', 'mail', 'correo'],
  condicion_iva: ['condicion_iva', 'iva', 'cond_iva'],
  alias: ['alias', 'aliases'],
  categorias: ['categorias', 'categoria', 'rubros'],
  notas: ['notas', 'observaciones'],
  saldo_inicial: ['saldo_inicial', 'saldo inicial', 'saldo', 'deuda_inicial', 'deuda'],
};

const COND_IVA_MAP = {
  'consumidor final': 'consumidor_final', 'cf': 'consumidor_final',
  'monotributo': 'monotributo', 'monotributista': 'monotributo',
  'responsable inscripto': 'responsable_inscripto', 'ri': 'responsable_inscripto', 'inscripto': 'responsable_inscripto',
  'exento': 'exento',
};

function mapRow(row, aliases) {
  const lookup = {};
  Object.keys(row || {}).forEach((k) => { lookup[normKey(k)] = row[k]; });
  const out = {};
  for (const [target, alts] of Object.entries(aliases)) {
    for (const a of alts) {
      const n = normKey(a);
      if (lookup[n] != null && lookup[n] !== '') { out[target] = lookup[a] ?? lookup[n]; break; }
    }
  }
  return out;
}

function mapMaterialRow(row) {
  const out = mapRow(row, MATERIAL_ALIASES);
  if (typeof out.alias === 'string') out.alias = out.alias.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
  return out;
}

function mapClienteRow(row) {
  const out = mapRow(row, CLIENTE_ALIASES);
  if (out.condicion_iva) {
    const k = String(out.condicion_iva).trim().toLowerCase();
    out.condicion_iva = COND_IVA_MAP[k] || (k.includes('consumidor') ? 'consumidor_final' : null);
  }
  if (typeof out.alias === 'string') out.alias = out.alias.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
  if (typeof out.categorias === 'string') out.categorias = out.categorias.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
  if (out.cuit) out.cuit = String(out.cuit).replace(/[^\d]/g, '');
  if (out.saldo_inicial != null && out.saldo_inicial !== '') {
    const raw = String(out.saldo_inicial).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    out.saldo_inicial = Number.isFinite(n) ? n : null;
  } else {
    delete out.saldo_inicial;
  }
  return out;
}

// Espejo reducido de formDataConstructora (backend/src/services/constants_init/dataEmpresa.js).
// Si cambian las acciones/configuraciones canónicas, actualizar ambos lugares.
const CONSTRUCTORA_CATEGORIAS = [
  {
    id: 1,
    name: 'Mano de obra',
    subcategorias: [
      'Tareas preliminares', 'Estructura', 'Albañilería', 'Instalaciones sanitarios',
      'Instalaciones eléctricas', 'Instalaciones de gas', 'Cielorrasos', 'Colocaciones',
      'Pintura', 'Climatización', 'Aire acondicionado', 'Pileta', 'Riego', 'Paisajismo', 'Limpieza',
    ],
  },
  {
    id: 2,
    name: 'Materiales',
    subcategorias: [
      'Aberturas', 'Baño químico', 'Corralon', 'Durlock', 'Ferretería', 'Grillo Mov Suelos',
      'Hierros', 'Hormigón', 'Maderera', 'Materiales Eléctricos', 'Piedra', 'Pileta',
      'Pintureria', 'Sanitarios', 'Volquetes', 'Zingueria',
    ],
  },
  {
    id: 3,
    name: 'Administración',
    subcategorias: ['Sueldos', 'Honorarios', 'Alquiler oficina', 'Sistema gestión', 'Fotografía', 'Renders', 'Expensas'],
  },
];

function buildConstructoraPayload({ nombre, razon_social, cuit, esCliente }) {
  return {
    tipo: 'Constructora',
    nombre,
    razon_social: razon_social || '',
    cuit: cuit || '',
    esCliente: Boolean(esCliente),
    fechaRegistroCliente: esCliente ? new Date().toISOString() : null,
    acciones: [
      'VER_CAJAS', 'CREAR_INGRESO', 'CREAR_EGRESO', 'VER_DRIVE',
      'VER_NOTAS_DE_PEDIDO', 'CREAR_NOTA_PEDIDO', 'ELIMINAR_NOTA_PEDIDO',
      'MODIFICAR_NOTA_PEDIDO', 'GESTIONAR_MOVIMIENTO', 'VER_PRESUPUESTOS',
      'CREAR_EGRESO_PRORATEADO', 'CREAR_EGRESOS_MASIVO',
    ],
    conf_fecha: 'REAL',
    camposObligatorios: ['proyecto', 'total'],
    categorias: CONSTRUCTORA_CATEGORIAS,
    onboarding: ['verSaldoCaja', 'verDrive', 'notaPedido', 'finConstructora2'],
    proveedores: [],
    proyectosIds: [],
    etapas: [],
    obras: [],
    tags_extra: [],
    con_estados: false,
    estados: ['Pendiente', 'Pagado'],
    notas_estados: ['Pendiente', 'En proceso', 'Completo'],
    medios_pago: ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'],
    medio_pago_default: 'Transferencia',
    comprobante_info: {
      observacion: true, proyecto: true, categoria: true, subcategoria: true,
      proveedor: true, medio_pago: true, obra: true, etapa: false,
      tipo_factura: false, total_original: false, factura_cliente: false,
      fecha_pago: false, numero_factura: false, tags_extra: false, impuestos: false,
    },
    ingreso_info: { observacion: true, medio_pago: true, categoria: false },
  };
}

const STEPS_CONSTRUCTORA = ['Vertical', 'Empresa', 'Usuarios', 'Proyectos'];
const STEPS_CORRALON     = ['Vertical', 'Empresa', 'Usuarios', 'Sucursales', 'Datos iniciales'];
function getSteps(vertical) {
  return vertical === 'Corralon' ? STEPS_CORRALON : STEPS_CONSTRUCTORA;
}

function CreateEmpresaDialog({ open, onClose, onCreated }) {
  const [activeStep, setActiveStep] = useState(0);
  const [vertical, setVertical] = useState(null);
  const [empresaForm, setEmpresaForm] = useState({ nombre: '', razon_social: '', cuit: '', esCliente: false });
  const [proyectos, setProyectos] = useState(['']);
  // Corralón: sucursales (nombre + dirección)
  const [sucursales, setSucursales] = useState([{ nombre: '', direccion: '' }]);
  // Step "Datos iniciales" (solo corralón): import opcional de catálogo y clientes
  const [catalogoPreview, setCatalogoPreview] = useState([]);
  const [clientesPreview, setClientesPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [usuarios, setUsuarios] = useState([{ nombre: '', email: '', phone: '' }]);
  const [usuariosErrors, setUsuariosErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [submitError, setSubmitError] = useState('');

  const steps = useMemo(() => getSteps(vertical), [vertical]);

  const resetState = useCallback(() => {
    setActiveStep(0);
    setVertical(null);
    setEmpresaForm({ nombre: '', razon_social: '', cuit: '', esCliente: false });
    setProyectos(['']);
    setSucursales([{ nombre: '', direccion: '' }]);
    setCatalogoPreview([]);
    setClientesPreview([]);
    setImportError('');
    setUsuarios([{ nombre: '', email: '', phone: '' }]);
    setUsuariosErrors([]);
    setIsSubmitting(false);
    setSubmitProgress('');
    setSubmitError('');
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetState();
    onClose();
  }, [isSubmitting, onClose, resetState]);

  const handlePickVertical = useCallback((key) => {
    setVertical(key);
  }, []);

  // Filas de usuario "completas" (con al menos nombre o email o phone). Filas vacías se descartan.
  const usuariosUtiles = useMemo(
    () => usuarios.filter((u) => (u.nombre || u.email || u.phone)),
    [usuarios],
  );

  const validateUsuariosLocal = useCallback(() => {
    const errors = usuarios.map((u) => {
      const hasAny = Boolean(u.nombre || u.email || u.phone);
      if (!hasAny) return null; // fila vacía → se descarta
      const row = {};
      if (!u.nombre?.trim()) row.nombre = 'Requerido';
      if (!u.email?.trim() && !u.phone?.trim()) row.email = 'Email o teléfono requerido';
      if (u.email?.trim() && !isValidEmail(u.email)) row.email = 'Email inválido';
      if (u.phone?.trim() && normalizePhone(u.phone).length < 8) row.phone = 'Teléfono inválido';
      return Object.keys(row).length ? row : null;
    });
    setUsuariosErrors(errors);
    return errors.every((e) => !e);
  }, [usuarios]);

  // Validación + chequeo de duplicados al avanzar desde el paso de usuarios.
  const handleNextFromUsuarios = useCallback(async () => {
    if (!validateUsuariosLocal()) return;
    const phones = usuariosUtiles.map((u) => normalizePhone(u.phone)).filter(Boolean);
    if (phones.length) {
      setIsSubmitting(true);
      setSubmitProgress('Verificando que los teléfonos no estén en uso...');
      try {
        const checks = await Promise.all(phones.map((p) => profileService.getProfileByPhone(p).catch(() => null)));
        const errors = [...usuariosErrors];
        let hasDup = false;
        let idx = 0;
        usuarios.forEach((u, i) => {
          if (!normalizePhone(u.phone)) return;
          if (checks[idx]) {
            errors[i] = { ...(errors[i] || {}), phone: 'Ya existe un usuario con ese teléfono' };
            hasDup = true;
          }
          idx += 1;
        });
        if (hasDup) {
          setUsuariosErrors(errors);
          return;
        }
      } finally {
        setIsSubmitting(false);
        setSubmitProgress('');
      }
    }
    setActiveStep(3);
  }, [usuarios, usuariosErrors, usuariosUtiles, validateUsuariosLocal]);

  const handleFormChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setEmpresaForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const handleUsuarioChange = useCallback((index, field, value) => {
    setUsuarios((current) => current.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
  }, []);

  const handleAddUsuario = useCallback(() => {
    setUsuarios((current) => [...current, { nombre: '', email: '', phone: '' }]);
  }, []);

  const handleRemoveUsuario = useCallback((index) => {
    setUsuarios((current) => current.filter((_, i) => i !== index));
  }, []);

  const handleProyectoChange = useCallback((index, value) => {
    setProyectos((current) => current.map((nombre, i) => (i === index ? value : nombre)));
  }, []);

  const handleAddProyecto = useCallback(() => {
    setProyectos((current) => [...current, '']);
  }, []);

  const handleRemoveProyecto = useCallback((index) => {
    setProyectos((current) => current.filter((_, i) => i !== index));
  }, []);

  // ─── Sucursales (corralón) ────────────────────────────────────────────────
  const handleSucursalChange = useCallback((index, field, value) => {
    setSucursales((current) => current.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }, []);
  const handleAddSucursal = useCallback(() => {
    setSucursales((current) => [...current, { nombre: '', direccion: '' }]);
  }, []);
  const handleRemoveSucursal = useCallback((index) => {
    setSucursales((current) => current.filter((_, i) => i !== index));
  }, []);

  // ─── Import opcional Excel (corralón) ─────────────────────────────────────
  const handleCatalogoFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const rows = await parseExcelToRows(file);
      const materiales = rows.map(mapMaterialRow).filter((m) => m.nombre && String(m.nombre).trim() !== '');
      setCatalogoPreview(materiales);
    } catch (err) {
      setImportError(`Catálogo: ${err.message || 'no se pudo parsear'}`);
    } finally {
      e.target.value = '';
    }
  }, []);

  const handleClientesFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const rows = await parseExcelToRows(file);
      const cls = rows.map(mapClienteRow).filter((c) => c.nombre && String(c.nombre).trim() !== '');
      setClientesPreview(cls);
    } catch (err) {
      setImportError(`Clientes: ${err.message || 'no se pudo parsear'}`);
    } finally {
      e.target.value = '';
    }
  }, []);

  // ─── Submit corralón ──────────────────────────────────────────────────────
  const sucursalesValidas = useMemo(
    () => sucursales
      .map((s) => ({ ...s, nombre: (s.nombre || '').trim() }))
      .filter((s) => s.nombre),
    [sucursales],
  );

  const handleSubmitCorralon = useCallback(async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      setSubmitProgress('Creando empresa corralón...');
      const payload = buildCorralonPayload(empresaForm);
      const response = await crearEmpresa(payload);
      const empresaCreada = response?.empresa || response;
      const empresaId = empresaCreada?.id || empresaCreada?._id;
      if (!empresaId) throw new Error('No se obtuvo el ID de la empresa creada.');
      const empresaNombre = empresaCreada?.nombre || empresaForm.nombre;

      // Asegurar al menos 1 sucursal: si el usuario no cargó ninguna, crear "Sucursal Principal"
      const sucursalesAcrear = sucursalesValidas.length
        ? sucursalesValidas
        : [{ nombre: 'Sucursal Principal', direccion: '' }];

      let sucursalesCreadas = 0;
      for (let i = 0; i < sucursalesAcrear.length; i += 1) {
        setSubmitProgress(`Creando sucursal ${i + 1} de ${sucursalesAcrear.length}...`);
        try {
          await sucursalService.crear(empresaId, sucursalesAcrear[i]);
          sucursalesCreadas += 1;
        } catch (err) {
          console.warn('Error creando sucursal', sucursalesAcrear[i].nombre, err);
        }
      }

      // Usuarios (igual que constructora)
      const usuariosValidos = usuariosUtiles.map((u) => ({
        nombre: (u.nombre || '').trim(),
        email: (u.email || '').trim(),
        phone: normalizePhone(u.phone),
      }));
      let usuariosCreados = 0;
      for (let i = 0; i < usuariosValidos.length; i += 1) {
        const u = usuariosValidos[i];
        setSubmitProgress(`Creando usuario ${i + 1} de ${usuariosValidos.length}...`);
        const [firstName, ...rest] = u.nombre.split(' ');
        const lastName = rest.join(' ');
        const profileData = {
          firstName: firstName || '',
          lastName: lastName || '',
          email: u.email || null,
          phone: u.phone || null,
          admin: false,
        };
        const created = await profileService.createProfile(profileData, { ...empresaCreada, id: empresaId });
        if (created) usuariosCreados += 1;
      }

      // Catálogo (opcional)
      let materialesCreados = 0;
      if (catalogoPreview.length) {
        setSubmitProgress(`Importando ${catalogoPreview.length} materiales...`);
        try {
          const res = await StockMaterialesService.importarCatalogo({
            empresa_id: empresaId,
            empresa_nombre: empresaNombre,
            materiales: catalogoPreview,
          });
          materialesCreados = res?.creados_count ?? res?.creados ?? catalogoPreview.length;
        } catch (err) {
          console.warn('Error importando catálogo:', err);
        }
      }

      // Clientes (opcional)
      let clientesCreados = 0;
      if (clientesPreview.length) {
        setSubmitProgress(`Importando ${clientesPreview.length} clientes...`);
        try {
          const res = await clienteService.importar(empresaId, clientesPreview);
          clientesCreados = res?.imported ?? clientesPreview.length;
        } catch (err) {
          console.warn('Error importando clientes:', err);
        }
      }

      const partes = [`Corralón "${empresaNombre}" creado`];
      if (sucursalesCreadas) partes.push(`${sucursalesCreadas} sucursales`);
      if (usuariosCreados) partes.push(`${usuariosCreados} usuarios`);
      if (materialesCreados) partes.push(`${materialesCreados} materiales`);
      if (clientesCreados) partes.push(`${clientesCreados} clientes`);

      resetState();
      onCreated({ message: `${partes.join(' · ')}.` });
    } catch (err) {
      console.error('Error creando empresa Corralón:', err);
      setSubmitError(err?.message || 'No se pudo crear la empresa.');
      setIsSubmitting(false);
    }
  }, [empresaForm, sucursalesValidas, usuariosUtiles, catalogoPreview, clientesPreview, onCreated, resetState]);

  const handleSubmitConstructora = useCallback(async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      setSubmitProgress('Creando empresa...');
      const payload = buildConstructoraPayload(empresaForm);
      const response = await crearEmpresa(payload);
      const empresaCreada = response?.empresa || response;
      const empresaId = empresaCreada?.id || empresaCreada?._id;
      if (!empresaId) throw new Error('No se obtuvo el ID de la empresa creada.');

      const nombresValidos = proyectos.map((p) => p.trim()).filter(Boolean);
      const proyectoIds = [];
      for (let i = 0; i < nombresValidos.length; i += 1) {
        setSubmitProgress(`Creando proyecto ${i + 1} de ${nombresValidos.length}...`);
        const proyectoCreado = await crearProyecto(
          { nombre: nombresValidos[i], empresa_id: empresaId, activo: true },
          empresaId,
        );
        const proyectoId = proyectoCreado?.id || proyectoCreado?._id;
        if (proyectoId) proyectoIds.push(proyectoId);
      }

      if (proyectoIds.length) {
        setSubmitProgress('Vinculando proyectos a la empresa...');
        await updateEmpresaDetails(empresaId, { proyectosIds: proyectoIds });
      }

      const usuariosValidos = usuariosUtiles.map((u) => ({
        nombre: (u.nombre || '').trim(),
        email: (u.email || '').trim(),
        phone: normalizePhone(u.phone),
      }));

      let usuariosCreados = 0;
      for (let i = 0; i < usuariosValidos.length; i += 1) {
        const u = usuariosValidos[i];
        setSubmitProgress(`Creando usuario ${i + 1} de ${usuariosValidos.length}...`);
        const [firstName, ...rest] = u.nombre.split(' ');
        const lastName = rest.join(' ');
        const profileData = {
          firstName: firstName || '',
          lastName: lastName || '',
          email: u.email || null,
          phone: u.phone || null,
          admin: false,
        };
        const created = await profileService.createProfile(profileData, { ...empresaCreada, id: empresaId });
        if (created) usuariosCreados += 1;
      }

      const partes = [`Empresa "${empresaCreada.nombre || empresaForm.nombre}" creada`];
      if (proyectoIds.length) partes.push(`${proyectoIds.length} proyectos`);
      if (usuariosCreados) partes.push(`${usuariosCreados} usuarios`);

      resetState();
      onCreated({ message: `${partes.join(' · ')}.` });
    } catch (err) {
      console.error('Error creando empresa Constructora:', err);
      setSubmitError(err?.message || 'No se pudo crear la empresa.');
      setIsSubmitting(false);
    }
  }, [empresaForm, onCreated, proyectos, resetState, usuariosUtiles]);

  const verticalDisponible = useMemo(() => VERTICALES.find((v) => v.key === vertical)?.disponible, [vertical]);
  const canNextEmpresa = empresaForm.nombre.trim().length > 0;
  const canSubmitConstructora = canNextEmpresa;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Crear nueva empresa</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {activeStep === 0 ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Elegí el tipo de empresa. Cada vertical configura acciones, categorías y comprobantes propios.
            </Typography>
            <Grid container spacing={2}>
              {VERTICALES.map((v) => (
                <Grid item xs={12} md={6} key={v.key}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: v.disponible ? 'pointer' : 'not-allowed',
                      opacity: v.disponible ? 1 : 0.6,
                      borderColor: vertical === v.key ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: v.disponible ? 'primary.main' : 'divider' },
                    }}
                    onClick={() => handlePickVertical(v.key)}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ color: 'primary.main' }}>{v.icon}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">{v.label}</Typography>
                          <Typography variant="body2" color="text.secondary">{v.description}</Typography>
                          {!v.disponible ? (
                            <Chip label="En construcción" size="small" color="warning" sx={{ mt: 1 }} />
                          ) : null}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {vertical && !verticalDisponible ? (
              <Alert severity="info">
                La creación de empresas de tipo {VERTICALES.find((v) => v.key === vertical)?.label} todavía no está disponible desde esta vista.
              </Alert>
            ) : null}
          </Stack>
        ) : null}

        {activeStep === 1 ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Datos de la empresa</Typography>
            <TextField
              label="Nombre"
              name="nombre"
              value={empresaForm.nombre}
              onChange={handleFormChange}
              required
              fullWidth
              autoFocus
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Razón social" name="razon_social" value={empresaForm.razon_social} onChange={handleFormChange} fullWidth />
              <TextField label="CUIT" name="cuit" value={empresaForm.cuit} onChange={handleFormChange} fullWidth />
            </Stack>
            <FormControlLabel
              control={(
                <Switch
                  name="esCliente"
                  checked={empresaForm.esCliente}
                  onChange={handleFormChange}
                  color="primary"
                />
              )}
              label={empresaForm.esCliente ? 'Marcar como cliente (se registra fecha de alta)' : 'No es cliente'}
            />
          </Stack>
        ) : null}

        {activeStep === 2 ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Usuarios iniciales</Typography>
            <Typography variant="body2" color="text.secondary">
              Cargá los perfiles que van a tener acceso. Email o teléfono son obligatorios para identificar al usuario.
              Podés dejar la lista vacía si vas a crear los usuarios más tarde desde la sección de la empresa.
            </Typography>
            <Stack spacing={1}>
              {usuarios.map((usuario, index) => {
                const err = usuariosErrors[index];
                return (
                  <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                    <TextField
                      label="Nombre"
                      value={usuario.nombre}
                      onChange={(event) => handleUsuarioChange(index, 'nombre', event.target.value)}
                      fullWidth
                      error={Boolean(err?.nombre)}
                      helperText={err?.nombre}
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={usuario.email}
                      onChange={(event) => handleUsuarioChange(index, 'email', event.target.value)}
                      fullWidth
                      error={Boolean(err?.email)}
                      helperText={err?.email}
                    />
                    <TextField
                      label="Teléfono"
                      value={usuario.phone}
                      onChange={(event) => handleUsuarioChange(index, 'phone', event.target.value)}
                      fullWidth
                      error={Boolean(err?.phone)}
                      helperText={err?.phone}
                    />
                    <IconButton onClick={() => handleRemoveUsuario(index)} disabled={usuarios.length === 1} sx={{ alignSelf: 'center' }}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                );
              })}
              <Button startIcon={<AddIcon />} onClick={handleAddUsuario} size="small" sx={{ alignSelf: 'flex-start' }}>
                Agregar usuario
              </Button>
            </Stack>
            {isSubmitting && submitProgress ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{submitProgress}</Typography>
                <LinearProgress />
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {activeStep === 3 && vertical === 'Constructora' ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Proyectos iniciales</Typography>
            <Typography variant="body2" color="text.secondary">
              Cargá los nombres de las obras o proyectos. Después podés configurarles carpeta de Drive, sheets y usuarios asignados desde la sección del proyecto.
            </Typography>
            <Stack spacing={1}>
              {proyectos.map((nombre, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center">
                  <TextField
                    value={nombre}
                    onChange={(event) => handleProyectoChange(index, event.target.value)}
                    placeholder={`Proyecto ${index + 1}`}
                    fullWidth
                  />
                  <IconButton onClick={() => handleRemoveProyecto(index)} disabled={proyectos.length === 1}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddProyecto} size="small" sx={{ alignSelf: 'flex-start' }}>
                Agregar proyecto
              </Button>
            </Stack>

            <Alert severity="info">
              Se va a crear: <strong>{empresaForm.nombre}</strong>
              {empresaForm.esCliente ? ' (cliente)' : ''} con {usuariosUtiles.length} usuarios y {proyectos.map((p) => p.trim()).filter(Boolean).length} proyectos.
            </Alert>

            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {isSubmitting ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{submitProgress}</Typography>
                <LinearProgress />
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {activeStep === 3 && vertical === 'Corralon' ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Sucursales</Typography>
            <Typography variant="body2" color="text.secondary">
              Cargá las sucursales físicas del corralón. Si no cargás ninguna, creamos una
              <em> Sucursal Principal</em> por default.
            </Typography>
            <Stack spacing={1}>
              {sucursales.map((s, index) => (
                <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                  <TextField
                    label="Nombre"
                    value={s.nombre}
                    onChange={(e) => handleSucursalChange(index, 'nombre', e.target.value)}
                    placeholder={`Sucursal ${index + 1}`}
                    fullWidth
                  />
                  <TextField
                    label="Dirección"
                    value={s.direccion}
                    onChange={(e) => handleSucursalChange(index, 'direccion', e.target.value)}
                    fullWidth
                  />
                  <IconButton onClick={() => handleRemoveSucursal(index)} disabled={sucursales.length === 1}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddSucursal} size="small" sx={{ alignSelf: 'flex-start' }}>
                Agregar sucursal
              </Button>
            </Stack>
          </Stack>
        ) : null}

        {activeStep === 4 && vertical === 'Corralon' ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Datos iniciales (opcional)</Typography>
            <Typography variant="body2" color="text.secondary">
              Podés precargar el catálogo de materiales y los clientes desde un Excel. Es opcional —
              también lo podés hacer después desde las páginas de Materiales y Clientes.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>📦 Catálogo de materiales</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Columnas: <code>nombre</code>, <code>SKU</code>, <code>categoria</code>,
                      {' '}<code>precio_unitario</code>, <code>stock_minimo</code>…
                    </Typography>
                    <Button variant="outlined" component="label" size="small">
                      Subir Excel
                      <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleCatalogoFile} />
                    </Button>
                    {catalogoPreview.length > 0 && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        {catalogoPreview.length} materiales detectados
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>👥 Clientes</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Columnas: <code>nombre</code>, <code>CUIT</code>, <code>razon_social</code>,
                      {' '}<code>telefono</code>, <code>condicion_iva</code>…
                    </Typography>
                    <Button variant="outlined" component="label" size="small">
                      Subir Excel
                      <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleClientesFile} />
                    </Button>
                    {clientesPreview.length > 0 && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        {clientesPreview.length} clientes detectados
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {importError && <Alert severity="warning">{importError}</Alert>}

            <Alert severity="info">
              Se va a crear: <strong>{empresaForm.nombre}</strong>
              {empresaForm.esCliente ? ' (cliente)' : ''} ·
              {' '}{sucursalesValidas.length || 1} sucursales ·
              {' '}{usuariosUtiles.length} usuarios
              {catalogoPreview.length ? ` · ${catalogoPreview.length} materiales` : ''}
              {clientesPreview.length ? ` · ${clientesPreview.length} clientes` : ''}.
            </Alert>

            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {isSubmitting ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{submitProgress}</Typography>
                <LinearProgress />
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
        {activeStep > 0 ? (
          <Button onClick={() => setActiveStep((s) => s - 1)} disabled={isSubmitting}>Atrás</Button>
        ) : null}

        {activeStep === 0 ? (
          <Button
            variant="contained"
            onClick={() => setActiveStep(1)}
            disabled={!vertical || !verticalDisponible}
          >
            Siguiente
          </Button>
        ) : null}
        {activeStep === 1 ? (
          <Button variant="contained" onClick={() => setActiveStep(2)} disabled={!canNextEmpresa}>
            Siguiente
          </Button>
        ) : null}
        {activeStep === 2 ? (
          <Button variant="contained" onClick={handleNextFromUsuarios} disabled={isSubmitting}>
            Siguiente
          </Button>
        ) : null}
        {activeStep === 3 && vertical === 'Constructora' ? (
          <Button
            variant="contained"
            onClick={handleSubmitConstructora}
            disabled={!canSubmitConstructora || isSubmitting}
          >
            Crear empresa
          </Button>
        ) : null}
        {activeStep === 3 && vertical === 'Corralon' ? (
          <Button variant="contained" onClick={() => setActiveStep(4)} disabled={isSubmitting}>
            Siguiente
          </Button>
        ) : null}
        {activeStep === 4 && vertical === 'Corralon' ? (
          <Button
            variant="contained"
            onClick={handleSubmitCorralon}
            disabled={!canNextEmpresa || isSubmitting}
          >
            Crear corralón
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

CreateEmpresaDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
};

function EmpresasListPage() {
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]);
  const [infoToDelete, setInfoToDelete] = useState(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [soloClientes, setSoloClientes] = useState(true);
  const [filters, setFilters] = useState({
    nombre: '',
    proyectoNombre: '',
    razonSocial: '',
    cuit: '',
    accion: '',
    proyectos: '',
    suspendida: 'all',
  });
  const [createdFrom, setCreatedFrom] = useState(null);
  const [createdTo, setCreatedTo] = useState(null);
  const [activationFrom, setActivationFrom] = useState(null);
  const [activationTo, setActivationTo] = useState(null);
  const [suspensionFrom, setSuspensionFrom] = useState(null);
  const [suspensionTo, setSuspensionTo] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Tab activo: separa el listado por vertical (constructoras vs corralones).
  const [verticalTab, setVerticalTab] = useState('constructora');

  const loadEmpresas = useCallback(async () => {
    try {
      setIsLoading(true);
      const empresasList = await getAllEmpresas();
      const enrichedEmpresas = await Promise.all((empresasList || []).map(async (empresa) => {
        const empresaId = String(empresa.id || empresa._id || '');
        const vertical = (empresa?.vertical || 'constructora').toLowerCase();
        const proyectoIds = Array.isArray(empresa?.proyectosIds) ? empresa.proyectosIds : [];
        const proyectosData = empresaId && proyectoIds.length ? await getProyectosByEmpresaId(empresaId) : [];
        const projectNames = proyectosData.map((proyecto) => proyecto?.nombre).filter(Boolean);
        const actionLabels = getActionLabels(empresa?.acciones);

        // Para corralones cargamos sucursales (paralelo). Para constructoras no.
        let sucursales = [];
        if (vertical === 'corralon' && empresaId) {
          try {
            sucursales = await sucursalService.getByEmpresa(empresaId);
          } catch (_) { sucursales = []; }
        }
        const sucursalNames = Array.isArray(sucursales) ? sucursales.map((s) => s?.nombre).filter(Boolean) : [];

        return {
          ...empresa,
          id: empresaId,
          vertical,
          projectNames,
          projectSearchBlob: normalizeText(projectNames.join(' ')),
          sucursalNames,
          sucursalesCount: sucursalNames.length,
          accionesLabels: actionLabels,
        };
      }));

      setEmpresas(enrichedEmpresas);
      setSelectedEmpresas((currentSelected) => currentSelected.filter((id) => enrichedEmpresas.some((empresa) => empresa.id === id)));
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      setAlert({ open: true, message: 'Error al cargar las empresas.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas]);

  const actionOptions = useMemo(() => {
    const actionsSet = new Set();
    empresas.forEach((empresa) => {
      empresa?.accionesLabels?.forEach((label) => actionsSet.add(label));
    });
    return Array.from(actionsSet).sort((left, right) => left.localeCompare(right));
  }, [empresas]);

  // Counts por vertical para los badges de los tabs (independientes del filtro).
  const verticalCounts = useMemo(() => {
    const counts = { constructora: 0, corralon: 0 };
    for (const e of empresas) {
      const v = (e?.vertical || 'constructora').toLowerCase();
      if (v === 'corralon') counts.corralon += 1;
      else counts.constructora += 1;
    }
    return counts;
  }, [empresas]);

  const filteredEmpresas = useMemo(() => empresas.filter((empresa) => {
    const empresaVertical = (empresa?.vertical || 'constructora').toLowerCase();
    if (empresaVertical !== verticalTab) return false;
    const matchesNombre = normalizeText(empresa?.nombre).includes(normalizeText(filters.nombre));
    const matchesProyectoNombre = !filters.proyectoNombre || empresa?.projectSearchBlob?.includes(normalizeText(filters.proyectoNombre));
    const matchesRazonSocial = normalizeText(empresa?.razon_social).includes(normalizeText(filters.razonSocial));
    const matchesCuit = normalizeText(empresa?.cuit).includes(normalizeText(filters.cuit));
    const matchesAccion = !filters.accion || empresa?.accionesLabels?.some((label) => normalizeText(label) === normalizeText(filters.accion));
    const proyectosCount = empresa?.proyectosIds?.length || 0;
    const matchesProyectos = filters.proyectos ? proyectosCount === parseInt(filters.proyectos, 10) : true;
    const matchesCliente = soloClientes ? empresa?.esCliente === true : true;
    const matchesSuspendida = matchesTriState(empresa?.cuenta_suspendida, filters.suspendida);
    const matchesCreatedAt = matchesDateRange(empresa?.createdAt, createdFrom, createdTo);
    const matchesActivationDate = matchesDateRange(empresa?.fechaRegistroCliente, activationFrom, activationTo);
    const matchesSuspensionDate = matchesDateRange(empresa?.fechaBaja, suspensionFrom, suspensionTo);
    return matchesNombre && matchesProyectoNombre && matchesRazonSocial && matchesCuit && matchesAccion && matchesProyectos && matchesCliente && matchesSuspendida && matchesCreatedAt && matchesActivationDate && matchesSuspensionDate;
  }), [empresas, verticalTab, filters, soloClientes, createdFrom, createdTo, activationFrom, activationTo, suspensionFrom, suspensionTo]);

  const sortedEmpresas = useMemo(() => {
    const rows = filteredEmpresas.slice();
    const getters = {
      nombre: (empresa) => empresa?.nombre,
      razonSocial: (empresa) => empresa?.razon_social,
      proyectos: (empresa) => empresa?.proyectosIds?.length || 0,
      esCliente: (empresa) => (empresa?.esCliente ? 1 : 0),
      suspendida: (empresa) => (empresa?.cuenta_suspendida ? 1 : 0),
    };
    const getter = getters[sortBy] || getters.nombre;
    rows.sort((left, right) => compareValues(getter(left), getter(right), sortDirection));
    return rows;
  }, [filteredEmpresas, sortBy, sortDirection]);

  const paginatedEmpresas = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedEmpresas.slice(start, start + rowsPerPage);
  }, [sortedEmpresas, page, rowsPerPage]);

  const currentPageIds = useMemo(() => paginatedEmpresas.map((empresa) => empresa.id), [paginatedEmpresas]);

  const summary = useMemo(() => ({
    total: empresas.length,
    visibles: filteredEmpresas.length,
    clientesVisibles: filteredEmpresas.filter((empresa) => empresa?.esCliente).length,
    proyectosVisibles: filteredEmpresas.reduce((accumulator, empresa) => accumulator + (empresa?.proyectosIds?.length || 0), 0),
    sucursalesVisibles: filteredEmpresas.reduce((acc, empresa) => acc + (empresa?.sucursalesCount || 0), 0),
    seleccionadas: selectedEmpresas.length,
  }), [empresas.length, filteredEmpresas, selectedEmpresas.length]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (soloClientes) chips.push({ key: 'soloClientes', label: 'Solo clientes' });
    if (filters.nombre) chips.push({ key: 'nombre', label: `Nombre: ${filters.nombre}` });
    if (filters.proyectoNombre) chips.push({ key: 'proyectoNombre', label: `Proyecto: ${filters.proyectoNombre}` });
    if (filters.razonSocial) chips.push({ key: 'razonSocial', label: `Razón social: ${filters.razonSocial}` });
    if (filters.cuit) chips.push({ key: 'cuit', label: `CUIT: ${filters.cuit}` });
    if (filters.accion) chips.push({ key: 'accion', label: `Acción: ${filters.accion}` });
    if (filters.proyectos) chips.push({ key: 'proyectos', label: `Proyectos: ${filters.proyectos}` });
    if (filters.suspendida !== 'all') chips.push({ key: 'suspendida', label: `Suspendida: ${filters.suspendida === 'true' ? 'Sí' : 'No'}` });
    if (createdFrom) chips.push({ key: 'createdFrom', label: `Creada desde: ${formatDateTime(createdFrom)}` });
    if (createdTo) chips.push({ key: 'createdTo', label: `Creada hasta: ${formatDateTime(createdTo)}` });
    if (activationFrom) chips.push({ key: 'activationFrom', label: `Activada desde: ${formatDateTime(activationFrom)}` });
    if (activationTo) chips.push({ key: 'activationTo', label: `Activada hasta: ${formatDateTime(activationTo)}` });
    if (suspensionFrom) chips.push({ key: 'suspensionFrom', label: `Suspendida desde: ${formatDateTime(suspensionFrom)}` });
    if (suspensionTo) chips.push({ key: 'suspensionTo', label: `Suspendida hasta: ${formatDateTime(suspensionTo)}` });
    return chips;
  }, [filters, soloClientes, createdFrom, createdTo, activationFrom, activationTo, suspensionFrom, suspensionTo]);

  useEffect(() => {
    setPage(0);
  }, [verticalTab, filters, soloClientes, sortBy, sortDirection, createdFrom, createdTo, activationFrom, activationTo, suspensionFrom, suspensionTo]);

  const handleCloseAlert = useCallback((_event, reason) => {
    if (reason === 'clickaway') return;
    setAlert((currentAlert) => ({ ...currentAlert, open: false }));
  }, []);

  const handleFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  }, []);

  const handleToggleSoloClientes = useCallback((event) => {
    setSoloClientes(event.target.checked);
  }, []);

  const handleToggleFiltersExpanded = useCallback(() => {
    setFiltersExpanded((currentExpanded) => !currentExpanded);
  }, []);

  const handleToggleSelection = useCallback((empresaId) => {
    setSelectedEmpresas((currentSelected) => (
      currentSelected.includes(empresaId)
        ? currentSelected.filter((id) => id !== empresaId)
        : [...currentSelected, empresaId]
    ));
  }, []);

  const handleSelectCurrentPage = useCallback((event) => {
    setSelectedEmpresas((currentSelected) => {
      if (event.target.checked) return Array.from(new Set([...currentSelected, ...currentPageIds]));
      return currentSelected.filter((id) => !currentPageIds.includes(id));
    });
  }, [currentPageIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedEmpresas([]);
  }, []);

  const handleOpenConfirmDialog = useCallback(async (ids) => {
    if (!ids.length) return;
    setPendingDeleteIds(ids);
    setConfirmDialogOpen(true);
    setInfoToDelete(null);
    try {
      const info = await Promise.all(ids.map((id) => getInfoToDeleteEmpresa(id)));
      setInfoToDelete(info.filter(Boolean));
    } catch (error) {
      console.error('Error preparando confirmación:', error);
      setInfoToDelete([]);
      setAlert({ open: true, message: 'No se pudo cargar la info de borrado.', severity: 'error' });
    }
  }, []);

  const handleOpenSelectedDelete = useCallback(() => {
    handleOpenConfirmDialog(selectedEmpresas);
  }, [handleOpenConfirmDialog, selectedEmpresas]);

  const handleOpenSingleDelete = useCallback((empresaId) => {
    handleOpenConfirmDialog([empresaId]);
  }, [handleOpenConfirmDialog]);

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingDeleteIds([]);
    setInfoToDelete(null);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!pendingDeleteIds.length) return;

    setIsDeleting(true);
    setDeleteProgress('Comenzando a eliminar empresas seleccionadas...');

    try {
      for (let index = 0; index < pendingDeleteIds.length; index += 1) {
        const empresaId = pendingDeleteIds[index];
        setDeleteProgress(`Eliminando empresa ${index + 1} de ${pendingDeleteIds.length}`);
        await deleteEmpresa(empresaId);
        setEmpresas((currentEmpresas) => currentEmpresas.filter((empresa) => empresa.id !== empresaId));
      }

      setSelectedEmpresas((currentSelected) => currentSelected.filter((id) => !pendingDeleteIds.includes(id)));
      setAlert({ open: true, message: 'Empresas eliminadas con éxito.', severity: 'success' });
      handleCloseConfirmDialog();
    } catch (error) {
      console.error('Error eliminando empresas:', error);
      setAlert({ open: true, message: 'Ocurrió un error eliminando empresas.', severity: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteProgress('');
    }
  }, [handleCloseConfirmDialog, pendingDeleteIds]);

  const handleRequestSort = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDirection(field === 'proyectos' ? 'desc' : 'asc');
  }, [sortBy]);

  const handleChangePage = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ nombre: '', proyectoNombre: '', razonSocial: '', cuit: '', accion: '', proyectos: '', suspendida: 'all' });
    setSoloClientes(true);
    setCreatedFrom(null);
    setCreatedTo(null);
    setActivationFrom(null);
    setActivationTo(null);
    setSuspensionFrom(null);
    setSuspensionTo(null);
  }, []);

  const handleRemoveFilterChip = useCallback((key) => {
    if (key === 'soloClientes') {
      setSoloClientes(false);
      return;
    }

    if (key === 'createdFrom') return setCreatedFrom(null);
    if (key === 'createdTo') return setCreatedTo(null);
    if (key === 'activationFrom') return setActivationFrom(null);
    if (key === 'activationTo') return setActivationTo(null);
    if (key === 'suspensionFrom') return setSuspensionFrom(null);
    if (key === 'suspensionTo') return setSuspensionTo(null);

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: '',
    }));
  }, []);

  const handleExportCsv = useCallback(() => {
    const csvRows = [
      ['Nombre', 'Razon social', 'CUIT', 'Cliente', 'Suspendida', 'Cantidad de proyectos', 'Proyectos', 'Acciones'],
      ...sortedEmpresas.map((empresa) => [
        empresa?.nombre || '',
        empresa?.razon_social || '',
        empresa?.cuit || '',
        empresa?.esCliente ? 'si' : 'no',
        empresa?.cuenta_suspendida ? 'si' : 'no',
        empresa?.proyectosIds?.length || 0,
        (empresa?.projectNames || []).join(' | '),
        (empresa?.accionesLabels || []).join(' | '),
      ]),
    ];
    downloadCsv('empresas.csv', csvRows);
  }, [sortedEmpresas]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
    <>
      <Head>
        <title>Listado de Empresas {filteredEmpresas.length}</title>
      </Head>

      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
              <Box>
                <Typography variant="h4" fontWeight="bold">Empresas</Typography>
                <Typography variant="body2" color="text.secondary">
                  La vista arranca filtrando solo clientes para priorizar las empresas relevantes.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Nueva empresa
              </Button>
            </Stack>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={verticalTab}
                onChange={(_, v) => setVerticalTab(v)}
                aria-label="Tipo de empresa"
              >
                <Tab
                  value="constructora"
                  icon={<ConstructionIcon />}
                  iconPosition="start"
                  label={`Constructoras (${verticalCounts.constructora})`}
                />
                <Tab
                  value="corralon"
                  icon={<StorefrontIcon />}
                  iconPosition="start"
                  label={`Corralones (${verticalCounts.corralon})`}
                />
              </Tabs>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><StatCard title={verticalTab === 'corralon' ? 'Corralones cargados' : 'Constructoras cargadas'} value={verticalCounts[verticalTab]} subtitle={`${summary.visibles} visibles`} icon={<BusinessIcon />} /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Clientes visibles" value={summary.clientesVisibles} subtitle="Con filtro actual" icon={<ApartmentIcon />} /></Grid>
              <Grid item xs={12} md={3}><StatCard title={verticalTab === 'corralon' ? 'Sucursales visibles' : 'Proyectos visibles'} value={verticalTab === 'corralon' ? summary.sucursalesVisibles : summary.proyectosVisibles} subtitle={verticalTab === 'corralon' ? 'Suma de sucursales' : 'Suma de proyectos'} icon={<PlaylistAddCheckIcon />} /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Seleccionadas" value={summary.seleccionadas} subtitle="Para acciones masivas" icon={<DeleteIcon />} /></Grid>
            </Grid>

            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                  <Box>
                    <Typography variant="h6">Filtros</Typography>
                    <Typography variant="body2" color="text.secondary">Búsqueda rápida y filtros básicos de la lista.</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Button variant="outlined" startIcon={<FilterListIcon />} endIcon={filtersExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />} onClick={handleToggleFiltersExpanded}>Más filtros</Button>
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCsv} disabled={!sortedEmpresas.length}>Exportar CSV</Button>
                    <Button variant="outlined" startIcon={<ClearAllIcon />} onClick={handleResetFilters}>Limpiar</Button>
                    <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadEmpresas} disabled={isLoading}>Recargar</Button>
                  </Stack>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField label="Buscar por nombre" variant="outlined" name="nombre" value={filters.nombre} onChange={handleFilterChange} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Buscar por nombre de proyecto" variant="outlined" name="proyectoNombre" value={filters.proyectoNombre} onChange={handleFilterChange} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Switch checked={soloClientes} onChange={handleToggleSoloClientes} color="primary" />} label={soloClientes ? 'Solo clientes' : 'Todas las empresas'} />
                  </Grid>
                </Grid>

                <Collapse in={filtersExpanded}>
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <TextField label="Razón social" variant="outlined" name="razonSocial" value={filters.razonSocial} onChange={handleFilterChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField label="CUIT" variant="outlined" name="cuit" value={filters.cuit} onChange={handleFilterChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Autocomplete
                          options={actionOptions}
                          value={filters.accion}
                          onChange={(_event, value) => setFilters((currentFilters) => ({ ...currentFilters, accion: value || '' }))}
                          renderInput={(params) => <TextField {...params} label="Acción" placeholder="Filtrar por acción" />}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Suspendida</InputLabel>
                          <Select label="Suspendida" name="suspendida" value={filters.suspendida} onChange={handleFilterChange}>
                            <MenuItem value="all">Todas</MenuItem>
                            <MenuItem value="true">Sí</MenuItem>
                            <MenuItem value="false">No</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField label="Cantidad exacta de proyectos" variant="outlined" name="proyectos" value={filters.proyectos} onChange={handleFilterChange} type="number" fullWidth />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Creada desde" value={createdFrom} onChange={setCreatedFrom} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Creada hasta" value={createdTo} onChange={setCreatedTo} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Activada desde" value={activationFrom} onChange={setActivationFrom} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Activada hasta" value={activationTo} onChange={setActivationTo} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Suspendida desde" value={suspensionFrom} onChange={setSuspensionFrom} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Suspendida hasta" value={suspensionTo} onChange={setSuspensionTo} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>

                {activeFilterChips.length ? (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={2}>
                    {activeFilterChips.map((chip) => (
                      <Chip key={chip.key} label={chip.label} onDelete={() => handleRemoveFilterChip(chip.key)} />
                    ))}
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            {selectedEmpresas.length ? (
              <Alert
                severity="warning"
                sx={{ position: 'sticky', top: 16, zIndex: 2 }}
                action={(
                  <Stack direction="row" spacing={1}>
                    <Button color="inherit" size="small" onClick={handleClearSelection}>Limpiar</Button>
                    <Button color="inherit" size="small" variant="outlined" onClick={handleOpenSelectedDelete}>Borrar seleccionadas</Button>
                  </Stack>
                )}
              >
                {selectedEmpresas.length} empresas seleccionadas.
              </Alert>
            ) : null}

            <Card>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : !sortedEmpresas.length ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>No hay empresas para los filtros actuales</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Probá limpiar filtros o desactivar Solo clientes.
                  </Typography>
                  <Button variant="outlined" onClick={handleResetFilters}>Limpiar filtros</Button>
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ maxHeight: 720 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={currentPageIds.some((id) => selectedEmpresas.includes(id)) && !currentPageIds.every((id) => selectedEmpresas.includes(id))}
                              checked={currentPageIds.length > 0 && currentPageIds.every((id) => selectedEmpresas.includes(id))}
                              onChange={handleSelectCurrentPage}
                            />
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'nombre'} direction={sortBy === 'nombre' ? sortDirection : 'asc'} onClick={() => handleRequestSort('nombre')}>
                              Nombre
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'razonSocial'} direction={sortBy === 'razonSocial' ? sortDirection : 'asc'} onClick={() => handleRequestSort('razonSocial')}>
                              Razón social
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'proyectos'} direction={sortBy === 'proyectos' ? sortDirection : 'desc'} onClick={() => handleRequestSort('proyectos')}>
                              {verticalTab === 'corralon' ? 'Sucursales' : 'Cantidad de proyectos'}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'suspendida'} direction={sortBy === 'suspendida' ? sortDirection : 'asc'} onClick={() => handleRequestSort('suspendida')}>
                              Estado
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedEmpresas.map((empresa) => (
                          <TableRow key={empresa.id} hover selected={selectedEmpresas.includes(empresa.id)}>
                            <TableCell padding="checkbox">
                              <Checkbox checked={selectedEmpresas.includes(empresa.id)} onChange={() => handleToggleSelection(empresa.id)} />
                            </TableCell>
                            <TableCell>
                              <Link href={`/empresa/?empresaId=${empresa.id}`} passHref>
                                <Typography component="a" variant="body1" sx={{ textDecoration: 'underline', color: 'primary.main', fontWeight: 600 }}>
                                  {empresa.nombre}
                                </Typography>
                              </Link>
                              <Typography variant="caption" display="block" color="text.secondary">CUIT: {empresa.cuit || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{empresa.razon_social || '—'}</Typography>
                              <Typography variant="caption" display="block" color="text.secondary">{empresa.tipo || 'Sin tipo'}</Typography>
                            </TableCell>
                            <TableCell>
                              {verticalTab === 'corralon' ? (
                                <>
                                  <Typography variant="body2">{empresa.sucursalesCount || 0}</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {(empresa.sucursalNames || []).slice(0, 2).join(', ') || 'Sin sucursales'}
                                  </Typography>
                                </>
                              ) : (
                                <>
                                  <Typography variant="body2">{empresa.proyectosIds?.length || 0}</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {(empresa.projectNames || []).slice(0, 2).join(', ') || 'Sin proyectos'}
                                  </Typography>
                                </>
                              )}
                            </TableCell>
                            <TableCell sx={{ minWidth: 240, '& .hover-actions': { opacity: 0, maxHeight: 0, overflow: 'hidden', transition: 'opacity 0.15s ease, max-height 0.15s ease, margin 0.15s ease' }, '&:hover .hover-actions': { opacity: 1, maxHeight: 80, mt: 0.5 } }}>
                              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                <Chip label={empresa.esCliente ? 'Cliente' : 'No cliente'} size="small" color={empresa.esCliente ? 'success' : 'default'} variant={empresa.esCliente ? 'filled' : 'outlined'} />
                                <Chip label={empresa.cuenta_suspendida ? 'Suspendida' : 'Activa'} size="small" color={empresa.cuenta_suspendida ? 'warning' : 'default'} variant={empresa.cuenta_suspendida ? 'filled' : 'outlined'} />
                              </Stack>
                              <Typography className="hover-actions" variant="caption" display="block" color="text.secondary">
                                Acciones: {(empresa.accionesLabels || []).join(', ') || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Borrar esta empresa">
                                  <IconButton color="error" onClick={() => handleOpenSingleDelete(empresa.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={sortedEmpresas.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Filas por página"
                  />
                </>
              )}
            </Card>

            {isDeleting ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{deleteProgress}</Typography>
                <LinearProgress />
              </Box>
            ) : null}
          </Stack>

          <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
            <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
              {alert.message}
            </Alert>
          </Snackbar>

          <CreateEmpresaDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={({ message }) => {
              setCreateDialogOpen(false);
              setAlert({ open: true, message, severity: 'success' });
              loadEmpresas();
            }}
          />

          <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} maxWidth="md" fullWidth>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Esta acción eliminará empresas, perfiles y proyectos vinculados. Revisá el impacto antes de continuar.
              </DialogContentText>
              {!infoToDelete ? (
                <CircularProgress />
              ) : (
                <Stack spacing={2}>
                  {infoToDelete.map((info) => (
                    <Card key={info.nombre} variant="outlined">
                      <CardContent>
                        <Typography variant="h6">{info.nombre}</Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1, mb: 1 }}>
                          <Chip label={`${info.profiles?.length || 0} perfiles`} size="small" color="warning" />
                          <Chip label={`${info.proyectos?.length || 0} proyectos`} size="small" color="error" />
                        </Stack>
                        {info.profiles?.length ? (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Perfiles</Typography>
                            {info.profiles.slice(0, 5).map((profile) => (
                              <Typography key={`${info.nombre}-${profile.email}-${profile.phone}`} variant="body2" color="text.secondary">
                                {profile.email || 'Sin email'} - {profile.phone || 'Sin teléfono'}
                              </Typography>
                            ))}
                          </Box>
                        ) : null}
                        {info.proyectos?.length ? (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">Proyectos</Typography>
                            {info.proyectos.slice(0, 5).map((proyecto) => (
                              <Typography key={`${info.nombre}-${proyecto.nombre}`} variant="body2" color="text.secondary">
                                {proyecto.nombre} - movimientos: {proyecto.movimientosCount}
                              </Typography>
                            ))}
                          </Box>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfirmDialog}>Cancelar</Button>
              <Button onClick={handleDeleteConfirmed} color="error" variant="contained" disabled={isDeleting || !pendingDeleteIds.length}>
                Confirmar eliminación
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </>
    </LocalizationProvider>
  );
}

EmpresasListPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EmpresasListPage;
