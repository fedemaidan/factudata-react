import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Container, Box, IconButton, Snackbar, Alert, Button, Stack, TextField, Chip, Tooltip, CircularProgress } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReplayIcon from "@mui/icons-material/Replay";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import ResolverTrabajadorModal from "src/components/dhn/ResolverTrabajadorModal";
import {
  parseDDMMYYYYToISO,
  normalizeDDMMYYYYString,
  normalizeLicenciaFechasDetectadasString,
} from "src/utils/handleDates";

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
    <Box
      component="span"
      sx={{
        display: "inline-block",
        border: "1px solid",
        borderColor: cfg.color,
        color: cfg.color,
        fontWeight: 500,
        fontSize: "0.7rem",
        px: 1,
        py: "2px",
        borderRadius: 1,
      }}
    >
      {cfg.label}
    </Box>
  );
};

const parsearTrabajadoresNoIdentificados = (observacion) => {
  if (!observacion || typeof observacion !== "string") return [];
  
  const prefix = "Trabajadores no identificados: ";
  if (!observacion.startsWith(prefix)) return [];
  
  const trabajadoresStr = observacion.slice(prefix.length).trim();
  if (!trabajadoresStr) return [];
  
  const trabajadores = trabajadoresStr.split(",").map((t) => {
    const trimmed = t.trim();
    // Formato: "NOMBRE APELLIDO (DNI)"
    const match = trimmed.match(/^(.+?)\s+\((\d+)\)$/);
    if (match) {
      const nombreCompleto = match[1].trim();
      const dni = match[2].trim();
      const partes = nombreCompleto.split(/\s+/);
      if (partes.length >= 2) {
        const apellido = partes[partes.length - 1];
        const nombre = partes.slice(0, -1).join(" ");
        return { nombre, apellido, dni };
      }
      return { nombre: "", apellido: nombreCompleto, dni };
    }
    return null;
  }).filter(Boolean);
  
  return trabajadores;
};

const SyncDetailPage = () => {
  const router = useRouter();
  const { syncId, tipo: tipoQuery } = router.query || {};

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "error" });

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [resyncingId, setResyncingId] = useState(null);

  const [resolverModalOpen, setResolverModalOpen] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [urlStorageSeleccionado, setUrlStorageSeleccionado] = useState(null);

  const tipo = useMemo(() => String(tipoQuery || "").toLowerCase(), [tipoQuery]);
  const isParte = tipo === "parte";
  const isLicencia = tipo === "licencia";
  const isHoras = tipo === "horas";
  const shouldShowFecha = isParte || isLicencia;
  const canEditFecha = isParte || isLicencia;

  const handleVolver = useCallback(() => router.back(), [router]);

  const fetchDetails = useCallback(async () => {
    if (!syncId) return;
    setIsLoading(true);
    try {
      const data = await DhnDriveService.getSyncChildren(String(syncId));
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setAlert({ open: true, message: "Error cargando detalles", severity: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [syncId]);

  const handleActualizar = useCallback(async () => {
    await fetchDetails();
  }, [fetchDetails]);

  const openImageModal = (url) => {
    if (!url) return;
    setImageUrl(url);
    setImageModalOpen(true);
  };
  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageUrl("");
  };
  const handleCloseAlert = (_, reason) => {
    if (reason === "clickaway") return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const handleResolverTrabajador = useCallback((trabajador, urlStorage) => {
    setTrabajadorSeleccionado(trabajador);
    setUrlStorageSeleccionado(urlStorage);
    setResolverModalOpen(true);
  }, []);

  const handleTrabajadorResuelto = useCallback(async () => {
    // Recargar los datos para actualizar la observación
    try {
      const data = await DhnDriveService.getSyncChildren(String(syncId));
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error recargando datos:", e);
    }
  }, [syncId]);

  const handleResyncUrlStorage = useCallback(
    async (row) => {
      const urlStorageId = row?._id;
      if (!urlStorageId) return;
      if (!syncId) return;
      if (resyncingId) return;

      const payload = {};
      if (tipo && ["parte", "licencia", "horas"].includes(tipo)) {
        payload.tipo = tipo;
      }

      try {
        setResyncingId(urlStorageId);

        // Optimista: mostrar que arrancó el reprocesamiento.
        setItems((prev) =>
          prev.map((it) =>
            it?._id === urlStorageId ? { ...it, status: "processing" } : it
          )
        );

        const resp = await DhnDriveService.resyncUrlStorageById(String(urlStorageId), payload);
        if (!resp?.ok) {
          throw new Error(resp?.error?.message || "No se pudo iniciar la resincronización");
        }

        setAlert({
          open: true,
          severity: "success",
          message: "Reintento iniciado. En unos segundos se actualizará el estado.",
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const data = await DhnDriveService.getSyncChildren(String(syncId));
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error resincronizando urlStorage:", error);
        setAlert({
          open: true,
          severity: "error",
          message: error?.message || "Error al resincronizar",
        });
        // Si algo falla, recargar para dejar el estado real.
        try {
          const data = await DhnDriveService.getSyncChildren(String(syncId));
          setItems(Array.isArray(data) ? data : []);
        } catch (e) {
          // noop
        }
      } finally {
        setResyncingId(null);
      }
    },
    [resyncingId, syncId, tipo]
  );

  useEffect(() => {
    const run = async () => {
      await fetchDetails();
    };
    run();
  }, [fetchDetails]);

  const columns = useMemo(() => {
    const cols = [
      {
        key: "status",
        label: "Estado",
        render: (it) => statusChip(it?.status),
      },
    ];

    cols.push({
      key: "acciones",
      label: "Acciones",
      render: (it) => {
        const isError = it?.status === "error";
        if (!isError) return "-";

        const isResyncing = resyncingId === it?._id;
        return (
          <Tooltip title="Reintentar procesamiento" placement="top">
            <Box component="span" sx={{ display: "inline-flex" }}>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<ReplayIcon fontSize="small" />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleResyncUrlStorage(it);
                }}
                disabled={Boolean(resyncingId) || isResyncing}
                sx={{ minWidth: 120 }}
              >
                {isResyncing ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    Reintentando
                    <CircularProgress size={14} />
                  </Box>
                ) : (
                  "Reintentar"
                )}
              </Button>
            </Box>
          </Tooltip>
        );
      },
    });

    if (shouldShowFecha) {
      cols.push({
        key: "fechasDetectadas",
        label: "Fecha detectada",
        render: (it) => {
          const value = typeof it?.fechasDetectadas === "string" ? it.fechasDetectadas : "-";
          const hasValue = value && value !== "-" && value.trim().length > 0;
          const isRange = hasValue && value.includes(" - ");
          const isEditing = canEditFecha && editingId === it._id;
          if (isEditing) {
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <TextField
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  size="small"
                  variant="standard"
                  sx={{ maxWidth: isRange ? 220 : 110 }}
                  placeholder={isLicencia ? (isRange ? "DD/MM/AAAA - DD/MM/AAAA" : "DD/MM/AAAA") : "DD/MM/AAAA"}
                />
                <IconButton
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const nuevaFecha = editingValue.trim();
                    if (!nuevaFecha) return;
                    try {
                      setSavingId(it._id);

                      const patch = {};
                      if (isParte) {
                        const iso = parseDDMMYYYYToISO(nuevaFecha);
                        if (iso) {
                          patch.fecha = iso;
                          const normalized = normalizeDDMMYYYYString(nuevaFecha);
                          if (normalized) {
                            patch.fechasDetectadas = normalized;
                          }
                        }
                      } else if (isLicencia) {
                        const normalizedRange = normalizeLicenciaFechasDetectadasString(nuevaFecha);
                        if (normalizedRange) {
                          patch.fechasDetectadas = normalizedRange;
                        }
                      }

                      const resp = await TrabajoRegistradoService.updateByComprobante(
                        it.url_storage,
                        patch
                      );
                      setItems((prev) =>
                        prev.map((row) =>
                          row._id === it._id ? { ...row, fechasDetectadas: nuevaFecha } : row
                        )
                      );
                      const updatedCount =
                        resp?.modifiedCount ??
                        resp?.data?.modifiedCount ??
                        0;
                      setAlert({
                        open: true,
                        severity: "success",
                        message:
                          updatedCount > 0
                            ? `Fecha detectada actualizada en ${updatedCount} trabajo${updatedCount === 1 ? "" : "s"} diario${updatedCount === 1 ? "" : "s"}`
                            : "Fecha detectada actualizada",
                      });
                      setEditingId(null);
                      setEditingValue("");
                    } catch (error) {
                      console.error("Error actualizando fecha detectada:", error);
                      setAlert({
                        open: true,
                        severity: "error",
                        message: "Error al actualizar la fecha detectada",
                      });
                    } finally {
                      setSavingId(null);
                    }
                  }}
                  disabled={savingId === it._id}
                  sx={{ p: 0.5 }}
                >
                  ✓
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(null);
                    setEditingValue("");
                  }}
                  sx={{ p: 0.5 }}
                >
                  ✕
                </IconButton>
              </Box>
            );
          }
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box component="span">{value}</Box>
              {canEditFecha && hasValue && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(it._id);
                    setEditingValue(value);
                  }}
                  sx={{ p: 0.25 }}
                >
                  ✎
                </IconButton>
              )}
            </Box>
          );
        },
      });
    }
    if (!isHoras) {
      cols.push({
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
              sx={{ p: "4px" }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          ) : (
            "-"
          ),
      });
    }
    cols.push(
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
        render: (it) => {
          const observacion = it?.observacion || "-";
          const trabajadoresNoIdentificados = parsearTrabajadoresNoIdentificados(observacion);
          
          if (trabajadoresNoIdentificados.length > 0) {
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxWidth: "600px" }}>
                <Box component="span" sx={{ fontSize: "0.8rem", color: "text.secondary", mr: 0.5 }}>
                  Trabajadores no identificados:
                </Box>
                {trabajadoresNoIdentificados.map((trabajador, idx) => (
                 <Chip
                 key={idx}
                 label={`${trabajador.nombre} ${trabajador.apellido} (${trabajador.dni})`}
                 size="small"
                 variant="outlined"
                 color="primary"
                 onClick={(e) => {
                   e.stopPropagation();
                   handleResolverTrabajador(trabajador, it?.url_storage);
                 }}
                 sx={{
                   cursor: "pointer",
                   borderColor: "primary.main",
                   color: "primary.main",
                   transition: "all .2s ease",
                   "&:hover": {
                     backgroundColor: "rgba(25, 118, 210, 0.12)", // azul soft (no blanco)
                     color: "primary.dark",                         // texto visible
                     borderColor: "primary.dark",
                   },
                 }}
               />
               
                ))}
              </Box>
            );
          }
          
          // Si no hay trabajadores no identificados, mostrar la observación normal
          return (
            <Box
              sx={{
                maxWidth: "420px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {observacion}
            </Box>
          );
        },
      }
    );
    return cols;
  }, [shouldShowFecha, canEditFecha, editingId, editingValue, savingId, isParte, isLicencia, isHoras, handleResolverTrabajador, handleResyncUrlStorage, resyncingId]);
  return (
    <DashboardLayout title="Detalle de sincronización">
      <Container maxWidth="xl">
        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleCloseAlert}
        >
          <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
            {alert.message}
          </Alert>
        </Snackbar>

        <Stack>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={handleVolver}
              sx={{
                alignSelf: "flex-start",
                color: "text.secondary",
                "&:hover": { backgroundColor: "action.hover", color: "primary.main" },
                transition: "all 0.2s ease-in-out",
                fontWeight: 500,
              }}
            >
              Volver
            </Button>
            <Button
              variant="outlined"
              onClick={handleActualizar}
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
          </Box>

          <Box>
            <Box
              sx={{
                mt: 1,
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
                  {tipo || ""}
                </Box>
              </Box>

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
                <TableComponent data={items} columns={columns} isLoading={isLoading} />
              </Box>
            </Box>
          </Box>
        </Stack>

        <ComprobanteModal open={imageModalOpen} onClose={closeImageModal} imagenUrl={imageUrl} />
        
        <ResolverTrabajadorModal
          open={resolverModalOpen}
          onClose={() => {
            setResolverModalOpen(false);
            setTrabajadorSeleccionado(null);
            setUrlStorageSeleccionado(null);
          }}
          trabajadorDetectado={trabajadorSeleccionado}
          urlStorage={urlStorageSeleccionado}
          onResolved={handleTrabajadorResuelto}
        />
      </Container>
    </DashboardLayout>
  );
};

export default SyncDetailPage;


