import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Container, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Button, Stack, TextField, Checkbox, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, Drawer, IconButton, Chip
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { useAuthContext } from 'src/contexts/auth-context';

const CAMPOS_EDITABLES = ['nombre_proveedor', 'observacion', 'categoria', 'subcategoria', 'total', 'numero_factura', 'medio_pago'];

const PanelValidacionPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { empresaId } = router.query;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [editDrawer, setEditDrawer] = useState({ open: false, mov: null, form: {} });
  const [confirming, setConfirming] = useState(false);

  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);

  const [filtros, setFiltros] = useState({
    fechaDesde: hace30Dias.toISOString().split('T')[0],
    fechaHasta: hoy.toISOString().split('T')[0],
    proveedor: '',
    nombre_user: '',
    texto: '',
  });

  const fetchBorradores = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const res = await movimientosService.getBorradores(empresaId, filtros);
      setItems(res.items || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al cargar borradores', severity: 'error' });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, filtros.fechaDesde, filtros.fechaHasta, filtros.proveedor, filtros.nombre_user, filtros.texto]);

  useEffect(() => {
    fetchBorradores();
  }, [fetchBorradores]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(items.map((m) => m.id));
    else setSelected([]);
  };

  const handleSelectOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirmar = async (idsOverride = null) => {
    const ids = idsOverride ?? selected;
    if (ids.length === 0) {
      setSnackbar({ open: true, message: 'Seleccioná al menos un movimiento', severity: 'warning' });
      return;
    }
    setConfirming(true);
    try {
      const res = await movimientosService.confirmarBorradores(ids);
      if (res.error) throw new Error(res.message);
      setSnackbar({ open: true, message: `Confirmados ${res.data?.ok ?? ids.length} movimientos`, severity: 'success' });
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
      fetchBorradores();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Error al confirmar', severity: 'error' });
    } finally {
      setConfirming(false);
    }
  };

  const handleEditar = (mov) => {
    setEditDrawer({
      open: true,
      mov,
      form: {
        nombre_proveedor: mov.nombre_proveedor || '',
        observacion: mov.observacion || '',
        categoria: mov.categoria || '',
        subcategoria: mov.subcategoria || '',
        total: mov.total ?? '',
        numero_factura: mov.numero_factura || '',
        medio_pago: mov.medio_pago || '',
      },
    });
  };

  const handleGuardarEdicion = async () => {
    const { mov, form } = editDrawer;
    if (!mov?.id) return;
    try {
      const res = await movimientosService.updateBorrador(mov.id, form);
      if (res.error) throw new Error(res.message);
      setSnackbar({ open: true, message: 'Movimiento actualizado', severity: 'success' });
      setEditDrawer({ open: false, mov: null, form: {} });
      fetchBorradores();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Error al guardar', severity: 'error' });
    }
  };

  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });

  const getProyectoNombre = (mov) => mov.proyecto_nombre || '-';

  return (
    <>
      <Head>
        <title>Panel de Validación</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Panel de Validación</Typography>
            <Typography variant="body2" color="text.secondary">
              Borradores creados por WhatsApp pendientes de confirmar
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                type="date"
                label="Desde"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))}
                sx={{ width: 150 }}
              />
              <TextField
                type="date"
                label="Hasta"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))}
                sx={{ width: 150 }}
              />
              <TextField
                size="small"
                label="Proveedor"
                value={filtros.proveedor}
                onChange={(e) => setFiltros((f) => ({ ...f, proveedor: e.target.value }))}
                sx={{ minWidth: 180 }}
              />
              <TextField
                size="small"
                label="Usuario"
                value={filtros.nombre_user}
                onChange={(e) => setFiltros((f) => ({ ...f, nombre_user: e.target.value }))}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                label="Buscar"
                placeholder="Texto libre"
                value={filtros.texto}
                onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
                sx={{ minWidth: 180 }}
              />
              <Button variant="outlined" onClick={fetchBorradores}>
                Filtrar
              </Button>
              <Typography variant="body2">
                Total: {total} borradores
              </Typography>
            </Stack>

            {selected.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleConfirmar}
                  disabled={confirming}
                >
                  {confirming ? <CircularProgress size={20} /> : `Confirmar ${selected.length} seleccionados`}
                </Button>
                <Button variant="outlined" size="small" onClick={() => setSelected([])}>
                  Deseleccionar
                </Button>
              </Stack>
            )}

            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress />
              </Box>
            ) : items.length === 0 ? (
              <Typography color="text.secondary">No hay borradores pendientes</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={items.length > 0 && selected.length === items.length}
                        indeterminate={selected.length > 0 && selected.length < items.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Adjunto</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(m.id)}
                          onChange={() => handleSelectOne(m.id)}
                        />
                      </TableCell>
                      <TableCell>{formatTimestamp(m.fecha_factura)}</TableCell>
                      <TableCell>{getProyectoNombre(m)}</TableCell>
                      <TableCell>{m.nombre_proveedor || '-'}</TableCell>
                      <TableCell>{m.nombre_user || '-'}</TableCell>
                      <TableCell>{formatCurrency(m.total)} {m.moneda || 'ARS'}</TableCell>
                      <TableCell>
                        {(m.url_imagen || m.url_image) && (
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); openImg(m.url_imagen || m.url_image); }}
                            title="Ver imagen/PDF"
                          >
                            <ImageIcon fontSize="small" />
                          </IconButton>
                        )}
                        {!m.url_imagen && !m.url_image && <Typography variant="caption" color="text.secondary">-</Typography>}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditar(m)}>
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleConfirmar([m.id])}
                            disabled={confirming}
                          >
                            Confirmar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Container>
      </Box>

      <Dialog open={imgPreview.open} onClose={closeImg} maxWidth="lg" fullWidth>
        <DialogTitle>Comprobante</DialogTitle>
        <DialogContent>
          {imgPreview.url && (
            <Box sx={{ minHeight: 400 }}>
              {String(imgPreview.url).toLowerCase().includes('.pdf') ? (
                <embed src={imgPreview.url} width="100%" height="600px" />
              ) : (
                <img src={imgPreview.url} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Drawer anchor="right" open={editDrawer.open} onClose={() => setEditDrawer({ open: false, mov: null, form: {} })}>
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Editar borrador</Typography>
          {CAMPOS_EDITABLES.map((key) => (
            <TextField
              key={key}
              fullWidth
              label={key.replace(/_/g, ' ')}
              value={editDrawer.form[key] ?? ''}
              onChange={(e) => setEditDrawer((d) => ({ ...d, form: { ...d.form, [key]: e.target.value } }))}
              sx={{ mb: 1.5 }}
              type={key === 'total' ? 'number' : 'text'}
            />
          ))}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleGuardarEdicion}>
              Guardar
            </Button>
            <Button variant="outlined" onClick={() => setEditDrawer({ open: false, mov: null, form: {} })}>
              Cancelar
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

PanelValidacionPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default PanelValidacionPage;
