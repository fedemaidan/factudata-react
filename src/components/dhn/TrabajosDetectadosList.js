import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import ResolverParteManualForm from "src/components/dhn/ResolverParteManualForm";
import TrabajoForm, {
  createEmptyTrabajo,
  parseTrabajadorId,
  normalizeHourValue,
  HORA_FIELDS,
} from "src/components/dhn/TrabajoForm";

const TIPOS_HORAS = [
  { key: "horasNormales", label: "Normales", color: "default" },
  { key: "horas50", label: "50%", color: "primary" },
  { key: "horas100", label: "100%", color: "success" },
  { key: "horasAltura", label: "Altura", color: "warning" },
  { key: "horasHormigon", label: "Hormigon", color: "info" },
  { key: "horasZanjeo", label: "Zanjeo", color: "secondary" },
  { key: "horasNocturnas", label: "Nocturnas", color: "default", sx: { borderColor: "#5c6bc0", color: "#5c6bc0" } },
  { key: "horasNocturnas50", label: "Noct. 50%", color: "default", sx: { borderColor: "#ab47bc", color: "#ab47bc" } },
  { key: "horasNocturnas100", label: "Noct. 100%", color: "default", sx: { borderColor: "#ec407a", color: "#ec407a" } },
];

const HorasChips = ({ item }) => {
  const horasConValor = TIPOS_HORAS.filter((t) => item[t.key] != null && item[t.key] > 0);
  if (horasConValor.length === 0) {
    return <Typography variant="caption" color="text.secondary">Sin horas</Typography>;
  }
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {horasConValor.map((tipo) => (
        <Chip
          key={tipo.key}
          label={`${tipo.label}: ${item[tipo.key]}h`}
          size="small"
          color={tipo.color}
          variant="outlined"
          sx={{ fontSize: "0.65rem", height: 20, "& .MuiChip-label": { px: 1 }, ...tipo.sx }}
        />
      ))}
    </Box>
  );
};

const TrabajoItem = ({ trabajo, onEdit }) => {
  const trabajador = trabajo?.trabajadorId;
  const nombre = trabajador ? `${trabajador.apellido || ""}, ${trabajador.nombre || ""}`.trim() : "Desconocido";

  return (
    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "grey.50", border: "1px solid", borderColor: "grey.200" }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" fontWeight={600}>{nombre}</Typography>
          </Box>
          <IconButton size="small" onClick={() => onEdit(trabajo)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>
        <HorasChips item={trabajo} />
      </Stack>
    </Box>
  );
};

const TrabajosDetectadosList = ({ urlStorage, onUpdated, progreso }) => {
  const [trabajos, setTrabajos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: "info", message: "" });

  // Edit state
  const [editingTrabajo, setEditingTrabajo] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add new state
  const [isAdding, setIsAdding] = useState(false);
  const [newTrabajo, setNewTrabajo] = useState(null);

  // Date state
  const [fecha, setFecha] = useState(null);
  const [draftFecha, setDraftFecha] = useState(null);
  const [fechaInput, setFechaInput] = useState("");
  const [isSavingFecha, setIsSavingFecha] = useState(false);

  const fetchTrabajos = useCallback(async () => {
    if (!urlStorage) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await TrabajoRegistradoService.getByComprobante(urlStorage);
      const data = Array.isArray(response?.data) ? response.data : [];
      setTrabajos(data);
      if (data.length > 0 && data[0]?.fecha) {
        const referencia = dayjs(data[0].fecha);
        setFecha(referencia);
        setDraftFecha(referencia);
        setFechaInput(referencia.format("DD/MM/YYYY"));
      } else {
        setFecha(null);
        setDraftFecha(null);
        setFechaInput("");
      }
    } catch (err) {
      setError("Error al cargar trabajos");
      setTrabajos([]);
    } finally {
      setIsLoading(false);
    }
  }, [urlStorage]);

  useEffect(() => {
    fetchTrabajos();
  }, [fetchTrabajos]);

  const handleCloseAlert = useCallback(() => setAlert((p) => ({ ...p, open: false })), []);

  // Convert trabajo from DB to form format
  const toFormFormat = (trabajo) => ({
    id: trabajo._id,
    trabajador: trabajo.trabajadorId,
    horasNormales: trabajo.horasNormales ?? "",
    horas50: trabajo.horas50 ?? "",
    horas100: trabajo.horas100 ?? "",
    horasAltura: trabajo.horasAltura ?? "",
    horasHormigon: trabajo.horasHormigon ?? "",
    horasZanjeo: trabajo.horasZanjeo ?? "",
    horasNocturnas: trabajo.horasNocturnas ?? "",
    horasNocturnas50: trabajo.horasNocturnas50 ?? "",
    horasNocturnas100: trabajo.horasNocturnas100 ?? "",
  });

  const handleEdit = (trabajo) => {
    setEditingTrabajo(trabajo);
    setEditForm(toFormFormat(trabajo));
    setIsAdding(false);
    setNewTrabajo(null);
  };

  const handleCancelEdit = () => {
    setEditingTrabajo(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTrabajo || !editForm) return;
    const trabajadorId = parseTrabajadorId(editForm.trabajador);
    if (!trabajadorId) {
      setAlert({ open: true, severity: "error", message: "Seleccioná un trabajador válido" });
      return;
    }

    const payload = { trabajadorId };
    HORA_FIELDS.forEach(({ key }) => {
      payload[key] = normalizeHourValue(editForm[key]);
    });

    setIsSaving(true);
    try {
      await TrabajoRegistradoService.update(editingTrabajo._id, payload);
      setAlert({ open: true, severity: "success", message: "Trabajo actualizado" });
      handleCancelEdit();
      await fetchTrabajos();
      onUpdated?.();
    } catch (err) {
      setAlert({ open: true, severity: "error", message: err?.message || "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new trabajo
  const handleStartAdd = () => {
    setIsAdding(true);
    setNewTrabajo(createEmptyTrabajo());
    setEditingTrabajo(null);
    setEditForm(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewTrabajo(null);
  };

  const handleManualParteResuelta = useCallback(
    async (resp) => {
      const registros = resp?.registrosCreados ?? resp?.data?.registrosCreados ?? 0;
      const mensaje =
        resp?.message ||
        resp?.mensaje ||
        `Parte resuelto manualmente (${registros} trabajador${registros === 1 ? "" : "es"})`;
      setAlert({ open: true, severity: "success", message: mensaje });
      await fetchTrabajos();
      onUpdated?.();
    },
    [fetchTrabajos, onUpdated]
  );

  const handleSaveNew = async () => {
    if (!newTrabajo) return;
    const trabajadorId = parseTrabajadorId(newTrabajo.trabajador);
    if (!trabajadorId) {
      setAlert({ open: true, severity: "error", message: "Seleccioná un trabajador válido" });
      return;
    }
    if (!fecha?.isValid()) {
      setAlert({ open: true, severity: "error", message: "Fecha inválida" });
      return;
    }

    const payload = { trabajadorId };
    HORA_FIELDS.forEach(({ key }) => {
      payload[key] = normalizeHourValue(newTrabajo[key]);
    });

    setIsSaving(true);
    try {
      await TrabajoRegistradoService.resolverParteManual({
        urlStorage,
        fecha: fecha.toISOString(),
        trabajadores: [payload],
        estado: "okManual",
      });
      setAlert({ open: true, severity: "success", message: "Trabajo agregado" });
      handleCancelAdd();
      await fetchTrabajos();
      onUpdated?.();
    } catch (err) {
      setAlert({ open: true, severity: "error", message: err?.message || "Error al agregar" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFechaChange = (newFecha) => {
    const parsed = newFecha?.isValid() ? newFecha : null;
    setDraftFecha(parsed);
    setFechaInput(parsed ? parsed.format("DD/MM/YYYY") : "");
  };

  const handleInputFechaChange = useCallback((_, newValue) => {
    setFechaInput(newValue || "");
  }, []);

  const parsedInput = dayjs(fechaInput, "DD/MM/YYYY", true);
  const isFechaDirty = Boolean(
    parsedInput.isValid() &&
      (!fecha || !parsedInput.isSame(fecha, "day"))
  );

  const handleConfirmFecha = async () => {
    if (!isFechaDirty || !parsedInput.isValid() || trabajos.length === 0) return;
    setIsSavingFecha(true);
    try {
      await TrabajoRegistradoService.updateByComprobante(urlStorage, {
        fecha: parsedInput.toISOString(),
        fechasDetectadas: parsedInput.format("DD/MM/YYYY"),
      });
      setFecha(parsedInput);
      setDraftFecha(parsedInput);
      setFechaInput(parsedInput.format("DD/MM/YYYY"));
      setAlert({ open: true, severity: "success", message: "Fecha confirmada" });
      await fetchTrabajos();
      onUpdated?.();
    } catch (err) {
      setAlert({ open: true, severity: "error", message: err?.message || "Error al actualizar fecha" });
    } finally {
      setIsSavingFecha(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 1 }}>
        <CircularProgress size={24} />
        <Typography variant="caption" color="text.secondary">Cargando...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography variant="body2" color="error" sx={{ py: 2 }}>{error}</Typography>;
  }

  if (trabajos.length === 0) {
    return (
      <Box sx={{ width: "100%", maxWidth: 480 }}>
        <ResolverParteManualForm
          urlStorage={urlStorage}
          onResolved={handleManualParteResuelta}
          onCancel={() => {}}
          progreso={progreso}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 480 }}>
      <Stack spacing={2}>
        {progreso && (
          <Typography variant="caption" color="primary">
            Corrección asistida: {progreso}
          </Typography>
        )}
        <Typography variant="h6">Trabajos detectados</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Fecha del parte"
              format="DD/MM/YYYY"
              inputFormat="DD/MM/YYYY"
              value={draftFecha ?? null}
              onChange={handleFechaChange}
              inputValue={fechaInput}
              onInputChange={handleInputFechaChange}
              disabled={false}
              allowSameDateSelection
              slotProps={{
                textField: {
                  size: "small",
                  inputProps: {
                    placeholder: "dd/mm/aaaa",
                  },
                  InputProps: {
                    endAdornment: isSavingFecha ? <CircularProgress size={16} /> : null,
                  },
                },
              }}
            />
          </LocalizationProvider>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmFecha}
            disabled={!isFechaDirty || isSavingFecha || trabajos.length === 0}
          >
            {isSavingFecha ? <CircularProgress size={16} color="inherit" /> : "Confirmar fecha"}
          </Button>
        </Stack>

        <Divider />

        {trabajos.length === 0 && !isAdding ? (
          <Typography variant="body2" color="text.secondary">
            No hay trabajos asociados a esta imagen.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {trabajos.map((trabajo) =>
              editingTrabajo?._id === trabajo._id ? (
                <Box key={trabajo._id} sx={{ p: 1.5, border: "1px solid", borderColor: "primary.main", borderRadius: 1 }}>
                  <TrabajoForm
                    trabajo={editForm}
                    onChange={setEditForm}
                    setAlert={setAlert}
                    showTitle={false}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button size="small" variant="contained" onClick={handleSaveEdit} disabled={isSaving}>
                      {isSaving ? <CircularProgress size={16} /> : "Guardar"}
                    </Button>
                    <Button size="small" variant="text" onClick={handleCancelEdit} disabled={isSaving}>
                      Cancelar
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <TrabajoItem key={trabajo._id} trabajo={trabajo} onEdit={handleEdit} />
              )
            )}
          </Stack>
        )}

        <Collapse in={isAdding}>
          <Box sx={{ p: 1.5, border: "1px dashed", borderColor: "primary.main", borderRadius: 1, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Nuevo trabajo</Typography>
            <TrabajoForm
              trabajo={newTrabajo}
              onChange={setNewTrabajo}
              setAlert={setAlert}
              showTitle={false}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant="contained" onClick={handleSaveNew} disabled={isSaving}>
                {isSaving ? <CircularProgress size={16} /> : "Agregar"}
              </Button>
              <Button size="small" variant="text" onClick={handleCancelAdd} disabled={isSaving}>
                Cancelar
              </Button>
            </Stack>
          </Box>
        </Collapse>

        {!isAdding && (
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleStartAdd}>
            Agregar trabajo
          </Button>
        )}
      </Stack>

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alert.open}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TrabajosDetectadosList;
