import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LockIcon from "@mui/icons-material/Lock";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import TableChartIcon from "@mui/icons-material/TableChart";
import {
  KEY_ID,
  ORDEN_DEFAULT,
  ALL_KEYS_ORDERED,
  LABEL_DEFAULT_POR_KEY,
  LABEL_UI_POR_KEY,
} from "src/constants/columnasSheet";

const DEFAULT_ENABLED = new Set(ORDEN_DEFAULT);

function buildDefaultRows() {
  return ALL_KEYS_ORDERED.map((key) => ({
    key,
    enabled: DEFAULT_ENABLED.has(key),
    labelDraft: LABEL_DEFAULT_POR_KEY[key] || key,
  }));
}

function shouldUseDefaultColumnas(cfg) {
  if (cfg == null || typeof cfg !== "object") return true;
  const cols = cfg.columnas;
  if (!Array.isArray(cols) || cols.length === 0) return true;
  if (cols.length !== ORDEN_DEFAULT.length) return false;
  for (let i = 0; i < ORDEN_DEFAULT.length; i++) {
    if (cols[i] !== ORDEN_DEFAULT[i]) return false;
  }
  const labels = cfg.labels && typeof cfg.labels === "object" ? cfg.labels : {};
  for (const key of ORDEN_DEFAULT) {
    const v = labels[key];
    if (v == null || String(v).trim() === "") continue;
    if (String(v).trim() !== (LABEL_DEFAULT_POR_KEY[key] || key)) return false;
  }
  return true;
}

function buildRowsFromEmpresa(empresa) {
  const cfg = empresa?.columnasSheet;
  if (shouldUseDefaultColumnas(cfg)) return buildDefaultRows();
  const enabledOrder = [...cfg.columnas];
  const labels = cfg.labels && typeof cfg.labels === "object" ? cfg.labels : {};
  const disabledKeys = ALL_KEYS_ORDERED.filter((k) => !enabledOrder.includes(k));
  const fullOrder = [...enabledOrder, ...disabledKeys];
  return fullOrder.map((key) => ({
    key,
    enabled: key === KEY_ID ? true : enabledOrder.includes(key),
    labelDraft:
      labels[key] != null && String(labels[key]).trim() !== ""
        ? String(labels[key]).trim()
        : LABEL_DEFAULT_POR_KEY[key] || key,
  }));
}

// ── Live preview strip ────────────────────────────────────────────────────────

function ColumnPreviewStrip({ rows }) {
  const theme = useTheme();
  const active = rows.filter((r) => r.enabled);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        overflowX: "auto",
        "&::-webkit-scrollbar": { height: 2 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: alpha(theme.palette.primary.main, 0.2),
          borderRadius: 4,
        },
      }}
    >
      {active.map((r, i) => (
        <React.Fragment key={r.key}>
          {i > 0 && (
            <Box
              sx={{
                width: 1,
                height: 14,
                bgcolor: theme.palette.divider,
                flexShrink: 0,
                mx: 0,
              }}
            />
          )}
          <Box
            sx={{
              px: 1,
              py: 0.4,
              flexShrink: 0,
              bgcolor: i === 0 ? alpha(theme.palette.primary.main, 0.08) : "transparent",
              borderRadius: i === 0 ? 0.75 : 0,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.64rem",
                fontFamily: "'Roboto Mono', monospace",
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "primary.dark" : "text.secondary",
                whiteSpace: "nowrap",
              }}
            >
              {r.labelDraft || r.key}
            </Typography>
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
}

// ── Single active column row ──────────────────────────────────────────────────

function ActiveColumnRow({
  row,
  displayIndex,
  totalActive,
  isLoading,
  onToggle,
  onLabelChange,
  onMove,
}) {
  const theme = useTheme();
  const isId = row.key === KEY_ID;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1.25,
        py: 0.55,
        borderRadius: 1.5,
        bgcolor: isId ? alpha(theme.palette.primary.main, 0.03) : "background.paper",
        border: `1px solid ${isId ? alpha(theme.palette.primary.main, 0.15) : theme.palette.divider}`,
        borderLeft: `3px solid ${isId ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.25)}`,
        transition: "border-left-color 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          borderLeftColor: theme.palette.primary.main,
          boxShadow: `0 1px 6px ${alpha(theme.palette.common.black, 0.07)}`,
        },
      }}
    >
      {/* Position badge */}
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.58rem",
          fontWeight: 700,
          fontFamily: "'Roboto Mono', monospace",
          bgcolor: isId ? "primary.main" : alpha(theme.palette.primary.main, 0.1),
          color: isId ? "primary.contrastText" : "primary.main",
        }}
      >
        {displayIndex + 1}
      </Box>

      {/* Stacked up/down arrows */}
      <Stack sx={{ gap: 0, flexShrink: 0 }}>
        <IconButton
          size="small"
          disabled={isLoading || displayIndex <= 1}
          onClick={() => onMove(displayIndex, -1)}
          aria-label="Subir columna"
          sx={{
            p: "2px",
            borderRadius: 0.5,
            color: "text.disabled",
            "&:hover:not(:disabled)": {
              color: "primary.main",
              bgcolor: alpha(theme.palette.primary.main, 0.07),
            },
          }}
        >
          <ArrowUpwardIcon sx={{ fontSize: 11 }} />
        </IconButton>
        <IconButton
          size="small"
          disabled={isLoading || isId || displayIndex === totalActive - 1}
          onClick={() => onMove(displayIndex, 1)}
          aria-label="Bajar columna"
          sx={{
            p: "2px",
            borderRadius: 0.5,
            color: "text.disabled",
            "&:hover:not(:disabled)": {
              color: "primary.main",
              bgcolor: alpha(theme.palette.primary.main, 0.07),
            },
          }}
        >
          <ArrowDownwardIcon sx={{ fontSize: 11 }} />
        </IconButton>
      </Stack>

      {/* Label (editable) + key (monospace hint) */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          size="small"
          value={row.labelDraft}
          onChange={(e) => onLabelChange(row.origIndex, e.target.value)}
          disabled={isLoading || isId}
          placeholder={LABEL_DEFAULT_POR_KEY[row.key] || row.key}
          variant="standard"
          fullWidth
          sx={{
            "& .MuiInput-root": {
              fontSize: "0.8rem",
              fontWeight: 500,
              "&::before": { borderBottomColor: "transparent" },
              "&:hover:not(.Mui-disabled)::before": {
                borderBottomColor: alpha(theme.palette.primary.main, 0.35),
              },
              "&.Mui-focused::after": { borderBottomColor: theme.palette.primary.main },
            },
            "& .MuiInput-input.Mui-disabled": {
              WebkitTextFillColor: theme.palette.text.primary,
              cursor: "default",
            },
          }}
        />
        <Typography
          sx={{
            fontSize: "0.57rem",
            fontFamily: "'Roboto Mono', monospace",
            color: "text.disabled",
            lineHeight: 1.3,
            mt: "-1px",
          }}
        >
          {row.key}
        </Typography>
      </Box>

      {/* Lock icon (ID) or remove button */}
      {isId ? (
        <Tooltip title="Columna fija — no se puede eliminar" arrow>
          <LockIcon sx={{ fontSize: 13, color: "primary.main", flexShrink: 0, opacity: 0.6 }} />
        </Tooltip>
      ) : (
        <Tooltip title="Desactivar columna" arrow>
          <IconButton
            size="small"
            onClick={() => onToggle(row.origIndex)}
            disabled={isLoading}
            sx={{
              flexShrink: 0,
              p: "3px",
              borderRadius: 0.75,
              color: "text.disabled",
              "&:hover": {
                color: "error.main",
                bgcolor: alpha(theme.palette.error.main, 0.08),
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

// ── Available (disabled) columns — collapsible chip grid ─────────────────────

function AvailableColumnsPanel({ rows, isLoading, onToggle }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const inactive = useMemo(
    () => rows.map((r, i) => ({ ...r, origIndex: i })).filter((r) => !r.enabled),
    [rows],
  );

  if (inactive.length === 0) return null;

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px dashed ${alpha(theme.palette.neutral?.[900] || "#111927", 0.18)}`,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => setOpen((v) => !v)}
        sx={{
          px: 2,
          py: 1,
          cursor: "pointer",
          userSelect: "none",
          "&:hover": { bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.025) },
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <AddIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          <Typography
            variant="overline"
            sx={{ fontSize: "0.63rem", color: "text.secondary", lineHeight: 1 }}
          >
            Agregar columnas disponibles
          </Typography>
          <Box
            sx={{
              px: 0.75,
              py: 0.1,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.06),
              fontSize: "0.63rem",
              fontWeight: 600,
              fontFamily: "'Roboto Mono', monospace",
              color: "text.secondary",
              lineHeight: 1.6,
            }}
          >
            {inactive.length}
          </Box>
        </Stack>
        {open ? (
          <ExpandLessIcon sx={{ fontSize: 15, color: "text.disabled" }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 15, color: "text.disabled" }} />
        )}
      </Stack>

      <Collapse in={open}>
        <Box
          sx={{
            px: 1.5,
            pt: 0.75,
            pb: 1.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          {inactive.map((row) => (
            <Tooltip
              key={row.key}
              title={`${row.key} · click para agregar`}
              arrow
              placement="top"
            >
              <Chip
                label={LABEL_UI_POR_KEY[row.key] || row.key}
                size="small"
                icon={<AddIcon />}
                onClick={() => onToggle(row.origIndex)}
                disabled={isLoading}
                sx={{
                  height: 24,
                  fontSize: "0.7rem",
                  bgcolor: "transparent",
                  border: `1px dashed ${theme.palette.divider}`,
                  color: "text.secondary",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                  "& .MuiChip-icon": { fontSize: "11px !important", color: "text.disabled" },
                  "& .MuiChip-label": { px: 0.75 },
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    borderStyle: "solid",
                    color: "primary.dark",
                    "& .MuiChip-icon": { color: "primary.main" },
                  },
                }}
              />
            </Tooltip>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function ColumnasSheetConfig({ empresa, updateEmpresaData }) {
  const theme = useTheme();
  const [rows, setRows] = useState(() => buildRowsFromEmpresa(empresa));
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarInfo, setSnackbarInfo] = useState({ message: "", severity: "success" });

  useEffect(() => {
    setRows(buildRowsFromEmpresa(empresa));
  }, [empresa]);

  const activeRows = useMemo(
    () => rows.map((r, i) => ({ ...r, origIndex: i })).filter((r) => r.enabled),
    [rows],
  );

  const handleToggleEnabled = useCallback((origIndex) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[origIndex] };
      if (row.key === KEY_ID) return prev;
      row.enabled = !row.enabled;
      next[origIndex] = row;
      return next;
    });
  }, []);

  const handleLabelChange = useCallback((origIndex, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[origIndex] = { ...next[origIndex], labelDraft: value };
      return next;
    });
  }, []);

  // Moves by display index — swaps within the active subset via origIndex
  const handleMoveActive = useCallback((displayIndex, direction) => {
    setRows((prev) => {
      const activeWithIdx = prev
        .map((r, i) => ({ ...r, origIndex: i }))
        .filter((r) => r.enabled);
      const targetIdx = displayIndex + direction;
      if (displayIndex <= 0 || targetIdx < 1 || targetIdx >= activeWithIdx.length) return prev;
      const next = [...prev];
      const origA = activeWithIdx[displayIndex].origIndex;
      const origB = activeWithIdx[targetIdx].origIndex;
      [next[origA], next[origB]] = [next[origB], next[origA]];
      return next;
    });
  }, []);

  const handleSave = async () => {
    const enabledRows = rows.filter((r) => r.enabled);
    const columnas = [KEY_ID, ...enabledRows.map((r) => r.key).filter((k) => k !== KEY_ID)];
    const labels = {};
    enabledRows.forEach((r) => {
      const def = LABEL_DEFAULT_POR_KEY[r.key] || r.key;
      const draft = (r.labelDraft || "").trim();
      if (draft && draft !== def) {
        labels[r.key] = draft;
      }
    });

    setIsLoading(true);
    try {
      await updateEmpresaData(empresa.id, { columnasSheet: { columnas, labels } });
      setSnackbarInfo({
        message: "Configuración guardada. Se regeneraron cabeceras y movimientos históricos.",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setSnackbarInfo({
        message: "No se pudo guardar o regenerar. Intentá de nuevo.",
        severity: "error",
      });
    }
    setSnackbarOpen(true);
    setIsLoading(false);
  };

  const handleResetDefault = async () => {
    setIsLoading(true);
    try {
      await updateEmpresaData(empresa.id, { columnasSheet: null });
      setRows(buildDefaultRows());
      setSnackbarInfo({
        message: "Default restablecido. Se regeneraron cabeceras y movimientos históricos.",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setSnackbarInfo({ message: "Error al restablecer.", severity: "error" });
    }
    setSnackbarOpen(true);
    setIsLoading(false);
  };

  return (
    <>
      {/* Section header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 4, mb: 0.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TableChartIcon sx={{ fontSize: 17, color: "primary.main" }} />
        </Box>
        <Typography variant="h6">Columnas de la planilla de movimientos</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, pl: "44px" }}>
        Definí qué columnas aparecen en el Google Sheet y sus encabezados. El orden de la lista
        determina el orden de las columnas.
      </Typography>

      {/* Live preview strip */}
      <Box
        sx={{
          mb: 2,
          px: 1.5,
          pt: 1,
          pb: 1.25,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.02),
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
          <Typography
            variant="overline"
            sx={{ fontSize: "0.6rem", color: "text.disabled", lineHeight: 1 }}
          >
            Vista previa de cabeceras
          </Typography>
          <Box
            sx={{
              px: 0.65,
              py: 0.1,
              borderRadius: 0.75,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              fontSize: "0.6rem",
              fontWeight: 600,
              fontFamily: "'Roboto Mono', monospace",
              color: "primary.dark",
              lineHeight: 1.6,
            }}
          >
            {activeRows.length}
          </Box>
        </Stack>
        <ColumnPreviewStrip rows={rows} />
      </Box>

      {/* Active columns list */}
      <Box
        sx={{
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          mb: 1.5,
        }}
      >
        {/* List header */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 2,
            py: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: "0.63rem", color: "primary.dark", lineHeight: 1 }}
          >
            Columnas activas
          </Typography>
          <Box
            sx={{
              px: 0.75,
              py: 0.1,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              fontSize: "0.63rem",
              fontWeight: 700,
              fontFamily: "'Roboto Mono', monospace",
              color: "primary.dark",
              lineHeight: 1.6,
            }}
          >
            {activeRows.length}
          </Box>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: "0.6rem", ml: "auto !important" }}
          >
            Hacé clic en el nombre para editar el encabezado
          </Typography>
        </Stack>

        <Stack spacing={0.5} sx={{ p: 1 }}>
          {activeRows.map((row, displayIndex) => (
            <ActiveColumnRow
              key={row.key}
              row={row}
              displayIndex={displayIndex}
              totalActive={activeRows.length}
              isLoading={isLoading}
              onToggle={handleToggleEnabled}
              onLabelChange={handleLabelChange}
              onMove={handleMoveActive}
            />
          ))}
        </Stack>
      </Box>

      {/* Available columns */}
      <AvailableColumnsPanel rows={rows} isLoading={isLoading} onToggle={handleToggleEnabled} />

      {/* Action buttons */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isLoading}
          startIcon={isLoading ? null : <SaveIcon sx={{ fontSize: "16px !important" }} />}
          size="small"
        >
          {isLoading && <CircularProgress size={16} sx={{ mr: 1 }} />}
          Guardar columnas
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleResetDefault}
          disabled={isLoading}
          startIcon={<RestoreIcon sx={{ fontSize: "16px !important" }} />}
          size="small"
          sx={{
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": { borderColor: "text.secondary" },
          }}
        >
          Restablecer default
        </Button>
      </Stack>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarInfo.severity}
          sx={{ width: "100%" }}
        >
          {snackbarInfo.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ColumnasSheetConfig;
