import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { keyframes } from '@emotion/react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputBase,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import notaPedidoService from 'src/services/notaPedidoService';

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
`;

function PdfPageSkeleton() {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        bgcolor: '#e0e0e0',
        display: 'flex',
        justifyContent: 'center',
        pt: 4,
        pb: 4,
      }}
    >
      <Box
        sx={{
          width: 560,
          bgcolor: 'background.paper',
          boxShadow: 4,
          borderRadius: 0.5,
          px: 5,
          py: 4,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
          <Skeleton variant="rectangular" width={130} height={42} sx={{ borderRadius: 0.5 }} animation="wave" />
          <Box>
            <Skeleton width={150} height={26} sx={{ ml: 'auto' }} animation="wave" />
            <Skeleton width={80} height={18} sx={{ ml: 'auto', mt: 0.5 }} animation="wave" />
            <Skeleton width={60} height={14} sx={{ ml: 'auto', mt: 0.5 }} animation="wave" />
          </Box>
        </Box>
        <Skeleton variant="rectangular" height={2} sx={{ mb: 2.5 }} animation="wave" />

        {/* Info general */}
        <Skeleton width={110} height={12} sx={{ mb: 1.5 }} animation="wave" />
        {['a', 'b', 'c', 'd'].map((k) => (
          <Box key={k} sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
            <Skeleton width={75} height={14} sx={{ mr: 2, flexShrink: 0 }} animation="wave" />
            <Skeleton width={180} height={14} animation="wave" />
          </Box>
        ))}
        <Skeleton variant="rectangular" width={64} height={22} sx={{ borderRadius: 1, mt: 1, mb: 3 }} animation="wave" />

        {/* Descripción */}
        <Skeleton width={75} height={12} sx={{ mb: 1.5 }} animation="wave" />
        <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 0.5, mb: 3 }} animation="wave" />

        {/* Comentarios */}
        <Skeleton width={90} height={12} sx={{ mb: 1.5 }} animation="wave" />
        <Skeleton height={14} sx={{ mb: 0.75 }} animation="wave" />
        <Skeleton width="65%" height={14} animation="wave" />

        {/* Footer */}
        <Skeleton width="45%" height={12} sx={{ mt: 5, mx: 'auto' }} animation="wave" />
      </Box>
    </Box>
  );
}

const NotaPedidoPdfPreviewInner = dynamic(
  () => import('./NotaPedidoPdfPreviewInner'),
  { ssr: false, loading: () => <PdfPageSkeleton /> }
);

const NotaPedidoPdfBasePreviewInner = dynamic(
  () => import('./NotaPedidoPdfBasePreviewInner'),
  { ssr: false, loading: () => <PdfPageSkeleton /> }
);

const GREETING = '¡Hola! Podés modificar la plantilla base del PDF de tu nota de pedido. Describí qué cambio querés hacer — por ejemplo "título más grande", "colores de mi empresa", "estilo más moderno" — o adjuntá una imagen o PDF de referencia para que tome ese estilo.';

const MOCK_NOTA = {
  codigo: 1,
  descripcion: 'Provisión de materiales para la obra. Incluye cemento, arena y hierro.',
  estado: 'Pendiente',
  proyecto_nombre: 'Proyecto Demo',
  owner_name: 'Juan Pérez',
  creador_name: 'María García',
  proveedor: 'Proveedor Ejemplo S.A.',
  fechaCreacion: { _seconds: Math.floor(Date.now() / 1000) },
  comentarios: [{ texto: 'Comentario de ejemplo.' }],
};

function sanitizePdfCode(code) {
  // react-pdf doesn't support fontStyle/fontWeight — must use named font variants instead.
  // Strip them so the PDF doesn't crash; the fontFamily already encodes the style.
  return code
    .replace(/fontStyle\s*:\s*['"][^'"]*['"]\s*,?\s*/g, '')
    .replace(/fontWeight\s*:\s*['"\d][^,}]*,?\s*/g, '');
}

async function compileComponent(jsCode) {
  console.log('[compileComponent] Iniciando, longitud del código:', jsCode?.length);
  const sanitized = sanitizePdfCode(jsCode);
  if (sanitized !== jsCode) console.warn('[compileComponent] Se eliminaron propiedades no soportadas (fontStyle/fontWeight)');
  // eslint-disable-next-line no-param-reassign
  jsCode = sanitized;
  const { Document, Page, Text, View, Image, StyleSheet } = await import('@react-pdf/renderer');
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'React', 'Document', 'Page', 'Text', 'View', 'Image', 'StyleSheet',
    `${jsCode}\nreturn typeof PlantillaPDF !== 'undefined' ? PlantillaPDF : null;`
  );
  const Component = factory(React, Document, Page, Text, View, Image, StyleSheet);
  console.log('[compileComponent] Resultado:', Component ? `OK (fn name: ${Component.name})` : 'NULL — PlantillaPDF no definida');
  if (!Component) throw new Error('El código no define PlantillaPDF');
  return Component;
}

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
      <Box sx={{ mr: 1, mt: 0.5, color: 'primary.main', flexShrink: 0 }}>
        <SmartToyOutlinedIcon fontSize="small" />
      </Box>
      <Paper
        variant="outlined"
        sx={{
          px: 1.5,
          py: 0.875,
          borderRadius: '4px 12px 12px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 0.625,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.disabled',
              animation: `${dotBounce} 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </Paper>
    </Box>
  );
}

function ChatBubble({ role, content }) {
  const isAI = role === 'assistant';
  return (
    <Box sx={{ display: 'flex', justifyContent: isAI ? 'flex-start' : 'flex-end', mb: 1.5 }}>
      {isAI && (
        <Box sx={{ mr: 1, mt: 0.5, color: 'primary.main', flexShrink: 0 }}>
          <SmartToyOutlinedIcon fontSize="small" />
        </Box>
      )}
      <Paper
        variant="outlined"
        sx={{
          px: 1.5,
          py: 1,
          maxWidth: '85%',
          bgcolor: isAI ? 'background.paper' : 'primary.main',
          color: isAI ? 'text.primary' : 'primary.contrastText',
          borderColor: isAI ? 'divider' : 'primary.main',
          borderRadius: isAI ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <Typography variant="body2">{content}</Typography>
      </Paper>
    </Box>
  );
}

export default function NotaPedidoPlantillaChatDialog({
  open,
  onClose,
  empresaId,
  logoDataUrl,
  sampleNota,
  onSaved,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState(null);
  const [CompiledComponent, setCompiledComponent] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [compileError, setCompileError] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [referenceAttachment, setReferenceAttachment] = useState(null); // { url, isPdf, name, uploading, error }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewImageRef = useRef(null); // latest rendered image data URL for saving

  const nota = sampleNota || MOCK_NOTA;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING }]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setCurrentCode(null);
      setCompiledComponent(null);
      setCompileError(null);
      setTemplateName('');
      setReferenceAttachment(null);
      previewImageRef.current = null;
    }
  }, [open]);

  const handlePreviewImageReady = useCallback((src) => {
    previewImageRef.current = src;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCompile = useCallback(async (code) => {
    setCompileError(null);
    try {
      console.log('[handleCompile] Compilando componente...');
      const Component = await compileComponent(code);
      console.log('[handleCompile] Éxito — seteando CompiledComponent y actualizando previewVersion');
      setCompiledComponent(() => Component);
      setPreviewVersion((v) => v + 1);
    } catch (err) {
      console.error('[handleCompile] Error al compilar:', err.message, err);
      setCompileError(err.message);
      setCompiledComponent(null);
    }
  }, []);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const isPdf = file.type === 'application/pdf';
    setReferenceAttachment({ url: null, isPdf, name: file.name, uploading: true, error: false });
    const url = await notaPedidoService.uploadReferenceImage({ file, empresaId });
    if (url) {
      setReferenceAttachment({ url, isPdf, name: file.name, uploading: false, error: false });
    } else {
      setReferenceAttachment((prev) => prev ? { ...prev, uploading: false, error: true } : null);
    }
  }, [empresaId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || referenceAttachment?.uploading) return;
    setInput('');
    const imageToSend = referenceAttachment?.url || null;
    setReferenceAttachment(null);

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    const result = await notaPedidoService.aiChatPlantilla({
      messages: nextMessages,
      empresaId,
      currentCode: currentCode || null,
      referenceImageDataUrl: imageToSend || null,
    });

    if (result) {
      console.log('[handleSend] Respuesta IA →', { hasMessage: !!result.message, hasCode: !!result.code, codeLength: result.code?.length });
      const aiMessage = { role: 'assistant', content: result.message };
      setMessages((prev) => [...prev, aiMessage]);
      if (result.code) {
        setCurrentCode(result.code);
        await handleCompile(result.code);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Hubo un error al contactar al asistente. Intentá de nuevo.' },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [input, loading, messages, empresaId, handleCompile, referenceAttachment]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSave = async () => {
    if (!currentCode || !templateName.trim()) return;
    setSaving(true);
    try {
      let previewFile = null;
      if (previewImageRef.current) {
        const blob = await fetch(previewImageRef.current).then((r) => r.blob());
        previewFile = new File([blob], 'preview.jpg', { type: 'image/jpeg' });
      }

      const [componentUrl, previewImageUrl] = await Promise.all([
        notaPedidoService.saveComponentPlantilla({ code: currentCode, empresaId }),
        previewFile
          ? notaPedidoService.uploadReferenceImage({ file: previewFile, empresaId })
          : Promise.resolve(null),
      ]);

      if (!componentUrl) throw new Error('No se pudo guardar el componente');

      const template = await notaPedidoService.createPdfTemplate({
        empresa_id: empresaId,
        nombre: templateName.trim(),
        component_url: componentUrl,
        ...(previewImageUrl && { preview_image_url: previewImageUrl }),
        activa: true,
      });

      onSaved?.(template);
      onClose();
    } catch (err) {
      console.error('handleSave plantilla', err);
    } finally {
      setSaving(false);
    }
  };

  const previewKey = useMemo(() => {
    if (!CompiledComponent) return null;
    return `preview-${previewVersion}`;
  }, [CompiledComponent, previewVersion]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AutoFixHighIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
          Diseñar plantilla PDF con IA
        </Typography>
        <IconButton size="small" onClick={onClose} disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* ─── Panel izquierdo: chat ─── */}
        <Box
          sx={{
            width: { xs: '100%', md: '38%' },
            display: 'flex',
            flexDirection: 'column',
            borderRight: { md: '1px solid' },
            borderColor: { md: 'divider' },
            overflow: 'hidden',
          }}
        >
          {/* Historial de mensajes */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </Box>

          <Divider />

          {/* Área de composición */}
          <Box sx={{ p: 1.5 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />

            {/* Composer: textarea + imagen adjunta + barra de acciones */}
            <Paper
              variant="outlined"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                '&:focus-within': { borderColor: 'primary.main' },
              }}
            >
              <InputBase
                inputRef={inputRef}
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                placeholder="Describí cómo querés el PDF..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || saving}
                sx={{
                  px: 1.5,
                  pt: 1.25,
                  pb: 0.75,
                  fontSize: 14,
                  alignItems: 'flex-start',
                  '& textarea': { lineHeight: 1.55 },
                }}
              />

              {/* Archivo adjunto */}
              {referenceAttachment && (
                <Box sx={{ px: 1.25, pb: 0.75 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 0.75,
                      py: 0.5,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: referenceAttachment.error ? 'error.light' : 'primary.light',
                      bgcolor: referenceAttachment.error ? 'rgba(211,47,47,0.06)' : 'rgba(25,118,210,0.06)',
                      maxWidth: '100%',
                    }}
                  >
                    {referenceAttachment.uploading ? (
                      <CircularProgress size={20} sx={{ flexShrink: 0, my: 0.25 }} />
                    ) : referenceAttachment.url ? (
                      <Box
                        component="img"
                        src={referenceAttachment.url}
                        alt=""
                        sx={{
                          width: 32,
                          height: 32,
                          objectFit: 'cover',
                          borderRadius: 0.75,
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    ) : referenceAttachment.isPdf ? (
                      <PictureAsPdfOutlinedIcon sx={{ fontSize: 20, color: 'error.light', flexShrink: 0 }} />
                    ) : (
                      <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        color={referenceAttachment.error ? 'error.main' : referenceAttachment.uploading ? 'text.secondary' : 'text.primary'}
                        sx={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130, fontWeight: referenceAttachment.url ? 500 : 400 }}
                      >
                        {referenceAttachment.error ? 'Error al subir' : referenceAttachment.uploading ? 'Subiendo...' : referenceAttachment.name}
                      </Typography>
                      {!referenceAttachment.error && !referenceAttachment.uploading && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                          {referenceAttachment.isPdf ? 'PDF convertido a imagen' : 'Imagen de referencia'}
                        </Typography>
                      )}
                    </Box>
                    {!referenceAttachment.uploading && (
                      <IconButton size="small" onClick={() => setReferenceAttachment(null)} sx={{ p: 0.25, ml: 0.25, flexShrink: 0 }}>
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              )}

              <Divider />

              {/* Barra de acciones */}
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.625, gap: 0.5 }}>
                <Tooltip title="Adjuntar imagen o PDF de referencia">
                  <span>
                    <IconButton
                      size="small"
                      disabled={loading || saving || !!referenceAttachment?.uploading}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        color: (referenceAttachment && !referenceAttachment.error) ? 'primary.main' : 'text.disabled',
                        '&:not(.Mui-disabled):hover': { color: 'text.primary' },
                      }}
                    >
                      <AddPhotoAlternateOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Enviar (Enter)">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Enviar mensaje"
                      disabled={!input.trim() || loading || saving || !!referenceAttachment?.uploading}
                      onClick={handleSend}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        width: 28,
                        height: 28,
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': {
                          bgcolor: 'action.disabledBackground',
                          color: 'action.disabled',
                        },
                      }}
                    >
                      <SendIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Paper>
          </Box>

          <Divider />

          {/* Guardar plantilla */}
          <Box sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Nombre de la plantilla"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={saving || !currentCode}
                sx={{ flex: 1 }}
              />
              <Tooltip title={!currentCode ? 'Primero generá un diseño con la IA' : ''}>
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                    disabled={saving || !currentCode || !templateName.trim()}
                    onClick={handleSave}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Guardar
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        {/* ─── Panel derecho: preview PDF ─── */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            bgcolor: 'grey.100',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ flex: 1 }}>
              Vista previa en tiempo real
              {compileError && (
                <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1 }}>
                  — Error: {compileError}
                </Typography>
              )}
            </Typography>
            <Chip
              label={CompiledComponent ? 'Diseño personalizado' : 'Plantilla base'}
              size="small"
              color={CompiledComponent ? 'primary' : 'default'}
              variant={CompiledComponent ? 'filled' : 'outlined'}
              sx={{ fontSize: 10, height: 20 }}
            />
          </Box>

          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {loading ? (
              <PdfPageSkeleton />
            ) : !CompiledComponent ? (
              <NotaPedidoPdfBasePreviewInner nota={nota} logoDataUrl={logoDataUrl} empresaNombre="" />
            ) : (
              <NotaPedidoPdfPreviewInner
                key={previewKey}
                PlantillaPDF={CompiledComponent}
                nota={nota}
                logoDataUrl={logoDataUrl}
                empresaNombre=""
                onImageReady={handlePreviewImageReady}
              />
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
