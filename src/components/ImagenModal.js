import React, { useCallback, useState } from "react";
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

import { ImageViewer, useImageViewerState } from "src/components/ImageViewer";

const ImagenModal = ({ open, onClose, imagenUrl, fileName, leftContent }) => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const viewerState = useImageViewerState(imagenUrl, open);
  const {
    zoom,
    zoomCfg,
    isLoading,
    hasError,
    canShowActions,
    handleZoom,
    handleZoomIn,
    handleZoomOut,
    handleRotateLeft,
    handleRotateRight,
    handleReset,
  } = viewerState;

  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const modalTitle = typeof fileName === "string" ? fileName.trim() : "";

  const handleCloseToast = useCallback((_, reason) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const handleCloseWithAnimation = useCallback(() => {
    onClose?.();
  }, [onClose]);

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

  return (
    <React.Fragment>
      <Dialog
        fullScreen
        open={open}
        onClose={handleCloseWithAnimation}
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
                <IconButton edge="start" onClick={handleCloseWithAnimation} aria-label="Cerrar">
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

        <ImageViewer imagenUrl={imagenUrl} viewerState={viewerState} leftContent={leftContent} />
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
