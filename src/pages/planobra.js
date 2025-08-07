import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Button, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getProyectoById } from 'src/services/proyectosService';
import EtapaAccordion from 'src/components/planobra/EtapaAccordion';
import ImportarMaterialesCSV from 'src/components/planobra/ImportarMaterialesCSV';
import ImportarCertificadosCSV from 'src/components/planobra/ImportarCertificadosCSV';
import ImportarPresupuestosCSV from 'src/components/planobra/ImportarPresupuestosCSV';

const calcularCompletitud = (items) => {
  if (!items || items.length === 0) return 0;
  const completados = items.filter(item => item.completado || item.realizado || item.certificado).length;
  return Math.round((completados / items.length) * 100);
};

const PlanObraPage = ({ proyectoId }) => {
  const [etapas, setEtapas] = useState([]);
  const [proyecto, setProyecto] = useState(null);
  const [mostrarMateriales, setMostrarMateriales] = useState(true);
  const [mostrarCertificados, setMostrarCertificados] = useState(true);
  const [mostrarPresupuestos, setMostrarPresupuestos] = useState(true);

  useEffect(() => {
    if (proyectoId) {
      getProyectoById(proyectoId).then(p => {
        setProyecto(p);
        const etapasIniciales = (p.etapas || []).map(etapa => ({
          ...etapa,
          completitudMateriales: calcularCompletitud(etapa.materiales),
          completitudCertificados: calcularCompletitud(etapa.certificados),
          completitudPresupuestos: calcularCompletitud(etapa.presupuestos)
        }));
        setEtapas(etapasIniciales);
      });
    }
  }, [proyectoId]);

  const agregarEtapasDesdeImport = (nuevasEtapas) => {
    const actualizadas = [...etapas];
    nuevasEtapas.forEach(etapa => {
      const existente = actualizadas.find(e => e.nombre === etapa.nombre);
      if (existente) {
        existente.materiales = [...(existente.materiales || []), ...(etapa.materiales || [])];
        existente.certificados = [...(existente.certificados || []), ...(etapa.certificados || [])];
        existente.presupuestos = [...(existente.presupuestos || []), ...(etapa.presupuestos || [])];
        existente.completitudMateriales = calcularCompletitud(existente.materiales);
        existente.completitudCertificados = calcularCompletitud(existente.certificados);
        existente.completitudPresupuestos = calcularCompletitud(existente.presupuestos);
      } else {
        actualizadas.push({
          ...etapa,
          completitudMateriales: calcularCompletitud(etapa.materiales),
          completitudCertificados: calcularCompletitud(etapa.certificados),
          completitudPresupuestos: calcularCompletitud(etapa.presupuestos)
        });
      }
    });
    setEtapas(actualizadas);
  };

  const calcularPromedioAvance = () => {
    if (etapas.length === 0) return 0;
    const suma = etapas.reduce((acc, etapa) => {
      const promedioEtapa = (etapa.completitudMateriales + etapa.completitudCertificados + etapa.completitudPresupuestos) / 3;
      return acc + promedioEtapa;
    }, 0);
    return Math.round(suma / etapas.length);
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Planificación de Obra Lote 5 y 6
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Avance general de obra: {calcularPromedioAvance()}%
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <ImportarMaterialesCSV onImport={agregarEtapasDesdeImport} />
          <ImportarCertificadosCSV onImport={agregarEtapasDesdeImport} />
          <ImportarPresupuestosCSV onImport={agregarEtapasDesdeImport} />
        </Box>

        <FormGroup row sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={mostrarMateriales} onChange={(e) => setMostrarMateriales(e.target.checked)} />}
            label="Mostrar Materiales"
          />
          <FormControlLabel
            control={<Checkbox checked={mostrarCertificados} onChange={(e) => setMostrarCertificados(e.target.checked)} />}
            label="Mostrar Certificados"
          />
          <FormControlLabel
            control={<Checkbox checked={mostrarPresupuestos} onChange={(e) => setMostrarPresupuestos(e.target.checked)} />}
            label="Mostrar Presupuestos"
          />
        </FormGroup>

        {etapas.map((etapa, idx) => (
          <EtapaAccordion
            key={idx}
            etapa={etapa}
            mostrarResumen={true}
            mostrarMateriales={mostrarMateriales}
            mostrarCertificados={mostrarCertificados}
            mostrarPresupuestos={mostrarPresupuestos}
          />
        ))}
      </Container>
    </Box>
  );
};

PlanObraPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PlanObraPage;
