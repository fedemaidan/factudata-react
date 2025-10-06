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
      // Día con licencia (se ignoran excel/partes)
      {
        id: 1,
        fecha: '01/10/2025',
        licencia: { tipo: 'Enfermedad', observacion: 'Sin adjunto' },
        excel: null,
        partes: [],
      },
      // Día presente con Excel y Parte (ok)
      {
        id: 2,
        fecha: '02/10/2025',
        licencia: null,
        excel: { inicio: '07:00', fin: '15:00', horas: 8 },
        partes: [ { tipo: 'Normal', horas: 8 } ],
      },
      // Día presente con Excel y Parte (mismatch)
      {
        id: 3,
        fecha: '03/10/2025',
        licencia: null,
        excel: { inicio: '07:00', fin: '20:00', horas: 13 },
        partes: [ { tipo: 'Normal', horas: 8 }, { tipo: '100%', horas: 4 } ], // total 12 vs 13
      },
      // Día presente con solo Parte
      {
        id: 4,
        fecha: '04/10/2025',
        licencia: null,
        excel: null,
        partes: [ { tipo: 'Normal', horas: 8 } ],
      },
      // Día presente con solo Excel
      {
        id: 5,
        fecha: '05/10/2025',
        licencia: null,
        excel: { inicio: '08:00', fin: '12:00', horas: 4 },
        partes: [],
      },
    ]
};

const sumPartes = (partes = []) => partes.reduce((acc, p) => acc + (Number(p.horas) || 0), 0);

const parseHM = (s) => {
  if (!s) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const conciliarDia = (row, { toleranciaHoras = 0.5, maxHorasDia = 12 } = {}) => {
  // Si hay licencia, prevalece
  if (row.licencia) {
    return {
      modo: 'licencia',
      estado: 'ok',
      mensajes: [],
      horasExcel: 0,
      horasPartes: 0,
      totalDia: 0
    };
  }

  // Presente: comparar excel vs partes
  const horasExcel = Number(row.excel?.horas || 0);
  const horasPartes = sumPartes(row.partes || []);
  const mensajes = [];

  // Validaciones de Excel si existe
  if (row.excel) {
    const ini = parseHM(row.excel.inicio);
    const fin = parseHM(row.excel.fin);
    if (ini == null || fin == null || fin < ini) {
      mensajes.push('Horario inválido en Excel');
    }
  }

  // Reglas de presencia
  if (!row.excel && (row.partes?.length || 0) === 0) {
    mensajes.push('Sin Excel ni Partes');
  } else {
    if (!row.excel) mensajes.push('Falta Excel');
    if ((row.partes?.length || 0) === 0) mensajes.push('Falta Parte');
  }

  // Mismatch horas (si ambos existen)
  if (row.excel && (row.partes?.length || 0) > 0) {
    const delta = Math.abs(horasExcel - horasPartes);
    if (delta > toleranciaHoras) {
      mensajes.push(`Diferencia de horas: Excel ${horasExcel} vs Partes ${horasPartes}`);
    }
  }

  // Exceso de horas
  const totalDia = Math.max(horasExcel, horasPartes); // referencia para KPI
  if (totalDia > maxHorasDia) mensajes.push(`Más de ${maxHorasDia}h en el día`);

  let estado = 'ok';
  if (mensajes.length > 0) {
    estado = mensajes.some(m => m.toLowerCase().includes('inválido')) ? 'error' : 'warn';
  }

  return {
    modo: 'presente',
    estado,
    mensajes,
    horasExcel,
    horasPartes,
    totalDia
  };
};

const DetalleHorasCell = ({ detalles }) => {
  if (!detalles || detalles.length === 0) return <Typography variant="body2">—</Typography>;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {detalles.map((d, i) => (
        <Chip
          key={i}
          size="small"
          label={`${d.tipo}: ${d.horas}h`}
          color={d.tipo === 'Normal' ? 'default' :
            d.tipo.includes('50') ? 'primary' :
            d.tipo.includes('100') ? 'success' :
            d.tipo === 'Licencia' ? 'warning' : 'default'}
          variant="outlined"
        />
      ))}
    </Stack>
  );
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

  const totalHoras = (detalles = []) =>
  detalles.reduce((acc, d) => acc + (Number(d.horas) || 0), 0);

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
                <TableCell>Licencia</TableCell>
                <TableCell>Excel (entrada–salida–horas)</TableCell>
                <TableCell>Partes (por tipo)</TableCell>
                <TableCell align="right">Total del día</TableCell>
                <TableCell>Advertencias</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
          </TableHead>
          <TableBody>
  {registrosFiltrados.map((r) => {
    const conc = conciliarDia(r); // ← conciliación por fila

    return (
      <TableRow key={r.id} hover>
        {/* Estado */}
        <TableCell width={120}>
          {conc.estado === 'ok' && <Chip size="small" label="OK" color="success" />}
          {conc.estado === 'warn' && <Chip size="small" label="⚠ Advertencia" color="warning" />}
          {conc.estado === 'error' && <Chip size="small" label="✖ Error" color="error" />}
        </TableCell>

        {/* Fecha */}
        <TableCell>{r.fecha}</TableCell>

        {/* Licencia */}
        <TableCell>
          {r.licencia ? (
            <Stack spacing={0.5}>
              <Chip size="small" label={r.licencia.tipo} color="warning" variant="outlined" />
              {r.licencia.observacion && (
                <Typography variant="caption" color="text.secondary">Obs: {r.licencia.observacion}</Typography>
              )}
            </Stack>
          ) : <Typography variant="body2" color="text.secondary">—</Typography>}
        </TableCell>

        {/* Excel */}
        <TableCell>
          {r.excel ? (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={`Inicio: ${r.excel.inicio}`} />
              <Chip size="small" label={`Fin: ${r.excel.fin}`} />
              <Chip size="small" color="primary" label={`Horas: ${r.excel.horas}`} />
            </Stack>
          ) : <Typography variant="body2" color="text.secondary">—</Typography>}
        </TableCell>

        {/* Partes (por tipo) */}
        <TableCell>
          {(r.partes && r.partes.length) ? (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {r.partes.map((p, i) => (
                <Chip
                  key={i}
                  size="small"
                  label={`${p.tipo}: ${p.horas}h`}
                  variant="outlined"
                  color={
                    p.tipo === 'Normal' ? 'default' :
                    p.tipo.includes('50') ? 'primary' :
                    p.tipo.includes('100%') ? 'success' : 'default'
                  }
                />
              ))}
              <Chip size="small" label={`Total Partes: ${sumPartes(r.partes)}h`} />
            </Stack>
          ) : <Typography variant="body2" color="text.secondary">—</Typography>}
        </TableCell>

        {/* Total del día (ref) */}
        <TableCell align="right"><strong>{conc.totalDia} h</strong></TableCell>

        {/* Advertencias/Mensajes */}
        <TableCell>
          {conc.mensajes.length
            ? <Stack spacing={0.5}>{conc.mensajes.map((m, i) => <Typography key={i} variant="body2" color="text.secondary">• {m}</Typography>)}</Stack>
            : <Typography variant="body2" color="text.secondary">—</Typography>}
        </TableCell>

        {/* Acciones */}
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {conc.estado !== 'ok' && (
              <Tooltip title="Resolver diferencia">
                <Button size="small" variant={conc.estado === 'error' ? 'contained' : 'outlined'} color={conc.estado === 'error' ? 'error' : 'warning'}>
                  Resolver
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Editar">
              <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Adjuntar documento">
              <IconButton size="small"><NoteAddIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>
    );
  })}
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
