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
      minHeight: 220,
      display: "flex",
      flexDirection: "column",
      gap: 1,
      justifyContent: "space-between",
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    {url ? (
      <Box
        component="img"
        src={url}
        alt={label}
        sx={{
          width: "100%",
          maxHeight: 260,
          objectFit: "contain",
          borderRadius: 1,
        }}
      />
    ) : (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          fontSize: "0.75rem",
          textAlign: "center",
        }}
      >
        Sin imagen disponible
      </Box>
    )}
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
  const trabajadorLabel = duplicateInfo.trabajadorId
    ? `Trabajador ${duplicateInfo.trabajadorId}`
    : "Trabajador identificado";

  const handleAction = (action) => () => {
    if (loading) return;
    onResolve?.(action);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Resolver duplicado</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
          >
            <ImagePreview label={existingLabel} url={duplicateInfo.comprobanteExistente?.url} />
            <ImagePreview label={nuevoLabel} url={row?.url_storage} />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Typography sx={{ fontSize: "0.8rem" }} color="text.secondary">
              {trabajadorLabel}
            </Typography>
            {fechaDetectada && (
              <Typography sx={{ fontSize: "0.8rem" }} color="text.secondary">
                Fecha: {fechaDetectada}
              </Typography>
            )}
            {row?.tipo && (
              <Typography sx={{ fontSize: "0.8rem" }} color="text.secondary">
                Tipo: {row.tipo}
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
