import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DescriptionIcon from '@mui/icons-material/Description';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

/**
 * MOCKUP – CONTROL DIARIO (actualizado)
 * - Incluye KPIs con % de "Completos" y "Faltantes" sobre el total de trabajadores.
 * - Se eliminó la exportación a PDF (solo Excel).
 */

const MOCK = {
  fecha: '2025-10-05',
  trabajadores: [
    { id: 1, nombre: 'GUTIERREZ JOAQUIN', obra: 'OBRA A', horas: 8, partes: true, licencia: false, estado: 'ok' },
    { id: 2, nombre: 'BERON MATIAS', obra: 'OBRA A', horas: 14, partes: true, licencia: false, estado: 'warn', nota: '>12h' },
    { id: 3, nombre: 'JIMENEZ JUAN', obra: 'OBRA B', horas: 0, partes: false, licencia: false, estado: 'error', nota: 'Sin horas' },
    { id: 4, nombre: 'VELAZQUEZ RUBEN', obra: 'OBRA B', horas: 0, partes: false, licencia: true, estado: 'ok', nota: 'Licencia' },
    { id: 5, nombre: 'TABORDA GASTON', obra: 'OBRA C', horas: 7, partes: true, licencia: false, estado: 'warn', nota: 'Horas menores a esperadas' },
    { id: 6, nombre: 'PEREZ JULIO', obra: 'OBRA C', horas: 8, partes: true, licencia: false, estado: 'ok' },
    { id: 7, nombre: 'DIAZ JORGE', obra: 'OBRA A', horas: 0, partes: true, licencia: false, estado: 'error', nota: 'Parte sin horas' },
  ]
};

const ControlDiarioPage = () => {
  const [fecha, setFecha] = useState(MOCK.fecha);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [filtro, setFiltro] = useState('todos'); // todos | ok | warn | error | sinParte | conLicencia

  const datos = useMemo(() => {
    const total = MOCK.trabajadores.length;
    const ok = MOCK.trabajadores.filter(t => t.estado === 'ok' && !t.licencia && t.horas > 0).length;
    const warn = MOCK.trabajadores.filter(t => t.estado === 'warn').length;
    const error = MOCK.trabajadores.filter(t => t.estado === 'error').length;
    const conParte = MOCK.trabajadores.filter(t => t.partes).length;
    const sinParte = total - conParte;
    const conLicencia = MOCK.trabajadores.filter(t => t.licencia).length;

    const completos = ok + conLicencia; // cubiertos por horas correctas o licencia registrada
    const faltantes = Math.max(0, total - completos);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

    return { total, ok, warn, error, conParte, sinParte, conLicencia, completos, faltantes, completosPct: pct(completos), faltantesPct: pct(faltantes) };
  }, []);

  const filtrados = useMemo(() => {
    return MOCK.trabajadores.filter(t => {
      if (filtro === 'todos') return true;
      if (filtro === 'ok') return t.estado === 'ok' && !t.licencia && t.horas > 0;
      if (filtro === 'warn') return t.estado === 'warn';
      if (filtro === 'error') return t.estado === 'error';
      if (filtro === 'sinParte') return !t.partes && !t.licencia;
      if (filtro === 'conLicencia') return t.licencia;
      return true;
    });
  }, [filtro]);

  const changeDay = (delta) => {
    const d = new Date(fecha);
    d.setDate(d.getDate() + delta);
    setFecha(d.toISOString().slice(0, 10));
  };

  const descargarExcel = () => setAlert({ open: true, message: 'Descarga simulada (Excel) lista', severity: 'success' });

  return (
    <Box component="main">
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Encabezado de fecha */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={() => changeDay(-1)}><ArrowBackIosNewIcon /></IconButton>
            <TextField type="date" label="Día" value={fecha} onChange={(e) => setFecha(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            <IconButton onClick={() => changeDay(1)}><ArrowForwardIosIcon /></IconButton>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />}>Actualizar</Button>
            {/* Sin exportación a PDF */}
            <Button variant="contained" startIcon={<DescriptionIcon />} onClick={descargarExcel}>Exportar Excel</Button>
          </Stack>
        </Stack>

        {/* KPIs con % */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<AssignmentIndIcon color="action" />} title="Trabajadores" value={datos.total} subtitle="Total del día" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<CheckCircleIcon color="success" />} title="Completos" value={`${datos.completos} (${datos.completosPct}%)`} subtitle="Horas OK o con licencia" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<WarningAmberIcon color="warning" />} title="Advertencias" value={datos.warn} subtitle="Revisar" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<CancelIcon color="error" />} title="Faltantes" value={`${datos.faltantes} (${datos.faltantesPct}%)`} subtitle="Sin horas válidas" /></Grid>
        </Grid>

        {/* Filtros rápidos */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`Todos (${datos.total})`} onClick={() => setFiltro('todos')} />
            <Chip color="success" label={`Completos (${datos.completos})`} onClick={() => setFiltro('ok')} />
            <Chip color="warning" label={`Advertencias (${datos.warn})`} onClick={() => setFiltro('warn')} />
            <Chip color="error" label={`Errores (${datos.error})`} onClick={() => setFiltro('error')} />
            <Chip variant="outlined" label={`Sin parte (${datos.sinParte})`} onClick={() => setFiltro('sinParte')} />
            <Chip variant="outlined" label={`Con licencia (${datos.conLicencia})`} onClick={() => setFiltro('conLicencia')} />
          </Stack>
        </Paper>

        {/* Tabla */}
        <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Estado</TableCell>
                <TableCell>Trabajador</TableCell>
                <TableCell>Obra</TableCell>
                <TableCell>Horas</TableCell>
                <TableCell>Nota</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell width={110}>
                    {t.licencia ? <Chip size="small" label="Licencia" /> : (
                      t.estado === 'ok' ? <Chip size="small" label="OK" color="success" /> :
                      t.estado === 'warn' ? <Chip size="small" label="⚠" color="warning" /> :
                      <Chip size="small" label="✖" color="error" />
                    )}
                  </TableCell>
                  <TableCell>{t.nombre}</TableCell>
                  <TableCell>{t.obra}</TableCell>
                  <TableCell>{t.horas}</TableCell>
                  <TableCell>{t.nota || ''}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Ver detalle">
                        <Button size="small" variant="text" startIcon={<VisibilityIcon fontSize="small" />}>Ver</Button>
                      </Tooltip>
                      {(t.estado === 'warn' || t.estado === 'error') && (
                        <Tooltip title="Resolver">
                          <Button size="small" variant={t.estado === 'error' ? 'contained' : 'outlined'} color={t.estado === 'error' ? 'error' : 'warning'} startIcon={<BuildIcon fontSize="small" />}>Resolver</Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} variant="filled">
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

const KpiBox = ({ icon, title, value, subtitle }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Stack direction="row" spacing={2} alignItems="center">
      {icon}
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        <Typography variant="h6" fontWeight={800}>{value}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
  </Paper>
);

ControlDiarioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default ControlDiarioPage;
