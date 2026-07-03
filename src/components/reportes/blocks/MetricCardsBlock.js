import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatValue } from 'src/tools/reportEngine';

const COLOR_MAP = {
  default: 'text.primary',
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  info: 'info.main',
};

// Sin decimales en las tarjetas: los KPI se leen más rápido (las tablas conservan decimales).
const CARD_FORMAT_OPTS = { maximumFractionDigits: 0 };

// El valor escala con el ancho de la tarjeta (cqi = % del container), con piso y techo en rem,
// para que el número completo quede en UNA línea sin importar cuán angosta sea la tarjeta.
const VALUE_FONT_SIZE = 'clamp(0.9rem, 11cqi, 1.4rem)';
const SECONDARY_FONT_SIZE = 'clamp(0.8rem, 8cqi, 1rem)';

const DETAIL_ICON = {
  ARS: '🇦🇷',
  USD: '🇺🇸',
};

const MetricCardsBlock = ({ data, displayCurrency, displayCurrencies, onDrillDown }) => {
  if (!data || data.length === 0) return null;

  const isMulti = displayCurrencies && displayCurrencies.length > 1;
  const formatMetricDetail = (detail, metric) => (
    formatValue(detail.valor, metric.formato, detail.currency || displayCurrency, CARD_FORMAT_OPTS)
  );

  const handleClick = (metric) => {
    if (onDrillDown && metric._movimientos?.length > 0) {
      onDrillDown(metric._movimientos, metric.titulo);
    }
  };

  return (
    <Grid container spacing={2}>
      {data.map((metric) => (
        <Grid item xs={12} sm={6} md={data.length === 5 ? 2.4 : 3} key={metric.id}>
          {(() => {
            const metricCurrency = metric.display_currency || displayCurrency;
            const renderSingleValue = !isMulti || metric.display_currency;
            return (
          <Card
            sx={{
              height: '100%',
              borderLeft: 4,
              borderColor: COLOR_MAP[metric.color] || COLOR_MAP.default,
              cursor: metric._movimientos?.length > 0 ? 'pointer' : 'default',
              transition: 'box-shadow 0.2s',
              '&:hover': metric._movimientos?.length > 0 ? { boxShadow: 4 } : {},
              // Container query: el valor se dimensiona al ancho de la tarjeta (no del viewport),
              // así el número completo entra en una sola línea tanto en el reporte como en la preview angosta.
              containerType: 'inline-size',
            }}
            onClick={() => handleClick(metric)}
          >
            <CardContent>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}
              >
                {metric.titulo}
              </Typography>
              {!renderSingleValue && metric.valores ? (
                <Box sx={{ mt: 1, minWidth: 0 }}>
                  {displayCurrencies.map((cur) => (
                    <Box key={cur} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: cur === displayCurrencies[0] ? 700 : 600,
                          color: COLOR_MAP[metric.color] || COLOR_MAP.default,
                          fontSize: cur === displayCurrencies[0] ? VALUE_FONT_SIZE : SECONDARY_FONT_SIZE,
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatValue(metric.valores[cur], metric.formato, cur, CARD_FORMAT_OPTS)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : metric.detalles ? (
                <Box sx={{ mt: 1.25, minWidth: 0 }}>
                  {metric.detalles.length > 0 ? metric.detalles.map((detail) => (
                    <Box
                      key={detail.id || detail.label}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '34px minmax(0, 1fr)',
                        alignItems: 'center',
                        columnGap: 1.25,
                        py: 0.75,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        '&:first-of-type': { borderTop: 0, pt: 0 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'transparent',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: 'text.secondary',
                        }}
                      >
                        {DETAIL_ICON[detail.id] || detail.label}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'text.secondary',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            fontSize: '0.68rem',
                            lineHeight: 1.1,
                          }}
                        >
                          {detail.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: COLOR_MAP[metric.color] || COLOR_MAP.default,
                            fontSize: 'clamp(0.78rem, 8cqi, 1.16rem)',
                            lineHeight: 1.15,
                            whiteSpace: 'nowrap',
                            letterSpacing: 0,
                          }}
                        >
                          {formatMetricDetail(detail, metric)}
                        </Typography>
                      </Box>
                    </Box>
                  )) : (
                    <Typography
                      sx={{
                        mt: 1,
                        fontWeight: 700,
                        color: COLOR_MAP[metric.color] || COLOR_MAP.default,
                        fontSize: VALUE_FONT_SIZE,
                      }}
                    >
                      {formatValue(0, metric.formato, displayCurrency, CARD_FORMAT_OPTS)}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, minWidth: 0, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: COLOR_MAP[metric.color] || COLOR_MAP.default,
                      fontSize: VALUE_FONT_SIZE,
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatValue(metric.valor, metric.formato, metricCurrency, CARD_FORMAT_OPTS)}
                  </Typography>
                  {metric.formato === 'currency' && metric.valor !== 0 && (
                    metric.valor > 0
                      ? <TrendingUpIcon fontSize="small" color="success" sx={{ flexShrink: 0 }} />
                      : <TrendingDownIcon fontSize="small" color="error" sx={{ flexShrink: 0 }} />
                  )}
                  {metric.mostrar_sin_cotizacion === true && metric.sin_cotizacion > 0 && (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={`${metric.sin_cotizacion} sin cotización`}
                      sx={{ height: 22 }}
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
            );
          })()}
        </Grid>
      ))}
    </Grid>
  );
};

export default MetricCardsBlock;
