import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import CertificadosTable from './CertificadosTable';
import MaterialesTable from './MaterialesTable';
import PresupuestosTable from './PresupuestosTable';

const calcularAvanceCertificados = (certificados) => {
  if (!certificados || certificados.length === 0) return 0;
  const total = certificados.reduce((acc, c) => acc + (c.porcentaje_certificado ?? 0), 0);
  return Math.round(total / certificados.length);
};

const calcularCompletitud = (items) => {
  if (!items || items.length === 0) return 0;
  const completados = items.filter(item => item.completado || item.realizado || item.certificado).length;
  return Math.round((completados / items.length) * 100);
};

const EtapaAccordion = ({
  etapa,
  mostrarResumen,
  mostrarMateriales,
  mostrarCertificados,
  mostrarPresupuestos
}) => {
  const avanceCertificados = calcularAvanceCertificados(etapa.certificados);
  const avanceMateriales = calcularCompletitud(etapa.materiales);
  const avancePresupuestos = calcularCompletitud(etapa.presupuestos);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="column">
          <Typography variant="subtitle1">{etapa.nombre}</Typography>
          {mostrarResumen && (
            <Typography variant="body2" color="text.secondary">
              {mostrarCertificados && `Certificados: ${avanceCertificados}%  `}
              {mostrarMateriales && `| Materiales: ${avanceMateriales}%  `}
              {mostrarPresupuestos && `| Presupuestos: ${avancePresupuestos}%`}
            </Typography>
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          {mostrarCertificados && (
            <CertificadosTable
            certificados={etapa.certificados || []}
            onActualizarCertificado={(index, nuevoPorcentaje) => {
              etapa.certificados[index].porcentaje_certificado = nuevoPorcentaje;
              // 🔁 Esto fuerza que se recalcule la completitud si es necesario
              etapa.completitudCertificados = etapa.certificados.reduce(
                (acc, c) => acc + (c.porcentaje_certificado ?? 0),
                0
              ) / etapa.certificados.length;
          
              // 🔁 Si estás levantando estado en PlanObraPage, deberías llamar una función como setEtapas acá.
            }}
          />
          
          
          )}
          {mostrarMateriales && (
            <MaterialesTable materiales={etapa.materiales || []} />
          )}
          {mostrarPresupuestos && (
            <PresupuestosTable presupuestos={etapa.presupuestos || []} />
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default EtapaAccordion;
