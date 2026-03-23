import { useCallback, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box, Button, Container, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TableSortLabel, TextField, Typography, Chip, Tooltip, CircularProgress,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import EventService from 'src/services/eventService';

const formatFecha = (val) => {
  if (!val) return '';
  const d = val._seconds ? new Date(val._seconds * 1000) : new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const EventosPage = () => {
  const [phone, setPhone] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir(col === 'created_at' ? 'desc' : 'asc');
    }
  };

  const buscar = useCallback(async () => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await EventService.listar(clean, 500);
      setRows(data || []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortBy === 'created_at') {
        const ta = a.created_at?._seconds || 0;
        const tb = b.created_at?._seconds || 0;
        return (ta - tb) * dir;
      }
      const va = String(a[sortBy] || '').toLowerCase();
      const vb = String(b[sortBy] || '').toLowerCase();
      return va.localeCompare(vb) * dir;
    });
  }, [rows, sortBy, sortDir]);

  const columns = [
    { id: 'created_at', label: 'Fecha' },
    { id: 'event', label: 'Evento' },
    { id: 'phone', label: 'Teléfono' },
    { id: 'email', label: 'Email' },
    { id: 'extra', label: 'Extra' },
  ];

  return (
    <>
      <Head><title>Eventos</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Eventos (Firestore)</Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Número de teléfono (ej: 5491112345678)"
                size="small"
                sx={{ flex: 1, maxWidth: 400 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon /></InputAdornment>
                  ),
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
              />
              <Button
                variant="contained"
                onClick={buscar}
                disabled={loading || !phone.replace(/\D/g, '')}
              >
                {loading ? <CircularProgress size={20} /> : 'Buscar'}
              </Button>
              {searched && (
                <Chip label={`${rows.length} evento${rows.length !== 1 ? 's' : ''}`} size="small" />
              )}
            </Stack>

            <Paper sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns.map(col => (
                      <TableCell key={col.id}>
                        <TableSortLabel
                          active={sortBy === col.id}
                          direction={sortBy === col.id ? sortDir : 'asc'}
                          onClick={() => handleSort(col.id)}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatFecha(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={row.event || '—'} variant="outlined" />
                      </TableCell>
                      <TableCell>{row.phone || ''}</TableCell>
                      <TableCell>{row.email || '—'}</TableCell>
                      <TableCell>
                        {row.extra ? (
                          <Tooltip title={typeof row.extra === 'object' ? JSON.stringify(row.extra) : String(row.extra)}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                              {typeof row.extra === 'object' ? JSON.stringify(row.extra) : String(row.extra)}
                            </Typography>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {searched && !loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          No se encontraron eventos para este teléfono.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {!searched && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                          Ingresá un número de teléfono para buscar sus eventos.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EventosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default EventosPage;
