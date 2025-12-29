import { Box, Tooltip, IconButton, Button, CircularProgress, TextField, Chip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReplayIcon from "@mui/icons-material/Replay";
import EditIcon from "@mui/icons-material/Edit";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import { getStatusChipConfig } from "src/utils/dhn/syncHelpers";
import { buildFechaDetectadaPatch } from "src/utils/dhn/trabajoRegistradoHelpers";
import { parsearTrabajadoresNoIdentificados } from "src/utils/dhn/trabajadoresHelpers";

export const StatusChip = ({ status }) => {
  const cfg = getStatusChipConfig(status);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        border: "1px solid",
        borderColor: cfg.color,
        color: cfg.color,
        fontWeight: 500,
        fontSize: "0.7rem",
        px: 1,
        py: "2px",
        borderRadius: 1,
      }}
    >
      {cfg.label}
    </Box>
  );
};

export const ArchivoCell = ({ row, onOpenImage }) => {
  const name = typeof row?.file_name === "string" ? row.file_name.trim() : "";
  const hasImage = Boolean(row?.url_storage);
  const hasDrive = Boolean(row?.url_drive);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title={name || "-"} placement="top" arrow>
        <Box
          component="span"
          sx={{
            display: "inline-block",
            maxWidth: 200,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            verticalAlign: "bottom",
            cursor: "default",
          }}
        >
          {name || "-"}
        </Box>
      </Tooltip>

      <Tooltip title={hasImage ? "Ver imagen" : "Sin imagen"} placement="top">
        <Box component="span" sx={{ display: "inline-flex" }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (!hasImage) return;
              onOpenImage(row.url_storage, row.file_name);
            }}
            disabled={!hasImage}
            sx={{ p: "4px" }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Box>
      </Tooltip>

      <Tooltip title={hasDrive ? "Abrir en Drive" : "Sin URL Drive"} placement="top">
        <Box component="span" sx={{ display: "inline-flex" }}>
          <IconButton
            size="small"
            href={hasDrive ? row.url_drive : undefined}
            target={hasDrive ? "_blank" : undefined}
            rel={hasDrive ? "noreferrer" : undefined}
            onClick={(e) => e.stopPropagation()}
            disabled={!hasDrive}
            sx={{ p: "4px" }}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );
};

export const AccionesCell = ({
  row,
  isParte,
  resyncingId,
  handleResyncUrlStorage,
  handleOpenResolverLicencia,
  handleOpenResolverParte,
}) => {
  const isError = row?.status === "error";
  const shouldShowButton = Boolean(isParte) || isError;
  if (!shouldShowButton) return "-";

  const isResyncing = resyncingId === row?._id;
  const isProcessing = row?.status === "processing";
  const buttonColor = isError ? "error" : "primary";
  const isLicenciaRow = String(row?.tipo || "").toLowerCase() === "licencia";
  const isParteRow = String(row?.tipo || "").toLowerCase() === "parte";
  return (
    <Box component="span" sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}>
      <Tooltip
        title={isError ? "Reintentar sincronización" : "Resincronizar / reprocesar"}
        placement="top"
      >
        <span>
          {isResyncing ? (
            <IconButton
              size="small"
              disabled
              sx={{ p: 0.5 }}
            >
              <CircularProgress size={16} />
            </IconButton>
          ) : (
            <IconButton
              size="small"
              color={buttonColor}
              onClick={(e) => {
                e.stopPropagation();
                handleResyncUrlStorage(row);
              }}
              disabled={Boolean(resyncingId) || isProcessing}
              sx={{
                p: 0.5,
                border: "1px solid",
                borderColor: buttonColor === "error" ? "error.main" : "primary.main",
                color: buttonColor === "error" ? "error.main" : "primary.main",
                "&:hover": {
                  backgroundColor: buttonColor === "error" ? "error.light" : "primary.light",
                  borderColor: buttonColor === "error" ? "error.dark" : "primary.dark",
                },
              }}
            >
              <ReplayIcon fontSize="small" />
            </IconButton>
          )}
        </span>
      </Tooltip>
      {isLicenciaRow && isError && (
        <Tooltip title="Resolver manualmente" placement="top">
          <span>
            <IconButton
              size="small"
              color="success"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenResolverLicencia(row);
              }}
              disabled={Boolean(resyncingId) || isResyncing || isProcessing || !row?.url_storage}
              sx={{
                p: 0.5,
                border: "1px solid",
                borderColor: "success.main",
                color: "success.main",
                "&:hover": {
                  backgroundColor: "success.light",
                  borderColor: "success.dark",
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {isParteRow && isError && (
        <Tooltip title="Resolver parte manualmente" placement="top">
          <span>
            <IconButton
              size="small"
              color="success"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenResolverParte?.(row);
              }}
              disabled={
                Boolean(resyncingId) ||
                isResyncing ||
                isProcessing ||
                !row?.url_storage
              }
              sx={{
                p: 0.5,
                border: "1px solid",
                borderColor: "success.main",
                color: "success.main",
                "&:hover": {
                  backgroundColor: "success.light",
                  borderColor: "success.dark",
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export const FechaDetectadaCell = ({
  row,
  canEditFecha,
  isParte,
  isLicencia,
  editingId,
  editingValue,
  setEditingId,
  setEditingValue,
  savingId,
  setSavingId,
  setItems,
  setAlert,
}) => {
  const value = typeof row?.fechasDetectadas === "string" ? row.fechasDetectadas : "-";
  const hasValue = value && value !== "-" && value.trim().length > 0;
  const isRange = hasValue && value.includes(" - ");
  const isEditing = canEditFecha && editingId === row?._id;

  const handleSave = async (event) => {
    event.stopPropagation();
    const nuevaFecha = editingValue.trim();
    if (!nuevaFecha) return;
    const patch = buildFechaDetectadaPatch({ tipo: row?.tipo }, nuevaFecha);
    if (!Object.keys(patch).length) {
      setAlert({
        open: true,
        severity: "warning",
        message: "Formato de fecha detectada inválido",
      });
      return;
    }
    try {
      setSavingId(row._id);
      const resp = await TrabajoRegistradoService.updateByComprobante(row.url_storage, patch);
      setItems((prev) =>
        prev.map((item) =>
          item._id === row._id ? { ...item, fechasDetectadas: nuevaFecha } : item
        )
      );
      const updatedCount =
        resp?.modifiedCount ?? resp?.data?.modifiedCount ?? 0;
      setAlert({
        open: true,
        severity: "success",
        message:
          updatedCount > 0
            ? `Fecha detectada actualizada en ${updatedCount} trabajo${updatedCount === 1 ? "" : "s"} diario${updatedCount === 1 ? "" : "s"}`
            : "Fecha detectada actualizada",
      });
      setEditingId(null);
      setEditingValue("");
    } catch (error) {
      console.error("Error actualizando fecha detectada:", error);
      setAlert({
        open: true,
        severity: "error",
        message: "Error al actualizar la fecha detectada",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <TextField
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          size="small"
          variant="standard"
          sx={{ maxWidth: isRange ? 220 : 110 }}
          placeholder={
            isLicencia ? (isRange ? "DD/MM/AAAA - DD/MM/AAAA" : "DD/MM/AAAA") : "DD/MM/AAAA"
          }
        />
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={savingId === row?._id}
          sx={{ p: 0.5 }}
        >
          ✓
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(null);
            setEditingValue("");
          }}
          sx={{ p: 0.5 }}
        >
          ✕
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box component="span">{value}</Box>
      {canEditFecha && hasValue && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(row._id);
            setEditingValue(value);
          }}
          sx={{ p: 0.25 }}
        >
          ✎
        </IconButton>
      )}
    </Box>
  );
};

export const ObservacionCell = ({ row, handleResolverTrabajador }) => {
  const observacion = row?.observacion || "-";
  const trabajadoresNoIdentificados = parsearTrabajadoresNoIdentificados(observacion);

  if (trabajadoresNoIdentificados.length > 0) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxWidth: "600px" }}>
        <Box component="span" sx={{ fontSize: "0.8rem", color: "text.secondary", mr: 0.5 }}>
          Trabajadores no identificados:
        </Box>
        {trabajadoresNoIdentificados.map((trabajador, idx) => (
          <Chip
            key={idx}
            label={`${trabajador.nombre} ${trabajador.apellido} (${trabajador.dni})`}
            size="small"
            variant="outlined"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleResolverTrabajador(trabajador, row?.url_storage);
            }}
            sx={{
              cursor: "pointer",
              borderColor: "primary.main",
              color: "primary.main",
              transition: "all .2s ease",
              "&:hover": {
                backgroundColor: "rgba(25, 118, 210, 0.12)",
                color: "primary.dark",
                borderColor: "primary.dark",
              },
            }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: "420px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {observacion}
    </Box>
  );
};
