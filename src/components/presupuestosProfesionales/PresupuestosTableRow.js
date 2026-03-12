import React, { useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  ESTADOS,
  ESTADO_COLOR,
  ESTADO_LABEL,
  TRANSICIONES_VALIDAS,
  formatCurrency,
  formatDate,
  formatPct,
} from './constants';

const PresupuestosTableRow = ({
  row,
  isExpanded,
  exportingPdfId,
  changingEstadoId,
  onToggleExpanded,
  onOpenDetalle,
  onExportPdf,
  onOpenEdit,
  onCambiarEstado,
  onOpenAnexo,
  onDelete,
}) => {
  const [selectOpen, setSelectOpen] = useState(false);
  const estado = ESTADOS.includes(row.estado) ? row.estado : (row.estado || 'borrador');
  const transiciones = TRANSICIONES_VALIDAS[estado] || [];
  const opcionesSelect = [estado, ...transiciones.filter((e) => e !== estado)].filter(Boolean);
  const puedeCambiar = transiciones.length > 0 && changingEstadoId !== row._id;
  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell sx={{ width: 40 }}>
          {row.rubros?.length > 0 && (
            <IconButton size="small" onClick={() => onToggleExpanded(row._id)}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {row.titulo || '(Sin título)'}
          </Typography>
        </TableCell>
        <TableCell>{row.moneda}</TableCell>
        <TableCell align="right">
          {formatCurrency(row.total_neto, row.moneda)}
          {estado === 'aceptado' && (row.anexos || []).length > 0 && (
            <>
              <br />
              <Typography variant="caption" color="primary">
                Actualizado:{' '}
                {formatCurrency(
                  (row.total_neto || 0) +
                    (row.anexos || []).reduce((s, a) => s + (Number(a.monto_diferencia) || 0), 0),
                  row.moneda
                )}
              </Typography>
            </>
          )}
        </TableCell>
        <TableCell>
          {puedeCambiar ? (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={estado}
                renderValue={(v) => ESTADO_LABEL[v] || v}
                open={selectOpen}
                onOpen={() => setSelectOpen(true)}
                onClose={() => setSelectOpen(false)}
                onChange={(e) => {
                  const nuevo = e.target.value;
                  if (nuevo && nuevo !== estado) {
                    onCambiarEstado(row, nuevo);
                    setSelectOpen(false);
                  }
                }}
                disabled={changingEstadoId === row._id}
                displayEmpty
                sx={{
                  height: 28,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  borderRadius: 1.5,
                  '& .MuiSelect-select': { py: 0.5, px: 1.5 },
                  ...(ESTADO_COLOR[estado] && ESTADO_COLOR[estado] !== 'default'
                    ? {
                        backgroundColor: (theme) =>
                          theme.palette.mode === 'light'
                            ? `${theme.palette[ESTADO_COLOR[estado]].main}15`
                            : `${theme.palette[ESTADO_COLOR[estado]].dark}20`,
                        color: (theme) => theme.palette[ESTADO_COLOR[estado]].main,
                        '&:hover': {
                          backgroundColor: (theme) =>
                            theme.palette.mode === 'light'
                              ? `${theme.palette[ESTADO_COLOR[estado]].main}25`
                              : `${theme.palette[ESTADO_COLOR[estado]].dark}30`,
                        },
                      }
                    : {}),
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      mt: 1,
                      boxShadow: 2,
                      '& .MuiMenuItem-root': { fontSize: '0.8125rem' },
                    },
                  },
                }}
              >
                {opcionesSelect.map((e) => (
                  <MenuItem key={e ?? 'empty'} value={e}>
                    {ESTADO_LABEL[e] || e}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Chip
              icon={changingEstadoId === row._id ? <CircularProgress size={14} color="inherit" /> : undefined}
              label={ESTADO_LABEL[estado] || estado}
              color={ESTADO_COLOR[estado] || 'default'}
              size="small"
            />
          )}
        </TableCell>
        <TableCell>{formatDate(row.fecha || row.createdAt)}</TableCell>
        <TableCell align="center">{row.version_actual > 0 ? `v${row.version_actual}` : '—'}</TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={0} justifyContent="center">
            <Tooltip title="Ver detalle">
              <IconButton size="small" onClick={() => onOpenDetalle(row)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={!row.rubros?.length ? 'Sin rubros' : 'Exportar PDF'}>
              <span style={{ display: 'inline-flex' }} onClick={() => onExportPdf(row)}>
                <IconButton size="small" disabled={exportingPdfId === row._id || !row.rubros?.length}>
                  {exportingPdfId === row._id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PictureAsPdfIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            {estado === 'borrador' && (
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => onOpenEdit(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Agregar anexo">
              <IconButton size="small" onClick={() => onOpenAnexo(row)}>
                <PostAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {estado === 'borrador' && (
              <Tooltip title="Eliminar">
                <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      </TableRow>

      {isExpanded && (row.rubros?.length ?? 0) > 0 && (
        <TableRow>
          <TableCell colSpan={9} sx={{ py: 0 }}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ m: 1, ml: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Rubros ({(row.rubros || []).length})
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Rubro</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="right">Incidencia</TableCell>
                      <TableCell>Tareas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(row.rubros || []).map((rubro, ri) => (
                      <TableRow key={ri}>
                        <TableCell>{rubro.orden || ri + 1}</TableCell>
                        <TableCell>{rubro.nombre}</TableCell>
                        <TableCell align="right">{formatCurrency(rubro.monto, row.moneda)}</TableCell>
                        <TableCell align="right">{formatPct(rubro.incidencia_pct)}</TableCell>
                        <TableCell>
                          {(rubro.tareas || []).length > 0
                            ? rubro.tareas.map((t) => t.descripcion).join(', ')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};

export default PresupuestosTableRow;
