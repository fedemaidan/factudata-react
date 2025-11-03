import React from 'react';
import { Box, Button, Stack, Typography, IconButton } from '@mui/material';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';

export default function Step1SubirAjustar({
  archivo, setArchivo, rotation, setRotation, guideY, setGuideY, showGuide, setShowGuide,
  containerRef, draggingGuide, setDraggingGuide, onContainerKeyDown, onContainerMouseMove,
  onContainerMouseUp, onContainerLeave, onContainerTouchMove, onGuideMouseDown,
  onProcesar,
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">Subí tu archivo (PDF, imagen, Excel o CSV)</Typography>

      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" onChange={(e) => setArchivo(e.target.files[0])} />

      {archivo && (
        <>
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
                mt: 2, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
                border: '1px solid #ccc', borderRadius: 2, overflow: 'hidden', height: 420, bgcolor: '#fafafa',
                outline: 'none', userSelect: 'none', cursor: draggingGuide ? 'ns-resize' : 'default'
              }}
            >
              <img
                src={URL.createObjectURL(archivo)}
                alt="Vista previa"
                style={{ maxHeight: '100%', maxWidth: '100%', transform: `rotate(${rotation}deg)`, transformOrigin: 'center center', transition: 'transform 0.12s ease-in-out' }}
                draggable={false}
              />
              {showGuide && (
                <>
                  <Box
                    onMouseDown={onGuideMouseDown}
                    onTouchStart={(e) => { e.preventDefault(); setDraggingGuide(true); }}
                    sx={{ position: 'absolute', top: `${guideY}%`, left: 0, width: '100%', height: 0, borderTop: '2px solid rgba(255,0,0,0.95)', boxShadow: '0 0 2px rgba(0,0,0,0.4)', zIndex: 10, pointerEvents: 'auto' }}
                  />
                  <Box
                    onMouseDown={onGuideMouseDown}
                    onTouchStart={(e) => { e.preventDefault(); setDraggingGuide(true); }}
                    sx={{ position: 'absolute', top: `calc(${guideY}% - 10px)`, right: 8, width: 16, height: 20, borderRadius: '4px', background: 'rgba(255,0,0,0.95)', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11, cursor: 'ns-resize', userSelect: 'none' }}
                  >||</Box>
                </>
              )}
            </Box>
          ) : archivo.type === 'application/pdf' ? (
            <Box sx={{ mt: 2, height: 420 }}>
              <embed src={URL.createObjectURL(archivo)} type="application/pdf" width="100%" height="100%" />
            </Box>
          ) : (
            <Typography sx={{ mt: 2 }} color="text.secondary">Vista previa no disponible para este formato.</Typography>
          )}

          {archivo.type.startsWith('image') && (
            <Stack spacing={2} alignItems="stretch" mt={2}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <IconButton onClick={() => setRotation((r) => r - 5)}><RotateLeftIcon /></IconButton>
                <Typography sx={{ minWidth: 70, textAlign: 'center' }}>{rotation.toFixed(1)}°</Typography>
                <IconButton onClick={() => setRotation((r) => r + 5)}><RotateRightIcon /></IconButton>
                <Button onClick={() => setRotation(0)} size="small" variant="outlined">Reset</Button>
              </Stack>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Button variant="outlined" size="small" onClick={() => setRotation((r) => r - 0.5)}>-0.5°</Button>
                <Button variant="outlined" size="small" onClick={() => setRotation((r) => r + 0.5)}>+0.5°</Button>
                <Box sx={{ flex: 1, maxWidth: 420, mx: 'auto' }}>
                  <input type="range" min={-10} max={10} step={0.1} value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </Box>
              </Stack>
              <Stack spacing={1} alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button size="small" variant={showGuide ? 'contained' : 'outlined'} onClick={() => setShowGuide((v) => !v)}>
                    {showGuide ? 'Ocultar guía' : 'Mostrar guía'}
                  </Button>
                  <Typography variant="body2">Posición guía: {guideY.toFixed(1)}%</Typography>
                </Stack>
                <Box sx={{ width: '80%', maxWidth: 500 }}>
                  <input type="range" min={0} max={100} step={0.5} value={guideY} onChange={(e) => setGuideY(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </Box>
              </Stack>
            </Stack>
          )}
        </>
      )}

      <Button variant="contained" onClick={onProcesar} disabled={!archivo} sx={{ mt: 3 }}>
        Procesar archivo
      </Button>
    </Stack>
  );
}
