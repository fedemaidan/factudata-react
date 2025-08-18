import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Container, Snackbar, Alert, Stack, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import KPICards from 'src/components/planobra/KPICards';
import ToolbarPlanObra from 'src/components/planobra/ToolbarPlanObra';
import EtapaAccordion from 'src/components/planobra/EtapaAccordion';
import ImportCSVWizard from 'src/components/planobra/ImportCSVWizard';
import { deepClone, mergeEtapasAppend } from 'src/utils/planobra';
import { exportPlanObraExcel } from 'src/utils/exportExcel';
import { getProyectoById } from 'src/services/proyectosService';

const mockEtapas = [
  {
    nombre: 'Hormigón',
    materiales: [
      { nombre: 'Cemento', unidad: 'bolsa', cantidad_plan: 100, cantidad_usada: 55, precio_unit_plan: 12000 },
      { nombre: 'Arena', unidad: 'm3', cantidad_plan: 50, cantidad_usada: 20, precio_unit_plan: 8000 },
      { nombre: 'Hierro 8mm', unidad: 'kg', cantidad_plan: 2000, cantidad_usada: 900, precio_unit_plan: 3500 },
    ],
    certificados: [
      { descripcion: 'Estructura planta baja', monto: 3000000, porcentaje_certificado: 40 },
      { descripcion: 'Estructura primer piso', monto: 2500000, porcentaje_certificado: 0 },
    ],
  },
  {
    nombre: 'Instalaciones',
    materiales: [
      { nombre: 'Cañería Awaduct 40', unidad: 'm', cantidad_plan: 400, cantidad_usada: 120, precio_unit_plan: 3200 },
      { nombre: 'Codo 40', unidad: 'u', cantidad_plan: 60, cantidad_usada: 10 },
    ],
    certificados: [
      { descripcion: 'Sanitarios PB', monto: 1200000, porcentaje_certificado: 25 },
    ],
  },
];

const PlanObraPage = ({ proyectoId, proyectoNombre = 'Lote 5 y 6', moneda = 'ARS' }) => {
  const [etapas, setEtapas] = useState([]);
  const [vista, setVista] = useState('todo');
  const [search, setSearch] = useState('');

  const [hist, setHist] = useState([]);
  const pushHist = (s) => setHist((h) => [...h, deepClone(s)]);
  const undo = () => setEtapas((prev) => { const h = deepClone(hist); const last = h.pop(); setHist(h); return last || prev; });

  const [snack, setSnack] = useState({ open: false, msg: '' });
  const openSnack = (msg) => setSnack({ open: true, msg });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (proyectoId) {
        const p = await getProyectoById(proyectoId);
        const es = (p?.etapas || []).map(e => ({ nombre: e.nombre, materiales: e.materiales || [], certificados: e.certificados || [] }));
        if (mounted) setEtapas(es);
      } else {
        if (mounted) setEtapas(mockEtapas);
      }
    })();
    return () => { mounted = false; };
  }, [proyectoId]);

  // Buscador simple por etapa/ítem
  const filteredEtapas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return etapas;
    return etapas.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      (e.materiales || []).some(m => String(m.nombre || '').toLowerCase().includes(q)) ||
      (e.certificados || []).some(c => String(c.descripcion || '').toLowerCase().includes(q))
    );
  }, [etapas, search]);

  // Wizard control
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState('materiales');
  const openWizardM = () => { setWizardMode('materiales'); setWizardOpen(true); };
  const openWizardC = () => { setWizardMode('certificados'); setWizardOpen(true); };

  const handleConfirmImport = (nuevasEtapas) => {
    pushHist(etapas);
    const merged = mergeEtapasAppend(etapas, nuevasEtapas);
    setEtapas(merged);
    openSnack('Importación aplicada');
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
      <Container maxWidth="xl">
        <KPICards proyectoNombre={proyectoNombre} etapas={etapas} moneda={moneda} />
        <ToolbarPlanObra
          vista={vista}
          onChangeVista={setVista}
          onOpenImportMateriales={openWizardM}
          onOpenImportCertificados={openWizardC}
          onUndo={undo}
          onExportExcel={() => exportPlanObraExcel(etapas)}
          search={search}
          setSearch={setSearch}
        />

        <Stack spacing={2}>
          {filteredEtapas.map((e, idx) => (
            <EtapaAccordion
              key={`${e.nombre}-${idx}`}
              etapa={e}
              vista={vista}
              onChangeEtapa={(updater) => {
                setEtapas(prev => {
                  const nuevo = JSON.parse(JSON.stringify(prev));
                  nuevo[idx] = updater(nuevo[idx]);
                  return nuevo;
                });
              }}
            />
          ))}
          {!filteredEtapas.length && (
            <Card><CardContent>
              <Typography variant="subtitle1">Todavía no hay datos para mostrar</Typography>
              <Typography variant="body2" color="text.secondary">Usá los botones de importación para cargar materiales y certificados.</Typography>
            </CardContent></Card>
          )}
        </Stack>
      </Container>

      <ImportCSVWizard
        open={wizardOpen}
        mode={wizardMode}
        onClose={() => setWizardOpen(false)}
        onConfirm={handleConfirmImport}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ open: false, msg: '' })}>
        <Alert severity="success" variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

PlanObraPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PlanObraPage;
