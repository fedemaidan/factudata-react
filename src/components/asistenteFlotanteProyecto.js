// src/components/AsistenteFlotanteProyecto.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Paper, Stack, IconButton, TextField, Typography, Button, CircularProgress,
  Divider, Avatar, Tooltip
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

import asistenteService from 'src/services/asistenteService';

// Util: serializea "lo suficiente" sin mandar todo el universo
function buildContextSnapshot(props) {
  const {
    empresa,
    proyecto,
    filtros,
    movimientos,
    movimientosUSD,
    cajasVirtuales,
    visibleCols,
    compactCols,
    totalesDetallados,
    totalesUsdBlue,
  } = props || {};

  const pickMov = (m) => ({
    id: m.id,
    type: m.type,
    moneda: m.moneda,
    total: m.total,
    categoria: m.categoria,
    subcategoria: m.subcategoria,
    medio_pago: m.medio_pago,
    proveedor: m.nombre_proveedor,
    obra: m.obra,
    cliente: m.cliente,
    observacion: m.observacion,
    fecha_factura: m.fecha_factura,
    fecha_creacion: m.fecha_creacion,
    estado: m.estado,
    equivalencias: m.equivalencias?.total ? {
      usd_blue: m.equivalencias.total.usd_blue,
      usd_mep_medio: m.equivalencias.total.usd_mep_medio
    } : undefined
  });

  return {
    empresa: empresa ? {
      id: empresa.id,
      nombre: empresa.nombre,
      medios_pago: empresa.medios_pago,
      con_estados: empresa.con_estados,
    } : null,
    proyecto: proyecto ? { id: proyecto.id, nombre: proyecto.nombre } : null,
    filtros: filtros || {},
    // mandamos un recorte para no matar al modelo
    movimientos_sample_ars: (movimientos || []).slice(0, 60).map(pickMov),
    movimientos_sample_usd: (movimientosUSD || []).slice(0, 60).map(pickMov),
    resumen_totales: totalesDetallados || {},
    resumen_usd_blue: totalesUsdBlue || {},
    cajas: (cajasVirtuales || []).slice(0, 20),
    ui: {
      compactCols: !!compactCols,
      visibleCols: visibleCols || {}
    }
  };
}

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

export default function AsistenteFlotanteProyecto(props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    text: 'Hola 👋 Soy tu asistente del proyecto. Puedo explicarte totales, buscar movimientos, generar filtros, o darte atajos. Preguntame algo como "mostrame egresos de hormigón del mes" o "¿cuánto es el neto en USD blue?".'
  }]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const snap = useMemo(() => buildContextSnapshot(props), [props]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, msgs, loading]);

  const send = async () => {
    const t = (text || '').trim();
    if (!t || loading) return;

    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setText('');
    setLoading(true);
    try {
      const resp = await asistenteService.askProyectoAssistant({
        context: snap,
        messages: msgs.concat([{ role: 'user', text: t }]),
      });
      const reply = resp?.reply || 'No pude responder ahora.';
      setMsgs((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (e) {
      console.error('asistente error', e);
      setMsgs((m) => [...m, { role: 'assistant', text: 'Ocurrió un error al consultar la IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <Tooltip title="Asistente IA">
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
          <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.25 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', color: 'primary.contrastText' }}>A</Avatar>
            <Typography variant="subtitle1" sx={{ flex: 1 }} noWrap>Asistente del Proyecto (Versión BETA)</Typography>
            <IconButton size="small" onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider />

          <Stack
            ref={listRef}
            spacing={1.25}
            sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 2, pb: 1, bgcolor: 'background.default' }}
          >
            {msgs.map((m, i) => (
              <Stack key={i} sx={bubbleSx(m.role === 'user')}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                  {m.text}
                </Typography>
              </Stack>
            ))}
            {loading && (
              <Stack sx={bubbleSx(false)} direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={16} />
                <Typography variant="body2">Pensando…</Typography>
              </Stack>
            )}
          </Stack>

          <Divider />

          <Stack spacing={1} sx={{ p: 1.25 }}>
            <TextField
              placeholder='Ej: "mostrá egresos de materiales de julio" o "¿cuál es el neto en USD blue?"'
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
              <Button variant="contained" endIcon={<SendIcon />} onClick={send} disabled={!text.trim() || loading}>
                Enviar
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </>
  );
}
