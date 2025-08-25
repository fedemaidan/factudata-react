import React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MaterialesTable from './MaterialesTable';
import CertificadosTable from './CertificadosTable';
import { avanceCertificadosPct, avanceEtapaPct, avanceMaterialesPct, ejecutadoEtapa, numberFmt, planTotalEtapa } from 'src/utils/planobra';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';



const EtapaAccordion = ({ etapa, vista, onChangeEtapa,
  onAddMaterial, onEditMaterial, onDeleteMaterial,
  onAddCertificado, onEditCertificado, onDeleteCertificado,
  onEditEtapa, onDeleteEtapa
}) => {
  const pctM = avanceMaterialesPct(etapa.materiales || []);
  const pctC = avanceCertificadosPct(etapa.certificados || []);
  const pctT = avanceEtapaPct(etapa.materiales || [], etapa.certificados || []);
  const plan$ = planTotalEtapa(etapa.materiales || [], etapa.certificados || []);
  const ejec$ = ejecutadoEtapa(etapa.materiales || [], etapa.certificados || []);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack spacing={0.5} sx={{ width: '100%' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">{etapa.nombre}</Typography>
              <Box>
                <Tooltip title="Editar etapa"><IconButton size="small" onClick={onEditEtapa}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Eliminar etapa"><IconButton size="small" color="error" onClick={onDeleteEtapa}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </Box>
            </Box>
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
  <>
            <MaterialesTable
              materiales={etapa.materiales || []}
              onEditRow={(rowIndex, patch) => {
                onChangeEtapa((prev) => {
                  const materiales = [...(prev.materiales || [])];
                  materiales[rowIndex] = { ...materiales[rowIndex], ...patch };
                  return { ...prev, materiales };
                });
              }}
              onRequestEdit={onEditMaterial}
              onRequestDelete={onDeleteMaterial}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddMaterial}
              aria-label="Agregar material a esta etapa"
            >
              Agregar material
            </Button>
          </>
        )}
        {vista !== 'materiales' && (
          <>
            <CertificadosTable
              certificados={etapa.certificados || []}
              onActualizarCertificado={(index, nuevoPorcentaje) => {
                onChangeEtapa((prev) => {
                  const certificados = [...(prev.certificados || [])];
                  certificados[index] = { ...certificados[index], porcentaje_certificado: nuevoPorcentaje };
                  return { ...prev, certificados };
                });
              }}
              onRequestEdit={onEditCertificado}
              onRequestDelete={onDeleteCertificado}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddCertificado}
              aria-label="Agregar certificado a esta etapa"
            >
              Agregar certificado
            </Button>
          </>
        )}
      </AccordionDetails>

    </Accordion>
  );
};

export default EtapaAccordion;