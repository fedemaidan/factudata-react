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

/**
 * Barra de navegación genérica para flujo de corrección asistida.
 * El contenido (modal/drawer) lo renderiza el padre.
 *
 * @param {boolean} visible - Si la barra debe mostrarse
 * @param {string} textoProgreso - Texto de progreso (ej. "Caso 1/5 (resueltos 0)")
 * @param {boolean} hasPrev - Si hay caso anterior
 * @param {boolean} hasNext - Si hay caso siguiente
 * @param {Function} onPrev - Callback al ir al anterior
 * @param {Function} onNext - Callback al ir al siguiente
 * @param {Function} onConfirmarYContinuar - Callback al confirmar y avanzar
 * @param {Function} onCloseFlow - Callback al cerrar el flujo
 * @param {boolean} [showConfirmButton=false] - Si mostrar botón Confirmar/Continuar
 * @param {string} [confirmLabel="Continuar"] - Etiqueta del botón de confirmar
 * @param {boolean} [confirmDisabled=false] - Si el botón Continuar debe estar deshabilitado
 * @param {boolean} [showDuplicadoButton=false] - Botón marcar duplicado y avanzar
 * @param {Function} [onDuplicadoYContinuar] - Callback duplicado y siguiente
 * @param {string} [duplicadoLabel="Duplicado"] - Etiqueta botón duplicado
 * @param {boolean} [duplicadoDisabled=false] - Deshabilitar botón duplicado (p. ej. loading)
 * @param {"top"|"bottom"} [position="bottom"] - Posición de la barra
 * @param {number} [topOffset=16] - Offset desde arriba cuando position=top (ej. por alert)
 */
const AssistedCorrectionNavigator = ({
  visible,
  textoProgreso,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onConfirmarYContinuar,
  onCloseFlow,
  showConfirmButton = false,
  confirmLabel = "Continuar",
  confirmDisabled = false,
  showDuplicadoButton = false,
  onDuplicadoYContinuar,
  duplicadoLabel = "Duplicado",
  duplicadoDisabled = false,
  position = "bottom",
  topOffset = 16,
}) => {
  if (!visible) return null;

  const isBottom = position === "bottom";
  const barSx = {
    position: "fixed",
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
    ...(isBottom
      ? { bottom: 16 }
      : { top: topOffset }),
  };

  return (
    <Box sx={barSx}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton size="small" color="primary" onClick={onPrev} disabled={!hasPrev} aria-label="Anterior">
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="primary" onClick={onNext} disabled={!hasNext} aria-label="Siguiente">
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Stack>
      {showConfirmButton && (
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={onConfirmarYContinuar}
          disabled={confirmDisabled}
          sx={{ whiteSpace: "nowrap" }}
        >
          {confirmLabel}
        </Button>
      )}
      {showDuplicadoButton && typeof onDuplicadoYContinuar === "function" && (
        <Button
          size="small"
          variant="outlined"
          color="warning"
          onClick={onDuplicadoYContinuar}
          disabled={duplicadoDisabled}
          sx={{ whiteSpace: "nowrap" }}
        >
          {duplicadoLabel}
        </Button>
      )}
      <Typography variant="caption" color="text.secondary">
        {textoProgreso}
      </Typography>
      <IconButton size="small" onClick={onCloseFlow} aria-label="Cerrar corrección asistida">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default AssistedCorrectionNavigator;
