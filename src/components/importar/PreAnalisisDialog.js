import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, TextField, Box, Paper,
  RadioGroup, Radio, FormControlLabel, CircularProgress,
  alpha, LinearProgress, IconButton
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';

/**
 * Diálogo de pre-análisis inteligente — modo examen (1 pregunta a la vez).
 */
export default function PreAnalisisDialog({ 
  open, onClose, cargandoAnalisis, resumenDocumento, preguntas = [], onConfirmar 
}) {
  const [respuestas, setRespuestas] = useState({});
  const [textosLibres, setTextosLibres] = useState({});
  // Índice actual: 0..N-1 = preguntas, N = resumen final
  const [indicePregunta, setIndicePregunta] = useState(-1); // -1 = intro/resumen doc

  const totalPreguntas = preguntas.length;
  const enResumenFinal = indicePregunta >= totalPreguntas;
  const preguntaActual = preguntas[indicePregunta] || null;

  const preguntasRespondidas = useMemo(
    () => Object.keys(respuestas).filter(k => !!respuestas[k]).length,
    [respuestas]
  );

  const handleSeleccionar = (preguntaId, valor) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }));
  };

  const handleTextoLibre = (preguntaId, texto) => {
    setTextosLibres(prev => ({ ...prev, [preguntaId]: texto }));
    if (texto.trim()) {
      setRespuestas(prev => ({ ...prev, [preguntaId]: '__libre__' }));
    }
  };

  const avanzar = () => {
    if (indicePregunta < totalPreguntas) setIndicePregunta(i => i + 1);
  };
  const retroceder = () => {
    if (indicePregunta > -1) setIndicePregunta(i => i - 1);
  };
  const irAPregunta = (idx) => setIndicePregunta(idx);

  const obtenerTextoRespuesta = (p) => {
    const resp = respuestas[p.id];
    if (!resp) return null;
    if (resp === '__libre__') return textosLibres[p.id]?.trim() || null;
    return p.opciones?.find(o => o.valor === resp)?.label || resp;
  };

  const handleConfirmar = () => {
    const partes = [];
    preguntas.forEach(p => {
      const texto = obtenerTextoRespuesta(p);
      if (texto) partes.push(`${p.pregunta} → ${texto}`);
    });
    onConfirmar(partes.join('\n'));
    resetState();
  };

  const handleSinContexto = () => {
    resetState();
    onConfirmar('');
  };

  const resetState = () => {
    setRespuestas({});
    setTextosLibres({});
    setIndicePregunta(-1);
  };

  const preguntaRespondida = preguntaActual ? !!respuestas[preguntaActual.id] : false;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <SmartToyIcon color="primary" fontSize="small" />
        Pre-análisis del documento
      </DialogTitle>

      {/* Barra de progreso */}
      {!cargandoAnalisis && totalPreguntas > 0 && (
        <LinearProgress
          variant="determinate"
          value={enResumenFinal ? 100 : ((indicePregunta + 1) / (totalPreguntas + 1)) * 100}
          sx={{ height: 3 }}
        />
      )}

      <DialogContent dividers sx={{ p: 0, minHeight: 280 }}>
        {/* Estado: cargando */}
        {cargandoAnalisis && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Analizando el documento...
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Estamos mirando el documento para hacerte preguntas relevantes
            </Typography>
          </Box>
        )}

        {/* Estado: sin preguntas */}
        {!cargandoAnalisis && totalPreguntas === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {resumenDocumento || 'No se pudieron generar preguntas sobre el documento.'}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Podés procesar sin contexto o cancelar e intentar de nuevo.
            </Typography>
          </Box>
        )}

        {/* Intro: resumen del documento */}
        {!cargandoAnalisis && totalPreguntas > 0 && indicePregunta === -1 && (
          <Box sx={{ p: 3 }}>
            {resumenDocumento && (
              <Paper sx={{ 
                p: 2.5, mb: 2, bgcolor: alpha('#6366f1', 0.06), 
                border: '1px solid', borderColor: alpha('#6366f1', 0.15),
                borderRadius: 2
              }}>
                <Typography variant="caption" color="primary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                  Documento detectado
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {resumenDocumento}
                </Typography>
              </Paper>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              Vamos a hacerte <strong>{totalPreguntas} pregunta{totalPreguntas > 1 ? 's' : ''}</strong> para 
              entender mejor cómo procesar este documento.
            </Typography>
          </Box>
        )}

        {/* Pregunta individual */}
        {!cargandoAnalisis && preguntaActual && !enResumenFinal && (
          <Box sx={{ p: 3 }}>
            {/* Indicador de progreso */}
            <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
              Pregunta {indicePregunta + 1} de {totalPreguntas}
            </Typography>

            {/* Pregunta */}
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2.5 }}>
              <Box sx={{ 
                width: 28, height: 28, borderRadius: '50%', 
                bgcolor: preguntaRespondida ? 'success.main' : 'primary.main',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, mt: 0.25
              }}>
                {preguntaRespondida ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : indicePregunta + 1}
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {preguntaActual.pregunta}
                </Typography>
                {preguntaActual.contexto && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    {preguntaActual.contexto}
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Opciones */}
            <Box sx={{ pl: 5 }}>
              <RadioGroup
                value={respuestas[preguntaActual.id] || ''}
                onChange={(e) => handleSeleccionar(preguntaActual.id, e.target.value)}
              >
                {preguntaActual.opciones?.map(opcion => (
                  <FormControlLabel
                    key={opcion.valor}
                    value={opcion.valor}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">{opcion.label}</Typography>}
                    sx={{ mb: 0.5, ml: 0 }}
                  />
                ))}
                <FormControlLabel
                  value="__libre__"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Otra respuesta...
                    </Typography>
                  }
                  sx={{ mb: 0, ml: 0 }}
                />
              </RadioGroup>

              {respuestas[preguntaActual.id] === '__libre__' && (
                <TextField
                  placeholder="Escribí tu respuesta..."
                  fullWidth size="small" multiline minRows={1} maxRows={3}
                  value={textosLibres[preguntaActual.id] || ''}
                  onChange={e => handleTextoLibre(preguntaActual.id, e.target.value)}
                  variant="outlined" sx={{ mt: 1 }} autoFocus
                />
              )}
            </Box>
          </Box>
        )}

        {/* Resumen final */}
        {!cargandoAnalisis && totalPreguntas > 0 && enResumenFinal && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Resumen de tus respuestas ({preguntasRespondidas}/{totalPreguntas})
            </Typography>

            <Stack spacing={1}>
              {preguntas.map((p, idx) => {
                const texto = obtenerTextoRespuesta(p);
                return (
                  <Paper
                    key={p.id}
                    sx={{ 
                      p: 1.5, borderRadius: 1,
                      border: '1px solid', 
                      borderColor: texto ? alpha('#10b981', 0.3) : 'grey.200',
                      bgcolor: texto ? alpha('#10b981', 0.04) : 'grey.50',
                      display: 'flex', alignItems: 'flex-start', gap: 1
                    }}
                  >
                    <Box sx={{ 
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, mt: 0.2,
                      bgcolor: texto ? 'success.main' : 'grey.300',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700
                    }}>
                      {texto ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : idx + 1}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ display: 'block' }}>
                        {p.pregunta}
                      </Typography>
                      <Typography variant="caption" color={texto ? 'success.dark' : 'text.disabled'}>
                        {texto || 'Sin respuesta'}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => irAPregunta(idx)} sx={{ mt: -0.5 }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {/* Izquierda */}
        <Box>
          {!cargandoAnalisis && totalPreguntas > 0 && indicePregunta > -1 && (
            <Button onClick={retroceder} color="inherit" size="small" startIcon={<ArrowBackIcon />}>
              {indicePregunta === 0 ? 'Intro' : 'Anterior'}
            </Button>
          )}
        </Box>

        {/* Derecha */}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} color="inherit" size="small">Cancelar</Button>

          {/* Intro → Comenzar */}
          {!cargandoAnalisis && totalPreguntas > 0 && indicePregunta === -1 && (
            <>
              <Button onClick={handleSinContexto} color="inherit" size="small">
                Saltar preguntas
              </Button>
              <Button onClick={avanzar} variant="contained" size="small" startIcon={<ArrowForwardIcon />}>
                Comenzar
              </Button>
            </>
          )}

          {/* En pregunta → Siguiente / Ir a resumen */}
          {!cargandoAnalisis && preguntaActual && !enResumenFinal && (
            <Button
              onClick={avanzar}
              variant={preguntaRespondida ? 'contained' : 'outlined'}
              size="small"
              endIcon={<ArrowForwardIcon />}
            >
              {indicePregunta === totalPreguntas - 1 ? 'Ver resumen' : 'Siguiente'}
            </Button>
          )}

          {/* Sin preguntas → Procesar sin contexto */}
          {!cargandoAnalisis && totalPreguntas === 0 && (
            <Button onClick={handleSinContexto} variant="contained" size="small">
              Procesar sin contexto
            </Button>
          )}

          {/* Resumen final → Enviar */}
          {enResumenFinal && (
            <>
              <Button onClick={handleSinContexto} color="inherit" size="small">
                Sin contexto
              </Button>
              <Button
                onClick={handleConfirmar}
                variant="contained" size="small"
                disabled={preguntasRespondidas === 0}
                startIcon={<SendIcon />}
              >
                Procesar con contexto
              </Button>
            </>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
