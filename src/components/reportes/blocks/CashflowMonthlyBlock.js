import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { formatValue } from 'src/tools/reportEngine';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const CashflowMonthlyBlock = ({ data }) => {
  const theme = useTheme();
  const [periodOffset, setPeriodOffset] = useState(0);

  const chartOptions = useMemo(() => ({
    chart: {
      fontFamily: theme.typography.fontFamily,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#86d9ad', '#f3a3a0', theme.palette.primary.main],
    dataLabels: { enabled: false },
    stroke: { width: [0, 0, 2.5], curve: 'smooth' },
    markers: { size: 3, strokeWidth: 0 },
    plotOptions: {
      bar: {
        columnWidth: '34%',
        borderRadius: 2,
      },
    },
    xaxis: {
      categories: data?.chart?.labels || [],
      labels: {
        rotate: (data?.chart?.labels || []).length > 8 ? -45 : 0,
        style: { fontSize: '10px', colors: theme.palette.text.secondary },
      },
      axisBorder: { color: theme.palette.divider },
      axisTicks: { color: theme.palette.divider },
    },
    yaxis: {
      labels: {
        style: { fontSize: '10px', colors: theme.palette.text.secondary },
        formatter: (val) => {
          const num = Number(val || 0);
          if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
          if (Math.abs(num) >= 1_000) return `${Math.round(num / 1_000)}K`;
          return String(Math.round(num));
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) => formatValue(val, 'currency', data?.displayCurrency || 'ARS'),
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '11px',
      markers: { width: 8, height: 8 },
    },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 3 },
  }), [data?.chart?.labels, data?.displayCurrency, theme]);

  if (!data) return null;

  const headers = data.headers || [];
  const rows = data.rows || [];
  const fixedHeaders = headers.filter((header) => ['grupo', 'acumulado'].includes(header.id));
  const periodHeaders = headers.filter((header) => !['grupo', 'acumulado'].includes(header.id));
  const visiblePeriodCount = 6;
  const maxOffset = Math.max(0, periodHeaders.length - visiblePeriodCount);
  const safeOffset = Math.min(periodOffset, maxOffset);
  const visibleHeaders = [
    ...fixedHeaders,
    ...periodHeaders.slice(safeOffset, safeOffset + visiblePeriodCount),
  ];
  const hasPeriodCarousel = periodHeaders.length > visiblePeriodCount;

  return (
    <Box>
      {data.mostrarSinCotizacion === true && data.sinCotizacion > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          {data.sinCotizacion} movimiento{data.sinCotizacion === 1 ? '' : 's'} sin cotización no se incluyen en el cashflow.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 1, p: 1.5, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Evolución {data.periodo === 'semanal' ? 'semanal' : 'mensual'}
        </Typography>
        <Chart
          options={chartOptions}
          series={data.chart?.series || []}
          type="line"
          height={260}
          width="100%"
        />
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {hasPeriodCarousel && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Mostrando {safeOffset + 1}-{Math.min(safeOffset + visiblePeriodCount, periodHeaders.length)} de {periodHeaders.length} períodos
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setPeriodOffset((prev) => Math.max(0, prev - visiblePeriodCount))}
                disabled={safeOffset === 0}
              >
                <KeyboardArrowLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setPeriodOffset((prev) => Math.min(maxOffset, prev + visiblePeriodCount))}
                disabled={safeOffset >= maxOffset}
              >
                <KeyboardArrowRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
        <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              {visibleHeaders.map((header) => (
                <TableCell
                  key={header.id}
                  align={header.align || (header.id === 'grupo' ? 'left' : 'right')}
                  sx={{
                    bgcolor: 'grey.100',
                    color: 'text.secondary',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header.titulo}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const isStrong = ['income', 'expense_total', 'net'].includes(row._rowKind);
              const isNet = row._rowKind === 'net';
              return (
                <TableRow
                  key={row.grupo}
                  sx={{
                    bgcolor: isNet ? 'grey.50' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {visibleHeaders.map((header) => {
                    const value = row[header.id];
                    const isNegative = typeof value === 'number' && value < 0;
                    return (
                      <TableCell
                        key={header.id}
                        align={header.align || (header.id === 'grupo' ? 'left' : 'right')}
                        sx={{
                          whiteSpace: 'nowrap',
                          fontWeight: isStrong ? 800 : 400,
                          color: isNegative ? 'error.main' : 'text.primary',
                          borderTop: isNet ? 2 : undefined,
                          borderColor: 'divider',
                        }}
                      >
                        {header.id === 'grupo'
                          ? row.grupo
                          : formatValue(value, header.formato || 'currency', header.currency || data.displayCurrency)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      </Paper>
    </Box>
  );
};

export default CashflowMonthlyBlock;
