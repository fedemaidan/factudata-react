import React, { useEffect, useMemo, useState, useCallback } from "react";
import Head from "next/head";
import {
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  Typography,
  IconButton,
  Paper,
  alpha,
  Chip,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import DataTable from "src/components/celulandia/DataTable";
import conciliacionService from "src/services/dhn/conciliacionService";
import Alerts from "src/components/alerts";
import { useRouter } from "next/router";

const DropZone = ({ label, file, onFileChange, accept, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const f = event.dataTransfer.files?.[0];
      if (f) onFileChange(f);
    },
    [onFileChange, disabled]
  );

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging && !disabled) setIsDragging(true);
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
        borderColor: disabled ? "divider" : isDragging ? "primary.main" : file ? "success.main" : "divider",
        backgroundColor: disabled
          ? "background.default"
          : isDragging
          ? (theme) => alpha(theme.palette.primary.main, 0.05)
          : file
          ? (theme) => alpha(theme.palette.success.main, 0.05)
          : "background.default",
        transition: "all 0.2s ease-in-out",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        "&:hover": disabled
          ? {}
          : {
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
          <Typography variant="subtitle2" color={file ? "success.main" : "text.primary"} gutterBottom>
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
            disabled={disabled}
            onChange={(e) => {
              if (disabled) return;
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
              disabled={disabled}
              sx={{ borderRadius: 2 }}
            >
              {file ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
          </label>
          {file && (
            <IconButton
              size="small"
              disabled={disabled}
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

const getErrorMessage = (error) => {
  const apiError = error?.response?.data?.error;
  if (apiError) return apiError;
  return error?.message || "Ocurrió un error procesando la conciliación.";
};

const ConciliacionPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sheetLink, setSheetLink] = useState("");
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [pendingConciliacionId, setPendingConciliacionId] = useState(null);
  const [pendingConciliacionStatus, setPendingConciliacionStatus] = useState(null);
  const [pendingConciliacionError, setPendingConciliacionError] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const fetchConciliaciones = useCallback(async () => {
    setIsLoading(true);
    try {
      const lista = await conciliacionService.getConciliaciones();
      const ids = lista.map((item) => item._id).filter(Boolean);
      const statsResponse = await conciliacionService.getConciliacionesStats(ids);
      const statsMap = statsResponse?.stats || {};
      const enriched = lista.map((item) => ({
        ...item,
        stats: statsMap[item._id] || {},
      }));
      setItems(enriched);
    } catch (error) {
      setAlert({
        open: true,
        message: getErrorMessage(error),
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConciliaciones();
  }, [fetchConciliaciones]);

  useEffect(() => {
    if (!pendingConciliacionId) return undefined;
    let intervalId = null;
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const payload = await conciliacionService.getConciliacionStatus(pendingConciliacionId);
        if (cancelled) return;
        const status = payload?.status || "pending";
        setPendingConciliacionStatus(status);
        if (status === "done") {
          setPendingConciliacionId(null);
          setPendingConciliacionError(null);
          setAlert({
            open: true,
            message: "La conciliación finalizó correctamente.",
            severity: "success",
          });
          await fetchConciliaciones();
        }
        if (status === "error") {
          const message = payload?.errorMessage || "Error procesando conciliación.";
          setPendingConciliacionError(message);
          setPendingConciliacionId(null);
          setAlert({
            open: true,
            message,
            severity: "error",
          });
          await fetchConciliaciones();
        }
      } catch (error) {
        if (cancelled) return;
        setPendingConciliacionError(getErrorMessage(error));
        setPendingConciliacionId(null);
        setAlert({
          open: true,
          message: "Error consultando estado de conciliación.",
          severity: "error",
        });
      }
    };
    fetchStatus();
    intervalId = setInterval(fetchStatus, 10000);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingConciliacionId, fetchConciliaciones]);

  const handleRowClick = (item) => {
    if (!item?._id) return;
    router.push(`/dhn/conciliacion/${item._id}`);
  };

  const columns = useMemo(
    () => [
      { key: "seleccionar", label: "", sortable: false, onRowClick: handleRowClick },
      { key: "periodo", label: "Periodo (YYYY-MM)", sortable: true },
      { key: "procesados", label: "Procesados", sortable: true, render: (row) => row?.stats?.procesados ?? 0 },
      { key: "okAutomatico", label: "OK Automático", sortable: true, render: (row) => row?.stats?.okAutomatico ?? 0 },
      { key: "advertencia", label: "Advertencias", sortable: true, render: (row) => row?.stats?.advertencia ?? 0 },
      {
        key: "created_at",
        label: "Creada",
        sortable: true,
        render: (row) => {
          const d = row?.created_at ? new Date(row.created_at) : null;
          return d ? d.toLocaleString() : "-";
        },
      },
    ],
    []
  );

  const resetModal = () => {
    setSheetLink("");
    setArchivoExcel(null);
    setSheetName("");
    setDateFrom(null);
    setDateTo(null);
  };

  const handleOpenAdd = () => {
    resetModal();
    setAddOpen(true);
  };

  const handleCloseAdd = () => {
    setAddOpen(false);
    resetModal();
  };

  const handleSheetLinkChange = (value) => {
    setSheetLink(value);
    if (value?.trim()) setArchivoExcel(null);
  };

  const handleFileChange = (file) => {
    setArchivoExcel(file);
    if (file) setSheetLink("");
  };

  const validate = () => {
    const tieneLink = Boolean(sheetLink?.trim());
    const tieneArchivo = Boolean(archivoExcel);
    if (!tieneLink && !tieneArchivo) {
      setAlert({ open: true, message: "Debés informar un link o subir un archivo.", severity: "error" });
      return false;
    }
    if (!sheetName?.trim()) {
      setAlert({ open: true, message: "El nombre de la hoja es obligatorio.", severity: "error" });
      return false;
    }
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      setAlert({
        open: true,
        message: "Para usar rango de fechas, completá fecha desde y fecha hasta.",
        severity: "error",
      });
      return false;
    }
    if (dateFrom && dateTo && dayjs(dateFrom).isAfter(dayjs(dateTo))) {
      setAlert({ open: true, message: "La fecha desde no puede ser mayor a la fecha hasta.", severity: "error" });
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    const payload = {
      sheetName: sheetName.trim(),
      dateFrom: dateFrom ? dayjs(dateFrom).format("YYYY-MM-DD") : undefined,
      dateTo: dateTo ? dayjs(dateTo).format("YYYY-MM-DD") : undefined,
    };
    setIsCreating(true);
    try {
      let created;
      if (archivoExcel) {
        created = await conciliacionService.crearConciliacionConArchivo({
          archivoExcel,
          ...payload,
        });
      } else {
        created = await conciliacionService.crearConciliacion({
          sheetLink: sheetLink.trim(),
          ...payload,
        });
      }
      const pendingId = created?._id;
      if (!pendingId) {
        throw new Error("No se recibió ID de conciliación para seguimiento.");
      }
      setPendingConciliacionId(pendingId);
      setPendingConciliacionStatus(created?.status || "pending");
      setPendingConciliacionError(null);
      setAlert({
        open: true,
        message: "Conciliación iniciada. Te avisamos cuando termine.",
        severity: "info",
      });
      handleCloseAdd();
      await fetchConciliaciones();
    } catch (error) {
      setAlert({
        open: true,
        message: getErrorMessage(error),
        severity: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout title="Conciliación DHN">
      <Head>Conciliación DHN</Head>
      <Alerts
        alert={alert}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
      />
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" mb={1} alignItems="center">
          <Button variant="contained" color="primary" onClick={handleOpenAdd}>
            Agregar conciliación
          </Button>
          {pendingConciliacionStatus && (
            <Chip
              color={pendingConciliacionStatus === "error" ? "error" : "warning"}
              label={
                pendingConciliacionStatus === "error"
                  ? `Error en proceso: ${pendingConciliacionError || "Sin detalle"}`
                  : "Procesando conciliación..."
              }
              variant="outlined"
            />
          )}
        </Stack>

        <DataTable
          data={items}
          isLoading={isLoading}
          columns={columns}
          showSearch={false}
          showDateFilterOptions={false}
          showDatePicker={false}
          serverSide={false}
          total={items.length}
          currentPage={1}
          rowsPerPage={items.length || 50}
          sortField="periodo"
          sortDirection="desc"
          onSortChange={() => {}}
        />
      </Container>

      <Dialog open={addOpen} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar conciliación</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 0}}>
                Nombre de la hoja
              </Typography>
              <TextField
                label="Nombre de la hoja"
                fullWidth
                required
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                margin="dense"
                placeholder="Ej: Foja medición Jornales IZRC 2Q"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: 12 }}>
                Debe ser exactamente el mismo nombre que aparece en la pestaña del Excel o Google Sheet.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                Rango de fechas (opcional)
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <DatePicker
                    label="Fecha desde"
                    value={dateFrom}
                    onChange={(v) => setDateFrom(v)}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                  <DatePicker
                    label="Fecha hasta"
                    value={dateTo}
                    onChange={(v) => setDateTo(v)}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                </Stack>
              </LocalizationProvider>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                Opción 1: Link de Google Sheet
              </Typography>
              <TextField
                label="Link de Google Sheet"
                fullWidth
                value={sheetLink}
                onChange={(e) => handleSheetLinkChange(e.target.value)}
                margin="dense"
                placeholder="Pega el enlace del Google Sheet"
                disabled={Boolean(archivoExcel)}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                Opción 2: Archivo Excel
              </Typography>
              <DropZone
                label="Excel de conciliación (.xlsx, .xls, .xlsb)"
                file={archivoExcel}
                onFileChange={handleFileChange}
                accept=".xlsx,.xls,.xlsb,.xlsm"
                disabled={Boolean(sheetLink)}
              />
            </Box>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd} disabled={isCreating}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              isCreating ||
              !sheetName?.trim() ||
              (!sheetLink?.trim() && !archivoExcel)
            }
          >
            {isCreating ? "Creando..." : "Crear conciliación"}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ConciliacionPage;


