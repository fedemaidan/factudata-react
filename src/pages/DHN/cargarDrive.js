import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Box, Chip, IconButton, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Stack, Snackbar, Alert } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";
import { formatearFechaHora } from "src/utils/handleDates";

const statusChip = (status) => {
  const map = {
    pending: { color: "#757575", label: "Pendiente" },
    processing: { color: "#ed6c02", label: "Procesando" },
    done: { color: "#2e7d32", label: "Completado" },
    ok: { color: "#2e7d32", label: "OK" },
    error: { color: "#d32f2f", label: "Error" },
  };
  const cfg = map[status] || { color: "#757575", label: status || "-" };
  return (
    <Chip
      label={cfg.label}
      size="small"
      variant="outlined"
      sx={{
        borderColor: cfg.color,
        color: cfg.color,
        fontWeight: 500,
        fontSize: "0.7rem",
        height: "24px",
        backgroundColor: "transparent",
        "& .MuiChip-label": {
          padding: "0 8px",
        },
      }}
    />
  );
};

const CargarDrive = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [urlDrive, setUrlDrive] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleSheetLink, setGoogleSheetLink] = useState("");
  const [isUpdatingSyncSheet, setIsUpdatingSyncSheet] = useState(false);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [periodDate, setPeriodDate] = useState(null); // Date | null
  const [tipo, setTipo] = useState("");

  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  useEffect(() => {
    fetchSyncs();
  }, []);

  const getId = (item) => item?.id || item?._id || item?.sync_id || null;

  const fetchSyncs = async () => {
    setIsLoading(true);
    try {
      const data = await DhnDriveService.getAllSyncs();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      return list;
    } catch (e) {
      setItems([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSyncsAndDetails = async () => {
    await fetchSyncs();
  };

  const handleSyncClick = async (options = {}) => {
    if (!urlDrive) {
      console.log('urlDrive is required');
      return;
    };
    setIsSyncing(true);
    try {
      const resp = await DhnDriveService.inspeccionarRecurso(urlDrive, options);
      if (!resp?.ok) {
        const msg = resp?.error?.message || "Error al inspeccionar recurso";
        setAlert({
          open: true,
          message: msg,
          severity: "error",
        });
        return;
      }
      await refreshSyncsAndDetails();
      setUrlDrive("");
    } catch (e) {
      console.error(e);
      setAlert({
        open: true,
        message: "Error al inspeccionar recurso",
        severity: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  const handleDriveSave = async () => {
    const periodo =
      periodDate instanceof Date && !Number.isNaN(periodDate.getTime())
        ? `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, "0")}`
        : undefined;
    const tipoValue = tipo || undefined;
    
    setDriveDialogOpen(false);
    setPeriodDate(null);
    setTipo("");
    
    await handleSyncClick({ periodo, tipo: tipoValue });
  };

  const handleRowClick = async (item) => {
    const id = getId(item);
    if (!id) return;

    const tipoParam = item?.tipo ? String(item.tipo).toLowerCase() : "";
    router.push(`/dhn/sync/${id}${tipoParam ? `?tipo=${tipoParam}` : ""}`);
  };

  const columns = useMemo(
    () => [
      {
        key: "created_at",
        label: "Fecha de creación",
        sortable: true,
        render: (item) => formatearFechaHora(item.created_at),
      },
      {
        key: "updated_at",
        label: "Fecha de actualización",
        sortable: true,
        render: (item) => formatearFechaHora(item.updated_at),
      },
      { key: "tipo", label: "Tipo", sortable: true, render: (item) => item.tipo?.toUpperCase?.() || "-" },
      {
        key: "status",
        label: "Estado",
        sortable: true,
        render: (item) => statusChip(item.status),
      },
      {
        key: "observacion",
        label: "Observación",
        sortable: false,
        render: (item) => item.observacion || "-",
        sx: { maxWidth: "320px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      },
      {
        key: "url_drive",
        label: "URL Drive",
        sortable: false,
        render: (item) => (
          <IconButton
            size="small"
            href={item.url_drive || undefined}
            target="_blank"
            rel="noreferrer"
            disabled={!item.url_drive}
            onClick={(e) => e.stopPropagation()}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  // Eliminado detalle embebido: redirect a pantalla de detalle

  const updateSyncSheet = async () => {
    if (!googleSheetLink) return;
    setIsUpdatingSyncSheet(true);
    try {
      await DhnDriveService.updateSyncSheet(googleSheetLink);
    } catch (e) {
      console.error(e);
      setAlert({
        open: true,
        message: "Error al actualizar Google Sheet",
        severity: "error",
      });
    }
    finally {
      setIsUpdatingSyncSheet(false);
    }
  };
  const handleSheetSave = async () => {
    await updateSyncSheet();
    setSheetDialogOpen(false);
    setGoogleSheetLink("");
  };
  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlert({ ...alert, open: false });
  };

  return (
    <DashboardLayout title="Cargar Drive - Historial">
      <Container maxWidth="xl">
        <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
            {alert.message}
          </Alert>
        </Snackbar>
        <Box sx={{ py: 3 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2, justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <Button
                variant="contained"
                onClick={() => setSheetDialogOpen(true)}
              >
                Actualizar Google Sheet
              </Button>
              <Button
                variant="contained"
                onClick={() => setDriveDialogOpen(true)}
                disabled={isSyncing}
              >
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
              <Button
                variant="outlined"
                onClick={refreshSyncsAndDetails}
                disabled={isLoading}
              >
                {isLoading ? "Actualizando..." : "Actualizar"}
              </Button>
            </Box>
            <Button variant="outlined" onClick={() => router.push("/dhn/sync/errores")}>Corregir errores</Button>
          </Box>

          {/* Tabla principal: pasamos onRowClick para que se active la subtabla */}
          <Box
            sx={{
              "& .MuiPaper-root": {
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                borderRadius: 2,
                overflow: "hidden",
              },
              "& .MuiTable-root": {
                "& .MuiTableCell-root": {
                  fontSize: "0.8rem",
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(224, 224, 224, 0.5)",
                },
                "& .MuiTableHead-root .MuiTableCell-root": {
                  backgroundColor: "grey.50",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  padding: "10px 16px",
                  borderBottom: "2px solid",
                  borderColor: "divider",
                },
                "& .MuiTableBody-root .MuiTableRow-root": {
                  transition: "background-color 0.2s ease",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  "&:last-child .MuiTableCell-root": {
                    borderBottom: "none",
                  },
                },
              },
            }}
          >
            <TableComponent
              data={items}
              columns={columns}
              isLoading={isLoading}
              onRowClick={handleRowClick}
            />
          </Box>

          
          <Dialog open={sheetDialogOpen} onClose={() => setSheetDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Actualizar Google Sheet</DialogTitle>
            <DialogContent>
              <TextField
                label="URL de Google Sheet"
                value={googleSheetLink}
                onChange={(e) => setGoogleSheetLink(e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                placeholder="Pega el enlace del Google Sheet"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSheetDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleSheetSave}
                disabled={!googleSheetLink || isUpdatingSyncSheet}
              >
                {isUpdatingSyncSheet ? "Actualizando..." : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>
          {/* Modal: Sincronizar URL de Drive */}
          <Dialog open={driveDialogOpen} onClose={() => setDriveDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Sincronizar desde Drive</DialogTitle>
            <DialogContent>
              <TextField
                label="URL de Drive"
                value={urlDrive}
                onChange={(e) => setUrlDrive(e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                placeholder="Pega el enlace de la carpeta/archivo de Drive"
              />
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <DatePicker
                  label="Mes y año"
                  views={["year", "month"]}
                  value={periodDate}
                  onChange={(newValue) => {
                    // Con AdapterDateFns global, newValue es Date | null
                    setPeriodDate(newValue);
                  }}
                  format="MM/yyyy"
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  margin="dense"
                  label="Tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Seleccionar tipo"
                >
                  <MenuItem value="">(Sin especificar)</MenuItem>
                  <MenuItem value="partes">Partes</MenuItem>
                  <MenuItem value="licencias">Licencias</MenuItem>
                  <MenuItem value="horas">Horas</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDriveDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleDriveSave}
                disabled={!urlDrive || isSyncing}
              >
                {isSyncing ? "Sincronizando..." : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default CargarDrive;
