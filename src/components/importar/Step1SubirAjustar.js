import React, { useState } from 'react';
import { 
  Box, Button, Stack, Typography, IconButton, Paper, Collapse, Chip,
  alpha, Grid
} from '@mui/material';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import TuneIcon from '@mui/icons-material/Tune';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BoltIcon from '@mui/icons-material/Bolt';
import SpeedIcon from '@mui/icons-material/Speed';
import BalanceIcon from '@mui/icons-material/Balance';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const MODOS_INFO = {
  rapido: {
    icon: <BoltIcon sx={{ fontSize: 28 }} />,
    label: 'Rápido',
    emoji: '⚡',
    descripcion: 'Ideal para acopios cortos. Recomendamos revisión manual al final.',
    tiempo: '~1 min/pág',
    color: '#f59e0b'
  },
  agil: {
    icon: <SpeedIcon sx={{ fontSize: 28 }} />,
    label: 'Ágil',
    emoji: '🚀',
    descripcion: 'Ideal para acopios cortos. Más preciso, pero recomendamos revisión manual.',
    tiempo: '~2 min/pág',
    color: '#10b981'
  },
  balanceado: {
    icon: <BalanceIcon sx={{ fontSize: 28 }} />,
    label: 'Balanceado',
    emoji: '⚖️',
    descripcion: 'Ideal para acopios medios. Un asistente te ayuda a validar marcando dónde revisar.',
    tiempo: '~3 min/pág',
    color: '#6366f1'
  },
  preciso: {
    icon: <GpsFixedIcon sx={{ fontSize: 28 }} />,
    label: 'Preciso',
    emoji: '🎯',
    descripcion: 'Ideal para acopios medios o largos. Un poco más lento pero el asistente es mucho más preciso.',
    tiempo: '~4 min/pág',
    color: '#ec4899'
  }
};

export default function Step1SubirAjustar({
  archivo, setArchivo, rotation, setRotation, guideY, setGuideY, showGuide, setShowGuide,
  containerRef, draggingGuide, setDraggingGuide, onContainerKeyDown, onContainerMouseMove,
  onContainerMouseUp, onContainerLeave, onContainerTouchMove, onGuideMouseDown,
  onProcesar,
  modoExtraccion, setModoExtraccion
}) {
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

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
          {/* IZQUIERDA: Imagen - 50% */}
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

          {/* DERECHA: Modos + Botón - 50% */}
          <Box sx={{ flex: 1, minWidth: 0, width: { md: '50%' } }}>
            <Stack spacing={1.5} sx={{ height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Modo de extracción
              </Typography>
              
              {Object.entries(MODOS_INFO).map(([key, info]) => {
                const isSelected = modoExtraccion === key;
                return (
                  <Paper
                    key={key}
                    onClick={() => setModoExtraccion(key)}
                    sx={{ 
                      p: 1,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: isSelected ? info.color : 'grey.200',
                      bgcolor: isSelected ? alpha(info.color, 0.08) : 'background.paper',
                      borderRadius: 1.5,
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: isSelected ? info.color : 'grey.400',
                      }
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ color: isSelected ? info.color : 'grey.500', display: 'flex' }}>
                        {info.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={isSelected ? 600 : 500}
                          sx={{ color: isSelected ? info.color : 'text.primary' }}
                        >
                          {info.emoji} {info.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {info.descripcion}
                        </Typography>
                      </Box>
                      <Chip 
                        label={info.tiempo} 
                        size="small" 
                        sx={{ 
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: isSelected ? alpha(info.color, 0.15) : 'grey.100',
                          color: isSelected ? info.color : 'text.secondary'
                        }}
                      />
                      {isSelected && (
                        <CheckCircleIcon sx={{ fontSize: 18, color: info.color }} />
                      )}
                    </Stack>
                  </Paper>
                );
              })}

              {/* Botón de procesar */}
              <Button 
                variant="contained" 
                onClick={onProcesar} 
                disabled={!archivo} 
                size="large"
                sx={{ 
                  mt: 'auto',
                  py: 1.25,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 2
                }}
              >
                Procesar archivo
              </Button>
            </Stack>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
