import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, TablePagination, IconButton, Stack, Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatValue } from 'src/tools/reportEngine';

const formatDate = (d) => {
  if (!d) return '-';
  const date = d?.toDate ? d.toDate() : d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Dialog que muestra los movimientos que componen un cálculo (drill-down).
 * Se abre al clickear un valor en metric_cards, summary_table, o budget_vs_actual.
 */
const DrillDownDialog = ({ open, onClose, movimientos = [], titulo = '', displayCurrency = 'ARS' }) => {
  const [page, setPage] = useState(0);
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [showUsd, setShowUsd] = useState(false);
  const [showCac, setShowCac] = useState(false);
  const rowsPerPage = 25;

  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });

  // Cerrar preview si se cierra el dialog padre
  useEffect(() => {
    if (!open) closeImg();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setShowUsd(false);
    setShowCac(false);
    setPage(0);
  }, [open, displayCurrency]);

  const getAmountByCurrency = (mov, currency) => {
    const total = Number(mov?.total ?? mov?.monto ?? 0);
    const monedaMov = (mov?.moneda || 'ARS').toUpperCase();
    const eqTotal = mov?.equivalencias?.total || {};

    if (currency === 'ARS') {
      if (monedaMov === 'ARS') return total;
      if (eqTotal.ars != null && !isNaN(eqTotal.ars)) return Number(eqTotal.ars);
      return total;
    }

    if (currency === 'USD') {
      if (monedaMov === 'USD') return total;
      if (eqTotal.usd_blue != null && !isNaN(eqTotal.usd_blue)) return Number(eqTotal.usd_blue);
      return null;
    }

    if (currency === 'CAC') {
      if (monedaMov === 'CAC') return total;
      if (eqTotal.cac != null && !isNaN(eqTotal.cac)) return Number(eqTotal.cac);
      return null;
    }

    return total;
  };

  const formatCurrencyValue = (amount, currency) => {
    if (amount == null || isNaN(amount)) return '-';
    if (currency === 'ARS') {
      return formatValue(amount, 'currency', 'ARS');
    }
    if (currency === 'USD') {
      return Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    if (currency === 'CAC') {
      return Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(amount);
  };

  const sortedMovs = useMemo(() => {
    return [...movimientos].sort((a, b) => {
      const da = a.fecha_factura?.toDate?.() || a.fecha_factura?.seconds ? new Date(a.fecha_factura.seconds * 1000) : new Date(a.fecha_factura || a.fecha || 0);
      const db = b.fecha_factura?.toDate?.() || b.fecha_factura?.seconds ? new Date(b.fecha_factura.seconds * 1000) : new Date(b.fecha_factura || b.fecha || 0);
      return db.getTime() - da.getTime();
    });
  }, [movimientos]);

  const visibleRows = useMemo(
    () => sortedMovs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedMovs, page],
  );

  const acumuladoById = useMemo(() => {
    const ordered = [...sortedMovs].reverse(); // cronológico para acumulado
    const map = {};
    let running = 0;

    for (const m of ordered) {
      const amount = getAmountByCurrency(m, 'ARS');
      if (amount != null && !isNaN(amount)) {
        running += Number(amount);
      }
      map[m.id] = running;
    }

    return map;
  }, [sortedMovs]);

  const totalesPorMoneda = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      const cur = m.moneda || displayCurrency;
      map[cur] = (map[cur] || 0) + (m.total ?? m.monto ?? 0);
    }
    return map;
  }, [movimientos, displayCurrency]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography variant="h6" fontWeight={600}>
              {titulo || 'Movimientos del cálculo'}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {movimientos.length} movimientos
              </Typography>
              <Chip label="ARS" size="small" color="primary" variant="filled" />
              <Chip
                label="USD"
                size="small"
                color="success"
                variant={showUsd ? 'filled' : 'outlined'}
                onClick={() => setShowUsd((prev) => !prev)}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label="CAC"
                size="small"
                color="secondary"
                variant={showCac ? 'filled' : 'outlined'}
                onClick={() => setShowCac((prev) => !prev)}
                sx={{ cursor: 'pointer' }}
              />
              {Object.entries(totalesPorMoneda).map(([cur, total]) => (
                <Chip
                  key={cur}
                  label={formatValue(total, 'currency', cur)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Categoría</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Proveedor</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Proyecto</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Etapa</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }} align="right">
                  Monto (ARS)
                </TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }} align="right">
                  Acumulado (ARS)
                </TableCell>
                {showUsd && <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100', color: 'success.main' }} align="right">USD</TableCell>}
                {showCac && <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100', color: 'secondary.main' }} align="right">CAC</TableCell>}
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Notas</TableCell>
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100', textAlign: 'center' }}>Archivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((m, idx) => (
                <TableRow key={m.id || idx} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatDate(m.fecha_factura || m.fecha)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.type === 'egreso' ? 'Egreso' : 'Ingreso'}
                      size="small"
                      color={m.type === 'egreso' ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{m.categoria || '-'}</TableCell>
                  <TableCell>{m.nombre_proveedor || '-'}</TableCell>
                  <TableCell>{m.proyecto || '-'}</TableCell>
                  <TableCell>{m.etapa || '-'}</TableCell>
                  <TableCell>{m.usuario_nombre || m.usuario || '-'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {formatCurrencyValue(getAmountByCurrency(m, 'ARS'), 'ARS')}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontWeight: 500 }}>
                    {formatCurrencyValue(acumuladoById[m.id], 'ARS')}
                  </TableCell>
                  {showUsd && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'success.main' }}>
                      {formatCurrencyValue(getAmountByCurrency(m, 'USD'), 'USD')}
                    </TableCell>
                  )}
                  {showCac && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'secondary.main' }}>
                      {formatCurrencyValue(getAmountByCurrency(m, 'CAC'), 'CAC')}
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {m.observacion || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    {m.url_imagen && (
                      <IconButton
                        size="small"
                        onClick={() => openImg(m.url_imagen)}
                        title="Ver archivo"
                      >
                        <ImageIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11 + (showUsd ? 1 : 0) + (showCac ? 1 : 0)} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Sin movimientos
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {sortedMovs.length > rowsPerPage && (
          <TablePagination
            component="div"
            count={sortedMovs.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      {/* Dialog para preview de imagen */}
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
                  alt="Preview"
                  sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              </Box>
            )
          ) : (
            <Typography color="text.secondary">Cargando...</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default DrillDownDialog;
