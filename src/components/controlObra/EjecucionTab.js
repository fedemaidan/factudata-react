import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import ImputarGastoDialog from 'src/components/controlObra/ImputarGastoDialog';
import ReimputarMasivaDialog from 'src/components/controlObra/ReimputarMasivaDialog';
import SubrubroAccionesMenu from 'src/components/controlObra/SubrubroAccionesMenu';
import RubroAccionesMenu from 'src/components/controlObra/RubroAccionesMenu';
import ArmadoCertificadoDrawer from 'src/components/controlObra/ArmadoCertificadoDrawer';
import AuditoriaDrawer from 'src/components/controlObra/AuditoriaDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { fmt } from 'src/components/controlObra/ui';

const margenColor = (m) => (m >= 0 ? 'success.main' : 'error.main');
const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—');

// Grilla de Ejecución: contrato / avance / certificado / gastado / margen por sub-rubro.
export default function EjecucionTab({ obra, ejec, empresaId }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [masiva, setMasiva] = useState(false);
  const [armado, setArmado] = useState(false);
  const [audit, setAudit] = useState(false);
  const [nuevoRubro, setNuevoRubro] = useState(false);
  const [menu, setMenu] = useState({ anchorEl: null, sub: null });
  const [rubroMenu, setRubroMenu] = useState({ anchorEl: null, rubro: null });
  const t = ejec?.totales || {};
  const pendientesCert = (ejec?.rubros || []).flatMap((r) => r.subrubros || []).filter((s) => (s.avance_pct || 0) > (s.cert_pct || 0)).length;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Stack>
            <Typography variant="subtitle1" fontWeight={600}>Ejecución · costo y margen</Typography>
            <Typography variant="caption" color="text.secondary">Tocá una tarea para registrar avance, certificar, imputar o editar.</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="contained" onClick={() => setArmado(true)} disabled={pendientesCert === 0}>
              Armar certificado{pendientesCert > 0 ? ` (${pendientesCert})` : ''}
            </Button>
            <Button size="small" variant="outlined" onClick={() => setDialog(true)}>Imputar gasto</Button>
            <Button size="small" variant="outlined" onClick={() => setMasiva(true)}>Re-imputar masiva</Button>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setNuevoRubro(true)}>Rubro</Button>
            <IconButton size="small" title="Historial de cambios" onClick={() => setAudit(true)}><HistoryIcon fontSize="small" /></IconButton>
          </Stack>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rubro / Sub-rubro</TableCell>
              <TableCell align="right">Contrato</TableCell>
              <TableCell sx={{ width: 160 }}>Avance</TableCell>
              <TableCell align="right">Certificado</TableCell>
              <TableCell align="right">Gastado</TableCell>
              <TableCell align="right">Margen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(ejec?.rubros || []).map((r) => {
              const rContrato = (r.subrubros || []).reduce((s, x) => s + (x.contrato || 0), 0);
              const rGastado = (r.subrubros || []).reduce((s, x) => s + (x.gastado || 0), 0);
              return [
                <TableRow key={r.uid} sx={{ '& td': { bgcolor: 'action.hover', fontWeight: 600, borderBottom: 'none' } }}>
                  <TableCell>{r.nombre}</TableCell>
                  <TableCell align="right">{fmt(rContrato)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell align="right">{fmt(rGastado)}</TableCell>
                  <TableCell align="right" sx={{ py: 0 }}>
                    <IconButton size="small" onClick={(e) => setRubroMenu({ anchorEl: e.currentTarget, rubro: r })}><MoreVertIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>,
                ...(r.subrubros || []).map((s) => (
                  <TableRow key={s.uid} hover sx={{ cursor: 'pointer' }} onClick={(e) => setMenu({ anchorEl: e.currentTarget, sub: s })}>
                    <TableCell sx={{ pl: 4 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <span>{s.nombre}</span>
                        {s.atrasada && <Chip size="small" color="error" variant="outlined" label="atrasada" sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }} />}
                      </Stack>
                      {(s.responsable || s.contrato_proveedor) && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {s.responsable ? `🙋 ${s.responsable.nombre}` : ''}
                          {s.responsable && s.contrato_proveedor ? ' · ' : ''}
                          {s.contrato_proveedor ? `👷 ${s.contrato_proveedor.proveedor_nombre}` : ''}
                        </Typography>
                      )}
                      {(s.fecha_inicio || s.fecha_fin) && (
                        <Typography variant="caption" color={s.atrasada ? 'error.main' : 'text.secondary'} display="block">
                          📅 {fmtFecha(s.fecha_inicio)} → {fmtFecha(s.fecha_fin)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{fmt(s.contrato)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={Math.min(s.avance_pct, 100)} sx={{ height: 6, borderRadius: 3 }} /></Box>
                        <Typography variant="caption" sx={{ minWidth: 72, textAlign: 'right' }}>{s.avance_pct}%{(s.cert_pct || 0) < s.avance_pct ? ` · cert ${s.cert_pct || 0}%` : ''}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{fmt(s.certificado)}</TableCell>
                    <TableCell align="right">{fmt(s.gastado)}</TableCell>
                    <TableCell align="right" sx={{ color: margenColor(s.margen), fontWeight: 500 }}>{fmt(s.margen)}</TableCell>
                  </TableRow>
                )),
              ];
            })}
          </TableBody>
          <TableBody>
            <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
              <TableCell>Total</TableCell>
              <TableCell align="right">{fmt(t.contrato)}</TableCell>
              <TableCell />
              <TableCell align="right">{fmt(t.certificado)}</TableCell>
              <TableCell align="right">{fmt(t.gastado)}</TableCell>
              <TableCell align="right" sx={{ color: margenColor(t.margen || 0) }}>{fmt(t.margen)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {(ejec?.rubros || []).length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Sin rubros.</Typography>
        )}
      </CardContent>

      <ImputarGastoDialog
        open={dialog}
        onClose={() => setDialog(false)}
        obra={obra}
        empresaId={empresaId}
        onDone={() => { setDialog(false); qc.invalidateQueries({ queryKey: ['control-obra'] }); }}
      />

      <ReimputarMasivaDialog
        open={masiva}
        onClose={() => setMasiva(false)}
        obra={obra}
        empresaId={empresaId}
        onDone={() => { setMasiva(false); qc.invalidateQueries({ queryKey: ['control-obra'] }); }}
      />

      <SubrubroAccionesMenu
        obra={obra}
        subrubro={menu.sub}
        empresaId={empresaId}
        anchorEl={menu.anchorEl}
        onClose={() => setMenu({ anchorEl: null, sub: null })}
      />

      <RubroAccionesMenu
        obra={obra}
        rubro={rubroMenu.rubro}
        empresaId={empresaId}
        anchorEl={rubroMenu.anchorEl}
        onClose={() => setRubroMenu({ anchorEl: null, rubro: null })}
      />

      <ArmadoCertificadoDrawer
        open={armado}
        onClose={() => setArmado(false)}
        obra={obra}
        ejec={ejec}
        empresaId={empresaId}
      />

      <AuditoriaDrawer open={audit} onClose={() => setAudit(false)} obra={obra} empresaId={empresaId} />

      <NuevoRubroDialog open={nuevoRubro} onClose={() => setNuevoRubro(false)} obra={obra} empresaId={empresaId} onDone={() => { setNuevoRubro(false); qc.invalidateQueries({ queryKey: ['control-obra'] }); }} />
    </Card>
  );
}

function NuevoRubroDialog({ open, onClose, obra, empresaId, onDone }) {
  const [nombre, setNombre] = useState('');
  const m = useMutation({ mutationFn: () => ControlObraService.agregarRubro(obra._id, empresaId, nombre), onSuccess: () => { setNombre(''); onDone(); } });
  return (
    <FormDrawer
      open={open} onClose={onClose} title="Nuevo rubro"
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={m.isPending || !nombre} onClick={() => m.mutate()}>Agregar</Button>
        </>
      )}
    >
      <TextField label="Nombre del rubro" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth size="small" />
    </FormDrawer>
  );
}
