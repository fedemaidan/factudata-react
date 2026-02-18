import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, useTheme } from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

// ApexCharts SSR-safe import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

/**
 * Bloque de gráfico — renderiza datos de summary_table como chart
 * Soporta: bar, pie, donut, line, area
 */
const ChartBlock = ({ data, displayCurrency, displayCurrencies, onDrillDown }) => {
  const theme = useTheme();

  if (!data || !data.rows?.length) {
    return (
      <Typography variant="body2" color="text.secondary" p={2}>
        Sin datos para graficar
      </Typography>
    );
  }

  const { chartType = 'bar', rows, headers, totals } = data;
  const currencies = displayCurrencies || [displayCurrency || 'ARS'];
  const primaryCurrency = currencies[0];

  // Extraer labels y valores
  const labels = rows.map((r) => r.grupo || '');

  // Encontrar headers numéricos (excluir 'grupo' y '_porcentaje')
  const numericHeaders = headers.filter(
    (h) => h.id !== 'grupo' && h.id !== '_porcentaje',
  );

  const series = useMemo(() => {
    if (chartType === 'pie' || chartType === 'donut') {
      // Para pie/donut, usar solo la primera columna numérica
      const h = numericHeaders[0];
      if (!h) return [];
      return rows.map((r) => Math.abs(r[h.id] || 0));
    }

    // Para bar/line/area, generar una serie por cada header numérico
    return numericHeaders.map((h) => ({
      name: h.titulo || h.id,
      data: rows.map((r) => Math.round((r[h.id] || 0) * 100) / 100),
    }));
  }, [rows, numericHeaders, chartType]);

  const options = useMemo(() => {
    const baseColors = [
      theme.palette.primary.main,
      theme.palette.success.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      '#8B5CF6', '#EC4899', '#F97316', '#06B6D4', '#84CC16',
    ];

    const common = {
      colors: baseColors,
      chart: {
        fontFamily: theme.typography.fontFamily,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, pan: false, reset: false } },
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            if (onDrillDown && config.dataPointIndex !== undefined) {
              const row = rows[config.dataPointIndex];
              if (row?._movimientos) {
                onDrillDown(row._movimientos, row.grupo);
              }
            }
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val) => formatValue(val, 'currency', primaryCurrency),
        },
      },
      theme: { mode: theme.palette.mode },
    };

    if (chartType === 'pie' || chartType === 'donut') {
      return {
        ...common,
        labels,
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(1)}%`,
        },
        tooltip: {
          y: {
            formatter: (val) => formatValue(val, 'currency', primaryCurrency),
          },
        },
      };
    }

    return {
      ...common,
      xaxis: {
        categories: labels,
        labels: {
          style: { fontSize: '11px' },
          rotate: labels.length > 8 ? -45 : 0,
          trim: true,
          maxHeight: 100,
        },
      },
      yaxis: {
        labels: {
          formatter: (val) => {
            if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
            if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
            return val.toFixed(0);
          },
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: rows.length > 15 ? '90%' : '60%',
        },
      },
      dataLabels: { enabled: false },
      stroke: chartType === 'line' || chartType === 'area' ? { width: 2, curve: 'smooth' } : {},
      fill: chartType === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } } : {},
      legend: { position: 'top', fontSize: '12px' },
    };
  }, [chartType, labels, rows, primaryCurrency, theme, onDrillDown]);

  const chartHeight = data.chartOptions?.height || 350;

  return (
    <Box sx={{ width: '100%', '& .apexcharts-canvas': { mx: 'auto' } }}>
      <Chart
        options={options}
        series={chartType === 'pie' || chartType === 'donut' ? series : series}
        type={chartType}
        height={chartHeight}
        width="100%"
      />
    </Box>
  );
};

export default ChartBlock;
