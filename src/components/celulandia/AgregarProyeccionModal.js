import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Stack,
  IconButton,
  Paper,
  alpha,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ClearIcon from "@mui/icons-material/Clear";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useMutation } from "@tanstack/react-query";
import proyeccionService from "src/services/celulandia/proyeccionService";
import Alerts from "src/components/alerts";

const DropZone = ({ label, file, onFileChange, accept }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const f = event.dataTransfer.files?.[0];
      if (f) onFileChange(f);
    },
    [onFileChange]
  );

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  return (
    <Paper
      variant="outlined"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      sx={{
        p: 2,
        borderStyle: "dashed",
        borderWidth: 2,
        borderColor: isDragging ? "primary.main" : file ? "success.main" : "divider",
        backgroundColor: isDragging
          ? (theme) => alpha(theme.palette.primary.main, 0.05)
          : file
          ? (theme) => alpha(theme.palette.success.main, 0.05)
          : "background.default",
        transition: "all 0.2s ease-in-out",
        cursor: "pointer",
        "&:hover": {
          borderColor: "primary.main",
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
        },
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: (theme) =>
              file
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.primary.main, 0.1),
            color: file ? "success.main" : "primary.main",
            transition: "all 0.2s ease-in-out",
            transform: isDragging ? "scale(1.1)" : "scale(1)",
          }}
        >
          <UploadFileIcon sx={{ fontSize: 28 }} />
        </Box>

        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="subtitle2"
            color={file ? "success.main" : "text.primary"}
            gutterBottom
          >
            {label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {file ? file.name : "Arrastrá y soltá el archivo aquí o hacé click para seleccionar"}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <input
            type="file"
            accept={accept}
            style={{ display: "none" }}
            id={`input-${label}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileChange(f);
            }}
          />
          <label htmlFor={`input-${label}`}>
            <Button
              variant={file ? "outlined" : "contained"}
              size="small"
              component="span"
              color={file ? "inherit" : "primary"}
              sx={{ borderRadius: 2 }}
            >
              {file ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
          </label>
          {file && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
              sx={{
                color: "error.main",
                "&:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

const AgregarProyeccionModal = ({ open, onClose, onCreated, onError }) => {
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [archivoVentas, setArchivoVentas] = useState(null);
  const [archivoStockQuiebre, setArchivoStockQuiebre] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "error" });
  const [touched, setTouched] = useState({ fechaInicio: false, fechaFin: false });

  const resetForm = () => {
    setArchivoVentas(null);
    setArchivoStockQuiebre(null);
    setFechaInicio(null);
    setFechaFin(null);
    setTouched({ fechaInicio: false, fechaFin: false });
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload) => proyeccionService.createProyeccion(payload),
  });

  const canSubmit = Boolean(archivoVentas && archivoStockQuiebre && fechaInicio && fechaFin);

  const fechaInicioHasError = touched.fechaInicio && !fechaInicio;
  const fechaFinHasError = touched.fechaFin && !fechaFin;

  const handleFechaInicioChange = useCallback((newValue) => {
    setFechaInicio(newValue);
    setTouched((prev) => ({ ...prev, fechaInicio: true }));
  }, []);

  const handleFechaFinChange = useCallback((newValue) => {
    setFechaFin(newValue);
    setTouched((prev) => ({ ...prev, fechaFin: true }));
  }, []);

  const handleSubmit = async () => {
    if (isPending) return;
    if (!fechaInicio || !fechaFin) {
      setTouched({ fechaInicio: true, fechaFin: true });
      setAlert({
        open: true,
        message: "La fecha de inicio y la fecha de fin son obligatorias.",
        severity: "error",
      });
      return;
    }
    if (!canSubmit) return;
    try {
      await mutateAsync({
        fechaInicio: dayjs(fechaInicio).toISOString(),
        fechaFin: dayjs(fechaFin).toISOString(),
        archivoVentas,
        archivoStockQuiebre,
      });
      if (typeof onCreated === "function") {
        await onCreated();
      }

      onClose?.();
    } catch (error) {
      console.error("Error creando proyección", error);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Error al crear la proyección";
      if (typeof onError === "function") {
        onError(message);
      } else {
        setAlert({ open: true, message, severity: "error" });
      }
    } finally {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Alerts
        alert={alert}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
      />
      <DialogTitle>Agregar proyección</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DatePicker
                label="Fecha inicio"
                value={fechaInicio}
                onChange={handleFechaInicioChange}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    required: true,
                    error: fechaInicioHasError,
                    helperText: fechaInicioHasError ? "Requerido" : "",
                    fullWidth: true,
                  },
                }}
              />
              <DatePicker
                label="Fecha fin"
                value={fechaFin}
                onChange={handleFechaFinChange}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    required: true,
                    error: fechaFinHasError,
                    helperText: fechaFinHasError ? "Requerido" : "",
                    fullWidth: true,
                  },
                }}
              />
            </Stack>
          </LocalizationProvider>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <DropZone
                label="Excel de ventas (.xlsx, .xls)"
                file={archivoVentas}
                onFileChange={setArchivoVentas}
                accept=".xlsx,.xls"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DropZone
                label="Excel de stock/quiebre (.xlsx, .xls)"
                file={archivoStockQuiebre}
                onFileChange={setArchivoStockQuiebre}
                accept=".xlsx,.xls"
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit || isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarProyeccionModal;
