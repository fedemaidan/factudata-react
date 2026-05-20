import React, { useCallback, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  DIA_KEYS,
  DIA_LABEL,
  formatResumen,
  validarDia,
} from 'src/utils/dhn/configHorarios';
import DiaHorarioForm from './DiaHorarioForm';
import HorarioPreviewGrid from './HorarioPreviewGrid';

const HorariosFormEditor = ({ config, onChange }) => {
  const [diaActivo, setDiaActivo] = useState('lunes');

  const setDia = useCallback(
    (key, nextValue) => {
      onChange({ ...config, [key]: nextValue });
    },
    [config, onChange],
  );

  const handleAccordionChange = useCallback(
    (key) => (_event, isExpanded) => {
      if (isExpanded) setDiaActivo(key);
    },
    [],
  );

  const otrosDias = useMemo(() => {
    if (!config) return {};
    const out = {};
    for (const k of DIA_KEYS) if (config[k]) out[k] = config[k];
    return out;
  }, [config]);

  const diaPreview = diaActivo && config?.[diaActivo] ? config[diaActivo] : null;

  if (!config) return null;

  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      spacing={2}
      alignItems="flex-start"
    >
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        {DIA_KEYS.map((key) => {
          const dia = config[key];
          const erroresCount = dia ? validarDia(dia).length : 0;
          const resumen = formatResumen(dia);
          return (
            <Accordion
              key={key}
              expanded={diaActivo === key}
              onChange={handleAccordionChange(key)}
              disableGutters
              sx={{
                '&:before': { display: 'none' },
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 2,
                  },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 110 }}>
                  {DIA_LABEL[key]}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {resumen}
                </Typography>
                {erroresCount > 0 ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'warning.main',
                      fontWeight: 600,
                      bgcolor: 'warning.lighter',
                      px: 1,
                      py: 0.25,
                      borderRadius: 0.75,
                    }}
                  >
                    {erroresCount} {erroresCount === 1 ? 'aviso' : 'avisos'}
                  </Typography>
                ) : null}
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <DiaHorarioForm
                  diaKey={key}
                  value={dia}
                  onChange={(v) => setDia(key, v)}
                  otrosDias={otrosDias}
                />
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      <Box
        sx={{
          width: { xs: '100%', lg: 420 },
          position: { lg: 'sticky' },
          top: { lg: 16 },
          flexShrink: 0,
        }}
      >
        <HorarioPreviewGrid configDia={diaPreview} label={DIA_LABEL[diaActivo]} />
      </Box>
    </Stack>
  );
};

export default HorariosFormEditor;
