import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
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
import proyeccionService from "src/services/celulandia/proyeccionService";

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
        p: 3,
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
      <Stack spacing={2} alignItems="center">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
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
          <UploadFileIcon sx={{ fontSize: 32 }} />
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

const AgregarProyeccionModal = ({ open, onClose, onCreated }) => {
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [archivoVentas, setArchivoVentas] = useState(null);
  const [archivoStock, setArchivoStock] = useState(null);
  const [archivoQuiebre, setArchivoQuiebre] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = Boolean(archivoVentas && archivoStock);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await proyeccionService.createProyeccion({
        ...(fechaInicio && { fechaInicio: dayjs(fechaInicio).toISOString() }),
        ...(fechaFin && { fechaFin: dayjs(fechaFin).toISOString() }),
        archivoVentas,
        archivoStock,
        archivoQuiebre,
      });      
      onClose?.();
    } catch (error) {
      console.error("Error creando proyección", error);
    } finally {
      setIsSubmitting(false);
      setArchivoVentas(null);
      setArchivoStock(null);
      setArchivoQuiebre(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar proyección</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DatePicker
                label="Fecha inicio (Opcional)"
                value={fechaInicio}
                onChange={setFechaInicio}
                format="DD/MM/YYYY"
              />
              <DatePicker
                label="Fecha fin (Opcional)"
                value={fechaFin}
                onChange={setFechaFin}
                format="DD/MM/YYYY"
              />
            </Stack>
          </LocalizationProvider>

          <DropZone
            label="Excel de ventas (.xlsx, .xls)"
            file={archivoVentas}
            onFileChange={setArchivoVentas}
            accept=".xlsx,.xls"
          />
          <DropZone
            label="Excel de stock (.xlsx, .xls)"
            file={archivoStock}
            onFileChange={setArchivoStock}
            accept=".xlsx,.xls"
          />
          <DropZone
            label="Excel de quiebre de stock (opcional)"
            file={archivoQuiebre}
            onFileChange={setArchivoQuiebre}
            accept=".xlsx,.xls"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarProyeccionModal;
