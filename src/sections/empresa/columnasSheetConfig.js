import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import {
  KEY_ID,
  ORDEN_DEFAULT,
  LABEL_DEFAULT_POR_KEY,
  LABEL_UI_POR_KEY,
} from "src/constants/columnasSheet";

/**
 * Estado inicial: todas las columnas activas, en el mismo orden histórico que la planilla
 * antes de la personalización (espejo de ORDEN_DEFAULT / backend).
 */
function buildDefaultRows() {
  return ORDEN_DEFAULT.map((key) => ({
    key,
    enabled: true,
    labelDraft: LABEL_DEFAULT_POR_KEY[key] || key,
  }));
}

/**
 * Sin config guardada, o config equivalente al default completo (orden + labels técnicos).
 */
function shouldUseDefaultColumnas(cfg) {
  if (cfg == null || typeof cfg !== "object") {
    return true;
  }
  const cols = cfg.columnas;
  if (!Array.isArray(cols) || cols.length === 0) {
    return true;
  }
  if (cols.length !== ORDEN_DEFAULT.length) {
    return false;
  }
  for (let i = 0; i < ORDEN_DEFAULT.length; i++) {
    if (cols[i] !== ORDEN_DEFAULT[i]) {
      return false;
    }
  }
  const labels = cfg.labels && typeof cfg.labels === "object" ? cfg.labels : {};
  for (const key of ORDEN_DEFAULT) {
    const v = labels[key];
    if (v == null || String(v).trim() === "") {
      continue;
    }
    if (String(v).trim() !== (LABEL_DEFAULT_POR_KEY[key] || key)) {
      return false;
    }
  }
  return true;
}

function buildRowsFromEmpresa(empresa) {
  const cfg = empresa?.columnasSheet;
  if (shouldUseDefaultColumnas(cfg)) {
    return buildDefaultRows();
  }
  const enabledOrder = [...cfg.columnas];
  const labels = cfg.labels && typeof cfg.labels === "object" ? cfg.labels : {};
  const disabledKeys = ORDEN_DEFAULT.filter((k) => !enabledOrder.includes(k));
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

function ColumnasSheetConfig({ empresa, updateEmpresaData }) {
  const [rows, setRows] = useState(() => buildRowsFromEmpresa(empresa));
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarInfo, setSnackbarInfo] = useState({ message: "", severity: "success" });

  useEffect(() => {
    setRows(buildRowsFromEmpresa(empresa));
  }, [empresa]);

  const previewHeaders = useMemo(
    () => rows.filter((r) => r.enabled).map((r) => r.labelDraft || r.key),
    [rows],
  );

  const handleToggleEnabled = useCallback((index) => {
    if (index === 0) return;
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      if (row.key === KEY_ID) return prev;
      row.enabled = !row.enabled;
      next[index] = row;
      return next;
    });
  }, []);

  const handleLabelChange = useCallback((index, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], labelDraft: value };
      return next;
    });
  }, []);

  const handleMove = useCallback((index, direction) => {
    if (index === 0) return;
    const dest = index + direction;
    if (dest <= 0 || dest >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[dest]] = [next[dest], next[index]];
      return next;
    });
  }, [rows.length]);

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
      await updateEmpresaData(empresa.id, {
        columnasSheet: { columnas, labels },
      });
      setSnackbarInfo({
        message: "Configuración guardada. Se regeneraron cabeceras y movimientos históricos.",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setSnackbarInfo({ message: "No se pudo guardar o regenerar. Intentá de nuevo.", severity: "error" });
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
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Columnas de la planilla de movimientos (Google Sheet)
      </Typography>
      <Stack spacing={1}>
        {rows.map((row, index) => {
          const isId = row.key === KEY_ID;
          const uiHint = LABEL_UI_POR_KEY[row.key] || row.key;
          return (
            <Card key={row.key} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Checkbox
                    checked={row.enabled}
                    onChange={() => handleToggleEnabled(index)}
                    disabled={isId || isLoading}
                    inputProps={{ "aria-label": `Incluir columna ${row.key}` }}
                  />
                  <Typography variant="body2" sx={{ minWidth: 140, fontWeight: 500 }}>
                    {uiHint}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({row.key})
                  </Typography>
                  {isId && (
                    <Chip size="small" label="Fija" color="primary" variant="outlined" />
                  )}
                  <TextField
                    size="small"
                    label="Encabezado en Sheet"
                    value={row.labelDraft}
                    onChange={(e) => handleLabelChange(index, e.target.value)}
                    disabled={!row.enabled || isLoading}
                    placeholder={LABEL_DEFAULT_POR_KEY[row.key] || row.key}
                    sx={{ flex: 1, minWidth: 180 }}
                  />
                  <Stack direction="row">
                    <Tooltip title="Subir">
                      <span>
                        <IconButton
                          size="small"
                          disabled={isLoading || index <= 1}
                          onClick={() => handleMove(index, -1)}
                          aria-label="Subir columna"
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Bajar">
                      <span>
                        <IconButton
                          size="small"
                          disabled={isLoading || index === 0 || index === rows.length - 1}
                          onClick={() => handleMove(index, 1)}
                          aria-label="Bajar columna"
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : "Guardar columnas"}
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleResetDefault} disabled={isLoading}>
          Restablecer default
        </Button>
      </Stack>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarInfo.severity} sx={{ width: "100%" }}>
          {snackbarInfo.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ColumnasSheetConfig;
