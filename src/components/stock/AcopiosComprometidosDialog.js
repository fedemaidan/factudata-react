// app-web/src/components/stock/AcopiosComprometidosDialog.js
//
// Vertical corralón (Fase 3C): muestra los acopios activos de clientes que
// comprometen un material puntual. Útil para explicar por qué el stock
// "comprometido" tiene tal o cual valor.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Typography,
  LinearProgress, Alert, Stack,
} from '@mui/material';

import StockMaterialesService from '../../services/stock/stockMaterialesService';

const AcopiosComprometidosDialog = ({ open, onClose, empresaId, sucursalId, material }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !material?._id || !empresaId) return;
    let cancel = false;
    setLoading(true);
    setError(null);
    StockMaterialesService.acopiosComprometidos({
      empresa_id: empresaId,
      material_id: material._id,
      sucursal_id: sucursalId || undefined,
    })
      .then((resp) => { if (!cancel) setItems(resp?.items || []); })
      .catch((err) => { if (!cancel) setError(err?.message || 'Error al cargar acopios'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [open, empresaId, sucursalId, material?._id]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Acopios que comprometen este material
        {material?.nombre && (
          <Typography variant="body2" color="text.secondary">{material.nombre}</Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          {loading && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && !error && items.length === 0 && (
            <Alert severity="info">No hay acopios activos que comprometan este material.</Alert>
          )}
          {items.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Acopio</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell align="right">Comprometido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.acopio_id}>
                    <TableCell>
                      <Typography variant="body2">{it.codigo || '—'}</Typography>
                      {it.descripcion && (
                        <Typography variant="caption" color="text.secondary">{it.descripcion}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{it.cliente || '—'}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>{it.cantidad_comprometida}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AcopiosComprometidosDialog;
