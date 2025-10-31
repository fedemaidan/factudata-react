import { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Box, Chip, IconButton, TextField, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";

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
    pending: { color: "default", label: "Pendiente" },
    processing: { color: "warning", label: "Procesando" },
    done: { color: "success", label: "Completado" },
    error: { color: "error", label: "Error" },
  };
  const cfg = map[status] || { color: "default", label: status || "-" };
  return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" />;
};

const CargarDrive = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [urlDrive, setUrlDrive] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleSheetLink, setGoogleSheetLink] = useState("");
  const [isUpdatingSyncSheet, setIsUpdatingSyncSheet] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [detailsMap, setDetailsMap] = useState({}); // id -> detalles[]
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);

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

  const handleSyncClick = async () => {
    if (!urlDrive) return;
    setIsSyncing(true);
    try {
      await DhnDriveService.inspeccionarRecurso(urlDrive);
      await refreshSyncsAndDetails();
      setUrlDrive("");
    } catch (e) {
      console.error(e);
      alert("Error al inspeccionar recurso");
    } finally {
      setIsSyncing(false);
    }
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

    // Siempre solicitar al backend los children (no usar cache si el backend no devuelve children en getAllSyncs)
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
      // <- la columna "Abrir" fue eliminada: ahora la subtabla se carga al hacer click en la fila
    ],
    []
  );

  // Columnas para la subtabla (detalles) — ahora muestra status, url_storage, url_drive y observacion
  const detailsColumns = useMemo(
    () => [
      {
        key: "status",
        label: "Estado",
        render: (it) => statusChip(it?.status),
      },
      {
        key: "url_storage",
        label: "URL Storage",
        render: (it) =>
          it?.url_storage ? (
            <IconButton
              size="small"
              href={it.url_storage}
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

  return (
    <DashboardLayout title="Cargar Drive - Historial">
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Caja con textbox y botón de sincronizar */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <TextField
              label="URL de Google Sheet"
              value={googleSheetLink}
              onChange={(e) => setGoogleSheetLink(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              onClick={updateSyncSheet}
              disabled={!googleSheetLink || isUpdatingSyncSheet}
            >
              {isUpdatingSyncSheet ? "Actualizando..." : "Actualizar"}
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <TextField
              label="URL de Drive"
              value={urlDrive}
              onChange={(e) => setUrlDrive(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSyncClick}
              disabled={!urlDrive || isSyncing}
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar"}
            </Button>

            {/* Botón para actualizar la lista */}
            <Button
              variant="outlined"
              onClick={refreshSyncsAndDetails}
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
          </Box>

          {/* Tabla principal: pasamos onRowClick para que se active la subtabla */}
          <TableComponent
            data={items}
            columns={columns}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />

          {/* Subtabla con detalles del registro seleccionado (se muestra debajo) */}
          {expandedId && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 1, fontWeight: "bold" }}>
                Detalles del registro: {items.find((it) => getId(it) === expandedId)?.tipo || ""}
              </Box>

              {detailsLoadingId === expandedId ? (
                <div>Cargando detalles...</div>
              ) : (
                <TableComponent
                  data={detailsMap[expandedId] || []}
                  columns={detailsColumns}
                  isLoading={false}
                />
              )}
            </Box>
          )}
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default CargarDrive;
