import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, CircularProgress, Typography } from "@mui/material";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const rotatePoint = (point, degrees) => {
  const rads = (Number(degrees || 0) * Math.PI) / 180;
  const cos = Math.cos(rads);
  const sin = Math.sin(rads);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

const inverseRotatePoint = (point, degrees) => rotatePoint(point, -(Number(degrees || 0)));

export const useImageViewerState = (imagenUrl, open) => {
  const viewerRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const zoomCfg = useMemo(
    () => ({ min: 0.5, max: 4, step: 0.1 }),
    []
  );

  const canShowActions = Boolean(imagenUrl);

  const handleZoom = useCallback(
    (next) => {
      setZoom((prev) => {
        const value = typeof next === "number" ? next : prev;
        return clamp(value, zoomCfg.min, zoomCfg.max);
      });
    },
    [zoomCfg.max, zoomCfg.min]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => clamp(Number((prev + zoomCfg.step).toFixed(2)), zoomCfg.min, zoomCfg.max));
  }, [zoomCfg.max, zoomCfg.min, zoomCfg.step]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => clamp(Number((prev - zoomCfg.step).toFixed(2)), zoomCfg.min, zoomCfg.max));
  }, [zoomCfg.max, zoomCfg.min, zoomCfg.step]);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  }, []);

  const handleWheel = useCallback(
    (e) => {
      if (!open || !canShowActions || !viewerRef.current) return;
      e.preventDefault();

      const rect = viewerRef.current.getBoundingClientRect();
      const pointer = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = direction > 0 ? 1.1 : 1 / 1.1;
      const nextZoom = clamp(Number((zoom * factor).toFixed(2)), zoomCfg.min, zoomCfg.max);
      if (nextZoom === zoom) return;

      const currentPan = panRef.current || { x: 0, y: 0 };
      const vec = {
        x: pointer.x - center.x - currentPan.x,
        y: pointer.y - center.y - currentPan.y,
      };

      const local = inverseRotatePoint(vec, rotation);
      const localUnscaled = { x: local.x / (zoom || 1), y: local.y / (zoom || 1) };

      const scaled = { x: localUnscaled.x * nextZoom, y: localUnscaled.y * nextZoom };
      const rotatedScaled = rotatePoint(scaled, rotation);

      const nextPan = {
        x: pointer.x - center.x - rotatedScaled.x,
        y: pointer.y - center.y - rotatedScaled.y,
      };

      panRef.current = nextPan;
      setPan(nextPan);
      setZoom(nextZoom);
    },
    [canShowActions, open, rotation, zoom, zoomCfg.max, zoomCfg.min]
  );

  const handleDoubleClick = useCallback(
    (e) => {
      if (!open || !canShowActions || !viewerRef.current) return;
      e.preventDefault();

      const isZoomed = Number(zoom) > 1;
      const nextZoom = isZoomed ? 1 : 3;
      if (nextZoom === 1) {
        panRef.current = { x: 0, y: 0 };
        setPan({ x: 0, y: 0 });
        setZoom(1);
        return;
      }

      const rect = viewerRef.current.getBoundingClientRect();
      const pointer = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const currentPan = panRef.current || { x: 0, y: 0 };
      const vec = {
        x: pointer.x - center.x - currentPan.x,
        y: pointer.y - center.y - currentPan.y,
      };

      const local = inverseRotatePoint(vec, rotation);
      const currentZoom = Number(zoom) || 1;
      const localUnscaled = { x: local.x / currentZoom, y: local.y / currentZoom };

      const scaled = { x: localUnscaled.x * nextZoom, y: localUnscaled.y * nextZoom };
      const rotatedScaled = rotatePoint(scaled, rotation);

      const nextPan = {
        x: pointer.x - center.x - rotatedScaled.x,
        y: pointer.y - center.y - rotatedScaled.y,
      };

      panRef.current = nextPan;
      setPan(nextPan);
      setZoom(nextZoom);
    },
    [canShowActions, open, rotation, zoom]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!canShowActions || !viewerRef.current || zoom <= 1) return;
      e.preventDefault();
      isPanningRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    },
    [canShowActions, zoom]
  );

  const handlePointerMove = useCallback((e) => {
    if (!isPanningRef.current) return;
    const prev = lastPointerRef.current;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const currentPan = panRef.current || { x: 0, y: 0 };
    const nextPan = { x: currentPan.x + dx, y: currentPan.y + dy };
    panRef.current = nextPan;
    setPan(nextPan);
  }, []);

  const stopPanning = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const transform = useMemo(() => {
    const z = Number(zoom) || 1;
    const r = Number(rotation) || 0;
    const px = Number(pan?.x) || 0;
    const py = Number(pan?.y) || 0;
    return `translate3d(${px}px, ${py}px, 0) scale(${z}) rotate(${r}deg)`;
  }, [pan?.x, pan?.y, rotation, zoom]);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setRotation(0);
    setHasError(false);
    setIsLoading(Boolean(imagenUrl));
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  }, [open, imagenUrl]);

  return {
    viewerRef,
    zoom,
    rotation,
    pan,
    isLoading,
    hasError,
    canShowActions,
    zoomCfg,
    transform,
    handleZoom,
    handleZoomIn,
    handleZoomOut,
    handleRotateLeft,
    handleRotateRight,
    handleReset,
    handleWheel,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    stopPanning,
    handleImageLoad,
    handleImageError,
  };
};

export const ImageViewer = ({ imagenUrl, viewerState, leftContent }) => {
  const {
    viewerRef,
    isLoading,
    hasError,
    zoom,
    transform,
    handleWheel,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    stopPanning,
    canShowActions,
    handleImageLoad,
    handleImageError,
  } = viewerState;

  return (
    <Box
      sx={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
        flexDirection: { xs: "column", md: leftContent ? "row" : "column" },
      }}
    >
      {leftContent && (
        <Box
          component="section"
          sx={{
            width: { xs: "100%", md: 360 },
            borderRight: { md: "1px solid", xs: "none" },
            borderColor: "divider",
            backgroundColor: "background.paper",
            p: 2,
            overflowY: "auto",
            flexShrink: 0,
            maxHeight: "100%",
            boxShadow: { md: "2px 0 20px rgba(0,0,0,0.08)" },
          }}
        >
          {leftContent}
        </Box>
      )}

      <Box
        ref={viewerRef}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={stopPanning}
        onMouseLeave={stopPanning}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
          overflow: "hidden",
          userSelect: "none",
          WebkitUserSelect: "none",
          cursor: zoom > 1 ? "grab" : "default",
          "&:active": { cursor: zoom > 1 ? "grabbing" : "default" },
        }}
      >
        {imagenUrl && !hasError && (
          <React.Fragment>
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${imagenUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(28px) saturate(1.15) brightness(0.65)",
                transform: "scale(1.15)",
                opacity: 0.95,
                pointerEvents: "none",
              }}
            />
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.72) 70%, rgba(0,0,0,0.88) 100%)",
                pointerEvents: "none",
              }}
            />
          </React.Fragment>
        )}

        {(isLoading || hasError || !imagenUrl) && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1.5,
              color: "grey.200",
              px: 2,
              textAlign: "center",
            }}
          >
            {isLoading && (
              <React.Fragment>
                <CircularProgress color="inherit" />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Cargando imagen…
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Tip: podés hacer zoom con la rueda del mouse.
                </Typography>
              </React.Fragment>
            )}

            {!isLoading && hasError && (
              <React.Fragment>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  No se pudo cargar la imagen
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Probá abrirla en otra pestaña o copiá el link.
                </Typography>
              </React.Fragment>
            )}

            {!isLoading && !hasError && !imagenUrl && (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                No hay imagen para mostrar.
              </Typography>
            )}
          </Box>
        )}

        {imagenUrl && !hasError && (
          <Box
            component="img"
            src={imagenUrl}
            alt="Imagen"
            onLoad={handleImageLoad}
            onError={handleImageError}
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              transform,
              transformOrigin: "center",
              transition: "transform 120ms ease-out",
              objectFit: "contain",
              cursor: zoom > 1 ? "grab" : canShowActions ? "zoom-in" : "default",
              boxShadow: hasError ? "none" : "0 12px 30px rgba(0,0,0,0.45)",
              borderRadius: 1,
              outline: 0,
              position: "relative",
              zIndex: 2,
            }}
          />
        )}
      </Box>
    </Box>
  );
};

ImageViewer.propTypes = {
  imagenUrl: PropTypes.string,
  viewerState: PropTypes.shape({
    viewerRef: PropTypes.object,
    zoom: PropTypes.number,
    rotation: PropTypes.number,
    pan: PropTypes.object,
    isLoading: PropTypes.bool,
    hasError: PropTypes.bool,
    handleWheel: PropTypes.func,
    handleDoubleClick: PropTypes.func,
    handlePointerDown: PropTypes.func,
    handlePointerMove: PropTypes.func,
    stopPanning: PropTypes.func,
    handleImageLoad: PropTypes.func,
    handleImageError: PropTypes.func,
  }).isRequired,
  leftContent: PropTypes.node,
};

ImageViewer.defaultProps = {
  imagenUrl: "",
  leftContent: null,
};
