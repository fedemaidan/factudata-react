import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
} from "@mui/material";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TrabajadorService from "src/services/dhn/TrabajadorService";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";

const licenseTypes = [
  "PG",
  "VC",
  "V",
  "NT",
  "D",
  "FC",
  "1/2FC",
  "AR",
  "CJ",
  "CA",
  "NA",
  "FA",
  "EX",
  "IZRC",
  "RE",
];

const normalizeDayjs = (value) =>
  value
    ? value
        .hour(12)
        .minute(0)
        .second(0)
        .millisecond(0)
        .toISOString()
    : null;

const INITIAL_FORM_STATE = {
  trabajadorSeleccionado: null,
  busqueda: "",
  modoCrear: false,
  formData: { nombre: "", apellido: "", dni: "" },
  tipoLicencia: "FC",
  useRange: false,
  fechaIndividual: dayjs(),
  fechaDesde: dayjs(),
  fechaHasta: dayjs(),
};

const ResolverLicenciaManualForm = ({
  open,
  urlStorage,
  trabajadorDetectado,
  onClose,
  onCancel,
  onResolved,
}) => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const cargarTrabajadores = useCallback(async () => {
    setIsLoadingTrabajadores(true);
    try {
      const data = await TrabajadorService.getAll({ limit: 10000, offset: 0 });
      setTrabajadores(data.data || []);
    } catch (error) {
      console.error("Error al cargar trabajadores:", error);
      setAlert({
        open: true,
        severity: "error",
        message: "No se pudieron cargar los trabajadores",
      });
    } finally {
      setIsLoadingTrabajadores(false);
    }
  }, []);

  const updateFormState = useCallback((patch) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  }, []);

  const {
    trabajadorSeleccionado,
    busqueda,
    modoCrear,
    formData,
    tipoLicencia,
    useRange,
    fechaIndividual,
    fechaDesde,
    fechaHasta,
  } = formState;

  useEffect(() => {
    if (open === false) return;
    cargarTrabajadores();
    const initialState = { ...INITIAL_FORM_STATE };
    if (trabajadorDetectado) {
      initialState.formData = {
        nombre: trabajadorDetectado.nombre || "",
        apellido: trabajadorDetectado.apellido || "",
        dni: trabajadorDetectado.dni || "",
      };
    }
    updateFormState(initialState);
  }, [open, trabajadorDetectado, cargarTrabajadores, updateFormState]);

  const trabajadoresFiltrados = useMemo(() => {
    const term = (busqueda || "").toString().trim().toLowerCase();
    if (!term) return trabajadores;
    return trabajadores.filter((t) => {
      const nombre = (t?.nombre || "").toLowerCase();
      const apellido = (t?.apellido || "").toLowerCase();
      const dni = (t?.dni || "").replace(/\./g, "").toLowerCase();
      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        `${nombre} ${apellido}`.includes(term) ||
        `${apellido} ${nombre}`.includes(term) ||
        dni.includes(term)
      );
    });
  }, [trabajadores, busqueda]);

  const handleCloseAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);


  const handleClose = useCallback(() => {
    if (isSaving) return;
    updateFormState(INITIAL_FORM_STATE);
    onCancel?.() || onClose?.();
  }, [isSaving, onCancel, onClose, updateFormState]);

  const resolverLicencia = useCallback(
    async (trabajador) => {
      if (!urlStorage) {
        setAlert({
          open: true,
          severity: "error",
          message: "No se encontró la imagen del comprobante",
        });
        return;
      }

      if (!trabajador) {
        setAlert({
          open: true,
          severity: "error",
          message: "Seleccioná un trabajador antes de resolver",
        });
        return;
      }

      const desde = useRange ? fechaDesde : fechaIndividual;
      const hasta = useRange ? fechaHasta : null;

      if (useRange && hasta && desde && hasta.isBefore(desde, "day")) {
        setAlert({
          open: true,
          severity: "error",
          message: "La fecha final no puede ser anterior a la fecha inicial",
        });
        return;
      }

    const trabajadorId = trabajador._id || trabajador.data?._id;
    if (!trabajadorId) {
      setAlert({
        open: true,
        severity: "error",
        message: "El trabajador seleccionado no tiene un ID válido",
      });
      return;
    }

    const payload = {
      urlStorage,
      trabajadorId,
      tipoLicencia,
      desde: normalizeDayjs(desde),
      ...(useRange ? { hasta: normalizeDayjs(hasta) } : {}),
    };

      setIsSaving(true);
      try {
        const resp = await TrabajoRegistradoService.resolverLicenciaManual(payload);
        setAlert({
          open: true,
          severity: "success",
          message: resp?.message || "Licencia resuelta correctamente",
        });
        onResolved?.(resp);
        setTimeout(() => {
          handleClose();
        }, 800);
      } catch (error) {
        console.error("Error al resolver licencia manual:", error);
        setAlert({
          open: true,
          severity: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "No se pudo resolver la licencia",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      urlStorage,
      tipoLicencia,
      useRange,
      fechaIndividual,
      fechaDesde,
      fechaHasta,
      handleClose,
      onResolved,
    ]
  );

  const handleCrearTrabajador = useCallback(async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      setAlert({
        open: true,
        severity: "error",
        message: "Completá nombre, apellido y DNI para crear el trabajador",
      });
      return null;
    }

    try {
      const nuevo = await TrabajadorService.create({
        ...formData,
        desde: dayjs().toISOString().split("T")[0],
        active: true,
      });
      const worker = nuevo?._id ? nuevo : nuevo?.data;
      if (!worker) {
        throw new Error("Respuesta inválida al crear trabajador");
      }
      updateFormState({ trabajadorSeleccionado: worker, modoCrear: false });
      setAlert({
        open: true,
        severity: "success",
        message: "Trabajador creado y seleccionado",
      });
      return worker;
    } catch (error) {
      console.error("Error al crear trabajador:", error);
      setAlert({
        open: true,
        severity: "error",
        message:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Error al crear el trabajador",
      });
      return null;
    }
  }, [formData]);

  const handleAsignarTrabajador = useCallback(async () => {
    const worker = trabajadorSeleccionado;
    if (!worker) {
      setAlert({
        open: true,
        severity: "error",
        message: "Seleccioná un trabajador antes de resolver",
      });
      return;
    }
    await resolverLicencia(worker);
  }, [resolverLicencia, trabajadorSeleccionado]);

  const handleEnviar = useCallback(
    async (event) => {
      event?.preventDefault();
      setIsSaving(true);
      try {
        if (modoCrear) {
          const worker = await handleCrearTrabajador();
          if (worker) {
            await resolverLicencia(worker);
          }
          return;
        }
        await handleAsignarTrabajador();
      } finally {
        setIsSaving(false);
      }
    },
    [handleAsignarTrabajador, handleCrearTrabajador, modoCrear, resolverLicencia]
  );

  return (
    <Box sx={{ width: "100%", maxWidth: 360 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Resolver licencia manual</Typography>
        {trabajadorDetectado && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Trabajador detectado
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`${trabajadorDetectado.nombre || ""} ${
                  trabajadorDetectado.apellido || ""
                }`.trim()}
                size="small"
              />
              <Chip
                label={`DNI: ${trabajadorDetectado.dni || "-"}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Box>
        )}

        <Divider />

        {!modoCrear ? (
          <>
            <Typography variant="subtitle2">Buscar trabajador</Typography>
            <Autocomplete
              options={trabajadoresFiltrados}
              getOptionLabel={(option) =>
                `${option.apellido || ""}, ${option.nombre || ""} (${option.dni || ""})`.trim()
              }
              loading={isLoadingTrabajadores}
              value={trabajadorSeleccionado}
              onChange={(_, newValue) => updateFormState({ trabajadorSeleccionado: newValue })}
              inputValue={busqueda}
              onInputChange={(_, newInputValue) => updateFormState({ busqueda: newInputValue })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nombre, apellido o DNI"
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
            />

            <Button
              variant="text"
              onClick={() => updateFormState({ modoCrear: true })}
              size="small"
            >
              Crear nuevo trabajador
            </Button>
          </>
        ) : (
          <>
            <Typography variant="subtitle2">Crear trabajador</Typography>
            <TextField
              label="Nombre"
              size="small"
              value={formData?.nombre}
              onChange={(event) =>
                updateFormState({ formData: { ...formData, nombre: event.target.value } })
              }
            />
            <TextField
              label="Apellido"
              size="small"
              value={formData?.apellido}
              onChange={(event) =>
                updateFormState({ formData: { ...formData?.apellido, apellido: event.target.value } })
              }
            />
            <TextField
              label="DNI"
              size="small"
              value={formData?.dni}
              onChange={(event) =>
                updateFormState({ formData: { ...formData, dni: event.target.value } })
              }
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => updateFormState({ modoCrear: false })}
              disabled={isSaving}
              fullWidth
            >
              Cancelar
            </Button>
          </>
        )}

        <Divider />

        <Typography variant="subtitle2">Fechas</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={useRange}
              onChange={(event) => updateFormState({ useRange: event.target.checked })}
            />
          }
          label="Usar rango de fechas"
        />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {!useRange ? (
            <DatePicker
              label="Fecha única"
              value={fechaIndividual}
              onChange={(value) => updateFormState({ fechaIndividual: value || dayjs() })}
              slotProps={{ textField: { size: "small" } }}
            />
          ) : (
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
              <DatePicker
                label="Desde"
                value={fechaDesde}
                onChange={(value) => updateFormState({ fechaDesde: value || dayjs() })}
                slotProps={{ textField: { size: "small", sx: { flex: 1, minWidth: 140 } } }}
              />
              <DatePicker
                label="Hasta"
                value={fechaHasta}
                onChange={(value) => updateFormState({ fechaHasta: value || dayjs() })}
                slotProps={{ textField: { size: "small", sx: { flex: 1, minWidth: 140 } } }}
              />
            </Stack>
          )}
        </LocalizationProvider>

        <FormControl fullWidth size="small">
          <InputLabel id="tipo-licencia-label">Tipo de licencia</InputLabel>
          <Select
            labelId="tipo-licencia-label"
            value={tipoLicencia}
            label="Tipo de licencia"
            onChange={(event) => updateFormState({ tipoLicencia: event.target.value })}
          >
            {licenseTypes.map((type) => (
              <MenuItem value={type} key={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={handleEnviar}
          disabled={
            isSaving ||
            (modoCrear
              ? !formData.nombre || !formData.apellido || !formData.dni
              : !trabajadorSeleccionado)
          }
          fullWidth
        >
          {isSaving ? (
            <CircularProgress size={18} color="inherit" />
          ) : modoCrear ? (
            "Crear trabajador y resolver"
          ) : (
            "Enviar resolución"
          )}
        </Button>
        <Button variant="text" onClick={handleClose} disabled={isSaving} fullWidth>
          Cancelar
        </Button>
      </Stack>

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alert.open}
        autoHideDuration={4000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ResolverLicenciaManualForm;

