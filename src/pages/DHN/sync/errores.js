import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Container, Box, Snackbar, Alert, Button, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";
import ImagenModal from "src/components/ImagenModal";
import ResolverTrabajadorModal from "src/components/dhn/ResolverTrabajadorModal";
import ResolverLicenciaManualForm from "src/components/dhn/ResolverLicenciaManualForm";
import ResolverParteManualForm from "src/components/dhn/ResolverParteManualForm";
import {
  AccionesCell,
  ArchivoCell,
  FechaDetectadaCell,
  ObservacionCell,
  StatusChip,
} from "src/components/dhn/sync/cells";

const DEFAULT_PAGE_LIMIT = 100;

const SyncErrorsPage = () => {
  const router = useRouter();
  const tipoLabel = "errores";

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "error" });
  const [pagination, setPagination] = useState({
    limit: DEFAULT_PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const { limit: paginationLimit, offset: paginationOffset } = pagination;

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [resyncingId, setResyncingId] = useState(null);
  const [resolverLicenciaModalOpen, setResolverLicenciaModalOpen] = useState(false);
  const [resolverLicenciaRow, setResolverLicenciaRow] = useState(null);
  const [resolverParteModalOpen, setResolverParteModalOpen] = useState(false);
  const [resolverParteRow, setResolverParteRow] = useState(null);

  const [resolverModalOpen, setResolverModalOpen] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [urlStorageSeleccionado, setUrlStorageSeleccionado] = useState(null);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = await DhnDriveService.getErroredSyncChildren({
        limit: paginationLimit,
        offset: paginationOffset,
      });
      setItems(Array.isArray(page?.items) ? page.items : []);
      setPagination((prev) => ({
        ...prev,
        total: page?.total ?? prev.total,
        limit: page?.limit ?? prev.limit,
        offset: page?.offset ?? prev.offset,
      }));
    } catch (error) {
      console.error("Error cargando errores de sincronización:", error);
      setItems([]);
      setAlert({
        open: true,
        severity: "error",
        message: "Error cargando errores",
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationLimit, paginationOffset, setPagination]);

  const openImageModal = (url, fileName) => {
    if (!url) return;
    setImageUrl(url);
    setImageFileName(typeof fileName === "string" ? fileName : "");
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageUrl("");
    setImageFileName("");
  };

  const handleCloseAlert = (_, reason) => {
    if (reason === "clickaway") return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const handleResolverTrabajador = (trabajador, urlStorage) => {
    setTrabajadorSeleccionado(trabajador);
    setUrlStorageSeleccionado(urlStorage);
    setResolverModalOpen(true);
  };

  const handleOpenResolverLicencia = (row) => {
    if (!row?.url_storage) return;
    setResolverLicenciaRow(row);
    setResolverLicenciaModalOpen(true);
  };

  const handleCloseResolverLicencia = () => {
    setResolverLicenciaModalOpen(false);
    setResolverLicenciaRow(null);
  };

  const handleOpenResolverParte = (row) => {
    if (!row?.url_storage) return;
    setResolverParteRow(row);
    setResolverParteModalOpen(true);
  };

  const handleCloseResolverParte = () => {
    setResolverParteModalOpen(false);
    setResolverParteRow(null);
  };

  const handleTrabajadorResuelto = async () => {
    try {
      await fetchDetails();
    } catch (error) {
      console.error("Error recargando datos de errores:", error);
    }
  };

  const handleLicenciaResuelta = async (resp) => {
    const registros = resp?.registrosCreados ?? resp?.data?.registrosCreados ?? 0;
    const baseMessage =
      resp?.message ||
      resp?.mensaje ||
      `Licencia resuelta manualmente (${registros} registro${registros === 1 ? "" : "s"})`;
    const fechas = resp?.fechasDetectadas || resp?.data?.fechasDetectadas || "";
    setAlert({
      open: true,
      severity: "success",
      message: fechas ? `${baseMessage} (${fechas})` : baseMessage,
    });
    handleCloseResolverLicencia();
    await fetchDetails();
  };

  const handleParteResuelta = async (resp) => {
    const registros = resp?.registrosCreados ?? resp?.data?.registrosCreados ?? 0;
    const baseMessage =
      resp?.message ||
      resp?.mensaje ||
      `Parte resuelto manualmente (${registros} trabajador${registros === 1 ? "" : "es"})`;
    const fechas = resp?.fechasDetectadas || resp?.data?.fechasDetectadas || "";
    setAlert({
      open: true,
      severity: "success",
      message: fechas ? `${baseMessage} (${fechas})` : baseMessage,
    });
    handleCloseResolverParte();
    await fetchDetails();
  };

  const handleResyncUrlStorage = async (row) => {
    const urlStorageId = row?._id;
    if (!urlStorageId) return;
    if (resyncingId) return;

    const payload = {};
    const rowTipo = String(row?.tipo || "").toLowerCase();
    if (["parte", "licencia", "horas"].includes(rowTipo)) {
      payload.tipo = rowTipo;
    }

    try {
      setResyncingId(urlStorageId);
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
        message: "Resincronización iniciada.",
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await fetchDetails();
    } catch (error) {
      console.error("Error resincronizando urlStorage:", error);
      setAlert({
        open: true,
        severity: "error",
        message: error?.message || "Error al resincronizar",
      });
      await fetchDetails();
    } finally {
      setResyncingId(null);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleChangePage = useCallback((direction) => {
    setPagination((prev) => {
      const pageCount = Math.max(1, Math.ceil(prev.total / prev.limit));
      const maxOffset = Math.max(0, (pageCount - 1) * prev.limit);
      const nextOffset =
        direction > 0
          ? Math.min(prev.offset + prev.limit, maxOffset)
          : Math.max(prev.offset - prev.limit, 0);
      return { ...prev, offset: nextOffset };
    });
  }, []);

  const columns = useMemo(() => {
    const cols = [
      {
        key: "status",
        label: "Estado",
        render: (it) => <StatusChip status={it?.status} />,
      },
      {
        key: "acciones",
        label: "Acciones",
        render: (it) => (
          <AccionesCell
            row={it}
            isParte={String(it?.tipo || "").toLowerCase() === "parte"}
            resyncingId={resyncingId}
            handleResyncUrlStorage={handleResyncUrlStorage}
            handleOpenResolverLicencia={handleOpenResolverLicencia}
            handleOpenResolverParte={handleOpenResolverParte}
          />
        ),
      },
    ];

    cols.push({
      key: "fechasDetectadas",
      label: "Fecha detectada",
      render: (it) => {
        const rowTipo = String(it?.tipo || "").toLowerCase();
        const rowIsParte = rowTipo === "parte";
        const rowIsLicencia = rowTipo === "licencia";
        const canEditFecha = rowIsParte || rowIsLicencia;
        return (
          <FechaDetectadaCell
            row={it}
            canEditFecha={canEditFecha}
            isParte={rowIsParte}
            isLicencia={rowIsLicencia}
            editingId={editingId}
            editingValue={editingValue}
            setEditingId={setEditingId}
            setEditingValue={setEditingValue}
            savingId={savingId}
            setSavingId={setSavingId}
            setItems={setItems}
            setAlert={setAlert}
          />
        );
      },
    });

    cols.push({
      key: "archivo",
      label: "Archivo",
      render: (it) => <ArchivoCell row={it} onOpenImage={openImageModal} />, 
    });

    cols.push({
      key: "observacion",
      label: "Observación",
      render: (it) => (
        <ObservacionCell row={it} handleResolverTrabajador={handleResolverTrabajador} />
      ),
    });

    return cols;
  }, [
    editingId,
    editingValue,
    savingId,
    resyncingId,
    handleResolverTrabajador,
    handleResyncUrlStorage,
    handleOpenResolverLicencia,
    handleOpenResolverParte,
    setItems,
    setAlert,
    openImageModal,
  ]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const hasPrevPage = pagination.offset > 0;
  const hasNextPage = pagination.offset + pagination.limit < pagination.total;
  const pageLabel =
    pagination.total > 0
      ? `Página ${currentPage} de ${totalPages} (${pagination.total} errores)`
      : "Sin registros";

  return (
    <DashboardLayout title="Errores de sincronización">
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
              onClick={() => router.back()}
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
            <Button variant="outlined" onClick={fetchDetails} disabled={isLoading}>
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
                  {tipoLabel}
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
                <TableComponent
                  data={items}
                  columns={columns}
                  isLoading={isLoading}
                  onRowClick={(row) => {
                    console.log("[DHN Errores] row click:", row);
                  }}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 2,
                    py: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleChangePage(-1)}
                      disabled={!hasPrevPage}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleChangePage(1)}
                      disabled={!hasNextPage}
                    >
                      Siguiente
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {pageLabel}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Stack>

        <ImagenModal
          open={imageModalOpen}
          onClose={closeImageModal}
          imagenUrl={imageUrl}
          fileName={imageFileName}
        />
        <ImagenModal
          open={resolverLicenciaModalOpen}
          onClose={handleCloseResolverLicencia}
          imagenUrl={resolverLicenciaRow?.url_storage}
          fileName={resolverLicenciaRow?.file_name}
          leftContent={
            resolverLicenciaRow ? (
              <ResolverLicenciaManualForm
                urlStorage={resolverLicenciaRow.url_storage}
                onResolved={handleLicenciaResuelta}
                onCancel={handleCloseResolverLicencia}
              />
            ) : null
          }
        />
        <ImagenModal
          open={resolverParteModalOpen}
          onClose={handleCloseResolverParte}
          imagenUrl={resolverParteRow?.url_storage}
          fileName={resolverParteRow?.file_name}
          leftContent={
            resolverParteRow ? (
              <ResolverParteManualForm
                urlStorage={resolverParteRow.url_storage}
                onResolved={handleParteResuelta}
                onCancel={handleCloseResolverParte}
              />
            ) : null
          }
        />

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

export default SyncErrorsPage;
