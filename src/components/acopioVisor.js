// src/components/AcopioVisor.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Stack, Typography, Button, Divider, IconButton, Tooltip
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function AcopioVisor({
  pages, pageIdx, setPageIdx,
  onUploadFiles, onDeletePage,
  enableUpload = true, enableDelete = true
}) {
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const totalPages = pages?.length || 0;
  const hasPages = totalPages > 0;
  const currentUrl = hasPages ? pages[pageIdx] : null;
  const nextIdx = hasPages ? (pageIdx + 1) % totalPages : 0;
  const prevIdx = hasPages ? (pageIdx - 1 + totalPages) % totalPages : 0;
  const nextUrl = hasPages ? pages[nextIdx] : null;

  const goNext = useCallback(() => setPageIdx(prev => (prev + 1) % (totalPages || 1)), [setPageIdx, totalPages]);
  const goPrev = useCallback(() => setPageIdx(prev => (prev - 1 + (totalPages || 1)) % (totalPages || 1)), [setPageIdx, totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => {
      const ns = Math.max(0.3, Math.min(5, s + delta));
      return ns;
    });
  };

  const onMouseDown = (e) => {
    setIsPanning(true);
    setStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };
  const onMouseMove = (e) => {
    if (!isPanning) return;
    setTranslate({ x: e.clientX - start.x, y: e.clientY - start.y });
  };
  const onMouseUp = () => setIsPanning(false);
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Página {hasPages ? pageIdx + 1 : 0} de {totalPages}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Zoom -">
            <span><IconButton onClick={() => setScale(s => Math.max(0.3, s - 0.1))}><ZoomOutMapIcon /></IconButton></span>
          </Tooltip>
          <Tooltip title="Zoom +">
            <span><IconButton onClick={() => setScale(s => Math.min(5, s + 0.1))}><ZoomInMapIcon /></IconButton></span>
          </Tooltip>
          <Button size="small" onClick={resetView}>Reset</Button>

          {enableUpload && (
            <>
              <input
                id="input-visor-acopio"
                type="file"
                multiple
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={onUploadFiles}
              />
              <label htmlFor="input-visor-acopio">
                <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} component="span">
                  Agregar hojas
                </Button>
              </label>
            </>
          )}
          {enableDelete && (
            <Tooltip title="Eliminar página actual">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => onDeletePage(pageIdx)}
                >
                  Eliminar
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ mb: 1 }} />

      <Box
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        sx={{
          position: 'relative',
          height: { xs: '70vh', md: '78vh' },
          bgcolor: 'background.default',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
      >
        {/* Prev */}
        <IconButton
          onClick={goPrev}
          sx={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            zIndex: 2
          }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>

        {/* Image */}
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
            <img
              src={currentUrl}
              alt={`Acopio - Página ${pageIdx + 1}`}
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none' // panning en contenedor
              }}
            />
          </a>
        )}

        {/* Next */}
        <Button
          onClick={goNext}
          endIcon={<ArrowForwardIosIcon />}
          sx={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            zIndex: 2
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 36,
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              backgroundImage: `url("${nextUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </Button>
      </Box>

      {/* Thumbs */}
      <Stack direction="row" spacing={1} sx={{ mt: 1, px: 1, pb: 1, overflowX: 'auto' }}>
        {pages?.map((u, i) => (
          <Box
            key={`thumb-${i}`}
            onClick={() => setPageIdx(i)}
            title={`Ir a página ${i + 1}`}
            sx={{
              width: 80,
              height: 56,
              borderRadius: 1,
              border: '2px solid',
              borderColor: i === pageIdx ? 'primary.main' : 'divider',
              backgroundImage: `url("${u}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: 'pointer',
              flex: '0 0 auto'
            }}
          />
        ))}
      </Stack>

      {/* Abrir actual en pestaña */}
      {currentUrl && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
          <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => window.open(currentUrl, '_blank')}>
            Abrir página actual
          </Button>
        </Stack>
      )}
    </Box>
  );
}
