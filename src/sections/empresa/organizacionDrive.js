import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
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
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { getProyectosByEmpresa } from "src/services/proyectosService";
import ColumnasSheetConfig from "src/sections/empresa/columnasSheetConfig";

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

  const tokens = nombre_archivo && nombre_archivo.length > 0 ? nombre_archivo : ['categoria'];
  const nombreEjemplo = tokens.map(t => getEjemploToken(t)).join('_') + '_1.pdf';

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
    empresa.carpeta_central_comprobantes || empresa.carpetaEmpresaRef || ""
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
      { nombre: "", niveles: ["proyecto_nombre", "categoria"], nombre_archivo: ["categoria"], filtro: "todos", proyectos: [] },
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
    actualizarRegla(reglaIdx, "niveles", regla.niveles.filter((_, i) => i !== nivelIdx));
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
      setSnackbarInfo({ message: "Configuración de Drive guardada con éxito.", severity: "success" });
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
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ ml: 1 }}
                                >
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
                        {(regla.nombre_archivo || ['categoria']).map((token, tokenIdx) => (
                          <Stack key={token} direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              label={getLabelToken(token)}
                              onDelete={() => {
                                const nuevos = (regla.nombre_archivo || ['categoria']).filter((_, i) => i !== tokenIdx);
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
                            const actual = regla.nombre_archivo || ['categoria'];
                            if (!actual.includes(e.target.value)) {
                              actualizarRegla(reglaIdx, "nombre_archivo", [...actual, e.target.value]);
                            }
                          }}
                          size="small"
                          sx={{ mt: 1, minWidth: 250 }}
                        >
                          {tokensNombreArchivo
                            .filter((t) => !(regla.nombre_archivo || ['categoria']).includes(t.value))
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
                          onChange={(e) =>
                            actualizarRegla(reglaIdx, "proyectos", e.target.value)
                          }
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
                    <PreviewEstructura niveles={regla.niveles} nombre_archivo={regla.nombre_archivo} />
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
