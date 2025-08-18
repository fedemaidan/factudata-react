import React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MaterialesTable from './MaterialesTable';
import CertificadosTable from './CertificadosTable';
import { avanceCertificadosPct, avanceEtapaPct, avanceMaterialesPct, ejecutadoEtapa, numberFmt, planTotalEtapa } from 'src/utils/planobra';

const EtapaAccordion = ({ etapa, vista, onChangeEtapa }) => {
  const pctM = avanceMaterialesPct(etapa.materiales || []);
  const pctC = avanceCertificadosPct(etapa.certificados || []);
  const pctT = avanceEtapaPct(etapa.materiales || [], etapa.certificados || []);
  const plan$ = planTotalEtapa(etapa.materiales || [], etapa.certificados || []);
  const ejec$ = ejecutadoEtapa(etapa.materiales || [], etapa.certificados || []);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack spacing={0.5} sx={{ width: '100%' }}>
          <Typography variant="subtitle1">{etapa.nombre}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip size="small" label={`Mtrl ${pctM}%`} />
            <Chip size="small" label={`Cert ${pctC}%`} />
            <Chip size="small" color="primary" label={`Total ${pctT}%`} />
            <Typography variant="caption" sx={{ ml: 1 }}>
              Plan {numberFmt(plan$)} • Ejec {numberFmt(ejec$)}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={pctT} sx={{ mt: 0.5 }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {vista !== 'certificados' && (
          <MaterialesTable
            materiales={etapa.materiales || []}
            onEditRow={(rowIndex, patch) => {
              onChangeEtapa((prev) => {
                const materiales = [...(prev.materiales || [])];
                materiales[rowIndex] = { ...materiales[rowIndex], ...patch };
                return { ...prev, materiales };
              });
            }}
          />
        )}
        {vista !== 'materiales' && (
          <CertificadosTable
            certificados={etapa.certificados || []}
            onActualizarCertificado={(index, nuevoPorcentaje) => {
              onChangeEtapa((prev) => {
                const certificados = [...(prev.certificados || [])];
                certificados[index] = { ...certificados[index], porcentaje_certificado: nuevoPorcentaje };
                return { ...prev, certificados };
              });
            }}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default EtapaAccordion;