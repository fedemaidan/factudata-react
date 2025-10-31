import Head from 'next/head';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Container, Divider, Grid, IconButton,
  Paper, Stack, TextField, Typography, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Tooltip, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useRouter } from 'next/router';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ticketService from 'src/services/ticketService';
import { formatTimestamp } from 'src/utils/formatters';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ObrasDetails } from 'src/sections/empresa/obrasDetails';

// ---- Helpers ----
const fmtMoney = (currency, amount = 0) =>
  (amount ?? 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'ARS',
    minimumFractionDigits: 2,
  });

const getDayMs = (v) => {
  if (!v) return 0;
  let d;
  if (typeof v === 'number') d = new Date(v);
  else if (typeof v === 'string') d = new Date(v);
  else if (v?.toDate) d = v.toDate();
  else if (v?.seconds) d = new Date(v.seconds * 1000);
  else return 0;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const colorFor = (val) => (val >= 0 ? 'success.main' : 'error.main');

// ==== PAGE ====
const CajaSimplePage = () => {
  const router = useRouter();
  const { user } = useAuthContext();

  // Datos base
  const [empresa, setEmpresa] = useState(null);
  const [proyectoId, setProyectoId] = useState(null);
  const [movsARS, setMovsARS] = useState([]);
  const [movsUSD, setMovsUSD] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  // Filtros
  const [filterObra, setFilterObra] = useState(null);
  const [filterCliente, setFilterCliente] = useState(null);
  const [filterTipo, setFilterTipo] = useState(''); // '', 'ingreso', 'egreso'
  const [filterMoneda, setFilterMoneda] = useState(''); // '', 'ARS', 'USD'
  const [searchText, setSearchText] = useState('');

  // Controles de estadísticas
  const [statsMode, setStatsMode] = useState('obra'); // 'obra' | 'cliente'
  const [statsCurrency, setStatsCurrency] = useState('ARS'); // 'ARS' | 'USD'

  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Opciones (empresa.obras)
  const obraOptions = useMemo(() => {
    const arr = Array.isArray(empresa?.obras) ? empresa.obras : [];
    return arr
      .map(o => o?.nombre || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [empresa]);

  const [openObras, setOpenObras] = useState(false);

    const refreshEmpresa = async () => {
    try {
        const e = await getEmpresaDetailsFromUser(user);
        setEmpresa(e);
    } catch {}
    };


  const clienteOptions = useMemo(() => {
    const arr = Array.isArray(empresa?.obras) ? empresa.obras : [];
    const set = new Set(arr.map(o => (o?.cliente || '').toString().trim()).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [empresa]);

  // Fetch inicial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const e = await getEmpresaDetailsFromUser(user);
        setEmpresa(e);

        const proyectos = await getProyectosByEmpresa(e);
        const proyectosActivos = proyectos.filter(p => p.activo);
        const pid = proyectosActivos?.[0]?.id || null;
        setProyectoId(pid);

        if (pid) {
          const [ars, usd] = await Promise.all([
            ticketService.getMovimientosForProyecto(pid, 'ARS'),
            ticketService.getMovimientosForProyecto(pid, 'USD'),
          ]);
          setMovsARS(Array.isArray(ars) ? ars : []);
          setMovsUSD(Array.isArray(usd) ? usd : []);
        } else {
          setMovsARS([]);
          setMovsUSD([]);
        }
      } catch (err) {
        console.error(err);
        setMovsARS([]);
        setMovsUSD([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleRefresh = async () => {
    if (!proyectoId) return;
    try {
      setReloading(true);
      const [ars, usd] = await Promise.all([
        ticketService.getMovimientosForProyecto(proyectoId, 'ARS'),
        ticketService.getMovimientosForProyecto(proyectoId, 'USD'),
      ]);
      setMovsARS(Array.isArray(ars) ? ars : []);
      setMovsUSD(Array.isArray(usd) ? usd : []);
    } catch (e) {
      console.error(e);
    } finally {
      setReloading(false);
    }
  };

  // Todos los movimientos con moneda
  const allMovs = useMemo(() => {
    const tag = (m, currency) => ({ ...m, moneda: currency || m.moneda });
    return [...movsARS.map(m => tag(m, 'ARS')), ...movsUSD.map(m => tag(m, 'USD'))];
  }, [movsARS, movsUSD]);

  // Aplicar filtros
  const filtered = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return allMovs.filter(m => {
      if (filterMoneda && (m.moneda || '').toUpperCase() !== filterMoneda) return false;
      if (filterTipo && (m.type || '') !== filterTipo) return false;
      if (filterObra && (m.obra || '') !== filterObra) return false;
      if (filterCliente && (m.cliente || '') !== filterCliente) return false;
      if (term) {
        const blob = [
          m.codigo_operacion, m.categoria, m.subcategoria, m.nombre_proveedor,
          m.obra, m.cliente, m.observacion,
        ].map(x => (x || '').toString().toLowerCase()).join(' ');
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [allMovs, filterMoneda, filterTipo, filterObra, filterCliente, searchText]);

  // Orden
  const sorted = useMemo(() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const da = getDayMs(a.fecha_factura);
      const db = getDayMs(b.fecha_factura);
      if (db !== da) return db - da;
      const ca = (a.codigo_operacion || a.codigo || '').toString();
      const cb = (b.codigo_operacion || b.codigo || '').toString();
      return cb.localeCompare(ca, 'es-AR', { numeric: true, sensitivity: 'base' });
    });
  }, [filtered]);

  // Paginación
  const totalRows = sorted.length;
  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    const end = Math.min(totalRows, start + rowsPerPage);
    return sorted.slice(start, end);
  }, [sorted, page, rowsPerPage, totalRows]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
    if (page > maxPage) setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRows, rowsPerPage]);

  const handleChangePage = (_evt, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (evt) => {
    setRowsPerPage(parseInt(evt.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setFilterObra(null);
    setFilterCliente(null);
    setFilterTipo('');
    setFilterMoneda('');
    setSearchText('');
  };

  // Totales (netos) por moneda para el header (sobre filtrados)
  const totals = useMemo(() => {
    const base = { ARS: { ingreso: 0, egreso: 0 }, USD: { ingreso: 0, egreso: 0 } };
    filtered.forEach(m => {
      const cur = (m.moneda || 'ARS').toUpperCase();
      const bucket = base[cur] || (base[cur] = { ingreso: 0, egreso: 0 });
      if (m.type === 'ingreso') bucket.ingreso += m.total || 0;
      else bucket.egreso += m.total || 0;
    });
    return {
      ARS: (base.ARS.ingreso - base.ARS.egreso),
      USD: (base.USD.ingreso - base.USD.egreso),
      detail: base,
    };
  }, [filtered]);

  // Stats (NETO) por obra/cliente
  const obraStats = useMemo(() => {
    const map = new Map();
    filtered.forEach(m => {
      const key = m.obra || '—';
      const cur = (m.moneda || 'ARS').toUpperCase();
      const sign = m.type === 'ingreso' ? 1 : -1;
      if (!map.has(key)) map.set(key, { ARS: 0, USD: 0, count: 0 });
      const it = map.get(key);
      it[cur] += sign * (m.total || 0);
      it.count += 1;
    });
    return [...map.entries()]
      .map(([obra, d]) => ({ obra, ...d }))
      .sort((a, b) => (b.ARS + b.USD) - (a.ARS + a.USD));
  }, [filtered]);

  const clienteStats = useMemo(() => {
    const map = new Map();
    filtered.forEach(m => {
      const key = m.cliente || '—';
      const cur = (m.moneda || 'ARS').toUpperCase();
      const sign = m.type === 'ingreso' ? 1 : -1;
      if (!map.has(key)) map.set(key, { ARS: 0, USD: 0, count: 0 });
      const it = map.get(key);
      it[cur] += sign * (m.total || 0);
      it.count += 1;
    });
    return [...map.entries()]
      .map(([cliente, d]) => ({ cliente, ...d }))
      .sort((a, b) => (b.ARS + b.USD) - (a.ARS + a.USD));
  }, [filtered]);

  // Navegación
  const goNew = () => router.push('/movementFormSimple');
  const goEdit = (mov) => router.push({ pathname: '/movementFormSimple', query: { movimientoId: mov.id } });
  const goGestionObras = () => {
    if (empresa?.id) router.push(`/empresa?empresaId=${empresa.id}&tab=obras`);
    else router.push('/empresa');
  };

  // Fila de movimientos (nuevo orden y código)
  const Row = ({ m }) => {
    const signColor = colorFor(m.type === 'ingreso' ? (m.total || 0) : -(m.total || 0));
    const obraCliente = [m.obra, m.cliente].filter(Boolean).join(' • ') || '—';
    return (
      <TableRow hover onClick={() => goEdit(m)} sx={{ cursor: 'pointer' }}>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatTimestamp(m.fecha_factura, 'DIA/MES/ANO')}
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {m.codigo_operacion || '—'}
        </TableCell>
        <TableCell sx={{ color: signColor, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {fmtMoney((m.moneda || 'ARS').toUpperCase(), m.total)}
        </TableCell>
        <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Tooltip title={obraCliente}><span>{obraCliente}</span></Tooltip>
        </TableCell>
        <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Tooltip title={m.nombre_proveedor || ''}><span>{m.nombre_proveedor || '—'}</span></Tooltip>
        </TableCell>
        <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Tooltip title={m.categoria || ''}><span>{m.categoria || '—'}</span></Tooltip>
        </TableCell>
        <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Tooltip title={m.observacion || ''}><span>{m.observacion || ''}</span></Tooltip>
        </TableCell>
        <TableCell align="center">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); goEdit(m); }}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Head><title>Estado de Caja</title></Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  // dataset y handlers para la tabla de estadísticas
  const statsData = statsMode === 'obra' ? obraStats : clienteStats;
  const statsTitle = statsMode === 'obra' ? 'Obras' : 'Clientes';
  const onStatsClick = (label) => {
    if (statsMode === 'obra') setFilterObra(label === '—' ? '' : label);
    else setFilterCliente(label === '—' ? '' : label);
  };

  return (
    <DashboardLayout>
      <Head><title>Estado de Caja</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
        {/* ── Header: Totales + Filtros ─────────────────────────────── */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Typography variant="body1"><b>Caja</b></Typography>
                <Typography variant="body1" sx={{ color: colorFor(totals.ARS) }}>
                  <b>ARS:</b> {fmtMoney('ARS', totals.ARS)}
                </Typography>
                <Typography variant="body1" sx={{ color: colorFor(totals.USD) }}>
                  <b>USD:</b> {fmtMoney('USD', totals.USD)}
                </Typography>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" startIcon={<AddIcon />} onClick={goNew}>Nuevo movimiento</Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={reloading}>
                {reloading ? 'Actualizando…' : 'Actualizar'}
              </Button>
              <Button variant="text" onClick={() => setOpenObras(true)}>Gestionar obras</Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Filtros */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Autocomplete
              sx={{ minWidth: 220 }}
              options={obraOptions}
              value={filterObra}
              onChange={(_e, v) => setFilterObra(v || null)}
              renderInput={(params) => <TextField {...params} label="Obra" placeholder="Todas" />}
              clearOnEscape
            />
            <Autocomplete
              sx={{ minWidth: 220 }}
              options={clienteOptions}
              value={filterCliente}
              onChange={(_e, v) => setFilterCliente(v || null)}
              renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Todos" />}
              clearOnEscape
            />
            <Autocomplete
              sx={{ minWidth: 180 }}
              options={['ingreso', 'egreso']}
              value={filterTipo || null}
              onChange={(_e, v) => setFilterTipo(v || '')}
              renderInput={(params) => <TextField {...params} label="Tipo" placeholder="Todos" />}
              clearOnEscape
            />
            <Autocomplete
              sx={{ minWidth: 160 }}
              options={['ARS', 'USD']}
              value={filterMoneda || null}
              onChange={(_e, v) => setFilterMoneda(v || '')}
              renderInput={(params) => <TextField {...params} label="Moneda" placeholder="Todas" />}
              clearOnEscape
            />
            <TextField
              sx={{ minWidth: 260, flex: 1 }}
              label="Buscar"
              placeholder="Proveedor, categoría, observación, código…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button startIcon={<FilterAltOffIcon />} onClick={clearFilters}>Quitar filtros</Button>
          </Stack>
        </Paper>

        {/* ── 2 columnas: 30% stats / 70% movimientos ─────────────── */}
        <Grid container spacing={2}>
          {/* Izquierda: 30% — Estadísticas rápidas */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                <TextField
                  label="Ver por"
                  select
                  SelectProps={{ native: true }}
                  value={statsMode}
                  onChange={(e) => setStatsMode(e.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  <option value="obra">Obras</option>
                  <option value="cliente">Clientes</option>
                </TextField>
                <TextField
                  label="Moneda"
                  select
                  SelectProps={{ native: true }}
                  value={statsCurrency}
                  onChange={(e) => setStatsCurrency(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </TextField>
              </Stack>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {statsMode === 'obra' ? '📊 Obras' : '👤 Clientes'}
              </Typography>

              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{statsMode === 'obra' ? 'Obra' : 'Cliente'}</TableCell>
                      <TableCell align="right">{statsCurrency}</TableCell>
                      <TableCell align="center">Movs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statsData.slice(0, 14).map((row) => {
                      const label = statsMode === 'obra' ? row.obra : row.cliente;
                      const value = statsCurrency === 'USD' ? row.USD : row.ARS;
                      return (
                        <TableRow
                          key={label}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => onStatsClick(label)}
                        >
                          <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Tooltip title={label}><span>{label}</span></Tooltip>
                          </TableCell>
                          <TableCell align="right" sx={{ color: colorFor(value), fontWeight: 600 }}>
                            {fmtMoney(statsCurrency, value)}
                          </TableCell>
                          <TableCell align="center"><Chip size="small" label={row.count} /></TableCell>
                        </TableRow>
                      );
                    })}
                    {statsData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary">Sin datos</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Derecha: 70% — Movimientos */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>📋 Movimientos</Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalRows} resultado{totalRows !== 1 ? 's' : ''}
                </Typography>
              </Stack>

              <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Código</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Obra • Cliente</TableCell>
                      <TableCell>Proveedor</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Observación</TableCell>
                      <TableCell align="center">Abrir</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((m) => <Row key={m.id} m={m} />)}
                    {totalRows === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography variant="body2" color="text.secondary">
                            No hay movimientos con estos filtros.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                rowsPerPageOptions={[10, 25, 50, 100]}
                count={totalRows}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página"
              />
            </Paper>
          </Grid>
          <Dialog
  open={openObras}
  onClose={async () => { setOpenObras(false); await refreshEmpresa(); }}
  fullWidth
  maxWidth="md"
>
  <DialogTitle>Gestionar Obras</DialogTitle>
  <DialogContent dividers>
    {/* El componente ya guarda en backend y maneja su propio estado */}
    {empresa && <ObrasDetails empresa={empresa} />}
  </DialogContent>
  <DialogActions>
    <Button
      onClick={async () => { setOpenObras(false); await refreshEmpresa(); }}
      variant="contained"
    >
      Cerrar
    </Button>
  </DialogActions>
</Dialog>

        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default CajaSimplePage;
