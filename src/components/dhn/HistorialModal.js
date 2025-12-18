import React, { useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatDateTimeToMinutes, formatDateToDDMMYYYY } from "src/utils/handleDates";

const DEFAULT_TITLE = "Historial de cambios";

const safeDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const defaultFormatDateTime = (value) => formatDateTimeToMinutes(value);

const isDateLikeString = (s) =>
  typeof s === "string" &&
  (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s));

const defaultFormatValue = (value) => {
  if (value === undefined || value === null) return "null";
  if (value instanceof Date) return formatDateToDDMMYYYY(value);

  if (typeof value === "string") {
    const s = value.trim();
    if (!s.length) return '""';
    // En Antes/Después queremos SOLO la fecha
    if (isDateLikeString(s)) return formatDateToDDMMYYYY(s);
    return s;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    const s = JSON.stringify(value, null, 2);
    const max = 450;
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch (_e) {
    return String(value);
  }
};

function HistorialModal({
  open,
  onClose,
  entity,
  isLoading = false,
  error = "",
  title = DEFAULT_TITLE,
  entityLabel = "",
  getEntityTitle,
  getEntitySubtitle,
  getLogs,
  formatDateTime,
  formatValue,
  emptyTitle = "Sin cambios registrados",
  emptyDescription = "Los cambios se registrarán automáticamente cuando se edite.",
  maxWidth = "md",
}) {
  const resolvedFormatDateTime = formatDateTime || defaultFormatDateTime;
  const resolvedFormatValue = formatValue || defaultFormatValue;

  const entityTitle = useMemo(() => {
    if (!entity) return "-";
    if (typeof getEntityTitle === "function") return getEntityTitle(entity) || "-";
    if (entity?.nombre || entity?.apellido) {
      return `${entity?.nombre || ""} ${entity?.apellido || ""}`.trim() || "-";
    }
    return entity?._id || "-";
  }, [entity, getEntityTitle]);

  const entitySubtitle = useMemo(() => {
    if (!entity) return "";
    if (typeof getEntitySubtitle === "function") return getEntitySubtitle(entity) || "";
    return "";
  }, [entity, getEntitySubtitle]);

  const orderedLogs = useMemo(() => {
    const raw =
      typeof getLogs === "function"
        ? getLogs(entity)
        : Array.isArray(entity?.logs)
        ? entity.logs
        : [];

    const logs = Array.isArray(raw) ? raw : [];

    return [...logs].sort((a, b) => {
      const ta = safeDate(a?.at)?.getTime() || 0;
      const tb = safeDate(b?.at)?.getTime() || 0;
      return tb - ta;
    });
  }, [entity, getLogs]);

  const renderValue = useCallback(
    (value) => (
      <Box
        sx={{
          mt: 0.5,
          p: 1,
          borderRadius: 1,
          bgcolor: "grey.50",
          border: "1px solid",
          borderColor: "divider",
          fontFamily: "monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {resolvedFormatValue(value)}
      </Box>
    ),
    [resolvedFormatValue]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="historial-modal-title"
    >
      <DialogTitle id="historial-modal-title">{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            {entityLabel ? (
              <Typography variant="subtitle2" color="text.secondary">
                {entityLabel}
              </Typography>
            ) : null}

            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {entityTitle}
            </Typography>

            {entitySubtitle ? (
              <Typography variant="body2" color="text.secondary">
                {entitySubtitle}
              </Typography>
            ) : null}
          </Box>

          <Divider />

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : null}

          {!isLoading && error ? (
            <Typography color="error">{error}</Typography>
          ) : null}

          {!isLoading && !error ? (
            orderedLogs.length ? (
              <Stack spacing={1}>
                {orderedLogs.map((entry, idx) => {
                  const changes = Array.isArray(entry?.changes) ? entry.changes : [];
                  const actionLabel =
                    entry?.action === "create"
                      ? "Creación"
                      : entry?.action === "update"
                      ? "Actualización"
                      : "Cambio";

                  return (
                    <Accordion key={`${entry?.at || "log"}-${idx}`} disableGutters>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          sx={{ width: "100%", pr: 1 }}
                        >
                          <Chip
                            size="small"
                            label={actionLabel}
                            color={entry?.action === "create" ? "success" : "primary"}
                            variant="outlined"
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {resolvedFormatDateTime(entry?.at)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {entry?.user || "-"}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            {changes.length} cambio{changes.length === 1 ? "" : "s"}
                          </Typography>
                        </Stack>
                      </AccordionSummary>

                      <AccordionDetails>
                        {changes.length ? (
                          <Stack spacing={1}>
                            {changes.map((c, cIdx) => (
                              <Box
                                key={`${c?.path || "path"}-${cIdx}`}
                                sx={{
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1.5,
                                  p: 1.25,
                                  bgcolor: "background.paper",
                                }}
                              >
                                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                  {c?.path || "-"}
                                </Typography>

                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  spacing={1}
                                  sx={{ alignItems: "stretch" }}
                                >
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Antes
                                    </Typography>
                                    {renderValue(c?.before)}
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Después
                                    </Typography>
                                    {renderValue(c?.after)}
                                  </Box>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography color="text.secondary">
                            No hay detalle de cambios.
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>
            ) : (
              <Box sx={{ py: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{emptyTitle}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {emptyDescription}
                </Typography>
              </Box>
            )
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default HistorialModal;
