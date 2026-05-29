import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Autocomplete,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Stack,
  Collapse,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrabajadorService from "src/services/dhn/TrabajadorService";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";

const DEFAULT_MOTIVO_IGNORAR = "mensual";

const tabIndex = {
  asignar: 0,
  crear: 1,
  ignorar: 2,
};

const ResolverTrabajadorModal = ({
  open,
  onClose,
  trabajadorDetectado,
  urlStorage,
  onResolved,
  archivosAfectados,
}) => {
  const [activeTab, setActiveTab] = useState(tabIndex.asignar);
  const [trabajadores, setTrabajadores] = useState([]);
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "error" });
  const [formData, setFormData] = useState({ nombre: "", apellido: "", dni: "" });
  const [motivoIgnorar, setMotivoIgnorar] = useState(DEFAULT_MOTIVO_IGNORAR);
  const [showArchivos, setShowArchivos] = useState(false);

  const archivos = Array.isArray(archivosAfectados) ? archivosAfectados : [];
  const hasMultipleArchivos = archivos.length > 1;
  const tieneDni = Boolean(trabajadorDetectado?.dni);

  const cargarTrabajadores = useCallback(async () => {
    setIsLoadingTrabajadores(true);
    try {
      const data = await TrabajadorService.getAll({ limit: 10000, offset: 0 });
      setTrabajadores(data.data || []);
    } catch (error) {
      console.error("Error al cargar trabajadores:", error);
      setAlert({ open: true, message: "Error al cargar trabajadores", severity: "error" });
    } finally {
      setIsLoadingTrabajadores(false);
    }
  }, []);

  useEffect(() => {
    if (open && trabajadorDetectado) {
      setFormData({
        nombre: trabajadorDetectado.nombre || "",
        apellido: trabajadorDetectado.apellido || "",
        dni: trabajadorDetectado.dni || "",
      });
      setBusqueda("");
      setTrabajadorSeleccionado(null);
      setMotivoIgnorar(DEFAULT_MOTIVO_IGNORAR);
      setActiveTab(tabIndex.asignar);
      setShowArchivos(false);
      cargarTrabajadores();
    }
  }, [open, trabajadorDetectado, cargarTrabajadores]);

  const trabajadoresFiltrados = useMemo(() => {
    const term = (busqueda || "").toString().trim().toLowerCase();
    if (!term) return trabajadores;
    return (trabajadores || []).filter((t) => {
      const nombre = (t?.nombre || "").toString().toLowerCase();
      const apellido = (t?.apellido || "").toString().toLowerCase();
      const dni = (t?.dni || "").toString().replace(/\./g, "").toLowerCase();
      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        `${nombre} ${apellido}`.includes(term) ||
        `${apellido} ${nombre}`.includes(term) ||
        dni.includes(term)
      );
    });
  }, [trabajadores, busqueda]);

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlert({ ...alert, open: false });
  };

  const handleClose = () => {
    if (isSaving) return;
    setActiveTab(tabIndex.asignar);
    setTrabajadorSeleccionado(null);
    setBusqueda("");
    setFormData({ nombre: "", apellido: "", dni: "" });
    setMotivoIgnorar(DEFAULT_MOTIVO_IGNORAR);
    setShowArchivos(false);
    onClose();
  };

  const notifyResolved = (info) => {
    if (onResolved) onResolved(info);
    setTimeout(() => handleClose(), 800);
  };

  const asignarTrabajador = async (trabajadorId) => {
    if (!urlStorage || !trabajadorId || !trabajadorDetectado) {
      setAlert({ open: true, message: "Faltan datos para asignar el trabajador", severity: "error" });
      setIsSaving(false);
      return;
    }
    try {
      const resp = await TrabajoRegistradoService.resolverTrabajador(
        urlStorage,
        trabajadorId,
        trabajadorDetectado
      );
      const registrosCreados = resp?.registrosCreados ?? 0;
      setAlert({
        open: true,
        message: `Trabajador resuelto. ${registrosCreados} registro${registrosCreados === 1 ? "" : "s"} creado${registrosCreados === 1 ? "" : "s"}`,
        severity: "success",
      });
      notifyResolved({ accion: "asignado", trabajadorDetectado });
    } catch (error) {
      console.error("Error al resolver trabajador:", error);
      setAlert({
        open: true,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Error al resolver el trabajador",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAsignarTrabajador = async () => {
    if (!trabajadorSeleccionado) {
      setAlert({ open: true, message: "Por favor seleccione un trabajador", severity: "error" });
      return;
    }
    setIsSaving(true);
    await asignarTrabajador(trabajadorSeleccionado._id);
  };

  const handleCrearTrabajador = async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      setAlert({ open: true, message: "Por favor complete todos los campos requeridos", severity: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const nuevoTrabajador = await TrabajadorService.create({
        ...formData,
        desde: new Date().toISOString().split("T")[0],
        active: true,
      });
      await asignarTrabajador(nuevoTrabajador._id || nuevoTrabajador.data?._id);
    } catch (error) {
      console.error("Error al crear trabajador:", error);
      setAlert({
        open: true,
        message: error.response?.data?.error || "Error al crear el trabajador",
        severity: "error",
      });
      setIsSaving(false);
    }
  };

  const handleIgnorarTrabajador = async () => {
    if (!tieneDni && (!trabajadorDetectado?.nombre || !trabajadorDetectado?.apellido)) {
      setAlert({
        open: true,
        message: "No se puede marcar como ignorado: faltan DNI o nombre+apellido",
        severity: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      const resp = await TrabajadorService.ignorarDetectado({
        nombre: trabajadorDetectado?.nombre || "",
        apellido: trabajadorDetectado?.apellido || "",
        dni: trabajadorDetectado?.dni || "",
        motivoIgnorar: motivoIgnorar ? motivoIgnorar.trim() : null,
      });
      const accion = resp?.accion === "created" ? "creado e ignorado" : "marcado como ignorado";
      setAlert({
        open: true,
        message: `Trabajador ${accion}`,
        severity: "success",
      });
      notifyResolved({ accion: "ignorado", trabajadorDetectado });
    } catch (error) {
      console.error("Error al marcar como ignorado:", error);
      setAlert({
        open: true,
        message:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error?.message ||
          "Error al marcar como ignorado",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!trabajadorDetectado) return null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Resolver Trabajador No Identificado</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Detectado en el Excel:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              <Chip
                label={`${trabajadorDetectado.nombre || ""} ${trabajadorDetectado.apellido || ""}`.trim() || "(sin nombre)"}
                size="small"
              />
              <Chip
                label={tieneDni ? `DNI: ${trabajadorDetectado.dni}` : "Sin DNI"}
                size="small"
                color={tieneDni ? "default" : "warning"}
              />
            </Box>

            {hasMultipleArchivos ? (
              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowArchivos((prev) => !prev)}
                  endIcon={showArchivos ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ textTransform: "none", color: "text.secondary" }}
                >
                  Aparece en {archivos.length} archivos
                </Button>
                <Collapse in={showArchivos} timeout={200}>
                  <Stack spacing={0.5} sx={{ pl: 1, mt: 0.5 }}>
                    {archivos.map((a, idx) => (
                      <Typography
                        key={a?._id || a?.url_storage || idx}
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.8rem" }}
                      >
                        • {a?.file_name || a?.url_storage || "(sin nombre)"}
                      </Typography>
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            ) : null}

            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="Asignar" />
              <Tab label="Crear" />
              <Tab label="Ignorar" />
            </Tabs>

            {activeTab === tabIndex.asignar ? (
              <Box>
                <Autocomplete
                  options={trabajadoresFiltrados}
                  getOptionLabel={(option) => `${option.apellido}, ${option.nombre} (${option.dni})`}
                  loading={isLoadingTrabajadores}
                  value={trabajadorSeleccionado}
                  onChange={(_, newValue) => setTrabajadorSeleccionado(newValue)}
                  inputValue={busqueda}
                  onInputChange={(_, newInputValue) => setBusqueda(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar por nombre, apellido o DNI"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingTrabajadores ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleAsignarTrabajador}
                  disabled={!trabajadorSeleccionado || isSaving}
                  fullWidth
                >
                  {isSaving ? <CircularProgress size={20} /> : "Asignar trabajador"}
                </Button>
              </Box>
            ) : null}

            {activeTab === tabIndex.crear ? (
              <Box>
                <TextField
                  label="Nombre"
                  fullWidth
                  size="small"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Apellido"
                  fullWidth
                  size="small"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="DNI"
                  fullWidth
                  size="small"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleCrearTrabajador}
                  disabled={isSaving}
                  fullWidth
                >
                  {isSaving ? <CircularProgress size={20} /> : "Crear y asignar"}
                </Button>
              </Box>
            ) : null}

            {activeTab === tabIndex.ignorar ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  El trabajador no se procesará en futuras sincronizaciones de fichadas.
                </Typography>
                <TextField
                  label="Motivo"
                  fullWidth
                  size="small"
                  value={motivoIgnorar}
                  onChange={(e) => setMotivoIgnorar(e.target.value)}
                  placeholder="Ej: mensual, externo"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleIgnorarTrabajador}
                  disabled={isSaving}
                  fullWidth
                >
                  {isSaving ? <CircularProgress size={20} /> : "Marcar como ignorado"}
                </Button>
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSaving}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ResolverTrabajadorModal;
