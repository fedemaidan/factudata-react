import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  Chip, Container, LinearProgress, Stack, Tab, Tabs, Typography, Link as MuiLink,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import CertificadosTab from 'src/components/controlObra/CertificadosTab';
import CobrosObraTab from 'src/components/controlObra/CobrosObraTab';
import EjecucionTab from 'src/components/controlObra/EjecucionTab';
import CronogramaTab from 'src/components/controlObra/CronogramaTab';
import ManoObraTab from 'src/components/controlObra/ManoObraTab';
import ReportesTab from 'src/components/controlObra/ReportesTab';
import ResumenTab from 'src/components/controlObra/ResumenTab';
import AsociarProyecto from 'src/components/controlObra/AsociarProyecto';
import SinPermisoControlObra, { puedeVerControlObra } from 'src/components/controlObra/AccesoControlObra';
import { fmtMoneda, obraMonedaInfo, monedaLabel, esMonedaNativa } from 'src/components/controlObra/ui';

function ObraDetallePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthContext();
  const [empresaId, setEmpresaId] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((e) => setEmpresaId(e?.id || null)).catch(() => {});
  }, [user]);

  const obraQ = useQuery({
    queryKey: ['control-obra', 'obra', id, empresaId],
    queryFn: () => ControlObraService.obtenerObra(id, empresaId),
    enabled: !!id && !!empresaId,
  });
  const ejecQ = useQuery({
    queryKey: ['control-obra', 'ejecucion', id, empresaId],
    queryFn: () => ControlObraService.ejecucion(id, empresaId),
    enabled: !!id && !!empresaId,
  });
  const certsQ = useQuery({
    queryKey: ['control-obra', 'certs', id, empresaId],
    queryFn: () => ControlObraService.listarCertificados(id, empresaId),
    enabled: !!id && !!empresaId,
  });

  const obra = obraQ.data;
  const ejec = ejecQ.data;

  if (user && !puedeVerControlObra(user)) return <SinPermisoControlObra />;

  return (
    <DashboardLayout title={obra?.titulo || 'Control de Obra'}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
          <MuiLink component="button" onClick={() => router.push('/control-obra')} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <ArrowBackIcon fontSize="small" /> Mis obras
          </MuiLink>
          {obra && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Moneda de la obra en texto claro (sin chip), visible en todas las tabs.
                  CAC/USD se muestran en unidades nativas; los montos van en esta moneda. */}
              <Typography variant="body2" color="text.secondary">
                Contrato {fmtMoneda(obra.total_contrato, obraMonedaInfo(obra))} · Perfil {obra.perfil}
                {esMonedaNativa(obraMonedaInfo(obra)) ? ` · Moneda ${monedaLabel(obraMonedaInfo(obra))}` : ''}
              </Typography>
              <AsociarProyecto obra={obra} empresaId={empresaId} />
              <Chip size="small" label={obra.estado} color={obra.estado === 'activa' ? 'info' : 'default'} />
            </Stack>
          )}
        </Stack>

        {obraQ.isLoading && <LinearProgress />}
        {obra && (
          <Stack spacing={2}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Resumen" />
              <Tab label="Ejecución" />
              <Tab label="Cronograma" />
              <Tab label="Certificados" />
              <Tab label="Cobros" />
              <Tab label="Mano de obra" />
              <Tab label="Reportes" />
            </Tabs>

            {tab === 0 && <ResumenTab obra={obra} ejec={ejec} certs={certsQ.data || []} empresaId={empresaId} />}

            {tab === 1 && <EjecucionTab obra={obra} ejec={ejec} empresaId={empresaId} />}

            {tab === 2 && <CronogramaTab obra={obra} empresaId={empresaId} />}

            {tab === 3 && <CertificadosTab obra={obra} certs={certsQ.data || []} empresaId={empresaId} />}

            {tab === 4 && <CobrosObraTab obra={obra} empresaId={empresaId} />}
            {tab === 5 && <ManoObraTab obra={obra} empresaId={empresaId} />}
            {tab === 6 && <ReportesTab obra={obra} empresaId={empresaId} />}
          </Stack>
        )}
      </Container>
    </DashboardLayout>
  );
}

export default ObraDetallePage;
