import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import TableChartIcon from "@mui/icons-material/TableChart";
import { getProyectosByEmpresa } from "src/services/proyectosService";
import ColumnasSheetConfig from "src/sections/empresa/columnasSheetConfig";

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
//  Preview de una regla de sheet — fórmula estilo código
// ────────────────────────────────────────────────────────────────
function PreviewReglaSheet({ regla }) {
  const theme = useTheme();
  const condsFilled = regla.condiciones?.filter((c) => c.campo && c.valor !== "") || [];
  if (!regla.nombre || !condsFilled.length) return null;

  return (
    <Box
      sx={{
        mt: 1,
        p: "10px 14px",
        borderRadius: 1.5,
        bgcolor: alpha(theme.palette.success.main, 0.05),
        border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
      }}
    >
      {condsFilled.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.15,
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: "warning.dark",
                borderRadius: 0.75,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.6px",
                fontFamily: "monospace",
              }}
            >
              AND
            </Box>
          )}
          <Box
            component="span"
            sx={{
              px: 0.75,
              py: 0.15,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: "primary.dark",
              borderRadius: 0.75,
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          >
            {getLabelCampo(c.campo)}
          </Box>
          <Box
            component="span"
            sx={{
              color: "text.disabled",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              fontWeight: 500,
            }}
          >
            =
          </Box>
          <Box
            component="span"
            sx={{
              px: 0.75,
              py: 0.15,
              bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.05),
              color: "text.primary",
              borderRadius: 0.75,
              fontSize: "0.75rem",
              fontFamily: "monospace",
            }}
          >
            &quot;{c.valor}&quot;
          </Box>
        </React.Fragment>
      ))}
      <Box
        component="span"
        sx={{ color: alpha(theme.palette.success.main, 0.7), fontSize: "0.85rem", mx: 0.25 }}
      >
        →
      </Box>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.25,
          bgcolor: alpha(theme.palette.success.main, 0.1),
          color: "success.dark",
          borderRadius: 1,
          fontSize: "0.75rem",
          fontWeight: 600,
          fontFamily: "monospace",
        }}
      >
        <TableChartIcon sx={{ fontSize: 13 }} />
        {regla.nombre}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sección de reglas de sheets condicionales
// ────────────────────────────────────────────────────────────────
function ReglasSheets({ reglasSheets, setReglasSheets }) {
  const theme = useTheme();

  const agregarRegla = () => {
    setReglasSheets([
      ...reglasSheets,
      { nombre: "", condiciones: [{ campo: "categoria", valor: "" }] },
    ]);
  };

  const eliminarRegla = (idx) => {
    setReglasSheets(reglasSheets.filter((_, i) => i !== idx));
  };

  const actualizarRegla = (idx, campo, valor) => {
    setReglasSheets(reglasSheets.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)));
  };

  const agregarCondicion = (reglaIdx) => {
    const regla = reglasSheets[reglaIdx];
    actualizarRegla(reglaIdx, "condiciones", [
      ...regla.condiciones,
      { campo: "categoria", valor: "" },
    ]);
  };

  const eliminarCondicion = (reglaIdx, condIdx) => {
    const regla = reglasSheets[reglaIdx];
    actualizarRegla(
      reglaIdx,
      "condiciones",
      regla.condiciones.filter((_, i) => i !== condIdx),
    );
  };

  const actualizarCondicion = (reglaIdx, condIdx, campo, valor) => {
    const regla = reglasSheets[reglaIdx];
    actualizarRegla(
      reglaIdx,
      "condiciones",
      regla.condiciones.map((c, i) => (i === condIdx ? { ...c, [campo]: valor } : c)),
    );
  };

  return (
    <>
      {/* Header */}
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
        <Typography variant="h6">Hojas adicionales condicionales</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, pl: "44px" }}>
        Si un movimiento cumple todas las condiciones de una regla, se escribe también en esa solapa
        del spreadsheet.{" "}
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            px: 0.75,
            py: 0.1,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: "primary.dark",
            borderRadius: 0.75,
            fontSize: "0.72rem",
            fontWeight: 600,
            fontFamily: "monospace",
            verticalAlign: "middle",
          }}
        >
          <TableChartIcon sx={{ fontSize: 11 }} />
          sorby_movimientos
        </Box>{" "}
        siempre recibe todos.
      </Typography>

      <Stack spacing={2}>
        {reglasSheets.length === 0 && (
          <Box
            sx={{
              border: `1.5px dashed ${theme.palette.divider}`,
              borderRadius: 2,
              p: 4,
              textAlign: "center",
            }}
          >
            <TableChartIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.disabled">
              Sin reglas. Agregá una para enrutar movimientos a solapas extra.
            </Typography>
          </Box>
        )}

        {reglasSheets.map((regla, reglaIdx) => (
          <Box
            key={reglaIdx}
            sx={{
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderLeft: `3px solid ${theme.palette.primary.main}`,
              bgcolor: alpha(theme.palette.primary.main, 0.015),
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.primary.main, 0.03),
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {reglaIdx + 1}
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: regla.nombre ? "text.primary" : "text.disabled",
                    fontFamily: regla.nombre ? "monospace" : "inherit",
                  }}
                >
                  {regla.nombre || "sin nombre"}
                </Typography>
              </Stack>
              <Tooltip title="Eliminar regla">
                <IconButton
                  size="small"
                  onClick={() => eliminarRegla(reglaIdx)}
                  sx={{
                    color: "text.disabled",
                    "&:hover": {
                      color: "error.main",
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Card body */}
            <Stack spacing={2.5} sx={{ p: 2 }}>
              {/* Destino */}
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "success.main", letterSpacing: "0.8px", fontSize: "0.65rem" }}
                >
                  → Destino
                </Typography>
                <TextField
                  value={regla.nombre}
                  onChange={(e) => actualizarRegla(reglaIdx, "nombre", e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="ej: Materiales, Ingresos USD, Mano de Obra"
                  helperText="Nombre exacto de la solapa en Google Sheets. Se crea automáticamente si no existe."
                  sx={{
                    mt: 0.5,
                    "& .MuiOutlinedInput-root": {
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "success.main",
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <TableChartIcon
                        sx={{ fontSize: 16, color: "success.main", mr: 0.75, flexShrink: 0 }}
                      />
                    ),
                  }}
                />
              </Box>

              {/* Condiciones */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: "0.8px", fontSize: "0.65rem" }}
                  >
                    Condiciones
                  </Typography>
                  <Chip
                    label="AND"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      color: "warning.dark",
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                </Stack>

                <Stack spacing={0}>
                  {regla.condiciones.map((cond, condIdx) => (
                    <React.Fragment key={condIdx}>
                      {condIdx > 0 && (
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ py: 0.5, pl: 1.5 }}
                        >
                          <Box
                            sx={{
                              width: 1,
                              height: 16,
                              bgcolor: alpha(theme.palette.warning.main, 0.3),
                              ml: 1.5,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              color: "warning.dark",
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              letterSpacing: "0.5px",
                            }}
                          >
                            AND
                          </Typography>
                        </Stack>
                      )}
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: alpha(theme.palette.neutral?.[900] || "#111927", 0.025),
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <FormControl size="small" sx={{ minWidth: 170, flexShrink: 0 }}>
                          <InputLabel sx={{ fontSize: "0.8rem" }}>Campo</InputLabel>
                          <Select
                            value={cond.campo}
                            label="Campo"
                            onChange={(e) =>
                              actualizarCondicion(reglaIdx, condIdx, "campo", e.target.value)
                            }
                            sx={{
                              fontSize: "0.8rem",
                              "& .MuiSelect-select": { py: "7px" },
                            }}
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
                          onChange={(e) =>
                            actualizarCondicion(reglaIdx, condIdx, "valor", e.target.value)
                          }
                          helperText={getHintCampo(cond.campo) || undefined}
                          sx={{
                            flex: 1,
                            "& input": { fontFamily: "monospace", fontSize: "0.8rem" },
                            "& .MuiInputLabel-root": { fontSize: "0.8rem" },
                          }}
                          placeholder={getHintCampo(cond.campo) || "Materiales"}
                        />

                        {regla.condiciones.length > 1 && (
                          <Tooltip title="Eliminar condición">
                            <IconButton
                              size="small"
                              onClick={() => eliminarCondicion(reglaIdx, condIdx)}
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
                        )}
                      </Stack>
                    </React.Fragment>
                  ))}
                </Stack>

                <Button
                  startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
                  size="small"
                  onClick={() => agregarCondicion(reglaIdx)}
                  sx={{
                    mt: 1,
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  Agregar condición
                </Button>
              </Box>

              {/* Preview fórmula */}
              <PreviewReglaSheet regla={regla} />
            </Stack>
          </Box>
        ))}
      </Stack>

      <Button
        startIcon={<AddIcon />}
        onClick={agregarRegla}
        variant="outlined"
        size="small"
        sx={{
          mt: 2,
          borderStyle: "dashed",
          color: "primary.main",
          borderColor: alpha(theme.palette.primary.main, 0.4),
          "&:hover": {
            borderStyle: "solid",
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        Agregar regla de hoja
      </Button>
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
  const theme = useTheme();
  const [carpetaId, setCarpetaId] = useState(
    empresa.carpeta_central_comprobantes || empresa.carpetaEmpresaRef || "",
  );
  const [reglas, setReglas] = useState(getReglasIniciales(empresa));
  const [reglasSheets, setReglasSheets] = useState(empresa.reglas_sheets || []);
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
        reglas_sheets: reglasSheets,
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

      <Divider sx={{ mt: 4 }} />

      <ReglasSheets reglasSheets={reglasSheets} setReglasSheets={setReglasSheets} />

      <Box sx={{ mt: 3 }}>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Guardar configuración de Drive"}
        </Button>
      </Box>

      <ColumnasSheetConfig empresa={empresa} updateEmpresaData={updateEmpresaData} />

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
