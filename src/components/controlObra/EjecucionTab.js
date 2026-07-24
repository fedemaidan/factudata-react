import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import ImputarGastoDialog from 'src/components/controlObra/ImputarGastoDialog';
import ReimputarMasivaDialog from 'src/components/controlObra/ReimputarMasivaDialog';
import SubrubroDetalleDrawer from 'src/components/controlObra/SubrubroDetalleDrawer';
import RubroAccionesMenu from 'src/components/controlObra/RubroAccionesMenu';
import ArmadoCertificadoDrawer from 'src/components/controlObra/ArmadoCertificadoDrawer';
import AuditoriaDrawer from 'src/components/controlObra/AuditoriaDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { fmt, fmtMoneda, MonedaChip, esMonedaNativa, valorizarPesos } from 'src/components/controlObra/ui';

const margenColor = (m) => (m >= 0 ? 'success.main' : 'error.main');
const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—');

// Grilla de Ejecución: contrato / avance / certificado / gastado / margen por sub-rubro.
export default function EjecucionTab({ obra, ejec, empresaId }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [masiva, setMasiva] = useState(false);
  const [estimar, setEstimar] = useState(false);
  const [armado, setArmado] = useState(false);
  const [audit, setAudit] = useState(false);
  const [nuevoRubro, setNuevoRubro] = useState(false);
  const [detalleUid, setDetalleUid] = useState(null);
  const [rubroMenu, setRubroMenu] = useState({ anchorEl: null, rubro: null });
  // El detalle se re-deriva de la ejecución en cada render para reflejar ediciones.
  const detalleSub = detalleUid
    ? (ejec?.rubros || []).flatMap((r) => r.subrubros || []).find((x) => x.uid === detalleUid)
    : null;
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
            <Button size="small" variant="outlined" onClick={() => setEstimar(true)}>Estimar costos</Button>
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
              <TableCell align="right" title="Costo estimado → contratado del proveedor (el firme manda)">Costo est/contr</TableCell>
              <TableCell align="right">Gastado</TableCell>
              <TableCell align="right">Margen esperado</TableCell>
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
                  <TableCell />
                  <TableCell align="right">{fmt(rGastado)}</TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ py: 0 }}>
                    <IconButton size="small" onClick={(e) => setRubroMenu({ anchorEl: e.currentTarget, rubro: r })}><MoreVertIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>,
                ...(r.subrubros || []).map((s) => (
                  <TableRow key={s.uid} hover sx={{ cursor: 'pointer' }} onClick={() => setDetalleUid(s.uid)}>
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
                    <TableCell align="right">
                      {esMonedaNativa(s.moneda_info)
                        ? (
                          <Tooltip title={`≈ ${fmt(valorizarPesos(s.contrato, s.moneda_info))} (valorizado)`} arrow>
                            <span>{fmtMoneda(s.contrato, s.moneda_info)}<MonedaChip info={s.moneda_info} /></span>
                          </Tooltip>
                        )
                        : fmt(s.contrato)}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={Math.min(s.avance_pct, 100)} sx={{ height: 6, borderRadius: 3 }} /></Box>
                        <Typography variant="caption" sx={{ minWidth: 72, textAlign: 'right' }}>{s.avance_pct}%{(s.cert_pct || 0) < s.avance_pct ? ` · cert ${s.cert_pct || 0}%` : ''}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{fmt(s.certificado)}</TableCell>
                    <CostoCell s={s} />
                    <TableCell align="right" sx={s.sobrecosto ? { color: 'error.main', fontWeight: 600 } : undefined}>{fmt(s.gastado)}</TableCell>
                    <TableCell align="right" sx={{ color: s.margen_esperado != null ? margenColor(s.margen_esperado) : undefined, fontWeight: 500 }}>
                      {s.margen_esperado != null ? fmt(s.margen_esperado) : '—'}
                    </TableCell>
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
              <TableCell align="right" title="Costo de referencia (contratado o estimado)">{t.costo_ref != null ? fmt(t.costo_ref) : '—'}</TableCell>
              <TableCell align="right">{fmt(t.gastado)}</TableCell>
              <TableCell align="right" sx={{ color: t.margen_esperado != null ? margenColor(t.margen_esperado) : undefined }}>{t.margen_esperado != null ? fmt(t.margen_esperado) : '—'}</TableCell>
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

      {detalleSub && (
        <SubrubroDetalleDrawer
          obra={obra}
          subrubro={detalleSub}
          empresaId={empresaId}
          onClose={() => setDetalleUid(null)}
        />
      )}

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

      <EstimarCostosDialog open={estimar} onClose={() => setEstimar(false)} obra={obra} empresaId={empresaId} onDone={() => { setEstimar(false); qc.invalidateQueries({ queryKey: ['control-obra'] }); }} />
    </Card>
  );
}

// Celda de costo de la tarea. Muestra el costo de referencia total (parte proveedor
// + parte directa/materiales) y, debajo, la composición: si hay costo directo lo
// desglosa "prov X + dir Y"; si no, cae al detalle estimado/contratado (feedback #1).
function CostoCell({ s }) {
  const total = s.costo_ref;
  if (total == null) return <TableCell align="right">—</TableCell>;
  const estimado = s.costo_estimado;
  const contratado = s.contrato_proveedor ? s.contrato_proveedor.monto : null;
  const directo = s.costo_directo;
  const soloEstimado = contratado == null && directo == null; // todo estimado (blando)
  const ambos = contratado != null && estimado != null && contratado !== estimado;
  const delta = ambos ? contratado - estimado : 0;
  let caption = null;
  let captionColor = 'text.secondary';
  if (directo != null) {
    caption = `prov ${fmt(s.costo_proveedor || 0)} + dir ${fmt(directo)}`;
  } else if (ambos) {
    caption = `est. ${fmt(estimado)} · ${delta > 0 ? '+' : ''}${fmt(delta)}`;
    captionColor = delta > 0 ? 'error.main' : 'success.main';
  } else {
    caption = contratado != null ? 'contratado' : 'estimado';
  }
  const cInfo = s.costo_moneda_info;
  const nativa = esMonedaNativa(cInfo);
  return (
    <TableCell align="right">
      <Tooltip title={nativa ? `≈ ${fmt(valorizarPesos(total, cInfo))} (valorizado)` : ''} arrow disableHoverListener={!nativa}>
        <Typography variant="body2" component="span" sx={{ fontStyle: soloEstimado ? 'italic' : 'normal' }}>
          {nativa ? fmtMoneda(total, cInfo) : fmt(total)}<MonedaChip info={cInfo} />
        </Typography>
      </Tooltip>
      <Typography variant="caption" display="block" sx={{ color: captionColor }}>{caption}</Typography>
    </TableCell>
  );
}

// Carga masiva de costos estimados desde el contrato (feedback #2), o al revés.
function EstimarCostosDialog({ open, onClose, obra, empresaId, onDone }) {
  const [direccion, setDireccion] = useState('costo_desde_contrato');
  const [pct, setPct] = useState('20');
  const [soloVacios, setSoloVacios] = useState(true);
  const [error, setError] = useState(null);
  const m = useMutation({
    mutationFn: () => ControlObraService.estimarCostos(obra._id, empresaId, { direccion, pct: Number(pct), solo_vacios: soloVacios }),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  const desdeContrato = direccion === 'costo_desde_contrato';
  return (
    <FormDrawer
      open={open} onClose={onClose} title="Estimar costos en masa" width={440}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={m.isPending || pct === '' || Number.isNaN(Number(pct))} onClick={() => { setError(null); m.mutate(); }}>Aplicar</Button>
        </>
      )}
    >
      <Stack spacing={2}>
        <TextField
          select SelectProps={{ native: true }} size="small" label="Dirección"
          value={direccion} onChange={(e) => setDireccion(e.target.value)}
        >
          <option value="costo_desde_contrato">Costo estimado = contrato − %</option>
          <option value="contrato_desde_costo">Contrato = costo estimado + %</option>
        </TextField>
        <TextField
          label={desdeContrato ? 'Margen a descontar del contrato (%)' : 'Markup sobre el costo (%)'}
          type="number" value={pct} onChange={(e) => setPct(e.target.value)} size="small" fullWidth
          inputProps={{ min: 0, step: 1 }}
          helperText={desdeContrato
            ? 'Costo estimado = monto de contrato × (1 − %). Ej: 20% → costo = 80% del contrato.'
            : 'Contrato = costo estimado × (1 + %). Fija el precio al cliente a partir del costo.'}
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => setSoloVacios((v) => !v)}>
          <input type="checkbox" checked={soloVacios} onChange={(e) => setSoloVacios(e.target.checked)} />
          <Typography variant="body2">Solo los que están sin {desdeContrato ? 'costo estimado' : 'contrato'} (no pisar los cargados)</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Se aplica a todos los sub-rubros de la obra. {desdeContrato ? 'No toca los contratos de proveedor ya asignados.' : 'Ajusta el monto de contrato con el cliente y el plan de cobro asociado.'}
        </Typography>
        {error && <Typography color="error" variant="body2">{error}</Typography>}
      </Stack>
    </FormDrawer>
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
