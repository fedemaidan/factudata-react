import React, { useEffect, useMemo, useState, useCallback } from "react";
import Head from "next/head";
import { Container, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Box, Typography, IconButton, Paper, alpha, Snackbar, Alert } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ClearIcon from "@mui/icons-material/Clear";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import DataTable from "src/components/celulandia/DataTable";
import conciliacionService from "src/services/dhn/conciliacionService";
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
        "&:hover": disabled ? {} : {
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

const ConciliacionPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sheetLink, setSheetLink] = useState("");
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const fetchConciliaciones = async () => {
    setIsLoading(true);
    try {
      const lista = await conciliacionService.getConciliaciones();
      setItems(lista);
    } catch (e) {
      console.error("Error cargando conciliaciones", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConciliaciones();
  }, []);

  const handleRowClick = (item) => {
    if (!item?._id) return;
    router.push(`/dhn/conciliacion/${item._id}`);
  };

  const columns = useMemo(() => ([
    { key: "seleccionar", label: "", sortable: false, onRowClick: handleRowClick },
    { key: "periodo", label: "Periodo (YYYY-MM)", sortable: true },
    { key: "procesados", label: "Procesados", sortable: true, render: (row) => row?.stats?.procesados ?? 0 },
    { key: "okAutomatico", label: "OK Automático", sortable: true, render: (row) => row?.stats?.okAutomatico ?? 0 },
    { key: "advertencia", label: "Advertencias", sortable: true, render: (row) => row?.stats?.advertencia ?? 0 },
    { key: "created_at", label: "Creada", sortable: true, render: (row) => {
      const d = row?.created_at ? new Date(row.created_at) : null;
      return d ? d.toLocaleString() : "-";
    }},
  ]), []);

  const handleOpenAdd = () => {
    setSheetLink("");
    setArchivoExcel(null);
    setAddOpen(true);
  };

  const handleCloseAdd = () => {
    setAddOpen(false);
    setSheetLink("");
    setArchivoExcel(null);
  };

  const handleSheetLinkChange = (value) => {
    setSheetLink(value);
    if (value?.trim()) {
      setArchivoExcel(null);
    }
  };

  const handleFileChange = (file) => {
    setArchivoExcel(file);
    if (file) {
      setSheetLink("");
    }
  };

  const handleCreate = async () => {
    const tieneLink = sheetLink?.trim();
    const tieneArchivo = archivoExcel;
    
    if (!tieneLink && !tieneArchivo) return;
    
    setIsLoading(true);
    try {
      if (tieneArchivo) {
        // Enviar archivo Excel usando FormData
        await conciliacionService.crearConciliacionConArchivo(archivoExcel);
      } else {
        // Enviar link de Google Sheet (comportamiento existente)
        await conciliacionService.crearConciliacion(sheetLink.trim());
      }
      await fetchConciliaciones();
      handleCloseAdd();
    } catch (e) {
      console.error("Error creando conciliación", e);
      setAlert({
        open: true,
        message: e.response?.data?.error || "Error al crear la conciliación",
        severity: "error",
      });
      setIsLoading(false);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  return (
    <DashboardLayout title="Conciliación DHN">
      <Head>Conciliación DHN</Head>
      <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="flex-start" mb={1}>
          <Button variant="contained" color="primary" onClick={handleOpenAdd}>
            Agregar conciliación
          </Button>
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
                disabled={!!archivoExcel}
              />
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                Opción 2: Archivo Excel
              </Typography>
              <DropZone
                label="Excel de conciliación (.xlsx, .xls)"
                file={archivoExcel}
                onFileChange={handleFileChange}
                accept=".xlsx,.xls"
                disabled={!!sheetLink}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleCreate} 
            disabled={isLoading || (!sheetLink?.trim() && !archivoExcel)}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ConciliacionPage;


