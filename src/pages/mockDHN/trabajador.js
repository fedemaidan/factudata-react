import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
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
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

/**
 * MOCKUP – VISTA POR TRABAJADOR
 * - Pensado para pruebas con cliente.
 * - Incluye cabecera con datos del trabajador, KPIs, filtros simples y tabla por día con incidencias.
 */

const MOCK = {
  trabajador: {
    nombre: 'GUTIERREZ JOAQUIN',
    dni: '32.451.778',
    legajo: 'LG-1042',
    obra: 'OBRA A – Planta Norte',
    categoria: 'Of. Especializado',
  },
  resumen: {
    horasNormales: 88,
    horasAdicionales: 14,
    licencias: 2,
    advertencias: 3,
    errores: 1
  },
  registros: [
    { id: 1, fecha: '01/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 2, fecha: '02/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 3, fecha: '03/10/2025', tipo: 'Adicional 100%', horas: 14, obs: 'Turno extendido', estado: 'warn', nota: '>12h' },
    { id: 4, fecha: '04/10/2025', tipo: 'Licencia', horas: 0, obs: 'Enfermedad (sin adjunto)', estado: 'warn', nota: 'Falta documento' },
    { id: 5, fecha: '05/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 6, fecha: '06/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 7, fecha: '07/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 8, fecha: '08/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 9, fecha: '09/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 10, fecha: '10/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 11, fecha: '11/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 12, fecha: '12/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 13, fecha: '13/10/2025', tipo: 'Normal', horas: 10, obs: 'Superposición parcial con parte', estado: 'warn', nota: 'Chequear' },
    { id: 14, fecha: '14/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 15, fecha: '15/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 16, fecha: '16/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 17, fecha: '17/10/2025', tipo: 'Normal', horas: 8, obs: '', estado: 'ok' },
    { id: 18, fecha: '18/10/2025', tipo: '—', horas: 0, obs: 'Registro con fecha inválida', estado: 'error', nota: 'Fecha fuera de período' },
  ]
};

const VistaTrabajadorPage = () => {
  const [tab, setTab] = useState('lista');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [desde, setDesde] = useState('2025-10-01');
  const [hasta, setHasta] = useState('2025-10-18');

  const registrosFiltrados = useMemo(() => {
    return MOCK.registros.filter(r => {
      const okEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      const d = new Date(r.fecha.split('/').reverse().join('-')); // dd/mm/yyyy → yyyy-mm-dd
      const min = new Date(desde);
      const max = new Date(hasta);
      return okEstado && d >= min && d <= max;
    });
  }, [filtroEstado, desde, hasta]);

  const descargar = (tipo) => setAlert({ open: true, message: `Descarga simulada (${tipo}) lista`, severity: 'success' });

  return (
    <Box component="main">
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Encabezado del trabajador */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>{MOCK.trabajador.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">DNI {MOCK.trabajador.dni} • Legajo {MOCK.trabajador.legajo}</Typography>
              <Typography variant="body2" color="text.secondary">{MOCK.trabajador.obra} • {MOCK.trabajador.categoria}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => descargar('Excel')}>Excel</Button>
            </Stack>
          </Stack>
        </Paper>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={6} md={3}><KpiBox title="Horas normales" value={MOCK.resumen.horasNormales} icon={<CheckCircleIcon color="success" />} /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox title="Horas adicionales" value={MOCK.resumen.horasAdicionales} icon={<AssignmentTurnedInIcon color="primary" />} /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox title="Licencias" value={MOCK.resumen.licencias} icon={<NoteAddIcon color="action" />} /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox title="Incidencias" value={`${MOCK.resumen.advertencias} ⚠  / ${MOCK.resumen.errores} ✖`} icon={<ErrorOutlineIcon color="error" />} /></Grid>
        </Grid>

        {/* Filtros */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterListIcon fontSize="small" />
              <Typography variant="subtitle2">Filtros</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flex={1}>
              <TextField type="date" label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField type="date" label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
              <Select size="small" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} fullWidth>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ok">Correctos</MenuItem>
                <MenuItem value="warn">Advertencias</MenuItem>
                <MenuItem value="error">Errores</MenuItem>
              </Select>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined">Limpiar</Button>
              <Button variant="contained">Aplicar</Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Tabla */}
        <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Horas</TableCell>
                <TableCell>Observación</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {registrosFiltrados.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell width={110}>
                    {r.estado === 'ok' && <Chip size="small" label="OK" color="success" />}
                    {r.estado === 'warn' && <Chip size="small" label="⚠ Advertencia" color="warning" />}
                    {r.estado === 'error' && <Chip size="small" label="✖ Error" color="error" />}
                  </TableCell>
                  <TableCell>{r.fecha}</TableCell>
                  <TableCell>{r.tipo}</TableCell>
                  <TableCell>{r.horas}</TableCell>
                  <TableCell>{r.obs}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {r.estado !== 'ok' && (
                        <Tooltip title="Resolver incidencia">
                          <Button size="small" variant={r.estado === 'error' ? 'contained' : 'outlined'} color={r.estado === 'error' ? 'error' : 'warning'}>
                            Resolver
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title="Editar horas/observación">
                        <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Agregar/adjuntar documento">
                        <IconButton size="small"><NoteAddIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Pie de página */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />}>Descargar periodo (Excel)</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>Generar PDF</Button>
        </Stack>

        <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} variant="filled">
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

const KpiBox = ({ title, value, icon }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Stack direction="row" spacing={2} alignItems="center">
      {icon}
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        <Typography variant="h6" fontWeight={800}>{value}</Typography>
      </Box>
    </Stack>
  </Paper>
);

VistaTrabajadorPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default VistaTrabajadorPage;
