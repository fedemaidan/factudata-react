import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import grupoClienteService from 'src/services/grupoClienteService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

function AsignarGrupoDialog({ open, onClose, onAssign, empresaId, grupos, refreshGrupos }) {
  const [sel, setSel] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mode, setMode] = useState('existente'); // 'existente' | 'nuevo'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setSel(null); setNuevoNombre(''); setMode('existente'); setError(''); }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let grupoId = sel?._id;
      if (mode === 'nuevo') {
        if (!nuevoNombre.trim()) { setError('Ingresá un nombre'); setSaving(false); return; }
        const g = await grupoClienteService.crear(empresaId, { nombre: nuevoNombre.trim() });
        grupoId = g._id;
        await refreshGrupos();
      }
      if (!grupoId) { setError('Elegí un grupo'); setSaving(false); return; }
      await onAssign(grupoId);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || 'Error al asignar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Asignar a un grupo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant={mode === 'existente' ? 'contained' : 'outlined'} onClick={() => setMode('existente')}>
              Grupo existente
            </Button>
            <Button size="small" variant={mode === 'nuevo' ? 'contained' : 'outlined'} onClick={() => setMode('nuevo')}>
              Crear nuevo
            </Button>
          </Stack>
          {mode === 'existente' ? (
            <Autocomplete
              options={grupos}
              getOptionLabel={(o) => o.nombre || ''}
              value={sel}
              onChange={(_, v) => setSel(v)}
              renderInput={(params) => <TextField {...params} label="Grupo" autoFocus />}
            />
          ) : (
            <TextField
              autoFocus
              fullWidth
              label="Nombre del nuevo grupo"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ClienteDetalle({ empresa, clienteId }) {
  const router = useRouter();
  const empresaId = empresa?.id;
  const esCorralon = empresa?.vertical === 'corralon';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [grupos, setGrupos] = useState([]);
  const [grupoInfo, setGrupoInfo] = useState(null); // { grupo, items, total } cuando aplica
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDestino, setTransferDestino] = useState('');
  const [transferMonto, setTransferMonto] = useState('');
  const [transferMotivo, setTransferMotivo] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState('');

  const refreshGrupos = useCallback(async () => {
    if (!esCorralon || !empresaId) return;
    try {
      const list = await grupoClienteService.getByEmpresa(empresaId);
      setGrupos(list || []);
    } catch {}
  }, [empresaId, esCorralon]);

  const fetchData = useCallback(async () => {
    if (!empresaId || !clienteId) return;
    setLoading(true);
    setError('');
    try {
      const cc = await clienteService.getCuentaCorriente(empresaId, clienteId);
      setData(cc);
      if (esCorralon) {
        await refreshGrupos();
        const grupoId = cc?.cliente?.grupo_id;
        if (grupoId) {
          try {
            const ag = await grupoClienteService.getCuentaCorrienteAgregada(empresaId, grupoId);
            setGrupoInfo(ag);
          } catch {
            setGrupoInfo(null);
          }
        } else {
          setGrupoInfo(null);
        }
      }
    } catch {
      setError('Error al cargar la cuenta corriente del cliente');
    } finally {
      setLoading(false);
    }
  }, [empresaId, clienteId, esCorralon, refreshGrupos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (grupoId) => {
    await clienteService.actualizar(empresaId, clienteId, { grupo_id: grupoId });
    await fetchData();
  };

  const handleQuitarGrupo = async () => {
    if (!window.confirm('¿Quitar este cliente del grupo?')) return;
    await clienteService.actualizar(empresaId, clienteId, { grupo_id: null });
    await fetchData();
  };

  // Saldo a favor de esta obra y destinos posibles (otras obras del grupo).
  const itemsGrupo = grupoInfo?.items || [];
  const miItem = itemsGrupo.find((it) => String(it.cliente._id) === String(clienteId));
  const miAFavor = Math.max(0, -(Number(miItem?.saldo) || 0));
  const destinosGrupo = itemsGrupo.filter((it) => String(it.cliente._id) !== String(clienteId));
  const puedeTransferir = miAFavor > 0.005 && destinosGrupo.length > 0;

  const abrirTransfer = () => {
    setTransferDestino('');
    setTransferMonto(String(Math.round(miAFavor * 100) / 100));
    setTransferMotivo('');
    setTransferError('');
    setTransferOpen(true);
  };

  const handleTransferir = async () => {
    const monto = Number(transferMonto);
    if (!transferDestino) { setTransferError('Elegí la obra destino'); return; }
    if (!Number.isFinite(monto) || monto <= 0) { setTransferError('Monto inválido'); return; }
    setTransferBusy(true); setTransferError('');
    try {
      await clienteService.transferirSaldo(empresaId, clienteId, {
        destino_cliente_id: transferDestino,
        monto,
        motivo: transferMotivo || null,
      });
      setTransferOpen(false);
      await fetchData();
    } catch (e) {
      setTransferError(e?.response?.data?.error || e.message);
    } finally {
      setTransferBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const cliente = data?.cliente || {};
  const movimientos = data?.movimientos || [];
  const cobros = data?.cobros || data?.cobros_recibidos || [];
  const saldo = data?.saldo ?? cliente?.saldo ?? 0;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/clientes')}
          >
            Clientes
          </Button>
          <Typography variant="h5" fontWeight={600}>
            {cliente.nombre || 'Cliente'}
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<PaymentsIcon />}
          onClick={() =>
            router.push(`/cobros-cliente/nuevo?cliente=${clienteId}`)
          }
        >
          Registrar cobro
        </Button>
      </Stack>

      {esCorralon && grupoInfo?.grupo && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: grupoInfo.grupo.color ? `4px solid ${grupoInfo.grupo.color}` : undefined }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <GroupsIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">Pertenece al grupo</Typography>
                <NextLink href={`/grupo-cliente/${grupoInfo.grupo._id}`} passHref legacyBehavior>
                  <a style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {grupoInfo.grupo.nombre}
                    </Typography>
                  </a>
                </NextLink>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">Saldo consolidado del grupo</Typography>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                color={grupoInfo.total > 0.005 ? 'warning.main' : grupoInfo.total < -0.005 ? 'info.main' : 'text.primary'}
              >
                {formatCurrencyWithCode(grupoInfo.total || 0)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {puedeTransferir && (
                <Button size="small" variant="outlined" onClick={abrirTransfer}>
                  Transferir saldo
                </Button>
              )}
              <Button size="small" color="error" onClick={handleQuitarGrupo}>Quitar del grupo</Button>
            </Stack>
          </Stack>
          {grupoInfo.items && grupoInfo.items.length > 1 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Otros clientes del grupo:</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {grupoInfo.items
                  .filter((it) => String(it.cliente._id) !== String(clienteId))
                  .map((it) => (
                    <NextLink key={it.cliente._id} href={`/cliente/${it.cliente._id}`} passHref legacyBehavior>
                      <a style={{ textDecoration: 'none' }}>
                        <Chip
                          size="small"
                          clickable
                          label={`${it.cliente.nombre} · ${formatCurrencyWithCode(it.saldo || 0)}`}
                        />
                      </a>
                    </NextLink>
                  ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      {esCorralon && !grupoInfo?.grupo && (
        <Box sx={{ mb: 2 }}>
          <Button size="small" variant="outlined" startIcon={<GroupsIcon />} onClick={() => setAsignarOpen(true)}>
            Asignar a un grupo
          </Button>
        </Box>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary">
              CUIT
            </Typography>
            <Typography variant="body2">{cliente.cuit || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body2">{cliente.email || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Teléfono
            </Typography>
            <Typography variant="body2">{cliente.telefono || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Saldo neto
            </Typography>
            <Typography
              variant="body1"
              fontWeight={700}
              color={saldo > 0.005 ? 'warning.main' : saldo < -0.005 ? 'info.main' : 'text.primary'}
            >
              {formatCurrencyWithCode(saldo)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Movimientos pendientes
      </Typography>
      <Paper variant="outlined" sx={{ mb: 3 }}>
        {movimientos.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Sin movimientos pendientes.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right">Pendiente</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movimientos.map((m) => (
                <TableRow key={m._id || m.id}>
                  <TableCell>{m.fecha ? formatTimestamp(m.fecha) : '—'}</TableCell>
                  <TableCell>{m.descripcion || m.concepto || '—'}</TableCell>
                  <TableCell align="right">
                    {formatCurrencyWithCode(m.monto || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrencyWithCode(m.pendiente ?? m.monto_pendiente ?? 0)}
                  </TableCell>
                  <TableCell>
                    {m.estado === 'pagado' ? (
                      <Chip size="small" label="Pagado" color="success" variant="outlined" />
                    ) : m.estado === 'parcial' ? (
                      <Chip size="small" label="Parcial" color="warning" />
                    ) : (
                      <Chip size="small" label="Pendiente" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Cobros recibidos
      </Typography>
      <Paper variant="outlined">
        {cobros.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Sin cobros aún.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Método</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cobros.map((c) => (
                <TableRow key={c._id || c.id}>
                  <TableCell>
                    {c.fecha_cobro ? formatTimestamp(c.fecha_cobro) : '—'}
                  </TableCell>
                  <TableCell>{c.metodo || '—'}</TableCell>
                  <TableCell align="right">
                    {formatCurrencyWithCode(c.monto_bruto || 0)}
                  </TableCell>
                  <TableCell>{c.notas || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {esCorralon && (
        <AsignarGrupoDialog
          open={asignarOpen}
          onClose={() => setAsignarOpen(false)}
          onAssign={handleAssign}
          empresaId={empresaId}
          grupos={grupos}
          refreshGrupos={refreshGrupos}
        />
      )}

      <Dialog open={transferOpen} onClose={() => !transferBusy && setTransferOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Transferir saldo a favor</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary">
            Saldo a favor de {cliente.nombre}: <b>{formatCurrencyWithCode(miAFavor)}</b>
          </Typography>
          {transferError && <Alert severity="error" sx={{ my: 1 }}>{transferError}</Alert>}
          <Autocomplete
            sx={{ mt: 2 }}
            options={destinosGrupo}
            getOptionLabel={(it) => `${it.cliente.nombre} · ${formatCurrencyWithCode(it.saldo || 0)}`}
            isOptionEqualToValue={(o, v) => String(o.cliente._id) === String(v.cliente._id)}
            value={destinosGrupo.find((it) => String(it.cliente._id) === String(transferDestino)) || null}
            onChange={(_, v) => setTransferDestino(v ? String(v.cliente._id) : '')}
            renderInput={(params) => <TextField {...params} label="Obra destino *" size="small" />}
          />
          <TextField
            fullWidth size="small" type="number" label="Monto a transferir" sx={{ mt: 2 }}
            value={transferMonto} onChange={(e) => setTransferMonto(e.target.value)}
            inputProps={{ min: 0, max: miAFavor }}
          />
          <TextField
            fullWidth size="small" label="Motivo (opcional)" sx={{ mt: 2 }}
            value={transferMotivo} onChange={(e) => setTransferMotivo(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)} disabled={transferBusy}>Cancelar</Button>
          <Button variant="contained" onClick={handleTransferir} disabled={transferBusy}>
            {transferBusy ? 'Transfiriendo…' : 'Transferir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

const Page = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    getEmpresaDetailsFromUser(user).then(setEmpresa);
  }, [user]);

  return (
    <>
      <Head>
        <title>Cliente</title>
      </Head>
      {empresa && id ? (
        <ClienteDetalle empresa={empresa} clienteId={id} />
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
