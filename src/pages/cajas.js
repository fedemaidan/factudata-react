import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, TextField, InputAdornment, Paper, Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, IconButton, Menu, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Tooltip, MenuItem as MenuOption, Divider, TablePagination, Drawer, List, ListItem, ListItemText, Fab, TableSortLabel, Autocomplete } from '@mui/material';

import { Checkbox, FormControlLabel, Switch, CircularProgress, Backdrop } from '@mui/material';

import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import { getProyectosFromUser, recargarProyecto, updateProyecto } from 'src/services/proyectosService';
import movimientosService from 'src/services/movimientosService';
import profileService from 'src/services/profileService';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { getEmpresaDetailsFromUser, updateEmpresaDetails } from 'src/services/empresaService';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'; 
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatTimestamp } from 'src/utils/formatters';
import { parseQueryParamList, FILTER_ARRAY_KEYS, FILTER_DATE_KEYS } from 'src/utils/parseData';
import { useMovimientosFilters } from 'src/hooks/useMovimientosFilters';
import { FilterBarCajaProyecto } from 'src/components/FilterBarCajaProyecto';
import AsistenteFlotanteProyecto from 'src/components/asistenteFlotanteProyecto';
import TransferenciaInternaDialog from 'src/components/TransferenciaInternaDialog';
import IntercambioMonedaDialog from 'src/components/IntercambioMonedaDialog';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import BulkEditDialog from 'src/components/BulkEditDialog';
import OrdenarColumnasDialog from 'src/components/OrdenarColumnasDialog';
import { getCajaColumnasConfig, applyColumnOrder, getHeaderLabel, getHeaderCellSx } from 'src/components/cajaProyecto/cajaColumnasConfig';
import CajaTablaCell from 'src/components/cajaProyecto/CajaTablaCell';
import ProyectoConfigDrawer from 'src/components/cajaProyecto/ProyectoConfigDrawer';
import ExportCsvDialog, { moveItem } from 'src/components/cajaProyecto/ExportCsvDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { buildCompletarPagoUpdateFields, puedeCompletarPagoEgreso } from 'src/utils/movimientoPagoCompleto';
import { formatCurrencyWithCode } from 'src/utils/formatters';


// tamaños mínimos por columna (px)
const COLS = {
  codigo: 120,
  proyecto: 220,
  fecha: 140,
  tipo: 120,
  obra: 200,
  cliente: 200,
  total: 160,
  subtotal: 160,
  impuestos: 160,
  montoPagado: 170,
  montoAprobado: 170,
  categoria: 160,
  subcategoria: 160,
  medioPago: 150,
  proveedor: 220,
  observacion: 160,
  detalle: 160,
  usuario: 140,
  tc: 120,
  usd: 160,
  mep: 160,
  estado: 140,
  empresaFacturacion: 200,
  facturaCliente: 140,
  fechaPago: 140,
  dolarReferencia: 140,
  totalDolar: 140,
  subtotalDolar: 140,
  tagsExtra: 180,
  acciones: 200,
};

// estilos comunes
const cellBase = { py: 0.75, px: 1, whiteSpace: 'nowrap' };
const ellipsis = (maxWidth) => ({
  ...cellBase,
  maxWidth,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const BRAND_COLORS = {
  navy: '#1E4469',
  cyan: '#23B5D3',
  teal: '#0097B2',
  mint: '#2DC197',
  cloud: '#F6F6F6',
};

const serializeFilterSet = (f) => {
  const copy = { ...f };
  delete copy.caja;
  const out = {};
  for (const [k, v] of Object.entries(copy)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (v && typeof v === 'object' && v.toDate) out[k] = v.toDate().toISOString();
    else out[k] = v;
  }
  return out;
};

const deserializeFilterSet = (stored) => {
  const out = {};
  for (const [k, v] of Object.entries(stored)) {
    if (FILTER_DATE_KEYS.includes(k) && typeof v === 'string' && v) out[k] = new Date(v);
    else if (v && typeof v === 'object' && v._seconds) out[k] = new Date(v._seconds * 1000);
    else out[k] = v;
  }
  // garantizar que los campos array siempre sean arrays (datos legados o corruptos)
  FILTER_ARRAY_KEYS.forEach((k) => {
    if (k in out && !Array.isArray(out[k])) {
      out[k] = out[k] ? [out[k]] : [];
    }
  });
  return out;
};

const parseFechaCsv = (value) => {
  if (!value) return '';
  let date;
  if (typeof value === 'object' && value.seconds != null) {
    date = new Date(value.seconds * 1000);
  } else if (typeof value === 'object' && value._seconds != null) {
    date = new Date(value._seconds * 1000);
  } else if (value?.toDate) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }
  return Number.isNaN(date?.getTime?.()) ? '' : date.toLocaleDateString('es-AR');
};

const formatCsvCell = (value) => {
  if (value === null || typeof value === 'undefined') return '';
  const normalized = String(value).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
  return /[",;]/.test(normalized) ? `"${normalized}"` : normalized;
};

const descargarArchivoCsv = (fileName, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getMovimientoCsvExportFields = () => [
  {
    key: 'id',
    label: 'ID',
    description: 'Identificador interno del movimiento',
    getValue: (mov) => mov.id || '',
  },
  {
    key: 'codigo',
    label: 'Codigo',
    description: 'Codigo de operacion visible en caja',
    getValue: (mov) => mov.codigo_operacion || mov.codigo || '',
  },
  {
    key: 'fecha',
    label: 'Fecha',
    description: 'Fecha de factura del movimiento',
    getValue: (mov) => parseFechaCsv(mov.fecha_factura),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    description: 'Ingreso o egreso',
    getValue: (mov) => mov.type || '',
  },
  {
    key: 'monedaOriginal',
    label: 'Moneda_Original',
    description: 'Moneda original del comprobante',
    getValue: (mov) => mov.moneda || '',
  },
  {
    key: 'totalOriginal',
    label: 'Total_Original',
    description: 'Total en la moneda original',
    getValue: (mov) => mov.total || 0,
  },
  {
    key: 'proveedor',
    label: 'Proveedor',
    description: 'Proveedor o contraparte',
    getValue: (mov) => mov.nombre_proveedor || '',
  },
  {
    key: 'categoria',
    label: 'Categoria',
    description: 'Categoria contable',
    getValue: (mov) => mov.categoria || '',
  },
  {
    key: 'medioPago',
    label: 'Medio_Pago',
    description: 'Medio de pago registrado',
    getValue: (mov) => mov.medio_pago || '',
  },
  {
    key: 'estado',
    label: 'Estado',
    description: 'Estado actual del movimiento',
    getValue: (mov) => mov.estado || '',
  },
  {
    key: 'usdBlue',
    label: 'USD_Blue',
    description: 'Equivalencia a USD blue',
    getValue: (mov) => mov.equivalencias?.total?.usd_blue ?? 'N/A',
  },
  {
    key: 'usdOficial',
    label: 'USD_Oficial',
    description: 'Equivalencia a USD oficial',
    getValue: (mov) => mov.equivalencias?.total?.usd_oficial ?? 'N/A',
  },
  {
    key: 'usdMepMedio',
    label: 'USD_MEP_Medio',
    description: 'Equivalencia a USD MEP medio',
    getValue: (mov) => mov.equivalencias?.total?.usd_mep_medio ?? 'N/A',
  },
  {
    key: 'tieneEquivalencias',
    label: 'Tiene_Equivalencias',
    description: 'Indica si el movimiento tiene equivalencias calculadas',
    getValue: (mov) => (mov.equivalencias ? 'SI' : 'NO'),
  },
  {
    key: 'proyecto',
    label: 'Proyecto',
    description: 'Proyecto asociado al movimiento',
    getValue: (mov) => mov.proyecto_nombre || '',
  },
  {
    key: 'tcEjecutado',
    label: 'TC_Ejecutado',
    description: 'Tipo de cambio ejecutado',
    getValue: (mov) => mov.tc ?? 'N/A',
  },
  {
    key: 'ratioUsdBlue',
    label: 'Ratio_USD_Blue_vs_Original',
    description: 'Relacion entre USD blue y total original',
    getValue: (mov) => {
      const usdBlue = mov.equivalencias?.total?.usd_blue;
      const total = Number(mov.total) || 0;
      return usdBlue && total > 0 ? (usdBlue / total).toFixed(4) : 'N/A';
    },
  },
  {
    key: 'observacion',
    label: 'Observacion',
    description: 'Observacion cargada en el movimiento',
    getValue: (mov) => mov.observacion || '',
  },
];

const EMPTY_CAJA_TOTALS = {
  count: 0,
  currencies: {
    ARS: { ingreso: 0, egreso: 0, neto: 0, totalPeriodo: 0 },
    USD: { ingreso: 0, egreso: 0, neto: 0, totalPeriodo: 0 },
  },
  equivalencias: {
    usd_blue: { ingreso: 0, egreso: 0, neto: 0 },
    usd_oficial: { ingreso: 0, egreso: 0, neto: 0 },
    usd_mep_medio: { ingreso: 0, egreso: 0, neto: 0 },
  },
};

const SORTABLE_COLUMN_MAP = {
  codigo: 'codigo_operacion',
  proyecto: 'proyecto_nombre',
  fechas: 'fecha_factura',
  fechaFactura: 'fecha_factura',
  fechaCreacion: 'fecha_creacion',
  tipo: 'type',
  total: 'total',
  montoPagado: 'monto_pagado',
  montoAprobado: 'monto_aprobado',
  categoria: 'categoria',
  subcategoria: 'subcategoria',
  medioPago: 'medio_pago',
  proveedor: 'proveedor',
  obra: 'obra',
  cliente: 'cliente',
  observacion: 'observacion',
  detalle: 'detalle',
  usuario: 'nombre_user',
  tc: 'tc',
  usd: 'usd_blue',
  mep: 'usd_mep_medio',
  estado: 'estado',
  empresaFacturacion: 'empresa_facturacion',
  facturaCliente: 'factura_cliente',
  fechaPago: 'fecha_pago',
  tagsExtra: 'tags_sort',
  dolarReferencia: 'dolar_referencia',
  totalDolar: 'total_dolar',
  subtotalDolar: 'subtotal_dolar',
};

const getSortFieldForColumn = (columnKey) => SORTABLE_COLUMN_MAP[columnKey] || null;
const getColumnKeyForSortField = (sortField) => (
  Object.entries(SORTABLE_COLUMN_MAP).find(([, field]) => field === sortField)?.[0]
  || sortField
  || 'fechaFactura'
);
const getSortDirectionForFilters = (filters) => (filters?.ordenarDir === 'asc' ? 'asc' : 'desc');

const CAJAS_UI_PREFS_STORAGE_KEY = 'cajas-ui-prefs-v1';

const readCajasLocalPrefs = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CAJAS_UI_PREFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCajasLocalPrefs = (prefs) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CAJAS_UI_PREFS_STORAGE_KEY, JSON.stringify(prefs));
};

// parseListParam es un alias de la utilidad compartida (evita romper las llamadas existentes)
const parseListParam = parseQueryParamList;

const flattenDashboardItems = (items = []) => items.flatMap((item) => {
  if (item?.tipo === 'grupo_prorrateo') return item.movimientos || [];
  return item?.data ? [item.data] : [];
});

const formatFilterDateParam = (value) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const buildCajaDashboardParams = ({ filters, caja, page, limit, includeOptions = false }) => {
  const params = {};

  const assignArray = (key, value) => {
    if (Array.isArray(value) && value.length > 0) params[key] = value.join(',');
  };

  if (typeof page === 'number') params.page = page + 1;
  if (typeof limit === 'number') params.limit = limit;
  params.includeOptions = includeOptions ? 'true' : 'false';

  const sortField = getSortFieldForColumn(filters?.ordenarPor) || filters?.ordenarPor || 'fecha_factura';
  params.sort = sortField;
  params.order = getSortDirectionForFilters(filters);

  if ((filters?.palabras?.trim()?.length ?? 0) >= 2) params.palabras = filters.palabras.trim();
  if (filters?.observacion?.trim()) params.observacion = filters.observacion.trim();
  if (filters?.codigoSync?.trim()) params.codigoSync = filters.codigoSync.trim();
  if (filters?.aprobacion) params.aprobacion = filters.aprobacion;
  assignArray('categorias', filters?.categorias);
  assignArray('subcategorias', filters?.subcategorias);
  assignArray('proveedores', filters?.proveedores);
  assignArray('medioPago', filters?.medioPago);
  assignArray('tipo', filters?.tipo);
  assignArray('moneda', filters?.moneda);
  assignArray('etapa', filters?.etapa);
  assignArray('estados', filters?.estados);
  assignArray('cuentaInterna', filters?.cuentaInterna);
  assignArray('tagsExtra', filters?.tagsExtra);
  assignArray('empresaFacturacion', filters?.empresaFacturacion);

  if (filters?.montoMin !== '' && filters?.montoMin != null) params.montoMin = filters.montoMin;
  if (filters?.montoMax !== '' && filters?.montoMax != null) params.montoMax = filters.montoMax;

  const fechaDesde = formatFilterDateParam(filters?.fechaDesde);
  const fechaHasta = formatFilterDateParam(filters?.fechaHasta);
  const fechaPagoDesde = formatFilterDateParam(filters?.fechaPagoDesde);
  const fechaPagoHasta = formatFilterDateParam(filters?.fechaPagoHasta);
  if (fechaDesde) params.fechaDesde = fechaDesde;
  if (fechaHasta) params.fechaHasta = fechaHasta;
  if (fechaPagoDesde) params.fechaPagoDesde = fechaPagoDesde;
  if (fechaPagoHasta) params.fechaPagoHasta = fechaPagoHasta;

  if (filters?.facturaCliente) params.facturaCliente = filters.facturaCliente;

  if (caja?.moneda) params.cajaMoneda = caja.moneda;
  if (caja?.medio_pago) params.cajaMedioPago = caja.medio_pago;
  if (caja?.estado) params.cajaEstado = caja.estado;
  if (caja?.type) params.cajaTipo = caja.type;

  return params;
};

const getCajaTotalsKey = (caja) => JSON.stringify({
  nombre: caja?.nombre || '',
  moneda: caja?.moneda || '',
  medio_pago: caja?.medio_pago || '',
  estado: caja?.estado || '',
  type: caja?.type || '',
  equivalencia: caja?.equivalencia || 'none',
});

const getCajaNetFromTotals = (caja, totals = EMPTY_CAJA_TOTALS) => {
  const equivalencia = caja?.equivalencia || 'none';
  if (equivalencia !== 'none') {
    return totals?.equivalencias?.[equivalencia]?.neto || 0;
  }
  const moneda = (caja?.moneda || 'ARS').toUpperCase();
  return totals?.currencies?.[moneda]?.neto || 0;
};

const updateDashboardItemsByMovimientoId = (items, movimientoId, updater) => (
  (items || []).map((item) => {
    if (item?.tipo === 'grupo_prorrateo') {
      return {
        ...item,
        movimientos: (item.movimientos || []).map((mov) => (
          mov.id === movimientoId ? updater(mov) : mov
        )),
      };
    }
    if (item?.data?.id === movimientoId) {
      return { ...item, data: updater(item.data) };
    }
    return item;
  })
);

const getCajaAccent = (caja, amount) => {
  if (caja?.equivalencia && caja.equivalencia !== 'none') {
    return {
      color: BRAND_COLORS.teal,
      borderColor: BRAND_COLORS.teal,
      bg: `linear-gradient(180deg, ${BRAND_COLORS.cloud}, rgba(255,255,255,0.98))`,
      Icon: CurrencyExchangeIcon,
    };
  }

  if ((caja?.moneda || '').toUpperCase() === 'USD') {
    return {
      color: BRAND_COLORS.cyan,
      borderColor: BRAND_COLORS.cyan,
      bg: `linear-gradient(180deg, rgba(35,181,211,0.10), rgba(255,255,255,0.98))`,
      Icon: PaymentsOutlinedIcon,
    };
  }

  return {
    color: amount >= 0 ? BRAND_COLORS.mint : BRAND_COLORS.navy,
    borderColor: amount >= 0 ? BRAND_COLORS.mint : BRAND_COLORS.navy,
    bg: amount >= 0
      ? `linear-gradient(180deg, rgba(45,193,151,0.10), rgba(255,255,255,0.98))`
      : `linear-gradient(180deg, rgba(30,68,105,0.08), rgba(255,255,255,0.98))`,
    Icon: AccountBalanceWalletIcon,
  };
};


const TotalesFiltrados = ({ t, fmt, moneda, totalesFormat = 'full', showUsdBlue = false, usdBlue = null, chips = [], onOpenFilters, isMobile = false, showDetails = false, onToggleDetails, baseCalculo = 'total' }) => {
  const up = (moneda || '').toUpperCase();
  const ingreso = t[up]?.ingreso ?? 0;
  const egreso  = t[up]?.egreso  ?? 0;
  const neto    = ingreso - egreso;
  const totalPeriodo = ingreso + egreso;

  const abbreviateAmount = (currencyCode, amount) => {
    const absVal = Math.abs(amount);
    const sign = amount < 0 ? '–' : '';
    const currencySymbol = currencyCode === 'USD' ? 'US$' : '$';
    if (absVal >= 1_000_000) {
      const m = absVal / 1_000_000;
      const formatted = m >= 100
        ? m.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : m.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `${sign}${currencySymbol} ${formatted}M`;
    }
    if (absVal >= 1_000) {
      const k = absVal / 1_000;
      const formatted = k.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `${sign}${currencySymbol} ${formatted}K`;
    }
    return fmt(currencyCode, amount);
  };

  const formatTotalValue = (currencyCode, amount) => {
    if (totalesFormat === 'rounded') {
      return Math.round(amount).toLocaleString('es-AR', {
        style: 'currency',
        currency: currencyCode === 'USD' ? 'USD' : 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    if (totalesFormat === 'abbreviated') return abbreviateAmount(currencyCode, amount);
    return fmt(currencyCode, amount);
  };

  const deltaItems = [
    { label: 'Ingresos', value: formatTotalValue(up, ingreso), color: 'success.main', Icon: NorthEastRoundedIcon },
    { label: 'Egresos',  value: formatTotalValue(up, egreso),  color: 'error.main',   Icon: SouthWestRoundedIcon },
  ];
  const netoDisplay = formatTotalValue(up, neto);

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ flexWrap: 'nowrap' }}>
        <Box
          sx={{
            p: { xs: 2.25, lg: 1.5 },
            borderRadius: 3,
            width: { xs: '100%', lg: '30%' },
            minWidth: { xs: '100%', lg: '30%' },
            maxWidth: { xs: '100%', lg: '30%' },
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 18px 40px rgba(30, 68, 105, 0.08)',
            backgroundImage: `linear-gradient(180deg, ${BRAND_COLORS.cloud}, rgba(255,255,255,0.98))`,
            minHeight: { xs: 'auto', lg: 126 },
            display: 'flex',
          }}
        >
          <Stack spacing={{ xs: 2, lg: 1.25 }} sx={{ width: '100%' }}>
            {/* Título con moneda integrada */}
            <Typography sx={{ fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND_COLORS.teal, whiteSpace: 'nowrap', lineHeight: 1.05 }}>
              Totales filtrados{baseCalculo === 'subtotal' ? ' (neto)' : ''}&nbsp;·&nbsp;{up}
            </Typography>

            {/* Layout flat: neto a la izquierda, ing/egr a la derecha — sin sub-tarjetas */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' },
                gap: { xs: 2, lg: 0 },
                width: '100%',
              }}
            >
              {/* Neto filtrado — flat, sin borde propio */}
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pr: { lg: 2 }, borderRight: { lg: `1px solid rgba(0,0,0,0.08)` } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>
                  Neto filtrado
                </Typography>
                <Typography sx={{ fontWeight: 800, lineHeight: 1.05, color: neto >= 0 ? 'success.main' : 'error.main', fontSize: { xs: '1.9rem', lg: '1.45rem' }, whiteSpace: 'nowrap' }}>
                  {netoDisplay}
                </Typography>
              </Box>

              {/* Ingresos + Egresos — flat, separados solo por un divisor */}
              <Stack
                divider={<Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', mx: { lg: 1 } }} />}
                sx={{ width: '100%', pl: { lg: 2 } }}
              >
                {deltaItems.map(({ label, value, color, Icon }) => (
                  <Box
                    key={label}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      py: 0.6,
                      width: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mb: 0.3 }}>
                      <Icon sx={{ fontSize: 13, color, flexShrink: 0 }} />
                      <Typography sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, color: 'text.secondary', fontSize: '0.6rem', lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {label}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 800, color, fontSize: { xs: '1rem', lg: '0.78rem' }, lineHeight: 1.15 }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {chips.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Filtros activos
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, maxWidth: isMobile ? 220 : 'none', overflowX: isMobile ? 'auto' : 'visible' }}>
                  {chips.map((chip, idx) => (
                    <Chip
                      key={`${chip.label}-${idx}`}
                      label={chip.label}
                      onDelete={(e) => { e.stopPropagation(); chip.onDelete(); }}
                      onClick={() => onOpenFilters?.()}
                      size="small"
                      variant="outlined"
                      clickable
                      sx={{ bgcolor: 'rgba(255,255,255,0.92)' }}
                    />
                  ))}
                </Box>
              </Stack>
            )}

            {isMobile && (
              <Button size="small" variant="text" onClick={onToggleDetails} sx={{ alignSelf: 'flex-start' }}>
                {showDetails ? 'Ocultar detalle' : 'Ver detalle'}
              </Button>
            )}
          </Stack>
        </Box>

        {showUsdBlue && usdBlue && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              flex: 0.9,
              minWidth: 260,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 18px 40px rgba(91, 84, 165, 0.06)',
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: BRAND_COLORS.teal, mb: 1 }}>
              Totales USD blue
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: (usdBlue.neto ?? 0) >= 0 ? 'success.main' : 'error.main', mb: 1.25 }}>
              {fmt('USD', usdBlue.neto)}
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>
                + {fmt('USD', usdBlue.ingreso)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                - {fmt('USD', usdBlue.egreso)}
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>

      {isMobile && showDetails && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Typography sx={{ color: 'success.main', fontWeight: 700 }}>
            + {fmt(up, ingreso)}
          </Typography>
          <Typography sx={{ color: 'error.main', fontWeight: 700 }}>
            - {fmt(up, egreso)}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
};





const CajasPage = () => {
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const authUserUid = user?.user_id || user?.uid || null;
  // Ref estable para acceder al user actual sin re-disparar effects
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const [dashboardItems, setDashboardItems] = useState([]);
  const [dashboardTotals, setDashboardTotals] = useState(EMPTY_CAJA_TOTALS);
  const [dashboardPagination, setDashboardPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [backendOptions, setBackendOptions] = useState(null);
  const [cajasTotalsMap, setCajasTotalsMap] = useState({});
  const [tablaActiva, setTablaActiva] = useState('ARS');
  const [empresa, setEmpresa] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState(true);
  const [accionesActivas, setAccionesActivas] = useState(false);
  const [showDolar, setShowDolar] = useState(true);
  const [showPesos, setShowPesos] = useState(true);
  const [proyecto, setProyecto] = useState(null);
  const [projectScopeMode, setProjectScopeMode] = useState('all');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [deletingElement, setDeletingElement] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [movimientoAEliminar, setMovimientoAEliminar] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [openTransferencia, setOpenTransferencia] = useState(false);
  const [openIntercambio, setOpenIntercambio] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const router = useRouter();
  const { proyectoId: queryProyectoId, proyectoIds: queryProyectoIds } = router.query;
  // Ref para leer los params del router dentro de effects sin convertirlos en deps reactivas.
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const selectedProjects = useMemo(
    () => proyectos.filter((item) => selectedProjectIds.includes(item.id)),
    [proyectos, selectedProjectIds]
  );
  const availableProjectIds = useMemo(
    () => proyectos.map((item) => item.id).filter(Boolean),
    [proyectos]
  );
  const scopeProjectIds = useMemo(
    () => (
      projectScopeMode === 'all'
        ? availableProjectIds
        : selectedProjectIds.filter((id) => availableProjectIds.includes(id))
    ),
    [availableProjectIds, projectScopeMode, selectedProjectIds]
  );
  const scopeProjectIdsKey = useMemo(() => scopeProjectIds.join(','), [scopeProjectIds]);
  const activeProjectId = useMemo(
    () => (projectScopeMode === 'selection' && selectedProjectIds.length === 1 ? selectedProjectIds[0] : null),
    [projectScopeMode, selectedProjectIds]
  );
  const activeProject = useMemo(
    () => proyectos.find((item) => item.id === activeProjectId) || null,
    [proyectos, activeProjectId]
  );
  const scopeSummary = useMemo(() => {
    if (activeProject) return activeProject.nombre;
    if (projectScopeMode === 'all') return 'Todos los proyectos';
    if (selectedProjects.length === 0) return 'Sin proyectos seleccionados';
    return `${selectedProjects.length} proyectos seleccionados`;
  }, [activeProject, projectScopeMode, selectedProjects.length]);
  const scopeStorageKey = useMemo(() => {
    if (projectScopeMode === 'all') return `cajas-${empresa?.id || 'global'}-all`;
    const ids = [...selectedProjectIds].sort().join('-') || 'none';
    return `cajas-${empresa?.id || 'global'}-${ids}`;
  }, [empresa?.id, projectScopeMode, selectedProjectIds]);
  const canUseProjectActions = Boolean(activeProject?.id);

  useEffect(() => {
    if (!router.isReady) return;
    const nextQuery = { ...router.query };
    delete nextQuery.proyectoId;
    delete nextQuery.proyectoIds;

    if (projectScopeMode === 'selection') {
      if (selectedProjectIds.length === 1) {
        nextQuery.proyectoId = selectedProjectIds[0];
      } else if (selectedProjectIds.length > 1) {
        nextQuery.proyectoIds = selectedProjectIds.join(',');
      }
    }

    const currentSingle = typeof router.query.proyectoId === 'string' ? router.query.proyectoId : '';
    const currentMulti = typeof router.query.proyectoIds === 'string' ? router.query.proyectoIds : '';
    const nextSingle = typeof nextQuery.proyectoId === 'string' ? nextQuery.proyectoId : '';
    const nextMulti = typeof nextQuery.proyectoIds === 'string' ? nextQuery.proyectoIds : '';

    if (currentSingle === nextSingle && currentMulti === nextMulti) return;

    router.replace({ pathname: '/cajas', query: nextQuery }, undefined, { shallow: true });
  }, [projectScopeMode, router, selectedProjectIds]);

  // Setear breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Proyectos', href: '/vistaResumen', icon: <FolderIcon fontSize="small" /> },
      { label: 'Cajas', href: '/cajas', icon: <AccountBalanceWalletIcon fontSize="small" /> },
      { label: scopeSummary, icon: <FolderIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [scopeSummary, setBreadcrumbs]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [cajasVirtuales, setCajasVirtuales] = useState([
    { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
    { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
    { nombre: 'Gastos en USD Blue', moneda: 'ARS', medio_pago: "" , equivalencia: 'usd_blue', type: 'egreso', baseCalculo: 'total' },
  ]);  
  const [showCrearCaja, setShowCrearCaja] = useState(false);
  const [nombreCaja, setNombreCaja] = useState('');
  const [monedaCaja, setMonedaCaja] = useState('ARS');
  const [estadoCaja, setEstadoCaja] = useState('');
  const [medioPagoCaja, setMedioPagoCaja] = useState('Efectivo');
  const [equivalenciaCaja, setEquivalenciaCaja] = useState('none'); // 'none' | 'usd_blue' | ...
  const [editandoCaja, setEditandoCaja] = useState(null); // null o index de la caja
  // cajaSeleccionada eliminado: filters.caja es la única fuente de verdad
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [savingCols, setSavingCols] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // opcional: feedback breve
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [detalleMov, setDetalleMov] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showTotalsDetails, setShowTotalsDetails] = useState(false);
  const [mobileActionAnchor, setMobileActionAnchor] = useState(null);
  const [mobileActionMov, setMobileActionMov] = useState(null);
  const [comentarioInput, setComentarioInput] = useState('');
  const [comentarioLoading, setComentarioLoading] = useState(false);
  const [comentarioError, setComentarioError] = useState(null);
  const [usuariosComentariosMap, setUsuariosComentariosMap] = useState({});
  const fetchedUserIdsRef = useRef(new Set());
  const [showCajasMobile, setShowCajasMobile] = useState(true);
  // ── Selección masiva ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvSelectedFields, setCsvSelectedFields] = useState([]);
  const [csvFieldOrder, setCsvFieldOrder] = useState([]);
  const [csvConfigHydrated, setCsvConfigHydrated] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);
  const [confirmarPagoMov, setConfirmarPagoMov] = useState(null);
  const [confirmarPagoLoading, setConfirmarPagoLoading] = useState(false);
  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });
  const openMobileActions = (event, mov) => {
    setMobileActionAnchor(event.currentTarget);
    setMobileActionMov(mov);
  };
  const closeMobileActions = () => {
    setMobileActionAnchor(null);
    setMobileActionMov(null);
  };
  
  const [anchorCajaEl, setAnchorCajaEl] = useState(null);
  const [cajaMenuIndex, setCajaMenuIndex] = useState(null);
  // ---- Columnas visibles + modo compacto ----
const [compactCols, setCompactCols] = useState(true);
const [viewConfigOpen, setViewConfigOpen] = useState(false);
const [columnasOrden, setColumnasOrden] = useState([]);
// 'full' | 'abbreviated' | 'rounded'
const [totalesFormat, setTotalesFormat] = useState('full');

// --- helpers de scroll horizontal ---
const scrollRef = useRef(null);      // contenedor principal con overflow
const topScrollRef = useRef(null);   // barra superior "fantasma"
const tableRef = useRef(null);
const [typeCaja, setTypeCaja] = useState(''); // '' | 'ingreso' | 'egreso'
const [baseCalculoCaja, setBaseCalculoCaja] = useState('total');
const [savedViewMode, setSavedViewMode] = useState(false);

const [atEdges, setAtEdges] = useState({ left: true, right: false });
const [atStart, setAtStart] = useState(true);
const [atEnd, setAtEnd] = useState(false);
const [coachOpen, setCoachOpen] = useState(true); // se muestra en cada mount
const [topWidth, setTopWidth] = useState(0);
// --- paginación ---
const [page, setPage] = useState(0);           // página actual (0-based)
const [rowsPerPage, setRowsPerPage] = useState(25);  // filas por página

const csvExportFields = useMemo(() => getMovimientoCsvExportFields(), []);
const csvDefaultOrder = useMemo(() => csvExportFields.map((field) => field.key), [csvExportFields]);

 // helper: metadatos de equivalencias (moneda objetivo y path en mov.equivalencias)
 const EQUIV_META = {
   none:        { out: null,        path: null },                          // usa mov.total
   usd_blue:    { out: 'USD',       path: (e) => e?.total?.usd_blue },
   usd_oficial: { out: 'USD',       path: (e) => e?.total?.usd_oficial },  // si lo tenés
   usd_mep_medio: { out: 'USD',     path: (e) => e?.total?.usd_mep_medio },  // si lo tenés
   ars_oficial: { out: 'ARS',       path: (e) => e?.total?.ars_oficial },
   cac:         { out: 'ARS',       path: (e) => e?.total?.cac },          // ej. si calculás CAC a ARS
 };

// handlers
const handleChangePage = (_evt, newPage) => {
  setPage(newPage);
  // opcional: scrollear al tope de la tabla
  scrollRef.current?.scrollTo?.({ top: 0 });
};

const handleChangeRowsPerPage = (evt) => {
  const value = parseInt(evt.target.value, 10);
  setRowsPerPage(value);
  setPage(0);
};

const getMax = () => {
  const el = scrollRef.current; // el que realmente scrollea
  if (!el) return 0;
  return Math.max(0, el.scrollWidth - el.clientWidth);
};

useEffect(() => {
  if (csvConfigHydrated || csvDefaultOrder.length === 0) return;
  setCsvSelectedFields(csvDefaultOrder);
  setCsvFieldOrder(csvDefaultOrder);
  setCsvConfigHydrated(true);
}, [csvConfigHydrated, csvDefaultOrder]);


useEffect(() => {
  const cont = scrollRef.current;
  const table = tableRef.current;
  const top   = topScrollRef.current;
  if (!cont || !table || !top) return;

  const compute = () => {
    // Forzamos overflow real arriba
    setTopWidth(Math.max(table.scrollWidth, cont.clientWidth + 32));

    const max = getMax();
    const sl  = cont.scrollLeft;

    setAtStart(sl <= 0);
    setAtEnd(sl >= max - 1 || max <= 0);

    if (top.scrollLeft !== sl) top.scrollLeft = sl;
  };

  const onContScroll = () => compute();

  cont.addEventListener('scroll', onContScroll, { passive: true });

  const roCont  = new ResizeObserver(compute);
  const roTable = new ResizeObserver(compute);
  roCont.observe(cont);
  roTable.observe(table);

  requestAnimationFrame(compute);
  return () => {
    cont.removeEventListener('scroll', onContScroll);
    roCont.disconnect();
    roTable.disconnect();
  };
}, []);


const scrollByStep = (dir) => {
  const el = scrollRef.current;
  const table = tableRef.current;
  if (!el || !table) return;

  const max  = getMax();  // <- unificado
  const step = Math.max(240, Math.round(el.clientWidth * 0.8));
  let next   = dir === 'left'
    ? Math.max(0, el.scrollLeft - step)
    : Math.min(max, el.scrollLeft + step);

  // Snap a los extremos si quedamos muy cerca
  const snap = 16;
  if (dir === 'right' && max - next < snap) next = max;
  if (dir === 'left'  && next < snap)       next = 0;

  el.scrollTo({ left: next, behavior: 'smooth' });
};

const handleSaveCols = async () => {
    try {
      setSavingCols(true);
      const nextPrefs = {
        compact: compactCols,
        visible: visibleCols,
        orden: columnasOrden,
      };
      if (activeProject?.id) {
        const updatedProject = {
          ...activeProject,
          ui_prefs: {
            ...(activeProject.ui_prefs || {}),
            columnas: nextPrefs,
          },
        };
        await updateProyecto(activeProject.id, {
          ...updatedProject,
        });
        setProyectos((prev) => prev.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
      } else {
        writeCajasLocalPrefs(nextPrefs);
      }
      setSaveMsg('Configuración guardada');
    } catch (e) {
      setSaveMsg('No se pudo guardar');
    } finally {
      setSavingCols(false);
    }
  };

  const buildDefaultVisible = useCallback((compactValue, showProyectoCol) => ({
    codigo: true,
    proyecto: showProyectoCol,
    fechas: true,
    fechaFactura: !compactValue,
    fechaCreacion: !compactValue,
    tipo: !compactValue,
    total: true,
    montoPagado: false,
    montoAprobado: false,
    categoria: true,
    subcategoria: !compactValue && !!empresa?.comprobante_info?.subcategoria,
    medioPago: !!empresa?.comprobante_info?.medio_pago,
    proveedor: true,
    obra: false,
    cliente: false,
    observacion: true,
    detalle: !!empresa?.comprobante_info?.detalle,
    usuario: false,
    tc: false,
    usd: true,
    mep: false,
    estado: !!empresa?.con_estados,
    acciones: true,
    empresaFacturacion: false,
    facturaCliente: !!empresa?.comprobante_info?.factura_cliente,
    fechaPago: false,
    dolarReferencia: false,
    totalDolar: false,
    subtotalDolar: false,
    subtotal: false,
    impuestos: false,
    tagsExtra: false,
  }), [empresa]);

  const defaultVisible = useMemo(
    () => buildDefaultVisible(compactCols, !activeProjectId),
    [activeProjectId, buildDefaultVisible, compactCols]
  );
  

const [visibleCols, setVisibleCols] = useState(defaultVisible);
const hiddenColsCount = useMemo(() => Object.values(visibleCols).filter((v) => !v).length, [visibleCols]);

const applyPreset = (preset) => {
  const base = { ...defaultVisible };
  if (preset === 'finanzas') {
    setVisibleCols({
      ...base,
      codigo: true,
      fechas: true,
      total: true,
      montoAprobado: true,
      categoria: true,
      subcategoria: !!empresa?.comprobante_info?.subcategoria,
      medioPago: !!empresa?.comprobante_info?.medio_pago,
      proveedor: true,
      estado: !!empresa?.con_estados,
      empresaFacturacion: !!empresa?.comprobante_info?.empresa_facturacion,
      facturaCliente: !!empresa?.comprobante_info?.factura_cliente,
      observacion: false,
      detalle: !!empresa?.comprobante_info?.detalle,
    });
  }
  if (preset === 'operativo') {
    setVisibleCols({
      ...base,
      codigo: true,
      fechas: true,
      tipo: !compactCols,
      proveedor: true,
      obra: true,
      cliente: true,
      observacion: true,
      detalle: !!empresa?.comprobante_info?.detalle,
      medioPago: !!empresa?.comprobante_info?.medio_pago,
      estado: !!empresa?.con_estados,
    });
  }
  if (preset === 'auditoria') {
    setVisibleCols({
      ...base,
      codigo: true,
      fechas: true,
      fechaFactura: true,
      fechaCreacion: true,
      tipo: true,
      total: true,
      montoAprobado: true,
      categoria: true,
      subcategoria: !!empresa?.comprobante_info?.subcategoria,
      medioPago: !!empresa?.comprobante_info?.medio_pago,
      proveedor: true,
      estado: !!empresa?.con_estados,
      empresaFacturacion: !!empresa?.comprobante_info?.empresa_facturacion,
      facturaCliente: !!empresa?.comprobante_info?.factura_cliente,
      tc: true,
      usd: true,
      mep: true,
      fechaPago: !!empresa?.comprobante_info?.fecha_pago,
      detalle: !!empresa?.comprobante_info?.detalle,
    });
  }
  if (preset === 'reset') {
    setVisibleCols(defaultVisible);
  }
};

// si todavía no hidratamos desde el proyecto, aplicamos defaults
useEffect(() => {
  if (!prefsHydrated) {
    setVisibleCols(defaultVisible);
  }
}, [defaultVisible, prefsHydrated]);

const toggleCol = (key) => {
  setVisibleCols((v) => ({ ...v, [key]: !v[key] }));
};

const handleOpenViewConfig = () => setViewConfigOpen(true);
const handleCloseViewConfig = () => setViewConfigOpen(false);

const handleOrdenColumnasChange = async (nuevoOrden) => {
  setColumnasOrden(nuevoOrden);
  if (activeProject?.id) {
    try {
      const updatedProject = {
        ...activeProject,
        ui_prefs: {
          ...(activeProject.ui_prefs || {}),
          columnas: {
            ...(activeProject.ui_prefs?.columnas || {}),
            compact: compactCols,
            visible: visibleCols,
            orden: nuevoOrden,
          },
        },
      };
      await updateProyecto(activeProject.id, {
        ...updatedProject,
      });
      setProyectos((prev) => prev.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
    } catch (e) {
      setAlert((prev) => ({ ...prev, open: true, message: 'No se pudo guardar el orden', severity: 'error' }));
    }
  } else {
    writeCajasLocalPrefs({
      ...(readCajasLocalPrefs() || {}),
      compact: compactCols,
      visible: visibleCols,
      orden: nuevoOrden,
    });
  }
};


  const {
    filters,
    setFilters,
    options: hookOptions,
    movimientosFiltrados: movimientosFiltradosLocal,
    totales: totalesLocal
  } = useMovimientosFilters({
    empresaId: empresa?.id,
    proyectoId: activeProjectId,
    movimientos: [],
    movimientosUSD: [],
    cajaSeleccionada: null, // La caja vive en filters.caja; este param solo afecta el filtrado local (no usado)
  });

  const options = backendOptions || hookOptions;
  const movimientosFiltrados = useMemo(() => flattenDashboardItems(dashboardItems), [dashboardItems]);
  const activeSortField = getColumnKeyForSortField(filters?.ordenarPor);
  const activeSortDirection = getSortDirectionForFilters(filters);

  const handleSortByColumn = useCallback((columnKey) => {
    const sortField = getSortFieldForColumn(columnKey);
    if (!sortField) return;

    setFilters((prev) => {
      const sameColumn = prev.ordenarPor === columnKey;
      return {
        ...prev,
        ordenarPor: columnKey,
        ordenarDir: sameColumn && prev.ordenarDir === 'asc' ? 'desc' : 'asc',
      };
    });
    setPage(0);
  }, [setFilters]);

  const columnasConfig = useMemo(
    () => getCajaColumnasConfig(visibleCols, compactCols, empresa, options),
    [visibleCols, compactCols, empresa, options]
  );
  const columnasFiltradas = useMemo(
    () => applyColumnOrder(columnasConfig, columnasOrden),
    [columnasConfig, columnasOrden]
  );

  const handleOpenCajaMenu = (event, index) => {
    setAnchorCajaEl(event.currentTarget);
    setCajaMenuIndex(index);
  };
  
  const handleCloseCajaMenu = () => {
    setAnchorCajaEl(null);
    setCajaMenuIndex(null);
  };
  
  const handleEditarCaja = (index) => {
    const caja = cajasVirtuales[index];
    setEditandoCaja(index);
    setNombreCaja(caja.nombre);
    setMonedaCaja(caja.moneda);
    setMedioPagoCaja(caja.medio_pago || '');
    setShowCrearCaja(true);
    setTypeCaja(caja.type || '');
    setEstadoCaja(caja.estado || '');
    setBaseCalculoCaja(caja.baseCalculo || 'total');
    handleCloseCajaMenu();
    setEquivalenciaCaja(caja.equivalencia || 'none');
  };

  const applyCajaSelection = useCallback((caja) => {
    if (caja?.filterSet) {
      const restoredFilters = deserializeFilterSet(caja.filterSet);
      setFilters((f) => ({ ...f, ...restoredFilters, caja }));
    } else {
      setFilters((f) => ({ ...f, caja: caja || null }));
    }
  }, [setFilters]);
  
  const handleEliminarCaja = (index) => {
    const nuevas = cajasVirtuales.filter((_, i) => i !== index);
    setCajasVirtuales(nuevas);
    updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevas });
    // Comparar por nombre porque filters.caja puede ser un objeto rehidratado (nueva referencia)
    if (filters.caja?.nombre === cajasVirtuales[index]?.nombre) {
      const fallback = nuevas[0] || null;
      applyCajaSelection(fallback);
    }
    handleCloseCajaMenu();
  };
  
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const handleRecargarProyecto = async (proyecto_id) => {
    const resultado = await recargarProyecto(proyecto_id);
    if (resultado) {
      setAlert({
        open: true,
        message: 'Sheets recalculados con éxito',
        severity: 'success',
      });
    } else {
      setAlert({
        open: true,
        message: 'Error al recalcular sheets',
        severity: 'error',
      });
    }
  };

  const handleFiltrosActivos = () => {
    setFiltersOpen(true);
    handleCloseMenu();
  };

  const formatCajaAmount = (caja, amount) => {
    const meta = EQUIV_META[caja.equivalencia || 'none'] || EQUIV_META.none;
    const out = (caja.equivalencia && caja.equivalencia !== 'none')
      ? (meta.out || 'ARS')
      : (caja.moneda || 'ARS');
    const currency = out.toUpperCase() === 'USD' ? 'USD' : 'ARS';
    const val = amount ?? 0;

    if (totalesFormat === 'abbreviated') {
      const absVal = Math.abs(val);
      const sign = val < 0 ? '–' : '';
      const sym = currency === 'USD' ? 'US$' : '$';
      if (absVal >= 1_000_000) {
        const m = absVal / 1_000_000;
        const formatted = m >= 100
          ? m.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
          : m.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return `${sign}${sym} ${formatted}M`;
      }
      if (absVal >= 1_000) {
        const k = absVal / 1_000;
        return `${sign}${sym} ${k.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
      }
      return val.toLocaleString('es-AR', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    if (totalesFormat === 'rounded') {
      return Math.round(val).toLocaleString('es-AR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }

    // full
    return val.toLocaleString('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
    

  const eliminarMovimiento = async () => {
    setDeletingElement(movimientoAEliminar);
    const resultado = await movimientosService.deleteMovimientoById(movimientoAEliminar);
    if (resultado) {
      await fetchAndHydrateMovimientos();
      await fetchTotalsForCajas(cajasVirtuales);
      setAlert({
        open: true,
        message: 'Movimiento eliminado con éxito',
        severity: 'success',
      });
      setDeletingElement(null);
    } else {
      setAlert({
        open: true,
        message: 'Error al eliminar el elemento',
        severity: 'error',
      });
      setDeletingElement(null);
    }
    setOpenDialog(false);
  };

  const goToEdit = (mov) => {
    router.push({
      pathname: '/movementForm',
      query: {
        movimientoId: mov.id,
        lastPageName: scopeSummary,
        proyectoId: mov.proyecto_id || activeProject?.id,
        proyectoName: mov.proyecto_nombre || mov.proyecto || activeProject?.nombre,
        lastPageUrl: router.asPath,
      },
    });
  };

  const openDetalle = useCallback((mov) => {
    setDetalleMov(mov);
    setDrawerOpen(true);
    setComentarioInput('');
    setComentarioError(null);
  }, []);

  const handleAgregarComentario = useCallback(async () => {
    if (!detalleMov?.id || !comentarioInput?.trim()) return;
    setComentarioLoading(true);
    setComentarioError(null);
    try {
      const nuevoComentario = await movimientosService.addComentario(detalleMov.id, comentarioInput.trim());
      if (nuevoComentario) {
        const movActualizado = {
          ...detalleMov,
          comentarios: [...(detalleMov.comentarios || []), nuevoComentario],
        };
        setDetalleMov(movActualizado);
        setComentarioInput('');
        setDashboardItems((prev) => updateDashboardItemsByMovimientoId(prev, detalleMov.id, (mov) => ({
          ...mov,
          comentarios: movActualizado.comentarios,
        })));
        setAlert({ open: true, message: 'Comentario agregado', severity: 'success' });
      }
    } catch (err) {
      setComentarioError(err?.response?.data?.error || 'Error al agregar comentario');
    } finally {
      setComentarioLoading(false);
    }
  }, [detalleMov, comentarioInput]);

  useEffect(() => {
    const comentarios = detalleMov?.comentarios || [];
    const idsToFetch = [...new Set(comentarios.map((c) => c.userId).filter(Boolean))].filter(
      (id) => !fetchedUserIdsRef.current.has(id)
    );
    if (idsToFetch.length === 0) return;
    idsToFetch.forEach((id) => fetchedUserIdsRef.current.add(id));
    (async () => {
      for (const id of idsToFetch) {
        try {
          const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
          const name = profile
            ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || 'Usuario')
            : 'Usuario';
          setUsuariosComentariosMap((prev) => ({ ...prev, [id]: name }));
        } catch {
          setUsuariosComentariosMap((prev) => ({ ...prev, [id]: 'Usuario' }));
        }
      }
    })();
  }, [detalleMov?.id, detalleMov?.comentarios?.length]);

  
  const handleEliminarClick = (movimientoId) => {
    setMovimientoAEliminar(movimientoId);
    setOpenDialog(true);
  };
  
  

  const fetchAndHydrateMovimientos = useCallback(async ({ includeOptions = false } = {}) => {
    if (!empresa?.id) return null;
    setLoadingDashboard(true);
    try {
      const params = {
        ...buildCajaDashboardParams({
          filters,
          caja: filters.caja,
          page,
          limit: rowsPerPage,
          includeOptions,
        }),
        empresaId: empresa.id,
      };
      if (scopeProjectIds.length > 0) params.proyectoIds = scopeProjectIds.join(',');

      const response = await movimientosService.getCajasDashboard(params);
      let nextItems = response?.items || [];
      const flatRows = flattenDashboardItems(nextItems);
      const idsSinNombre = [...new Set(flatRows.filter((mov) => mov.id_user && !mov.nombre_user).map((mov) => mov.id_user))];

      if (idsSinNombre.length > 0) {
        const profiles = await Promise.all(idsSinNombre.map(async (id) => {
          const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
          const name = profile
            ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || '-')
            : null;
          return { id, name };
        }));

        const usuariosMap = profiles.reduce((acc, entry) => {
          if (entry?.name) acc[entry.id] = entry.name;
          return acc;
        }, {});

        nextItems = nextItems.map((item) => {
          if (item?.tipo === 'grupo_prorrateo') {
            return {
              ...item,
              movimientos: (item.movimientos || []).map((mov) => (
                mov.id_user && !mov.nombre_user && usuariosMap[mov.id_user]
                  ? { ...mov, nombre_user: usuariosMap[mov.id_user] }
                  : mov
              )),
            };
          }
          if (item?.data?.id_user && !item.data.nombre_user && usuariosMap[item.data.id_user]) {
            return {
              ...item,
              data: { ...item.data, nombre_user: usuariosMap[item.data.id_user] },
            };
          }
          return item;
        });
      }

      setDashboardItems(nextItems);
      setDashboardTotals(response?.totals || EMPTY_CAJA_TOTALS);
      setDashboardPagination(response?.pagination || { page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      if (response?.options) setBackendOptions(response.options);
      return response;
    } finally {
      setLoadingDashboard(false);
    }
  }, [empresa?.id, filters, page, rowsPerPage, scopeProjectIds]);

  const fetchDashboardOptions = useCallback(async () => {
    if (!empresa?.id) return null;

    const response = await movimientosService.getCajasOptions({
      empresaId: empresa.id,
      ...(scopeProjectIds.length > 0 ? { proyectoIds: scopeProjectIds.join(',') } : {}),
    });

    if (response?.options) setBackendOptions(response.options);
    return response;
  }, [empresa?.id, scopeProjectIds]);

  const fetchTotalsForCajas = useCallback(async (cajas = []) => {
    if (!empresa?.id || cajas.length === 0) {
      setCajasTotalsMap({});
      return;
    }

    const entries = await Promise.all(cajas.map(async (caja) => {
      const params = buildCajaDashboardParams({
        filters: {},
        caja,
      });
      const response = await movimientosService.getCajasTotales({
        ...params,
        empresaId: empresa.id,
        ...(scopeProjectIds.length > 0 ? { proyectoIds: scopeProjectIds.join(',') } : {}),
      });
      return [getCajaTotalsKey(caja), response?.totals || EMPTY_CAJA_TOTALS];
    }));

    setCajasTotalsMap(Object.fromEntries(entries));
  }, [empresa?.id, scopeProjectIds]);

  const handleOpenConfirmarPago = useCallback((mov) => {
    setConfirmarPagoMov(mov);
  }, []);

  const handleCloseConfirmarPagoDialog = useCallback(() => {
    if (confirmarPagoLoading) return;
    setConfirmarPagoMov(null);
  }, [confirmarPagoLoading]);

  const handleConfirmarPagoEjecutar = useCallback(async () => {
    const mov = confirmarPagoMov;
    if (!mov?.id) return;
    setConfirmarPagoLoading(true);
    try {
      const nombreUsuario = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || null;
      const patch = buildCompletarPagoUpdateFields(mov);
      const res = await movimientosService.updateMovimiento(mov.id, { ...mov, ...patch }, nombreUsuario);
      if (res?.error) {
        setAlert({ open: true, message: 'No se pudo confirmar el pago', severity: 'error' });
        return;
      }
      await fetchAndHydrateMovimientos();
      setAlert({ open: true, message: 'Pago confirmado correctamente', severity: 'success' });
      setConfirmarPagoMov(null);
      setDetalleMov((prev) => (prev?.id === mov.id ? { ...prev, ...patch } : prev));
    } catch {
      setAlert({ open: true, message: 'Error al confirmar el pago', severity: 'error' });
    } finally {
      setConfirmarPagoLoading(false);
    }
  }, [confirmarPagoMov, fetchAndHydrateMovimientos, user]);

  const handleRefresh = async () => {
    await fetchAndHydrateMovimientos();
    await fetchTotalsForCajas(cajasVirtuales);
    setAlert({
      open: true,
      message: 'Listado actualizado correctamente',
      severity: 'success',
    });
  };
  

  useEffect(() => {
    const fetchBaseData = async () => {
      setLoadingPage(true);
      setDashboardItems([]);
      setDashboardTotals(EMPTY_CAJA_TOTALS);
      setDashboardPagination({ page: 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      setProyecto(null);
      setBackendOptions(null);

      const empresa = await getEmpresaDetailsFromUser(userRef.current);
      const [proyectosUsuario, proyectosEmpresa] = await Promise.all([
        getProyectosFromUser(userRef.current),
        getProyectosByEmpresa(empresa),
      ]);
      const proyectosEmpresaMap = new Map();
      [...(proyectosUsuario || []), ...(proyectosEmpresa || [])]
        .filter((item) => item && item.id && item.eliminado !== true)
        .forEach((item) => {
          proyectosEmpresaMap.set(item.id, item);
        });
      const proyectosCargados = Array.from(proyectosEmpresaMap.values());
      const proyectosIdsDisponibles = proyectosCargados.map((item) => item.id).filter(Boolean);
      const { proyectoId: initPid, proyectoIds: initPids } = routerRef.current.query || {};
      const requestedIds = [...new Set([
        ...parseListParam(initPids),
        ...(initPid ? [initPid] : []),
      ])].filter((id) => proyectosIdsDisponibles.includes(id));
      const initialScopeMode = requestedIds.length > 0 ? 'selection' : 'all';
      const initialSelectedIds = requestedIds.length > 0 ? requestedIds : [];

      const cajasIniciales = empresa.cajas_virtuales?.length > 0 ? empresa.cajas_virtuales : [
        { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
        { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
      ];
      if (!empresa.cajas_virtuales || empresa.cajas_virtuales.length === 0) {
        updateEmpresaDetails(empresa.id, { cajas_virtuales: cajasIniciales }); // fire-and-forget
      }
      setEmpresa({ ...empresa, cajas_virtuales: cajasIniciales });
      setCajasVirtuales(cajasIniciales);
      setProyectos(proyectosCargados);
      setProjectScopeMode(initialScopeMode);
      setSelectedProjectIds(initialSelectedIds);

      const cajaFromUrl = routerRef.current.query.caja ? (() => { try { return JSON.parse(routerRef.current.query.caja); } catch { return null; } })() : null;
      const cajaDefault = (cajaFromUrl && cajasIniciales.find(c => c.moneda === cajaFromUrl.moneda && c.medio_pago === (cajaFromUrl.medio_pago || '')))
        || cajasIniciales[0]
        || null;
      applyCajaSelection(cajaDefault);

      if (empresa.solo_dolar) {
        setTablaActiva('USD');
      }
    };

    const fetchData = async () => {
      try {
        await fetchBaseData();
      } catch (err) {
        console.error('Error cargando datos de caja:', err);
      } finally {
        setLoadingPage(false);
      }
    };

    if (authUserUid) fetchData();
  // Solo depende de authUserUid. Los params de scope (proyectoId/proyectoIds) se leen
  // de routerRef.current para evitar que el scope effect —que escribe esos params en la
  // URL— re-dispare una carga completa de datos cada vez que el usuario cambia de proyecto.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserUid]);

  useEffect(() => {
    if (!empresa?.id) return;
    const savedCols = activeProject?.ui_prefs?.columnas || readCajasLocalPrefs();
    const nextCompact = typeof savedCols?.compact === 'boolean' ? savedCols.compact : true;
    const nextDefaultVisible = buildDefaultVisible(nextCompact, !activeProjectId);
    setProyecto(activeProject || null);
    setCompactCols(nextCompact);
    setVisibleCols(
      savedCols?.visible && typeof savedCols.visible === 'object'
        ? {
            ...nextDefaultVisible,
            ...savedCols.visible,
            proyecto: !activeProjectId ? (savedCols.visible?.proyecto ?? true) : false,
          }
        : nextDefaultVisible
    );
    setColumnasOrden(Array.isArray(savedCols?.orden) ? savedCols.orden : []);
    setPrefsHydrated(true);
  }, [activeProject, activeProjectId, buildDefaultVisible, empresa?.id]);

  useEffect(() => {
    if (!empresa?.id) return;
    fetchAndHydrateMovimientos({ includeOptions: false });
  }, [empresa?.id, fetchAndHydrateMovimientos]);

  useEffect(() => {
    setBackendOptions(null);
  }, [empresa?.id, scopeProjectIdsKey]);

  useEffect(() => {
    if (!empresa?.id || backendOptions) return;
    fetchDashboardOptions().catch((error) => {
      console.error('Error cargando options de cajas:', error);
    });
  }, [backendOptions, empresa?.id, fetchDashboardOptions]);

  useEffect(() => {
    if (!empresa?.id || cajasVirtuales.length === 0) return;
    fetchTotalsForCajas(cajasVirtuales);
  }, [cajasVirtuales, empresa?.id, fetchTotalsForCajas]);
  
  const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };

  const activeCaja = useMemo(() => filters.caja || null, [filters.caja]);
  const activeTotalsCurrency = useMemo(() => {
    if (activeCaja?.equivalencia && activeCaja.equivalencia !== 'none') {
      const meta = EQUIV_META[activeCaja.equivalencia];
      if (meta?.out) return meta.out;
    }
    return activeCaja?.moneda || tablaActiva || 'ARS';
  }, [activeCaja, tablaActiva]);

  const cajaCellCtx = useMemo(() => ({
    empresa,
    compactCols,
    formatTimestamp,
    formatCurrency,
    openImg,
    openDetalle,
    goToEdit,
    handleEliminarClick,
    onOpenConfirmarPago: handleOpenConfirmarPago,
    deletingElement,
    COLS,
    cellBase,
    ellipsis,
  }), [empresa, compactCols, deletingElement, openDetalle, handleOpenConfirmarPago]);

  const onSelectCaja = (caja) => {
    applyCajaSelection(caja);
    setPage(0);
  };

  // helper para normalizar fecha (Timestamp/Date/string/number)
const getTime = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return new Date(v).getTime() || 0;
  if (v?.toDate) return v.toDate().getTime();
  if (v?.seconds) return v.seconds * 1000;
  return 0;
};

  
  const totalesDetallados = useMemo(() => ({
    ARS: {
      ingreso: dashboardTotals?.currencies?.ARS?.ingreso || 0,
      egreso: dashboardTotals?.currencies?.ARS?.egreso || 0,
    },
    USD: {
      ingreso: dashboardTotals?.currencies?.USD?.ingreso || 0,
      egreso: dashboardTotals?.currencies?.USD?.egreso || 0,
    },
  }), [dashboardTotals]);

  const movimientosConProrrateo = useMemo(() => dashboardItems, [dashboardItems]);

  const formatByCurrency = (currency, amount) => {
    const cur = currency === 'USD' ? 'USD' : 'ARS';
    return amount?.toLocaleString('es-AR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2
    }) ?? (cur === 'USD' ? 'US$ 0,00' : '$ 0,00');
  };


   const calcularTotalParaCaja = (caja) => {
      const totals = cajasTotalsMap[getCajaTotalsKey(caja)] || EMPTY_CAJA_TOTALS;
      return getCajaNetFromTotals(caja, totals);
    };

  const handleOpenExportCsvDialog = useCallback(() => {
    if (!csvConfigHydrated) {
      setCsvSelectedFields(csvDefaultOrder);
      setCsvFieldOrder(csvDefaultOrder);
      setCsvConfigHydrated(true);
    }
    setCsvDialogOpen(true);
  }, [csvConfigHydrated, csvDefaultOrder]);

  const handleToggleCsvField = useCallback((fieldKey) => {
    setCsvSelectedFields((prev) => (
      prev.includes(fieldKey)
        ? prev.filter((key) => key !== fieldKey)
        : [...prev, fieldKey]
    ));
  }, []);

  const handleReorderCsvField = useCallback((fieldKey, direction) => {
    setCsvFieldOrder((prev) => {
      const currentIndex = prev.indexOf(fieldKey);
      if (currentIndex === -1) return prev;
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      return moveItem(prev, currentIndex, nextIndex);
    });
  }, []);

  const handleResetCsvConfig = useCallback(() => {
    setCsvSelectedFields(csvDefaultOrder);
    setCsvFieldOrder(csvDefaultOrder);
  }, [csvDefaultOrder]);

  const handleExportCsvAnalisis = useCallback(async () => {
    const selectedFields = csvFieldOrder
      .filter((fieldKey) => csvSelectedFields.includes(fieldKey))
      .map((fieldKey) => csvExportFields.find((field) => field.key === fieldKey))
      .filter(Boolean);

    if (selectedFields.length === 0) {
      setAlert({
        open: true,
        message: 'Seleccioná al menos un campo para exportar',
        severity: 'warning',
      });
      return;
    }

    setCsvExporting(true);
    try {
      const batchSize = 1000;
      const movimientosExportables = [];
      let exportPage = 0;
      let hasNext = true;

      while (hasNext) {
        const response = await movimientosService.getCajasDashboard({
          ...buildCajaDashboardParams({
            filters,
            caja: filters.caja,
            page: exportPage,
            limit: batchSize,
            includeOptions: false,
          }),
          empresaId: empresa?.id,
          ...(scopeProjectIds.length > 0 ? { proyectoIds: scopeProjectIds.join(',') } : {}),
        });

        movimientosExportables.push(...flattenDashboardItems(response?.items || []));
        hasNext = !!response?.pagination?.hasNext;
        exportPage += 1;
      }

      const headers = selectedFields.map((field) => formatCsvCell(field.label));
      const rows = movimientosExportables.map((mov) => (
        selectedFields.map((field) => formatCsvCell(field.getValue(mov)))
      ));
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      descargarArchivoCsv(
        `analisis_movimientos_${activeProject?.nombre || 'cajas'}_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent
      );

      setCsvDialogOpen(false);
      setAlert({
        open: true,
        message: `CSV exportado con ${movimientosExportables.length} movimientos`,
        severity: 'success',
      });
    } finally {
      setCsvExporting(false);
    }
  }, [activeProject?.nombre, csvExportFields, csvFieldOrder, csvSelectedFields, empresa?.id, filters, scopeProjectIds]);

  const handleGuardarCaja = async () => {
    const nuevaCaja = {
      nombre: nombreCaja,
      moneda: monedaCaja || '', 
      medio_pago: medioPagoCaja,
      estado: estadoCaja,
      equivalencia: equivalenciaCaja || 'none',
      type: typeCaja || '',
      baseCalculo: baseCalculoCaja || 'total',
      ...(savedViewMode ? { filterSet: serializeFilterSet(filters) } : {}),
    };
    
  
    const nuevasCajas = [...cajasVirtuales];
  
    if (editandoCaja !== null) {
      nuevasCajas[editandoCaja] = nuevaCaja;
    } else {
      nuevasCajas.push(nuevaCaja);
    }
  
    setCajasVirtuales(nuevasCajas);
    setShowCrearCaja(false);
    setSavedViewMode(false);
    setNombreCaja('');
    setMonedaCaja('ARS');
    setMedioPagoCaja('Efectivo');
    setEstadoCaja('');
    setEquivalenciaCaja('none');
    setTypeCaja('');
    setBaseCalculoCaja('total');
    setEditandoCaja(null);
    await updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevasCajas });
  };
  
  const totalRows = dashboardPagination?.total || 0;
  const paginatedMovs = movimientosConProrrateo;

  // ── Helpers selección masiva ──
  const allPageIds = useMemo(() => {
    const ids = [];
    paginatedMovs.forEach((item) => {
      if (item.tipo === 'grupo_prorrateo') {
        item.movimientos.forEach((m) => ids.push(m.id));
      } else {
        ids.push(item.data.id);
      }
    });
    return ids;
  }, [paginatedMovs]);

  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDone = async () => {
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
    await handleRefresh();
    setAlert({ open: true, message: 'Edición masiva completada', severity: 'success' });
  };
  
  
  const handleOpenTransferencia = () => {
    setOpenTransferencia(true);
  };

  const handleCloseTransferencia = () => {
    setOpenTransferencia(false);
  };

  const handleTransferenciaSuccess = (result) => {
    setAlert({
      open: true,
      message: 'Transferencia interna realizada con éxito',
      severity: 'success',
    });
    // Refrescar movimientos después de la transferencia
    handleRefresh();
  };

  const handleOpenIntercambio = () => {
    setOpenIntercambio(true);
  };

  const handleCloseIntercambio = () => {
    setOpenIntercambio(false);
  };

  const handleIntercambioSuccess = (result) => {
    setAlert({
      open: true,
      message: 'Operación de cambio realizada con éxito',
      severity: 'success',
    });
    handleRefresh();
  };

  const handleRecalcularEquivalencias = async () => {
    if (!activeProject?.id) return;
    setAlert({
      open: true,
      message: 'Este proceso puede durar varios minutos, por favor espere...',
      severity: 'warning',
    });
    const res = await movimientosService.recalcularEquivalenciasPorProyecto(activeProject.id);
    
    if (!res.error) {
      setAlert({
        open: true,
        message: 'Equivalencias recalculadas con éxito',
        severity: 'success',
      });
      await handleRefresh(); // refresca los movimientos actualizados
    } else {
      setAlert({
        open: true,
        message: 'Error al recalcular equivalencias',
        severity: 'error',
      });
    }
  };

  
  const handleMenuOptionClick = (action) => {
    switch (action) {
      case 'filtrar':
        handleFiltrosActivos();
        break;
      case 'registrarMovimiento':
        if (!activeProject) break;
        router.push('/movementForm?proyectoName=' + activeProject.nombre + '&proyectoId=' + activeProject.id + '&lastPageUrl=' + router.asPath + '&lastPageName=Cajas');
        break;
      case 'recalcularSheets':
        if (activeProject?.id) handleRecargarProyecto(activeProject.id);
        break;
      case 'recalcularEquivalencias':
        handleRecalcularEquivalencias();
        break;
      default:
        break;
    }
    handleCloseMenu();
  };
  const formatDateChip = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '';
  const filterChips = useMemo(() => {
    const chips = [];
    const add = (label, onDelete) => chips.push({ label, onDelete });
    const toArr = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
    if (filters.fechaDesde || filters.fechaHasta) {
      const label = filters.fechaDesde && filters.fechaHasta
        ? `Fecha: ${formatDateChip(filters.fechaDesde)} - ${formatDateChip(filters.fechaHasta)}`
        : (filters.fechaDesde ? `Fecha desde: ${formatDateChip(filters.fechaDesde)}` : `Fecha hasta: ${formatDateChip(filters.fechaHasta)}`);
      add(label, () => setFilters((f) => ({ ...f, fechaDesde: null, fechaHasta: null })));
    }
    if (filters.fechaPagoDesde || filters.fechaPagoHasta) {
      const label = filters.fechaPagoDesde && filters.fechaPagoHasta
        ? `Pago: ${formatDateChip(filters.fechaPagoDesde)} - ${formatDateChip(filters.fechaPagoHasta)}`
        : (filters.fechaPagoDesde ? `Pago desde: ${formatDateChip(filters.fechaPagoDesde)}` : `Pago hasta: ${formatDateChip(filters.fechaPagoHasta)}`);
      add(label, () => setFilters((f) => ({ ...f, fechaPagoDesde: null, fechaPagoHasta: null })));
    }
    if (filters.palabras) add(`Buscar: ${filters.palabras}`, () => setFilters((f) => ({ ...f, palabras: '' })));
    if (filters.observacion) add(`Observación: ${filters.observacion}`, () => setFilters((f) => ({ ...f, observacion: '' })));
    if (filters.codigoSync) add(`Código: ${filters.codigoSync}`, () => setFilters((f) => ({ ...f, codigoSync: '' })));
    toArr(filters.tipo).forEach((v) => add(`Tipo: ${v}`, () => setFilters((f) => ({ ...f, tipo: toArr(f.tipo).filter((x) => x !== v) }))));
    toArr(filters.moneda).forEach((v) => add(`Moneda: ${v}`, () => setFilters((f) => ({ ...f, moneda: toArr(f.moneda).filter((x) => x !== v) }))));
    toArr(filters.proveedores).forEach((v) => add(`Proveedor: ${v}`, () => setFilters((f) => ({ ...f, proveedores: toArr(f.proveedores).filter((x) => x !== v) }))));
    toArr(filters.categorias).forEach((v) => add(`Categoría: ${v}`, () => setFilters((f) => ({ ...f, categorias: toArr(f.categorias).filter((x) => x !== v) }))));
    toArr(filters.subcategorias).forEach((v) => add(`Subcategoría: ${v}`, () => setFilters((f) => ({ ...f, subcategorias: toArr(f.subcategorias).filter((x) => x !== v) }))));
    toArr(filters.medioPago).forEach((v) => add(`Medio: ${v}`, () => setFilters((f) => ({ ...f, medioPago: toArr(f.medioPago).filter((x) => x !== v) }))));
    toArr(filters.etapa).forEach((v) => add(`Etapa: ${v}`, () => setFilters((f) => ({ ...f, etapa: toArr(f.etapa).filter((x) => x !== v) }))));
    toArr(filters.estados).forEach((v) => add(`Estado: ${v}`, () => setFilters((f) => ({ ...f, estados: toArr(f.estados).filter((x) => x !== v) }))));
    toArr(filters.cuentaInterna).forEach((v) => add(`Cuenta: ${v}`, () => setFilters((f) => ({ ...f, cuentaInterna: toArr(f.cuentaInterna).filter((x) => x !== v) }))));
    toArr(filters.tagsExtra).forEach((v) => add(`Tag: ${v}`, () => setFilters((f) => ({ ...f, tagsExtra: toArr(f.tagsExtra).filter((x) => x !== v) }))));
    toArr(filters.empresaFacturacion).forEach((v) => add(`Emp. fact.: ${v}`, () => setFilters((f) => ({ ...f, empresaFacturacion: toArr(f.empresaFacturacion).filter((x) => x !== v) }))));
    if (filters.facturaCliente) add(filters.facturaCliente === 'cliente' ? 'Factura: Cliente' : 'Factura: Propia', () => setFilters((f) => ({ ...f, facturaCliente: '' })));
    if (filters.montoMin) add(`Monto min: ${filters.montoMin}`, () => setFilters((f) => ({ ...f, montoMin: '' })));
    if (filters.montoMax) add(`Monto max: ${filters.montoMax}`, () => setFilters((f) => ({ ...f, montoMax: '' })));
    return chips;
  }, [filters, setFilters]);

  const totalesUsdBlue = useMemo(() => {
    const base = dashboardTotals?.equivalencias?.usd_blue || EMPTY_CAJA_TOTALS.equivalencias.usd_blue;
    return {
      ingreso: base.ingreso || 0,
      egreso: base.egreso || 0,
      neto: base.neto || 0,
    };
  }, [dashboardTotals]);
  
// si cambian los filtros y la página quedó fuera de rango, volvemos a 0
useEffect(() => {
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  if (page > maxPage) setPage(0);
}, [totalRows, rowsPerPage]); // intencional: no incluimos 'page' para evitar loop

  const tituloConCodigo = useMemo(() => {
    if (filters.codigoSync && filters.codigoSync.trim() !== '') {
      return `Cajas - ${scopeSummary} - Código: ${filters.codigoSync}`;
    }
    return activeProject?.nombre ? `Cajas - ${activeProject.nombre}` : `Cajas - ${scopeSummary}`;
  }, [activeProject?.nombre, filters.codigoSync, scopeSummary]);

  if (empresa?.cuenta_suspendida === true) {
    return 'Cuenta suspendida. Contacte al administrador.';
  }

  return (
    <DashboardLayout title={tituloConCodigo}>
      <Head>
        <title>{tituloConCodigo}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8, paddingTop: 2, position: 'relative' }}>
        {loadingPage && (
          <Backdrop open sx={{ position: 'absolute', zIndex: 10, bgcolor: 'rgba(255,255,255,0.7)' }}>
            <CircularProgress />
          </Backdrop>
        )}
        <Container maxWidth={false} sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
          <Stack spacing={3}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1.5, md: 2.5 },
                borderRadius: 4,
                borderColor: 'rgba(118,117,134,0.18)',
                background: `linear-gradient(180deg, ${BRAND_COLORS.cloud}, rgba(255,255,255,0.92))`,
                boxShadow: '0 28px 60px rgba(30,68,105,0.08)',
              }}
            >
              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 1.25, md: 1.5 },
                    borderRadius: 3,
                    borderColor: 'rgba(118,117,134,0.14)',
                    background: 'rgba(255,255,255,0.72)',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction={isMobile ? 'column' : 'row'} spacing={1.25} alignItems={isMobile ? 'stretch' : 'center'} justifyContent="space-between">
                      <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND_COLORS.navy, minWidth: isMobile ? 'auto' : 110 }}>
                        Cajas
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ p: 0.75, bgcolor: 'rgba(255,255,255,0.66)', borderRadius: 2.5, border: '1px solid', borderColor: 'rgba(118,117,134,0.16)' }}>
                        <Button
                          size="small"
                          variant={projectScopeMode === 'all' ? 'contained' : 'text'}
                          onClick={() => {
                            setProjectScopeMode('all');
                            setSelectedProjectIds([]);
                            setPage(0);
                          }}
                          sx={{ borderRadius: 2, px: 1.5, fontWeight: 700, textTransform: 'none' }}
                        >
                          Todos los proyectos
                        </Button>
                        <Button
                          size="small"
                          variant={projectScopeMode === 'selection' ? 'contained' : 'text'}
                          onClick={() => {
                            setProjectScopeMode('selection');
                            setPage(0);
                          }}
                          sx={{ borderRadius: 2, px: 1.5, fontWeight: 700, textTransform: 'none' }}
                        >
                          Elegir proyectos
                        </Button>
                      </Stack>

                      <Autocomplete
                        multiple
                        disableCloseOnSelect
                        openOnFocus
                        filterSelectedOptions={false}
                        noOptionsText={proyectos.length === 0 ? 'No hay proyectos disponibles' : 'No hay coincidencias'}
                        limitTags={3}
                        options={proyectos}
                        value={projectScopeMode === 'selection' ? selectedProjects : []}
                        onChange={(_event, values) => {
                          const ids = values.map((item) => item.id).filter(Boolean);
                          setSelectedProjectIds(ids);
                          setProjectScopeMode(ids.length === 0 ? 'all' : 'selection');
                          setPage(0);
                        }}
                        getOptionLabel={(option) => option?.nombre || 'Proyecto'}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Proyectos"
                            placeholder={projectScopeMode === 'all' ? 'Abrí para elegir proyectos' : 'Seleccioná uno o varios'}
                          />
                        )}
                        sx={{ flex: 1, minWidth: isMobile ? '100%' : 320, maxWidth: isMobile ? '100%' : 720 }}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          variant="contained"
                          startIcon={<GridViewRoundedIcon />}
                          onClick={isMobile ? () => setFiltersOpen(true) : handleOpenMenu}
                          sx={{ borderRadius: 2.5, px: 2, textTransform: 'none', fontWeight: 700, bgcolor: BRAND_COLORS.navy, '&:hover': { bgcolor: BRAND_COLORS.teal } }}
                        >
                          Acciones
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<TuneRoundedIcon />}
                          onClick={handleOpenViewConfig}
                          sx={{ borderRadius: 2.5, px: 2, textTransform: 'none', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.7)', borderColor: BRAND_COLORS.cyan, color: BRAND_COLORS.navy }}
                        >
                          Personalizar vista
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>

                <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5} alignItems="stretch">
                  <Box sx={{ width: { xs: '100%', lg: '70%' }, minWidth: 0, maxWidth: { xs: '100%', lg: '70%' } }}>
                    <Box
                      sx={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: `repeat(${Math.max(cajasVirtuales.length, 1)}, minmax(250px, 1fr))`,
                          lg: `repeat(${Math.max(cajasVirtuales.length, 1)}, minmax(0, 1fr))`,
                        },
                        gap: 1,
                        overflowX: { xs: 'auto', lg: 'visible' },
                        pb: 0.5,
                      }}
                    >
                      {cajasVirtuales.map((caja, index) => {
                        const selected = filters.caja?.nombre === caja.nombre;
                        const totalCaja = calcularTotalParaCaja(caja);
                        const tone = getCajaAccent(caja, totalCaja);
                        const ToneIcon = tone.Icon;
                        const totalColor = totalCaja < 0
                          ? (selected ? '#FFCDD2' : '#E53935')
                          : (selected ? 'inherit' : tone.color);
                        return (
                          <Box
                            key={`${caja.nombre}-${index}`}
                            sx={{
                              position: 'relative',
                              minWidth: 0,
                            }}
                          >
                            <Button
                              fullWidth
                              variant={selected ? 'contained' : 'outlined'}
                              onClick={() => onSelectCaja(caja)}
                              sx={{
                                minHeight: 126,
                                px: 1.5,
                                py: 1.25,
                                pr: 5.5,
                                borderRadius: 2.75,
                                borderLeftWidth: 4,
                                borderLeftStyle: 'solid',
                                borderLeftColor: tone.borderColor,
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                textAlign: 'left',
                                textTransform: 'none',
                                bgcolor: selected ? undefined : 'transparent',
                                backgroundImage: selected ? undefined : tone.bg,
                                borderColor: selected ? undefined : 'rgba(118,117,134,0.18)',
                                boxShadow: selected ? '0 18px 32px rgba(0,151,178,0.18)' : '0 10px 24px rgba(0,0,0,0.04)',
                              }}
                            >
                              <Stack spacing={0.9} sx={{ minWidth: 0, pr: 0.5, flex: 1, width: '100%' }}>
                                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, pr: 2 }}>
                                  <Box sx={{ width: 30, height: 30, borderRadius: 1.75, display: 'grid', placeItems: 'center', bgcolor: selected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.78)', color: selected ? 'inherit' : tone.color, flexShrink: 0 }}>
                                    <ToneIcon sx={{ fontSize: 17 }} />
                                  </Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 800,
                                      minWidth: 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      lineHeight: 1.15,
                                      maxWidth: '100%',
                                    }}
                                  >
                                    {caja.nombre}
                                  </Typography>
                                </Stack>
                                <Typography
                                  variant="h5"
                                  sx={{
                                    fontWeight: 800,
                                    color: totalColor,
                                    lineHeight: 1.05,
                                    pr: 2,
                                  }}
                                >
                                  {formatCajaAmount(caja, totalCaja)}
                                </Typography>
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                  <Typography variant="caption" color={selected ? 'inherit' : 'text.secondary'} sx={{ fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    {(caja.equivalencia && caja.equivalencia !== 'none') ? caja.equivalencia.replaceAll('_', ' ') : (caja.moneda || 'ARS')}
                                  </Typography>
                                  {caja.type && (
                                    <Typography variant="caption" color={selected ? 'inherit' : 'text.secondary'} sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                      {caja.type}
                                    </Typography>
                                  )}
                                  {caja.baseCalculo === 'subtotal' && (
                                    <Chip size="small" label="neto" color="info" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                  )}
                                  {caja.filterSet && (
                                    <Chip size="small" label="vista" color="secondary" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                  )}
                                </Stack>
                                <Typography variant="caption" color={selected ? 'inherit' : 'text.secondary'} sx={{ opacity: 0.9 }}>
                                  Saldo actual
                                </Typography>
                              </Stack>
                            </Button>
                            <IconButton
                              size="small"
                              onClick={(event) => handleOpenCajaMenu(event, index)}
                              sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'rgba(255,255,255,0.72)', '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' } }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      width: { xs: '100%', lg: '30%' },
                      minWidth: { xs: '100%', lg: '30%' },
                      maxWidth: { xs: '100%', lg: '30%' },
                      position: { xs: 'static', lg: 'sticky' },
                      top: 12,
                      zIndex: 6,
                      borderRadius: 2,
                      backdropFilter: 'blur(8px)',
                      flexShrink: 0,
                    }}
                  >
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: 'rgba(118,117,134,0.16)', background: 'rgba(255,255,255,0.7)' }}>
                    <TotalesFiltrados
                      t={totalesDetallados}
                      fmt={formatByCurrency}
                      moneda={activeTotalsCurrency}
                      totalesFormat={totalesFormat}
                      showUsdBlue={false}
                      usdBlue={totalesUsdBlue}
                      chips={filterChips}
                      onOpenFilters={() => setFiltersOpen((o) => !o)}
                      isMobile={isMobile}
                      showDetails={showTotalsDetails}
                      onToggleDetails={() => setShowTotalsDetails((s) => !s)}
                      baseCalculo={activeCaja?.baseCalculo || 'total'}
                    />
                  </Paper>
                  </Box>
                </Stack>

                {isMobile ? (
                  <Drawer
                    anchor="bottom"
                    open={filtersOpen}
                    onClose={() => setFiltersOpen(false)}
                    PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90vh' } }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>Filtros</Typography>
                      <FilterBarCajaProyecto
                        filters={filters}
                        setFilters={setFilters}
                        options={options}
                        onRefresh={handleRefresh}
                        empresa={empresa}
                        expanded={true}
                        onToggleExpanded={() => setFiltersOpen(false)}
                        storageKey={scopeStorageKey}
                        empresaId={empresa?.id}
                        userId={authUserUid}
                      />
                      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
                        <Button variant="text" onClick={() => setFiltersOpen(false)}>Cancelar</Button>
                        <Button variant="contained" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                      </Stack>
                    </Box>
                  </Drawer>
                ) : (
                  <FilterBarCajaProyecto
                    filters={filters}
                    setFilters={setFilters}
                    options={options}
                    onRefresh={handleRefresh}
                    empresa={empresa}
                    expanded={filtersOpen}
                    onToggleExpanded={() => setFiltersOpen((o) => !o)}
                    storageKey={scopeStorageKey}
                    empresaId={empresa?.id}
                    userId={authUserUid}
                  />
                )}
              </Stack>
            </Paper>

<Menu
  anchorEl={anchorCajaEl}
  open={Boolean(anchorCajaEl)}
  onClose={handleCloseCajaMenu}
>
  <MenuItem onClick={() => handleEditarCaja(cajaMenuIndex)}>Editar</MenuItem>
  <MenuItem onClick={() => handleEliminarCaja(cajaMenuIndex)}>Eliminar</MenuItem>
</Menu>
            <Dialog open={showCrearCaja} onClose={() => { setShowCrearCaja(false); setSavedViewMode(false); }}>
  <DialogTitle>{savedViewMode ? 'Guardar vista actual como caja' : (editandoCaja !== null ? 'Editar caja' : 'Crear vista de caja personalizada')}</DialogTitle>
  <DialogContent>
    {savedViewMode && filterChips.length > 0 && (
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(35,181,211,0.07)', borderRadius: 2, border: '1px solid rgba(35,181,211,0.25)' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>Filtros que se guardarán en esta caja:</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {filterChips.map((chip, idx) => <Chip key={idx} label={chip.label} size="small" variant="outlined" />)}
        </Box>
      </Box>
    )}
    <TextField label="Nombre de la caja" fullWidth value={nombreCaja} onChange={(e) => setNombreCaja(e.target.value)} />
    {!savedViewMode && (
      <>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Moneda</InputLabel>
          <Select value={monedaCaja} onChange={(e) => setMonedaCaja(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="ARS">Pesos</MenuItem>
            <MenuItem value="USD">Dólares</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={typeCaja} label="Tipo" onChange={(e) => setTypeCaja(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ingreso">Ingresos</MenuItem>
            <MenuItem value="egreso">Egresos</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Medio de pago</InputLabel>
          <Select value={medioPagoCaja} onChange={(e) => setMedioPagoCaja(e.target.value)}>
            <MenuItem key="" value="">Todos</MenuItem>
            {(empresa?.medios_pago || []).map((medio) => (
              <MenuItem key={medio} value={medio}>{medio}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {empresa?.con_estados && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={estadoCaja} onChange={(e) => setEstadoCaja(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="Pendiente">Pendiente</MenuItem>
              <MenuItem value="Pagado">Pagado</MenuItem>
            </Select>
          </FormControl>
        )}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Mostrar como</InputLabel>
          <Select value={equivalenciaCaja} label="Mostrar como" onChange={(e) => setEquivalenciaCaja(e.target.value)}>
            <MenuItem value="none">Moneda original</MenuItem>
            <MenuItem value="usd_blue">USD blue</MenuItem>
            <MenuItem value="usd_oficial">USD oficial</MenuItem>
            <MenuItem value="usd_mep_medio">USD mep (medio)</MenuItem>
          </Select>
        </FormControl>
      </>
    )}
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Base de cálculo</InputLabel>
      <Select value={baseCalculoCaja} label="Base de cálculo" onChange={(e) => setBaseCalculoCaja(e.target.value)}>
        <MenuItem value="total">Total (con impuestos)</MenuItem>
        <MenuItem value="subtotal">Subtotal (sin impuestos)</MenuItem>
      </Select>
    </FormControl>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => { setShowCrearCaja(false); setSavedViewMode(false); }}>Cancelar</Button>
    <Button onClick={handleGuardarCaja}>{editandoCaja !== null ? 'Guardar' : 'Crear'}</Button>
  </DialogActions>
</Dialog>
            <Paper>
              <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
                <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
                  {alert.message}
                </Alert>
              </Snackbar>
                {isMobile ? (
                  <Stack spacing={2}>
                    {paginatedMovs.length === 0 && (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1">Sin resultados</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Probá ajustar fechas, categorías o limpiar filtros.
                        </Typography>
                      </Paper>
                    )}
                    {paginatedMovs.map((item, index) => {
                      // Si es un grupo de prorrateo - mostrar solo los movimientos individuales
                      if (item.tipo === 'grupo_prorrateo') {
                        return (
                          <React.Fragment key={`grupo-${item.grupoId}`}>
                            {item.movimientos.map((mov, subIndex) => {
                              const amountColor = mov.type === 'ingreso' ? 'success.main' : 'error.main';
                              
                              return (
                                <Card key={`${item.grupoId}-${subIndex}`} sx={{ mb: 1, cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }} onClick={() => openDetalle(mov)}>
                                  <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {mov.codigo_operacion}
                                      </Typography>
                                      <Typography variant="subtitle1" color={amountColor}>
                                        {formatByCurrency(mov.moneda, mov.total)}
                                      </Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                      {mov.nombre_proveedor || '—'} • {mov.categoria || '—'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => { e.stopPropagation(); openMobileActions(e, mov); }}
                                      sx={{ mt: 1 }}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </React.Fragment>
                        );
                      }
                      
                      // Si es un movimiento normal
                      const mov = item.data;
                      return (
                        <Card key={index} sx={{ cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }} onClick={() => openDetalle(mov)}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {mov.codigo_operacion || '—'}
                              </Typography>
                              <Typography variant="subtitle1" color={mov.type === "ingreso" ? "green" : "red"}>
                                {formatByCurrency(mov.moneda, mov.total)}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {mov.nombre_proveedor || '—'} • {mov.categoria || '—'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); openMobileActions(e, mov); }}
                              sx={{ mt: 1 }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                  </Stack>
                ) : (
                  <>

<Dialog open={viewConfigOpen} onClose={handleCloseViewConfig} maxWidth="md" fullWidth>
  <DialogTitle sx={{ pb: 1.25 }}>Personalizar vista</DialogTitle>
  <DialogContent dividers sx={{ p: 0 }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' } }}>
      <Box sx={{ p: 3, borderRight: { xs: 'none', md: '1px solid rgba(118,117,134,0.14)' } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_COLORS.navy }}>
              Columnas visibles
            </Typography>
            <FormControlLabel
              control={<Switch size="small" checked={compactCols} onChange={(e) => setCompactCols(e.target.checked)} />}
              label="Modo compacto"
            />
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_COLORS.navy, mb: 0.5 }}>
              Formato de totales
            </Typography>
            {[
              { value: 'full',         label: 'Número completo',   example: '$ 239.740.526,83' },
              { value: 'abbreviated',  label: 'Resumido',          example: '$ 239,7M' },
              { value: 'rounded',      label: 'Redondeado',        example: '$ 240M' },
            ].map(({ value, label, example }) => (
              <Box
                key={value}
                onClick={() => setTotalesFormat(value)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  px: 1.5, py: 0.85, borderRadius: 2, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: totalesFormat === value ? BRAND_COLORS.teal : 'divider',
                  bgcolor: totalesFormat === value ? 'rgba(35,181,211,0.07)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: totalesFormat === value ? 700 : 400 }}>{label}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{example}</Typography>
              </Box>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button size="small" variant="outlined" onClick={() => applyPreset('finanzas')}>Finanzas</Button>
            <Button size="small" variant="outlined" onClick={() => applyPreset('operativo')}>Operativo</Button>
            <Button size="small" variant="outlined" onClick={() => applyPreset('auditoria')}>Auditoría</Button>
            <Button size="small" variant="text" onClick={() => applyPreset('reset')}>Reset</Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5, maxHeight: 430, overflowY: 'auto', pr: 1 }}>
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.codigo} onChange={() => toggleCol('codigo')} />} label="Código" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.proyecto} onChange={() => toggleCol('proyecto')} />} label="Proyecto" />
            {compactCols ? (
              <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechas} onChange={() => toggleCol('fechas')} />} label="Fechas" />
            ) : (
              <>
                <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaFactura} onChange={() => toggleCol('fechaFactura')} />} label="Fecha factura" />
                <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaCreacion} onChange={() => toggleCol('fechaCreacion')} />} label="Fecha creación" />
              </>
            )}
            {!compactCols && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tipo} onChange={() => toggleCol('tipo')} />} label="Tipo" />}
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.total} onChange={() => toggleCol('total')} />} label="Total" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subtotal ?? false} onChange={() => toggleCol('subtotal')} />} label="Subtotal (sin impuestos)" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.impuestos ?? false} onChange={() => toggleCol('impuestos')} />} label="Impuestos" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.montoPagado} onChange={() => toggleCol('montoPagado')} />} label="Monto pagado" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.montoAprobado} onChange={() => toggleCol('montoAprobado')} />} label="Monto aprobado" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.categoria} onChange={() => toggleCol('categoria')} />} label={compactCols ? 'Categoría / Subcat.' : 'Categoría'} />
            {!compactCols && empresa?.comprobante_info?.subcategoria && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subcategoria} onChange={() => toggleCol('subcategoria')} />} label="Subcategoría" />}
            {empresa?.comprobante_info?.medio_pago && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.medioPago} onChange={() => toggleCol('medioPago')} />} label="Medio de pago" />}
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.proveedor} onChange={() => toggleCol('proveedor')} />} label="Proveedor" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.obra} onChange={() => toggleCol('obra')} />} label="Obra" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.cliente} onChange={() => toggleCol('cliente')} />} label="Cliente" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.observacion} onChange={() => toggleCol('observacion')} />} label="Observación" />
            {empresa?.comprobante_info?.detalle && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.detalle} onChange={() => toggleCol('detalle')} />} label="Detalle" />}
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.usuario} onChange={() => toggleCol('usuario')} />} label="Usuario" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tc} onChange={() => toggleCol('tc')} />} label="TC ejecutado" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.usd} onChange={() => toggleCol('usd')} />} label="USD blue" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.mep} onChange={() => toggleCol('mep')} />} label="USD MEP" />
            {empresa?.con_estados && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.estado} onChange={() => toggleCol('estado')} />} label="Estado" />}
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.empresaFacturacion} onChange={() => toggleCol('empresaFacturacion')} />} label="Empresa facturación" />
            {empresa?.comprobante_info?.factura_cliente && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.facturaCliente} onChange={() => toggleCol('facturaCliente')} />} label="Factura cliente" />}
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaPago} onChange={() => toggleCol('fechaPago')} />} label="Fecha de pago" />
            {options?.tags?.length > 0 && <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tagsExtra} onChange={() => toggleCol('tagsExtra')} />} label="Tags extra" />}
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.dolarReferencia} onChange={() => toggleCol('dolarReferencia')} />} label="TC Referencia" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.totalDolar} onChange={() => toggleCol('totalDolar')} />} label="Total USD" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subtotalDolar} onChange={() => toggleCol('subtotalDolar')} />} label="Subtotal USD" />
            <FormControlLabel control={<Checkbox size="small" checked={visibleCols.acciones} onChange={() => toggleCol('acciones')} />} label="Acciones" />
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: 3, bgcolor: BRAND_COLORS.cloud }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_COLORS.navy }}>
            Orden de columnas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Definí el orden final de la grilla desde un único panel.
          </Typography>
          <Box sx={{ borderRadius: 2.5, overflow: 'hidden', bgcolor: 'background.paper', border: '1px solid rgba(118,117,134,0.14)' }}>
            <OrdenarColumnasDialog
              open={true}
              onClose={() => {}}
              columnasFiltradas={columnasFiltradas}
              columnasOrden={columnasOrden}
              onOrdenChange={handleOrdenColumnasChange}
              ordenPredeterminado={columnasConfig.map(([k]) => k)}
              embedded
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {hiddenColsCount} columnas ocultas en la vista actual.
          </Typography>
        </Stack>
      </Box>
    </Box>
  </DialogContent>
  <DialogActions sx={{ px: 3, py: 2 }}>
    <Button onClick={handleCloseViewConfig}>Cerrar</Button>
    <Button variant="contained" onClick={handleSaveCols} disabled={!prefsHydrated || savingCols} sx={{ bgcolor: BRAND_COLORS.navy, '&:hover': { bgcolor: BRAND_COLORS.teal } }}>
      {savingCols ? 'Guardando…' : 'Guardar configuración'}
    </Button>
  </DialogActions>
</Dialog>

{/* ===== Scrollbar superior sincronizada ===== */}
<Box sx={{ position: 'relative', mb: 0.5 }}>
<Box
  ref={topScrollRef}
  onScroll={(e) => {
    const cont = scrollRef.current;
    if (!cont) return;
    cont.scrollLeft = e.currentTarget.scrollLeft;

    const max = getMax();
    const sl  = cont.scrollLeft;
    setAtStart(sl <= 0);
    setAtEnd(sl >= max - 1 || max <= 0);
  }}

  sx={{
    width: '100%',
    overflowX: 'scroll',   // siempre visible
    overflowY: 'hidden',
    height: 14,

    // mismo look que TableContainer, pero MÁS OSCURO y SIEMPRE visible
    '&::-webkit-scrollbar': { height: 10 },
    '&::-webkit-scrollbar-track': {
      backgroundColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
      borderRadius: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 8,
      backgroundColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
    },

    // Firefox
    scrollbarWidth: 'thin',
    scrollbarColor: (t) =>
      t.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.55) rgba(255,255,255,0.18)'
        : 'rgba(0,0,0,0.45) rgba(0,0,0,0.12)',
  }}
>
<Box sx={{ width: topWidth || '120%' , height: 1 }} />
</Box>


</Box>


{/* ===== Wrapper con fades y flechas ===== */}
<Box sx={{ position: 'relative' }}>
  {/* Fades laterales */}
  {!atStart && (
    <Box
      sx={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 28,
        zIndex: 3,
        background:
          'linear-gradient(to right, rgba(0,0,0,0.10), rgba(0,0,0,0.06), rgba(0,0,0,0.0))',
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
      }}
    />
  )}
  
    <Box
      sx={{
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 28,
        zIndex: 3,
        background:
          'linear-gradient(to left, rgba(0,0,0,0.10), rgba(0,0,0,0.06), rgba(0,0,0,0.0))',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
      }}
    />
  

  {/* Flechas */}
  {!atStart && (
    <IconButton
      size="small"
      onClick={() => scrollByStep('left')}
      sx={{
        position: 'absolute',
        left: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 4,
        bgcolor: 'background.paper',
        boxShadow: 1,
        '&:hover': { bgcolor: 'background.paper' },
      }}
    >
      <ChevronLeftIcon fontSize="small" />
    </IconButton>
  )}
  
    <IconButton
      size="small"
      onClick={() => scrollByStep('right')}
      sx={{
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 4,
        bgcolor: 'background.paper',
        boxShadow: 1,
        '&:hover': { bgcolor: 'background.paper' },
      }}
    >
      <ChevronRightIcon fontSize="small" />
    </IconButton>
  

  {/* Coachmark: se muestra siempre al entrar (no persiste) */}
  <Tooltip
    open={coachOpen && !isMobile}
    onClose={() => setCoachOpen(false)}
    arrow
    placement="top"
    title="Deslizá → para ver más columnas"
  >
    <Box
      onMouseEnter={() => setCoachOpen(false)}
      onClick={() => scrollByStep('right')}
      sx={{
        position: 'absolute',
        right: 40,
        top: -30,
        color: 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        zIndex: 5,
      }}
    >
      <InfoOutlinedIcon fontSize="small" />
      <Typography variant="caption">Deslizá →</Typography>
    </Box>
  </Tooltip>


<TableContainer
  component={Paper}
  ref={scrollRef}
  sx={{
    height: 'calc(100vh - 300px)',
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'rgba(118,117,134,0.16)',
    boxShadow: '0 18px 40px rgba(91,84,165,0.06)',
    overflowX: 'auto',
    overflowY: 'auto',
    pr: 0, // espacio real lo aporta la barra
    bgcolor: 'background.paper',
    '&::-webkit-scrollbar': { height: 10 },                // “barra siempre visible” en WebKit
    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.25)', borderRadius: 8 },
  }}
>
  <Table ref={tableRef} stickyHeader size="small">
    <TableHead>
      <TableRow>
        {/* Checkbox selección masiva */}
        <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>
          <Checkbox
            size="small"
            indeterminate={somePageSelected && !allPageSelected}
            checked={allPageSelected}
            onChange={toggleSelectAll}
          />
        </TableCell>
        {columnasFiltradas.map(([key]) => (
          <TableCell key={key} sx={getHeaderCellSx(key, COLS, cellBase)}>
            {getSortFieldForColumn(key) ? (
              <TableSortLabel
                active={activeSortField === key}
                direction={activeSortField === key ? activeSortDirection : 'asc'}
                onClick={() => handleSortByColumn(key)}
              >
                {getHeaderLabel(key, compactCols)}
              </TableSortLabel>
            ) : (
              getHeaderLabel(key, compactCols)
            )}
          </TableCell>
        ))}

      </TableRow>
    </TableHead>

    <TableBody>
      {paginatedMovs.length === 0 && (
        <TableRow>
          <TableCell colSpan={Object.values(visibleCols).filter(Boolean).length + 1} sx={{ py: 4 }}>
            <Typography variant="subtitle1">Sin resultados</Typography>
            <Typography variant="body2" color="text.secondary">
              Probá ajustar fechas, categorías o limpiar filtros.
            </Typography>
          </TableCell>
        </TableRow>
      )}
      {paginatedMovs.map((item, index) => {
        // Si es un grupo de prorrateo
        if (item.tipo === 'grupo_prorrateo') {
          return (
            <React.Fragment key={`grupo-${item.grupoId}`}>
              {/* Sin fila de encabezado - solo mostrar los movimientos individuales */}
              
              {/* Filas de los movimientos del grupo */}
              {item.movimientos.map((mov, subIndex) => {
                const amountColor =
                  compactCols
                    ? (mov.type === 'ingreso' ? 'success.main' : 'error.main')
                    : 'inherit';
                
                return (
                  <TableRow 
                    key={`${item.grupoId}-${subIndex}`} 
                    hover
                    onClick={() => openDetalle(mov)}
                    sx={{
                      cursor: 'pointer',
                      '& td': { borderBottomColor: 'rgba(118,117,134,0.12)' },
                      '&:hover': { bgcolor: 'rgba(35,181,211,0.05)' },
                      ...(selectedIds.has(mov.id) && { bgcolor: 'rgba(35,181,211,0.10)' }),
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}>
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(mov.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelectOne(mov.id)}
                      />
                    </TableCell>
                    {columnasFiltradas.map(([key]) => (
                      <CajaTablaCell
                        key={key}
                        colKey={key}
                        mov={mov}
                        amountColor={amountColor}
                        ctx={cajaCellCtx}
                        isProrrateo
                      />
                    ))}
                  </TableRow>
                );
              })}
            </React.Fragment>
          );
        }
        
        // Si es un movimiento normal
        const mov = item.data;
        const amountColor =
          compactCols
            ? (mov.type === 'ingreso' ? 'success.main' : 'error.main')
            : 'inherit';

        return (
          <TableRow
            key={index}
            hover
            onClick={() => openDetalle(mov)}
            sx={{
              cursor: 'pointer',
              '& td': { borderBottomColor: 'rgba(118,117,134,0.12)' },
              '&:hover': { bgcolor: 'rgba(35,181,211,0.05)' },
              ...(selectedIds.has(mov.id) && { bgcolor: 'rgba(35,181,211,0.10)' }),
            }}
          >
            <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}>
              <Checkbox
                size="small"
                checked={selectedIds.has(mov.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelectOne(mov.id)}
              />
            </TableCell>
            {columnasFiltradas.map(([key]) => (
              <CajaTablaCell
                key={key}
                colKey={key}
                mov={mov}
                amountColor={amountColor}
                ctx={cajaCellCtx}
              />
            ))}
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
</TableContainer>
<TablePagination
      component="div"
      rowsPerPageOptions={[10, 25, 50, 100]}
      count={totalRows}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage="Filas por página"
      sx={{
        borderTop: '1px solid',
        borderColor: 'rgba(118,117,134,0.16)',
        bgcolor: 'rgba(246,246,246,0.92)',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }}
    />
</Box>
</>
                )}
            </Paper>
          </Stack>
          {/* <AsistenteFlotanteProyecto
  empresa={empresa}
  proyecto={proyecto}
  filtros={filters}
  movimientos={movimientos}
  movimientosUSD={movimientosUSD}
  cajasVirtuales={cajasVirtuales}
  visibleCols={visibleCols}
  compactCols={compactCols}
  totalesDetallados={totalesDetallados}
  totalesUsdBlue={totalesUsdBlue}
/> */}
        </Container>

<Menu
  anchorEl={anchorEl}
  open={Boolean(anchorEl)}
  onClose={handleCloseMenu}
  keepMounted
>
  <MenuOption onClick={() => handleMenuOptionClick('registrarMovimiento')} disabled={!canUseProjectActions}>
    <AddCircleIcon sx={{ mr: 1 }} />
    Registrar movimiento
  </MenuOption>
  <MenuOption onClick={() => {
    handleOpenTransferencia();
    handleCloseMenu();
  }}>
    <SwapHorizIcon sx={{ mr: 1 }} />
    Transferencia interna
  </MenuOption>
  <MenuOption onClick={() => {
    handleOpenIntercambio();
    handleCloseMenu();
  }} disabled={!canUseProjectActions}>
    <CurrencyExchangeIcon sx={{ mr: 1 }} />
    Compra/Venta Moneda
  </MenuOption>
  <MenuOption onClick={() => handleMenuOptionClick('recalcularSheets')} disabled={!canUseProjectActions}>
    <RefreshIcon sx={{ mr: 1 }} />
    Recalcular sheets
  </MenuOption>
  <MenuOption onClick={() => handleMenuOptionClick('filtrar')}>
    <FilterListIcon sx={{ mr: 1 }} />
    Filtros
  </MenuOption>

  <Divider sx={{ my: 1 }} />

  <MenuOption onClick={() => {
    setShowCrearCaja(true);
    handleCloseMenu();
  }}>
    <AddCircleIcon sx={{ mr: 1 }} />
    Agregar nueva caja
  </MenuOption>
  <MenuOption onClick={() => {
    setSavedViewMode(true);
    setEditandoCaja(null);
    setNombreCaja(''); setMonedaCaja(''); setMedioPagoCaja('');
    setEstadoCaja(''); setEquivalenciaCaja('none'); setTypeCaja(''); setBaseCalculoCaja('total');
    setShowCrearCaja(true);
    handleCloseMenu();
  }}>
    <AccountBalanceWalletIcon sx={{ mr: 1 }} />
    Guardar vista actual como caja
  </MenuOption>
  <MenuOption onClick={() => {
    handleRefresh();
    handleCloseMenu();
  }}>
    <RefreshIcon sx={{ mr: 1 }} />
    Actualizar saldos
  </MenuOption>

  <MenuOption onClick={() => handleMenuOptionClick('recalcularEquivalencias')} disabled={!canUseProjectActions}>
    <RefreshIcon sx={{ mr: 1 }} />
    Recalcular valor dolar estimado
  </MenuOption>
  
  <Divider sx={{ my: 1 }} />

  <MenuOption onClick={() => {
    setConfigDrawerOpen(true);
    handleCloseMenu();
  }} disabled={!canUseProjectActions}>
    <SettingsIcon sx={{ mr: 1 }} />
    Configurar proyecto
  </MenuOption>
  
  <MenuOption onClick={() => {
    handleOpenExportCsvDialog();
    handleCloseMenu();
  }}>
    <DownloadIcon sx={{ mr: 1 }} />
    Exportar CSV para análisis
  </MenuOption>
</Menu>

      </Box>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirmar eliminación"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que quieres eliminar este movimiento?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={eliminarMovimiento} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmarPagoMov)}
        onClose={handleCloseConfirmarPagoDialog}
        aria-labelledby="confirmar-pago-title"
      >
        <DialogTitle id="confirmar-pago-title">Confirmar pago</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            ¿Marcar este egreso como pagado por el total de{' '}
            <strong>
              {confirmarPagoMov
                ? formatCurrencyWithCode(Number(confirmarPagoMov.total) || 0, confirmarPagoMov.moneda || 'ARS')
                : ''}
            </strong>
            ?
            {confirmarPagoMov?.estado === 'Parcialmente Pagado' && (
              <Typography component="span" variant="body2" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
                El monto abonado pasará a igualar al total del comprobante.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseConfirmarPagoDialog} disabled={confirmarPagoLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmarPagoEjecutar}
            disabled={confirmarPagoLoading}
            autoFocus
          >
            {confirmarPagoLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={imgPreview.open} onClose={closeImg} maxWidth="md" fullWidth>
  <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    Archivo adjunto
    <Box>
      {imgPreview.url && (
        <IconButton
          size="small"
          component="a"
          href={imgPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mr: 1 }}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton size="small" onClick={closeImg}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  </DialogTitle>
  <DialogContent dividers>
    {imgPreview.url ? (
      imgPreview.url.toLowerCase().includes('.pdf') ? (
        <Box sx={{ height: '70vh' }}>
          <iframe
            src={imgPreview.url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Preview"
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={imgPreview.url}
            alt="Archivo"
            sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
          />
        </Box>
      )
    ) : (
      <Typography variant="body2" color="text.secondary">
        No hay archivo disponible.
      </Typography>
    )}
  </DialogContent>
</Dialog>

<Menu
  anchorEl={mobileActionAnchor}
  open={Boolean(mobileActionAnchor)}
  onClose={closeMobileActions}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
>
  {mobileActionMov?.url_imagen && (
    <MenuItem onClick={() => { openImg(mobileActionMov.url_imagen); closeMobileActions(); }}>
      Ver adjunto
    </MenuItem>
  )}
  {mobileActionMov && (
    <MenuItem onClick={() => { openDetalle(mobileActionMov); closeMobileActions(); }}>
      Comentarios
    </MenuItem>
  )}
  {mobileActionMov && puedeCompletarPagoEgreso(mobileActionMov) && (
    <MenuItem
      onClick={() => {
        setConfirmarPagoMov(mobileActionMov);
        closeMobileActions();
      }}
    >
      <CheckCircleOutlineIcon sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
      Confirmar pago
    </MenuItem>
  )}
  {mobileActionMov && (
    <MenuItem onClick={() => { goToEdit(mobileActionMov); closeMobileActions(); }}>
      Editar
    </MenuItem>
  )}
  {mobileActionMov && (
    <MenuItem onClick={() => { handleEliminarClick(mobileActionMov.id); closeMobileActions(); }}>
      Eliminar
    </MenuItem>
  )}
</Menu>

{isMobile && (
  <Fab
    color="primary"
    onClick={(e) => { setAnchorEl(e.currentTarget); }}
    sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1400 }}
  >
    <MoreVertIcon />
  </Fab>
)}

<Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
  <Box sx={{ width: 360, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Box sx={{ p: 1.5, overflow: 'auto', flex: 1, minHeight: 0 }}>
      <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 600 }}>Detalle del movimiento</Typography>
      {detalleMov ? (
        <>
          <List dense disablePadding sx={{ '& .MuiListItem-root': { py: 0.25 }, '& .MuiListItemText-root': { my: 0 } }}>
            <ListItem><ListItemText primary="Código" secondary={detalleMov.codigo_operacion || detalleMov.codigo || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Fecha" secondary={formatTimestamp(detalleMov.fecha_factura, "DIA/MES/ANO") || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Tipo" secondary={detalleMov.type || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Total" secondary={formatCurrency(detalleMov.total)} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Moneda" secondary={detalleMov.moneda || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Proveedor" secondary={detalleMov.nombre_proveedor || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Categoría" secondary={detalleMov.categoria || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            {detalleMov.subcategoria && (
              <ListItem><ListItemText primary="Subcategoría" secondary={detalleMov.subcategoria} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {detalleMov.obra && (
              <ListItem><ListItemText primary="Obra" secondary={detalleMov.obra} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {detalleMov.cliente && (
              <ListItem><ListItemText primary="Cliente" secondary={detalleMov.cliente} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {empresa?.comprobante_info?.factura_cliente && (
              <ListItem><ListItemText primary="Factura cliente" secondary={detalleMov.factura_cliente ? 'Sí' : 'No'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {detalleMov.observacion && (
              <ListItem><ListItemText primary="Observación" secondary={detalleMov.observacion} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {empresa?.comprobante_info?.detalle && detalleMov.detalle && (
              <ListItem><ListItemText primary="Detalle" secondary={detalleMov.detalle} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
          </List>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            Comentarios ({detalleMov.comentarios?.length || 0})
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }} alignItems="flex-end">
            <TextField
              size="small"
              multiline
              minRows={1}
              maxRows={2}
              placeholder="Agregar comentario..."
              value={comentarioInput}
              onChange={(e) => setComentarioInput(e.target.value)}
              disabled={comentarioLoading}
              sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              inputProps={{ maxLength: 1000 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAgregarComentario}
              disabled={!comentarioInput?.trim() || comentarioLoading}
              sx={{ flexShrink: 0 }}
            >
              Agregar
            </Button>
          </Stack>
          {comentarioError && (
            <Alert severity="error" onClose={() => setComentarioError(null)} sx={{ mb: 1, py: 0.5 }}>
              {comentarioError}
            </Alert>
          )}
          {(!detalleMov.comentarios || detalleMov.comentarios.length === 0) ? (
            <Typography variant="caption" color="text.secondary">Sin comentarios.</Typography>
          ) : (
            <Stack spacing={1}>
              {[...(detalleMov.comentarios || [])]
                .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
                .map((c) => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                      {usuariosComentariosMap[c.userId] || 'Usuario'} · {formatTimestamp(c.createdAt, 'DIA/MES/ANO')}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>{c.comment}</Typography>
                  </Paper>
                ))}
            </Stack>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">Sin datos.</Typography>
      )}
    </Box>
  </Box>
</Drawer>

{/* Dialog de Transferencia Interna */}
<TransferenciaInternaDialog
  open={openTransferencia}
  onClose={handleCloseTransferencia}
  proyectos={proyectos}
  onSuccess={handleTransferenciaSuccess}
  defaultProyectoEmisor={activeProject ? { id: activeProject.id, nombre: activeProject.nombre } : null}
  userPhone={user?.phone}
  mediosPago={empresa?.medios_pago || []}
  showMedioPago={!!empresa?.comprobante_info?.medio_pago}
/>

{/* Dialog de Intercambio de Moneda */}
<IntercambioMonedaDialog
  open={openIntercambio}
  onClose={handleCloseIntercambio}
  onSuccess={handleIntercambioSuccess}
  proyectoId={activeProject?.id}
  empresa={empresa}
/>

{/* ── Barra flotante de selección masiva ── */}
{selectedIds.size > 0 && (
  <Paper
    elevation={6}
    sx={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1300,
      px: 3,
      py: 1.5,
      borderRadius: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      bgcolor: BRAND_COLORS.navy,
      color: '#fff',
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
    </Typography>
    <Button
      size="small"
      variant="contained"
      color="inherit"
      sx={{ color: BRAND_COLORS.navy, fontWeight: 600 }}
      startIcon={<EditIcon />}
      onClick={() => setBulkDialogOpen(true)}
    >
      Editar
    </Button>
    <Button
      size="small"
      variant="text"
      sx={{ color: 'primary.contrastText' }}
      onClick={() => setSelectedIds(new Set())}
    >
      Cancelar
    </Button>
  </Paper>
)}

{/* Dialog edición masiva */}
<BulkEditDialog
  open={bulkDialogOpen}
  onClose={() => setBulkDialogOpen(false)}
  selectedCount={selectedIds.size}
  selectedIds={selectedIds}
  onDone={handleBulkDone}
  options={options}
  empresa={empresa}
/>

{/* Drawer de configuración del proyecto */}
{activeProject && (
  <ProyectoConfigDrawer
    open={configDrawerOpen}
    onClose={() => setConfigDrawerOpen(false)}
    proyecto={activeProject}
    empresa={empresa}
    onProyectoUpdated={(updated) => {
      setProyecto((prev) => ({ ...prev, ...updated }));
      setProyectos((prev) => prev.map((item) => (item.id === activeProject.id ? { ...item, ...updated } : item)));
    }}
  />
)}

<ExportCsvDialog
  open={csvDialogOpen}
  onClose={() => setCsvDialogOpen(false)}
  fields={csvExportFields}
  selectedKeys={csvSelectedFields}
  orderedKeys={csvFieldOrder}
  onToggleField={handleToggleCsvField}
  onReorderField={handleReorderCsvField}
  onSelectAll={() => setCsvSelectedFields(csvDefaultOrder)}
  onClearAll={() => setCsvSelectedFields([])}
  onReset={handleResetCsvConfig}
  onExport={handleExportCsvAnalisis}
  exporting={csvExporting}
  totalRows={totalRows}
/>


    </DashboardLayout>
  );
};

export default CajasPage;
