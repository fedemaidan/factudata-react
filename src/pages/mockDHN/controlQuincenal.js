import React, { useState } from 'react';
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
  Tabs,
  Tab,
  Typography,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

/**
 * MOCKUP – CONTROL QUINCENAL (con Tabs + KPIs de horas por tipo)
 */

const MOCK = {
  quincena: '2025-10-01 al 2025-10-15',
  dias: [
    { fecha: '01/10/2025', completos: 42, advertencias: 3, errores: 2, licencias: 1, estado: 'ok' },
    { fecha: '02/10/2025', completos: 40, advertencias: 5, errores: 4, licencias: 2, estado: 'warn' },
    { fecha: '03/10/2025', completos: 38, advertencias: 8, errores: 7, licencias: 0, estado: 'error' },
  ],
  trabajadores: [
    { nombre: 'GUTIERREZ JOAQUIN', horas: 88, esperadas: 90, advertencias: 1, errores: 0, licencias: 0, estado: 'ok' },
    { nombre: 'BERON MATIAS', horas: 92, esperadas: 90, advertencias: 2, errores: 0, licencias: 0, estado: 'warn' },
    { nombre: 'JIMENEZ JUAN', horas: 60, esperadas: 90, advertencias: 0, errores: 3, licencias: 0, estado: 'error' },
  ],
  trabajadorPorDia: [
    { fecha: '01/10/2025', trabajador: 'GUTIERREZ JOAQUIN', normales: 8, adicionales: 0, licencias: 0, errores: 0, estado: 'ok' },
    { fecha: '01/10/2025', trabajador: 'BERON MATIAS', normales: 8, adicionales: 2, licencias: 0, errores: 0, estado: 'warn' },
    { fecha: '01/10/2025', trabajador: 'JIMENEZ JUAN', normales: 0, adicionales: 0, licencias: 0, errores: 8, estado: 'error' },
    { fecha: '02/10/2025', trabajador: 'GUTIERREZ JOAQUIN', normales: 8, adicionales: 0, licencias: 0, errores: 0, estado: 'ok' },
    { fecha: '02/10/2025', trabajador: 'BERON MATIAS', normales: 10, adicionales: 4, licencias: 0, errores: 0, estado: 'warn' },
    { fecha: '02/10/2025', trabajador: 'JIMENEZ JUAN', normales: 0, adicionales: 0, licencias: 0, errores: 8, estado: 'error' },
  ],
  horas: {
    normales: 1200,
    adicionales: 180,
    licencias: 80,
    errores: 50
  }
};

const ControlQuincenalPage = () => {
  const [tab, setTab] = useState('dia');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const descargarExcel = () => setAlert({ open: true, message: 'Descarga simulada (Excel) lista', severity: 'success' });

  return (
    <Box component="main">
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Encabezado */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton><ArrowBackIosNewIcon /></IconButton>
            <Typography variant="h6">Quincena {MOCK.quincena}</Typography>
            <IconButton><ArrowForwardIosIcon /></IconButton>
          </Stack>
          <Button variant="contained" startIcon={<DescriptionIcon />} onClick={descargarExcel}>Exportar Excel</Button>
        </Stack>

        {/* KPIs globales */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<AssignmentIndIcon />} title="Trabajadores" value={MOCK.trabajadores.length} subtitle="En la quincena" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<CheckCircleIcon color="success" />} title="Días completos" value={`1 / ${MOCK.dias.length}`} subtitle="Sin incidencias" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<WarningAmberIcon color="warning" />} title="Días con incidencias" value={`2 / ${MOCK.dias.length}`} subtitle="Con advertencias o errores" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<CancelIcon color="error" />} title="% Trabajadores completos" value="75%" subtitle="Sin faltas ni errores" /></Grid>
        </Grid>

        {/* KPIs horas por tipo */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<AccessTimeIcon />} title="Horas normales" value={MOCK.horas.normales} subtitle="Registradas correctamente" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<AddAlarmIcon />} title="Horas adicionales" value={MOCK.horas.adicionales} subtitle="Extras y feriados" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<BeachAccessIcon />} title="Licencias" value={MOCK.horas.licencias} subtitle="Días no trabajados" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiBox icon={<ErrorOutlineIcon />} title="Horas con errores" value={MOCK.horas.errores} subtitle="Revisar" /></Grid>
        </Grid>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Por Día" value="dia" />
          <Tab label="Por Trabajador" value="trabajador" />
          <Tab label="Por Trabajador por Día" value="trabajadorDia" />
        </Tabs>

        {tab === 'dia' && (
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Completos</TableCell>
                  <TableCell>Advertencias</TableCell>
                  <TableCell>Errores</TableCell>
                  <TableCell>Licencias</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK.dias.map((d, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{d.fecha}</TableCell>
                    <TableCell>{d.completos}</TableCell>
                    <TableCell>{d.advertencias}</TableCell>
                    <TableCell>{d.errores}</TableCell>
                    <TableCell>{d.licencias}</TableCell>
                    <TableCell>{d.estado === 'ok' ? <Chip size="small" label="OK" color="success" /> : d.estado === 'warn' ? <Chip size="small" label="⚠" color="warning" /> : <Chip size="small" label="✖" color="error" />}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalle del día">
                        <Button size="small" variant="outlined" startIcon={<VisibilityIcon />}>Ver detalle</Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {tab === 'trabajador' && (
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Trabajador</TableCell>
                  <TableCell>Horas cargadas</TableCell>
                  <TableCell>Esperadas</TableCell>
                  <TableCell>Advertencias</TableCell>
                  <TableCell>Errores</TableCell>
                  <TableCell>Licencias</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK.trabajadores.map((t, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell>{t.horas}</TableCell>
                    <TableCell>{t.esperadas}</TableCell>
                    <TableCell>{t.advertencias}</TableCell>
                    <TableCell>{t.errores}</TableCell>
                    <TableCell>{t.licencias}</TableCell>
                    <TableCell>{t.estado === 'ok' ? <Chip size="small" label="OK" color="success" /> : t.estado === 'warn' ? <Chip size="small" label="⚠" color="warning" /> : <Chip size="small" label="✖" color="error" />}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalle del trabajador">
                        <Button size="small" variant="outlined" startIcon={<VisibilityIcon />}>Ver detalle</Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {tab === 'trabajadorDia' && (
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Trabajador</TableCell>
                  <TableCell>Horas normales</TableCell>
                  <TableCell>Horas adicionales</TableCell>
                  <TableCell>Licencias</TableCell>
                  <TableCell>Horas con errores</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK.trabajadorPorDia.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>{r.trabajador}</TableCell>
                    <TableCell>{r.normales}</TableCell>
                    <TableCell>{r.adicionales}</TableCell>
                    <TableCell>{r.licencias}</TableCell>
                    <TableCell>{r.errores}</TableCell>
                    <TableCell>{r.estado === 'ok' ? <Chip size="small" label="OK" color="success" /> : r.estado === 'warn' ? <Chip size="small" label="⚠" color="warning" /> : <Chip size="small" label="✖" color="error" />}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalle">
                        <Button size="small" variant="outlined" startIcon={<VisibilityIcon />}>Ver detalle</Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

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

ControlQuincenalPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default ControlQuincenalPage;