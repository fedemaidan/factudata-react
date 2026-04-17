import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  TableCell,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { puedeCompletarPagoEgreso } from 'src/utils/movimientoPagoCompleto';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const CajaTablaCell = ({ colKey, mov, amountColor, ctx, isProrrateo = false }) => {
  const {
    empresa,
    compactCols,
    formatTimestamp,
    formatCurrency,
    openImg,
    openDetalle,
    goToEdit,
    handleEliminarClick,
    onOpenConfirmarPago,
    deletingElement,
    COLS,
    cellBase,
    ellipsis,
  } = ctx;

  const cell = (sx, children) => (
    <TableCell key={colKey} sx={sx}>
      {children}
    </TableCell>
  );

  const stickyLeft = { ...cellBase, minWidth: COLS.codigo, position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' };
  const stickyRight = {
    ...cellBase, minWidth: COLS.acciones, textAlign: 'center',
    position: 'sticky', right: 0, zIndex: 1, bgcolor: 'background.paper',
    boxShadow: 'inset 8px 0 8px -8px rgba(0,0,0,0.12)',
  };

  switch (colKey) {
    case 'codigo': {
      const codigoText = mov.codigo_operacion || mov.codigo || mov.id || 'Sin código';
      return cell(
        stickyLeft,
        <Stack direction="row" spacing={0.75} alignItems="center">
          {isProrrateo && (
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'info.main' }}>P</Typography>
          )}
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E4469' }}>{codigoText}</Typography>
        </Stack>
      );
    }
    case 'proyecto':
      return cell(
        ellipsis(COLS.proyecto),
        <Tooltip title={mov.proyecto_nombre || mov.proyecto || ''}>
          <span>{mov.proyecto_nombre || mov.proyecto || '—'}</span>
        </Tooltip>
      );
    case 'fechas':
      return cell(
        { ...cellBase, minWidth: COLS.fecha + 40 },
        <Stack direction="row" spacing={1} divider={<span>•</span>}>
          <Typography variant="body2">Fac: {formatTimestamp(mov.fecha_factura, 'DIA/MES/ANO')}</Typography>
          <Typography variant="body2" color="text.secondary">
            Cre: {formatTimestamp(mov.fecha_creacion, 'DIA/MES/ANO')}
          </Typography>
        </Stack>
      );
    case 'fechaFactura':
      return cell({ ...cellBase, minWidth: COLS.fecha }, formatTimestamp(mov.fecha_factura, 'DIA/MES/ANO'));
    case 'fechaCreacion':
      return cell({ ...cellBase, minWidth: COLS.fecha }, formatTimestamp(mov.fecha_creacion, 'DIA/MES/ANO'));
    case 'tipo':
      return cell(
        { ...cellBase, minWidth: COLS.tipo },
        <Typography variant="body2" sx={{ fontWeight: 700, color: mov.type === 'ingreso' ? 'success.main' : 'text.primary', textTransform: 'capitalize' }}>
          {mov.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
        </Typography>
      );
    case 'total':
      return cell(
        { ...cellBase, minWidth: COLS.total, textAlign: 'right', fontWeight: 800, color: amountColor },
        formatCurrencyWithCode(Number(mov.total) || 0, mov.moneda || 'ARS')
      );
    case 'montoPagado':
      return cell(
        { ...cellBase, minWidth: COLS.montoPagado, textAlign: 'right' },
        mov.monto_pagado != null && mov.monto_pagado !== ''
          ? formatCurrencyWithCode(Number(mov.monto_pagado) || 0, mov.moneda || 'ARS')
          : '—'
      );
    case 'montoAprobado':
      return cell(
        { ...cellBase, minWidth: COLS.montoAprobado, textAlign: 'right' },
        mov.monto_aprobado != null && mov.monto_aprobado !== ''
          ? formatCurrencyWithCode(Number(mov.monto_aprobado) || 0, mov.moneda || 'ARS')
          : '—'
      );
    case 'categoria':
      return cell(
        { ...cellBase, minWidth: COLS.categoria },
        compactCols ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{mov.categoria || 'Sin categoría'}</Typography>
            {empresa?.comprobante_info?.subcategoria && mov.subcategoria && (
              <Typography variant="caption" color="text.secondary">/ {mov.subcategoria}</Typography>
            )}
          </Stack>
        ) : (
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{mov.categoria || '—'}</Typography>
            {mov.subcategoria && (
              <Typography variant="caption" color="text.secondary">{mov.subcategoria}</Typography>
            )}
          </Stack>
        )
      );
    case 'subcategoria':
      return cell({ ...cellBase, minWidth: COLS.subcategoria }, mov.subcategoria);
    case 'medioPago':
      return cell(
        { ...cellBase, minWidth: COLS.medioPago },
        <Typography variant="body2">{mov.medio_pago || '-'}</Typography>
      );
    case 'proveedor':
      return cell(
        ellipsis(COLS.proveedor),
        <Tooltip title={mov.nombre_proveedor || ''}><span>{mov.nombre_proveedor}</span></Tooltip>
      );
    case 'obra':
      return cell(ellipsis(COLS.obra), <Tooltip title={mov.obra || ''}><span>{mov.obra || '—'}</span></Tooltip>);
    case 'cliente':
      return cell(ellipsis(COLS.cliente), <Tooltip title={mov.cliente || ''}><span>{mov.cliente || '—'}</span></Tooltip>);
    case 'observacion':
      return cell(ellipsis(COLS.observacion), <Tooltip title={mov.observacion || ''}><span>{mov.observacion}</span></Tooltip>);
    case 'detalle':
      return cell(ellipsis(COLS.detalle), <Tooltip title={mov.detalle || ''}><span>{mov.detalle}</span></Tooltip>);
    case 'usuario':
      return cell(ellipsis(COLS.usuario), <Tooltip title={mov.nombre_user || ''}><span>{mov.nombre_user || '—'}</span></Tooltip>);
    case 'tc':
      return cell({ ...cellBase, minWidth: COLS.tc }, mov.tc ? `$ ${mov.tc}` : '-');
    case 'usd':
      return cell(
        { ...cellBase, minWidth: COLS.usd },
        mov.equivalencias ? `US$ ${mov.equivalencias.total.usd_blue?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'
      );
    case 'mep':
      return cell(
        { ...cellBase, minWidth: COLS.mep },
        mov.equivalencias ? `US$ ${mov.equivalencias.total.usd_mep_medio?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'
      );
    case 'estado':
      const estadoColor = mov.estado === 'Pagado' || mov.estado === 'Aprobado'
        ? 'success.main'
        : mov.estado === 'Pendiente' || mov.estado === 'Parcialmente Pagado'
          ? 'warning.main'
          : mov.estado === 'Rechazado'
            ? 'error.main'
            : 'text.primary';
      return cell(
        { ...cellBase, minWidth: COLS.estado },
        mov.estado ? <Typography variant="body2" sx={{ fontWeight: 700, color: estadoColor }}>{mov.estado}</Typography> : ''
      );
    case 'empresaFacturacion':
      return cell({ ...cellBase, minWidth: COLS.empresaFacturacion }, mov.empresa_facturacion || '—');
    case 'facturaCliente':
      return cell({ ...cellBase, minWidth: COLS.facturaCliente }, mov.factura_cliente ? 'Sí' : 'No');
    case 'fechaPago':
      return cell({ ...cellBase, minWidth: COLS.fechaPago }, mov.fecha_pago ? formatTimestamp(mov.fecha_pago, 'DIA/MES/ANO') : '—');
    case 'tagsExtra':
      return cell(
        { ...cellBase, minWidth: COLS.tagsExtra },
        Array.isArray(mov.tags_extra) && mov.tags_extra.length > 0
          ? <Typography variant="body2">{mov.tags_extra.join(', ')}</Typography>
          : '—'
      );
    case 'dolarReferencia':
      return cell(
        { ...cellBase, minWidth: COLS.dolarReferencia },
        mov.dolar_referencia ? `$ ${mov.dolar_referencia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'
      );
    case 'totalDolar':
      return cell(
        { ...cellBase, minWidth: COLS.totalDolar, textAlign: 'right' },
        mov.total_dolar ? `US$ ${mov.total_dolar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'
      );
    case 'subtotalDolar':
      return cell(
        { ...cellBase, minWidth: COLS.subtotalDolar, textAlign: 'right' },
        mov.subtotal_dolar ? `US$ ${mov.subtotal_dolar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'
      );
    case 'acciones':
      return cell(
        stickyRight,
        <>
          {puedeCompletarPagoEgreso(mov) && onOpenConfirmarPago && (
            <Tooltip title="Confirmar pago">
              <IconButton
                size="small"
                color="success"
                aria-label="Confirmar pago"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConfirmarPago(mov);
                }}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {mov.url_imagen && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openImg(mov.url_imagen); }}>
              <ImageIcon fontSize="small" />
            </IconButton>
          )}
          <Tooltip title={mov.comentarios?.length ? `Comentarios (${mov.comentarios.length})` : 'Comentarios'}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openDetalle(mov); }}>
              <Badge
                badgeContent={mov.comentarios?.length || 0}
                color="error"
                max={99}
                showZero={false}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 14, height: 14 } }}
              >
                <CommentIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); goToEdit(mov); }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={(e) => { e.stopPropagation(); handleEliminarClick(mov.id); }}
            disabled={deletingElement === mov.id}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      );
    default:
      return cell(cellBase, '—');
  }
};

CajaTablaCell.propTypes = {
  colKey: PropTypes.string.isRequired,
  mov: PropTypes.object.isRequired,
  amountColor: PropTypes.string,
  isProrrateo: PropTypes.bool,
  ctx: PropTypes.shape({
    empresa: PropTypes.object,
    compactCols: PropTypes.bool,
    formatTimestamp: PropTypes.func,
    formatCurrency: PropTypes.func,
    openImg: PropTypes.func,
    openDetalle: PropTypes.func,
    goToEdit: PropTypes.func,
    handleEliminarClick: PropTypes.func,
    onOpenConfirmarPago: PropTypes.func,
    deletingElement: PropTypes.any,
    COLS: PropTypes.object,
    cellBase: PropTypes.object,
    ellipsis: PropTypes.func,
  }).isRequired,
};

export default CajaTablaCell;
