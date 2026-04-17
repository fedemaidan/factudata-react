import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import notaPedidoService from 'src/services/notaPedidoService';

const NotaPedidoPdfPreviewInner = dynamic(
  () => import('./NotaPedidoPdfPreviewInner'),
  { ssr: false, loading: () => <CircularProgress sx={{ m: 'auto', display: 'block', mt: 6 }} /> }
);

const GREETING = '¡Hola! Soy tu asistente para diseñar plantillas PDF. Describime cómo querés que se vea tu nota de pedido: colores, estilo, qué secciones mostrar, posición del logo, tipografía... Por ejemplo: "quiero un diseño minimalista con cabecera azul oscuro y logo centrado arriba".';

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

async function compileComponent(jsCode) {
  const { Document, Page, Text, View, Image, StyleSheet } = await import('@react-pdf/renderer');

  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'React', 'Document', 'Page', 'Text', 'View', 'Image', 'StyleSheet',
    `${jsCode}\nreturn typeof PlantillaPDF !== 'undefined' ? PlantillaPDF : null;`
  );

  const Component = factory(React, Document, Page, Text, View, Image, StyleSheet);
  if (!Component) throw new Error('El código no define PlantillaPDF');
  return Component;
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
  const [compileError, setCompileError] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCompile = useCallback(async (code) => {
    setCompileError(null);
    try {
      const Component = await compileComponent(code);
      setCompiledComponent(() => Component);
    } catch (err) {
      setCompileError(err.message);
      setCompiledComponent(null);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    const result = await notaPedidoService.aiChatPlantilla({
      messages: nextMessages,
      empresaId,
    });

    if (result) {
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
  }, [input, loading, messages, empresaId, handleCompile]);

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
      const url = await notaPedidoService.saveComponentPlantilla({ code: currentCode, empresaId });
      if (!url) throw new Error('No se pudo guardar el componente');

      const template = await notaPedidoService.createPdfTemplate({
        empresa_id: empresaId,
        nombre: templateName.trim(),
        component_url: url,
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
    return `${CompiledComponent.name || 'comp'}-${nota?.codigo}`;
  }, [CompiledComponent, nota]);

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
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 4, mb: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  Generando diseño...
                </Typography>
              </Box>
            )}
            <div ref={bottomRef} />
          </Box>

          <Divider />

          {/* Input */}
          <Box sx={{ p: 1.5 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder="Describí cómo querés el PDF..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || saving}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Enviar (Enter)">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!input.trim() || loading || saving}
                          onClick={handleSend}
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
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
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Vista previa en tiempo real
              {compileError && (
                <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1 }}>
                  — Error: {compileError}
                </Typography>
              )}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {!CompiledComponent && !compileError && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: 'text.disabled',
                }}
              >
                <AutoFixHighIcon sx={{ fontSize: 48 }} />
                <Typography variant="body2" textAlign="center" sx={{ maxWidth: 280 }}>
                  Describí cómo querés tu plantilla y verás el PDF aquí en tiempo real.
                </Typography>
              </Box>
            )}

            {CompiledComponent && (
              <NotaPedidoPdfPreviewInner
                key={previewKey}
                PlantillaPDF={CompiledComponent}
                nota={nota}
                logoDataUrl={logoDataUrl}
                empresaNombre=""
              />
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
