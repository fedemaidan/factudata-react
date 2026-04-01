import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tooltip,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

const CategoryBudgetMatrixBlock = ({ data, displayCurrency, cotizaciones, onDrillDown }) => {
  if (!data) return null;

  const { rowHeaderTitle, projectColumns = [], rows = [], categoria } = data;

  const getSummaryRowSx = (row) => {
    if (row.key === 'total_presupuesto') {
      return {
        bg: 'info.lighter',
        fg: 'info.dark',
      };
    }
    if (row.key === 'recibido') {
      return {
        bg: 'success.lighter',
        fg: 'success.dark',
      };
    }
    if (row.key === 'saldo') {
      return {
        bg: 'warning.lighter',
        fg: 'warning.dark',
      };
    }
    return {
      bg: 'grey.50',
      fg: 'text.primary',
    };
  };

  // Convertir un valor CAC a ARS usando cotización actual
  const convertCacToArs = (valueInCac) => {
    if (!cotizaciones?.cac || valueInCac <= 0) return null;
    return valueInCac * cotizaciones.cac;
  };

  // Obtener tooltip text si es CAC
  const getTooltipText = (displayCurr, value) => {
    if (displayCurr !== 'CAC' || !cotizaciones?.cac) return null;
    const arsValue = convertCacToArs(value);
    if (arsValue === null) return null;
    return `$${(arsValue).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS (hoy)`;
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Categoria: {categoria}
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 560 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  backgroundColor: 'grey.100',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'middle',
                  py: 1.5,
                }}
              >
                <Stack spacing={0.75} alignItems="flex-start" justifyContent="center" sx={{ minHeight: 56 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.15 }}>
                    {rowHeaderTitle || 'Concepto'}
                  </Typography>
                  <Box sx={{ height: 22 }} />
                </Stack>
              </TableCell>
              {projectColumns.map((project) => (
                <TableCell
                  key={project.id}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'grey.100',
                    whiteSpace: 'normal',
                    verticalAlign: 'middle',
                    py: 1.25,
                  }}
                >
                  <Stack spacing={0.75} alignItems="center" justifyContent="center" sx={{ minHeight: 56 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'center', lineHeight: 1.15 }}>
                      {project.nombre}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="center"
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ minHeight: 22 }}
                    >
                      {project.tiposCreacion && project.tiposCreacion.length > 0 ? (
                        project.tiposCreacion.map((tipo) => {
                          let color = 'default';
                          if (tipo === 'USD' || tipo === 'Ajustado por dólar') color = 'success';
                          if (tipo === 'CAC' || tipo === 'Ajustado por CAC') color = 'secondary';
                          return (
                            <Chip
                              key={tipo}
                              label={tipo}
                              size="small"
                              color={color}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          );
                        })
                      ) : (
                        <Box sx={{ height: 20 }} />
                      )}
                    </Stack>
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row) => {
              const isSummary = row.type === 'summary';
              const summarySx = isSummary ? getSummaryRowSx(row) : null;

              return (
                <TableRow
                  key={row.key}
                  sx={
                    isSummary
                      ? {
                          backgroundColor: summarySx.bg,
                          '&:hover': { backgroundColor: summarySx.bg },
                        }
                      : undefined
                  }
                >
                  <TableCell
                    sx={{
                      fontWeight: row.type === 'initial' || isSummary ? 700 : 500,
                      borderTop: isSummary ? 2 : undefined,
                      borderColor: isSummary ? 'divider' : undefined,
                      color: isSummary ? summarySx.fg : 'text.primary',
                      py: isSummary ? 1.1 : 0.9,
                    }}
                  >
                    {row.label}
                  </TableCell>

                  {projectColumns.map((project) => {
                    const val = Number(row.values?.[project.id] || 0);
                    const showBlank = row.type === 'additional' && val === 0;
                    const receivedMovs = row.key === 'recibido'
                      ? (row._movimientos_by_project?.[project.id] || [])
                      : [];
                    const canDrillDown = row.key === 'recibido' && receivedMovs.length > 0 && !!onDrillDown;
                    const tooltipText = getTooltipText(displayCurrency, val);
                    const formattedValue = formatValue(val, 'currency', displayCurrency);

                    return (
                      <Tooltip 
                        key={`${row.key}_${project.id}`}
                        title={tooltipText || ''}
                        disableHoverListener={!tooltipText}
                      >
                        <TableCell
                          align="right"
                          onClick={() => {
                            if (!canDrillDown) return;
                            const categoriaLabel = categoria || 'Todas';
                            onDrillDown(receivedMovs, `Recibido - ${project.nombre} (${categoriaLabel})`);
                          }}
                          sx={{
                            whiteSpace: 'nowrap',
                            fontWeight: isSummary ? 700 : 400,
                            borderTop: isSummary ? 2 : undefined,
                            borderColor: isSummary ? 'divider' : undefined,
                            color: isSummary ? summarySx.fg : 'text.primary',
                            py: isSummary ? 1.1 : 0.9,
                            cursor: canDrillDown ? 'pointer' : (tooltipText ? 'help' : 'default'),
                            textDecoration: canDrillDown ? 'underline' : 'none',
                            textUnderlineOffset: canDrillDown ? '2px' : undefined,
                          }}
                        >
                          {showBlank ? '' : formattedValue}
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              );
            })}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={projectColumns.length + 1} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay presupuestos para la categoria seleccionada
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default CategoryBudgetMatrixBlock;
