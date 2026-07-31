import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatCurrency, formatNumberInput, parseNumberInput } from 'src/utils/formatters';
import planCobroService from 'src/services/planCobroService';
import {
  montoCalculadoDeCuota,
  importeDelCobro,
  diferenciaAceptadaPreview,
  importeDifiereDelRestante,
} from 'src/utils/planCobro/cobroCuota';

const hoyISO = () => new Date().toISOString().split('T')[0];

/**
 * Diálogo de cobro de una cuota de Plan de Cobro. Compartido por el detalle del
 * plan y por la pantalla de cobranzas de control de obra: el diálogo arma el
 * payload y el que lo usa decide contra qué endpoint lo manda (`onConfirm`).
 *
 * @param {object}   cuota          cuota a cobrar (numero, monto_cobrado, fecha_vencimiento)
 * @param {object}   plan           plan de la cuota (define moneda e indexación)
 * @param {number}   montoCalculado monto ya conocido por el padre; se muestra mientras
 *                                  el diálogo resuelve el índice de la fecha de cobro
 * @param {function} onConfirm      recibe el payload del cobro; devuelve una promesa
 */
const CobroCuotaDialog = ({
  open,
  cuota,
  plan = null,
  montoCalculado = null,
  empresaId,
  onClose,
  onConfirm,
}) => {
  // Un plan en 'CAC' se cobra en pesos: el índice es la unidad de cuenta, no la moneda.
  const moneda = plan?.moneda === 'CAC' ? 'ARS' : (plan?.moneda || 'ARS');
  const proyectoId = plan?.proyecto_id || null;
  const [indice, setIndice] = useState({ cac: null, usd: null });
  const [tipoCobro, setTipoCobro] = useState('total'); // 'total' | 'parcial'
  const [montoParcial, setMontoParcial] = useState('');
  const [modoCobro, setModoCobro] = useState('nuevo'); // 'nuevo' | 'vincular' | 'solo_estado'
  // Fecha efectiva de cobro (TAR-442): default hoy, editable para cobros históricos.
  const [fechaCobro, setFechaCobro] = useState(hoyISO());
  const [movVinculables, setMovVinculables] = useState([]);
  const [movSel, setMovSel] = useState(null);
  const [cobroTotalConfirmado, setCobroTotalConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Cada apertura arranca limpia y precarga los ingresos por si se elige "vincular".
  useEffect(() => {
    if (!open) return;
    setTipoCobro('total');
    setMontoParcial('');
    setModoCobro('nuevo');
    setFechaCobro(hoyISO());
    setMovSel(null);
    setCobroTotalConfirmado(false);
    setEnviando(false);
    if (!empresaId) { setMovVinculables([]); return; }
    planCobroService.listarMovimientosVinculables(empresaId, proyectoId)
      .then((res) => setMovVinculables(res?.data?.data || []))
      .catch(() => setMovVinculables([]));
  }, [open, empresaId, proyectoId, cuota?._id]);

  // El monto calculado se toma al índice de la FECHA EFECTIVA de cobro, que es la
  // que usa el backend para valuar la cuota y para el snapshot del cobro total.
  useEffect(() => {
    if (!open || !plan?.indexacion || !fechaCobro) { setIndice({ cac: null, usd: null }); return; }
    let vigente = true;
    const request = plan.indexacion === 'CAC'
      ? planCobroService.previewCAC(fechaCobro, plan.cac_tipo || 'general')
      : planCobroService.previewUSD(fechaCobro, plan.usd_fuente || plan.cotizacion_snapshot?.dolar_fuente || 'blue');
    request
      .then((res) => {
        if (!vigente) return;
        const data = res?.data?.data;
        setIndice({ cac: data?.cac_indice || null, usd: data?.dolar_indice || null });
      })
      .catch(() => { if (vigente) setIndice({ cac: null, usd: null }); });
    return () => { vigente = false; };
  }, [open, fechaCobro, plan?.indexacion, plan?.cac_tipo, plan?.usd_fuente]);

  const indiceResuelto = indice.cac != null || indice.usd != null;
  const montoCuota = (!plan?.indexacion || indiceResuelto || montoCalculado == null)
    ? montoCalculadoDeCuota({ cuota, plan, cacActual: indice.cac, usdActual: indice.usd })
    : Number(montoCalculado) || 0;

  const montoCobradoPrevio = cuota?.monto_cobrado || 0;
  const restante = Math.max(0, montoCuota - montoCobradoPrevio);
  const yaParcial = cuota?.estado === 'cobrada_parcial';

  const importe = importeDelCobro({ modo: modoCobro, tipoCobro, montoParcial, movimiento: movSel, restante });
  const difiere = importeDifiereDelRestante(importe, restante);
  const diferencia = diferenciaAceptadaPreview({ montoCalculado: montoCuota, montoCobradoPrevio, importe });
  const superaRestante = importe > restante + 0.01;

  // El checkbox solo tiene sentido cuando el importe no coincide con el restante.
  const mostrarCheckbox = difiere;
  const totalConfirmado = mostrarCheckbox && cobroTotalConfirmado;

  const faltaImporte = importe <= 0 || (modoCobro === 'vincular' && !movSel);
  const bloqueadoPorTope = superaRestante && !totalConfirmado;

  const handleConfirm = async () => {
    if (faltaImporte || bloqueadoPorTope) return;
    setEnviando(true);
    try {
      await onConfirm({
        fecha_cobrado: fechaCobro || hoyISO(),
        // En "vincular" el importe lo define el movimiento elegido.
        monto_parcial: (modoCobro !== 'vincular' && tipoCobro === 'parcial') ? importe : undefined,
        modo: modoCobro,
        movimiento_id: modoCobro === 'vincular' ? movSel?._id : undefined,
        cobro_total_confirmado: totalConfirmado || undefined,
      });
    } finally {
      setEnviando(false);
    }
  };

  const textoDiferencia = diferencia == null || diferencia === 0
    ? null
    : diferencia > 0
      ? `Se acepta una diferencia de ${formatCurrency(diferencia, moneda)} a favor del cliente.`
      : `Se cobra ${formatCurrency(Math.abs(diferencia), moneda)} por encima del monto calculado.`;

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Registrar cobro</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Cuota #{cuota?.numero} — Monto: <strong>{formatCurrency(montoCuota, moneda)}</strong>
          {cuota?.fecha_vencimiento && (
            <> (Vto: {new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR')})</>
          )}
          {yaParcial && (
            <>
              <br />
              Ya cobrado: <strong>{formatCurrency(montoCobradoPrevio, moneda)}</strong>
              {' '}— Restante: <strong>{formatCurrency(restante, moneda)}</strong>
            </>
          )}
        </DialogContentText>

        <ToggleButtonGroup
          value={tipoCobro}
          exclusive
          onChange={(_, val) => {
            if (val) { setTipoCobro(val); setMontoParcial(''); setCobroTotalConfirmado(false); }
          }}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="total">{yaParcial ? 'Cobrar todo el resto' : 'Cobro total'}</ToggleButton>
          <ToggleButton value="parcial">Pago parcial</ToggleButton>
        </ToggleButtonGroup>

        {tipoCobro === 'parcial' && modoCobro !== 'vincular' && (
          <TextField
            label="Monto a cobrar"
            value={formatNumberInput(montoParcial)}
            onChange={(e) => setMontoParcial(parseNumberInput(e.target.value))}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            error={bloqueadoPorTope}
            helperText={
              bloqueadoPorTope
                ? 'Supera el restante de la cuota: marcá "La cuota queda totalmente pagada" o bajá el importe.'
                : importe > 0
                  ? `Resto después de este pago: ${formatCurrency(Math.max(0, restante - importe), moneda)}`
                  : ''
            }
          />
        )}

        {/* Fecha efectiva de cobro (TAR-442): editable para registrar cobros históricos.
            En modo "vincular" la fecha la define el movimiento ya cargado. */}
        {modoCobro !== 'vincular' && (
          <TextField
            label="Fecha efectiva de cobro"
            type="date"
            value={fechaCobro}
            onChange={(e) => setFechaCobro(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: hoyISO() }}
            helperText="El ingreso en caja se registra con esta fecha. Podés indicar una fecha pasada."
          />
        )}

        {/* Modo: crear ingreso, vincular uno existente, o solo estado */}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          ¿Cómo lo registramos?
        </Typography>
        <ToggleButtonGroup
          value={modoCobro}
          exclusive
          onChange={(_, val) => { if (val) { setModoCobro(val); setMovSel(null); setCobroTotalConfirmado(false); } }}
          size="small"
          sx={{ mt: 0.5, flexWrap: 'wrap' }}
        >
          <ToggleButton value="nuevo">Nuevo ingreso</ToggleButton>
          <ToggleButton value="vincular">Vincular pago existente</ToggleButton>
          <ToggleButton value="solo_estado">Solo marcar</ToggleButton>
        </ToggleButtonGroup>

        {modoCobro === 'vincular' && (
          <Box sx={{ mt: 1.5, maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {movVinculables.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                No hay ingresos sin vincular.
              </Typography>
            ) : movVinculables.map((m) => (
              <Stack
                key={m._id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => { setMovSel(m); setCobroTotalConfirmado(false); }}
                sx={{ px: 1.5, py: 1, cursor: 'pointer', bgcolor: movSel?._id === m._id ? 'primary.50' : 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={movSel?._id === m._id ? 700 : 500}>
                    {m.codigo_operacion ? `#${m.codigo_operacion} · ` : ''}{formatCurrency(m.monto || 0, m.moneda || moneda)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : 's/f'}{m.detalle ? ` · ${m.detalle}` : ''}
                  </Typography>
                </Box>
                {movSel?._id === m._id && <CheckCircleIcon color="primary" fontSize="small" />}
              </Stack>
            ))}
          </Box>
        )}

        {/* Cuota totalmente pagada: saldar la cuota con un importe distinto al calculado. */}
        {mostrarCheckbox && (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={(
                <Checkbox
                  size="small"
                  checked={cobroTotalConfirmado}
                  onChange={(e) => setCobroTotalConfirmado(e.target.checked)}
                />
              )}
              label="La cuota queda totalmente pagada"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              {cobroTotalConfirmado
                ? textoDiferencia || 'La cuota se marcará como cobrada por el importe indicado.'
                : 'Marcalo si este importe salda la cuota aunque no coincida con el monto calculado.'}
            </Typography>
          </Box>
        )}

        {/* En "vincular" no hay campo de monto donde avisar del tope. */}
        {bloqueadoPorTope && modoCobro === 'vincular' && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            El movimiento supera el restante de la cuota: marcá &quot;La cuota queda totalmente pagada&quot; para saldarla con ese importe.
          </Alert>
        )}

        {totalConfirmado && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            La cuota quedará cobrada por {formatCurrency(montoCobradoPrevio + importe, moneda)} y no dejará saldo pendiente.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" mt={2}>
          {modoCobro === 'nuevo'
            ? 'Se registrará un movimiento de caja automáticamente.'
            : modoCobro === 'vincular'
              ? 'Se vinculará el pago ya cargado, sin duplicar el ingreso.'
              : 'Se marcará como cobrada sin generar movimiento de caja.'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          color="success"
          variant="contained"
          onClick={handleConfirm}
          disabled={enviando || faltaImporte || bloqueadoPorTope}
        >
          {modoCobro === 'solo_estado' ? 'Marcar cobrada' : tipoCobro === 'parcial' ? 'Cobrar parcial' : 'Confirmar cobro'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CobroCuotaDialog;
