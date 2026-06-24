import React, { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, TablePagination, Chip, Box, IconButton, Dialog,
  DialogTitle, DialogContent, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatValue } from 'src/tools/reportEngine';

const COLUMN_LABELS = {
  fecha_factura: 'Fecha',
  tipo: 'Tipo',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  proveedor_nombre: 'Proveedor',
  proyecto_nombre: 'Proyecto',
  monto_original: 'Monto original',
  equivalente_display: 'Monto equivalente',
  monto_display: 'Monto',
  subtotal_display: 'Subtotal',
  ingreso_display: 'Ingreso',
  egreso_display: 'Egreso',
  moneda: 'Moneda',
  medioPago: 'Medio de pago',
  notas: 'Notas',
  etapa: 'Etapa',
  estado: 'Estado',
  usuario_nombre: 'Usuario',
  archivo: 'Archivo',
};

const MOVEMENT_CURRENCY_OPTS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/** Resuelve label de columna, incluyendo columnas multi-moneda dinámicas */
const getColumnLabel = (col) => {
  if (COLUMN_LABELS[col]) return COLUMN_LABELS[col];
  const match = col.match(/^(monto_display|subtotal_display|ingreso_display|egreso_display)__(.+)$/);
  if (match) {
    const baseMap = {
      monto_display: 'Monto',
      subtotal_display: 'Subtotal',
      ingreso_display: 'Ingreso',
      egreso_display: 'Egreso',
    };
    return `${baseMap[match[1]] || match[1]} (${match[2]})`;
  }
  return col;
};

const formatDate = (d) => {
  if (!d) return '-';
  const date = d?.toDate ? d.toDate() : d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const MovementsTableBlock = ({ data, displayCurrency }) => {
  const [page, setPage] = useState(0);
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });

  const {
    columnas = [],
    rows = [],
    pageSize,
    totalRows = 0,
    summaryAccordion,
    summaryLabel = 'Movimientos',
    summaryTotal = 0,
    sinCotizacion = 0,
    mostrarSinCotizacion = false,
    showSummaryCount,
  } = data || {};
  const tableCurrency = data?.displayCurrency || displayCurrency;
  const rowsPerPage = pageSize || 25;

  const visibleRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
  );

  if (!data) return null;

  const renderCell = (row, col) => {
    // Columnas multi-moneda dinámicas (monto_display__ARS, ingreso_display__USD, etc.)
    if (col.match(/^(monto_display|subtotal_display|ingreso_display|egreso_display)__/)) {
      const [, currency] = col.split('__');
      const val = row[col];
      if (val == null) return '';
      return formatValue(val, 'currency', currency, MOVEMENT_CURRENCY_OPTS);
    }

    switch (col) {
      case 'fecha_factura':
        return formatDate(row.fecha_factura || row.fecha);
      case 'tipo':
        return (
          <Chip
            label={row.type === 'egreso' ? 'Egreso' : 'Ingreso'}
            size="small"
            color={row.type === 'egreso' ? 'error' : 'success'}
            variant="outlined"
          />
        );
      case 'monto_display':
        return mostrarSinCotizacion && row._sin_cotizacion
          ? <Chip size="small" color="warning" variant="outlined" label="Sin cotización" />
          : (row.monto_display == null ? '-' : formatValue(row.monto_display, 'currency', tableCurrency, MOVEMENT_CURRENCY_OPTS));
      case 'monto_original':
        return formatValue(row.monto_original, 'currency', row.moneda || 'ARS', MOVEMENT_CURRENCY_OPTS);
      case 'equivalente_display':
        return mostrarSinCotizacion && row._sin_cotizacion
          ? <Chip size="small" color="warning" variant="outlined" label="Sin cotización" />
          : (row.equivalente_display == null ? '-' : formatValue(row.equivalente_display, 'currency', tableCurrency, MOVEMENT_CURRENCY_OPTS));
      case 'subtotal_display':
        return formatValue(row.subtotal_display, 'currency', tableCurrency, MOVEMENT_CURRENCY_OPTS);
      case 'ingreso_display':
        return row.ingreso_display != null ? formatValue(row.ingreso_display, 'currency', tableCurrency, MOVEMENT_CURRENCY_OPTS) : '';
      case 'egreso_display':
        return row.egreso_display != null ? formatValue(row.egreso_display, 'currency', tableCurrency, MOVEMENT_CURRENCY_OPTS) : '';
      case 'moneda':
        return row.moneda || 'ARS';
      case 'subcategoria':
        return row.subcategoria || '-';
      case 'proveedor_nombre':
        return row.nombre_proveedor || '-';
      case 'proyecto_nombre':
        return row.proyecto || '-';
      case 'medioPago':
        return row.medio_pago || '-';
      case 'usuario_nombre':
        return row.usuario_nombre || row.usuario || '-';
      case 'archivo':
        return row.url_imagen ? (
          <IconButton
            size="small"
            onClick={() => setImgPreview({ open: true, url: row.url_imagen })}
            title="Ver comprobante"
          >
            <ImageIcon fontSize="small" />
          </IconButton>
        ) : '-';
      case 'notas':
        return (
          <Typography
            variant="body2"
            sx={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.observacion || '-'}
          </Typography>
        );
      default:
        return row[col] || '-';
    }
  };

  const renderTable = () => (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columnas.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'grey.100',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col === 'equivalente_display'
                    ? `Equivalente (${tableCurrency})`
                    : (COLUMN_LABELS[col] || getColumnLabel(col))}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, idx) => (
              <TableRow key={row.id || idx} hover>
                {columnas.map((col) => (
                  <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                    {renderCell(row, col)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas.length} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay movimientos para los filtros seleccionados
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalRows > rowsPerPage && (
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </>
  );

  return (
    <Box>
      {mostrarSinCotizacion && sinCotizacion > 0 && !summaryAccordion && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 1 }}>
          {sinCotizacion} movimiento{sinCotizacion === 1 ? '' : 's'} sin cotización no se incluyen en el total equivalente.
        </Alert>
      )}
      {summaryAccordion ? (
        <Accordion
          disableGutters
          variant="outlined"
          sx={{
            borderRadius: 1,
            '&:before': { display: 'none' },
            overflow: 'hidden',
            boxShadow: 'none',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              minHeight: 48,
              px: 1.5,
              '&:hover': { bgcolor: 'action.hover' },
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                my: 0.75,
              },
            }}
          >
            <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {summaryLabel}
              </Typography>
              {showSummaryCount && (
                <Chip size="small" variant="outlined" label={`${totalRows || 0} mov.`} sx={{ height: 22 }} />
              )}
              {mostrarSinCotizacion && sinCotizacion > 0 && (
                <Chip size="small" color="warning" variant="outlined" label={`${sinCotizacion} sin cotización`} sx={{ height: 22 }} />
              )}
            </Box>
            <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
              {formatValue(summaryTotal || 0, 'currency', tableCurrency)}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {renderTable()}
          </AccordionDetails>
        </Accordion>
      ) : (
        renderTable()
      )}
      <Dialog open={imgPreview.open} onClose={() => setImgPreview({ open: false, url: null })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Comprobante
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
            <IconButton size="small" onClick={() => setImgPreview({ open: false, url: null })}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {imgPreview.url ? (
            String(imgPreview.url).toLowerCase().includes('.pdf') ? (
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
                  alt="Comprobante"
                  sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              </Box>
            )
          ) : (
            <Typography color="text.secondary">Cargando...</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MovementsTableBlock;
