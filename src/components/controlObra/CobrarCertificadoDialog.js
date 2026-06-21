import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const hoyInput = () => new Date().toISOString().slice(0, 10);

// Registra el cobro de un certificado aprobado: monto (total o parcial) + fecha.
// Genera el ingreso en la caja. Muestra carga y errores explícitos.
export default function CobrarCertificadoDialog({ open, onClose, cert, empresaId, onDone }) {
  const pendiente = cert?.cobro?.pendiente ?? cert?.desglose?.neto ?? cert?.monto_total ?? 0;
  const [monto, setMonto] = useState(String(pendiente));
  const [fecha, setFecha] = useState(hoyInput());
  const [error, setError] = useState(null);

  const cobrar = useMutation({
    mutationFn: () => {
      const m = Number(monto);
      if (!Number.isFinite(m) || m <= 0) throw new Error('El monto debe ser mayor a 0');
      if (m > pendiente + 0.01) throw new Error(`El monto no puede superar el pendiente (${fmt(pendiente)})`);
      // monto_parcial = null cuando se cobra el total (deja que el backend tome el restante exacto).
      const parcial = Math.abs(m - pendiente) < 0.01 ? null : m;
      return ControlObraService.cobrarCertificado(cert._id, empresaId, parcial, fecha || null);
    },
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  return (
    <FormDrawer
      open={open} onClose={onClose} title={`Cobrar certificado #${cert?.numero}`}
      subtitle={`Pendiente de cobro: ${fmt(pendiente)}. Genera el ingreso en la caja.`}
      actions={(
        <>
          <Button onClick={onClose} disabled={cobrar.isPending}>Cancelar</Button>
          <Button variant="contained" onClick={() => { setError(null); cobrar.mutate(); }} disabled={cobrar.isPending}>
            {cobrar.isPending ? 'Cobrando…' : 'Registrar cobro'}
          </Button>
        </>
      )}
    >
      <Stack spacing={2}>
        <TextField
          label="Monto a cobrar" type="number" size="small" value={monto}
          onChange={(e) => setMonto(e.target.value)} fullWidth
          helperText="Dejalo en el total para cobro completo, o bajalo para un cobro parcial."
        />
        <TextField
          label="Fecha de cobro" type="date" size="small" value={fecha}
          onChange={(e) => setFecha(e.target.value)} fullWidth InputLabelProps={{ shrink: true }}
        />
        {cert?.cobro?.monto_cobrado > 0 && (
          <Typography variant="caption" color="text.secondary">Ya cobrado: {fmt(cert.cobro.monto_cobrado)} de {fmt(cert.cobro.monto)}.</Typography>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </FormDrawer>
  );
}
