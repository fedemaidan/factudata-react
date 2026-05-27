/**
 * Nuevo cobro de cliente (vertical corralón).
 *
 * Espejo simplificado de pages/cobros/nuevo.js — sin stepper, una sola pantalla.
 * Aplica:
 *   - Selecciona cliente (precargado vía query param ?cliente=X).
 *   - Lista movimientos pendientes del cliente.
 *   - Permite "auto-imputar" (más viejos primero) o elegir manualmente.
 *   - Crea el cobro vía cobroService.crear → genera ingreso en la caja seleccionada.
 *
 * NO confundir con pages/cobros/nuevo.js (PlanCobro de constructoras).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import cobroService from 'src/services/cobroService';

const METODOS = [
  { value: 'efectivo',       label: 'Efectivo' },
  { value: 'transferencia',  label: 'Transferencia' },
  { value: 'cheque',         label: 'Cheque' },
  { value: 'otro',           label: 'Otro' },
];

function formatMoney(v, moneda = 'ARS') {
  const num = Number(v || 0);
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(num);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function NuevoCobroForm({ empresa, clienteIdInicial }) {
  const router = useRouter();
  const empresaId = empresa._id;

  // Datos del cliente y movimientos pendientes
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(clienteIdInicial || '');
  const [cuentaCorriente, setCuentaCorriente] = useState(null);
  const [loadingCC, setLoadingCC] = useState(false);

  // Datos del cobro
  const [fechaCobro, setFechaCobro] = useState(todayStr());
  const [montoBruto, setMontoBruto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [metodo, setMetodo] = useState('transferencia');
  const [cajaId, setCajaId] = useState('');
  const [nroComprobante, setNroComprobante] = useState('');
  const [notas, setNotas] = useState('');

  // Imputaciones — map de movimiento_id → { checked, monto_imputado }
  const [imputaciones, setImputaciones] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [okMsg, setOkMsg] = useState(null);

  // Cargar lista de clientes
  useEffect(() => {
    clienteService.getByEmpresa(empresaId).then((list) => {
      setClientes(Array.isArray(list) ? list : []);
    }).catch(() => setClientes([]));
  }, [empresaId]);

  // Cargar cuenta corriente cuando hay cliente
  useEffect(() => {
    if (!clienteId) {
      setCuentaCorriente(null);
      setImputaciones({});
      return;
    }
    setLoadingCC(true);
    clienteService.getCuentaCorriente(empresaId, clienteId)
      .then((data) => {
        setCuentaCorriente(data);
        // Reset imputaciones
        const initial = {};
        (data?.movimientos || []).forEach((m) => {
          const pendiente = Math.max(0, (m.total || 0) - (m.monto_pagado || 0));
          if (pendiente > 0.005) {
            initial[m._id] = { checked: false, monto_imputado: pendiente, pendiente };
          }
        });
        setImputaciones(initial);
      })
      .catch(() => setCuentaCorriente(null))
      .finally(() => setLoadingCC(false));
  }, [empresaId, clienteId]);

  const movimientosPendientes = useMemo(() => {
    return (cuentaCorriente?.movimientos || [])
      .filter((m) => Math.max(0, (m.total || 0) - (m.monto_pagado || 0)) > 0.005)
      .sort((a, b) => new Date(a.fecha_factura || a.createdAt) - new Date(b.fecha_factura || b.createdAt));
  }, [cuentaCorriente]);

  const saldoTotal = useMemo(() => {
    return movimientosPendientes.reduce((acc, m) => acc + Math.max(0, (m.total || 0) - (m.monto_pagado || 0)), 0);
  }, [movimientosPendientes]);

  const totalImputado = useMemo(() => {
    return Object.values(imputaciones)
      .filter((i) => i.checked)
      .reduce((acc, i) => acc + Number(i.monto_imputado || 0), 0);
  }, [imputaciones]);

  const montoSinImputar = useMemo(() => {
    return Math.max(0, Number(montoBruto || 0) - totalImputado);
  }, [montoBruto, totalImputado]);

  // Cajas disponibles (cajas_virtuales del modelo Empresa).
  // Fallback: opcion null para Fase 1 del refactor de cajas donde caja_id puede no estar.
  const cajas = useMemo(() => {
    const list = Array.isArray(empresa?.cajas_virtuales) ? empresa.cajas_virtuales : [];
    return list.filter((c) => c && c.nombre);
  }, [empresa]);

  const autoImputar = useCallback(() => {
    const total = Number(montoBruto || 0);
    if (total <= 0 || movimientosPendientes.length === 0) return;
    let remaining = total;
    const next = { ...imputaciones };
    for (const mov of movimientosPendientes) {
      const pendiente = Math.max(0, (mov.total || 0) - (mov.monto_pagado || 0));
      if (pendiente <= 0.005) continue;
      const aplicar = Math.min(remaining, pendiente);
      if (aplicar <= 0) {
        next[mov._id] = { ...(next[mov._id] || {}), checked: false, monto_imputado: pendiente, pendiente };
      } else {
        next[mov._id] = { checked: true, monto_imputado: aplicar, pendiente };
        remaining -= aplicar;
      }
    }
    setImputaciones(next);
  }, [montoBruto, movimientosPendientes, imputaciones]);

  const toggleImputacion = (movId, checked) => {
    setImputaciones((prev) => ({
      ...prev,
      [movId]: { ...(prev[movId] || {}), checked },
    }));
  };

  const cambiarMontoImputacion = (movId, valor) => {
    const num = Number(valor);
    setImputaciones((prev) => ({
      ...prev,
      [movId]: { ...(prev[movId] || {}), monto_imputado: isNaN(num) ? 0 : num },
    }));
  };

  const validar = () => {
    if (!clienteId) return 'Seleccioná un cliente.';
    if (!Number(montoBruto) || Number(montoBruto) <= 0) return 'Ingresá un monto válido.';
    if (totalImputado > Number(montoBruto) + 0.005) {
      return `La suma imputada (${formatMoney(totalImputado, moneda)}) supera el monto bruto (${formatMoney(montoBruto, moneda)}).`;
    }
    // Validar cada imputación contra su pendiente
    for (const [movId, imp] of Object.entries(imputaciones)) {
      if (imp.checked && imp.monto_imputado > (imp.pendiente || 0) + 0.005) {
        return `Una imputación supera el pendiente del movimiento.`;
      }
    }
    return null;
  };

  const submit = async () => {
    const err = validar();
    if (err) { setErrorMsg(err); return; }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        cliente_id: clienteId,
        fecha_cobro: fechaCobro,
        monto_bruto: Number(montoBruto),
        moneda,
        metodo,
        caja_id: cajaId || null,
        nro_comprobante: nroComprobante || null,
        notas: notas || null,
        imputaciones: Object.entries(imputaciones)
          .filter(([, imp]) => imp.checked && Number(imp.monto_imputado) > 0)
          .map(([movimiento_id, imp]) => ({ movimiento_id, monto_imputado: Number(imp.monto_imputado) })),
      };
      const cobro = await cobroService.crear(empresaId, payload);
      setOkMsg(`Cobro registrado. Saldo pendiente del cliente: ${formatMoney(saldoTotal - totalImputado, moneda)}`);
      // Volver al detalle del cliente
      setTimeout(() => {
        router.push(`/cliente/${clienteId}`);
      }, 1200);
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || e.message || 'Error al registrar cobro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => router.back()}><ArrowBackIcon /></IconButton>
        <Typography variant="h5">Nuevo cobro de cliente</Typography>
      </Stack>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Cliente</InputLabel>
              <Select
                label="Cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <MenuItem value=""><em>— Elegir —</em></MenuItem>
                {clientes.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Fecha"
              type="date"
              size="small"
              fullWidth
              value={fechaCobro}
              onChange={(e) => setFechaCobro(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Moneda</InputLabel>
              <Select label="Moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Monto bruto"
              type="number"
              size="small"
              fullWidth
              value={montoBruto}
              onChange={(e) => setMontoBruto(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Método</InputLabel>
              <Select label="Método" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Caja</InputLabel>
              <Select label="Caja" value={cajaId} onChange={(e) => setCajaId(e.target.value)}>
                <MenuItem value=""><em>— Sin caja —</em></MenuItem>
                {cajas.map((c, idx) => (
                  <MenuItem key={idx} value={c.nombre}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Nº de comprobante (opcional)"
              size="small"
              fullWidth
              value={nroComprobante}
              onChange={(e) => setNroComprobante(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Notas (opcional)"
              size="small"
              fullWidth
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6">Imputaciones</Typography>
            <Typography variant="caption" color="text.secondary">
              Pendiente total: {formatMoney(saldoTotal, moneda)} · Imputado: {formatMoney(totalImputado, moneda)} · Sin imputar: {formatMoney(montoSinImputar, moneda)}
            </Typography>
          </Box>
          <Button
            startIcon={<AutorenewIcon />}
            onClick={autoImputar}
            disabled={!montoBruto || movimientosPendientes.length === 0}
          >
            Auto-imputar (más viejos primero)
          </Button>
        </Stack>

        {loadingCC ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : movimientosPendientes.length === 0 ? (
          <Alert severity="info">
            {clienteId ? 'Este cliente no tiene movimientos pendientes.' : 'Seleccioná un cliente para ver pendientes.'}
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Fecha</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Pagado</TableCell>
                <TableCell align="right">Pendiente</TableCell>
                <TableCell align="right">Imputar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movimientosPendientes.map((m) => {
                const imp = imputaciones[m._id] || { checked: false, monto_imputado: 0, pendiente: 0 };
                return (
                  <TableRow key={m._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={!!imp.checked}
                        onChange={(e) => toggleImputacion(m._id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {(m.fecha_factura || m.createdAt) ? new Date(m.fecha_factura || m.createdAt).toLocaleDateString('es-AR') : '-'}
                    </TableCell>
                    <TableCell>{m.descripcion || m.detalle || m.numero_factura || '-'}</TableCell>
                    <TableCell align="right">{formatMoney(m.total, m.moneda || moneda)}</TableCell>
                    <TableCell align="right">{formatMoney(m.monto_pagado || 0, m.moneda || moneda)}</TableCell>
                    <TableCell align="right">{formatMoney(imp.pendiente, m.moneda || moneda)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={imp.monto_imputado}
                        onChange={(e) => cambiarMontoImputacion(m._id, e.target.value)}
                        disabled={!imp.checked}
                        sx={{ width: 120 }}
                        inputProps={{ style: { textAlign: 'right' } }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {errorMsg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}
      {okMsg && <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>{okMsg}</Alert>}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={() => router.back()} disabled={submitting}>Cancelar</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={submit}
          disabled={submitting || !clienteId || !montoBruto}
        >
          {submitting ? <CircularProgress size={20} /> : 'Registrar cobro'}
        </Button>
      </Stack>
    </Container>
  );
}

const Page = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then(setEmpresa);
  }, [user]);

  const clienteInicial = router.query.cliente || '';

  return (
    <>
      <Head>
        <title>Nuevo cobro</title>
      </Head>
      {empresa ? (
        <NuevoCobroForm empresa={empresa} clienteIdInicial={clienteInicial} />
      ) : (
        <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      )}
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
