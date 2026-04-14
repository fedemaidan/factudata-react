import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ReportService from 'src/services/reportService';

// ─── Templates pre-armados (MVP) ───
const TEMPLATES = [
  {
    nombre: 'Estado de Obra',
    descripcion: 'Métricas clave + resumen por categoría + últimos movimientos',
    display_currency: 'ARS',
    datasets: { movimientos: true, presupuestos: false },
    filtros_schema: {
      fecha: { enabled: true, default_range: 'current_month' },
      proyectos: { enabled: true },
      tipo: { enabled: true },
      categorias: { enabled: true },
    },
    layout: [
      {
        type: 'metric_cards',
        titulo: 'Resumen',
        metricas: [
          { id: 'total_egresos', titulo: 'Total Egresos', operacion: 'sum', campo: 'total', filtro_tipo: 'egreso', formato: 'currency', color: 'error' },
          { id: 'total_ingresos', titulo: 'Total Ingresos', operacion: 'sum', campo: 'total', filtro_tipo: 'ingreso', formato: 'currency', color: 'success' },
          { id: 'cant_movs', titulo: 'Movimientos', operacion: 'count', campo: 'total', formato: 'number', color: 'info' },
          { id: 'ticket_promedio', titulo: 'Ticket Promedio', operacion: 'avg', campo: 'total', filtro_tipo: 'egreso', formato: 'currency', color: 'default' },
        ],
      },
      {
        type: 'summary_table',
        titulo: 'Desglose por Categoría',
        agrupar_por: 'categoria',
        columnas: [
          { id: 'total', titulo: 'Monto Total', operacion: 'sum', campo: 'total', formato: 'currency' },
          { id: 'cantidad', titulo: 'Cantidad', operacion: 'count', campo: 'total', formato: 'number' },
        ],
        mostrar_porcentaje: true,
        filtro_tipo: 'egreso',
        mostrar_total: true,
        top_n: 10,
      },
      {
        type: 'movements_table',
        titulo: 'Últimos Movimientos',
        page_size: 15,
      },
    ],
  },
  {
    nombre: 'Caja General',
    descripcion: 'Balance de ingresos y egresos con evolución mensual',
    display_currency: 'ARS',
    datasets: { movimientos: true, presupuestos: false },
    filtros_schema: {
      fecha: { enabled: true, default_range: 'current_year' },
      proyectos: { enabled: true },
      tipo: { enabled: false },
      categorias: { enabled: false },
    },
    layout: [
      {
        type: 'metric_cards',
        titulo: 'Balance',
        metricas: [
          { id: 'ingresos', titulo: 'Ingresos', operacion: 'sum', campo: 'total', filtro_tipo: 'ingreso', formato: 'currency', color: 'success' },
          { id: 'egresos', titulo: 'Egresos', operacion: 'sum', campo: 'total', filtro_tipo: 'egreso', formato: 'currency', color: 'error' },
        ],
      },
      {
        type: 'summary_table',
        titulo: 'Evolución Mensual',
        agrupar_por: 'mes',
        columnas: [
          { id: 'total', titulo: 'Monto Total', operacion: 'sum', campo: 'total', formato: 'currency' },
          { id: 'cantidad', titulo: 'Movimientos', operacion: 'count', campo: 'total', formato: 'number' },
        ],
        mostrar_total: true,
        orden: { campo: 'grupo', direccion: 'asc' },
      },
    ],
  },
  {
    nombre: 'Resumen por Proveedor',
    descripcion: 'Top proveedores por gasto total',
    display_currency: 'ARS',
    datasets: { movimientos: true, presupuestos: false },
    filtros_schema: {
      fecha: { enabled: true, default_range: 'current_year' },
      proyectos: { enabled: true },
      tipo: { enabled: false },
      categorias: { enabled: true },
      proveedores: { enabled: true },
    },
    layout: [
      {
        type: 'summary_table',
        titulo: 'Top Proveedores',
        agrupar_por: 'proveedor',
        columnas: [
          { id: 'total', titulo: 'Total Pagado', operacion: 'sum', campo: 'total', formato: 'currency' },
          { id: 'cantidad', titulo: 'Facturas', operacion: 'count', campo: 'total', formato: 'number' },
          { id: 'promedio', titulo: 'Ticket Promedio', operacion: 'avg', campo: 'total', formato: 'currency' },
        ],
        mostrar_porcentaje: true,
        filtro_tipo: 'egreso',
        mostrar_total: true,
        top_n: 15,
      },
    ],
  },
  {
    nombre: 'Presupuesto vs Real',
    descripcion: 'Comparativo entre presupuesto de control y gastos reales',
    display_currency: 'ARS',
    datasets: { movimientos: true, presupuestos: true },
    filtros_schema: {
      fecha: { enabled: true, default_range: 'current_year' },
      proyectos: { enabled: true },
      tipo: { enabled: false },
      categorias: { enabled: false },
    },
    layout: [
      {
        type: 'metric_cards',
        titulo: 'Resumen Presupuestario',
        metricas: [
          { id: 'total_presup', titulo: 'Total Egresos', operacion: 'sum', campo: 'total', filtro_tipo: 'egreso', formato: 'currency', color: 'default' },
        ],
      },
      {
        type: 'budget_vs_actual',
        titulo: 'Presupuesto vs Ejecución',
        mostrar_tipo: 'egreso',
        alerta_sobreejecucion: true,
      },
    ],
  },
  {
    nombre: 'Categoria por Proyecto',
    descripcion: 'Planilla por categoria con inicial, adicionales, total, recibido y saldo por proyecto',
    display_currency: 'ARS',
    datasets: { movimientos: false, presupuestos: true },
    filtros_schema: {
      fecha: { enabled: false },
      proyectos: { enabled: false },
      tipo: { enabled: false },
      categorias: { enabled: false },
    },
    layout: [
      {
        type: 'category_budget_matrix',
        titulo: 'Categoria por Proyecto',
        categoria_objetivo: '',
        tipo_presupuesto: 'egreso',
        columna_concepto_titulo: 'Obras',
        asumir_monto_incluye_adicionales: true,
        label_presupuesto_inicial: 'Ppto. inicial',
        label_total_presupuesto: 'Total presupuesto',
        label_recibido: 'Recibido',
        label_saldo: 'Saldo',
      },
    ],
  },
  {
    nombre: 'Balance entre Socios',
    descripcion: 'Calcula cuanto aporto cada socio en movimientos y quien debe a quien para equilibrar aportes',
    display_currency: 'ARS',
    datasets: { movimientos: true, presupuestos: false },
    filtros_schema: {
      fecha: { enabled: true, default_range: 'current_month' },
      proyectos: { enabled: true },
      tipo: { enabled: false },
      categorias: { enabled: false },
      usuarios: { enabled: true },
    },
    layout: [
      {
        type: 'balance_between_partners',
        titulo: 'Balance entre socios',
        show_summary_cards: true,
        socios_telefonos: [],
      },
    ],
  },
];

const toErrorText = (err, fallback = 'Ocurrio un error') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const responseData = err?.response?.data;
  if (typeof responseData === 'string') return responseData;
  if (responseData?.message && typeof responseData.message === 'string') return responseData.message;
  if (responseData?.error && typeof responseData.error === 'string') return responseData.error;
  if (responseData?.error?.message && typeof responseData.error.message === 'string') return responseData.error.message;

  if (err?.message && typeof err.message === 'string') return err.message;

  if (responseData && typeof responseData === 'object') {
    try {
      return JSON.stringify(responseData);
    } catch (_e) {
      return fallback;
    }
  }

  return fallback;
};

const ReportListPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [empresaId, setEmpresaId] = useState(null);

  // ─── Data state ───
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── UI state ───
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuReportId, setMenuReportId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newReportTemplate, setNewReportTemplate] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);
  const [createError, setCreateError] = useState('');

  // ─── Empresa ───
  useEffect(() => {
    const fetchEmpresa = async () => {
      if (!user) return;
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        setEmpresaId(empresa?.id || null);
      } catch (err) {
        console.error('Error obteniendo empresa:', err);
      }
    };
    fetchEmpresa();
  }, [user]);

  // ─── Load reports ───
  const loadReports = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ReportService.list(empresaId);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setError('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ─── Handlers ───
  const handleSelectReport = (report) => {
    router.push(`/reportes/${report._id}`);
  };

  const handleMenuOpen = (e, reportId) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuReportId(reportId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuReportId(null);
  };

  const handleDuplicate = async () => {
    if (!menuReportId) return;
    handleMenuClose();
    await ReportService.duplicate(menuReportId, empresaId);
    loadReports();
  };

  const handleDelete = async () => {
    if (!menuReportId) return;
    handleMenuClose();
    if (window.confirm('¿Seguro que querés eliminar este reporte?')) {
      await ReportService.delete(menuReportId, empresaId);
      loadReports();
    }
  };

  const handleCreateReport = async () => {
    if (!newReportName.trim() || !empresaId || creatingReport) return;

    let data;
    if (newReportTemplate) {
      const template = TEMPLATES.find((t) => t.nombre === newReportTemplate);
      if (!template) {
        setCreateError('La plantilla seleccionada no es valida.');
        return;
      }
      data = {
        ...template,
        nombre: newReportName.trim(),
        empresa_id: empresaId,
      };
    } else {
      data = {
        nombre: newReportName.trim(),
        empresa_id: empresaId,
        datasets: { movimientos: true, presupuestos: false },
        display_currency: 'ARS',
        filtros_schema: {
          fecha: { enabled: true, default_range: 'current_month' },
          proyectos: { enabled: true },
          tipo: { enabled: true },
          categorias: { enabled: true },
        },
        layout: [],
      };
    }

    try {
      setCreatingReport(true);
      setCreateError('');
      const created = await ReportService.create(data);

      const createdId =
        created?._id ||
        created?.id ||
        created?.report?._id ||
        created?.report?.id ||
        null;

      const createdLayout = created?.layout || created?.report?.layout || [];

      setCreateDialogOpen(false);
      setNewReportName('');
      setNewReportTemplate('');

      await loadReports();

      if (!createdId) {
        return;
      }

      // Si el reporte se creó en blanco, abrir directo en modo edición
      if (!createdLayout || createdLayout.length === 0) {
        router.push(`/reportes/${createdId}?edit=1`);
      } else {
        router.push(`/reportes/${createdId}`);
      }
    } catch (err) {
      console.error('Error creando reporte:', err);
      setCreateError(toErrorText(err, 'No se pudo crear el reporte.'));
    } finally {
      setCreatingReport(false);
    }
  };

  // ─── Render ───
  return (
    <>
      <Head>
        <title>Reportes</title>
      </Head>
      <Box sx={{ flexGrow: 1, py: 2 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Reportes
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Nuevo Reporte
            </Button>
          </Stack>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && reports.length === 0 && (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No tenés reportes todavía
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Creá tu primer reporte usando una plantilla predefinida o empezá desde cero.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Crear mi primer reporte
              </Button>
            </Paper>
          )}

          {/* Grid de reportes */}
          <Grid container spacing={2}>
            {reports.map((report) => (
              <Grid item xs={12} sm={6} md={4} key={report._id}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <CardActionArea onClick={() => handleSelectReport(report)} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={600} noWrap>
                            {report.nombre}
                          </Typography>
                          {report.descripcion && (
                            <Typography variant="body2" color="text.secondary" sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {report.descripcion}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, report._id)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
                        <Chip label={report.display_currency || 'ARS'} size="small" variant="outlined" />
                        {report.datasets?.presupuestos && (
                          <Chip label="Presupuesto" size="small" color="info" variant="outlined" />
                        )}
                        <Chip
                          label={report.status === 'published' ? 'Publicado' : 'Borrador'}
                          size="small"
                          color={report.status === 'published' ? 'success' : 'default'}
                          variant="outlined"
                        />
                        {report.permisos?.publico && (
                          <Chip label="Público" size="small" color="warning" variant="outlined" />
                        )}
                      </Stack>
                      {report.updatedAt && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                          Actualizado: {new Date(report.updatedAt).toLocaleDateString('es-AR')}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Menú contextual */}
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
            <MenuItem onClick={() => {
              const rpt = reports.find((r) => r._id === menuReportId);
              handleMenuClose();
              if (rpt) router.push(`/reportes/${rpt._id}?edit=1`);
            }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDuplicate}>
              <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Duplicar</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Eliminar</ListItemText>
            </MenuItem>
          </Menu>

          {/* Dialog crear reporte */}
          <Dialog
            open={createDialogOpen}
            onClose={() => {
              if (creatingReport) return;
              setCreateDialogOpen(false);
              setCreateError('');
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Nuevo Reporte</DialogTitle>
            <DialogContent>
              <Stack spacing={3} mt={1}>
                {createError && (
                  <Alert severity="error">
                    {createError}
                  </Alert>
                )}
                <TextField
                  label="Nombre del reporte"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  fullWidth
                  autoFocus
                  disabled={creatingReport}
                />
                <FormControl fullWidth>
                  <InputLabel>Plantilla (opcional)</InputLabel>
                  <Select
                    value={newReportTemplate}
                    label="Plantilla (opcional)"
                    onChange={(e) => setNewReportTemplate(e.target.value)}
                    disabled={creatingReport}
                  >
                    <MenuItem value="">
                      <em>En blanco</em>
                    </MenuItem>
                    {TEMPLATES.map((t) => (
                      <MenuItem key={t.nombre} value={t.nombre}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{t.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.descripcion}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  if (creatingReport) return;
                  setCreateDialogOpen(false);
                  setCreateError('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateReport}
                disabled={!newReportName.trim() || !empresaId || creatingReport}
              >
                {creatingReport ? 'Creando...' : 'Crear'}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </>
  );
};

ReportListPage.getLayout = (page) => (
  <DashboardLayout title="Reportes">{page}</DashboardLayout>
);

export default ReportListPage;
