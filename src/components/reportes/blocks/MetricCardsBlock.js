import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
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

const MetricCardsBlock = ({ data, displayCurrency, displayCurrencies, onDrillDown }) => {
  if (!data || data.length === 0) return null;

  const isMulti = displayCurrencies && displayCurrencies.length > 1;

  const handleClick = (metric) => {
    if (onDrillDown && metric._movimientos?.length > 0) {
      onDrillDown(metric._movimientos, metric.titulo);
    }
  };

  return (
    <Grid container spacing={2}>
      {data.map((metric) => (
        <Grid item xs={12} sm={6} md={3} key={metric.id}>
          <Card
            sx={{
              height: '100%',
              borderLeft: 4,
              borderColor: COLOR_MAP[metric.color] || COLOR_MAP.default,
              cursor: metric._movimientos?.length > 0 ? 'pointer' : 'default',
              transition: 'box-shadow 0.2s',
              '&:hover': metric._movimientos?.length > 0 ? { boxShadow: 4 } : {},
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
              {isMulti && metric.valores ? (
                <Box sx={{ mt: 1 }}>
                  {displayCurrencies.map((cur) => (
                    <Box key={cur} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant={cur === displayCurrencies[0] ? 'h5' : 'body1'}
                        sx={{
                          fontWeight: cur === displayCurrencies[0] ? 700 : 600,
                          color: COLOR_MAP[metric.color] || COLOR_MAP.default,
                        }}
                      >
                        {formatValue(metric.valores[cur], metric.formato, cur)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: COLOR_MAP[metric.color] || COLOR_MAP.default,
                    }}
                  >
                    {formatValue(metric.valor, metric.formato, displayCurrency)}
                  </Typography>
                  {metric.formato === 'currency' && metric.valor !== 0 && (
                    metric.valor > 0
                      ? <TrendingUpIcon fontSize="small" color="success" />
                      : <TrendingDownIcon fontSize="small" color="error" />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default MetricCardsBlock;
