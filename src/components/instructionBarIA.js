import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Paper, Stack, IconButton, TextField, Typography, Button, CircularProgress, Divider, Avatar, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';

const bubbleSx = (mine) => ({
  alignSelf: mine ? 'flex-end' : 'flex-start',
  maxWidth: '88%',
  px: 1.5,
  py: 1,
  borderRadius: 2,
  bgcolor: mine ? 'primary.main' : 'grey.100',
  color: mine ? 'primary.contrastText' : 'text.primary',
  boxShadow: mine ? 2 : 0,
  wordBreak: 'break-word',
});

export default function InstructionBarIA({
  acopioId,
  items,
  setItems,
  onResumen,
  // opcional: pasar “tipoAcopio” si te sirve en el backend
  tipoAcopio = 'materiales',
  moneda = 'ARS',
}) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: 'assistant',
      text:
        'Hola 👋 Soy tu asistente para editar el remito.\n' +
        'Podés decir: "agregá 4 bolsas cemento a 12500", "borrá línea 2", ' +
        '"cambiá precio de hierro 8 a 9990", o "aplicá 10% de descuento a todo".',
    },
  ]);
  const listRef = useRef(null);

  const disabled = useMemo(() => loading || !acopioId, [loading, acopioId]);

  useEffect(() => {
    if (!open) return;
    // auto-scroll al último mensaje
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, msgs, loading]);

  const send = async () => {
    const t = text.trim();
    if (!t || disabled) return;

    // pinta el mensaje del usuario
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setText('');
    setLoading(true);

    try {
      const svc = (await import('src/services/acopioService')).default;
      const resp = await svc.interpretarInstruccionRemito(
        acopioId,
        t,
        items,
        { moneda, tipoAcopio } // lo recibe el backend por si necesita lógica distinta
      );

      // aplica cambios al remito si vienen
      if (resp?.items) setItems(resp.items);

      // arma un resumen "lindo"
      const resumen =
        resp?.resumen ||
        (resp?.ok
          ? 'Listo, apliqué los cambios al remito.'
          : 'No pude interpretar esa instrucción.');

      let detalles = '';
      if (Array.isArray(resp?.cambios) && resp.cambios.length) {
        const bullets = resp.cambios
          .slice(0, 8)
          .map((c) => {
            const t = c?.tipo || 'cambio';
            const ix = typeof c?.indice === 'number' ? ` (línea ${c.indice + 1})` : '';
            return `• ${t}${ix}`;
          })
          .join('\n');
        detalles = `\n\n${bullets}`;
      }

      setMsgs((m) => [...m, { role: 'assistant', text: `${resumen}${detalles}` }]);
      if (onResumen) onResumen(resumen);
    } catch (e) {
      console.error('interpretarInstruccionRemito error', e);
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: 'Ocurrió un problema al aplicar la instrucción.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // enter para enviar / shift+enter para salto de línea
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Botón flotante “IA” */}
      {!open && (
        <Tooltip title="Instrucciones con IA">
          <IconButton
            onClick={() => setOpen(true)}
            size="large"
            sx={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 1300,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: 4,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <ChatBubbleOutlineIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Panel flotante estilo chat */}
      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            right: { xs: 12, sm: 16, md: 24 },
            bottom: { xs: 12, sm: 16, md: 24 },
            width: { xs: 'calc(100% - 24px)', sm: 420, md: 440 },
            height: { xs: 520, sm: 560 },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            zIndex: 1300,
          }}
        >
          {/* header */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5 }}>
            <Avatar
              sx={{ width: 28, height: 28, bgcolor: 'primary.main', color: 'primary.contrastText' }}
            >
              <KeyboardDoubleArrowUpIcon fontSize="small" />
            </Avatar>
            <Stack flex={1} minWidth={0}>
              <Typography variant="subtitle1" noWrap>
                Asistente IA del Remito
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Escribí qué querés cambiar; yo lo aplico.
              </Typography>
            </Stack>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider />

          {/* mensajes */}
          <Stack
            ref={listRef}
            spacing={1.5}
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 2,
              pt: 2,
              pb: 1,
              bgcolor: 'background.default',
            }}
          >
            {msgs.map((m, i) => (
              <Stack key={i} sx={bubbleSx(m.role === 'user')}>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}
                >
                  {m.text}
                </Typography>
              </Stack>
            ))}
            {loading && (
              <Stack sx={bubbleSx(false)} direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={16} />
                <Typography variant="body2">Aplicando cambios…</Typography>
              </Stack>
            )}
          </Stack>

          <Divider />

          {/* input */}
          <Stack spacing={1} sx={{ p: 1.5 }}>
            <TextField
              placeholder='Ej: "agregá 4 bolsas cemento a 12500" o "borrá línea 2"'
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              multiline
              minRows={2}
              maxRows={6}
              fullWidth
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Enter para enviar • Shift+Enter para nueva línea
              </Typography>
              <Button
                variant="contained"
                endIcon={<SendIcon />}
                onClick={send}
                disabled={disabled || !text.trim()}
              >
                {loading ? 'Aplicando…' : 'Aplicar'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </>
  );
}
