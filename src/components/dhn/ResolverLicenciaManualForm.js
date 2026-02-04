import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
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
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import TrabajadorSelector from "src/components/dhn/TrabajadorSelector";

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
  onAutoClose,
  onResolved,
  progreso,
}) => {
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });
  const updateFormState = useCallback((patch) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  }, []);

  const {
    trabajadorSeleccionado,
    tipoLicencia,
    useRange,
    fechaIndividual,
    fechaDesde,
    fechaHasta,
  } = formState;

  useEffect(() => {
    if (open === false) return;
    const initialState = { ...INITIAL_FORM_STATE };
    if (trabajadorDetectado) {
      initialState.trabajadorSeleccionado = trabajadorDetectado;
    }
    updateFormState(initialState);
  }, [open, trabajadorDetectado, updateFormState]);

  const initialTrabajadorFormData = useMemo(
    () => ({
      nombre: trabajadorDetectado?.nombre || "",
      apellido: trabajadorDetectado?.apellido || "",
      dni: trabajadorDetectado?.dni || "",
    }),
    [trabajadorDetectado]
  );

  const handleCloseAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);


  const handleClose = useCallback(
    (source = "cancel") => {
    if (isSaving) return;
    updateFormState(INITIAL_FORM_STATE);
    if (source === "auto" && onAutoClose) {
      onAutoClose();
      return;
    }
    onCancel?.() || onClose?.();
  },
    [isSaving, onAutoClose, onCancel, onClose, updateFormState]
  );

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
      estado: "okManual",
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
          handleClose("auto");
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

  const handleEnviar = useCallback(
    async (event) => {
      event?.preventDefault();
      setIsSaving(true);
      try {
        await resolverLicencia(trabajadorSeleccionado);
      } finally {
        setIsSaving(false);
      }
    },
    [resolverLicencia, trabajadorSeleccionado]
  );

  return (
    <Box sx={{ width: "100%", maxWidth: 360 }}>
      <Stack spacing={2}>
        {progreso && (
          <Typography variant="caption" color="primary">
            Corrección asistida: {progreso}
          </Typography>
        )}
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

        <TrabajadorSelector
          value={trabajadorSeleccionado}
          onChange={(selected) => updateFormState({ trabajadorSeleccionado: selected })}
          setAlert={setAlert}
          initialFormData={initialTrabajadorFormData}
        />

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
              format="DD/MM/YYYY"
              value={fechaIndividual}
              onChange={(value) => updateFormState({ fechaIndividual: value || dayjs() })}
              slotProps={{ textField: { size: "small" } }}
            />
          ) : (
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
              <DatePicker
                label="Desde"
                format="DD/MM/YYYY"
                value={fechaDesde}
                onChange={(value) => updateFormState({ fechaDesde: value || dayjs() })}
                slotProps={{ textField: { size: "small", sx: { flex: 1, minWidth: 140 } } }}
              />
              <DatePicker
                label="Hasta"
                format="DD/MM/YYYY"
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
          disabled={isSaving || !trabajadorSeleccionado}
          fullWidth
        >
          {isSaving ? <CircularProgress size={18} color="inherit" /> : "Enviar resolución"}
        </Button>
        <Button variant="text" onClick={() => handleClose("cancel")} disabled={isSaving} fullWidth>
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

