import React, { useState, useMemo } from 'react';
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
  const rowsPerPage = 25;

  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });

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

  const totalMonto = useMemo(
    () => movimientos.reduce((acc, m) => acc + (m.total ?? m.monto ?? 0), 0),
    [movimientos],
  );

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
              <Chip
                label={formatValue(totalMonto, 'currency', displayCurrency)}
                size="small"
                color="primary"
                variant="outlined"
              />
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
                <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }} align="right">Monto</TableCell>
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
                    {formatValue(m.total ?? m.monto ?? 0, 'currency', m.moneda || displayCurrency)}
                  </TableCell>
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
                  <TableCell colSpan={10} align="center">
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
