import React, { useState, useEffect, useMemo } from "react";
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
  Divider,
} from "@mui/material";
import TrabajadorService from "src/services/dhn/TrabajadorService";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";

const ResolverTrabajadorModal = ({ open, onClose, trabajadorDetectado, urlStorage, onResolved }) => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "error" });
  const [modoCrear, setModoCrear] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
  });

  useEffect(() => {
    if (open && trabajadorDetectado) {
      setFormData({
        nombre: trabajadorDetectado.nombre || "",
        apellido: trabajadorDetectado.apellido || "",
        dni: trabajadorDetectado.dni || "",
      });
      setBusqueda("");
      setTrabajadorSeleccionado(null);
      setModoCrear(false);
      cargarTrabajadores();
    }
  }, [open, trabajadorDetectado]);

  const cargarTrabajadores = async () => {
    setIsLoadingTrabajadores(true);
    try {
      const data = await TrabajadorService.getAll({ limit: 10000, offset: 0 });
      setTrabajadores(data.data || []);
    } catch (error) {
      console.error("Error al cargar trabajadores:", error);
      setAlert({
        open: true,
        message: "Error al cargar trabajadores",
        severity: "error",
      });
    } finally {
      setIsLoadingTrabajadores(false);
    }
  };

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

  const handleCrearTrabajador = async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      setAlert({
        open: true,
        message: "Por favor complete todos los campos requeridos",
        severity: "error",
      });
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

  const handleAsignarTrabajador = async () => {
    if (!trabajadorSeleccionado) {
      setAlert({
        open: true,
        message: "Por favor seleccione un trabajador",
        severity: "error",
      });
      return;
    }
    await asignarTrabajador(trabajadorSeleccionado._id);
  };

  const asignarTrabajador = async (trabajadorId) => {
    if (!urlStorage || !trabajadorId || !trabajadorDetectado) {
      setAlert({
        open: true,
        message: "Faltan datos para asignar el trabajador",
        severity: "error",
      });
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
        message: `Trabajador resuelto correctamente. ${registrosCreados} registro${registrosCreados === 1 ? "" : "s"} creado${registrosCreados === 1 ? "" : "s"}`,
        severity: "success",
      });

      setTimeout(() => {
        if (onResolved) {
          onResolved();
        }
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("Error al resolver trabajador:", error);
      setAlert({
        open: true,
        message: error.response?.data?.message || error.response?.data?.error || "Error al resolver el trabajador",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setModoCrear(false);
    setTrabajadorSeleccionado(null);
    setBusqueda("");
    setFormData({ nombre: "", apellido: "", dni: "" });
    onClose();
  };

  if (!trabajadorDetectado) return null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Resolver Trabajador No Identificado
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Datos detectados:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
              <Chip 
                label={`${trabajadorDetectado.nombre || ""} ${trabajadorDetectado.apellido || ""}`.trim() || "-"} 
                size="small" 
              />
              <Chip label={`DNI: ${trabajadorDetectado.dni || "-"}`} size="small" />
            </Box>

            <Divider sx={{ my: 2 }} />

            {!modoCrear ? (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Buscar trabajador existente:
                </Typography>
                <Autocomplete
                  options={trabajadoresFiltrados}
                  getOptionLabel={(option) =>
                    `${option.apellido}, ${option.nombre} (${option.dni})`
                  }
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
                            {isLoadingTrabajadores ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleAsignarTrabajador}
                    disabled={!trabajadorSeleccionado || isSaving}
                    fullWidth
                  >
                    {isSaving ? <CircularProgress size={20} /> : "Asignar Trabajador"}
                  </Button>
                </Box>
                <Divider sx={{ my: 2 }}>O</Divider>
                <Button
                  variant="outlined"
                  onClick={() => setModoCrear(true)}
                  fullWidth
                >
                  Crear Nuevo Trabajador
                </Button>
              </>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Crear nuevo trabajador:
                </Typography>
                <TextField
                  label="Nombre"
                  fullWidth
                  size="small"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Apellido"
                  fullWidth
                  size="small"
                  value={formData.apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, apellido: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="DNI"
                  fullWidth
                  size="small"
                  value={formData.dni}
                  onChange={(e) =>
                    setFormData({ ...formData, dni: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleCrearTrabajador}
                    disabled={isSaving}
                    fullWidth
                  >
                    {isSaving ? <CircularProgress size={20} /> : "Crear y Asignar"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setModoCrear(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </Box>
              </>
            )}
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

