import React, { useCallback, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import TrabajoForm, {
  createEmptyTrabajo,
  parseTrabajadorId,
  normalizeHourValue,
  HORA_FIELDS,
} from "src/components/dhn/TrabajoForm";

const ResolverParteManualForm = ({ urlStorage, onResolved, onCancel, onAutoClose, progreso }) => {
  const [fecha, setFecha] = useState(dayjs());
  const [trabajadores, setTrabajadores] = useState([createEmptyTrabajo()]);
  const [expandedAccordions, setExpandedAccordions] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const handleCloseAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);

  const handleTrabajoChange = useCallback((id, updated) => {
    setTrabajadores((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const handleDeleteTrabajo = useCallback((id) => {
    setTrabajadores((prev) => prev.filter((t) => t.id !== id));
    setExpandedAccordions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleAccordionChange = useCallback(
    (id) => (_, isExpanded) => {
      setExpandedAccordions((prev) => {
        const next = new Set(prev);
        isExpanded ? next.add(id) : next.delete(id);
        return next;
      });
    },
    []
  );

  const validTrabajadores = useMemo(
    () => trabajadores.filter((t) => parseTrabajadorId(t.trabajador)),
    [trabajadores]
  );

  const disabledEnviar = isSaving || validTrabajadores.length === 0 || !fecha?.isValid();

  const handleEnviar = useCallback(
    async (e) => {
      e?.preventDefault();
      if (disabledEnviar) return;

      if (validTrabajadores.length !== trabajadores.length) {
        setAlert({ open: true, severity: "error", message: "Seleccioná un trabajador válido en cada fila" });
        return;
      }

      const payload = validTrabajadores.map((t) => {
        const data = { trabajadorId: parseTrabajadorId(t.trabajador) };
        HORA_FIELDS.forEach(({ key }) => {
          data[key] = normalizeHourValue(t[key]);
        });
        return data;
      });

      setIsSaving(true);
      try {
        const resp = await TrabajoRegistradoService.resolverParteManual({
          urlStorage,
          fecha: fecha.toISOString(),
          trabajadores: payload,
          estado: "okManual",
        });
        setAlert({ open: true, severity: "success", message: resp?.message || "Parte resuelto correctamente" });
        onResolved?.(resp);
        setTimeout(() => {
          if (onAutoClose) {
            onAutoClose();
            return;
          }
          onCancel?.();
        }, 500);
      } catch (error) {
        setAlert({
          open: true,
          severity: "error",
          message: error?.response?.data?.message || error?.message || "No se pudo resolver el parte",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [trabajadores, disabledEnviar, fecha, urlStorage, validTrabajadores, onResolved, onCancel]
  );

  const handleAgregarTrabajador = useCallback(() => {
    const nuevo = createEmptyTrabajo();
    setTrabajadores((prev) => [...prev, nuevo]);
    setExpandedAccordions((prev) => new Set([...prev, nuevo.id]));
  }, []);

  return (
    <Box sx={{ width: "100%", maxWidth: 480 }}>
      <Stack spacing={2}>
        {progreso && (
          <Typography variant="caption" color="primary">
            Corrección asistida: {progreso}
          </Typography>
        )}
        <Typography variant="h6">Resolver parte manual</Typography>
        <Typography variant="body2" color="text.secondary">
          Asigná la fecha del parte y los trabajadores con sus horas
        </Typography>

        <Divider />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Fecha del parte"
            format="DD/MM/YYYY"
            value={fecha}
            onChange={(v) => setFecha(v || dayjs())}
            slotProps={{ textField: { size: "small" } }}
          />
        </LocalizationProvider>

        <Divider />

        <Stack spacing={2}>
          {trabajadores.map((trabajo, idx) => (
            <Accordion
              key={trabajo.id}
              expanded={expandedAccordions.has(trabajo.id)}
              onChange={handleAccordionChange(trabajo.id)}
              sx={{ borderColor: "divider", bgcolor: "background.paper", boxShadow: "none", "&::before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, py: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%" spacing={1}>
                  <Typography variant="subtitle2">Trabajador #{idx + 1}</Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrabajo(trabajo.id);
                    }}
                    disabled={trabajadores.length === 1}
                    sx={{ p: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>
                <TrabajoForm
                  trabajo={trabajo}
                  onChange={(updated) => handleTrabajoChange(trabajo.id, updated)}
                  setAlert={setAlert}
                  showTitle={false}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        <Button variant="text" onClick={handleAgregarTrabajador} size="small">
          Agregar trabajador
        </Button>

        <Button variant="contained" color="primary" onClick={handleEnviar} disabled={disabledEnviar}>
          {isSaving ? <CircularProgress size={18} color="inherit" /> : "Enviar parte"}
        </Button>
        <Button variant="text" onClick={onCancel} disabled={isSaving} fullWidth>
          Cancelar
        </Button>
      </Stack>

      <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={alert.open} autoHideDuration={4000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ResolverParteManualForm;
