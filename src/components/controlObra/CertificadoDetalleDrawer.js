import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Box, Button, Chip, Divider, LinearProgress, Stack, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fechaHora = (d) => (d ? new Date(d).toLocaleString('es-AR') : '');

const EVENTO = {
  creado: { label: 'Creado', color: 'default' },
  enviado: { label: 'Enviado a aprobación', color: 'info' },
  aprobado: { label: 'Aprobado', color: 'success' },
  rechazado: { label: 'Rechazado por el cliente', color: 'error' },
  anulado: { label: 'Anulado', color: 'warning' },
  cobrado: { label: 'Cobrado', color: 'success' },
};
const COBRO_LABEL = { pendiente: 'Por cobrar', cobrada_parcial: 'Cobro parcial', cobrada: 'Cobrado' };

// Detalle de un certificado: estado, líneas por rubro, desglose de deducciones,
// línea de tiempo y cobro. Permite descargar el acta (PDF).
export default function CertificadoDetalleDrawer({ open, onClose, cert, obra, empresaId }) {
  const [bajando, setBajando] = useState(false);

  // Líneas agrupadas por rubro, con nombres resueltos desde la obra.
  const rubros = useMemo(() => {
    const subInfo = {};
    (obra?.rubros || []).forEach((r) => (r.subrubros || []).forEach((s) => { subInfo[s.uid] = { nombre: s.nombre, rubro: r.nombre }; }));
    const map = {};
    (cert?.lineas || []).forEach((l) => {
      const info = subInfo[l.subrubro_uid] || { nombre: l.subrubro_uid, rubro: '—' };
      (map[info.rubro] = map[info.rubro] || []).push({ ...l, nombre: info.nombre });
    });
    return Object.entries(map).map(([rubro, lineas]) => ({ rubro, lineas }));
  }, [cert, obra]);

  const descargar = useMutation({
    mutationFn: () => ControlObraService.descargarActa(cert._id, empresaId, cert.numero),
    onMutate: () => setBajando(true),
    onSettled: () => setBajando(false),
  });

  if (!cert) return null;
  const d = cert.desglose;
  const pctContrato = obra?.total_contrato ? Math.round((cert.monto_total / obra.total_contrato) * 1000) / 10 : null;
  const estadoLbl = cert.anulado ? 'Anulado' : (cert.estado === 'rechazado' ? 'Rechazado' : cert.estado);

  return (
    <FormDrawer
      open={open} onClose={onClose} title={`Certificado #${cert.numero}`}
      subtitle={`${estadoLbl} · ${cert.fecha ? new Date(cert.fecha).toLocaleDateString('es-AR') : ''}`}
      width={520}
      actions={(
        <>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} disabled={bajando} onClick={() => descargar.mutate()}>
            {bajando ? 'Generando…' : 'Descargar acta'}
          </Button>
        </>
      )}
    >
      <Stack spacing={2}>
        {/* Resumen */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`Bruto ${fmt(cert.monto_total)}`} />
          {d && d.neto !== cert.monto_total && <Chip size="small" color="primary" label={`Neto ${fmt(d.neto)}`} />}
          {pctContrato != null && <Chip size="small" variant="outlined" label={`${pctContrato}% del contrato`} />}
          {cert.cobro && <Chip size="small" variant="outlined" color={cert.cobro.estado === 'cobrada' ? 'success' : 'warning'} label={COBRO_LABEL[cert.cobro.estado] || cert.cobro.estado} />}
        </Stack>

        {cert.rechazado_motivo && (
          <Typography variant="body2" color="error.main">Motivo: {cert.rechazado_motivo}</Typography>
        )}

        {/* Líneas por rubro */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Avance certificado</Typography>
          <Stack divider={<Divider flexItem />} spacing={0.75}>
            {rubros.map((r) => (
              <Box key={r.rubro}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{r.rubro}</Typography>
                {r.lineas.map((l) => (
                  <Stack key={l.subrubro_uid} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{l.nombre} <Typography component="span" variant="caption" color="text.secondary">({l.avance_pct_anterior}% → {l.avance_pct_nuevo}%)</Typography></Typography>
                    <Typography variant="body2">{fmt(l.monto_certificado)}</Typography>
                  </Stack>
                ))}
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Desglose */}
        {d && (
          <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Row label="Bruto" value={fmt(d.bruto)} />
            {d.retencion > 0 && <Row label={`Fondo de reparo (${obra?.retencion_pct || 0}%)`} value={`− ${fmt(d.retencion)}`} />}
            {d.amortizacion_anticipo > 0 && <Row label={`Amortización anticipo (${obra?.anticipo_pct || 0}%)`} value={`− ${fmt(d.amortizacion_anticipo)}`} />}
            <Divider sx={{ my: 0.5 }} />
            <Row label="Neto a cobrar" value={fmt(d.neto)} bold />
            {cert.cobro && cert.cobro.monto_cobrado > 0 && (
              <Row label="Cobrado" value={`${fmt(cert.cobro.monto_cobrado)} (pend. ${fmt(cert.cobro.pendiente)})`} />
            )}
          </Box>
        )}

        {/* Línea de tiempo */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Historial</Typography>
          <Stack spacing={0.75}>
            {(cert.eventos || []).map((e, i) => {
              const meta = EVENTO[e.tipo] || { label: e.tipo, color: 'default' };
              return (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                  <Typography variant="caption" color="text.secondary">{fechaHora(e.fecha)}{e.detalle ? ` · ${e.detalle}` : ''}</Typography>
                </Stack>
              );
            })}
            {(cert.eventos || []).length === 0 && <Typography variant="caption" color="text.secondary">Sin eventos.</Typography>}
          </Stack>
        </Box>

        {descargar.isPending && <LinearProgress />}
      </Stack>
    </FormDrawer>
  );
}

function Row({ label, value, bold = false }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant={bold ? 'body2' : 'caption'} color={bold ? 'text.primary' : 'text.secondary'} fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography variant={bold ? 'body2' : 'caption'} fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Stack>
  );
}
