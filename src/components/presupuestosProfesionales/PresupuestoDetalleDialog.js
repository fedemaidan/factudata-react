import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { ESTADO_LABEL, ESTADO_COLOR, formatCurrency, formatDate, formatPct } from './constants';
import { CAC_TIPOS, INDEXACION_VALUES, USD_FUENTES, USD_VALORES } from './monedaAjusteConfig';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PostAddIcon from '@mui/icons-material/PostAdd';

const CAC_TIPO_LABEL = {
  [CAC_TIPOS.GENERAL]: 'Promedio',
  [CAC_TIPOS.MANO_OBRA]: 'Mano de obra',
  [CAC_TIPOS.MATERIALES]: 'Materiales',
};

const USD_FUENTE_LABEL = {
  [USD_FUENTES.OFICIAL]: 'Oficial',
  [USD_FUENTES.BLUE]: 'Blue',
};

const USD_VALOR_LABEL = {
  [USD_VALORES.COMPRA]: 'Compra',
  [USD_VALORES.VENTA]: 'Venta',
  [USD_VALORES.PROMEDIO]: 'Promedio',
};

const BASE_CALCULO_LABEL = {
  total: 'Total (con imp.)',
  subtotal: 'Neto (sin imp.)',
};

const DetalleMonetarioResumen = ({ data }) => {
  if (!data) return null;
  const moneda = data.moneda || 'ARS';
  const indexacion = data.indexacion;
  const isArs = moneda === 'ARS';
  const isUsd = moneda === 'USD';

  const partes = [];

  if (isArs) {
    if (!indexacion) {
      partes.push('Pesos fijos');
    } else if (indexacion === INDEXACION_VALUES.CAC && data.cac_tipo) {
      partes.push(`Índice CAC: ${CAC_TIPO_LABEL[data.cac_tipo] || data.cac_tipo}`);
    } else if (indexacion === INDEXACION_VALUES.USD && (data.usd_fuente || data.usd_valor)) {
      const fuente = USD_FUENTE_LABEL[data.usd_fuente] || data.usd_fuente;
      const valor = USD_VALOR_LABEL[data.usd_valor] || data.usd_valor;
      if (fuente && valor) partes.push(`Dólar ${fuente} - ${valor}`);
      else if (fuente) partes.push(`Dólar ${fuente}`);
      else if (valor) partes.push(`Dólar ${valor}`);
    }
  } else if (isUsd && (data.usd_fuente || data.usd_valor)) {
    const fuente = USD_FUENTE_LABEL[data.usd_fuente] || data.usd_fuente;
    const valor = USD_VALOR_LABEL[data.usd_valor] || data.usd_valor;
    if (fuente && valor) partes.push(`Dólar ${fuente} - ${valor}`);
    else if (fuente) partes.push(`Dólar ${fuente}`);
    else if (valor) partes.push(`Dólar ${valor}`);
  }

  const baseCalculo = data.base_calculo || 'total';
  partes.push(BASE_CALCULO_LABEL[baseCalculo] || baseCalculo);

  if (partes.length === 0) return null;

  return (
    <Typography variant="body2" color="text.secondary">
      {partes.join(' · ')}
    </Typography>
  );
};

const PresupuestoDetalleDialog = ({
  open,
  onClose,
  data,
  loading,
  tab,
  onTabChange,
  onExportPDF,
  exportingPdf,
  onAgregarAnexo,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
    <DialogTitle>
      Detalle: {data?.titulo || '...'}
      <Chip
        label={ESTADO_LABEL[data?.estado] || ''}
        color={ESTADO_COLOR[data?.estado] || 'default'}
        size="small"
        sx={{ ml: 2 }}
      />
    </DialogTitle>
    <DialogContent dividers>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <>
          <Stack direction="row" spacing={4} mb={2} flexWrap="wrap">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Moneda</Typography>
              <Typography>{data.moneda}</Typography>
              <DetalleMonetarioResumen data={data} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total neto</Typography>
              <Typography fontWeight={600}>
                {formatCurrency(data.total_neto, data.moneda)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Dirección</Typography>
              <Typography>{data.obra_direccion || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Versión</Typography>
              <Typography>
                {data.version_actual > 0 ? `v${data.version_actual}` : 'Sin versión congelada'}
              </Typography>
            </Box>
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, v) => onTabChange(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Rubros actuales" />
            <Tab label={`Versiones (${(data.versiones || []).length})`} />
            <Tab label={`Historial (${(data.historial_estados || []).length})`} />
            <Tab label={`Anexos (${(data.anexos || []).length})`} />
          </Tabs>

          {tab === 0 && (
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
                {(data.rubros || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.orden || i + 1}</TableCell>
                    <TableCell>{r.nombre}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(r.monto, data.moneda)}
                    </TableCell>
                    <TableCell align="right">{formatPct(r.incidencia_pct)}</TableCell>
                    <TableCell>
                      {(r.tareas || []).map((t) => t.descripcion).join(', ') || '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(data.rubros || []).length > 0 && (
                  <TableRow>
                    <TableCell />
                    <TableCell>
                      <Typography fontWeight={600}>TOTAL</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>
                        {formatCurrency(data.total_neto, data.moneda)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>100%</Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {tab === 1 && (
            <Box>
              {(data.versiones || []).length === 0 ? (
                <Typography color="text.secondary">
                  No hay versiones congeladas todavía.
                </Typography>
              ) : (
                (data.versiones || []).map((v, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                      <Chip label={`v${v.numero_version}`} size="small" color="primary" />
                      <Typography variant="body2">{formatDate(v.fecha)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {v.motivo || ''}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Typography variant="body2" fontWeight={600}>
                        Total: {formatCurrency(v.total_neto, data.moneda)}
                      </Typography>
                    </Stack>
                    {v.equivalencias && (
                      <Stack direction="row" spacing={3} mb={1}>
                        {v.equivalencias.valor_cac && (
                          <Typography variant="caption">
                            CAC: {v.equivalencias.valor_cac} → {v.equivalencias.monto_en_cac?.toFixed(2)} unidades
                          </Typography>
                        )}
                        {v.equivalencias.tipo_cambio_usd && (
                          <Typography variant="caption">
                            USD Blue: ${v.equivalencias.tipo_cambio_usd} → {formatCurrency(v.equivalencias.monto_en_usd, 'USD')}
                          </Typography>
                        )}
                      </Stack>
                    )}
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Rubro</TableCell>
                          <TableCell align="right">Monto</TableCell>
                          <TableCell align="right">Incidencia</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(v.rubros_snapshot || []).map((rs, j) => (
                          <TableRow key={j}>
                            <TableCell>{rs.nombre}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(rs.monto, data.moneda)}
                            </TableCell>
                            <TableCell align="right">{formatPct(rs.incidencia_pct)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                ))
              )}
            </Box>
          )}

          {tab === 2 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.historial_estados || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="text.secondary">Sin historial.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (data.historial_estados || []).map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Chip
                          label={ESTADO_LABEL[h.estado] || h.estado}
                          color={ESTADO_COLOR[h.estado] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(h.fecha)}</TableCell>
                      <TableCell>{h.user_id || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {tab === 3 && (
            <Box>
              {onAgregarAnexo && (
                <Stack direction="row" justifyContent="flex-end" mb={2}>
                  <Tooltip
                    title={
                      data.estado === 'aceptado'
                        ? 'Para agregar modificaciones, dirigite a la página de control de presupuestos.'
                        : 'Agregar anexo'
                    }
                  >
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PostAddIcon />}
                        disabled={data.estado === 'aceptado'}
                        onClick={() => onAgregarAnexo(data)}
                      >
                        Agregar anexo
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              )}
              {(data.anexos || []).length === 0 ? (
                <Typography color="text.secondary">
                  No hay anexos. Usá el botón de arriba para agregar uno.
                </Typography>
              ) : (
                <>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Resumen contractual</Typography>
                    <Stack direction="row" spacing={4} flexWrap="wrap">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Total original</Typography>
                        <Typography fontWeight={600}>
                          {formatCurrency(data.total_neto, data.moneda)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Impacto anexos</Typography>
                        <Typography fontWeight={600}>
                          {formatCurrency(
                            (data.anexos || []).reduce((s, a) => s + (Number(a.monto_diferencia) || 0), 0),
                            data.moneda
                          )}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Total actualizado</Typography>
                        <Typography fontWeight={700} color="primary">
                          {formatCurrency(
                            (data.total_neto || 0) +
                            (data.anexos || []).reduce((s, a) => s + (Number(a.monto_diferencia) || 0), 0),
                            data.moneda
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                  {(data.anexos || []).map((ax, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                      <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                        <Chip label={`Anexo #${ax.numero}`} size="small" color="secondary" />
                        <Chip
                          label={ax.tipo}
                          size="small"
                          variant="outlined"
                          color={
                            ax.tipo === 'adicion'
                              ? 'success'
                              : ax.tipo === 'deduccion'
                              ? 'error'
                              : 'info'
                          }
                        />
                        <Typography variant="body2">{formatDate(ax.fecha)}</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography variant="body2" fontWeight={600}>
                          Impacto: {formatCurrency(ax.monto_diferencia, data.moneda)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" gutterBottom>
                        <strong>Motivo:</strong> {ax.motivo}
                      </Typography>
                      {ax.detalle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {ax.detalle}
                        </Typography>
                      )}
                      {(ax.rubros_afectados || []).length > 0 && (
                        <Table size="small" sx={{ mt: 1 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Rubro</TableCell>
                              <TableCell align="right">Monto anterior</TableCell>
                              <TableCell align="right">Monto nuevo</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {ax.rubros_afectados.map((ra, j) => (
                              <TableRow key={j}>
                                <TableCell>{ra.rubro_nombre}</TableCell>
                                <TableCell align="right">
                                  {formatCurrency(ra.monto_anterior, data.moneda)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(ra.monto_nuevo, data.moneda)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Paper>
                  ))}
                </>
              )}
            </Box>
          )}

          {data.notas_texto && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2">Notas / Condiciones</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-wrap' }}>
                <Typography variant="body2">{data.notas_texto}</Typography>
              </Paper>
            </Box>
          )}
        </>
      ) : null}
    </DialogContent>
    <DialogActions>
      {onExportPDF && (
        <Button
          variant="contained"
          color="primary"
          startIcon={
            exportingPdf ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <PictureAsPdfIcon fontSize="small" />
            )
          }
          onClick={onExportPDF}
          disabled={exportingPdf || !data?.rubros?.length}
        >
          {exportingPdf ? 'Generando PDF…' : 'Exportar PDF'}
        </Button>
      )}
      <Button onClick={onClose}>Cerrar</Button>
    </DialogActions>
  </Dialog>
);

export default PresupuestoDetalleDialog;
