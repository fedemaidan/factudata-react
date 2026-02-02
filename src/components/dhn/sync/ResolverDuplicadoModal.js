import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
} from "@mui/material";

const ImagePreview = ({ label, url }) => (
  <Box
    sx={{
      flex: 1,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      p: 2,
      minHeight: { xs: 260, md: 360 },
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {url ? (
        <Box
          component="img"
          src={url}
          alt={label}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: 1,
          }}
        />
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
        >
          Sin imagen disponible
        </Typography>
      )}
    </Box>
  </Box>
);

const ResolverDuplicadoModal = ({
  open,
  onClose,
  row,
  onResolve,
  loading = false,
  actionInProgress = null,
}) => {
  if (!row) return null;

  const duplicateInfo = row.duplicateInfo || {};
  const existingLabel = duplicateInfo.comprobanteExistente?.type
    ? `Comprobante existente (${duplicateInfo.comprobanteExistente.type})`
    : "Comprobante existente";
  const nuevoLabel = duplicateInfo.comprobanteNuevo?.type
    ? `Comprobante nuevo (${duplicateInfo.comprobanteNuevo.type})`
    : "Comprobante nuevo";
  const fechaDetectada = duplicateInfo.fecha
    ? new Date(duplicateInfo.fecha).toLocaleDateString("es-AR")
    : null;

  const duplicateMessage = duplicateInfo.mensaje;

  const handleAction = (action) => () => {
    if (loading) return;
    onResolve?.(action);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          minHeight: "70vh",
        },
      }}
    >
      <DialogTitle>Resolver duplicado</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
          >
            <ImagePreview label={existingLabel} url={duplicateInfo.comprobanteExistente?.url} />
            <ImagePreview label={nuevoLabel} url={row?.url_storage} />
          </Stack>
          {duplicateMessage && (
            <Typography variant="body2" color="text.secondary">
              {duplicateMessage}
            </Typography>
          )}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {fechaDetectada && (
              <Typography sx={{ fontSize: "0.8rem" }} color="text.secondary">
                Fecha: {fechaDetectada}
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={handleAction("keepExisting")}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          {loading && actionInProgress === "keepExisting" ? "Procesando..." : "Conservar existente"}
        </Button>
        <Button
          variant="contained"
          onClick={handleAction("applyNew")}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          {loading && actionInProgress === "applyNew" ? "Procesando..." : "Aplicar nuevo comprobante"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResolverDuplicadoModal;
