import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PendingIcon from '@mui/icons-material/Pending';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export const TIPO_OPCIONES = ['INGRESO', 'EGRESO', 'TRANSFERENCIA', 'AJUSTE', 'COMPRA'];
export const ESTADO_OPCIONES = ['PENDIENTE', 'PARCIALMENTE_ENTREGADO', 'ENTREGADO', 'PENDIENTE_CONFIRMACION'];

/** Opciones de subtipo según el tipo seleccionado */
export const SUBTIPO_POR_TIPO = {
  INGRESO: ['COMPRA', 'DESACOPIO', 'DONACION', 'GENERAL'],
  EGRESO: ['RETIRO', 'ENTREGA', 'DEVOLUCION_RECHAZO', 'GENERAL'],
  TRANSFERENCIA: ['ENTRE_OBRAS'],
  AJUSTE: ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'],
  COMPRA: ['COMPRA'],
};

/** Labels legibles para subtipos */
export const SUBTIPO_LABELS = {
  COMPRA: 'Compra',
  DESACOPIO: 'Desacopio',
  DONACION: 'Donación',
  GENERAL: 'General',
  PENDIENTE_ASIGNAR: 'Pendiente de asignar',
  RETIRO: 'Retiro',
  ENTREGA: 'Entrega',
  DEVOLUCION_RECHAZO: 'Devolución / Rechazo',
  ENTRE_OBRAS: 'Entre obras',
  AJUSTE_POSITIVO: 'Ajuste positivo',
  AJUSTE_NEGATIVO: 'Ajuste negativo',
};
export const ORDER_MAP = { fecha: 'fecha', tipo: 'tipo', subtipo: 'subtipo', responsable: 'responsable', updated: 'updatedAt', estado: 'estado' };

/** Color, label e icono según estado de la solicitud */
export const getEstadoChip = (estado) => {
  switch (estado?.toUpperCase()) {
    case 'ENTREGADO':
      return { color: 'success', label: 'Entregado', icon: <CheckCircleIcon fontSize="small" /> };
    case 'PARCIALMENTE_ENTREGADO':
      return { color: 'warning', label: 'Parcial', icon: <HourglassEmptyIcon fontSize="small" /> };
    case 'PENDIENTE_CONFIRMACION':
      return { color: 'info', label: 'Pend. confirmación', icon: <PendingIcon fontSize="small" /> };
    case 'PENDIENTE':
    default:
      return { color: 'error', label: 'Pendiente', icon: <PendingIcon fontSize="small" /> };
  }
};

/** Formatear fecha legible */
export function fmt(d) {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('es-ES');
  } catch {
    return d || '—';
  }
}

/** Icono por tipo de solicitud */
export const getTipoIcon = (tipo) => {
  switch (tipo?.toUpperCase()) {
    case 'INGRESO': return <CallReceivedIcon color="success" />;
    case 'EGRESO': return <CallMadeIcon color="error" />;
    case 'TRANSFERENCIA': return <SwapHorizIcon color="info" />;
    case 'AJUSTE': return <TuneIcon color="secondary" />;
    case 'COMPRA': return <ShoppingCartIcon color="primary" />;
    default: return null;
  }
};

/** Calcular totales de movimientos */
export const calculateTotals = (movimientos) => {
  if (!Array.isArray(movimientos)) return { totalItems: 0, totalCantidad: 0, sinConciliar: 0 };
  const sinConciliar = movimientos.filter((m) => !m.id_material).length;
  return {
    totalItems: movimientos.length,
    totalCantidad: movimientos.reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0),
    sinConciliar,
  };
};
