import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Divider, IconButton, Paper, Popper, Stack, Typography } from "@mui/material";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { formatDateDDMMYYYY } from "src/utils/handleDates";

const normalizeNotas = (notasValue) => {
  const notas = Array.isArray(notasValue) ? notasValue : [];
  return notas
    .map((n) => {
      const nota = typeof n?.nota === "string" ? n.nota.trim() : "";
      if (!nota) return null;
      return {
        _id: n?._id,
        nota,
        fecha: n?.fecha ? new Date(n.fecha) : null,
        updatedAt: n?.updatedAt ? new Date(n.updatedAt) : null,
      };
    })
    .filter(Boolean);
};

const getNotaSortDate = (n) => {
  const updated = n?.updatedAt instanceof Date && !Number.isNaN(n.updatedAt.getTime()) ? n.updatedAt : null;
  const created = n?.fecha instanceof Date && !Number.isNaN(n.fecha.getTime()) ? n.fecha : null;
  return updated ?? created ?? new Date(0);
};

const truncateText = (value, max = 42) => {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
};

const NotasProductoCell = ({ notas, rowId, onAddNota, onEditNota, onDeleteNota }) => {
  const normalized = useMemo(() => normalizeNotas(notas), [notas]);
  const sorted = useMemo(
    () => [...normalized].sort((a, b) => getNotaSortDate(b) - getNotaSortDate(a)),
    [normalized]
  );

  const latest = sorted[0] ?? null;
  const latestText = latest?.nota ? truncateText(latest.nota) : "";

  const [anchorEl, setAnchorEl] = useState(null);
  const closeTimerRef = useRef(null);

  const isOpen = Boolean(anchorEl);

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 150);
  }, [clearCloseTimer]);

  const handleOpenPopover = useCallback((event) => {
    clearCloseTimer();
    setAnchorEl(event.currentTarget);
  }, [clearCloseTimer]);

  const handleClosePopover = useCallback(() => {
    clearCloseTimer();
    setAnchorEl(null);
  }, [clearCloseTimer]);

  const handleEditClick = useCallback((event, nota) => {
    event.preventDefault();
    event.stopPropagation();
    onEditNota?.(nota);
    handleClosePopover();
  }, [onEditNota, handleClosePopover]);

  const handleDeleteClick = useCallback((event, nota) => {
    event.preventDefault();
    event.stopPropagation();
    onDeleteNota?.(nota);
    handleClosePopover();
  }, [onDeleteNota, handleClosePopover]);

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{ minWidth: 0 }}
        onMouseEnter={handleOpenPopover}
        onMouseLeave={scheduleClose}
      >
        <Typography
          variant="body2"
          sx={{
            maxWidth: 240,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: latest?.nota ? "text.secondary" : "text.disabled",
            fontSize: "0.75rem",
          }}
        >
          {latest?.nota ? latestText : "-"}
        </Typography>
      </Box>

      <Popper
        open={isOpen}
        anchorEl={anchorEl}
        placement="bottom-start"
        modifiers={[
          { name: "offset", options: { offset: [0, 8] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
      >
        <Paper
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          elevation={6}
          sx={{
            p: 1,
            width: 520,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: 380,
            overflowY: "auto",
          }}
        >
          {sorted.length === 0 ? (
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Sin notas
            </Typography>
          ) : (
            <Stack spacing={1}>
              {sorted.map((n, idx) => {
                const creada = n?.fecha ? formatDateDDMMYYYY(n.fecha) : "-";
                const actualizada = n?.updatedAt
                  ? formatDateDDMMYYYY(n.updatedAt)
                  : n?.fecha
                  ? formatDateDDMMYYYY(n.fecha)
                  : "-";

                return (
                  <Box key={`${rowId ?? "row"}-nota-${n?._id ?? idx}`}>
                    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", opacity: 0.95 }}>
                          Creada:{" "}
                          <Typography component="span" variant="caption" sx={{ fontWeight: 500, opacity: 0.9 }}>
                            {creada}
                          </Typography>
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", opacity: 0.95 }}>
                          Ult. actualización:{" "}
                          <Typography component="span" variant="caption" sx={{ fontWeight: 500, opacity: 0.9 }}>
                            {actualizada}
                          </Typography>
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <IconButton
                          aria-label="Editar nota"
                          size="small"
                          onClick={(event) => handleEditClick(event, n)}
                        >
                          <EditOutlinedIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          aria-label="Borrar nota"
                          size="small"
                          color="error"
                          onClick={(event) => handleDeleteClick(event, n)}
                        >
                          <DeleteOutlineOutlinedIcon fontSize="inherit" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        display: "block",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.35,
                        opacity: 0.95,
                        fontSize: "0.75rem",
                      }}
                    >
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ fontWeight: 700, opacity: 0.95, mr: 0.5 }}
                      >
                        Nota:
                      </Typography>
                      {n.nota}
                    </Typography>

                    {idx < sorted.length - 1 ? <Divider sx={{ mt: 1 }} /> : null}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Popper>

      <IconButton
        aria-label="Agregar nota al producto"
        size="small"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onAddNota?.();
        }}
        sx={{ ml: 0.25 }}
      >
        <RateReviewOutlinedIcon fontSize="inherit" />
      </IconButton>
    </Stack>
  );
};

export default NotasProductoCell;
