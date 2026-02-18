import {
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useCallback } from "react";
import ImagenModal from "src/components/ImagenModal";
import ResolverDuplicadoModal from "src/components/dhn/sync/ResolverDuplicadoModal";
import ResolverLicenciaManualForm from "src/components/dhn/ResolverLicenciaManualForm";
import ResolverParteManualForm from "src/components/dhn/ResolverParteManualForm";
import TrabajosDetectadosList from "src/components/dhn/TrabajosDetectadosList";

const CorreccionModalNavigator = ({
  row,
  tipoModal,
  correccionActiva,
  textoProgreso,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onConfirmarYContinuar,
  onCloseFlow,
  handlers,
  alertOpen = false,
  resolvedPayloads = {},
}) => {

  const handleParteResueltaConConfirm = useCallback(
    async (result) => {
      await handlers.handleParteResuelta(result);
      onConfirmarYContinuar?.();
    },
    [handlers.handleParteResuelta, onConfirmarYContinuar]
  );

  const handleLicenciaResueltaConConfirm = useCallback(
    async (result) => {
      await handlers.handleLicenciaResuelta(result);
      onConfirmarYContinuar?.();
    },
    [handlers.handleLicenciaResuelta, onConfirmarYContinuar]
  );

  useEffect(() => {
    if (!correccionActiva || !row) return;
    console.log("[CorreccionModalNavigator] urlStorage:", row?.url_storage);
  }, [correccionActiva, row?.url_storage]);

  if (!correccionActiva || !row || !tipoModal) {
    return null;
  }
  const navigationBar = (
    <Box
      sx={{
        position: "fixed",
        top: alertOpen ? 80 : 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: (theme) => theme.zIndex.modal + 6,
        bgcolor: "background.paper",
        borderRadius: 3,
        boxShadow: 3,
        px: 2,
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton size="small" color="primary" onClick={onPrev} disabled={!hasPrev}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="primary" onClick={onNext} disabled={!hasNext}>
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Stack>
      {tipoModal === "parte_incompleto" && (
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={onConfirmarYContinuar}
          sx={{ whiteSpace: "nowrap" }}
        >
          Confirmar
        </Button>
      )}
      <Typography variant="caption" color="text.secondary">
        {textoProgreso}
      </Typography>
      <IconButton size="small" onClick={onCloseFlow}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  if (tipoModal === "duplicado") {
    return (
      <>
        {navigationBar}
        <ResolverDuplicadoModal
          open={Boolean(correccionActiva && tipoModal === "duplicado")}
          onClose={onCloseFlow}
          row={row}
          onResolve={handlers.handleResolverDuplicado}
          loading={handlers.resolverDuplicadoLoading}
          actionInProgress={handlers.resolverDuplicadoAction}
          progreso={textoProgreso}
          onConfirmarYContinuar={onConfirmarYContinuar}
        onTrabajadorResuelto={handlers.handleTrabajadorResuelto}
        />
      </>
    );
  }

  const rowId = row?._id ?? null;
  const resolvedEntry = rowId ? resolvedPayloads[rowId] : null;
  const initialData = resolvedEntry?.payload ?? null;
  const navKey = `${tipoModal}-${rowId ?? "none"}`;
  const imagenModalProps = {
    open: Boolean(correccionActiva),
    onClose: onCloseFlow,
    imagenUrl: row?.url_storage,
    fileName: row?.file_name,
  };

  return (
    <>
      {navigationBar}
      {tipoModal === "parte_incompleto" && (
        <ImagenModal
          {...imagenModalProps}
          key={`${navKey}-parte-incompleto`}
          leftContent={
            row ? (
              <TrabajosDetectadosList
                key={`${navKey}-parte-incompleto-list`}
                urlStorage={row.url_storage}
                rowId={rowId}
                initialData={initialData}
                onUpdated={handlers.handleTrabajadorResuelto}
                progreso={textoProgreso}
              />
            ) : null
          }
        />
      )}
      {tipoModal === "licencia" && (
        <ImagenModal
          {...imagenModalProps}
          key={`${navKey}-licencia`}
          leftContent={
            row ? (
              <ResolverLicenciaManualForm
                key={`${navKey}-licencia-form`}
                urlStorage={row.url_storage}
                rowId={rowId}
                initialData={initialData}
                onResolved={handleLicenciaResueltaConConfirm}
                onCancel={handlers.handleCloseResolverLicenciaFromModal}
                onAutoClose={handlers.handleCloseResolverLicenciaAuto}
                progreso={textoProgreso}
              />
            ) : null
          }
        />
      )}
      {tipoModal === "parte_error" && (
        <ImagenModal
          {...imagenModalProps}
          key={`${navKey}-parte-error`}
          leftContent={
            row ? (
              <ResolverParteManualForm
                key={`${navKey}-parte-error-form`}
                urlStorage={row.url_storage}
                rowId={rowId}
                initialData={initialData}
                onResolved={handleParteResueltaConConfirm}
                onCancel={handlers.handleCloseResolverParteFromModal}
                onAutoClose={handlers.handleCloseResolverParteAuto}
                progreso={textoProgreso}
              />
            ) : null
          }
        />
      )}
    </>
  );
};

export default CorreccionModalNavigator;
