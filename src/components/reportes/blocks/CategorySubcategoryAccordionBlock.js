import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatValue } from 'src/tools/reportEngine';

const CategorySubcategoryAccordionBlock = ({ data, displayCurrency, onDrillDown }) => {
  if (!data) return null;

  const categories = data.categories || [];
  const currency = data.displayCurrency || displayCurrency || 'ARS';
  const showCounts = data.showCounts !== false;
  const showSubcategories = data.showSubcategories !== false;

  if (categories.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          No hay movimientos para mostrar.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={0.75}>
      {categories.map((category) => {
        const canDrillCategory = category.movimientos?.length > 0 && !!onDrillDown;
        const summaryContent = (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {category.label}
              </Typography>
              {showCounts && (
                <Chip size="small" variant="outlined" label={`${category.count || 0} mov.`} sx={{ height: 22 }} />
              )}
            </Stack>
            <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
              {formatValue(category.total || 0, 'currency', currency)}
            </Typography>
          </>
        );

        if (!showSubcategories) {
          return (
            <Paper
              key={category.key}
              variant="outlined"
              onClick={() => {
                if (!canDrillCategory) return;
                onDrillDown(category.movimientos, category.label);
              }}
              sx={{
                minHeight: 44,
                px: 1.5,
                py: 1.25,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                cursor: canDrillCategory ? 'pointer' : 'default',
                '&:hover': canDrillCategory ? { bgcolor: 'action.hover' } : undefined,
              }}
            >
              {summaryContent}
            </Paper>
          );
        }

        return (
          <Accordion
            key={category.key}
            disableGutters
            variant="outlined"
            sx={{
              borderRadius: 1,
              '&:before': { display: 'none' },
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                minHeight: 44,
                px: 1.5,
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  my: 0.75,
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {summaryContent}
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 1.5 }}>
              <Stack divider={<Divider flexItem />} spacing={0}>
                {(category.subcategories || []).map((sub) => {
                  const canDrill = sub.movimientos?.length > 0 && !!onDrillDown;
                  const percentage = category.total > 0 ? Math.min((sub.total || 0) / category.total * 100, 100) : 0;
                  return (
                    <Box
                      key={sub.key}
                      onClick={() => {
                        if (!canDrill) return;
                        onDrillDown(sub.movimientos, `${category.label} - ${sub.label}`);
                      }}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(0, 1fr) auto' },
                        alignItems: 'center',
                        gap: 2,
                        py: 0.75,
                        pl: 2,
                        cursor: canDrill ? 'pointer' : 'default',
                        '&:hover': canDrill ? { bgcolor: 'action.hover' } : undefined,
                      }}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {sub.label}
                          </Typography>
                          {showCounts && (
                            <Chip size="small" variant="outlined" label={`${sub.count || 0}`} sx={{ height: 20 }} />
                          )}
                        </Stack>
                        <Box
                          sx={{
                            display: { xs: 'none', sm: 'grid' },
                            gridTemplateColumns: 'minmax(120px, 220px) 38px',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 5,
                              borderRadius: 3,
                              bgcolor: 'grey.200',
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                            {percentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'nowrap' }}>
                        {formatValue(sub.total || 0, 'currency', currency)}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 1.75,
          py: 1.5,
          mt: 1,
          border: 1,
          borderTop: 3,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Total egresos
        </Typography>
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.25, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {formatValue(data.total || 0, 'currency', currency)}
        </Typography>
      </Box>
    </Stack>
  );
};

export default CategorySubcategoryAccordionBlock;
