import { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Box, Chip, IconButton, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Stack } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";

const formatearFechaHora = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

  const [expandedId, setExpandedId] = useState(null);
  const [detailsMap, setDetailsMap] = useState({}); // id -> detalles[]
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const openImageModal = (url) => {
    if (!url) return;
    setImageUrl(url);
    setImageModalOpen(true);
  };
  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageUrl("");
  };

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
      setDetailsMap((prev) => {
        const next = {};
        list.forEach((item) => {
          const id = getId(item);
          if (id && prev[id]) {
            next[id] = prev[id];
          }
        });
        return next;
      });
      return list;
    } catch (e) {
      setItems([]);
      setDetailsMap({});
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Nuevo: carga children para un syncId (funciona análogo a fetchSyncs)
  const fetchChildren = async (syncId) => {
    if (!syncId) return [];
    setDetailsLoadingId(syncId);
    try {
      const data = await DhnDriveService.getSyncChildren(syncId);
      const list = Array.isArray(data) ? data : [];
      setDetailsMap((prev) => ({ ...prev, [syncId]: list }));
      return list;
    } catch (err) {
      console.error("Error fetchChildren:", err);
      setDetailsMap((prev) => ({ ...prev, [syncId]: [] }));
      return [];
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const refreshSyncsAndDetails = async () => {
    const list = await fetchSyncs();
    if (!expandedId) return;
    const stillExists = list.some((item) => getId(item) === expandedId);
    if (!stillExists) {
      setExpandedId(null);
      return;
    }
    await fetchChildren(expandedId);
  };

  const handleSyncClick = async (options = {}) => {
    if (!urlDrive) {
      console.log('urlDrive is required');
      return;
    };
    setIsSyncing(true);
    try {
      await DhnDriveService.inspeccionarRecurso(urlDrive, options);
      await refreshSyncsAndDetails();
      setUrlDrive("");
    } catch (e) {
      console.error(e);
      alert("Error al inspeccionar recurso");
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
    
    // Cerrar el modal primero y limpiar campos
    setDriveDialogOpen(false);
    setPeriodDate(null);
    setTipo("");
    
    await handleSyncClick({ periodo, tipo: tipoValue });
  };

  // Modificado: al expandir siempre pedir fetchChildren(...) y poblar detalles
  const handleRowClick = async (item) => {
    const id = getId(item);
    if (!id) return;

    // si ya estaba expandido, colapsar
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    await fetchChildren(id);
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

  const detailsColumns = useMemo(
    () => [
      {
        key: "status",
        label: "Estado",
        render: (it) => statusChip(it?.status),
      },
      {
        key: "imagen",
        label: "Imagen",
        render: (it) =>
          it?.url_storage ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openImageModal(it.url_storage);
              }}
              sx={{
                padding: "4px",
                "& .MuiSvgIcon-root": {
                  fontSize: "1rem",
                },
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          ) : (
            "-"
          ),
      },
      {
        key: "url_drive",
        label: "URL Drive",
        render: (it) =>
          it?.url_drive ? (
            <IconButton
              size="small"
              href={it.url_drive}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          ) : (
            "-"
          ),
      },
      {
        key: "observacion",
        label: "Observación",
        render: (it) => it?.observacion || "-",
        sx: { maxWidth: "420px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      },
    ],
    []
  );

  const updateSyncSheet = async () => {
    if (!googleSheetLink) return;
    setIsUpdatingSyncSheet(true);
    try {
      await DhnDriveService.updateSyncSheet(googleSheetLink);
    } catch (e) {
      console.error(e);
      alert("Error al actualizar Google Sheet");
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

  return (
    <DashboardLayout title="Cargar Drive - Historial">
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Acciones principales: abrir modales y refrescar */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
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

          {/* Subtabla con detalles del registro seleccionado (se muestra debajo) */}
          {expandedId && (
            <Box
              sx={{
                mt: 3,
                mb: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderLeft: "4px solid",
                  borderColor: "primary.main",
                  backgroundColor: "transparent",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "text.primary",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                  }}
                >
                  Detalles del registro:
                </Box>
                <Box component="span" sx={{ textTransform: "uppercase" }}>
                  {items.find((it) => getId(it) === expandedId)?.tipo || ""}
                </Box>
              </Box>

              {detailsLoadingId === expandedId ? (
                <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                  Cargando detalles...
                </Box>
              ) : (
                <Box
                  sx={{
                    "& .MuiPaper-root": {
                      boxShadow: "none",
                      borderRadius: 0,
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
                    data={detailsMap[expandedId] || []}
                    columns={detailsColumns}
                    isLoading={false}
                  />
                </Box>
              )}
            </Box>
          )}
          <ComprobanteModal open={imageModalOpen} onClose={closeImageModal} imagenUrl={imageUrl} />
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
