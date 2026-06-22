import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert, Box, Button, Stack, TextField, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { solapamientos } from 'src/components/controlObra/certsOverlap';

// Diálogo para cargar/editar un certificado de avance sobre los sub-rubros de una obra.
// `cert` presente → modo edición (PATCH). `certs` = certificados de la obra (para
// avisar de solapamientos con otros borradores/enviados).
export default function NuevoCertificadoDialog({ open, onClose, obra, empresaId, onCreated, subrubroUid = null, autoAprobar = false, cert = null, certs = [] }) {
  const esEdicion = !!cert;
  const subrubros = useMemo(
    () => (obra?.rubros || [])
      .flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre })))
      .filter((s) => !subrubroUid || s.uid === subrubroUid),
    [obra, subrubroUid]
  );
  const [valores, setValores] = useState({});
  const [error, setError] = useState(null);

  // Prefill: en edición, desde las líneas del cert; al crear, sugerir el físico.
  useEffect(() => {
    if (!open) return;
    const init = {};
    if (esEdicion) {
      const byUid = {};
      (cert.lineas || []).forEach((l) => { byUid[l.subrubro_uid] = l.avance_pct_nuevo; });
      subrubros.forEach((s) => { init[s.uid] = byUid[s.uid] ?? (s.cert_pct ?? ''); });
    } else {
      subrubros.forEach((s) => { init[s.uid] = s.avance_pct ?? ''; });
    }
    setValores(init);
  }, [open, subrubros, esEdicion, cert]);

  // Sub-rubros que este certificado va a tocar (valor > lo ya certificado).
  const seleccionados = subrubros
    .filter((s) => Number.isFinite(Number(valores[s.uid])) && Number(valores[s.uid]) > (s.cert_pct || 0))
    .map((s) => s.uid);

  // Solapamientos: otros certificados borrador/enviado que tocan los mismos sub-rubros.
  const { porSubrubro, avisos } = useMemo(
    () => solapamientos(certs, seleccionados, cert?._id || null),
    [certs, cert, seleccionados]
  );

  const guardar = useMutation({
    mutationFn: async () => {
      const lineas = subrubros
        .map((s) => ({ subrubro_uid: s.uid, avance_pct_nuevo: Number(valores[s.uid]), cert: s.cert_pct || 0 }))
        .filter((l) => Number.isFinite(l.avance_pct_nuevo) && l.avance_pct_nuevo > l.cert)
        .map((l) => ({ subrubro_uid: l.subrubro_uid, avance_pct_nuevo: l.avance_pct_nuevo }));
      if (lineas.length === 0) throw new Error('No hay avance nuevo para certificar (ya está todo certificado)');
      if (esEdicion) return ControlObraService.editarCertificado(cert._id, empresaId, lineas);
      const nuevo = await ControlObraService.crearCertificado(obra._id, { empresa_id: empresaId, lineas });
      if (autoAprobar && nuevo?._id) {
        await ControlObraService.enviarCertificado(nuevo._id, empresaId);
        await ControlObraService.aprobarCertificado(nuevo._id, empresaId);
      }
      return nuevo;
    },
    onSuccess: onCreated,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const titulo = esEdicion ? `Editar certificado #${cert.numero}` : (autoAprobar ? 'Certificar avance' : 'Nuevo certificado de avance');
  const subtitulo = esEdicion ? 'Ajustá el % a certificar por sub-rubro.'
    : (autoAprobar ? 'Certificás el avance al cliente: genera la cuota a cobrar e impacta de inmediato.' : 'Indicá el nuevo % de avance acumulado por sub-rubro.');

  return (
    <FormDrawer
      open={open} onClose={onClose} title={titulo} subtitle={subtitulo} width={480}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={() => { setError(null); guardar.mutate(); }} disabled={guardar.isPending}>{esEdicion ? 'Guardar' : (autoAprobar ? 'Certificar' : 'Crear')}</Button>
        </>
      )}
    >
      {avisos.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>Se solapa con otros certificados pendientes</Typography>
          {avisos.map(({ cert: c, rel }) => (
            <Typography key={c._id} variant="caption" display="block">
              #{c.numero} ({c.estado}) — {rel}
            </Typography>
          ))}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {subrubros.map((s) => {
          const enOtros = (porSubrubro[s.uid] || []);
          const tocado = Number(valores[s.uid]) > (s.cert_pct || 0);
          return (
            <Stack key={s.uid} direction="row" spacing={2} alignItems="flex-start">
              <Box flex={1}>
                <Typography variant="body2">{s.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">{s.rubro} · certificado {s.cert_pct || 0}% · físico {s.avance_pct}%</Typography>
                {tocado && enOtros.length > 0 && (
                  <Typography variant="caption" color="warning.main" display="block">⚠ ya está en {enOtros.map((c) => `#${c.numero}`).join(', ')}</Typography>
                )}
              </Box>
              <TextField
                size="small" type="number" label="Certificar %"
                value={valores[s.uid] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [s.uid]: e.target.value }))}
                sx={{ width: 120 }}
                inputProps={{ min: s.cert_pct || 0, max: 100 }}
              />
            </Stack>
          );
        })}
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
