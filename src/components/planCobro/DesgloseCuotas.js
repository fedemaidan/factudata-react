import { Box, Button, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { totalPorTrack, claveDeFila } from 'src/utils/planCobro/cashflowDetalle';

// 'YYYY-MM-DD' → '3 ago 26'. Sin `new Date()`: el string ya viene normalizado del
// backend y parsearlo como UTC retrocedería un día en AR.
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]} ${y.slice(2)}`; };
const fmtMoney = (n, track = 'ARS') => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: track === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });

const estadoChip = (e) => (e === 'vencida' ? <Chip size="small" label="Vencida" color="error" />
  : e === 'cobrada' ? <Chip size="small" label="Cobrada" color="success" />
    : e === 'cobrada_parcial' ? <Chip size="small" label="Parcial" color="warning" />
      : <Chip size="small" label="Pendiente" variant="outlined" />);

/**
 * Las cuotas que componen un número del Cash Flow. El total del pie es la suma de
 * las filas que se están mostrando, así que coincide con la celda de la que se abrió
 * (el backend las etiquetó con el mismo bucket que usó para el agregado).
 *
 * @param {Array}    filas    filas del `detalle` ya filtradas por quien lo usa
 * @param {string}   tipo     'esperado' | 'cobrado' — decide si se muestra la fecha de cobro
 * @param {string}   track    'ARS' | 'USD' — el track del que se muestra el total
 * @param {string}   titulo   qué se está desglosando
 * @param {function} onCobrar recibe la fila; si no se pasa, no hay columna de acciones
 */
export default function DesgloseCuotas({ filas, tipo, track, titulo, onCobrar }) {
  const total = totalPorTrack(filas);
  const conFechaCobro = tipo === 'cobrado';
  const conAcciones = typeof onCobrar === 'function';

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {titulo} · {filas.length} cuota{filas.length === 1 ? '' : 's'}
      </Typography>
      {filas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Sin cuotas en este período.</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Obra</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Cuota</TableCell>
                <TableCell>Vence</TableCell>
                {conFechaCobro && <TableCell>Cobrada</TableCell>}
                <TableCell align="right">Monto</TableCell>
                <TableCell>Estado</TableCell>
                {conAcciones && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((r) => (
                <TableRow key={claveDeFila(r)}>
                  <TableCell>{r.proyecto_nombre || '—'}</TableCell>
                  <TableCell>{r.cliente_nombre || '—'}</TableCell>
                  <TableCell>{r.plan_nombre ? `${r.plan_nombre} · ` : ''}Cuota {r.numero}</TableCell>
                  <TableCell>{fechaCorta(r.fecha_vencimiento)}</TableCell>
                  {conFechaCobro && <TableCell>{fechaCorta(r.fecha_cobrado)}</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtMoney(r.monto, r.track)}</TableCell>
                  <TableCell>{estadoChip(r.estado)}</TableCell>
                  {conAcciones && (
                    <TableCell align="right">
                      {r.estado !== 'cobrada' && (
                        <Button size="small" variant="contained" onClick={() => onCobrar(r)}>Cobrar</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={conFechaCobro ? 5 : 4} sx={{ fontWeight: 700 }}>Total del desglose</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtMoney(total[track], track)}</TableCell>
                <TableCell colSpan={conAcciones ? 2 : 1} />
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
