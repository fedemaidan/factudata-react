import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Collapse, Divider, Drawer, FormControl, FormHelperText,
  IconButton, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CallMadeIcon from '@mui/icons-material/CallMade';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningIcon from '@mui/icons-material/Warning';
import AssignmentIcon from '@mui/icons-material/Assignment';

const DRAWER_WIDTH = 480;

/* ── Helpers ── */
function parseAliasToChips(src) {
  if (Array.isArray(src)) return [...new Set(src.map(String).map((s) => s.trim()).filter(Boolean))];
  if (src == null) return [];
  return [...new Set(String(src).split(/[,;]+/g).map((s) => s.trim()).filter(Boolean))];
}
function removeChip(list, idx) {
  return list.filter((_, i) => i !== idx);
}

const fmtMoney = (n) => {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtMoneyShort = (n) => {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/* ══════════════════════════════════════════════════════
   MaterialDetailDrawer
   ══════════════════════════════════════════════════════ */
export default function MaterialDetailDrawer({
  open,
  material,
  onClose,
  onSave,
  onDelete,
  onCreateTicket,
  categoriasMateriales = [],
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [aliasInput, setAliasInput] = useState('');

  /* sync form when material changes */
  useEffect(() => {
    if (material) {
      setForm({
        _id: material._id,
        nombre: material.nombre || '',
        SKU: material.SKU || '',
        desc_material: material.desc_material || '',
        categoria: material.categoria || '',
        subcategoria: material.subcategoria || '',
        aliasChips: parseAliasToChips(material.alias),
        precio_unitario: material.precio_unitario ?? '',
        empresa_id: material.empresa_id || '',
        empresa_nombre: material.empresa_nombre || '',
      });
      setAliasInput('');
      setEditOpen(false);
    }
  }, [material]);

  const subcategoriasDisponibles = useMemo(() => {
    if (!form.categoria) return [];
    const cat = categoriasMateriales.find((c) => c.name === form.categoria);
    return cat?.subcategorias || [];
  }, [form.categoria, categoriasMateriales]);

  const onAliasKeyDown = (e) => {
    const raw = String(e.target.value || '');
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      const newOnes = parseAliasToChips(raw);
      if (newOnes.length) {
        setForm((f) => ({
          ...f,
          aliasChips: [...new Set([...(f.aliasChips || []), ...newOnes])],
        }));
      }
      setAliasInput('');
    }
  };

  const handleSave = useCallback(() => {
    if (onSave) onSave(form);
  }, [form, onSave]);

  if (!material) return null;

  /* derived values */
  const stockTotal = typeof material.stock === 'number' ? material.stock : (material.stockTotal ?? 0);
  const precio = material.precio_unitario;
  const valorTotal = precio != null ? stockTotal * precio : null;
  const porProyecto = material.porProyecto || [];
  const fechaPrecio = material.fecha_precio ? new Date(material.fecha_precio) : null;
  const diasDesde = fechaPrecio
    ? Math.floor((Date.now() - fechaPrecio.getTime()) / 86400000)
    : null;
  const isStale = diasDesde != null && diasDesde > 30;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: DRAWER_WIDTH }, maxWidth: '100vw' },
      }}
    >
      {/* ═══ Header ═══ */}
      <Box
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          px: 3,
          py: 3,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
          aria-label="Cerrar"
        >
          <CloseIcon />
        </IconButton>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.common.white, 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Inventory2Icon sx={{ fontSize: 28 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
              {material.nombre}
            </Typography>
            {material.SKU && (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                SKU: {material.SKU}
              </Typography>
            )}
            {material.desc_material && (
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                {material.desc_material}
              </Typography>
            )}

            <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
              {material.categoria && (
                <Chip
                  label={material.categoria}
                  size="small"
                  sx={{
                    bgcolor: (theme) => alpha(theme.palette.common.white, 0.2),
                    color: 'white',
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              )}
              {material.subcategoria && (
                <Chip
                  label={material.subcategoria}
                  size="small"
                  sx={{
                    bgcolor: (theme) => alpha(theme.palette.common.white, 0.15),
                    color: 'white',
                    height: 22,
                  }}
                />
              )}
            </Stack>

            {/* Alias */}
            {Array.isArray(material.alias) && material.alias.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                {material.alias.map((a, i) => (
                  <Chip
                    key={`${a}-${i}`}
                    label={a}
                    size="small"
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.common.white, 0.1),
                      color: 'white',
                      height: 20,
                      fontSize: 11,
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      {/* ═══ Stats cards ═══ */}
      <Stack direction="row" spacing={2} sx={{ px: 3, py: 2.5 }}>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={800} color="success.main">
            {stockTotal}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Stock total
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) =>
              valorTotal != null
                ? alpha(theme.palette.primary.main, 0.08)
                : theme.palette.grey[50],
            border: '1px solid',
            borderColor: (theme) =>
              valorTotal != null
                ? alpha(theme.palette.primary.main, 0.3)
                : theme.palette.grey[200],
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h5"
            fontWeight={700}
            color={valorTotal != null ? 'primary.main' : 'text.disabled'}
          >
            {valorTotal != null ? fmtMoneyShort(valorTotal) : '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Valor total
          </Typography>
        </Box>
      </Stack>

      {/* Price info */}
      {precio != null && (
        <Box sx={{ px: 3, pb: 1.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {isStale && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
            <Typography variant="body2" color={isStale ? 'warning.main' : 'text.secondary'}>
              {fmtMoney(precio)} /unidad
              {fechaPrecio && ` · Actualizado: ${fechaPrecio.toLocaleDateString('es-AR')}`}
              {isStale && ` (hace ${diasDesde} días)`}
            </Typography>
          </Stack>
        </Box>
      )}

      <Divider />

      {/* ═══ Quick Actions ═══ */}
      <Box sx={{ px: 3, py: 2 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
          <AssignmentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="subtitle2" color="text.secondary">
            Crear ticket
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<ShoppingCartIcon />}
            onClick={() => onCreateTicket?.('INGRESO', 'COMPRA', material)}
            sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Compra
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<CallMadeIcon />}
            onClick={() => onCreateTicket?.('EGRESO', 'RETIRO', material)}
            sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Retiro
          </Button>
          <Button
            size="small"
            variant="contained"
            color="info"
            startIcon={<SwapHorizIcon />}
            onClick={() => onCreateTicket?.('TRANSFERENCIA', null, material)}
            sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Transferir
          </Button>
        </Stack>
      </Box>

      <Divider />

      {/* ═══ Stock por proyecto ═══ */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Stock por proyecto ({porProyecto.length})
        </Typography>
        {porProyecto.length > 0 ? (
          <Table size="small" sx={{ '& td, & th': { px: 1, py: 0.5 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Proyecto</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Stock</TableCell>
                {precio != null && (
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Costo</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {porProyecto.map((p) => {
                const qty = p.stock || p.cantidad || 0;
                const costo = precio != null ? qty * precio : null;
                return (
                  <TableRow key={p.proyecto_id || p.proyecto_nombre}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {p.proyecto_nombre || '(sin nombre)'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700} color={qty <= 0 ? 'error.main' : 'success.main'}>
                        {qty}
                      </Typography>
                    </TableCell>
                    {precio != null && (
                      <TableCell align="right">
                        <Typography variant="body2">{fmtMoney(costo)}</Typography>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {precio != null && (
                <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider' } }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>Total</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={700}>
                      {porProyecto.reduce((s, p) => s + (p.stock || p.cantidad || 0), 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={700}>
                      {fmtMoney(
                        porProyecto.reduce((s, p) => s + (p.stock || p.cantidad || 0), 0) * precio
                      )}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No hay stock distribuido por proyectos
          </Typography>
        )}
      </Box>

      <Divider />

      {/* ═══ Edit section (collapsible) ═══ */}
      <Box sx={{ px: 3, py: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          onClick={() => setEditOpen((o) => !o)}
          sx={{ cursor: 'pointer', py: 1, userSelect: 'none' }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <EditIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              Editar material
            </Typography>
          </Stack>
          {editOpen ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
        </Stack>

        <Collapse in={editOpen}>
          <Stack spacing={2} sx={{ pb: 2 }}>
            <TextField
              size="small"
              label="Nombre"
              value={form.nombre || ''}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
            <TextField
              size="small"
              label="Descripción"
              value={form.desc_material || ''}
              onChange={(e) => setForm((f) => ({ ...f, desc_material: e.target.value }))}
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="SKU"
                value={form.SKU || ''}
                onChange={(e) => setForm((f) => ({ ...f, SKU: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Precio ($)"
                type="number"
                value={form.precio_unitario ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, precio_unitario: e.target.value }))}
                sx={{ flex: 1 }}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Categoría</InputLabel>
                <Select
                  label="Categoría"
                  value={form.categoria || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoria: e.target.value, subcategoria: '' }))
                  }
                >
                  <MenuItem value="">
                    <em>Sin categoría</em>
                  </MenuItem>
                  {categoriasMateriales.map((c) => (
                    <MenuItem key={c.id || c.name} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Subcategoría</InputLabel>
                <Select
                  label="Subcategoría"
                  value={form.subcategoria || ''}
                  onChange={(e) => setForm((f) => ({ ...f, subcategoria: e.target.value }))}
                  disabled={!form.categoria}
                >
                  <MenuItem value="">
                    <em>Sin subcategoría</em>
                  </MenuItem>
                  {subcategoriasDisponibles.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Alias chips */}
            <FormControl size="small">
              <InputLabel shrink>Alias</InputLabel>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  flexWrap: 'wrap',
                  p: 1,
                  pt: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minHeight: 42,
                  gap: 0.5,
                }}
              >
                {(form.aliasChips || []).map((a, idx) => (
                  <Chip
                    key={`${a}-${idx}`}
                    label={a}
                    size="small"
                    onDelete={() =>
                      setForm((f) => ({
                        ...f,
                        aliasChips: removeChip(f.aliasChips, idx),
                      }))
                    }
                  />
                ))}
                <TextField
                  variant="standard"
                  placeholder="Enter, coma o ;"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={onAliasKeyDown}
                  sx={{ minWidth: 100, flex: 1 }}
                />
              </Stack>
            </FormControl>

            <Button variant="contained" onClick={handleSave} fullWidth>
              Guardar cambios
            </Button>
          </Stack>
        </Collapse>
      </Box>

      <Divider />

      {/* ═══ Delete ═══ */}
      <Box sx={{ px: 3, py: 2, mt: 'auto' }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete?.(material)}
        >
          Eliminar material
        </Button>
      </Box>
    </Drawer>
  );
}
