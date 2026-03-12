import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Divider,
  Paper,
  Alert,
} from '@mui/material';

// ─── Helpers ──────────────────────────────────────────────────────

const ESTADO_COLORS = {
  activo: 'success',
  onboarding: 'info',
  en_riesgo: 'warning',
  inactivo: 'error',
  churneado: 'error',
};

const ESTADO_LABELS = {
  activo: '✅ Activo',
  onboarding: '📦 Onboarding',
  en_riesgo: '⚠️ En Riesgo',
  inactivo: '💤 Inactivo',
  churneado: '❌ Churneado',
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPercent(v) {
  if (v == null) return '-';
  return `${Math.round(v * 100)}%`;
}

// ─── Header ───────────────────────────────────────────────────────

export const EmpresaHeader = ({ data }) => {
  if (!data) return null;
  const { empresaId, estadoSalud } = data;
  const estado = estadoSalud?.estado || 'sin datos';
  const score = estadoSalud?.metricas?.scoreOnboarding;
  const diasSinUso = estadoSalud?.metricas?.diasSinUso;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
          <Box>
            <Typography variant="h5">{empresaId}</Typography>
            <Typography variant="body2" color="text.secondary">
              Días sin uso: {diasSinUso ?? '-'} • Score onboarding: {formatPercent(score)}
            </Typography>
          </Box>
          <Chip
            label={ESTADO_LABELS[estado] || estado}
            color={ESTADO_COLORS[estado] || 'default'}
            size="medium"
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
EmpresaHeader.propTypes = { data: PropTypes.object };

// ─── Bloque 1: Onboarding ────────────────────────────────────────

export const OnboardingSection = ({ onboarding }) => {
  if (!onboarding) return <Alert severity="info">Sin datos de onboarding</Alert>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>📦 Onboarding</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Score promedio</Typography>
            <Typography variant="h5">{formatPercent(onboarding.scorePromedio)}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Usuarios</Typography>
            <Typography variant="h5">{onboarding.totalUsuarios}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Completados</Typography>
            <Typography variant="h5">{onboarding.completados}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Progreso por módulo</Typography>
        {Object.entries(onboarding.modulosScore || {}).map(([modulo, score]) => (
          <Box key={modulo} sx={{ mb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{modulo}</Typography>
              <Typography variant="body2">{formatPercent(score)}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.round(score * 100)}
              color={score >= 0.7 ? 'success' : score >= 0.4 ? 'warning' : 'error'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};
OnboardingSection.propTypes = { onboarding: PropTypes.object };

// ─── Bloque 2: Tabla de usuarios ─────────────────────────────────

export const UsuariosTable = ({ usuarios }) => {
  if (!usuarios || usuarios.length === 0) return <Alert severity="info">Sin usuarios</Alert>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>👥 Usuarios</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell>Última actividad</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.profileId}>
                  <TableCell>{u.nombre || u.phone || u.profileId}</TableCell>
                  <TableCell>{u.rol || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatPercent(u.scoreGeneral)}
                      size="small"
                      color={u.scoreGeneral >= 0.7 ? 'success' : u.scoreGeneral >= 0.4 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{formatDate(u.ultimaActividad)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
UsuariosTable.propTypes = { usuarios: PropTypes.array };

// ─── Bloque 3: Métricas WA ──────────────────────────────────────

export const MetricasWASection = ({ metricas }) => {
  if (!metricas) return <Alert severity="info">Sin métricas de WhatsApp</Alert>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>📱 Calidad WhatsApp</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Tasa éxito</Typography>
            <Typography variant="h5" color={metricas.tasaExito >= 0.7 ? 'success.main' : 'error.main'}>
              {formatPercent(metricas.tasaExito)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Correcciones prom.</Typography>
            <Typography variant="h5">{metricas.correccionesPromedio?.toFixed(1) ?? '-'}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Tiempo promedio</Typography>
            <Typography variant="h5">
              {metricas.tiempoPromedioMs ? `${Math.round(metricas.tiempoPromedioMs / 1000)}s` : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">Total sesiones</Typography>
            <Typography variant="h5">{metricas.totalSesiones ?? 0}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
MetricasWASection.propTypes = { metricas: PropTypes.object };

// ─── Bloque 4: Cadena Post-Venta ────────────────────────────────

export const CadenaPostVentaSection = ({ cadena }) => {
  if (!cadena) return <Alert severity="info">Sin cadena post-venta</Alert>;

  const ETAPA_COLORS = {
    pendiente: 'default',
    ejecutada: 'success',
    skipped: 'info',
    error: 'error',
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔗 Cadena Post-Venta (Día {cadena.diasDesdeInicio})
        </Typography>
        <Stack spacing={0.5}>
          {(cadena.etapas || []).map((etapa) => (
            <Stack key={etapa.codigo} direction="row" alignItems="center" spacing={1}>
              <Chip
                label={etapa.codigo}
                size="small"
                color={ETAPA_COLORS[etapa.estado] || 'default'}
                sx={{ minWidth: 40 }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {etapa.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {etapa.fechaEjecucion ? formatDate(etapa.fechaEjecucion) : etapa.estado}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
CadenaPostVentaSection.propTypes = { cadena: PropTypes.object };

// ─── Acciones ────────────────────────────────────────────────────

export const AccionesSection = ({ empresaId, onRecalcular }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>⚡ Acciones</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" color="primary" onClick={onRecalcular}>
          🔄 Forzar recálculo
        </Button>
      </Stack>
    </CardContent>
  </Card>
);
AccionesSection.propTypes = {
  empresaId: PropTypes.string,
  onRecalcular: PropTypes.func,
};
