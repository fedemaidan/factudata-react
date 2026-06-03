import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

const formatDate = (value) => {
  if (!value) return '';
  const d = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR');
};

const numberFmt = (value, digits = 2) => (
  Number(value || 0).toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
);

const HeaderCell = ({ children, align = 'left' }) => (
  <TableCell
    align={align}
    sx={{
      fontWeight: 700,
      bgcolor: 'grey.100',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </TableCell>
);

const TotalCell = ({ children, align = 'right', color = 'secondary.lighter' }) => (
  <TableCell
    align={align}
    sx={{
      fontWeight: 800,
      bgcolor: color,
      borderTop: 2,
      borderColor: 'divider',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </TableCell>
);

const CacValueWithTooltip = ({
  value,
  cacHoy,
  nominalArs = null,
  digits = 2,
  includeNominal = false,
  calculationValue = null,
}) => {
  const displayNum = Number(value || 0);
  const roundedNum = Number(displayNum.toFixed(digits));
  const calcNum = calculationValue != null ? Number(calculationValue || 0) : roundedNum;
  const todayArs = Number(cacHoy || 0) > 0 ? calcNum * Number(cacHoy) : null;
  const hasTooltip = todayArs != null && Number.isFinite(todayArs);

  const content = (
    <Box component="span" sx={{ cursor: hasTooltip ? 'help' : 'inherit' }}>
      {numberFmt(displayNum, digits)}
    </Box>
  );

  if (!hasTooltip) return content;

  return (
    <Tooltip
      arrow
      title={
        <Stack spacing={0.5}>
          <Typography variant="caption" fontWeight={700}>
            Hoy: {formatValue(todayArs, 'currency', 'ARS')}
          </Typography>
          {includeNominal && nominalArs != null && (
            <Typography variant="caption" fontWeight={700}>
              Nominal total: {formatValue(nominalArs, 'currency', 'ARS')}
            </Typography>
          )}
        </Stack>
      }
    >
      {content}
    </Tooltip>
  );
};

const IncomeBudgetControlBlock = ({ data, onDrillDown }) => {
  if (!data) return null;

  const presupuestoRows = data.presupuesto?.rows || [];
  const presupuestoTotals = data.presupuesto?.totals || {};
  const recibidoRows = data.recibidos?.rows || [];
  const recibidoTotals = data.recibidos?.totals || {};
  const saldo = data.saldo || {};

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Resumen presupuestos
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <HeaderCell align="right">N°</HeaderCell>
                <HeaderCell>Concepto</HeaderCell>
                <HeaderCell>Fecha</HeaderCell>
                <HeaderCell align="right">I.CAC</HeaderCell>
                <HeaderCell align="right">Subtotal neto</HeaderCell>
                <HeaderCell align="right">U.CAC</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {presupuestoRows.map((row) => (
                <TableRow key={`${row.presupuesto_id}_${row.nro}_${row.concepto}`}>
                  <TableCell align="right">{row.nro}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">{row.concepto}</Typography>
                      {row.tipo === 'adicional' && (
                        <Chip size="small" label="Adicional" color="success" variant="outlined" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDate(row.fecha)}</TableCell>
                  <TableCell align="right">{row.icac ? numberFmt(row.icac, 1) : ''}</TableCell>
                  <TableCell align="right">{formatValue(row.subtotal_neto, 'currency', 'ARS')}</TableCell>
                  <TableCell align="right">
                    <CacValueWithTooltip
                      value={row.cac_equivalente}
                      cacHoy={data.cac_hoy}
                      nominalArs={row.subtotal_neto}
                      includeNominal
                      calculationValue={row.cac_equivalente}
                    />
                  </TableCell>
                </TableRow>
              ))}

              {presupuestoRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" py={2}>
                      No hay presupuestos de ingreso para el proyecto filtrado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              <TableRow>
                <TotalCell align="left" color="success.lighter">TOTALES</TotalCell>
                <TotalCell color="success.lighter" />
                <TotalCell color="success.lighter" />
                <TotalCell color="success.lighter" />
                <TotalCell color="success.lighter">{formatValue(presupuestoTotals.subtotal_neto, 'currency', 'ARS')}</TotalCell>
                <TotalCell color="success.lighter">
                  <CacValueWithTooltip
                    value={presupuestoTotals.cac_equivalente}
                    cacHoy={data.cac_hoy}
                    nominalArs={presupuestoTotals.subtotal_neto}
                    includeNominal
                    calculationValue={presupuestoTotals.cac_equivalente}
                  />
                </TotalCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Pagos netos recibidos
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <HeaderCell align="right">N°</HeaderCell>
                <HeaderCell>Fecha de pagos recibidos</HeaderCell>
                <HeaderCell align="right">I.CAC a la fecha</HeaderCell>
                <HeaderCell align="right">Pago neto ARS recibidos</HeaderCell>
                <HeaderCell align="right">U.CAC recibidos</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recibidoRows.map((row) => (
                <TableRow
                  key={`${row.nro}_${row.fecha}_${row.pago_neto_ars}`}
                  hover={!!onDrillDown}
                  onClick={() => {
                    if (!onDrillDown || !row.movimiento) return;
                    onDrillDown([row.movimiento], `Ingreso recibido ${formatDate(row.fecha)}`);
                  }}
                  sx={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                >
                  <TableCell align="right">{row.nro}</TableCell>
                  <TableCell>{formatDate(row.fecha)}</TableCell>
                  <TableCell align="right">{row.icac ? numberFmt(row.icac, 1) : ''}</TableCell>
                  <TableCell align="right">{formatValue(row.pago_neto_ars, 'currency', 'ARS')}</TableCell>
                  <TableCell align="right">
                    <CacValueWithTooltip
                      value={row.cac_recibidos}
                      cacHoy={data.cac_hoy}
                    />
                  </TableCell>
                </TableRow>
              ))}

              {recibidoRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" py={2}>
                      No hay movimientos de ingreso para el proyecto filtrado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              <TableRow>
                <TotalCell align="left">TOTALES NETOS</TotalCell>
                <TotalCell />
                <TotalCell />
                <TotalCell>{formatValue(recibidoTotals.pago_neto_ars, 'currency', 'ARS')}</TotalCell>
                <TotalCell>
                  <CacValueWithTooltip
                    value={recibidoTotals.cac_recibidos}
                    cacHoy={data.cac_hoy}
                  />
                </TotalCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Paper variant="outlined" sx={{ p: 1.5, flex: 1, bgcolor: 'warning.lighter' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Saldo U.CAC
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            <CacValueWithTooltip
              value={saldo.cac}
              cacHoy={data.cac_hoy}
              calculationValue={saldo.cac}
            />
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, flex: 1, bgcolor: 'secondary.lighter' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Saldo (ARS) a la fecha
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            {formatValue(saldo.ars_hoy, 'currency', 'ARS')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            CAC hoy: {data.cac_hoy ? numberFmt(data.cac_hoy, 2) : 'sin cotización'}
          </Typography>
        </Paper>
      </Stack>
    </Stack>
  );
};

export default IncomeBudgetControlBlock;
