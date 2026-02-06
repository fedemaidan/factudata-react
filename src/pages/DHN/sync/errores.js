import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import {
  Container,
  Box,
  Snackbar,
  Alert,
  Button,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Chip,
  Popover,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";
import ImagenModal from "src/components/ImagenModal";
import ResolverTrabajadorModal from "src/components/dhn/ResolverTrabajadorModal";
import ResolverLicenciaManualForm from "src/components/dhn/ResolverLicenciaManualForm";
import ResolverParteManualForm from "src/components/dhn/ResolverParteManualForm";
import TrabajosDetectadosList from "src/components/dhn/TrabajosDetectadosList";
import {
  AccionesCell,
  ArchivoCell,
  FechaDetectadaCell,
  ObservacionCell,
  StatusChip,
} from "src/components/dhn/sync/cells";
import ResolverDuplicadoModal from "src/components/dhn/sync/ResolverDuplicadoModal";
import { formatDateToDDMMYYYY } from "src/utils/handleDates";
import useCorreccionAsistida from "src/hooks/dhn/useCorreccionAsistida";

const DEFAULT_PAGE_LIMIT = 50;

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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVersion, setSearchVersion] = useState(0);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageModalRow, setImageModalRow] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [resyncingId, setResyncingId] = useState(null);
  const [resolverLicenciaModalOpen, setResolverLicenciaModalOpen] = useState(false);
  const [resolverLicenciaRow, setResolverLicenciaRow] = useState(null);
  const [resolverParteModalOpen, setResolverParteModalOpen] = useState(false);
  const [resolverParteRow, setResolverParteRow] = useState(null);

  const [resolverDuplicadoRow, setResolverDuplicadoRow] = useState(null);
  const [resolverDuplicadoLoading, setResolverDuplicadoLoading] = useState(false);
  const [resolverDuplicadoAction, setResolverDuplicadoAction] = useState(null);
  const [resolverDuplicadoExistingDrive, setResolverDuplicadoExistingDrive] = useState(null);

  const [resolverModalOpen, setResolverModalOpen] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [urlStorageSeleccionado, setUrlStorageSeleccionado] = useState(null);
  const [resolverTrabajadorRow, setResolverTrabajadorRow] = useState(null);

  // Estados para filtros
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [correccionItems, setCorreccionItems] = useState([]);
  const [isCargandoCorreccion, setIsCargandoCorreccion] = useState(false);
  const correccionSourceItems = correccionItems.length ? correccionItems : items;
  const {
    activa: correccionActiva,
    textoProgreso,
    iniciar: iniciarCorreccion,
    avanzar: avanzarCorreccion,
    detener: detenerCorreccion,
    determinarTipoModal,
  } = useCorreccionAsistida(correccionSourceItems);
  const totalDisponibles = pagination.total;

  const fetchDetails = useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const page = await DhnDriveService.getErroredSyncChildren({
          limit: paginationLimit,
          offset: paginationOffset,
          createdAtFrom: fechaDesde ? fechaDesde.toISOString() : undefined,
          createdAtTo: fechaHasta ? fechaHasta.toISOString() : undefined,
          tipo: tipoFiltro || undefined,
          status: estadoFiltro || undefined,
          search: searchQuery || undefined,
          sortField,
          sortDirection,
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
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [
      paginationLimit,
      paginationOffset,
      fechaDesde,
      fechaHasta,
      tipoFiltro,
      estadoFiltro,
      searchQuery,
      sortField,
      sortDirection,
    ]
  );

  const buildErroredQuery = useCallback(() => {
    const payload = {};
    if (fechaDesde) payload.createdAtFrom = fechaDesde.toISOString();
    if (fechaHasta) payload.createdAtTo = fechaHasta.toISOString();
    if (tipoFiltro) payload.tipo = tipoFiltro;
    if (estadoFiltro) payload.status = estadoFiltro;
    if (searchQuery) payload.search = searchQuery;
    if (sortField) payload.sortField = sortField;
    if (sortDirection) payload.sortDirection = sortDirection;
    return payload;
  }, [fechaDesde, fechaHasta, tipoFiltro, estadoFiltro, searchQuery, sortField, sortDirection]);

  const fetchAllErroredItems = useCallback(async () => {
    const payloadBase = buildErroredQuery();
    const limit = paginationLimit ?? DEFAULT_PAGE_LIMIT;
    const allItems = [];
    let offset = 0;
    while (true) {
      const page = await DhnDriveService.getErroredSyncChildren({
        ...payloadBase,
        limit,
        offset,
      });
      const pageItems = Array.isArray(page?.items) ? page.items : [];
      allItems.push(...pageItems);
      if (
        !pageItems.length ||
        pageItems.length < limit ||
        (Number.isFinite(page?.total) && allItems.length >= page.total)
      ) {
        break;
      }
      offset += limit;
    }
    return allItems;
  }, [buildErroredQuery, paginationLimit]);

  const openImageModal = (url, fileName, row) => {
    if (!url) return;
    setImageUrl(url);
    setImageFileName(typeof fileName === "string" ? fileName : "");
    setImageModalRow(row || null);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageUrl("");
    setImageFileName("");
    setImageModalRow(null);
  };
  const imageModalTipo = String(imageModalRow?.tipo || "").toLowerCase();
  const isImageModalParte = imageModalTipo === "parte";

  const handleCloseAlert = (_, reason) => {
    if (reason === "clickaway") return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const isSearchTriggeredByInputRef = useRef(false);

  const handleSearchTermChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const applySearch = useCallback(
    (term) => {
      isSearchTriggeredByInputRef.current = true;
      setPagination((prev) => ({ ...prev, offset: 0 }));
      const trimmed = String(term || "").trim();
      setSearchQuery(trimmed);
      setSearchVersion((prev) => prev + 1);
    },
    [setPagination]
  );

  useEffect(() => {
    const showLoading = !isSearchTriggeredByInputRef.current;
    fetchDetails({ showLoading });
    isSearchTriggeredByInputRef.current = false;
  }, [fetchDetails, searchVersion]);

  const handleSearchSubmit = useCallback(
    (event) => {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      applySearch(searchTerm);
    },
    [applySearch, searchTerm]
  );
  const searchInputRef = useRef(null);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState(null);
  const filtersOpen = Boolean(filtersAnchorEl);
  const handleOpenFilters = useCallback(() => {
    if (searchInputRef.current) {
      setFiltersAnchorEl(searchInputRef.current);
    }
  }, []);
  const handleCloseFilters = useCallback(() => {
    setFiltersAnchorEl(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFechaDesde(null);
    setFechaHasta(null);
    setTipoFiltro("");
    setEstadoFiltro("");
    setSearchTerm("");
    applySearch("");
    handleCloseFilters();
  }, [applySearch, handleCloseFilters]);

  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchQuery) {
      filters.push({ key: "search", label: `Buscar: ${searchQuery}` });
    }
    if (fechaDesde) {
      filters.push({
        key: "desde",
        label: `Desde: ${formatDateToDDMMYYYY(fechaDesde)}`,
      });
    }
    if (fechaHasta) {
      filters.push({
        key: "hasta",
        label: `Hasta: ${formatDateToDDMMYYYY(fechaHasta)}`,
      });
    }
    if (tipoFiltro) {
      filters.push({
        key: "tipo",
        label: `Tipo: ${tipoFiltro.charAt(0).toUpperCase()}${tipoFiltro.slice(1)}`,
      });
    }
    if (estadoFiltro) {
      filters.push({
        key: "estado",
        label: `Estado: ${estadoFiltro.charAt(0).toUpperCase()}${estadoFiltro.slice(1)}`,
      });
    }
    return filters;
  }, [searchQuery, fechaDesde, fechaHasta, tipoFiltro, estadoFiltro]);

  const handleSortChange = useCallback(
    (field) => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      setSortDirection((prevDirection) =>
        sortField === field ? (prevDirection === "asc" ? "desc" : "asc") : "desc"
      );
      setSortField(field);
    },
    [sortField]
  );

  const handleResolverTrabajador = (trabajador, urlStorage, row) => {
    setTrabajadorSeleccionado(trabajador);
    setUrlStorageSeleccionado(urlStorage);
    setResolverTrabajadorRow(row || null);
    setResolverModalOpen(true);
  };

  const handleCloseResolverTrabajador = () => {
    setResolverModalOpen(false);
    setTrabajadorSeleccionado(null);
    setUrlStorageSeleccionado(null);
    setResolverTrabajadorRow(null);
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
    if (row?.status === "incompleto") {
      openImageModal(row.url_storage, row.file_name, row);
      return;
    }
    setResolverParteRow(row);
    setResolverParteModalOpen(true);
  };

  const handleCloseResolverParte = () => {
    setResolverParteModalOpen(false);
    setResolverParteRow(null);
  };

  const handleTrabajadorResuelto = async () => {
    handleCloseResolverTrabajador();
    try {
      await fetchDetails();
    } catch (error) {
      console.error("Error recargando datos de errores:", error);
    }
    if (correccionActiva) {
      const nextRow = avanzarCorreccion();
      if (!nextRow) {
        setCorreccionItems([]);
        return;
      }
      openCorreccionModal(nextRow);
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
    if (correccionActiva) {
      const nextRow = avanzarCorreccion();
      if (!nextRow) {
        setCorreccionItems([]);
        return;
      }
      openCorreccionModal(nextRow);
    }
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
    if (correccionActiva) {
      const nextRow = avanzarCorreccion();
      if (!nextRow) {
        setCorreccionItems([]);
        return;
      }
      openCorreccionModal(nextRow);
    }
  };

  const handleOpenResolverDuplicado = (row) => {
    if (!row) return;
    setResolverDuplicadoRow(row);
  };

  const handleCloseResolverDuplicado = () => {
    setResolverDuplicadoRow(null);
    setResolverDuplicadoAction(null);
  };

  const openCorreccionModal = useCallback(
    (row) => {
      if (!row) return;
      const tipoModal = determinarTipoModal(row);
      if (!tipoModal) return;
      if (tipoModal === "duplicado") {
        handleOpenResolverDuplicado(row);
        return;
      }
      if (tipoModal === "licencia") {
        handleOpenResolverLicencia(row);
        return;
      }
      if (tipoModal === "parte_incompleto" || tipoModal === "parte_error") {
        handleOpenResolverParte(row);
      }
    },
    [determinarTipoModal, handleOpenResolverDuplicado, handleOpenResolverLicencia, handleOpenResolverParte]
  );

  const handleResolverDuplicado = async (action) => {
    if (!resolverDuplicadoRow) return;
    setResolverDuplicadoLoading(true);
    setResolverDuplicadoAction(action);
    try {
      const resp = await DhnDriveService.resolveDuplicate(resolverDuplicadoRow._id, action);
      if (!resp?.ok) {
        throw new Error(resp?.error?.message || "No se pudo resolver el duplicado");
      }
      const successMessage =
        action === "keepExisting"
          ? "Se conservó el registro original"
          : "Se actualizó el trabajo con el nuevo comprobante";
      setAlert({
        open: true,
        severity: "success",
        message: successMessage,
      });
      handleCloseResolverDuplicado();
      await fetchDetails();
      if (correccionActiva) {
        const nextRow = avanzarCorreccion();
        if (!nextRow) {
          setCorreccionItems([]);
          return;
        }
        openCorreccionModal(nextRow);
      }
    } catch (error) {
      console.error("Error resolviendo duplicado:", error);
      setAlert({
        open: true,
        severity: "error",
        message: error?.message || "Error al resolver el duplicado",
      });
    } finally {
      setResolverDuplicadoLoading(false);
      setResolverDuplicadoAction(null);
    }
  };

  const handleCloseCorreccionOnCancel = useCallback(() => {
    if (correccionActiva) {
      detenerCorreccion();
    }
    setCorreccionItems([]);
    setIsCargandoCorreccion(false);
  }, [correccionActiva, detenerCorreccion]);

  const handleCloseImageModalFromModal = useCallback(() => {
    handleCloseCorreccionOnCancel();
    closeImageModal();
  }, [handleCloseCorreccionOnCancel, closeImageModal]);

  const handleCloseResolverLicenciaFromModal = useCallback(() => {
    handleCloseCorreccionOnCancel();
    handleCloseResolverLicencia();
  }, [handleCloseCorreccionOnCancel, handleCloseResolverLicencia]);

  const handleCloseResolverLicenciaAuto = useCallback(() => {
    handleCloseResolverLicencia();
  }, [handleCloseResolverLicencia]);

  const handleCloseResolverParteFromModal = useCallback(() => {
    handleCloseCorreccionOnCancel();
    handleCloseResolverParte();
  }, [handleCloseCorreccionOnCancel, handleCloseResolverParte]);

  const handleCloseResolverParteAuto = useCallback(() => {
    handleCloseResolverParte();
  }, [handleCloseResolverParte]);

  const handleCloseResolverDuplicadoFromModal = useCallback(() => {
    handleCloseCorreccionOnCancel();
    handleCloseResolverDuplicado();
  }, [handleCloseCorreccionOnCancel, handleCloseResolverDuplicado]);

  const handleIniciarCorreccion = useCallback(async () => {
    if (isCargandoCorreccion) return;
    setIsCargandoCorreccion(true);
    try {
      const allItems = await fetchAllErroredItems();
      if (!allItems.length) {
        setAlert({
          open: true,
          severity: "info",
          message: "No hay errores pendientes para corrección asistida",
        });
        return;
      }
      setCorreccionItems(allItems);
      const firstRow = iniciarCorreccion(allItems);
      if (firstRow) {
        openCorreccionModal(firstRow);
      }
    } catch (error) {
      console.error("Error cargando corrección asistida:", error);
      setAlert({
        open: true,
        severity: "error",
        message: error?.message || "No se pudo iniciar la corrección asistida",
      });
    } finally {
      setIsCargandoCorreccion(false);
    }
  }, [fetchAllErroredItems, iniciarCorreccion, openCorreccionModal, isCargandoCorreccion]);

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
  }, [fetchDetails, searchVersion]);

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
        key: "created_at",
        label: "Fecha sincronización",
        sortable: true,
        render: (it) => formatDateToDDMMYYYY(it?.created_at),
      },
      {
        key: "status",
        label: "Estado",
        sortable: true,
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
            handleOpenResolverDuplicado={handleOpenResolverDuplicado}
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
      key: "file_name",
      label: "Archivo",
      sortable: true,
      render: (it) => <ArchivoCell row={it} onOpenImage={openImageModal} />,
    });

    cols.push({
      key: "observacion",
      label: "Observación",
      sortable: true,
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
    handleOpenResolverDuplicado,
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
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2, mb: 1, alignItems: "center", flexWrap: "wrap" }}
          >
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: "flex", gap: 1 }}>
              <TextField
                inputRef={searchInputRef}
                label="Buscar"
                placeholder="Archivo, carpeta, fecha, observación o estado"
                size="small"
                variant="outlined"
                value={searchTerm}
                onChange={(event) => handleSearchTermChange(event.target.value)}
                sx={{ width: 260 }}
                inputProps={{ "aria-label": "Buscar errores", type: "search" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <IconButton
              aria-label="Filtros"
              size="small"
              onClick={handleOpenFilters}
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: filtersOpen ? "primary.main" : "divider",
                color: filtersOpen ? "primary.main" : "text.primary",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button variant="outlined" size="small" onClick={fetchDetails} disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleIniciarCorreccion}
              disabled={isLoading || isCargandoCorreccion || totalDisponibles === 0}
            >
              {isCargandoCorreccion ? "Cargando..." : "Corrección asistida"}
            </Button>
          </Box>
          </Stack>

          <Popover
            open={filtersOpen}
            onClose={handleCloseFilters}
            anchorEl={filtersAnchorEl}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            PaperProps={{
              sx: {
                p: 1.5,
                minWidth: 300,
                maxWidth: 360,
              },
            }}
          >
            <Stack spacing={1.25}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  Más filtros
                </Typography>
                <IconButton size="small" onClick={handleCloseFilters} sx={{ p: 0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <DatePicker
                label="Desde"
                value={fechaDesde}
                onChange={setFechaDesde}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <DatePicker
                label="Hasta"
                value={fechaHasta}
                onChange={setFechaHasta}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <TextField
                select
                label="Tipo"
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="parte">Parte</MenuItem>
                <MenuItem value="licencia">Licencia</MenuItem>
                <MenuItem value="horas">Horas</MenuItem>
              </TextField>
              <TextField
                select
                label="Estado"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ok">Ok</MenuItem>
                <MenuItem value="incompleto">Incompleto</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="duplicado">Duplicado</MenuItem>
              </TextField>
              <Divider />
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" fullWidth onClick={handleClearFilters}>
                  Limpiar
                </Button>
                <Button size="small" variant="contained" fullWidth onClick={handleCloseFilters}>
                  Cerrar
                </Button>
              </Stack>
            </Stack>
          </Popover>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <Chip key={filter.key} label={filter.label} size="small" variant="outlined" />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin filtros activos
              </Typography>
            )}
          </Stack>

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
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
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
          onClose={handleCloseImageModalFromModal}
          imagenUrl={imageUrl}
          fileName={imageFileName}
          leftContent={
            isImageModalParte && imageModalRow?.url_storage ? (
              <TrabajosDetectadosList
                urlStorage={imageModalRow.url_storage}
                onUpdated={handleTrabajadorResuelto}
                progreso={correccionActiva ? textoProgreso : null}
              />
            ) : null
          }
        />
        <ImagenModal
          open={resolverLicenciaModalOpen}
          onClose={handleCloseResolverLicenciaFromModal}
          imagenUrl={resolverLicenciaRow?.url_storage}
          fileName={resolverLicenciaRow?.file_name}
          leftContent={
            resolverLicenciaRow ? (
              <ResolverLicenciaManualForm
                urlStorage={resolverLicenciaRow.url_storage}
                onResolved={handleLicenciaResuelta}
                onCancel={handleCloseResolverLicenciaFromModal}
                onAutoClose={handleCloseResolverLicenciaAuto}
                progreso={correccionActiva ? textoProgreso : null}
              />
            ) : null
          }
        />
        <ImagenModal
          open={resolverParteModalOpen}
          onClose={handleCloseResolverParteFromModal}
          imagenUrl={resolverParteRow?.url_storage}
          fileName={resolverParteRow?.file_name}
          leftContent={
            resolverParteRow ? (
              <ResolverParteManualForm
                urlStorage={resolverParteRow.url_storage}
                onResolved={handleParteResuelta}
                onCancel={handleCloseResolverParteFromModal}
                onAutoClose={handleCloseResolverParteAuto}
                progreso={correccionActiva ? textoProgreso : null}
              />
            ) : null
          }
        />
        <ResolverDuplicadoModal
          open={Boolean(resolverDuplicadoRow)}
          onClose={handleCloseResolverDuplicadoFromModal}
          row={resolverDuplicadoRow}
          onResolve={handleResolverDuplicado}
          loading={resolverDuplicadoLoading}
          actionInProgress={resolverDuplicadoAction}
          progreso={correccionActiva ? textoProgreso : null}
        />

        <ResolverTrabajadorModal
          open={resolverModalOpen}
          onClose={handleCloseResolverTrabajador}
          trabajadorDetectado={trabajadorSeleccionado}
          urlStorage={urlStorageSeleccionado}
          onResolved={handleTrabajadorResuelto}
        />
      </Container>
    </DashboardLayout>
  );
};

export default SyncErrorsPage;
