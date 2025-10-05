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



const MOCK = {
  fecha: '2025-10-05',
  trabajadores: [
    // Con licencia (ignora Excel/Partes)
    { id: 1, nombre: 'GUTIERREZ JOAQUIN', obra: 'OBRA A',
      licencia: { tipo: 'Enfermedad', observacion: 'Sin adjunto' },
      excel: null, partes: [] },

    // Presente con Excel + Parte (OK)
    { id: 2, nombre: 'BERON MATIAS', obra: 'OBRA A',
      licencia: null,
      excel: { inicio: '07:00', fin: '15:00', horas: 8 },
      partes: [{ tipo: 'Normal', horas: 8 }] },

    // Presente con Excel + Parte (diferencia)
    { id: 3, nombre: 'JIMENEZ JUAN', obra: 'OBRA B',
      licencia: null,
      excel: { inicio: '07:00', fin: '20:00', horas: 13 },
      partes: [{ tipo: 'Normal', horas: 8 }, { tipo: '100%', horas: 4 }] },

    // Solo Parte
    { id: 4, nombre: 'VELAZQUEZ RUBEN', obra: 'OBRA B',
      licencia: null, excel: null,
      partes: [{ tipo: 'Normal', horas: 8 }] },

    // Solo Excel
    { id: 5, nombre: 'TABORDA GASTON', obra: 'OBRA C',
      licencia: null,
      excel: { inicio: '08:00', fin: '12:00', horas: 4 },
      partes: [] },
  ]
};

const sumPartes = (partes = []) => partes.reduce((acc, p) => acc + (Number(p.horas) || 0), 0);

const parseHM = (s) => {
  if (!s) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const conciliarFila = (row, { toleranciaHoras = 0.5, maxHorasDia = 12 } = {}) => {
  // Si hay licencia, prevalece
  if (row.licencia) {
    return {
      modo: 'licencia',
      estado: 'ok',
      mensajes: [],
      horasExcel: 0,
      horasPartes: 0,
      totalRef: 0
    };
  }

  // Presente
  const horasExcel = Number(row.excel?.horas || 0);
  const horasPartes = sumPartes(row.partes || []);
  const mensajes = [];

  // Validaciones Excel
  if (row.excel) {
    const ini = parseHM(row.excel.inicio);
    const fin = parseHM(row.excel.fin);
    if (ini == null || fin == null || fin < ini) mensajes.push('Horario inválido en Excel');
  }

  // Presencia de fuentes
  if (!row.excel && (!row.partes || row.partes.length === 0)) {
    mensajes.push('Sin Excel ni Parte');
  } else {
    if (!row.excel) mensajes.push('Falta Excel');
    if (!row.partes || row.partes.length === 0) mensajes.push('Falta Parte');
  }

  // Diferencia de horas si existen ambas
  if (row.excel && row.partes && row.partes.length > 0) {
    const delta = Math.abs(horasExcel - horasPartes);
    if (delta > toleranciaHoras) {
      mensajes.push(`Diferencia: Excel ${horasExcel}h vs Partes ${horasPartes}h`);
    }
  }

  // Exceso
  const totalRef = Math.max(horasExcel, horasPartes);
  if (totalRef > maxHorasDia) mensajes.push(`Más de ${maxHorasDia}h en el día`);

  let estado = 'ok';
  if (mensajes.length > 0) {
    estado = mensajes.some(m => m.toLowerCase().includes('inválido')) ? 'error' : 'warn';
  }

  return { modo: 'presente', estado, mensajes, horasExcel, horasPartes, totalRef };
};


const ControlDiarioPage = () => {
  const [fecha, setFecha] = useState(MOCK.fecha);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [filtro, setFiltro] = useState('todos'); // todos | ok | warn | error | sinParte | conLicencia

  const datos = useMemo(() => {
    const conc = MOCK.trabajadores.map(t => ({ t, c: conciliarFila(t) }));
    const total = conc.length;
  
    const conLicencia = conc.filter(x => x.c.modo === 'licencia').length;
    const ok = conc.filter(x => x.c.estado === 'ok' && x.c.modo !== 'licencia').length;
    const warn = conc.filter(x => x.c.estado === 'warn').length;
    const error = conc.filter(x => x.c.estado === 'error').length;
  
    // Completos = ok + con licencia
    const completos = ok + conLicencia;
    const faltantes = Math.max(0, total - completos);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  
    // Para filtros rápidos:
    const sinParte = conc.filter(x => x.c.mensajes.includes('Falta Parte')).length;
  
    return {
      total, ok, warn, error, conLicencia, sinParte,
      completos, faltantes,
      completosPct: pct(completos), faltantesPct: pct(faltantes),
      conc // guardo arreglo conciliado para la tabla y filtros
    };
  }, []);
  

  const filtrados = useMemo(() => {
    return datos.conc
      .filter(({ c }) => {
        if (filtro === 'todos') return true;
        if (filtro === 'ok') return c.estado === 'ok' && c.modo !== 'licencia'; // ok trabajando
        if (filtro === 'warn') return c.estado === 'warn';
        if (filtro === 'error') return c.estado === 'error';
        if (filtro === 'sinParte') return c.mensajes.includes('Falta Parte');
        if (filtro === 'conLicencia') return c.modo === 'licencia';
        return true;
      })
      .map(x => x); // { t, c }
  }, [filtro, datos.conc]);
  
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
            <TableCell>Licencia</TableCell>
            <TableCell>Excel (inicio–fin–horas)</TableCell>
            <TableCell>Partes (por tipo)</TableCell>
            <TableCell align="right">Total ref.</TableCell>
            <TableCell>Advertencias</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
  {filtrados.map(({ t, c }) => (
    <TableRow key={t.id} hover>
      {/* Estado */}
      <TableCell width={110}>
        {c.modo === 'licencia'
          ? <Chip size="small" label="Licencia" />
          : c.estado === 'ok'
            ? <Chip size="small" label="OK" color="success" />
            : c.estado === 'warn'
              ? <Chip size="small" label="⚠" color="warning" />
              : <Chip size="small" label="✖" color="error" />
        }
      </TableCell>

      <TableCell>{t.nombre}</TableCell>
      <TableCell>{t.obra}</TableCell>

      {/* Licencia */}
      <TableCell>
        {t.licencia
          ? (
            <Stack spacing={0.5}>
              <Chip size="small" label={t.licencia.tipo} color="warning" variant="outlined" />
              {t.licencia.observacion && (
                <Typography variant="caption" color="text.secondary">Obs: {t.licencia.observacion}</Typography>
              )}
            </Stack>
          )
          : <Typography variant="body2" color="text.secondary">—</Typography>
        }
      </TableCell>

      {/* Excel */}
      <TableCell>
        {t.excel
          ? (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={`Inicio: ${t.excel.inicio}`} />
              <Chip size="small" label={`Fin: ${t.excel.fin}`} />
              <Chip size="small" color="primary" label={`Horas: ${t.excel.horas}`} />
            </Stack>
          )
          : <Typography variant="body2" color="text.secondary">—</Typography>
        }
      </TableCell>

      {/* Partes */}
      <TableCell>
        {t.partes && t.partes.length
          ? (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {t.partes.map((p, i) => (
                <Chip
                  key={i}
                  size="small"
                  label={`${p.tipo}: ${p.horas}h`}
                  variant="outlined"
                  color={
                    p.tipo === 'Normal' ? 'default'
                    : p.tipo.includes('50') ? 'primary'
                    : p.tipo.includes('100') ? 'success'
                    : 'default'
                  }
                />
              ))}
              <Chip size="small" label={`Total Partes: ${sumPartes(t.partes)}h`} />
            </Stack>
          )
          : <Typography variant="body2" color="text.secondary">—</Typography>
        }
      </TableCell>

      {/* Total referencia */}
      <TableCell align="right"><strong>{c.totalRef} h</strong></TableCell>

      {/* Advertencias */}
      <TableCell>
        {c.mensajes.length
          ? <Stack spacing={0.5}>
              {c.mensajes.map((m, i) => (
                <Typography key={i} variant="body2" color="text.secondary">• {m}</Typography>
              ))}
            </Stack>
          : <Typography variant="body2" color="text.secondary">—</Typography>
        }
      </TableCell>

      {/* Acciones */}
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="Ver detalle">
            <Button size="small" variant="text" startIcon={<VisibilityIcon fontSize="small" />}>Ver</Button>
          </Tooltip>
          {c.estado !== 'ok' && c.modo !== 'licencia' && (
            <Tooltip title="Resolver">
              <Button
                size="small"
                variant={c.estado === 'error' ? 'contained' : 'outlined'}
                color={c.estado === 'error' ? 'error' : 'warning'}
                startIcon={<BuildIcon fontSize="small" />}
              >
                Resolver
              </Button>
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
