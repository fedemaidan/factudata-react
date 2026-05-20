import React, { useState } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TableFooter,
  IconButton, Chip, Collapse, Tooltip, Menu, MenuItem,
  TextField, Stack, Typography, Select, InputLabel, FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import AcopioService from 'src/services/acopioService';

const fmtCurrency = (v) =>
  v != null
    ? Number(v).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '—';

const fmtFecha = (raw) => {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ESTADO_COLOR = {
  confirmado:  'success',
  pendiente:   'warning',
  rechazado:   'error',
  cancelado:   'error',
  en_revision: 'info',
};

const RemitosTable = ({
  remitos,
  remitoMovimientos,
  setRemitoMovimientos,
  expanded,
  setExpanded,
  router,
  acopioId,
  remitosDuplicados,
  setDialogoEliminarAbierto,
  setRemitoAEliminar,
  onExportarInforme,
  onNuevoRemito,
  onConfirmarBorrador,
}) => {
  const [filtroEstado, setFiltroEstado]           = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde]   = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta]   = useState('');
  const [filtroNumero, setFiltroNumero]           = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos]     = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor]   = useState(null);

  const remitosFiltrados = remitos.filter((r) => {
    const fecha = new Date(r.fecha);
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const hasta = filtroFechaHasta ? new Date(filtroFechaHasta) : null;
    const q = (filtroNumero || '').toLowerCase();
    const matchTexto = !q || [r.numero_remito, r.etiqueta]
      .some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
    return (
      (!filtroEstado || r.estado === filtroEstado) &&
      (!desde || fecha >= desde) &&
      (!hasta || fecha <= hasta) &&
      matchTexto
    );
  });

  const totalFiltrado = remitosFiltrados.reduce((s, r) => s + (Number(r.valorOperacion) || 0), 0);

  const filtrosActivos = filtroEstado || filtroFechaDesde || filtroFechaHasta || filtroNumero;

  const exportarExcel = () => {
    const data = remitosFiltrados.map((r) => ({
      Número:          r.numero_remito || '—',
      Fecha:           fmtFecha(r.fecha),
      Estado:          r.estado || '—',
      'Valor Operación': Number(r.valorOperacion) || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remitos');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'remitos.xlsx');
    setExportMenuAnchor(null);
  };

  const handleExportarInforme = () => {
    setExportMenuAnchor(null);
    onExportarInforme?.();
  };

  return (
    <Box>
      {/* Barra de herramientas */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        {/* Búsqueda siempre visible */}
        <TextField
          size="small"
          placeholder="Buscar por número o etiqueta..."
          value={filtroNumero}
          onChange={(e) => setFiltroNumero(e.target.value)}
          sx={{ minWidth: 200 }}
        />

        {/* Toggle filtros avanzados */}
        <Button
          size="small"
          variant={filtrosActivos ? 'contained' : 'outlined'}
          startIcon={<FilterListIcon />}
          onClick={() => setFiltrosAbiertos((v) => !v)}
          color={filtrosActivos ? 'primary' : 'inherit'}
        >
          Filtros{filtrosActivos ? ' ·' : ''}
        </Button>

        <Box sx={{ flex: 1 }} />

        {onNuevoRemito && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onNuevoRemito}>
            Cargar remito
          </Button>
        )}

        {/* Exportar — dropdown unificado */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          endIcon={<ExpandMoreIcon fontSize="small" />}
          onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          disabled={remitos.length === 0}
        >
          Exportar
        </Button>
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={exportarExcel}>Excel (.xlsx)</MenuItem>
          <MenuItem onClick={handleExportarInforme} disabled={!onExportarInforme}>Informe detallado</MenuItem>
        </Menu>
      </Stack>

      {/* Filtros avanzados colapsables */}
      <Collapse in={filtrosAbiertos}>
        <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              label="Estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pendiente">Pendiente</MenuItem>
              <MenuItem value="confirmado">Confirmado</MenuItem>
              <MenuItem value="rechazado">Rechazado</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Desde"
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {filtrosActivos && (
            <Button size="small" variant="text" onClick={() => { setFiltroEstado(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setFiltroNumero(''); }}>
              Limpiar
            </Button>
          )}
        </Stack>
      </Collapse>

      {/* Hint de navegación */}
      {remitos.length > 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
          Clic en una fila para ver los materiales · usa ✏ para editar el remito · 🔗 para abrir el comprobante adjunto
        </Typography>
      )}

      {/* Tabla */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={32} />
            <TableCell>Número</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell align="right">Acumulado</TableCell>
            <TableCell align="right" width={120}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {remitosFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                {remitos.length === 0 ? 'No hay remitos cargados' : 'Ningún remito coincide con los filtros'}
              </TableCell>
            </TableRow>
          )}
          {(() => {
            let acumulado = 0;
            return remitosFiltrados.map((remito) => {
            acumulado += Number(remito.valorOperacion) || 0;
            const acumuladoFila = acumulado;
            const isExpanded = expanded === remito.id;
            const url = Array.isArray(remito.url_remito) ? remito.url_remito[0] : remito.url_remito;
            return (
              <React.Fragment key={remito.id}>
                <TableRow
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={async () => {
                    if (isExpanded) {
                      setExpanded(null);
                    } else {
                      setExpanded(remito.id);
                      if (!remitoMovimientos[remito.id]) {
                        const movs = await AcopioService.obtenerMovimientosDeRemito(acopioId, remito.id);
                        setRemitoMovimientos((prev) => ({ ...prev, [remito.id]: movs }));
                      }
                    }
                  }}
                >
                  {/* Expand icon */}
                  <TableCell sx={{ p: 0.5 }}>
                    <IconButton size="small" tabIndex={-1}>
                      {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.25}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <span>{remito.numero_remito || <Typography variant="caption" color="text.disabled">Sin número</Typography>}</span>
                        {(remito.es_borrador || remito.estado === 'borrador') && (
                          <Tooltip title={`Borrador cargado por ${remito.borrador_creado_por_mail || 'obra'} — falta validar`}>
                            <Chip label="Borrador" color="info" size="small" sx={{ fontSize: 10, height: 18 }} />
                          </Tooltip>
                        )}
                        {remitosDuplicados.has(remito.id) && (
                          <Tooltip title="Posible duplicado">
                            <Chip label="Duplicado" color="warning" size="small" sx={{ fontSize: 10, height: 18 }} />
                          </Tooltip>
                        )}
                        {(remito.es_borrador || remito.estado === 'borrador') && onConfirmarBorrador && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            sx={{ ml: 0.5, py: 0, px: 1, minHeight: 22, fontSize: 11 }}
                            onClick={(e) => { e.stopPropagation(); onConfirmarBorrador(remito); }}
                          >
                            Confirmar
                          </Button>
                        )}
                      </Stack>
                      {remito.etiqueta && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {remito.etiqueta}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {fmtFecha(remito.fecha)}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={remito.estado || '—'}
                      color={ESTADO_COLOR[remito.estado] || 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {fmtCurrency(remito.valorOperacion)}
                  </TableCell>

                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {fmtCurrency(acumuladoFila)}
                  </TableCell>

                  {/* Acciones inline */}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/gestionRemito?acopioId=${acopioId}&remitoId=${remito.id}`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {url && (
                        <Tooltip title="Ver comprobante">
                          <IconButton size="small" onClick={() => window.open(url, '_blank')}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setRemitoAEliminar(remito);
                            setDialogoEliminarAbierto(true);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>

                {/* Fila expandida con movimientos */}
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Materiales del remito</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Código</TableCell>
                              <TableCell>Descripción</TableCell>
                              <TableCell align="right">Cantidad</TableCell>
                              <TableCell align="right">V. Unitario</TableCell>
                              <TableCell align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(remitoMovimientos[remito.id] || []).map((mov) => (
                              <TableRow key={mov.id}>
                                <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{mov.codigo || '—'}</TableCell>
                                <TableCell>{mov.descripcion}</TableCell>
                                <TableCell align="right">{mov.cantidad}</TableCell>
                                <TableCell align="right">{fmtCurrency(mov.valorUnitario)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{fmtCurrency(mov.valorOperacion)}</TableCell>
                              </TableRow>
                            ))}
                            {!remitoMovimientos[remito.id] && (
                              <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', fontSize: 12 }}>
                                  Cargando...
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          });
        })()}
        </TableBody>

        {/* Total footer */}
        {remitosFiltrados.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Total{filtroEstado || filtroFechaDesde || filtroFechaHasta || filtroNumero ? ' (filtrado)' : ''}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>
                {fmtCurrency(totalFiltrado)}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Box>
  );
};

export default RemitosTable;
