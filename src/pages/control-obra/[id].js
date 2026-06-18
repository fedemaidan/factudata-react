import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Container, LinearProgress, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Typography, Link as MuiLink,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import NuevoCertificadoDialog from 'src/components/controlObra/NuevoCertificadoDialog';
import ImputarGastoDialog from 'src/components/controlObra/ImputarGastoDialog';
import ManoObraTab from 'src/components/controlObra/ManoObraTab';
import ReportesTab from 'src/components/controlObra/ReportesTab';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const ESTADO_COLOR = { borrador: 'default', enviado: 'info', aprobado: 'success', rechazado: 'error' };

function ObraDetallePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [empresaId, setEmpresaId] = useState(null);
  const [tab, setTab] = useState(0);
  const [certDialog, setCertDialog] = useState(false);
  const [gastoDialog, setGastoDialog] = useState(false);

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

  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const accion = useMutation({ mutationFn: ({ fn }) => fn(), onSuccess: refresh });

  const obra = obraQ.data;
  const ejec = ejecQ.data;

  return (
    <DashboardLayout title="Control de Obra">
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <MuiLink component="button" onClick={() => router.push('/control-obra')} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
          <ArrowBackIcon fontSize="small" /> Mis obras
        </MuiLink>

        {obraQ.isLoading && <LinearProgress />}
        {obra && (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Typography variant="h5">{obra.titulo}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Contrato: {fmt(obra.total_contrato)} · Perfil: {obra.perfil} · Estado: {obra.estado}
                </Typography>
                {ejec?.totales && (
                  <Stack direction="row" spacing={3} mt={1}>
                    <Metric label="Avanzado" value={fmt(ejec.totales.valor_avance)} />
                    <Metric label="Gastado" value={fmt(ejec.totales.gastado)} />
                    <Metric label="Margen" value={fmt(ejec.totales.margen)} color={ejec.totales.margen >= 0 ? 'success.main' : 'error.main'} />
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Ejecución" />
              <Tab label="Certificados" />
              <Tab label="Mano de obra" />
              <Tab label="Reportes" />
            </Tabs>

            {tab === 0 && (
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="overline">Ejecución · costo y margen</Typography>
                    <Button size="small" variant="outlined" onClick={() => setGastoDialog(true)}>Imputar gasto</Button>
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rubro / Sub-rubro</TableCell>
                        <TableCell align="right">Contrato</TableCell>
                        <TableCell align="right">Avance</TableCell>
                        <TableCell align="right">Avanzado</TableCell>
                        <TableCell align="right">Gastado</TableCell>
                        <TableCell align="right">Margen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(ejec?.rubros || []).map((r) => ([
                        <TableRow key={r.uid}><TableCell colSpan={6}><strong>{r.nombre}</strong></TableCell></TableRow>,
                        ...(r.subrubros || []).map((s) => (
                          <TableRow key={s.uid}>
                            <TableCell sx={{ pl: 4 }}>{s.nombre}</TableCell>
                            <TableCell align="right">{fmt(s.contrato)}</TableCell>
                            <TableCell align="right">{s.avance_pct}%</TableCell>
                            <TableCell align="right">{fmt(s.valor_avance)}</TableCell>
                            <TableCell align="right">{fmt(s.gastado)}</TableCell>
                            <TableCell align="right" sx={{ color: s.margen >= 0 ? 'success.main' : 'error.main' }}>{fmt(s.margen)}</TableCell>
                          </TableRow>
                        )),
                      ]))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {tab === 1 && (
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="overline">Certificados</Typography>
                    <Button size="small" variant="outlined" onClick={() => setCertDialog(true)}>Nuevo certificado</Button>
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell align="right">Monto</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(certsQ.data || []).map((c) => (
                        <TableRow key={c._id}>
                          <TableCell>{c.numero}</TableCell>
                          <TableCell align="right">{fmt(c.monto_total)}</TableCell>
                          <TableCell><Chip size="small" label={c.estado} color={ESTADO_COLOR[c.estado] || 'default'} /></TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {c.estado === 'borrador' && (
                                <Button size="small" onClick={() => accion.mutate({ fn: () => ControlObraService.enviarCertificado(c._id, empresaId) })}>Enviar</Button>
                              )}
                              {c.estado === 'enviado' && (
                                <>
                                  <Button size="small" color="success" onClick={() => accion.mutate({ fn: () => ControlObraService.aprobarCertificado(c._id, empresaId) })}>Aprobar</Button>
                                  <Button size="small" color="error" onClick={() => accion.mutate({ fn: () => ControlObraService.rechazarCertificado(c._id, empresaId, 'Rechazado') })}>Rechazar</Button>
                                </>
                              )}
                              {c.estado === 'aprobado' && (
                                <>
                                  <Button size="small" variant="contained" onClick={() => accion.mutate({ fn: () => ControlObraService.cobrarCertificado(c._id, empresaId) })}>Cobrar</Button>
                                  <Button size="small" color="error" onClick={() => accion.mutate({ fn: () => ControlObraService.anularCertificado(c._id, empresaId, 'Anulado') })}>Anular</Button>
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(certsQ.data || []).length === 0 && (
                        <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Sin certificados.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {tab === 2 && <ManoObraTab obra={obra} empresaId={empresaId} />}
            {tab === 3 && <ReportesTab obra={obra} empresaId={empresaId} />}
          </Stack>
        )}
      </Container>

      {obra && (
        <>
          <NuevoCertificadoDialog open={certDialog} onClose={() => setCertDialog(false)} obra={obra} empresaId={empresaId} onCreated={() => { setCertDialog(false); refresh(); }} />
          <ImputarGastoDialog open={gastoDialog} onClose={() => setGastoDialog(false)} obra={obra} empresaId={empresaId} onDone={() => { setGastoDialog(false); refresh(); }} />
        </>
      )}
    </DashboardLayout>
  );
}

function Metric({ label, value, color }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle1" sx={{ color }}>{value}</Typography>
    </Box>
  );
}

export default ObraDetallePage;
