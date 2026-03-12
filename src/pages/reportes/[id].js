import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  Box,
  Container,
  Stack,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';

import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useReportData } from 'src/hooks/useReportData';
import ReportView from 'src/components/reportes/ReportView';
import ReportFiltersBar from 'src/components/reportes/ReportFiltersBar';
import ReportEditor from 'src/components/reportes/ReportEditor';
import BlockEditorDialog from 'src/components/reportes/BlockEditorDialog';
import AddIcon from '@mui/icons-material/Add';
import { executeReport } from 'src/tools/reportEngine';
import { exportReportToXLSX } from 'src/tools/exportReportXLSX';
import { exportReportToPDF } from 'src/tools/exportReportPDF';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const ReportDetailPage = () => {
  const router = useRouter();
  const { id, edit } = router.query;
  const { user } = useAuthContext();
  const [empresaId, setEmpresaId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const linkCopiedTimeoutRef = useRef(null);

  // Limpiar timeout de linkCopied al desmontar
  useEffect(() => {
    return () => {
      if (linkCopiedTimeoutRef.current) {
        clearTimeout(linkCopiedTimeoutRef.current);
      }
    };
  }, []);

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

  const {
    selectedReport,
    filteredMovimientos,
    presupuestos,
    proyectos,
    filters,
    availableOptions,
    loadingData,
    error,
    setFilters,
    loadReportData,
    loadReportById,
    updateReport,
    refreshData,
    displayCurrencies,
    cotizaciones,
  } = useReportData(user, empresaId);

  // ─── Cargar reporte por ID al montar ───
  useEffect(() => {
    if (id && empresaId) {
      loadReportById(id);
    }
  }, [id, empresaId, loadReportById]);

  // ─── Activar modo edición si viene ?edit=1 ───
  useEffect(() => {
    if (edit === '1' && selectedReport) {
      setIsEditing(true);
    }
  }, [edit, selectedReport]);

  // ─── Handlers ───
  const handleBack = () => {
    router.push('/reportes');
  };

  const handleOpenShare = async () => {
    // Auto-generar token y activar acceso público si no existe
    if (!selectedReport?.permisos?.link_token) {
      const token = Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 6);
      const updatedReport = {
        ...selectedReport,
        permisos: {
          ...selectedReport.permisos,
          publico: true,
          link_token: token,
        },
      };
      try {
        const saved = await updateReport(updatedReport._id, updatedReport);
        if (saved) {
          await loadReportData(saved);
        }
      } catch (err) {
        console.error('Error generando link público:', err);
      }
    }
    setShareDialogOpen(true);
  };

  const handleCloseShare = () => {
    setShareDialogOpen(false);
  };

  /**
   * Serializa los filtros activos en query params para el link público.
   * Arrays se joinean con coma, valores null/vacíos se omiten.
   * Fechas se formatean como YYYY-MM-DD para evitar problemas de timezone.
   */
  const buildFilterQueryString = () => {
    if (!filters || Object.keys(filters).length === 0) return '';
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        if (value.length > 0) params.set(key, value.join(','));
      } else if (value instanceof Date) {
        const yyyy = value.getFullYear();
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        const dd = String(value.getDate()).padStart(2, '0');
        params.set(key, `${yyyy}-${mm}-${dd}`);
      } else if (typeof value === 'string' && value !== '') {
        // Si ya es un string de fecha tipo "2025-01-04", dejarlo tal cual
        params.set(key, value);
      } else if (value !== '') {
        params.set(key, String(value));
      }
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleCopyLink = () => {
    if (!selectedReport?.permisos?.link_token) return;
    const base = `${typeof window !== 'undefined' ? window.location.origin : ''}/reportes/public/${selectedReport.permisos.link_token}`;
    const url = base + buildFilterQueryString();
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    if (linkCopiedTimeoutRef.current) {
      clearTimeout(linkCopiedTimeoutRef.current);
    }
    linkCopiedTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
  };

  const getPublicLink = () => {
    if (!selectedReport?.permisos?.link_token) return null;
    const base = `${typeof window !== 'undefined' ? window.location.origin : ''}/reportes/public/${selectedReport.permisos.link_token}`;
    return base + buildFilterQueryString();
  };

  const handleExport = () => {
    if (!selectedReport || filteredMovimientos.length === 0) return;
    const results = executeReport(selectedReport, filteredMovimientos, presupuestos, displayCurrencies, cotizaciones);
    exportReportToXLSX(selectedReport, results, filteredMovimientos, displayCurrencies);
  };

  const handleExportPDF = async () => {
    if (!selectedReport || filteredMovimientos.length === 0) return;
    try {
      await exportReportToPDF({
        reportConfig: selectedReport,
        movimientos: filteredMovimientos,
        presupuestos,
        displayCurrencies,
        cotizaciones,
        filters,
      });
    } catch (err) {
      console.error('Error exportando PDF:', err);
    }
  };

  const handleEditReport = () => {
    setIsEditing(true);
  };

  const handleAddBlock = async (block) => {
    if (!selectedReport) return;
    setAddingBlock(true);
    try {
      const updatedLayout = [...(selectedReport.layout || []), block];
      const updatedReport = { ...selectedReport, layout: updatedLayout };
      const saved = await updateReport(updatedReport._id, updatedReport);
      if (saved) {
        await loadReportData(saved);
      }
    } catch (err) {
      console.error('Error agregando bloque:', err);
    } finally {
      setAddingBlock(false);
    }
  };

  const handleSaveEdit = async (updatedReport) => {
    setSaving(true);
    try {
      const saved = await updateReport(updatedReport._id, updatedReport);
      if (saved) {
        await loadReportData(saved);
      }
      setIsEditing(false);
      // Limpiar el query param ?edit=1
      if (edit) {
        router.replace(`/reportes/${id}`, undefined, { shallow: true });
      }
    } catch (err) {
      console.error('Error guardando reporte:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (edit) {
      router.replace(`/reportes/${id}`, undefined, { shallow: true });
    }
  };

  // ─── Título y acciones para el top-nav ───
  const topNavTitle = useMemo(() => {
    if (!selectedReport) return 'Cargando...';
    if (isEditing) return `Editar: ${selectedReport.nombre}`;
    return selectedReport.nombre;
  }, [isEditing, selectedReport]);

  const topNavActions = useMemo(() => {
    if (!selectedReport) return null;

    if (isEditing) {
      return (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={handleCancelEdit}
          >
            Cancelar
          </Button>
        </Stack>
      );
    }

    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton size="small" onClick={handleBack}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Chip
          label={displayCurrencies?.join(' · ') || 'ARS'}
          size="small"
          variant="outlined"
          color="primary"
        />
        {selectedReport.descripcion && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {selectedReport.descripcion}
          </Typography>
        )}
        <Tooltip title="Refrescar datos">
          <IconButton size="small" onClick={refreshData} disabled={loadingData}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Editar configuración">
          <IconButton size="small" onClick={handleEditReport}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar Excel">
          <IconButton
            size="small"
            onClick={handleExport}
            disabled={loadingData || filteredMovimientos.length === 0}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar PDF">
          <IconButton
            size="small"
            onClick={handleExportPDF}
            disabled={loadingData || filteredMovimientos.length === 0}
          >
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Compartir reporte">
          <IconButton size="small" onClick={handleOpenShare}>
            <ShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport, isEditing, displayCurrencies, loadingData, filteredMovimientos.length]);

  // ─── Loading state ───
  if (!id) {
    return null;
  }

  // ─── Render ───
  return (
    <DashboardLayout title={topNavTitle} headerActions={topNavActions}>
      <Head>
        <title>{selectedReport?.nombre || 'Reporte'} | Reportes</title>
      </Head>

      {/* Estado de carga inicial */}
      {loadingData && !selectedReport && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={handleBack}>Volver</Button>
          }>
            {error}
          </Alert>
        </Box>
      )}

      {selectedReport && (
        <Box sx={{ flexGrow: 1, py: 1 }}>
          <Container maxWidth="xl" disableGutters={isEditing} sx={isEditing ? { px: 1 } : {}}>
            {isEditing ? (
              /* ─── Modo Edición: DataStudio ─── */
              <ReportEditor
                report={selectedReport}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                saving={saving}
                movimientos={filteredMovimientos}
                presupuestos={presupuestos}
                displayCurrencies={displayCurrencies}
                cotizaciones={cotizaciones}
                empresaId={empresaId}
                proyectos={proyectos}
              />
            ) : (
              /* ─── Modo Vista ─── */
              <>
                {/* Filtros */}
                <Container maxWidth="xl">
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <ReportFiltersBar
                      filtrosSchema={selectedReport.filtros_schema}
                      filters={filters}
                      onFiltersChange={setFilters}
                      availableOptions={availableOptions}
                      expanded={filtersExpanded}
                      onToggle={() => setFiltersExpanded(!filtersExpanded)}
                    />
                  </Paper>

                  {/* Estado de carga de datos */}
                  {loadingData && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress />
                    </Box>
                  )}

                  {/* Info de datos */}
                  {!loadingData && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      {filteredMovimientos.length} movimientos · Moneda: {displayCurrencies?.join(', ') || 'ARS'}
                    </Typography>
                  )}

                  {/* Reporte */}
                  {!loadingData && (
                    <ReportView
                      reportConfig={selectedReport}
                      movimientos={filteredMovimientos}
                      presupuestos={presupuestos}
                      displayCurrencies={displayCurrencies}
                      cotizaciones={cotizaciones}
                    />
                  )}

                  {/* Agregar bloque rápido */}
                  {!loadingData && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setBlockDialogOpen(true)}
                        disabled={addingBlock}
                        sx={{ borderStyle: 'dashed' }}
                      >
                        {addingBlock ? 'Agregando...' : 'Agregar bloque'}
                      </Button>
                    </Box>
                  )}
                </Container>
              </>
            )}
          </Container>
        </Box>
      )}
      
      {/* Dialog para agregar bloque */}
      <BlockEditorDialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        onSave={handleAddBlock}
        initialBlock={null}
      />

      {/* Dialog para compartir reporte */}
      <Dialog open={shareDialogOpen} onClose={handleCloseShare} maxWidth="sm" fullWidth>
        <DialogTitle>Compartir reporte</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Comparte este link con tus clientes o terceros para que puedan ver el reporte sin necesidad de login.
            </Typography>
            {getPublicLink() && (
              <Alert
                severity="info"
                icon={<LinkIcon fontSize="small" />}
                action={
                  <Tooltip title={linkCopied ? 'Copiado!' : 'Copiar link'}>
                    <IconButton size="small" onClick={handleCopyLink}>
                      <ContentCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    userSelect: 'all'
                  }}
                >
                  {getPublicLink()}
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShare}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ReportDetailPage;
