import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { keyframes } from '@emotion/react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider,
  IconButton, InputBase, MenuItem, Paper, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import pdfPlantillaService from 'src/services/pdfPlantillaService';
import { compilePlantillaComponent } from 'src/utils/plantillasPdf/compilePlantillaComponent';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
`;

const PdfPlantillaPreviewInner = dynamic(() => import('./PdfPlantillaPreviewInner'), {
  ssr: false,
  loading: () => (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={28} />
    </Box>
  ),
});

const GREETING = '¡Hola! Diseñá tu plantilla describiendo lo que querés — por ejemplo "agregá el logo más grande", "colores sobrios", "una columna con el acumulado" — o adjuntá una imagen de referencia. Te muestro la vista previa en tiempo real.';

const MODO_LABELS = { nominal: 'Pesos nominales', cac: 'CAC a hoy', usd: 'USD' };

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TypingIndicator({ label }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5, alignItems: 'center' }}>
      <Box sx={{ mr: 1, color: 'primary.main', flexShrink: 0 }}>
        <SmartToyOutlinedIcon fontSize="small" />
      </Box>
      <Paper variant="outlined" sx={{ px: 1.5, py: 0.875, borderRadius: '4px 12px 12px 12px', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled', animation: `${dotBounce} 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
        ))}
        {label && <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{label}</Typography>}
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
          px: 1.5, py: 1, maxWidth: '85%',
          bgcolor: isAI ? 'background.paper' : 'primary.main',
          color: isAI ? 'text.primary' : 'primary.contrastText',
          borderColor: isAI ? 'divider' : 'primary.main',
          borderRadius: isAI ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      >
        <Typography variant="body2">{content}</Typography>
      </Paper>
    </Box>
  );
}

export default function PdfPlantillaChatDialog({
  open,
  onClose,
  empresaId,
  documentType,
  sampleData,
  buildSampleData = null,
  sampleDataModes = [],
  defaultDocumentLoader,
  empresaNombre = '',
  logos = [],
  initialTemplate = null,
  onSaved,
}) {
  const mostrarSelectorModo = typeof buildSampleData === 'function' && sampleDataModes.length > 1;
  const [modo, setModo] = useState(sampleDataModes[0] || 'nominal');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [currentCode, setCurrentCode] = useState(null);
  const [CompiledComponent, setCompiledComponent] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [compileError, setCompileError] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedLogoId, setSelectedLogoId] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null); // { dataUrl, name }
  const [saving, setSaving] = useState(false);
  const [DefaultComponent, setDefaultComponent] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewImageRef = useRef(null);
  const awaitingCorrectionRef = useRef(null);

  const isEdit = !!initialTemplate?._id;

  // ── Apertura / reset ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setMessages([]); setInput(''); setLoading(false); setCorrecting(false);
      setCurrentCode(null); setCompiledComponent(null); setCompileError(null);
      setTemplateName(''); setReferenceImage(null);
      previewImageRef.current = null; awaitingCorrectionRef.current = null;
      return;
    }
    setMessages([{ role: 'assistant', content: GREETING }]);
    setModo(sampleDataModes[0] || 'nominal');
    setTemplateName(initialTemplate?.nombre || '');
    setSelectedLogoId(initialTemplate?.logo_id || (logos[0]?._id ?? ''));
    if (isEdit) {
      (async () => {
        const code = await pdfPlantillaService.getComponentCode(initialTemplate._id);
        if (code) {
          setCurrentCode(code);
          try {
            const Comp = await compilePlantillaComponent(code);
            setCompiledComponent(() => Comp);
            setPreviewVersion((v) => v + 1);
          } catch (e) { setCompileError(e.message); }
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Carga client-only del documento por defecto (evita @react-pdf en SSR) ──
  useEffect(() => {
    if (!open || !defaultDocumentLoader) return undefined;
    let cancelled = false;
    Promise.resolve(defaultDocumentLoader())
      .then((Comp) => { if (!cancelled) setDefaultComponent(() => Comp); })
      .catch((e) => console.error('No se pudo cargar la plantilla por defecto', e));
    return () => { cancelled = true; };
  }, [open, defaultDocumentLoader]);

  // ── Logo seleccionado → dataUrl para preview ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const logo = logos.find((l) => l._id === selectedLogoId);
    if (!logo?.url) { setLogoDataUrl(null); return; }
    loadImageAsDataUrl(logo.url).then((d) => { if (!cancelled) setLogoDataUrl(d); });
    return () => { cancelled = true; };
  }, [selectedLogoId, logos]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, correcting]);

  const handleCompile = useCallback(async (code) => {
    setCompileError(null);
    try {
      const Component = await compilePlantillaComponent(code);
      setCompiledComponent(() => Component);
      setPreviewVersion((v) => v + 1);
    } catch (err) {
      setCompileError(err.message);
      setCompiledComponent(null);
    }
  }, []);

  // ── Corrector con visión (se dispara cuando hay imagen renderizada) ────────
  const runCorrection = useCallback(async (code, imageSrc) => {
    setCorrecting(true);
    const improved = await pdfPlantillaService.aiCorrect({ code, empresaId, documentType, previewImageDataUrl: imageSrc });
    setCorrecting(false);
    if (improved && improved !== code) {
      setCurrentCode(improved);
      await handleCompile(improved);
    }
  }, [empresaId, documentType, handleCompile]);

  const handlePreviewImageReady = useCallback((src) => {
    previewImageRef.current = src;
    const codeToCorrect = awaitingCorrectionRef.current;
    if (codeToCorrect) {
      awaitingCorrectionRef.current = null;
      runCorrection(codeToCorrect, src);
    }
  }, [runCorrection]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await readFileAsDataUrl(file);
    setReferenceImage({ dataUrl, name: file.name });
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || correcting) return;
    setInput('');
    const refImg = referenceImage?.dataUrl || null;
    setReferenceImage(null);

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setLoading(true);

    const result = await pdfPlantillaService.aiChat({
      messages: nextMessages,
      empresaId,
      documentType,
      currentCode: currentCode || null,
      referenceImageDataUrl: refImg,
      modo,
      modosDisponibles: sampleDataModes,
    });
    setLoading(false);

    if (result) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message }]);
      // La IA puede sugerir el modo de moneda (nominal/cac/usd); movemos el selector.
      if (result.modo && sampleDataModes.includes(result.modo)) setModo(result.modo);
      if (result.code) {
        awaitingCorrectionRef.current = result.code; // disparará el corrector al renderizar
        setCurrentCode(result.code);
        await handleCompile(result.code);
      }
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Hubo un error al contactar al asistente. Intentá de nuevo.' }]);
    }
    inputRef.current?.focus();
  }, [input, loading, correcting, messages, empresaId, documentType, currentCode, handleCompile, referenceImage, modo, sampleDataModes]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSave = async () => {
    if (!currentCode || !templateName.trim()) return;
    setSaving(true);
    try {
      const [componentUrl, previewImageUrl] = await Promise.all([
        pdfPlantillaService.saveComponent({ code: currentCode, empresaId, documentType }),
        previewImageRef.current
          ? pdfPlantillaService.savePreview({ dataUrl: previewImageRef.current, empresaId, documentType })
          : Promise.resolve(null),
      ]);
      if (!componentUrl) throw new Error('No se pudo guardar el componente');

      const body = {
        empresa_id: empresaId,
        document_type: documentType,
        nombre: templateName.trim(),
        component_url: componentUrl,
        logo_id: selectedLogoId || null,
        activa: true,
        ...(previewImageUrl && { preview_image_url: previewImageUrl }),
      };

      const saved = isEdit
        ? await pdfPlantillaService.actualizar(initialTemplate._id, body)
        : await pdfPlantillaService.crear(body);

      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error('handleSave plantilla', err);
    } finally {
      setSaving(false);
    }
  };

  const PreviewComponent = CompiledComponent || DefaultComponent;
  const previewData = buildSampleData ? buildSampleData(modo) : sampleData;
  const previewKey = useMemo(() => `preview-${previewVersion}-${selectedLogoId}-${logoDataUrl ? 1 : 0}-${modo}`, [previewVersion, selectedLogoId, logoDataUrl, modo]);
  const busy = loading || correcting;

  return (
    <Dialog open={open} onClose={busy || saving ? undefined : onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '92vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AutoFixHighIcon color="primary" fontSize="small" />
        <Typography component="span" variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
          {isEdit ? 'Editar plantilla' : 'Diseñar plantilla con IA'}
        </Typography>
        <IconButton size="small" onClick={onClose} disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* ─── Panel izquierdo: chat ─── */}
        <Box sx={{ width: { xs: '100%', md: '40%' }, display: 'flex', flexDirection: 'column', borderRight: { md: '1px solid' }, borderColor: { md: 'divider' }, overflow: 'hidden' }}>
          {/* Selector de logo */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <TextField
              select size="small" fullWidth label="Logo del documento"
              value={selectedLogoId}
              onChange={(e) => setSelectedLogoId(e.target.value)}
              helperText={logos.length === 0 ? 'Subí un logo en la sección "Logos" para usarlo acá.' : ' '}
            >
              <MenuItem value="">Sin logo</MenuItem>
              {logos.map((l) => (
                <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Divider />

          {/* Mensajes */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
            {messages.map((msg, i) => <ChatBubble key={i} role={msg.role} content={msg.content} />)}
            {loading && <TypingIndicator label="Diseñando…" />}
            {correcting && <TypingIndicator label="Puliendo el diseño…" />}
            <div ref={bottomRef} />
          </Box>
          <Divider />

          {/* Composer */}
          <Box sx={{ p: 1.5 }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden', '&:focus-within': { borderColor: 'primary.main' } }}>
              <InputBase
                inputRef={inputRef} fullWidth multiline minRows={2} maxRows={4}
                placeholder="Describí cómo querés el documento…"
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                disabled={busy || saving}
                sx={{ px: 1.5, pt: 1.25, pb: 0.75, fontSize: 14, alignItems: 'flex-start', '& textarea': { lineHeight: 1.55 } }}
              />
              {referenceImage && (
                <Box sx={{ px: 1.25, pb: 0.75 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 0.75, py: 0.5, borderRadius: 1.5, border: '1px solid', borderColor: 'primary.light', bgcolor: 'rgba(25,118,210,0.06)' }}>
                    <Box component="img" src={referenceImage.dataUrl} alt="" sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 0.75, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{referenceImage.name}</Typography>
                    <IconButton size="small" onClick={() => setReferenceImage(null)} sx={{ p: 0.25 }}>
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.625, gap: 0.5 }}>
                <Tooltip title="Adjuntar imagen de referencia">
                  <span>
                    <IconButton size="small" disabled={busy || saving} onClick={() => fileInputRef.current?.click()} sx={{ color: referenceImage ? 'primary.main' : 'text.disabled' }}>
                      <AddPhotoAlternateOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Enviar (Enter)">
                  <span>
                    <IconButton size="small" aria-label="Enviar mensaje" disabled={!input.trim() || busy || saving} onClick={handleSend}
                      sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 28, height: 28, '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' } }}>
                      <SendIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Paper>
          </Box>
          <Divider />

          {/* Guardar */}
          <Box sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" placeholder="Nombre de la plantilla" value={templateName} onChange={(e) => setTemplateName(e.target.value)} disabled={saving} sx={{ flex: 1 }} />
              <Tooltip title={!currentCode ? 'Primero generá un diseño con la IA' : ''}>
                <span>
                  <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                    disabled={saving || busy || !currentCode || !templateName.trim()} onClick={handleSave} sx={{ whiteSpace: 'nowrap' }}>
                    {isEdit ? 'Guardar cambios' : 'Guardar'}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        {/* ─── Panel derecho: preview ─── */}
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: 'grey.100', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ flex: 1 }}>
              Vista previa en tiempo real
              {compileError && (
                <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1 }}>— Error: {compileError}</Typography>
              )}
            </Typography>
            {mostrarSelectorModo && (
              <Tooltip title="Moneda con la que se muestran los importes" arrow>
                <ToggleButtonGroup
                  value={modo}
                  exclusive
                  size="small"
                  onChange={(e, v) => { if (v) setModo(v); }}
                  sx={{ '& .MuiToggleButton-root': { fontSize: 10, py: 0.2, px: 1, textTransform: 'none' } }}
                >
                  {sampleDataModes.map((m) => (
                    <ToggleButton key={m} value={m}>{MODO_LABELS[m] || m}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Tooltip>
            )}
            <Chip label={CompiledComponent ? 'Diseño personalizado' : 'Plantilla por defecto'} size="small" color={CompiledComponent ? 'primary' : 'default'} variant={CompiledComponent ? 'filled' : 'outlined'} sx={{ fontSize: 10, height: 20 }} />
          </Box>
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {PreviewComponent ? (
              <PdfPlantillaPreviewInner
                key={previewKey}
                PlantillaPDF={PreviewComponent}
                data={previewData}
                logoDataUrl={logoDataUrl}
                empresaNombre={empresaNombre}
                onImageReady={handlePreviewImageReady}
              />
            ) : (
              <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
