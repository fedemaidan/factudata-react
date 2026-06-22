import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import ControlObraService from 'src/services/controlObra/controlObraService';
import NuevoCertificadoDialog from 'src/components/controlObra/NuevoCertificadoDialog';
import CobrarCertificadoDialog from 'src/components/controlObra/CobrarCertificadoDialog';
import CertificadoDetalleDrawer from 'src/components/controlObra/CertificadoDetalleDrawer';
import MotivoDialog from 'src/components/controlObra/MotivoDialog';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fmtM = (n) => `$${(Math.round((Number(n) || 0) / 1e5) / 10).toLocaleString('es-AR')}M`;
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '-');
const diasDesde = (d) => (d ? Math.floor((Date.now() - new Date(d)) / 86400000) : null);

const ESTADO_COLOR = { borrador: 'default', enviado: 'info', aprobado: 'success', rechazado: 'error' };
const COBRO_COLOR = { pendiente: 'warning', cobrada_parcial: 'info', cobrada: 'success' };
const COBRO_LABEL = { pendiente: 'Por cobrar', cobrada_parcial: 'Parcial', cobrada: 'Cobrado' };
const estadoLabel = (c) => (c.anulado ? 'Anulado' : ({ borrador: 'Borrador', enviado: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' }[c.estado] || c.estado));

function Kpi({ label, value, sub, color }) {
  return (
    <Box sx={{ flex: '1 1 140px', minWidth: 130, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ color: color || 'text.primary', lineHeight: 1.2 }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

// Tab de Certificados: panorama (KPIs) + tabla rica + detalle/timeline + acta.
export default function CertificadosTab({ obra, certs, empresaId }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const [error, setError] = useState(null);
  const accion = useMutation({
    mutationFn: ({ fn }) => fn(),
    onSuccess: () => { setError(null); refresh(); },
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const [filtro, setFiltro] = useState('todos');
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState(null);
  const [cobrar, setCobrar] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [motivo, setMotivo] = useState(null); // { cert, tipo: 'rechazar'|'anular' }

  const lista = certs || [];

  // Nombres de sub-rubro por uid, para mostrar qué certifica cada fila.
  const subName = useMemo(() => {
    const m = {};
    (obra?.rubros || []).forEach((r) => (r.subrubros || []).forEach((s) => { m[s.uid] = s.nombre; }));
    return m;
  }, [obra]);
  const nombresLineas = (c) => (c.lineas || []).map((l) => subName[l.subrubro_uid] || l.subrubro_uid);

  const kpis = useMemo(() => {
    const aprob = lista.filter((c) => c.estado === 'aprobado' && !c.anulado);
    const certificado = aprob.reduce((a, c) => a + (c.monto_total || 0), 0);
    const cobrado = aprob.reduce((a, c) => a + (c.cobro?.monto_cobrado || 0), 0);
    const pendiente = aprob.reduce((a, c) => a + (c.cobro?.pendiente ?? (c.desglose?.neto || 0)), 0);
    const retenido = aprob.reduce((a, c) => a + (c.desglose?.retencion || 0), 0);
    const enRevision = lista.filter((c) => c.estado === 'enviado').length;
    return { certificado, cobrado, pendiente, retenido, enRevision };
  }, [lista]);

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return lista;
    if (filtro === 'anulado') return lista.filter((c) => c.anulado);
    if (filtro === 'rechazado') return lista.filter((c) => c.estado === 'rechazado' && !c.anulado);
    return lista.filter((c) => c.estado === filtro);
  }, [lista, filtro]);

  const aging = (c) => {
    if (c.estado === 'enviado') { const d = diasDesde(c.fecha); return d != null ? { txt: `esperando ${d}d`, alerta: d > 7 } : null; }
    if (c.estado === 'aprobado' && !c.anulado && c.cobro && c.cobro.estado !== 'cobrada') { const d = diasDesde(c.fecha_aprobacion); return d != null ? { txt: `sin cobrar ${d}d`, alerta: d > 15 } : null; }
    return null;
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Stack>
            <Typography variant="subtitle1" fontWeight={600}>Certificados</Typography>
            <Typography variant="caption" color="text.secondary">Tocá un certificado para ver el detalle y descargar el acta. Solo los <b>Aprobados</b> generan la cuota a cobrar.</Typography>
          </Stack>
          <Button size="small" variant="contained" onClick={() => setNuevo(true)}>Nuevo certificado</Button>
        </Stack>

        {/* KPIs */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <Kpi label="Certificado" value={fmtM(kpis.certificado)} sub="aprobado (bruto)" />
          <Kpi label="Cobrado" value={fmtM(kpis.cobrado)} color="success.main" />
          <Kpi label="Pendiente de cobro" value={fmtM(kpis.pendiente)} color={kpis.pendiente > 0 ? 'warning.main' : 'text.primary'} />
          <Kpi label="Fondo de reparo" value={fmtM(kpis.retenido)} sub="retenido" />
          <Kpi label="En revisión" value={kpis.enRevision} sub="esperando aprobación" color={kpis.enRevision > 0 ? 'info.main' : 'text.primary'} />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}

        <Stack direction="row" justifyContent="flex-end" mb={1}>
          <TextField select size="small" label="Filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ width: 180 }}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="borrador">Borrador</MenuItem>
            <MenuItem value="enviado">En revisión</MenuItem>
            <MenuItem value="aprobado">Aprobado</MenuItem>
            <MenuItem value="rechazado">Rechazado</MenuItem>
            <MenuItem value="anulado">Anulado</MenuItem>
          </TextField>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Período</TableCell>
              <TableCell>Certifica</TableCell>
              <TableCell align="right">Bruto</TableCell>
              <TableCell align="right">Neto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Cobro</TableCell>
              <TableCell>Antigüedad</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.map((c) => {
              const ag = aging(c);
              return (
                <TableRow key={c._id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetalle(c)}>
                  <TableCell>{c.numero}</TableCell>
                  <TableCell>{fecha(c.fecha)}</TableCell>
                  <TableCell>
                    {(() => {
                      const ns = nombresLineas(c);
                      if (!ns.length) return <Typography variant="caption" color="text.secondary">—</Typography>;
                      const txt = ns.slice(0, 2).join(', ') + (ns.length > 2 ? ` +${ns.length - 2}` : '');
                      return (
                        <Tooltip arrow title={ns.join(' · ')}>
                          <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 200 }}>{txt}</Typography>
                        </Tooltip>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right">{fmt(c.monto_total)}</TableCell>
                  <TableCell align="right">{c.desglose ? fmt(c.desglose.neto) : '—'}</TableCell>
                  <TableCell><Chip size="small" label={estadoLabel(c)} color={c.anulado ? 'warning' : (ESTADO_COLOR[c.estado] || 'default')} variant={c.estado === 'aprobado' && !c.anulado ? 'filled' : 'outlined'} /></TableCell>
                  <TableCell>
                    {c.cobro ? <Chip size="small" variant="outlined" color={COBRO_COLOR[c.cobro.estado] || 'default'} label={COBRO_LABEL[c.cobro.estado] || c.cobro.estado} />
                      : (c.estado === 'aprobado' ? <Typography variant="caption" color="text.secondary">—</Typography> : null)}
                  </TableCell>
                  <TableCell>
                    {ag && <Typography variant="caption" color={ag.alerta ? 'warning.main' : 'text.secondary'}>{ag.alerta ? '⚠ ' : ''}{ag.txt}</Typography>}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {c.estado === 'borrador' && (
                        <>
                          <Button size="small" disabled={accion.isPending} onClick={() => setEditar(c)}>Editar</Button>
                          <Button size="small" disabled={accion.isPending} onClick={() => accion.mutate({ fn: () => ControlObraService.enviarCertificado(c._id, empresaId) })}>Enviar</Button>
                        </>
                      )}
                      {c.estado === 'enviado' && (
                        <>
                          <Button size="small" color="success" disabled={accion.isPending} onClick={() => accion.mutate({ fn: () => ControlObraService.aprobarCertificado(c._id, empresaId) })}>Aprobar</Button>
                          <Button size="small" color="error" disabled={accion.isPending} onClick={() => setMotivo({ cert: c, tipo: 'rechazar' })}>Rechazar</Button>
                        </>
                      )}
                      {c.estado === 'aprobado' && !c.anulado && (
                        <>
                          {c.cobro?.estado !== 'cobrada' && <Button size="small" variant="contained" onClick={() => setCobrar(c)}>Cobrar</Button>}
                          <Button size="small" color="error" disabled={accion.isPending} onClick={() => setMotivo({ cert: c, tipo: 'anular' })}>Anular</Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtrados.length === 0 && (
              <TableRow><TableCell colSpan={9}><Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{lista.length === 0 ? 'Sin certificados. Armá el primero desde Ejecución o con “Nuevo certificado”.' : 'Nada con ese filtro.'}</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {nuevo && <NuevoCertificadoDialog open obra={obra} empresaId={empresaId} certs={lista} onClose={() => setNuevo(false)} onCreated={() => { setNuevo(false); refresh(); }} />}
      {editar && <NuevoCertificadoDialog open cert={editar} obra={obra} empresaId={empresaId} certs={lista} onClose={() => setEditar(null)} onCreated={() => { setEditar(null); refresh(); }} />}
      {cobrar && <CobrarCertificadoDialog open cert={cobrar} empresaId={empresaId} onClose={() => setCobrar(null)} onDone={() => { setCobrar(null); refresh(); }} />}
      {detalle && <CertificadoDetalleDrawer open cert={detalle} obra={obra} empresaId={empresaId} onClose={() => setDetalle(null)} />}
      {motivo && (
        <MotivoDialog
          open
          title={motivo.tipo === 'anular' ? `Anular certificado #${motivo.cert.numero}` : `Rechazar certificado #${motivo.cert.numero}`}
          subtitle={motivo.tipo === 'anular' ? 'Revierte el avance y la cuota. Indicá el motivo.' : 'El cliente lo rebotó. Indicá el motivo.'}
          confirmLabel={motivo.tipo === 'anular' ? 'Anular' : 'Rechazar'}
          pending={accion.isPending}
          onClose={() => setMotivo(null)}
          onConfirm={(txt) => {
            const fn = motivo.tipo === 'anular'
              ? () => ControlObraService.anularCertificado(motivo.cert._id, empresaId, txt || 'Anulado')
              : () => ControlObraService.rechazarCertificado(motivo.cert._id, empresaId, txt || 'Rechazado');
            accion.mutate({ fn }, { onSuccess: () => setMotivo(null) });
          }}
        />
      )}
    </Card>
  );
}
