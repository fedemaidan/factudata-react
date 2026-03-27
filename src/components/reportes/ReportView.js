import React, { useMemo, useState, useCallback } from 'react';
import { Box, Typography, Divider, Alert, Grid } from '@mui/material';
import MetricCardsBlock from './blocks/MetricCardsBlock';
import SummaryTableBlock from './blocks/SummaryTableBlock';
import MovementsTableBlock from './blocks/MovementsTableBlock';
import BudgetVsActualBlock from './blocks/BudgetVsActualBlock';
import ChartBlock from './blocks/ChartBlock';
import GroupedDetailBlock from './blocks/GroupedDetailBlock';
import CategoryBudgetMatrixBlock from './blocks/CategoryBudgetMatrixBlock';
import DrillDownDialog from './DrillDownDialog';
import { executeReport } from 'src/tools/reportEngine';

const BLOCK_COMPONENTS = {
  metric_cards: MetricCardsBlock,
  summary_table: SummaryTableBlock,
  movements_table: MovementsTableBlock,
  budget_vs_actual: BudgetVsActualBlock,
  category_budget_matrix: CategoryBudgetMatrixBlock,
  chart: ChartBlock,
  grouped_detail: GroupedDetailBlock,
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

  // Drill-down state
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownMovs, setDrillDownMovs] = useState([]);
  const [drillDownTitulo, setDrillDownTitulo] = useState('');

  const handleDrillDown = useCallback((movsArray, titulo) => {
    if (!movsArray || movsArray.length === 0) return;
    setDrillDownMovs(movsArray);
    setDrillDownTitulo(titulo || 'Detalle de movimientos');
    setDrillDownOpen(true);
  }, []);

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
    <>
      <Grid container spacing={3}>
        {results.map((block, idx) => {
          const Component = BLOCK_COMPONENTS[block.type];
          const layoutBlock = reportConfig.layout[idx] || {};
          const colSpan = layoutBlock.col_span || 12;

          if (!Component) {
            return (
              <Grid item xs={12} md={colSpan} key={idx}>
                <Alert severity="warning">
                  Tipo de bloque desconocido: {block.type}
                </Alert>
              </Grid>
            );
          }

          if (block.error) {
            return (
              <Grid item xs={12} md={colSpan} key={idx}>
                <Alert severity="error">
                  Error en bloque &quot;{block.titulo}&quot;: {block.error}
                </Alert>
              </Grid>
            );
          }

          return (
            <Grid item xs={12} md={colSpan} key={idx}>
              {block.titulo && (
                <>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {block.titulo}
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                </>
              )}
              <Component
                data={block.data}
                displayCurrency={primaryCurrency}
                displayCurrencies={currencies}
                cotizaciones={cotizaciones}
                onDrillDown={handleDrillDown}
              />
            </Grid>
          );
        })}
      </Grid>

      <DrillDownDialog
        open={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        movimientos={drillDownMovs}
        titulo={drillDownTitulo}
        displayCurrency={primaryCurrency}
      />
    </>
  );
};

export default ReportView;
