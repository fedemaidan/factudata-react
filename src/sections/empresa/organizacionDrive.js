import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FolderIcon from "@mui/icons-material/Folder";
import GridOnIcon from "@mui/icons-material/GridOn";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import TableChartIcon from "@mui/icons-material/TableChart";
import { getProyectosByEmpresa } from "src/services/proyectosService";
import {
  KEY_ID,
  ORDEN_DEFAULT,
  ALL_KEYS_ORDERED,
  LABEL_DEFAULT_POR_KEY,
  LABEL_UI_POR_KEY,
} from "src/constants/columnasSheet";
import {
  getSheetConfigsByEmpresa,
  createSheetConfig,
  updateSheetConfig,
  deleteSheetConfig,
} from "src/services/sheetConfigService";

// ────────────────────────────────────────────────────────────────
//  Campos disponibles para condiciones de reglas de sheets
// ────────────────────────────────────────────────────────────────
const CAMPOS_CONDICION = [
  { value: "categoria", label: "Categoría" },
  { value: "subcategoria", label: "Subcategoría" },
  { value: "etapa", label: "Etapa" },
  { value: "estado", label: "Estado" },
  { value: "type", label: "Tipo", hint: "ingreso / egreso" },
  { value: "moneda", label: "Moneda", hint: "ARS / USD" },
  { value: "medio_pago", label: "Medio de Pago" },
  { value: "tipo_factura", label: "Tipo de Factura" },
  { value: "nombre_proveedor", label: "Proveedor" },
  { value: "caja_chica", label: "Caja Chica", hint: "true / false" },
  { value: "factura_cliente", label: "Factura Cliente", hint: "true / false" },
];

function getLabelCampo(value) {
  return CAMPOS_CONDICION.find((c) => c.value === value)?.label || value;
}

function getHintCampo(value) {
  return CAMPOS_CONDICION.find((c) => c.value === value)?.hint || "";
}

// ────────────────────────────────────────────────────────────────
//  Column ordering helpers (reused from deleted ColumnasSheetConfig)
// ────────────────────────────────────────────────────────────────

const DEFAULT_ENABLED = new Set(ORDEN_DEFAULT);

function buildDefaultRows() {
  return ALL_KEYS_ORDERED.map((key) => ({
    key,
    enabled: DEFAULT_ENABLED.has(key),
    labelDraft: LABEL_DEFAULT_POR_KEY[key] || key,
  }));
}

function buildRowsFromConfig(cfg) {
  if (!cfg || !Array.isArray(cfg.columnas) || cfg.columnas.length === 0) return buildDefaultRows();
  const enabledOrder = [...cfg.columnas];
  const labels = cfg.labels && typeof cfg.labels === "object" ? cfg.labels : {};
  const disabledKeys = ALL_KEYS_ORDERED.filter((k) => !enabledOrder.includes(k));
  return [...enabledOrder, ...disabledKeys].map((key) => ({
    key,
    enabled: key === KEY_ID ? true : enabledOrder.includes(key),
    labelDraft:
      labels[key] != null && String(labels[key]).trim() !== ""
        ? String(labels[key]).trim()
        : LABEL_DEFAULT_POR_KEY[key] || key,
  }));
}

function ActiveColumnRow({ row, displayIndex, totalActive, onToggle, onLabelChange, onMove }) {
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
      <Stack sx={{ gap: 0, flexShrink: 0 }}>
        <IconButton
          size="small"
          disabled={displayIndex <= 1}
          onClick={() => onMove(displayIndex, -1)}
          sx={{
            p: "2px",
            borderRadius: 0.5,
            color: "text.disabled",
            "&:hover:not(:disabled)": { color: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.07) },
          }}
        >
          <ArrowUpwardIcon sx={{ fontSize: 11 }} />
        </IconButton>
        <IconButton
          size="small"
          disabled={isId || displayIndex === totalActive - 1}
          onClick={() => onMove(displayIndex, 1)}
          sx={{
            p: "2px",
            borderRadius: 0.5,
            color: "text.disabled",
            "&:hover:not(:disabled)": { color: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.07) },
          }}
        >
          <ArrowDownwardIcon sx={{ fontSize: 11 }} />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          size="small"
          value={row.labelDraft}
          onChange={(e) => onLabelChange(row.origIndex, e.target.value)}
          disabled={isId}
          placeholder={LABEL_DEFAULT_POR_KEY[row.key] || row.key}
          variant="standard"
          fullWidth
          sx={{
            "& .MuiInput-root": {
              fontSize: "0.8rem",
              fontWeight: 500,
              "&::before": { borderBottomColor: "transparent" },
              "&:hover:not(.Mui-disabled)::before": { borderBottomColor: alpha(theme.palette.primary.main, 0.35) },
              "&.Mui-focused::after": { borderBottomColor: theme.palette.primary.main },
            },
            "& .MuiInput-input.Mui-disabled": { WebkitTextFillColor: theme.palette.text.primary, cursor: "default" },
          }}
        />
        <Typography sx={{ fontSize: "0.57rem", fontFamily: "'Roboto Mono', monospace", color: "text.disabled", lineHeight: 1.3, mt: "-1px" }}>
          {row.key}
        </Typography>
      </Box>
      {isId ? (
        <Tooltip title="Columna fija — no se puede eliminar" arrow>
          <LockIcon sx={{ fontSize: 13, color: "primary.main", flexShrink: 0, opacity: 0.6 }} />
        </Tooltip>
      ) : (
        <Tooltip title="Desactivar columna" arrow>
          <IconButton
            size="small"
            onClick={() => onToggle(row.origIndex)}
            sx={{
              flexShrink: 0,
              p: "3px",
              borderRadius: 0.75,
              color: "text.disabled",
              "&:hover": { color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08) },
            }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

function AvailableColumnsPanel({ rows, onToggle }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const inactive = useMemo(
    () => rows.map((r, i) => ({ ...r, origIndex: i })).filter((r) => !r.enabled),
    [rows],
  );
  if (inactive.length === 0) return null;
  return (
    <Box sx={{ borderRadius: 2, border: `1px dashed ${alpha(theme.palette.neutral?.[900] || "#111927", 0.18)}`, overflow: "hidden" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => setOpen((v) => !v)}
        sx={{ px: 2, py: 1, cursor: "pointer", userSelect: "none", "&:hover": { bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.025) } }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <AddIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          <Typography variant="overline" sx={{ fontSize: "0.63rem", color: "text.secondary", lineHeight: 1 }}>
            Agregar columnas disponibles
          </Typography>
          <Box sx={{ px: 0.75, py: 0.1, borderRadius: 1, bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.06), fontSize: "0.63rem", fontWeight: 600, fontFamily: "'Roboto Mono', monospace", color: "text.secondary", lineHeight: 1.6 }}>
            {inactive.length}
          </Box>
        </Stack>
        {open ? <ExpandLessIcon sx={{ fontSize: 15, color: "text.disabled" }} /> : <ExpandMoreIcon sx={{ fontSize: 15, color: "text.disabled" }} />}
      </Stack>
      <Collapse in={open}>
        <Box sx={{ px: 1.5, pt: 0.75, pb: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75, borderTop: `1px solid ${theme.palette.divider}` }}>
          {inactive.map((row) => (
            <Tooltip key={row.key} title={`${row.key} · click para agregar`} arrow placement="top">
              <Chip
                label={LABEL_UI_POR_KEY[row.key] || row.key}
                size="small"
                icon={<AddIcon />}
                onClick={() => onToggle(row.origIndex)}
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
                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06), borderColor: alpha(theme.palette.primary.main, 0.4), borderStyle: "solid", color: "primary.dark", "& .MuiChip-icon": { color: "primary.main" } },
                }}
              />
            </Tooltip>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────
//  SheetConfigsSection — planillas adicionales por empresa
// ────────────────────────────────────────────────────────────────

const SHEET_EMPTY_FORM = {
  nombre: "",
  sheet_id: "",
  sheet_nombre: "",
  tab_name: "",
  proyecto_id: null,
  condiciones: [],
  columnas: null,
  activo: true,
};

function SheetConfigsSection({ empresa }) {
  const theme = useTheme();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...SHEET_EMPTY_FORM });
  const [usarColumnasCustom, setUsarColumnasCustom] = useState(false);
  const [columnRows, setColumnRows] = useState(() => buildDefaultRows());
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" });
  const [proyectosEmpresa, setProyectosEmpresa] = useState([]);

  useEffect(() => {
    if (!empresa?.id) return;
    loadConfigs();
    getProyectosByEmpresa(empresa).then(setProyectosEmpresa).catch(() => {});
  }, [empresa?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConfigs = async () => {
    setLoading(true);
    const data = await getSheetConfigsByEmpresa(empresa.id);
    setConfigs(data);
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of configs) {
      if (!map.has(c.sheet_id)) {
        map.set(c.sheet_id, {
          sheet_id: c.sheet_id,
          sheet_nombre: c.sheet_nombre || c.sheet_id,
          tabs: [],
        });
      }
      map.get(c.sheet_id).tabs.push(c);
    }
    return Array.from(map.values());
  }, [configs]);

  const handleToggleEnabled = useCallback((origIndex) => {
    setColumnRows((prev) => {
      const next = [...prev];
      const row = { ...next[origIndex] };
      if (row.key === KEY_ID) return prev;
      row.enabled = !row.enabled;
      next[origIndex] = row;
      return next;
    });
  }, []);

  const handleLabelChange = useCallback((origIndex, value) => {
    setColumnRows((prev) => {
      const next = [...prev];
      next[origIndex] = { ...next[origIndex], labelDraft: value };
      return next;
    });
  }, []);

  const handleMoveActive = useCallback((displayIndex, direction) => {
    setColumnRows((prev) => {
      const activeWithIdx = prev.map((r, i) => ({ ...r, origIndex: i })).filter((r) => r.enabled);
      const targetIdx = displayIndex + direction;
      if (displayIndex <= 0 || targetIdx < 1 || targetIdx >= activeWithIdx.length) return prev;
      const next = [...prev];
      const origA = activeWithIdx[displayIndex].origIndex;
      const origB = activeWithIdx[targetIdx].origIndex;
      [next[origA], next[origB]] = [next[origB], next[origA]];
      return next;
    });
  }, []);

  const openCreate = (prefillSheetId = "", prefillSheetNombre = "") => {
    setForm({ ...SHEET_EMPTY_FORM, sheet_id: prefillSheetId, sheet_nombre: prefillSheetNombre });
    setUsarColumnasCustom(false);
    setColumnRows(buildDefaultRows());
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (config) => {
    setForm({
      nombre: config.nombre || "",
      sheet_id: config.sheet_id || "",
      sheet_nombre: config.sheet_nombre || "",
      tab_name: config.tab_name || "",
      proyecto_id: config.proyecto_id || null,
      condiciones: config.condiciones || [],
      columnas: config.columnas || null,
      activo: config.activo !== false,
    });
    const hasCustom = !!(config.columnas?.columnas?.length);
    setUsarColumnasCustom(hasCustom);
    setColumnRows(buildRowsFromConfig(config.columnas));
    setEditingId(config._id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.sheet_id.trim() || !form.tab_name.trim()) return;
    setSaving(true);
    let columnasPayload = null;
    if (usarColumnasCustom) {
      const enabledRows = columnRows.filter((r) => r.enabled);
      const columnas = enabledRows.map((r) => r.key);
      const labels = {};
      enabledRows.forEach((r) => {
        const def = LABEL_DEFAULT_POR_KEY[r.key] || r.key;
        const draft = (r.labelDraft || "").trim();
        if (draft && draft !== def) labels[r.key] = draft;
      });
      columnasPayload = { columnas, labels };
    }
    const payload = {
      ...form,
      empresa_id: empresa.id,
      proyecto_id: form.proyecto_id || null,
      columnas: columnasPayload,
    };
    const result = editingId
      ? await updateSheetConfig(editingId, payload)
      : await createSheetConfig(payload);
    setSaving(false);
    if (result.error) {
      setSnackbar({ open: true, msg: "Error al guardar la configuración.", severity: "error" });
    } else {
      setSnackbar({
        open: true,
        msg: editingId ? "Configuración actualizada." : "Configuración creada.",
        severity: "success",
      });
      setDialogOpen(false);
      loadConfigs();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await deleteSheetConfig(id);
    if (error) {
      setSnackbar({ open: true, msg: "Error al eliminar.", severity: "error" });
    } else {
      setSnackbar({ open: true, msg: "Configuración eliminada.", severity: "success" });
      loadConfigs();
    }
  };

  const handleToggleActivo = async (config) => {
    await updateSheetConfig(config._id, { activo: !config.activo });
    loadConfigs();
  };

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const agregarCondicion = () =>
    setField("condiciones", [...(form.condiciones || []), { campo: "categoria", valor: "" }]);
  const eliminarCondicion = (idx) =>
    setField("condiciones", form.condiciones.filter((_, i) => i !== idx));
  const actualizarCondicion = (idx, key, val) =>
    setField(
      "condiciones",
      form.condiciones.map((c, i) => (i === idx ? { ...c, [key]: val } : c)),
    );

  const isValid = form.sheet_id.trim() && form.tab_name.trim();

  return (
    <>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.success.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GridOnIcon sx={{ fontSize: 17, color: "success.main" }} />
        </Box>
        <Typography variant="h6">Planillas adicionales</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, pl: "44px" }}>
        Configurá planillas y solapas extras donde escribir movimientos. Cada configuración define{" "}
        <em>a qué hoja</em>, <em>qué filtros aplicar</em> y <em>qué columnas incluir</em>.
      </Typography>

      {loading ? (
        <LinearProgress sx={{ borderRadius: 1, mb: 2 }} />
      ) : grouped.length === 0 ? (
        <Box
          sx={{
            border: `1.5px dashed ${alpha(theme.palette.success.main, 0.3)}`,
            borderRadius: 2,
            p: 5,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(${alpha(theme.palette.success.main, 0.035)} 1px, transparent 1px),
                linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.035)} 1px, transparent 1px)
              `,
              backgroundSize: "32px 24px",
              pointerEvents: "none",
            },
          }}
        >
          <GridOnIcon
            sx={{ fontSize: 40, color: alpha(theme.palette.success.main, 0.35), mb: 1.5 }}
          />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sin configuraciones de planillas.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Agregá tu primera planilla para enrutar movimientos a hojas adicionales.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {grouped.map((group) => (
            <Box
              key={group.sheet_id}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderLeft: `3px solid ${theme.palette.success.main}`,
                bgcolor: alpha(theme.palette.success.main, 0.012),
                overflow: "hidden",
              }}
            >
              {/* Group header */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1.25,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.success.main, 0.04),
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <GridOnIcon sx={{ fontSize: 16, color: "success.main", flexShrink: 0 }} />
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {group.sheet_nombre || group.sheet_id}
                  </Typography>
                  <Chip
                    label={group.sheet_id}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontFamily: '"Roboto Mono", monospace',
                      maxWidth: 200,
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                      color: "success.dark",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                </Stack>
                <Tooltip title="Agregar solapa en esta planilla">
                  <IconButton
                    size="small"
                    onClick={() => openCreate(group.sheet_id, group.sheet_nombre)}
                    sx={{
                      flexShrink: 0,
                      color: "success.main",
                      "&:hover": { bgcolor: alpha(theme.palette.success.main, 0.1) },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Tab rows */}
              <Stack divider={<Divider />}>
                {group.tabs.map((config) => (
                  <Stack
                    key={config._id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      px: 2,
                      py: 1.25,
                      opacity: config.activo !== false ? 1 : 0.5,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <TableChartIcon sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0 }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: '"Roboto Mono", monospace',
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        minWidth: 100,
                        flexShrink: 0,
                      }}
                    >
                      {config.tab_name}
                    </Typography>

                    <Box sx={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {!config.condiciones?.length ? (
                        <Chip
                          label="todos los movimientos"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.68rem",
                            bgcolor: alpha(theme.palette.info.main, 0.08),
                            color: "info.dark",
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                      ) : (
                        config.condiciones.map((cond, i) => (
                          <Chip
                            key={i}
                            label={`${getLabelCampo(cond.campo)} = ${cond.valor}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.68rem",
                              fontFamily: '"Roboto Mono", monospace',
                              bgcolor: alpha(theme.palette.warning.main, 0.08),
                              color: "warning.dark",
                              "& .MuiChip-label": { px: 1 },
                            }}
                          />
                        ))
                      )}
                    </Box>

                    <Chip
                      label={
                        config.columnas?.columnas?.length
                          ? `${config.columnas.columnas.length} cols`
                          : "default"
                      }
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        flexShrink: 0,
                        bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.05),
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />

                    {config.proyecto_id && (
                      <Chip
                        label={
                          proyectosEmpresa.find((p) => p.id === config.proyecto_id)?.nombre ||
                          config.proyecto_id
                        }
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          flexShrink: 0,
                          bgcolor: alpha(theme.palette.primary.main, 0.07),
                          color: "primary.dark",
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    )}

                    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Tooltip title={config.activo !== false ? "Desactivar" : "Activar"}>
                        <Switch
                          size="small"
                          checked={config.activo !== false}
                          onChange={() => handleToggleActivo(config)}
                          color="success"
                        />
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => openEdit(config)}
                          sx={{
                            color: "text.disabled",
                            "&:hover": {
                              color: "primary.main",
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(config._id)}
                          sx={{
                            color: "text.disabled",
                            "&:hover": {
                              color: "error.main",
                              bgcolor: alpha(theme.palette.error.main, 0.08),
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Button
        startIcon={<AddIcon />}
        onClick={() => openCreate()}
        variant="outlined"
        size="small"
        sx={{
          mt: 2,
          borderStyle: "dashed",
          color: "success.main",
          borderColor: alpha(theme.palette.success.main, 0.4),
          "&:hover": {
            borderStyle: "solid",
            bgcolor: alpha(theme.palette.success.main, 0.04),
          },
        }}
      >
        Nueva configuración de planilla
      </Button>

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, border: `1px solid ${theme.palette.divider}` },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GridOnIcon sx={{ fontSize: 15, color: "success.main" }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {editingId ? "Editar configuración" : "Nueva configuración de planilla"}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Stack spacing={3}>
            {/* Identificación */}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "text.disabled", fontSize: "0.65rem", letterSpacing: "0.8px" }}
              >
                Identificación
              </Typography>
              <TextField
                value={form.nombre}
                onChange={(e) => setField("nombre", e.target.value)}
                label="Etiqueta (opcional)"
                size="small"
                fullWidth
                placeholder="ej: Materiales Obra Norte"
                sx={{ mt: 0.75 }}
              />
            </Box>

            {/* Destino */}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "text.disabled", fontSize: "0.65rem", letterSpacing: "0.8px" }}
              >
                Planilla de destino
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 0.75 }}>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    value={form.sheet_id}
                    onChange={(e) => setField("sheet_id", e.target.value)}
                    label="ID de planilla *"
                    size="small"
                    required
                    fullWidth
                    placeholder="1BxiMVs0..."
                    helperText="ID del Google Spreadsheet"
                    sx={{ "& input": { fontFamily: '"Roboto Mono", monospace', fontSize: "0.8rem" } }}
                  />
                  <TextField
                    value={form.sheet_nombre}
                    onChange={(e) => setField("sheet_nombre", e.target.value)}
                    label="Nombre de la planilla"
                    size="small"
                    fullWidth
                    placeholder="ej: Hoja Obra Norte"
                    helperText="Para identificarla en la UI"
                  />
                </Stack>
                <TextField
                  value={form.tab_name}
                  onChange={(e) => setField("tab_name", e.target.value)}
                  label="Nombre de la solapa *"
                  size="small"
                  required
                  fullWidth
                  placeholder="ej: Materiales"
                  helperText="Nombre exacto del tab. Se crea automáticamente si no existe."
                  sx={{ "& input": { fontFamily: '"Roboto Mono", monospace', fontSize: "0.8rem" } }}
                />
              </Stack>
            </Box>

            {/* Alcance */}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "text.disabled", fontSize: "0.65rem", letterSpacing: "0.8px" }}
              >
                Alcance
              </Typography>
              <FormControl fullWidth size="small" sx={{ mt: 0.75 }}>
                <InputLabel sx={{ fontSize: "0.85rem" }}>Proyecto</InputLabel>
                <Select
                  value={form.proyecto_id || ""}
                  label="Proyecto"
                  onChange={(e) => setField("proyecto_id", e.target.value || null)}
                  sx={{ fontSize: "0.85rem" }}
                >
                  <MenuItem value="">Todos los proyectos</MenuItem>
                  {proyectosEmpresa.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Filtros */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography
                  variant="overline"
                  sx={{ color: "text.disabled", fontSize: "0.65rem", letterSpacing: "0.8px" }}
                >
                  Filtros (AND)
                </Typography>
                {!form.condiciones?.length && (
                  <Chip
                    label="sin filtro = todos"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.6rem",
                      bgcolor: alpha(theme.palette.info.main, 0.08),
                      color: "info.dark",
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                )}
              </Stack>
              <Stack spacing={0.75}>
                {form.condiciones?.map((cond, condIdx) => (
                  <Stack key={condIdx} direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ minWidth: 32, pt: "10px", textAlign: "right" }}>
                      {condIdx > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "warning.dark",
                            fontWeight: 700,
                            fontSize: "0.65rem",
                            letterSpacing: "0.4px",
                          }}
                        >
                          AND
                        </Typography>
                      )}
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 160, flexShrink: 0 }}>
                      <InputLabel sx={{ fontSize: "0.8rem" }}>Campo</InputLabel>
                      <Select
                        value={cond.campo}
                        label="Campo"
                        onChange={(e) => actualizarCondicion(condIdx, "campo", e.target.value)}
                        sx={{ fontSize: "0.8rem", "& .MuiSelect-select": { py: "7px" } }}
                      >
                        {CAMPOS_CONDICION.map((c) => (
                          <MenuItem key={c.value} value={c.value}>
                            <Stack spacing={0}>
                              <span style={{ fontSize: "0.8rem" }}>{c.label}</span>
                              {c.hint && (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{ fontSize: "0.68rem" }}
                                >
                                  {c.hint}
                                </Typography>
                              )}
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Box
                      sx={{
                        flexShrink: 0,
                        mt: "7px",
                        px: 0.75,
                        py: 0.25,
                        bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.06),
                        borderRadius: 0.75,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        fontFamily: "monospace",
                        color: "text.secondary",
                        lineHeight: 1.5,
                      }}
                    >
                      =
                    </Box>
                    <TextField
                      size="small"
                      label="Valor"
                      value={cond.valor}
                      onChange={(e) => actualizarCondicion(condIdx, "valor", e.target.value)}
                      helperText={getHintCampo(cond.campo) || undefined}
                      placeholder={getHintCampo(cond.campo) || "Materiales"}
                      sx={{
                        flex: 1,
                        "& input": { fontFamily: "monospace", fontSize: "0.8rem" },
                        "& .MuiInputLabel-root": { fontSize: "0.8rem" },
                      }}
                    />
                    <Tooltip title="Eliminar condición">
                      <IconButton
                        size="small"
                        onClick={() => eliminarCondicion(condIdx)}
                        sx={{
                          mt: "3px",
                          flexShrink: 0,
                          color: "text.disabled",
                          "&:hover": {
                            color: "error.main",
                            bgcolor: alpha(theme.palette.error.main, 0.08),
                          },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
              <Button
                startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
                size="small"
                onClick={agregarCondicion}
                sx={{
                  mt: 0.75,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  "&:hover": { color: "primary.main" },
                }}
              >
                Agregar condición
              </Button>
            </Box>

            {/* Columnas */}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "text.disabled", fontSize: "0.65rem", letterSpacing: "0.8px", display: "block", mb: 0.75 }}
              >
                Columnas
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={usarColumnasCustom}
                    onChange={(e) => {
                      setUsarColumnasCustom(e.target.checked);
                      if (e.target.checked && columnRows.every((r) => DEFAULT_ENABLED.has(r.key) === r.enabled)) {
                        setColumnRows(buildDefaultRows());
                      }
                    }}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                    {usarColumnasCustom ? "Columnas personalizadas" : "Usar default de la empresa"}
                  </Typography>
                }
              />
              {usarColumnasCustom && (() => {
                const activeRows = columnRows.map((r, i) => ({ ...r, origIndex: i })).filter((r) => r.enabled);
                return (
                  <Box sx={{ mt: 1.5 }}>
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: "hidden",
                        mb: 1,
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          px: 2,
                          py: 0.75,
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="overline" sx={{ fontSize: "0.63rem", color: "primary.dark", lineHeight: 1 }}>
                          Columnas activas
                        </Typography>
                        <Box sx={{ px: 0.75, py: 0.1, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), fontSize: "0.63rem", fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: "primary.dark", lineHeight: 1.6 }}>
                          {activeRows.length}
                        </Box>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", ml: "auto !important" }}>
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
                            onToggle={handleToggleEnabled}
                            onLabelChange={handleLabelChange}
                            onMove={handleMoveActive}
                          />
                        ))}
                      </Stack>
                    </Box>
                    <AvailableColumnsPanel rows={columnRows} onToggle={handleToggleEnabled} />
                  </Box>
                );
              })()}
            </Box>

            {/* Estado */}
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={form.activo !== false}
                  onChange={(e) => setField("activo", e.target.checked)}
                  color="success"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  {form.activo !== false ? "Activa" : "Inactiva"}
                </Typography>
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            gap: 1,
          }}
        >
          <Button
            onClick={() => setDialogOpen(false)}
            size="small"
            variant="outlined"
            color="inherit"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            size="small"
            variant="contained"
            color="success"
            disabled={saving || !isValid}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {editingId ? "Guardar cambios" : "Crear configuración"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
//  Niveles disponibles para armar reglas
// ────────────────────────────────────────────────────────────────
const nivelesDisponibles = [
  { value: "proyecto_nombre", label: "Proyecto", ejemplo: "Lares 76" },
  { value: "categoria", label: "Categoría", ejemplo: "Materiales" },
  { value: "factura_cliente", label: "Factura Cliente (Sí/No)", ejemplo: "Factura Cliente - Sí" },
  { value: "quincena", label: "Quincena", ejemplo: "2026-03 Q1" },
  { value: "mes", label: "Mes", ejemplo: "2026-03" },
  { value: "moneda", label: "Moneda", ejemplo: "ARS" },
  { value: "type", label: "Tipo (Ingreso/Egreso)", ejemplo: "Egresos" },
  { value: "nombre_proveedor", label: "Proveedor", ejemplo: "Corralón Gómez" },
  { value: "medio_pago", label: "Medio de Pago", ejemplo: "Transferencia" },
];

// Tokens disponibles para el nombre del archivo
const tokensNombreArchivo = [
  { value: "categoria", label: "Categoría", ejemplo: "Materiales" },
  { value: "fecha", label: "Fecha", ejemplo: "2026-03-05" },
  { value: "proyecto_nombre", label: "Proyecto", ejemplo: "Lares_76" },
  { value: "nombre_proveedor", label: "Proveedor", ejemplo: "Corralon_Gomez" },
  { value: "moneda", label: "Moneda", ejemplo: "ARS" },
  { value: "type", label: "Tipo", ejemplo: "Egreso" },
  { value: "total", label: "Total", ejemplo: "15000" },
  { value: "factura_cliente", label: "Factura Cliente", ejemplo: "FC_Si" },
  { value: "quincena", label: "Quincena", ejemplo: "2026-03_Q1" },
  { value: "mes", label: "Mes", ejemplo: "2026-03" },
];

const REGLA_DEFAULT = {
  nombre: "Por proyecto y categoría",
  niveles: ["proyecto_nombre", "categoria"],
  nombre_archivo: ["categoria"],
  filtro: "todos",
  proyectos: [],
};

// ────────────────────────────────────────────────────────────────
//  Migración: config_drive_central (viejo) → reglas_drive (nuevo)
// ────────────────────────────────────────────────────────────────
function migrarConfigDriveAReglas(config) {
  if (!config) return null;
  const reglas = [];
  if (config.por_quincena?.filtro && config.por_quincena.filtro !== "ninguno") {
    reglas.push({
      nombre: "Por quincena",
      niveles: ["quincena"],
      filtro: config.por_quincena.filtro,
      proyectos: config.por_quincena.proyectos || [],
    });
  }
  if (config.por_proyecto_categoria?.filtro && config.por_proyecto_categoria.filtro !== "ninguno") {
    reglas.push({
      nombre: "Por proyecto y categoría",
      niveles: ["proyecto_nombre", "categoria"],
      filtro: config.por_proyecto_categoria.filtro,
      proyectos: config.por_proyecto_categoria.proyectos || [],
    });
  }
  if (config.por_factura_cliente?.filtro && config.por_factura_cliente.filtro !== "ninguno") {
    reglas.push({
      nombre: "Por factura cliente",
      niveles: ["proyecto_nombre", "factura_cliente"],
      filtro: config.por_factura_cliente.filtro,
      proyectos: config.por_factura_cliente.proyectos || [],
    });
  }
  return reglas.length > 0 ? reglas : null;
}

function getReglasIniciales(empresa) {
  if (empresa.reglas_drive && empresa.reglas_drive.length > 0) return empresa.reglas_drive;
  const migradas = migrarConfigDriveAReglas(empresa.config_drive_central);
  if (migradas) return migradas;
  return [{ ...REGLA_DEFAULT }];
}

function getLabelNivel(value) {
  return nivelesDisponibles.find((n) => n.value === value)?.label || value;
}

function getEjemploNivel(value) {
  return nivelesDisponibles.find((n) => n.value === value)?.ejemplo || value;
}

function getLabelToken(value) {
  return tokensNombreArchivo.find((t) => t.value === value)?.label || value;
}

function getEjemploToken(value) {
  return tokensNombreArchivo.find((t) => t.value === value)?.ejemplo || value;
}

// ────────────────────────────────────────────────────────────────
//  Preview de estructura de carpetas
// ────────────────────────────────────────────────────────────────
function PreviewEstructura({ niveles, nombre_archivo }) {
  if (!niveles || niveles.length === 0) return null;

  const tokens = nombre_archivo && nombre_archivo.length > 0 ? nombre_archivo : ["categoria"];
  const nombreEjemplo = tokens.map((t) => getEjemploToken(t)).join("_") + "_1.pdf";

  return (
    <Box sx={{ mt: 1, pl: 1, borderLeft: "2px solid", borderColor: "divider", py: 0.5 }}>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <FolderIcon sx={{ fontSize: 16, color: "warning.main" }} />
          <Typography variant="caption" color="text.secondary">
            Carpeta de Drive
          </Typography>
        </Stack>
        {niveles.map((nivel, idx) => (
          <Stack
            key={nivel}
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ pl: (idx + 1) * 2 }}
          >
            <FolderIcon sx={{ fontSize: 16, color: "warning.main" }} />
            <Typography variant="caption" color="text.secondary">
              {getEjemploNivel(nivel)}
            </Typography>
          </Stack>
        ))}
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ pl: (niveles.length + 1) * 2 }}
        >
          <InsertDriveFileIcon sx={{ fontSize: 14, color: "info.main" }} />
          <Typography variant="caption" color="text.secondary" fontStyle="italic">
            {nombreEjemplo}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────
//  Componente principal
// ────────────────────────────────────────────────────────────────
export const OrganizacionDrive = ({ empresa, updateEmpresaData }) => {
  const [carpetaId, setCarpetaId] = useState(
    empresa.carpeta_central_comprobantes || empresa.carpetaEmpresaRef || "",
  );
  const [reglas, setReglas] = useState(getReglasIniciales(empresa));
  const [proyectosEmpresa, setProyectosEmpresa] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarInfo, setSnackbarInfo] = useState({ message: "", severity: "success" });

  useEffect(() => {
    const cargarProyectos = async () => {
      if (empresa) {
        const pys = await getProyectosByEmpresa(empresa);
        setProyectosEmpresa(pys);
      }
    };
    cargarProyectos();
  }, [empresa]);

  // ── CRUD de reglas ──────────────────────────────────────────
  const agregarRegla = () => {
    setReglas([
      ...reglas,
      {
        nombre: "",
        niveles: ["proyecto_nombre", "categoria"],
        nombre_archivo: ["categoria"],
        filtro: "todos",
        proyectos: [],
      },
    ]);
  };

  const eliminarRegla = (idx) => {
    setReglas(reglas.filter((_, i) => i !== idx));
  };

  const actualizarRegla = (idx, campo, valor) => {
    setReglas(reglas.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)));
  };

  // ── Gestión de niveles dentro de una regla ──────────────────
  const agregarNivel = (reglaIdx, nivel) => {
    const regla = reglas[reglaIdx];
    if (regla.niveles.includes(nivel)) return;
    actualizarRegla(reglaIdx, "niveles", [...regla.niveles, nivel]);
  };

  const eliminarNivel = (reglaIdx, nivelIdx) => {
    const regla = reglas[reglaIdx];
    actualizarRegla(
      reglaIdx,
      "niveles",
      regla.niveles.filter((_, i) => i !== nivelIdx),
    );
  };

  const moverNivel = (reglaIdx, nivelIdx, direccion) => {
    const regla = reglas[reglaIdx];
    const nuevosNiveles = [...regla.niveles];
    const destino = nivelIdx + direccion;
    if (destino < 0 || destino >= nuevosNiveles.length) return;
    [nuevosNiveles[nivelIdx], nuevosNiveles[destino]] = [
      nuevosNiveles[destino],
      nuevosNiveles[nivelIdx],
    ];
    actualizarRegla(reglaIdx, "niveles", nuevosNiveles);
  };

  // ── Guardar ─────────────────────────────────────────────────
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateEmpresaData(empresa.id, {
        carpeta_central_comprobantes: carpetaId,
        carpetaEmpresaRef: carpetaId,
        reglas_drive: reglas,
      });
      setSnackbarInfo({
        message: "Configuración de Drive guardada con éxito.",
        severity: "success",
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      setSnackbarInfo({ message: "Error al guardar la configuración.", severity: "error" });
    }
    setSnackbarOpen(true);
    setIsLoading(false);
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <SheetConfigsSection empresa={empresa} />

      <Divider sx={{ mt: 4, mb: 4 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>
        Carpeta de Drive
      </Typography>

      <TextField
        label="ID de carpeta de Drive"
        value={carpetaId}
        onChange={(e) => setCarpetaId(e.target.value)}
        fullWidth
        helperText="ID de la carpeta de Google Drive donde se organizan los comprobantes. Dejar vacío para desactivar."
      />

      {carpetaId && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Reglas de organización
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cada regla define cómo se organizan los comprobantes en subcarpetas dentro de la carpeta
            de Drive. Podés tener múltiples reglas activas (el archivo se copiará a cada estructura
            que aplique).
          </Typography>

          <Stack spacing={2}>
            {reglas.map((regla, reglaIdx) => (
              <Card key={reglaIdx} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header: nombre + delete */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        label="Nombre de la regla"
                        value={regla.nombre}
                        onChange={(e) => actualizarRegla(reglaIdx, "nombre", e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <Tooltip title="Eliminar regla">
                        <IconButton
                          color="error"
                          onClick={() => eliminarRegla(reglaIdx)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>

                    {/* Niveles */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Niveles de carpetas (el orden importa)
                      </Typography>
                      <Stack spacing={0.5}>
                        {regla.niveles.map((nivel, nivelIdx) => (
                          <Stack key={nivel} direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              label={`${nivelIdx + 1}. ${getLabelNivel(nivel)}`}
                              onDelete={() => eliminarNivel(reglaIdx, nivelIdx)}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <IconButton
                              size="small"
                              disabled={nivelIdx === 0}
                              onClick={() => moverNivel(reglaIdx, nivelIdx, -1)}
                            >
                              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              disabled={nivelIdx === regla.niveles.length - 1}
                              onClick={() => moverNivel(reglaIdx, nivelIdx, 1)}
                            >
                              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>

                      {/* Agregar nivel */}
                      {regla.niveles.length < nivelesDisponibles.length && (
                        <TextField
                          select
                          label="Agregar nivel"
                          value=""
                          onChange={(e) => agregarNivel(reglaIdx, e.target.value)}
                          size="small"
                          sx={{ mt: 1, minWidth: 250 }}
                        >
                          {nivelesDisponibles
                            .filter((n) => !regla.niveles.includes(n.value))
                            .map((n) => (
                              <MenuItem key={n.value} value={n.value}>
                                {n.label}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  (ej: {n.ejemplo})
                                </Typography>
                              </MenuItem>
                            ))}
                        </TextField>
                      )}
                    </Box>

                    {/* Nombre del archivo */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Nombre del archivo
                      </Typography>
                      <Stack spacing={0.5}>
                        {(regla.nombre_archivo || ["categoria"]).map((token, tokenIdx) => (
                          <Stack key={token} direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              label={getLabelToken(token)}
                              onDelete={() => {
                                const nuevos = (regla.nombre_archivo || ["categoria"]).filter(
                                  (_, i) => i !== tokenIdx,
                                );
                                actualizarRegla(reglaIdx, "nombre_archivo", nuevos);
                              }}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          </Stack>
                        ))}
                      </Stack>
                      {(regla.nombre_archivo || []).length < tokensNombreArchivo.length && (
                        <TextField
                          select
                          label="Agregar campo al nombre"
                          value=""
                          onChange={(e) => {
                            const actual = regla.nombre_archivo || ["categoria"];
                            if (!actual.includes(e.target.value)) {
                              actualizarRegla(reglaIdx, "nombre_archivo", [
                                ...actual,
                                e.target.value,
                              ]);
                            }
                          }}
                          size="small"
                          sx={{ mt: 1, minWidth: 250 }}
                        >
                          {tokensNombreArchivo
                            .filter(
                              (t) => !(regla.nombre_archivo || ["categoria"]).includes(t.value),
                            )
                            .map((t) => (
                              <MenuItem key={t.value} value={t.value}>
                                {t.label}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  (ej: {t.ejemplo})
                                </Typography>
                              </MenuItem>
                            ))}
                        </TextField>
                      )}
                    </Box>

                    {/* Filtro de proyectos */}
                    <TextField
                      select
                      label="Aplicar a proyectos"
                      value={regla.filtro}
                      onChange={(e) => {
                        const val = e.target.value;
                        actualizarRegla(reglaIdx, "filtro", val);
                        if (val !== "algunos") actualizarRegla(reglaIdx, "proyectos", []);
                      }}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="todos">Todos los proyectos</MenuItem>
                      <MenuItem value="algunos">Algunos proyectos</MenuItem>
                    </TextField>

                    {regla.filtro === "algunos" && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Proyectos</InputLabel>
                        <Select
                          multiple
                          value={regla.proyectos}
                          onChange={(e) => actualizarRegla(reglaIdx, "proyectos", e.target.value)}
                          renderValue={(selected) =>
                            selected
                              .map((id) => {
                                const p = proyectosEmpresa.find((py) => py.id === id);
                                return p ? p.nombre : id;
                              })
                              .join(", ")
                          }
                        >
                          {proyectosEmpresa.map((py) => (
                            <MenuItem key={py.id} value={py.id}>
                              <Checkbox checked={regla.proyectos.includes(py.id)} />
                              <ListItemText primary={py.nombre} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    {/* Preview */}
                    <PreviewEstructura
                      niveles={regla.niveles}
                      nombre_archivo={regla.nombre_archivo}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Button startIcon={<AddIcon />} onClick={agregarRegla} variant="outlined" sx={{ mt: 2 }}>
            Agregar regla
          </Button>
        </>
      )}

      <Box sx={{ mt: 3 }}>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Guardar configuración de Drive"}
        </Button>
      </Box>

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
};
