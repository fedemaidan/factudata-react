import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Container, Snackbar, Alert, Stack, Typography, Button } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import KPICards from 'src/components/planobra/KPICards';
import ToolbarPlanObra from 'src/components/planobra/ToolbarPlanObra';
import EtapaAccordion from 'src/components/planobra/EtapaAccordion';
import ImportCSVWizard from 'src/components/planobra/ImportCSVWizard';
import { deepClone, mergeEtapasAppend } from 'src/utils/planobra';
import { exportPlanObraExcel } from 'src/utils/exportExcel';
import { useRouter } from 'next/router';
import { usePlanObra } from 'src/hooks/usePlanObra';
import EtapaFormDialog from 'src/components/planobra/EtapaFormDialog';
import MaterialFormDialog from 'src/components/planobra/MaterialFormDialog';
import CertificadoFormDialog from 'src/components/planobra/CertificadoFormDialog';
import ConfirmDialog from 'src/components/planobra/ConfirmDialog';
import AddIcon from '@mui/icons-material/Add';

const PlanObraPage = () => {
  const router = useRouter();
  const { proyectoId } = router.query;

  // Hook centralizado (ya lee datos del proyecto internamente si no existe plan)
  const {
       data, status, error, notFound, refresh, savePlan, createEmptyPlan, createFromEmpresa, proyectoInfo,
       addEtapa, updateEtapaByIndex, deleteEtapaByIndex,
       addMaterialToEtapa, updateMaterialInEtapa, deleteMaterialInEtapa,
       addCertificadoToEtapa, updateCertificadoInEtapa, deleteCertificadoInEtapa,
       recalcular
     } = usePlanObra(proyectoId, { defaultMoneda: 'ARS' });
  
    // Estado local para edición en memoria
  const [etapas, setEtapas] = useState([]);
  const [vista, setVista] = useState('todo');
  const [search, setSearch] = useState('');
  const [hist, setHist] = useState([]);
  const [snack, setSnack] = useState({ open: false, msg: '' });

  // Diálogos CRUD
  const [dlgEtapa, setDlgEtapa] = useState({ open: false, index: null, initial: null });
  const [dlgMat, setDlgMat] = useState({ open: false, etapaIdx: null, index: null, initial: null });
  const [dlgCert, setDlgCert] = useState({ open: false, etapaIdx: null, index: null, initial: null });
  const [confirm, setConfirm] = useState({ open: false, title: '', content: '', onConfirm: null });

  const proyectoNombre = data?.nombreProyecto || proyectoInfo?.nombre || '—';
  const moneda = data?.moneda || proyectoInfo?.moneda || 'ARS';

  const pushHist = (s) => setHist((h) => [...h, deepClone(s)]);
  const undo = () => setEtapas((prev) => { const h = deepClone(hist); const last = h.pop(); setHist(h); return last || prev; });
  const openSnack = (msg) => setSnack({ open: true, msg });

  useEffect(() => {
    if (data?.etapas) setEtapas(data.etapas);
  }, [data]);

  const filteredEtapas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return etapas;
    return etapas.filter(e =>
      e.nombre?.toLowerCase().includes(q) ||
      (e.materiales || []).some(m => String(m.nombre || '').toLowerCase().includes(q)) ||
      (e.certificados || []).some(c => String(c.descripcion || '').toLowerCase().includes(q))
    );
  }, [etapas, search]);

  // Helpers
  const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Etapas
  const onAddEtapa = () => setDlgEtapa({ open: true, index: null, initial: null });
  const onEditEtapa = (idx) => setDlgEtapa({ open: true, index: idx, initial: etapas[idx] });
  const onDeleteEtapa = (idx) =>
    setConfirm({
      open: true,
      title: 'Eliminar etapa',
      content: `¿Eliminar la etapa "${etapas[idx]?.nombre}"?`,
      onConfirm: async () => {
        const updatedPlan = await deleteEtapaByIndex(idx);
+       setConfirm({ open: false });
+       setEtapas(updatedPlan.etapas || []);
      }
    });

  const saveEtapaDialog = async (payload) => {
    setDlgEtapa({ open: false, index: null, initial: null });
    if (dlgEtapa.index == null) {
           const updatedPlan = await addEtapa({ nombre: payload?.nombre || 'Sin nombre' });
           setEtapas(updatedPlan.etapas || []);
         } else {
           const updatedPlan = await updateEtapaByIndex(dlgEtapa.index, { nombre: payload?.nombre });
           setEtapas(updatedPlan.etapas || []);
         }
  };

  // Materiales
  const onAddMaterial = (etapaIdx) => setDlgMat({ open: true, etapaIdx, index: null, initial: null });
  const onEditMaterial = (etapaIdx, index) => setDlgMat({ open: true, etapaIdx, index, initial: etapas[etapaIdx].materiales[index] });
  const onDeleteMaterial = (etapaIdx, index) =>
    setConfirm({
      open: true,
      title: 'Eliminar material',
      content: `¿Eliminar "${etapas[etapaIdx]?.materiales[index]?.nombre}"?`,
      onConfirm: async () => {
        const updatedPlan = await deleteMaterialInEtapa(etapaIdx, index);
        setConfirm({ open: false });
        setEtapas(updatedPlan.etapas || []);
      }
    });

  const saveMaterialDialog = async (payload) => {
    setDlgMat({ open: false, etapaIdx: null, index: null, initial: null });
    let updatedPlan;
   if (dlgMat.index == null) {
     updatedPlan = await addMaterialToEtapa(dlgMat.etapaIdx, payload);
   } else {
     updatedPlan = await updateMaterialInEtapa(dlgMat.etapaIdx, dlgMat.index, payload);
   }
   setEtapas(updatedPlan.etapas || []);
  };

  // Certificados
  const onAddCertificado = (etapaIdx) => setDlgCert({ open: true, etapaIdx, index: null, initial: null });
  const onEditCertificado = (etapaIdx, index) => setDlgCert({ open: true, etapaIdx, index, initial: etapas[etapaIdx].certificados[index] });
  const onDeleteCertificado = (etapaIdx, index) =>
    setConfirm({
      open: true,
      title: 'Eliminar certificado',
      content: `¿Eliminar "${etapas[etapaIdx]?.certificados[index]?.descripcion}"?`,
      onConfirm: async () => {
        const updatedPlan = await deleteCertificadoInEtapa(etapaIdx, index);
       setConfirm({ open: false });
       setEtapas(updatedPlan.etapas || []);

      }
    });

  const saveCertificadoDialog = async (payload) => {
    setDlgCert({ open: false, etapaIdx: null, index: null, initial: null });
    let updatedPlan;
    if (dlgCert.index == null) {
      updatedPlan = await addCertificadoToEtapa(dlgCert.etapaIdx, payload);
    } else {
      updatedPlan = await updateCertificadoInEtapa(dlgCert.etapaIdx, dlgCert.index, payload);
    }
    setEtapas(updatedPlan.etapas || []);

  };

  // Importador CSV
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState('materiales');
  const openWizardM = () => { setWizardMode('materiales'); setWizardOpen(true); };
  const openWizardC = () => { setWizardMode('certificados'); setWizardOpen(true); };

  const handleConfirmImport = async (nuevasEtapas) => {
    const prev = etapas;
    pushHist(prev);
    const merged = mergeEtapasAppend(prev, nuevasEtapas);
    setEtapas(merged);
    openSnack('Importación aplicada');

    try {
      const plan = await savePlan({
        proyectoId: String(proyectoId || data?.proyectoId || 'P-001'),
        nombreProyecto: proyectoNombre || 'Proyecto',
        moneda,
        etapas: merged
      });
      
      if (plan?.etapas) setEtapas(plan.etapas);

    } catch (e) {
      console.error('Error guardando plan:', e);
    }
  };

  // Estados de carga / error
  if (status === 'loading' && !data && !notFound) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl"><Typography>Cargando plan…</Typography></Container>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          <Typography color="error">Error cargando el plan</Typography>
          <Typography variant="body2">{String(error?.message || error)}</Typography>
          <Button onClick={refresh} sx={{ mt: 2 }}>Reintentar</Button>
        </Container>
      </Box>
    );
  }

  // CTA: no existe el plan -> opciones de creación
  if (notFound) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="md">
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Este proyecto no tiene Plan de Obra aún</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Podés crear uno vacío o copiar las etapas por defecto de la empresa del proyecto.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={async () => { await createEmptyPlan(); openSnack('Plan creado'); }}>
                  Crear plan vacío
                </Button>
                <Button variant="outlined" onClick={async () => { await createFromEmpresa(); openSnack('Plan creado desde empresa'); }}>
                  Crear copiando etapas de la empresa
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>

        <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ open: false, msg: '' })}>
          <Alert severity="success" variant="filled">{snack.msg}</Alert>
        </Snackbar>
      </Box>
    );
  }

  // Plan existente
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={onAddEtapa}>
            Nueva etapa
          </Button>
        </Box>

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
              onEditEtapa={() => onEditEtapa(idx)}
              onDeleteEtapa={() => onDeleteEtapa(idx)}
              onAddMaterial={() => onAddMaterial(idx)}
              onEditMaterial={(rowIdx) => onEditMaterial(idx, rowIdx)}
              onDeleteMaterial={(rowIdx) => onDeleteMaterial(idx, rowIdx)}
              onAddCertificado={() => onAddCertificado(idx)}
              onEditCertificado={(rowIdx) => onEditCertificado(idx, rowIdx)}
              onDeleteCertificado={(rowIdx) => onDeleteCertificado(idx, rowIdx)}
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

      {/* Diálogos */}
      <EtapaFormDialog
        open={dlgEtapa.open}
        initialValue={dlgEtapa.initial}
        onClose={() => setDlgEtapa({ open: false, index: null, initial: null })}
        onSave={saveEtapaDialog}
      />
      <MaterialFormDialog
        open={dlgMat.open}
        initialValue={dlgMat.initial}
        onClose={() => setDlgMat({ open: false, etapaIdx: null, index: null, initial: null })}
        onSave={saveMaterialDialog}
      />
      <CertificadoFormDialog
        open={dlgCert.open}
        initialValue={dlgCert.initial}
        onClose={() => setDlgCert({ open: false, etapaIdx: null, index: null, initial: null })}
        onSave={saveCertificadoDialog}
      />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        content={confirm.content}
        onClose={() => setConfirm({ open: false })}
        onConfirm={confirm.onConfirm}
      />
    </Box>
  );
};

PlanObraPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default PlanObraPage;
