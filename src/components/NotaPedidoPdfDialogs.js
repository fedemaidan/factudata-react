import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AddIcon from '@mui/icons-material/Add';
import notaPedidoService from 'src/services/notaPedidoService';
import NotaPedidoPlantillaChatDialog from './NotaPedidoPlantillaChatDialog';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';

const NotaPedidoPdfPreviewInner = dynamic(
  () => import('./NotaPedidoPdfPreviewInner'),
  { ssr: false, loading: () => <PreviewSpinner /> }
);

const NotaPedidoPdfBasePreviewInner = dynamic(
  () => import('./NotaPedidoPdfBasePreviewInner'),
  { ssr: false, loading: () => <PreviewSpinner /> }
);

const MOCK_NOTA = {
  codigo: 1,
  descripcion: 'Provisión de materiales para la obra. Incluye cemento, arena y hierro en las cantidades acordadas para la etapa inicial del proyecto.',
  estado: 'Pendiente',
  proyecto_nombre: 'Proyecto Demo',
  owner_name: 'Juan Pérez',
  creador_name: 'María García',
  proveedor: 'Proveedor Ejemplo S.A.',
  fechaCreacion: { _seconds: Math.floor(Date.now() / 1000) },
  comentarios: [{ texto: 'Confirmado con el proveedor.' }],
};

const BASE_TEMPLATE_ENTRY = { _id: 'base', nombre: 'Plantilla base' };

async function loadCustomComponentById(templateId) {
  const jsCode = await notaPedidoService.getComponentCode(templateId);
  if (!jsCode) throw new Error('No se pudo obtener el código del componente');
  const { Document, Page, Text, View, Image, StyleSheet } = await import('@react-pdf/renderer');
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'React', 'Document', 'Page', 'Text', 'View', 'Image', 'StyleSheet',
    `${jsCode}\nreturn typeof PlantillaPDF !== 'undefined' ? PlantillaPDF : null;`
  );
  const Component = factory(React, Document, Page, Text, View, Image, StyleSheet);
  if (!Component) throw new Error('PlantillaPDF no definido');
  return Component;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PreviewSpinner() {
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={28} sx={{ color: '#4f46e5' }} />
    </Box>
  );
}

function DocThumbnail({ isBase, selected }) {
  const color = selected ? '#4f46e5' : isBase ? '#64748b' : '#6366f1';
  return (
    <Box
      sx={{
        width: 34,
        height: 44,
        borderRadius: '3px 6px 3px 3px',
        border: `1.5px solid ${alpha(color, selected ? 0.5 : 0.25)}`,
        bgcolor: alpha(color, 0.05),
        display: 'flex',
        flexDirection: 'column',
        p: '5px',
        gap: '3px',
        flexShrink: 0,
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -1,
          right: -1,
          width: 8,
          height: 8,
          borderBottom: `1.5px solid ${alpha(color, 0.25)}`,
          borderLeft: `1.5px solid ${alpha(color, 0.25)}`,
          bgcolor: 'background.paper',
          borderRadius: '0 0 0 2px',
        }}
      />
      {[90, 60, 75, 55, 80].map((w, i) => (
        <Box
          key={i}
          sx={{
            height: '3px',
            borderRadius: '2px',
            bgcolor: alpha(color, i === 0 ? 0.45 : 0.18),
            width: `${w}%`,
          }}
        />
      ))}
    </Box>
  );
}

function TemplateCard({ template, selected, onSelect }) {
  const isBase = template._id === 'base';
  return (
    <Box
      onClick={() => onSelect(template._id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: '10px',
        cursor: 'pointer',
        border: '1.5px solid',
        borderColor: selected ? '#4f46e5' : alpha('#94a3b8', 0.28),
        bgcolor: selected ? alpha('#4f46e5', 0.04) : 'transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: selected ? '#4f46e5' : alpha('#4f46e5', 0.35),
          bgcolor: selected ? alpha('#4f46e5', 0.05) : alpha('#4f46e5', 0.02),
          transform: 'translateY(-1px)',
          boxShadow: `0 3px 10px ${alpha('#4f46e5', 0.07)}`,
        },
      }}
    >
      <DocThumbnail isBase={isBase} selected={selected} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          noWrap
          sx={{ color: selected ? '#3730a3' : '#1e293b', lineHeight: 1.35, fontSize: '0.8rem' }}
        >
          {isBase ? 'Plantilla base' : template.nombre}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
          {isBase ? 'Diseño estándar del sistema' : 'Diseño con IA'}
        </Typography>
      </Box>

      {selected ? (
        <CheckCircleRoundedIcon sx={{ color: '#4f46e5', fontSize: 17, flexShrink: 0 }} />
      ) : (
        <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', fontSize: 17, flexShrink: 0 }} />
      )}
    </Box>
  );
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

function NotaPedidoPdfTemplateDialog({
  open,
  onClose,
  baseTemplate,
  loading,
  onSaveLogo,
  empresaId,
  sampleNota,
  onPlantillaGuardada,
  selectedPlantillaId,
  onTemplateSelected,
}) {
  const nota = sampleNota || MOCK_NOTA;

  // ── Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoSaving, setLogoSaving] = useState(false);

  // ── Templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── Selection (local — confirmed on "Aplicar")
  const [localSelectedId, setLocalSelectedId] = useState(selectedPlantillaId || 'base');

  // ── Preview
  const [previewComponent, setPreviewComponent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  // ── Logo data URL for preview
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  // ── Chat
  const [openChat, setOpenChat] = useState(false);

  const prevSelectedRef = useRef(null);

  // Init localSelectedId from prop when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSelectedId(selectedPlantillaId || 'base');
    }
  }, [open, selectedPlantillaId]);

  // Fetch templates on open
  useEffect(() => {
    if (!open || !empresaId) return;
    setTemplatesLoading(true);
    notaPedidoService
      .getPdfTemplates(empresaId)
      .then((list) => setTemplates(list || []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [open, empresaId]);

  // Load logo data URL for preview
  useEffect(() => {
    const url = baseTemplate?.logo_url;
    if (!url) { setLogoDataUrl(null); return; }
    loadImageAsDataUrl(url).then(setLogoDataUrl).catch(() => setLogoDataUrl(null));
  }, [baseTemplate?.logo_url]);

  // When selection changes: compile custom component if needed
  useEffect(() => {
    if (localSelectedId === 'base') {
      setPreviewComponent(null);
      setPreviewError(null);
      return;
    }
    const tpl = templates.find((t) => t._id === localSelectedId);
    if (!tpl?.component_url) { setPreviewComponent(null); return; }

    if (prevSelectedRef.current === localSelectedId) return;
    prevSelectedRef.current = localSelectedId;

    setPreviewLoading(true);
    setPreviewError(null);
    loadCustomComponentById(tpl._id)
      .then((Component) => {
        setPreviewComponent(() => Component);
        setPreviewVersion((v) => v + 1);
      })
      .catch((err) => setPreviewError(err.message))
      .finally(() => setPreviewLoading(false));
  }, [localSelectedId, templates]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setLogoFile(null);
      setPreviewComponent(null);
      setPreviewError(null);
      prevSelectedRef.current = null;
    }
  }, [open]);

  const handleSelectTemplate = useCallback((id) => {
    if (id !== localSelectedId) {
      prevSelectedRef.current = null;
    }
    setLocalSelectedId(id);
  }, [localSelectedId]);

  const handleGuardarLogo = async () => {
    if (!logoFile) return;
    setLogoSaving(true);
    await onSaveLogo(logoFile);
    setLogoFile(null);
    setLogoSaving(false);
  };

  const handleOpenChat = () => {
    setOpenChat(true);
  };

  const handleApply = () => {
    onTemplateSelected?.(localSelectedId === 'base' ? null : localSelectedId);
    onClose();
  };

  const allTemplates = [BASE_TEMPLATE_ENTRY, ...templates];

  const selectedName = localSelectedId === 'base'
    ? 'Plantilla base'
    : templates.find((t) => t._id === localSelectedId)?.nombre || 'Plantilla personalizada';

  const previewKey = `preview-${localSelectedId}-${previewVersion}`;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '88vh',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.14)',
          },
        }}
      >
        {/* ── Title bar ──────────────────────────────────────────────────── */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fafbff',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: alpha('#4f46e5', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoFixHighIcon sx={{ fontSize: 17, color: '#4f46e5' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              Plantillas de PDF
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Nota de pedido · Configuración visual
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {/* LEFT PANEL */}
          <Box
            sx={{
              width: 300,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: '#fafbff',
              overflow: 'hidden',
            }}
          >
            {/* ── Logo section ─────────────────────────────────────── */}
            <Box sx={{ px: 2, pt: 2.5, pb: 2 }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  color: '#94a3b8',
                  display: 'block',
                  mb: 1.5,
                }}
              >
                Logo de empresa
              </Typography>

              <Box
                sx={{
                  border: '1.5px solid',
                  borderColor: baseTemplate?.logo_url ? alpha('#4f46e5', 0.2) : alpha('#94a3b8', 0.25),
                  borderRadius: '10px',
                  p: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                {baseTemplate?.logo_url ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 34,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: alpha('#4f46e5', 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        bgcolor: '#f8faff',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={baseTemplate.logo_url}
                        alt="Logo"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: '#3730a3', display: 'block', lineHeight: 1.3 }}
                      >
                        Logo configurado
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                        Aparece en todos los PDFs
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600, display: 'block', mb: 1 }}>
                    Sin logo — requerido para PDFs
                  </Typography>
                )}

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    component="label"
                    size="small"
                    variant="outlined"
                    startIcon={<ImageOutlinedIcon sx={{ fontSize: 14 }} />}
                    disabled={loading || logoSaving}
                    sx={{
                      fontSize: '0.7rem',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '6px',
                      borderColor: alpha('#4f46e5', 0.3),
                      color: '#4f46e5',
                      textTransform: 'none',
                      '&:hover': { borderColor: '#4f46e5', bgcolor: alpha('#4f46e5', 0.04) },
                    }}
                  >
                    Elegir imagen
                    <input type="file" hidden accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  </Button>
                  {logoFile && (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={logoSaving}
                      onClick={handleGuardarLogo}
                      sx={{
                        fontSize: '0.7rem',
                        px: 1.2,
                        py: 0.4,
                        borderRadius: '6px',
                        textTransform: 'none',
                        bgcolor: '#4f46e5',
                        '&:hover': { bgcolor: '#3730a3' },
                      }}
                    >
                      {logoSaving ? <CircularProgress size={10} color="inherit" /> : 'Guardar'}
                    </Button>
                  )}
                </Stack>
                {logoFile && (
                  <Typography variant="caption" noWrap sx={{ color: '#94a3b8', fontSize: '0.68rem', mt: 0.5, display: 'block' }}>
                    {logoFile.name}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            {/* ── Templates list ───────────────────────────────────── */}
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography
                  variant="overline"
                  sx={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    color: '#94a3b8',
                  }}
                >
                  Plantillas disponibles
                </Typography>
                {templatesLoading && <CircularProgress size={10} sx={{ color: '#94a3b8' }} />}
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
              <Stack spacing={0.8}>
                {allTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl._id}
                    template={tpl}
                    selected={localSelectedId === tpl._id}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </Stack>

              <Box
                onClick={handleOpenChat}
                sx={{
                  mt: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: '10px',
                  border: '1.5px dashed',
                  borderColor: alpha('#4f46e5', 0.25),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#4f46e5',
                    bgcolor: alpha('#4f46e5', 0.03),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '6px',
                    bgcolor: alpha('#4f46e5', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AddIcon sx={{ fontSize: 14, color: '#4f46e5' }} />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ color: '#4f46e5', display: 'block', lineHeight: 1.3 }}>
                    Crear plantilla con IA
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                    Diseñá un estilo personalizado
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* RIGHT PANEL — live preview */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: '#f1f5f9',
            }}
          >
            {/* Preview header */}
            <Box
              sx={{
                px: 3,
                py: 1.5,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexShrink: 0,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.62rem' }}>
                  Vista previa
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b', lineHeight: 1.3 }}>
                  {selectedName}
                </Typography>
              </Box>
              {previewLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={14} sx={{ color: '#4f46e5' }} />
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Cargando plantilla…</Typography>
                </Box>
              )}
              {previewError && (
                <Typography variant="caption" sx={{ color: '#ef4444' }}>
                  Error al cargar
                </Typography>
              )}
            </Box>

            {/* PDF viewer */}
            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {/* Decorative paper shadow around PDF */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 20,
                  borderRadius: '8px',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
              <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
                {previewLoading ? (
                  <PreviewSpinner />
                ) : previewError ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>
                      No se pudo cargar la plantilla
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {previewError}
                    </Typography>
                  </Box>
                ) : previewComponent ? (
                  <NotaPedidoPdfPreviewInner
                    key={previewKey}
                    PlantillaPDF={previewComponent}
                    nota={nota}
                    logoDataUrl={logoDataUrl}
                    empresaNombre=""
                  />
                ) : (
                  <NotaPedidoPdfBasePreviewInner
                    key={`base-${logoDataUrl}`}
                    nota={nota}
                    logoDataUrl={logoDataUrl}
                    empresaNombre=""
                  />
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fafbff',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: '#94a3b8', flex: 1 }}>
            {localSelectedId === 'base'
              ? 'Se usará el diseño estándar del sistema'
              : `Se usará "${selectedName}" al generar PDFs`}
          </Typography>
          <Button
            onClick={onClose}
            sx={{ textTransform: 'none', color: '#64748b', borderRadius: '8px', px: 2 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 2.5,
              bgcolor: '#4f46e5',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#3730a3', boxShadow: 'none' },
            }}
          >
            Aplicar plantilla
          </Button>
        </DialogActions>
      </Dialog>

      <NotaPedidoPlantillaChatDialog
        open={openChat}
        onClose={() => setOpenChat(false)}
        empresaId={empresaId}
        logoDataUrl={logoDataUrl}
        sampleNota={nota}
        onSaved={(template) => {
          setOpenChat(false);
          setTemplates((prev) => [...prev, template]);
          if (template?._id) {
            setLocalSelectedId(template._id);
          }
          onPlantillaGuardada?.(template);
        }}
      />
    </>
  );
}

export default NotaPedidoPdfTemplateDialog;

// ─── Logo requerido dialog (unchanged) ───────────────────────────────────────

export function NotaPedidoLogoRequeridoDialog({ open, onClose, loading, onSaveAndDownload }) {
  const [file, setFile] = useState(null);

  const handleClose = useCallback(() => {
    setFile(null);
    onClose();
  }, [onClose]);

  const handleSave = async () => {
    if (!file) return;
    await onSaveAndDownload(file);
    setFile(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' }}>
        Falta el logo de tu empresa
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Subí el logo una vez (PNG o JPG). Se usará en todos los PDFs de notas de pedido.
          </Typography>
          <Button
            variant="outlined"
            component="label"
            size="small"
            disabled={loading}
            startIcon={<ImageOutlinedIcon />}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Elegir imagen
            <input type="file" hidden accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          {file && (
            <Typography variant="caption" color="text.secondary">
              {file.name}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={loading || !file}
          onClick={handleSave}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', bgcolor: '#4f46e5', '&:hover': { bgcolor: '#3730a3' } }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Guardar y descargar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
