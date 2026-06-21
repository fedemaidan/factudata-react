import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Checkbox, Divider, Drawer, IconButton, Stack,
  TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { fmt } from 'src/components/controlObra/ui';
import { solapamientos } from 'src/components/controlObra/certsOverlap';

// Drawer que arma un certificado (borrador) a partir del avance físico pendiente
// de certificar (físico > certificado). Auto-lista los pendientes.
export default function ArmadoCertificadoDrawer({ open, onClose, obra, ejec, empresaId }) {
  const qc = useQueryClient();
  const [sel, setSel] = useState({});   // { uid: { incluido, target } }
  const [hechoNumero, setHechoNumero] = useState(null);
  const [error, setError] = useState(null);

  // Sub-rubros con avance físico sin certificar.
  const pendientes = useMemo(() => (ejec?.rubros || [])
    .flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre })))
    .filter((s) => (s.avance_pct || 0) > (s.cert_pct || 0)), [ejec]);

  const estado = (s) => sel[s.uid] || { incluido: true, target: s.avance_pct };
  const setEstado = (uid, patch) => setSel((m) => ({ ...m, [uid]: { ...estado({ uid, avance_pct: 0 }), ...m[uid], ...patch } }));

  const lineas = pendientes
    .map((s) => ({ s, e: estado(s) }))
    .filter(({ e }) => e.incluido && Number(e.target) > 0)
    .map(({ s, e }) => ({ subrubro_uid: s.uid, nombre: s.nombre, target: Number(e.target), cert: s.cert_pct || 0, contrato: s.contrato || 0 }))
    .filter((l) => l.target > l.cert);

  const totalCertificar = lineas.reduce((a, l) => a + ((l.target - l.cert) / 100) * l.contrato, 0);

  // Aviso de solapamiento con otros certificados pendientes (borrador/enviado).
  const certsQ = useQuery({
    queryKey: ['control-obra', 'certs', obra._id, empresaId],
    queryFn: () => ControlObraService.listarCertificados(obra._id, empresaId),
    enabled: open && !!empresaId,
  });
  const { porSubrubro, avisos } = useMemo(
    () => solapamientos(certsQ.data, lineas.map((l) => l.subrubro_uid)),
    [certsQ.data, lineas]
  );

  const crear = useMutation({
    mutationFn: async () => {
      if (lineas.length === 0) throw new Error('Elegí al menos un sub-rubro con avance a certificar');
      const cert = await ControlObraService.crearCertificado(obra._id, {
        empresa_id: empresaId,
        lineas: lineas.map((l) => ({ subrubro_uid: l.subrubro_uid, avance_pct_nuevo: l.target })),
      });
      return cert;
    },
    onSuccess: (cert) => { setHechoNumero(cert?.numero ?? '✓'); setSel({}); qc.invalidateQueries({ queryKey: ['control-obra'] }); },
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AssignmentTurnedInIcon color="action" />
            <Typography variant="h6">Armar certificado</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>
          Sub-rubros con avance físico sin certificar. Revisá y creá el certificado: queda en <b>borrador</b> para enviar/aprobar.
        </Typography>
        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {hechoNumero != null && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setHechoNumero(null)}>
              Certificado {hechoNumero} creado en <b>borrador</b>. Envialo/aprobalo en la pestaña Certificados.
            </Alert>
          )}
          {avisos.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600}>Se solapa con otros certificados pendientes</Typography>
              {avisos.map(({ cert: c, rel }) => (
                <Typography key={c._id} variant="caption" display="block">#{c.numero} ({c.estado}) — {rel}</Typography>
              ))}
            </Alert>
          )}
          {pendientes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hay avance pendiente de certificar. Registrá avance físico en las tareas (físico mayor a lo certificado).</Typography>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={1}>
              {pendientes.map((s) => {
                const e = estado(s);
                const monto = ((Number(e.target) - (s.cert_pct || 0)) / 100) * (s.contrato || 0);
                return (
                  <Stack key={s.uid} direction="row" spacing={1} alignItems="center" sx={{ opacity: e.incluido ? 1 : 0.5 }}>
                    <Checkbox size="small" checked={!!e.incluido} onChange={(ev) => setEstado(s.uid, { incluido: ev.target.checked })} />
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" noWrap>{s.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.rubro} · cert {s.cert_pct || 0}% → físico {s.avance_pct}%</Typography>
                      {e.incluido && Number(e.target) > (s.cert_pct || 0) && (porSubrubro[s.uid] || []).length > 0 && (
                        <Typography variant="caption" color="warning.main" display="block" noWrap>⚠ ya está en {(porSubrubro[s.uid]).map((c) => `#${c.numero}`).join(', ')}</Typography>
                      )}
                    </Box>
                    <TextField
                      size="small" type="number" label="Certif. %" disabled={!e.incluido}
                      value={e.target}
                      onChange={(ev) => setEstado(s.uid, { target: ev.target.value })}
                      sx={{ width: 86 }} inputProps={{ min: s.cert_pct || 0, max: 100 }}
                    />
                    <Typography variant="caption" sx={{ width: 78, textAlign: 'right', color: monto > 0 ? 'warning.main' : 'text.disabled' }}>{fmt(monto)}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          )}
          {error && <Typography color="error" variant="body2" mt={2}>{error}</Typography>}
        </Box>

        <Divider />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Total a certificar</Typography>
            <Typography variant="h6">{fmt(totalCertificar)}</Typography>
          </Box>
          <Button variant="contained" disabled={crear.isPending || lineas.length === 0} onClick={() => { setError(null); crear.mutate(); }}>
            Crear certificado
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
