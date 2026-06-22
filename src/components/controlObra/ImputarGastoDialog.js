import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Autocomplete, Box, Button, Divider, Stack, TextField, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fechaCorta = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '');
const codigoMov = (m) => (m.codigo_operacion != null ? `#${m.codigo_operacion}` : null);
const etiquetaMov = (m) => [codigoMov(m), fmt(m.total), m.nombre_proveedor || m.categoria || 'egreso', m.observacion, fechaCorta(m.fecha_factura)].filter(Boolean).join(' · ');

// Imputa un egreso de la caja a los sub-rubros de la obra (reparto en %).
export default function ImputarGastoDialog({ open, onClose, obra, empresaId, onDone, subrubroUid = null }) {
  const [movId, setMovId] = useState('');
  const [pcts, setPcts] = useState({});
  const [error, setError] = useState(null);

  const subrubros = useMemo(
    () => (obra?.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre }))),
    [obra]
  );

  // Defaultear 100% al sub-rubro elegido (o al único).
  useEffect(() => {
    if (!open) return;
    if (subrubroUid) setPcts({ [subrubroUid]: 100 });
    else if (subrubros.length === 1) setPcts({ [subrubros[0].uid]: 100 });
  }, [open, subrubros, subrubroUid]);

  const candidatosQ = useQuery({
    queryKey: ['control-obra', 'candidatos', obra?._id, empresaId],
    queryFn: () => ControlObraService.egresosCandidatos(obra._id, empresaId),
    enabled: open && !!obra?._id && !!empresaId,
  });

  const sumaPct = Object.values(pcts).reduce((a, v) => a + (Number(v) || 0), 0);

  const imputar = useMutation({
    mutationFn: () => {
      const imputaciones = Object.entries(pcts)
        .filter(([, v]) => Number(v) > 0)
        .map(([subrubro_uid, v]) => ({ subrubro_uid, pct: Number(v) }));
      if (!movId) throw new Error('Elegí un egreso');
      if (Math.round(sumaPct) !== 100) throw new Error('Los % deben sumar 100');
      return ControlObraService.imputarGasto(obra._id, { empresa_id: empresaId, movimiento_id: movId, imputaciones });
    },
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const candidatos = candidatosQ.data || [];

  return (
    <FormDrawer
      open={open} onClose={onClose} title="Imputar gasto a la obra" width={480}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={imputar.isPending || !movId || Math.round(sumaPct) !== 100} onClick={() => { setError(null); imputar.mutate(); }}>
            Imputar
          </Button>
        </>
      )}
    >
      <Autocomplete
        options={candidatos}
        getOptionLabel={etiquetaMov}
        value={candidatos.find((c) => c._id === movId) || null}
        onChange={(_, v) => setMovId(v?._id || '')}
        loading={candidatosQ.isLoading}
        noOptionsText="No hay egresos sin imputar"
        isOptionEqualToValue={(o, v) => o._id === v._id}
        renderOption={(props, m) => (
          <Box component="li" {...props} key={m._id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <span>
              {codigoMov(m) && <strong style={{ color: '#555', marginRight: 6 }}>{codigoMov(m)}</strong>}
              {m.nombre_proveedor || m.categoria || 'egreso'}{m.observacion ? ` · ${m.observacion}` : ''}
            </span>
            <span style={{ whiteSpace: 'nowrap', color: '#888' }}>{fmt(m.total)} · {fechaCorta(m.fecha_factura)}</span>
          </Box>
        )}
        renderInput={(params) => <TextField {...params} label="Buscar egreso a imputar" size="small" placeholder="Proveedor, concepto o monto…" />}
      />

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">Reparto entre sub-rubros (debe sumar 100%)</Typography>
      <Stack spacing={1.5} mt={1}>
        {subrubros.map((s) => (
          <Stack key={s.uid} direction="row" spacing={2} alignItems="center">
            <Box flex={1}>
              <Typography variant="body2">{s.nombre}</Typography>
              <Typography variant="caption" color="text.secondary">{s.rubro}</Typography>
            </Box>
            <TextField
              size="small" type="number" label="%"
              value={pcts[s.uid] ?? ''}
              onChange={(e) => setPcts((p) => ({ ...p, [s.uid]: e.target.value }))}
              sx={{ width: 90 }} inputProps={{ min: 0, max: 100 }}
            />
          </Stack>
        ))}
      </Stack>
      <Typography variant="body2" mt={1} color={Math.round(sumaPct) === 100 ? 'success.main' : 'text.secondary'}>
        Suma: {sumaPct}%
      </Typography>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
