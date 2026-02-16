import React, { useMemo } from 'react';
import { Box, Typography, Divider, Alert } from '@mui/material';
import MetricCardsBlock from './blocks/MetricCardsBlock';
import SummaryTableBlock from './blocks/SummaryTableBlock';
import MovementsTableBlock from './blocks/MovementsTableBlock';
import BudgetVsActualBlock from './blocks/BudgetVsActualBlock';
import { executeReport } from 'src/tools/reportEngine';

const BLOCK_COMPONENTS = {
  metric_cards: MetricCardsBlock,
  summary_table: SummaryTableBlock,
  movements_table: MovementsTableBlock,
  budget_vs_actual: BudgetVsActualBlock,
};

/**
 * Renderiza un reporte completo: ejecuta el engine y muestra todos los bloques
 *
 * @param {Object} reportConfig  - Configuración del reporte (de MongoDB)
 * @param {Array}  movimientos   - Movimientos ya filtrados por filtros globales
 * @param {Array}  presupuestos  - Presupuestos de control (opcional)
 */
const ReportView = ({ reportConfig, movimientos = [], presupuestos = [], displayCurrencies, cotizaciones }) => {
  const currencies = displayCurrencies && displayCurrencies.length > 0
    ? displayCurrencies
    : [reportConfig?.display_currency || 'ARS'];
  const primaryCurrency = currencies[0];

  const results = useMemo(() => {
    if (!reportConfig?.layout?.length) return [];
    return executeReport(reportConfig, movimientos, presupuestos, currencies, cotizaciones);
  }, [reportConfig, movimientos, presupuestos, currencies, cotizaciones]);

  if (!reportConfig) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">Seleccioná un reporte para visualizar</Typography>
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Este reporte no tiene bloques configurados. Editalo para agregar bloques.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {results.map((block, idx) => {
        const Component = BLOCK_COMPONENTS[block.type];

        if (!Component) {
          return (
            <Alert key={idx} severity="warning">
              Tipo de bloque desconocido: {block.type}
            </Alert>
          );
        }

        if (block.error) {
          return (
            <Alert key={idx} severity="error">
              Error en bloque &quot;{block.titulo}&quot;: {block.error}
            </Alert>
          );
        }

        return (
          <Box key={idx}>
            {block.titulo && (
              <>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {block.titulo}
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
              </>
            )}
            <Component data={block.data} displayCurrency={primaryCurrency} displayCurrencies={currencies} />
          </Box>
        );
      })}
    </Box>
  );
};

export default ReportView;
