import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar,
  Box,
  Dialog,
  IconButton,
  Snackbar,
  Alert,
  Slider,
  Toolbar,
  Tooltip,
  Typography,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";

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

const ImagenModal = ({ open, onClose, imagenUrl, fileName, leftContent }) => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const viewerRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const canShowActions = Boolean(imagenUrl);
  const modalTitle = typeof fileName === "string" ? fileName.trim() : "";

  const zoomCfg = useMemo(() => {
    const min = 0.5;
    const max = 4;
    const step = 0.1;
    return { min, max, step };
  }, []);

  const handleCloseToast = useCallback((_, reason) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleZoom = useCallback((next) => {
    setZoom((prev) => {
      const value = typeof next === "number" ? next : prev;
      return clamp(value, 0.5, 4);
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => clamp(Number((prev + zoomCfg.step).toFixed(2)), zoomCfg.min, zoomCfg.max));
  }, [zoomCfg.max, zoomCfg.min, zoomCfg.step]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => clamp(Number((prev - zoomCfg.step).toFixed(2)), zoomCfg.min, zoomCfg.max));
  }, [zoomCfg.max, zoomCfg.min, zoomCfg.step]);

  const handleCopyLink = useCallback(async () => {
    if (!imagenUrl) return;
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API no disponible");
      }
      await navigator.clipboard.writeText(imagenUrl);
      setToast({ open: true, severity: "success", message: "Link copiado al portapapeles." });
    } catch (e) {
      console.error("[ImagenModal] Error copiando link:", e);
      setToast({ open: true, severity: "error", message: "No se pudo copiar el link." });
    }
  }, [imagenUrl]);

  const handleWheel = useCallback(
    (e) => {
      if (!open) return;
      if (!canShowActions) return;
      if (!viewerRef.current) return;

      // Zoom con rueda (y pinch en trackpad suele venir como wheel con ctrlKey).
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

      // Mantener el punto bajo el cursor: recalculamos pan en base a zoom+rotación actuales.
      const currentPan = panRef.current || { x: 0, y: 0 };
      const vec = {
        x: pointer.x - center.x - currentPan.x,
        y: pointer.y - center.y - currentPan.y,
      };

      // Pasamos a "coords locales" (des-rotar y des-escalar).
      const local = inverseRotatePoint(vec, rotation);
      const localUnscaled = { x: local.x / (zoom || 1), y: local.y / (zoom || 1) };

      // Re-escalar y rotar con el nuevo zoom para hallar el nuevo pan.
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
      if (!open) return;
      if (!canShowActions) return;
      if (!viewerRef.current) return;
      e.preventDefault();

      // Opción A: toggle
      const isZoomed = (Number(zoom) || 1) > 1;
      const nextZoom = isZoomed ? 1 : 3;

      // Si volvemos a 1x, reseteamos pan para no dejar offsets raros
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

      // Mantener el punto bajo el cursor: misma matemática que handleWheel
      const currentPan = panRef.current || { x: 0, y: 0 };
      const vec = {
        x: pointer.x - center.x - currentPan.x,
        y: pointer.y - center.y - currentPan.y,
      };

      const local = inverseRotatePoint(vec, rotation);
      const currentZoom = Number(zoom) || 1;
      const localUnscaled = { x: local.x / (currentZoom || 1), y: local.y / (currentZoom || 1) };

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
      if (!canShowActions) return;
      if (!viewerRef.current) return;
      // Panear solo si hay zoom (si no, se siente raro).
      if (zoom <= 1) return;
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

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setRotation(0);
    setHasError(false);
    setIsLoading(Boolean(imagenUrl));
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  }, [open, imagenUrl]);

  const transform = useMemo(() => {
    const z = Number(zoom) || 1;
    const r = Number(rotation) || 0;
    const px = Number(pan?.x) || 0;
    const py = Number(pan?.y) || 0;
    return `translate3d(${px}px, ${py}px, 0) scale(${z}) rotate(${r}deg)`;
  }, [pan?.x, pan?.y, rotation, zoom]);

  return (
    <React.Fragment>
      <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: "grey.900",
            backgroundImage: "none",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          color="default"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Toolbar
            sx={{
              gap: 1,
              flexWrap: "wrap",
              justifyContent: "space-between",
              minHeight: { xs: 56, sm: 64 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
              <Tooltip title="Cerrar" placement="bottom">
                <IconButton edge="start" onClick={handleClose} aria-label="Cerrar">
                  <CloseIcon />
                </IconButton>
              </Tooltip>

              {modalTitle && (
                <Tooltip title={modalTitle} placement="bottom" arrow>
                  <Typography
                    variant="subtitle2"
                    component="div"
                    noWrap
                    sx={{
                      minWidth: 0,
                      maxWidth: { xs: 220, sm: 520 },
                      fontWeight: 600,
                      color: "text.primary",
                    }}
                  >
                    {modalTitle}
                  </Typography>
                </Tooltip>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Tooltip title="Rotar a la izquierda" placement="bottom">
                <span>
                  <IconButton
                    onClick={handleRotateLeft}
                    disabled={!canShowActions}
                    aria-label="Rotar a la izquierda"
                  >
                    <RotateLeftIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Rotar a la derecha" placement="bottom">
                <span>
                  <IconButton
                    onClick={handleRotateRight}
                    disabled={!canShowActions}
                    aria-label="Rotar a la derecha"
                  >
                    <RotateRightIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Restablecer zoom y rotación" placement="bottom">
                <span>
                  <IconButton
                    onClick={handleReset}
                    disabled={!canShowActions}
                    aria-label="Restablecer"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  minWidth: { xs: "100%", sm: 320 },
                  maxWidth: { xs: "100%", sm: 360 },
                }}
              >
                <Tooltip title="Alejar" placement="bottom">
                  <span>
                    <IconButton
                      onClick={handleZoomOut}
                      disabled={!canShowActions || zoom <= zoomCfg.min}
                      aria-label="Alejar"
                      size={isMdDown ? "small" : "medium"}
                    >
                      <ZoomOutIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Slider
                  size="small"
                  value={zoom}
                  min={zoomCfg.min}
                  max={zoomCfg.max}
                  step={zoomCfg.step}
                  onChange={(_, v) => handleZoom(Number(v))}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                  aria-label="Zoom"
                />

                <Tooltip title="Acercar" placement="bottom">
                  <span>
                    <IconButton
                      onClick={handleZoomIn}
                      disabled={!canShowActions || zoom >= zoomCfg.max}
                      aria-label="Acercar"
                      size={isMdDown ? "small" : "medium"}
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <Tooltip title="Copiar link" placement="bottom">
                <span>
                  <IconButton
                    onClick={handleCopyLink}
                    disabled={!canShowActions}
                    aria-label="Copiar link"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Abrir en otra pestaña" placement="bottom">
                <span>
                  <IconButton
                    component="a"
                    href={imagenUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    disabled={!canShowActions}
                    aria-label="Abrir en otra pestaña"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

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
                  zIndex: 1,
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
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
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
      </Dialog>

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleCloseToast}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </React.Fragment>
  );
};

export default ImagenModal;
