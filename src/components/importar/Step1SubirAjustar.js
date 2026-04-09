import React, { useState, useMemo } from 'react';
import { 
  Box, Button, Stack, Typography, IconButton, Paper, Collapse, Chip,
  alpha, RadioGroup, Radio, FormControlLabel, TextField, CircularProgress,
  LinearProgress
} from '@mui/material';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import TuneIcon from '@mui/icons-material/Tune';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';

export default function Step1SubirAjustar({
  archivo, setArchivo, rotation, setRotation, guideY, setGuideY, showGuide, setShowGuide,
  containerRef, draggingGuide, setDraggingGuide, onContainerKeyDown, onContainerMouseMove,
  onContainerMouseUp, onContainerLeave, onContainerTouchMove, onGuideMouseDown,
  onProcesar,
  // Pre-análisis inline
  fasePreAnalisis, preAnalisisPreguntas, preAnalisisResumen, onConfirmarPreAnalisis,
  // Extracción en curso
  extrayendo, progresoExtraccion
}) {
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [indicePregunta, setIndicePregunta] = useState(-1);
  const [respuestas, setRespuestas] = useState({});
  const [textosLibres, setTextosLibres] = useState({});

  const preguntas = preAnalisisPreguntas || [];
  const totalPregs = preguntas.length;
  const enResumen = indicePregunta >= totalPregs;
  const pregActual = preguntas[indicePregunta] || null;
  const respondidas = useMemo(() => Object.keys(respuestas).filter(k => !!respuestas[k]).length, [respuestas]);

  const obtenerTextoRespuesta = (p) => {
    const r = respuestas[p.id];
    if (!r) return 'No sabe / No contesta';
    if (r === '__libre__') return textosLibres[p.id]?.trim() || 'No sabe / No contesta';
    return p.opciones?.find(o => o.valor === r)?.label || r;
  };

  const compilarInstrucciones = () => preguntas.map(p => `${p.pregunta} → ${obtenerTextoRespuesta(p)}`).join('\n');

  // Reset cuando arranca un nuevo pre-análisis
  React.useEffect(() => {
    if (fasePreAnalisis === 'cargando') {
      setIndicePregunta(-1);
      setRespuestas({});
      setTextosLibres({});
    }
    // Cuando llegan las preguntas, entrar directo a la primera (sin pantalla intro)
    if (fasePreAnalisis === 'preguntas' && preguntas.length > 0) {
      setIndicePregunta(0);
    }
  }, [fasePreAnalisis, preguntas.length]);

  const renderPanelDerecho = () => {
    // Archivo seleccionado pero aún no se lanzó el análisis: nada (se auto-lanza)
    if (!fasePreAnalisis && !extrayendo) {
      return null;
    }

    // Analizando documento
    if (fasePreAnalisis === 'cargando') {
      return (
        <Stack spacing={2} sx={{ height: '100%', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <SmartToyIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">Analizando el documento...</Typography>
          <Typography variant="caption" color="text.disabled">Identificando posibles ambigüedades</Typography>
        </Stack>
      );
    }

    // Extrayendo datos
    if (extrayendo) {
      return (
        <Stack spacing={2} sx={{ height: '100%', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <CircularProgress size={36} color="secondary" />
          <Typography variant="body2" color="text.secondary">Extrayendo datos del documento...</Typography>
          {progresoExtraccion > 0 && (
            <Box sx={{ width: '100%' }}>
              <LinearProgress variant="determinate" value={progresoExtraccion} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
              <Typography variant="caption" color="text.disabled" textAlign="center" display="block" mt={0.5}>{progresoExtraccion}%</Typography>
            </Box>
          )}
          <Typography variant="caption" color="text.disabled">Esto puede tomar unos minutos</Typography>
        </Stack>
      );
    }

    // Preguntas inline
    if (fasePreAnalisis === 'preguntas') {
      // Intro
      if (indicePregunta === -1) {
        return (
          <Stack spacing={2} sx={{ p: 2, height: '100%' }}>
            {preAnalisisResumen && (
              <Paper sx={{ p: 2, bgcolor: alpha('#6366f1', 0.06), border: '1px solid', borderColor: alpha('#6366f1', 0.15), borderRadius: 2 }}>
                <Typography variant="caption" color="primary" fontWeight={600} display="block" mb={0.5}>Documento detectado</Typography>
                <Typography variant="body2">{preAnalisisResumen}</Typography>
              </Paper>
            )}
            {totalPregs > 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {totalPregs} pregunta{totalPregs > 1 ? 's' : ''} para entender mejor el documento
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                No se encontraron ambigüedades. Podés procesar directamente.
              </Typography>
            )}
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 'auto' }}>
              <Button color="inherit" size="small" onClick={() => onConfirmarPreAnalisis('')}>Saltar</Button>
              {totalPregs > 0 ? (
                <Button variant="contained" size="small" onClick={() => setIndicePregunta(0)} endIcon={<ArrowForwardIcon />}>Comenzar</Button>
              ) : (
                <Button variant="contained" size="small" onClick={() => onConfirmarPreAnalisis('')}>Procesar</Button>
              )}
            </Stack>
          </Stack>
        );
      }

      // Resumen final
      if (enResumen) {
        return (
          <Stack spacing={1.5} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" textAlign="center">Resumen ({respondidas}/{totalPregs})</Typography>
            <Stack spacing={0.75} sx={{ flex: 1, overflow: 'auto' }}>
              {preguntas.map((p, idx) => {
                const texto = obtenerTextoRespuesta(p);
                const sinResp = !respuestas[p.id];
                return (
                  <Paper key={p.id} sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: sinResp ? 'grey.300' : alpha('#10b981', 0.3), bgcolor: sinResp ? 'grey.50' : alpha('#10b981', 0.04), display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, bgcolor: sinResp ? 'grey.400' : 'success.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                      {sinResp ? idx + 1 : <CheckCircleIcon sx={{ fontSize: 13 }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={600} display="block" noWrap>{p.pregunta}</Typography>
                      <Typography variant="caption" color={sinResp ? 'text.disabled' : 'success.dark'} noWrap>{texto}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setIndicePregunta(idx)}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Paper>
                );
              })}
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="space-between">
              <Button size="small" color="inherit" onClick={() => setIndicePregunta(totalPregs - 1)} startIcon={<ArrowBackIcon />}>Anterior</Button>
              <Button size="small" variant="contained" onClick={() => onConfirmarPreAnalisis(compilarInstrucciones())} startIcon={<SendIcon />}>Procesar con contexto</Button>
            </Stack>
          </Stack>
        );
      }

      // Pregunta individual
      return (
        <Stack spacing={1.5} sx={{ p: 2, height: '100%' }}>
          <LinearProgress variant="determinate" value={((indicePregunta + 1) / (totalPregs + 1)) * 100} sx={{ height: 3, borderRadius: 2 }} />
          <Typography variant="caption" color="text.disabled" textAlign="center">Pregunta {indicePregunta + 1} de {totalPregs}</Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, bgcolor: respuestas[pregActual.id] ? 'success.main' : 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              {respuestas[pregActual.id] ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : indicePregunta + 1}
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600}>{pregActual.pregunta}</Typography>
              {pregActual.contexto && <Typography variant="caption" color="text.disabled" display="block" mt={0.25}>{pregActual.contexto}</Typography>}
            </Box>
          </Stack>
          <Box sx={{ pl: 4.5 }}>
            <RadioGroup value={respuestas[pregActual.id] || ''} onChange={(e) => setRespuestas(prev => ({ ...prev, [pregActual.id]: e.target.value }))}>
              {pregActual.opciones?.map(o => (
                <FormControlLabel key={o.valor} value={o.valor} control={<Radio size="small" />} label={<Typography variant="body2">{o.label}</Typography>} sx={{ mb: 0 }} />
              ))}
              <FormControlLabel value="__libre__" control={<Radio size="small" />} label={<Typography variant="body2" color="text.secondary" fontStyle="italic">Otra respuesta...</Typography>} sx={{ mb: 0 }} />
            </RadioGroup>
            {respuestas[pregActual.id] === '__libre__' && (
              <TextField placeholder="Escribí tu respuesta..." fullWidth size="small" multiline minRows={1} maxRows={3}
                value={textosLibres[pregActual.id] || ''}
                onChange={e => { const v = e.target.value; setTextosLibres(prev => ({ ...prev, [pregActual.id]: v })); if (v.trim()) setRespuestas(prev => ({ ...prev, [pregActual.id]: '__libre__' })); }}
                variant="outlined" sx={{ mt: 1 }} autoFocus />
            )}
          </Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 'auto' }}>
            <Button size="small" color="inherit" onClick={() => setIndicePregunta(i => i - 1)} startIcon={<ArrowBackIcon />}>
              {indicePregunta === 0 ? 'Intro' : 'Anterior'}
            </Button>
            <Button size="small" variant={respuestas[pregActual.id] ? 'contained' : 'outlined'}
              onClick={() => setIndicePregunta(i => i + 1)} endIcon={<ArrowForwardIcon />}>
              {indicePregunta === totalPregs - 1 ? 'Ver resumen' : 'Siguiente'}
            </Button>
          </Stack>
        </Stack>
      );
    }

    return null;
  };

  return (
    <Stack spacing={3}>
      {/* Header con input de archivo */}
      {!archivo && (
        <Paper
          sx={{
            p: 4,
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 3,
            textAlign: 'center',
            bgcolor: 'grey.50',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha('#6366f1', 0.04)
            }
          }}
          component="label"
        >
          <input 
            type="file" 
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" 
            onChange={(e) => setArchivo(e.target.files[0])} 
            style={{ display: 'none' }}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Arrastrá o hacé clic para subir
          </Typography>
          <Typography variant="body2" color="text.disabled">
            PDF, imagen, Excel o CSV
          </Typography>
        </Paper>
      )}

      {archivo && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          {/* IZQUIERDA: Imagen — se oculta cuando hay pre-análisis o extracción */}
          {!fasePreAnalisis && !extrayendo && (
          <Box sx={{ flex: 1, minWidth: 0, width: { md: '50%' } }}>
            <Paper 
              sx={{ 
                overflow: 'hidden', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header compacto */}
              <Stack 
                direction="row" 
                alignItems="center" 
                justifyContent="space-between" 
                sx={{ px: 2, py: 0.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'grey.200' }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                    {archivo.name}
                  </Typography>
                  <Chip 
                    label={`${(archivo.size / 1024).toFixed(0)} KB`} 
                    size="small" 
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {archivo.type.startsWith('image') && (
                    <IconButton
                      size="small"
                      onClick={() => setMostrarAjustes(!mostrarAjustes)}
                      color={mostrarAjustes ? 'primary' : 'default'}
                      title="Ajustar imagen"
                    >
                      <TuneIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Button 
                    size="small" 
                    onClick={() => setArchivo(null)}
                    color="inherit"
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                  >
                    Cambiar
                  </Button>
                </Stack>
              </Stack>

              {/* Vista previa de la imagen */}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                {archivo.type.startsWith('image') ? (
                  <Box
                    ref={containerRef}
                    tabIndex={0}
                    onKeyDown={onContainerKeyDown}
                    onMouseMove={onContainerMouseMove}
                    onMouseUp={onContainerMouseUp}
                    onMouseLeave={onContainerLeave}
                    onTouchMove={onContainerTouchMove}
                    sx={{
                      position: 'relative', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      height: { xs: 260, md: 320 }, 
                      bgcolor: '#fafafa',
                      outline: 'none', 
                      userSelect: 'none', 
                      cursor: draggingGuide ? 'ns-resize' : 'default'
                    }}
                  >
                    <img
                      src={URL.createObjectURL(archivo)}
                      alt="Vista previa"
                      style={{ 
                        maxHeight: '100%', 
                        maxWidth: '100%', 
                        transform: `rotate(${rotation}deg)`, 
                        transformOrigin: 'center center', 
                        transition: 'transform 0.12s ease-in-out' 
                      }}
                      draggable={false}
                    />
                    {showGuide && (
                      <>
                        <Box
                          onMouseDown={onGuideMouseDown}
                          onTouchStart={(e) => { e.preventDefault(); setDraggingGuide(true); }}
                          sx={{ 
                            position: 'absolute', 
                            top: `${guideY}%`, 
                            left: 0, 
                            width: '100%', 
                            height: 0, 
                            borderTop: '2px solid rgba(255,0,0,0.95)', 
                            boxShadow: '0 0 2px rgba(0,0,0,0.4)', 
                            zIndex: 10, 
                            pointerEvents: 'auto' 
                          }}
                        />
                        <Box
                          onMouseDown={onGuideMouseDown}
                          onTouchStart={(e) => { e.preventDefault(); setDraggingGuide(true); }}
                          sx={{ 
                            position: 'absolute', 
                            top: `calc(${guideY}% - 10px)`, 
                            right: 8, 
                            width: 16, 
                            height: 20, 
                            borderRadius: '4px', 
                            background: 'rgba(255,0,0,0.95)', 
                            color: 'white', 
                            fontSize: 10, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            zIndex: 11, 
                            cursor: 'ns-resize', 
                            userSelect: 'none' 
                          }}
                        >||</Box>
                      </>
                    )}
                  </Box>
                ) : archivo.type === 'application/pdf' ? (
                  <Box sx={{ height: { xs: 260, md: 320 } }}>
                    <embed src={URL.createObjectURL(archivo)} type="application/pdf" width="100%" height="100%" />
                  </Box>
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center', height: { xs: 260, md: 320 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">Vista previa no disponible</Typography>
                  </Box>
                )}
              </Box>

              {/* Panel de ajustes colapsable */}
              {archivo.type.startsWith('image') && (
                <Collapse in={mostrarAjustes}>
                  <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'grey.200' }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                      <IconButton size="small" onClick={() => setRotation((r) => r - 5)}>
                        <RotateLeftIcon fontSize="small" />
                      </IconButton>
                      <Button size="small" variant="text" onClick={() => setRotation((r) => r - 0.5)} sx={{ minWidth: 32, px: 0.5 }}>
                        -0.5°
                      </Button>
                      <Typography sx={{ minWidth: 45, textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {rotation.toFixed(1)}°
                      </Typography>
                      <Button size="small" variant="text" onClick={() => setRotation((r) => r + 0.5)} sx={{ minWidth: 32, px: 0.5 }}>
                        +0.5°
                      </Button>
                      <IconButton size="small" onClick={() => setRotation((r) => r + 5)}>
                        <RotateRightIcon fontSize="small" />
                      </IconButton>
                      <Button onClick={() => setRotation(0)} size="small" variant="text" sx={{ minWidth: 'auto' }}>
                        Reset
                      </Button>
                      <Box sx={{ borderLeft: '1px solid', borderColor: 'grey.300', height: 20, mx: 1 }} />
                      <Button 
                        size="small" 
                        variant={showGuide ? 'contained' : 'outlined'} 
                        onClick={() => setShowGuide((v) => !v)}
                        sx={{ py: 0.25 }}
                      >
                        Guía
                      </Button>
                      {showGuide && (
                        <Box sx={{ width: 80 }}>
                          <input 
                            type="range" min={0} max={100} step={0.5} value={guideY} 
                            onChange={(e) => setGuideY(parseFloat(e.target.value))} 
                            style={{ width: '100%' }} 
                          />
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              )}
            </Paper>
          </Box>
          )}

          {/* DERECHA: Pre-análisis / Extracción / Botón — full width cuando no hay imagen */}
          <Box sx={{ flex: 1, minWidth: 0, width: (fasePreAnalisis || extrayendo) ? '100%' : { md: '50%' }, overflow: 'auto', maxHeight: { md: 420 } }}>
            {renderPanelDerecho()}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
