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
  Grid,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import TrabajadorSelector from "src/components/dhn/TrabajadorSelector";

const createEmptyTrabajadorRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  trabajador: null,
  horasNormales: "",
  horas50: "",
  horas100: "",
  horasAltura: "",
  horasHormigon: "",
  horasZanjeo: "",
});

const parseTrabajadorId = (trabajador) => {
  if (!trabajador) return null;
  if (trabajador.trabajadorId) return trabajador.trabajadorId;
  if (trabajador._id) return trabajador._id;
  if (trabajador?.data?._id) return trabajador.data._id;
  return null;
};

const normalizeHourValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const HORA_FIELDS = [
  { key: "horasNormales", label: "Horas normales" },
  { key: "horas50", label: "Horas 50%" },
  { key: "horas100", label: "Horas 100%" },
  { key: "horasAltura", label: "Horas Altura" },
  { key: "horasHormigon", label: "Horas Hormigón" },
  { key: "horasZanjeo", label: "Horas Zanjeo" },
];

const ResolverParteManualForm = ({ urlStorage, onResolved, onCancel }) => {
  const [fecha, setFecha] = useState(dayjs());
  const [trabajadores, setTrabajadores] = useState([createEmptyTrabajadorRow()]);
  const [expandedAccordions, setExpandedAccordions] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const handleCloseAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);

  const actualizarTrabajador = useCallback((id, patch) => {
    setTrabajadores((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const handleAccordionChange = useCallback((id) => (event, isExpanded) => {
    setExpandedAccordions((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);


  const validTrabajadores = useMemo(() => {
    return trabajadores.filter((item) => parseTrabajadorId(item.trabajador));
  }, [trabajadores]);

  const disabledEnviar =
    isSaving || validTrabajadores.length === 0 || !fecha || !fecha.isValid();

  const handleEnviar = useCallback(
    async (event) => {
      event?.preventDefault();
      if (disabledEnviar) return;
      if (validTrabajadores.length !== trabajadores.length) {
        setAlert({
          open: true,
          severity: "error",
          message: "Seleccioná un trabajador válido en cada fila",
        });
        return;
      }

      const payloadTrabajadores = validTrabajadores.map((item) => ({
        trabajadorId: parseTrabajadorId(item.trabajador),
        horasNormales: normalizeHourValue(item.horasNormales),
        horas50: normalizeHourValue(item.horas50),
        horas100: normalizeHourValue(item.horas100),
        horasAltura: normalizeHourValue(item.horasAltura),
        horasHormigon: normalizeHourValue(item.horasHormigon),
        horasZanjeo: normalizeHourValue(item.horasZanjeo),
      }));

      setIsSaving(true);
      try {
        const resp = await TrabajoRegistradoService.resolverParteManual({
          urlStorage,
          fecha: fecha.toISOString(),
          trabajadores: payloadTrabajadores,
          estado: "okManual",
        });
        setAlert({
          open: true,
          severity: "success",
          message: resp?.message || "Parte resuelto correctamente",
        });
        onResolved?.(resp);
        setTimeout(() => {
          onCancel?.();
        }, 500);
      } catch (error) {
        console.error("Error al resolver parte manual:", error);
        setAlert({
          open: true,
          severity: "error",
          message:
            error?.response?.data?.message || error?.message || "No se pudo resolver el parte",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [trabajadores, disabledEnviar, fecha, urlStorage, validTrabajadores, onResolved, onCancel]
  );

  return (
    <Box sx={{ width: "100%", maxWidth: 480 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Resolver parte manual</Typography>
        <Typography variant="body2" color="text.secondary">
          Asigná la fecha del parte y los trabajadores con sus horas
        </Typography>

        <Divider />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Fecha del parte"
            value={fecha}
            onChange={(newFecha) => setFecha(newFecha || dayjs())}
            slotProps={{ textField: { size: "small" } }}
          />
        </LocalizationProvider>

        <Divider />

        <Stack spacing={2}>
          {trabajadores.map((trabajadorRow, idx) => (
            <Accordion
              key={trabajadorRow.id}
              expanded={expandedAccordions.has(trabajadorRow.id)}
              onChange={handleAccordionChange(trabajadorRow.id)}
              sx={{
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: "none",
                "&::before": {
                  display: "none",
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ px: 0, py: 1 }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  width="100%"
                  spacing={1}
                >
                  <Typography variant="subtitle2">Trabajador #{idx + 1}</Typography>
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      setTrabajadores((prev) => prev.filter((item) => item.id !== trabajadorRow.id));
                      setExpandedAccordions((prev) => {
                        const next = new Set(prev);
                        next.delete(trabajadorRow.id);
                        return next;
                      });
                    }}
                    disabled={trabajadores.length === 1}
                    sx={{ p: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>
                <Stack spacing={1}>
                  <TrabajadorSelector
                    value={trabajadorRow.trabajador}
                    onChange={(selected) => actualizarTrabajador(trabajadorRow.id, { trabajador: selected })}
                    setAlert={setAlert}
                  />

                  <Grid container spacing={1}>
                    {HORA_FIELDS.map(({ key, label }) => (
                      <Grid key={key} item xs={12} sm={6}>
                        <TextField
                          label={label}
                          size="small"
                          type="number"
                          fullWidth
                          value={trabajadorRow[key] ?? ""}
                          onChange={(event) =>
                            actualizarTrabajador(trabajadorRow.id, { [key]: event.target.value })
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        <Button
          variant="text"
          onClick={() => {
            const nuevoTrabajador = createEmptyTrabajadorRow();
            setTrabajadores((prev) => [...prev, nuevoTrabajador]);
            setExpandedAccordions((prev) => new Set([...prev, nuevoTrabajador.id]));
          }}
          size="small"
        >
          Agregar trabajador
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleEnviar}
          disabled={disabledEnviar}
        >
          {isSaving ? <CircularProgress size={18} color="inherit" /> : "Enviar parte"}
        </Button>
        <Button variant="text" onClick={onCancel} disabled={isSaving} fullWidth>
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

export default ResolverParteManualForm;

