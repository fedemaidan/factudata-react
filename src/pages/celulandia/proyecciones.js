import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import {
  Container,
  Stack,
  Button,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Menu,
  MenuItem,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Block as BlockIcon } from "@mui/icons-material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useQuery } from "@tanstack/react-query";
import AgregarProyeccionModal from "src/components/celulandia/AgregarProyeccionModal";
import AgregarPedidoModal from "src/components/celulandia/proyecciones/AgregarPedidoModal";
import GestionarTagsModal from "src/components/celulandia/GestionarTagsModal";
import AgregarTagsProductosModal from "src/components/celulandia/AgregarTagsProductosModal";
import EliminarTagsModal from "src/components/celulandia/EliminarTagsModal";
import AgregarIgnorarProductosModal from "src/components/celulandia/AgregarIgnorarProductosModal";
import TableSelectComponent from "src/components/TableSelectComponent";
import { useProductos } from "src/hooks/celulandia/useProductos";
import { useLotesPendientes } from "src/hooks/celulandia/useLotesPendientes";
import PedidoArriboChip from "src/components/celulandia/proyecciones/pedidoArriboChip";
import useDebouncedValue from "src/hooks/useDebouncedValue";
import proyeccionService from "src/services/celulandia/proyeccionService";
import {
  NombreProductoCell,
  TagsProductoCell,
  StockActualProductoCell,
  DiasHastaAgotarProductoCell,
  NotasProductoCell,
} from "src/components/celulandia/proyecciones/cells";
import { formatDateDDMMYYYY } from "src/utils/handleDates";
import productoService from "src/services/celulandia/productoService";
import ProductDetailModal from "src/components/celulandia/proyecciones/productDetailModal";
const INITIAL_SORT_OPTIONS = {
  sortField: "createdAt",
  sortDirection: "desc",
};

const ROWS_PER_PAGE_OPTIONS = [100, 200];

const ProyeccionesV2Page = () => {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddPedidoOpen, setIsAddPedidoOpen] = useState(false);
  const [isGestionarTagsOpen, setIsGestionarTagsOpen] = useState(false);
  const [isAgregarTagsOpen, setIsAgregarTagsOpen] = useState(false);
  const [isEliminarTagsOpen, setIsEliminarTagsOpen] = useState(false);
  const [isIgnorarProductosOpen, setIsIgnorarProductosOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState(INITIAL_SORT_OPTIONS);
  const getProductId = useCallback((item) => item?._id ?? item?.id ?? item?.codigo, []);
  const [selectedProductsMap, setSelectedProductsMap] = useState(() => new Map());
  const selectedProducts = useMemo(
    () => Array.from(selectedProductsMap.values()),
    [selectedProductsMap]
  );
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalProduct, setDetailModalProduct] = useState(null);
  const [tagsMenuAnchorEl, setTagsMenuAnchorEl] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(200);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);
  const [selectedTagId, setSelectedTagId] = useState("");

  const [isNotaDialogOpen, setIsNotaDialogOpen] = useState(false);
  const [notaProducto, setNotaProducto] = useState(null);
  const [notaDraft, setNotaDraft] = useState("");
  const [notaError, setNotaError] = useState("");
  const [isSavingNota, setIsSavingNota] = useState(false);
  const [notaEditando, setNotaEditando] = useState(null); // { notaId, texto }
  const [isDeleteNotaDialogOpen, setIsDeleteNotaDialogOpen] = useState(false);
  const [notaParaEliminar, setNotaParaEliminar] = useState(null); // { producto, notaId, texto }
  const [isDeletingNota, setIsDeletingNota] = useState(false);

  const {
    data: productosResponse,
    isLoading,
    isFetching,
    refetch: refetchProductos,
    isExporting,
    handleExportExcel,
  } = useProductos({
    ...sortOptions,
    page,
    pageSize: rowsPerPage,
    text: debouncedBusqueda,
    tagId: selectedTagId,
  });

  const { data: tags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ["productos-tags"],
    queryFn: async () => {
      const result = await productoService.getTags();
      if (!result?.success) {
        throw new Error(result?.error || "Error al cargar los tags");
      }
      return result.data || [];
    },
    retry: false,
  });

  const {
    proximoArriboPorCodigo,
    refetch: refetchLotes,
  } = useLotesPendientes();

  const handleSortChange = useCallback((campo) => {
    setPage(0);
    setSortOptions((prev) => {
      const isSameField = prev.sortField === campo;
      return {
        ...prev,
        sortField: campo,
        sortDirection: isSameField ? (prev.sortDirection === "asc" ? "desc" : "asc") : "asc",
      };
    });
  }, []);

  const handlePageChange = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    const next = parseInt(event.target.value, 10);
    setRowsPerPage(Number.isNaN(next) ? 200 : next);
    setPage(0);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [debouncedBusqueda, selectedTagId]);

  const actionButtonProps = {
    size: "small",
    sx: { textTransform: "none", minWidth: 0, px: 1.25, py: 0.5 },
  };

  const handleOpenNotaDialog = useCallback((producto) => {
    setNotaProducto(producto ?? null);
    setNotaDraft("");
    setNotaError("");
    setNotaEditando(null);
    setIsNotaDialogOpen(true);
  }, []);

  const handleOpenDetailModal = useCallback((producto) => {
    setDetailModalProduct(producto ?? null);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalProduct(null);
    setDetailModalOpen(false);
  }, []);

  const handleOpenEditarNotaDialog = useCallback((producto, nota) => {
    setNotaProducto(producto ?? null);
    setNotaDraft(typeof nota?.nota === "string" ? nota.nota : "");
    setNotaError("");
    setNotaEditando({ notaId: nota?._id ?? null });
    setIsNotaDialogOpen(true);
  }, []);

  const handleCloseNotaDialog = useCallback(() => {
    if (isSavingNota) return;
    setIsNotaDialogOpen(false);
    setNotaProducto(null);
    setNotaDraft("");
    setNotaError("");
    setNotaEditando(null);
  }, [isSavingNota]);

  const handleSaveNota = useCallback(async () => {
    try {
      const productoId = notaProducto?._id ?? notaProducto?.id ?? null;
      const nota = String(notaDraft ?? "").trim();

      if (!productoId) {
        setNotaError("No se pudo identificar el producto.");
        return;
      }
      if (!nota) {
        setNotaError("La anotación no puede estar vacía.");
        return;
      }

      setIsSavingNota(true);
      setNotaError("");
      if (notaEditando?.notaId) {
        await productoService.updateNota({ productoId, notaId: notaEditando.notaId, nota });
      } else {
        await productoService.addNota({ productoId, nota });
      }
      setIsNotaDialogOpen(false);
      setNotaProducto(null);
      setNotaDraft("");
      setNotaEditando(null);
      await refetchProductos();
    } catch (e) {
      const message =
        typeof e?.response?.data?.error === "string"
          ? e.response.data.error
          : typeof e?.message === "string"
          ? e.message
          : "No se pudo guardar la anotación.";
      setNotaError(message);
    } finally {
      setIsSavingNota(false);
    }
  }, [notaProducto, notaDraft, notaEditando, refetchProductos]);

  const handleOpenDeleteNotaDialog = useCallback((producto, nota) => {
    setNotaParaEliminar({
      producto,
      notaId: nota?._id ?? null,
      texto: typeof nota?.nota === "string" ? nota.nota : "",
    });
    setIsDeleteNotaDialogOpen(true);
  }, []);

  const handleCloseDeleteNotaDialog = useCallback(() => {
    if (isDeletingNota) return;
    setIsDeleteNotaDialogOpen(false);
    setNotaParaEliminar(null);
  }, [isDeletingNota]);

  const handleConfirmDeleteNota = useCallback(async () => {
    try {
      const productoId = notaParaEliminar?.producto?._id ?? notaParaEliminar?.producto?.id ?? null;
      const notaId = notaParaEliminar?.notaId ?? null;
      if (!productoId || !notaId) {
        setIsDeleteNotaDialogOpen(false);
        setNotaParaEliminar(null);
        return;
      }
      setIsDeletingNota(true);
      await productoService.deleteNota({ productoId, notaId });
      setIsDeleteNotaDialogOpen(false);
      setNotaParaEliminar(null);
      await refetchProductos();
    } catch (_e) {
      // silencioso: si querés, después le agregamos snackbar
      setIsDeleteNotaDialogOpen(false);
      setNotaParaEliminar(null);
    } finally {
      setIsDeletingNota(false);
    }
  }, [notaParaEliminar, refetchProductos]);

  const columns = useMemo(
    () => [
      { key: "codigo", label: "Código", sortable: true },
      {
        key: "nombre",
        label: "Nombre",
        sortable: true,
        render: (item) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <NombreProductoCell nombre={item?.nombre} />
            <Button
              size="small"
              variant="text"
              startIcon={<VisibilityIcon fontSize="small" />}
              sx={{ minWidth: 0, textTransform: "none", px: 0.5 }}
              onClick={() => handleOpenDetailModal(item)}
              aria-label={`Ver detalle de ${item?.nombre ?? item?.codigo ?? "producto"}`}
            >
              Ver
            </Button>
          </Stack>
        ),
      },
      {
        key: "tags",
        label: "Tags",
        sortable: false,
        render: (item) => (
          <TagsProductoCell tags={item?.tags} rowId={item?._id ?? item?.codigo} />
        ),
      },
      {
        key: "anotaciones",
        label: "Anotaciones",
        sortable: false,
        render: (item) => (
          <NotasProductoCell
            notas={item?.notas}
            rowId={item?._id ?? item?.codigo}
            onAddNota={() => handleOpenNotaDialog(item)}
            onEditNota={(nota) => handleOpenEditarNotaDialog(item, nota)}
            onDeleteNota={(nota) => handleOpenDeleteNotaDialog(item, nota)}
          />
        ),
      },
      {
        key: "stockActual",
        label: "Stock actual",
        sortable: true,
        sx: { textAlign: "center", whiteSpace: "nowrap" },
        render: (item) => <StockActualProductoCell item={item} />,
      },
      { key: "ventasPeriodo", label: "Ventas período", sortable: true },
      { key: "ventasProyectadas", label: "Ventas proyectadas", sortable: true },
      {
        key: "diasHastaAgotarStock",
        label: "Días hasta agotar stock",
        sortable: false,
        sx: { textAlign: "center", whiteSpace: "nowrap" },
        render: (item) => <DiasHastaAgotarProductoCell item={item} />,
      },
      {
        key: "stockProyectado",
        label: "Stock proyectado (90 días)",
        sortable: true,
        render: (item) => {
          const total = item.stockProyectado ?? 0;
          const infoArribo = proximoArriboPorCodigo.get(item.codigo);

          return <PedidoArriboChip total={total} infoArribo={infoArribo} />;
        },
      },
      {
        key: "fechaAgotamientoStock",
        label: "Fecha agotamiento (Stock 0)",
        sortable: true,
        render: (item) => formatDateDDMMYYYY(item.fechaAgotamientoStock),
      },
      {
        key: "cantidadCompraSugerida",
        label: "Cant. a comprar (90 días)",
        sortable: true,
      },
      {
        key: "fechaCompraSugerida",
        label: "Fecha compra sugerida",
        sortable: true,
        render: (item) => formatDateDDMMYYYY(item.fechaCompraSugerida),
      },
    ],
    [proximoArriboPorCodigo, handleOpenNotaDialog, handleOpenEditarNotaDialog, handleOpenDeleteNotaDialog, handleOpenDetailModal]
  );

  const {
    data: productos = [],
    pagination: productosPagination,
  } = productosResponse ?? {};

  const [proyeccionMeta, setProyeccionMeta] = useState(null);
  const [isLoadingProyeccionMeta, setIsLoadingProyeccionMeta] = useState(false);

  const proyeccionIdsEnPagina = useMemo(() => {
    const ids = (Array.isArray(productos) ? productos : [])
      .map((p) => p?.idProyeccion)
      .filter(Boolean)
      .map((id) => String(id));
    return Array.from(new Set(ids));
  }, [productos]);

  const proyeccionMayoritaria = useMemo(() => {
    const counts = {};
    let total = 0;
    (Array.isArray(productos) ? productos : []).forEach((producto) => {
      const id = producto?.idProyeccion;
      if (!id) return;
      const key = String(id);
      counts[key] = (counts[key] || 0) + 1;
      total += 1;
    });
    if (total === 0) return null;

    let mejorId = null;
    let mejorCuenta = 0;
    Object.entries(counts).forEach(([id, cuenta]) => {
      if (!mejorId || cuenta > mejorCuenta) {
        mejorId = id;
        mejorCuenta = cuenta;
      }
    });
    if (!mejorId) return null;

    return {
      id: mejorId,
      porcentaje: Math.round((mejorCuenta / total) * 100),
      cuenta: mejorCuenta,
    };
  }, [productos]);

  useEffect(() => {
    const idAMostrar = proyeccionMayoritaria?.id;
    if (!idAMostrar) {
      setProyeccionMeta(null);
      setIsLoadingProyeccionMeta(false);
      return;
    }

    let isActive = true;
    const fetchMeta = async () => {
      try {
        setIsLoadingProyeccionMeta(true);
        const payload = await proyeccionService.getProyeccionesMetadata({ ids: [idAMostrar] });
        const first = Array.isArray(payload?.data) ? payload.data[0] : null;
        if (!isActive) return;
        setProyeccionMeta(first || null);
      } catch (_e) {
        if (!isActive) return;
        setProyeccionMeta(null);
      } finally {
        if (!isActive) return;
        setIsLoadingProyeccionMeta(false);
      }
    };
    fetchMeta();

    return () => {
      isActive = false;
    };
  }, [proyeccionMayoritaria?.id]);

  const tablePagination = useMemo(
    () => ({
      total: productosPagination?.total ?? 0,
      page,
      rowsPerPage,
      rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
    }),
    [productosPagination?.total, page, rowsPerPage]
  );

  const handleSelectionChange = useCallback(
    (selectedInPage) => {
      const selectedItems = Array.isArray(selectedInPage) ? selectedInPage : [];
      const selectedIdsInPage = new Set(selectedItems.map(getProductId).filter(Boolean));

      setSelectedProductsMap((prev) => {
        const next = new Map(prev);
        (Array.isArray(productos) ? productos : []).forEach((item) => {
          const id = getProductId(item);
          if (!id) return;
          if (selectedIdsInPage.has(id)) {
            next.set(id, item);
            return;
          }
          next.delete(id);
        });
        return next;
      });
    },
    [productos, getProductId]
  );

  return (
    <DashboardLayout title="Proyecciones">
      <Container maxWidth="xl">
        <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
            <TextField
              id="proyecciones-v2-buscar-texto"
              value={busquedaTexto}
              onChange={(event) => setBusquedaTexto(event.target.value)}
              placeholder="Buscar por código, nombre o tag…"
              size="small"
              type="search"
              variant="outlined"
              InputProps={{
                "aria-label": "Buscar productos",
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "#2b2f35" : "#f5f5f5",
                },
              }}
              sx={{
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 320 },
                maxWidth: { xs: "100%", sm: 520 },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "transparent",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0, 0, 0, 0.23)",
                },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                },
              }}
            />

            <FormControl
              size="small"
              variant="filled"
              sx={{ minWidth: { xs: "100%", sm: 260 } }}
              disabled={isLoadingTags}
            >
              <InputLabel size="small" id="proyecciones-v2-tag-filter-label">
                Tag
              </InputLabel>
              <Select
                labelId="proyecciones-v2-tag-filter-label"
                size="small"
                value={selectedTagId}
                label="Tag"
                onChange={(e) => setSelectedTagId(e.target.value)}
              >
                <MenuItem value="">
                  <em>(todos)</em>
                </MenuItem>
                {(Array.isArray(tags) ? tags : []).map((t) => (
                  <MenuItem key={t?._id} value={t?._id}>
                    {t?.nombre || "-"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="column" spacing={1} sx={{ width: "100%" }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap sx={{ justifyContent: "flex-start" }}>
              <Button
                {...actionButtonProps}
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsAddOpen(true)}
              >
                Agregar proyección
              </Button>
              <Button
                {...actionButtonProps}
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => setIsAddPedidoOpen(true)}
                disabled={selectedProducts.length === 0}
              >
                Agregar Pedido
              </Button>
            </Stack>

            <Stack
              direction="row"
              useFlexGap
              flexWrap="wrap"
              spacing={1}
              sx={{
                justifyContent: "flex-start",
                rowGap: 1,
              }}
            >
              <Button
                {...actionButtonProps}
                variant="outlined"
                color="success"
                onClick={handleExportExcel}
                disabled={isExporting}
                startIcon={
                  isExporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />
                }
              >
                {isExporting ? "Exportando..." : "Exportar a Excel"}
              </Button>
              <Button
                {...actionButtonProps}
                variant="outlined"
                color="secondary"
                onClick={() => router.push("/celulandia/proyecciones/pedidos")}
              >
                Gestionar pedidos
              </Button>
              <Button
                {...actionButtonProps}
                variant="outlined"
                color="secondary"
                startIcon={<BlockIcon />}
                onClick={() => setIsIgnorarProductosOpen(true)}
              >
                Ignorar productos
              </Button>
              <Button
                {...actionButtonProps}
                variant="outlined"
                color="secondary"
                endIcon={<ArrowDropDownIcon />}
                onClick={(event) => setTagsMenuAnchorEl(event.currentTarget)}
                disabled={selectedProducts.length === 0}
                aria-haspopup="menu"
                aria-expanded={Boolean(tagsMenuAnchorEl) ? "true" : undefined}
              >
                Tags seleccionados
              </Button>
              <Menu
                anchorEl={tagsMenuAnchorEl}
                open={Boolean(tagsMenuAnchorEl)}
                onClose={() => setTagsMenuAnchorEl(null)}
              >
                <MenuItem
                  onClick={() => {
                    setIsAgregarTagsOpen(true);
                    setTagsMenuAnchorEl(null);
                  }}
                >
                  Agregar tag
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setIsEliminarTagsOpen(true);
                    setTagsMenuAnchorEl(null);
                  }}
                >
                  Eliminar tags
                </MenuItem>
              </Menu>
            </Stack>
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {isLoadingProyeccionMeta ? (
          "Cargando datos de proyección…"
        ) : proyeccionIdsEnPagina.length === 0 ? (
          ""
        ) : proyeccionMeta ? (
          <>
            {proyeccionIdsEnPagina.length > 1 && proyeccionMayoritaria ? (
              <>
                {`Proyección mayoritaria: ${proyeccionMayoritaria.id} (${proyeccionMayoritaria.porcentaje}%)`}
                {" · "}
              </>
            ) : null}
            {`Proyección: ${formatDateDDMMYYYY(proyeccionMeta?.fechaInicio)} → ${formatDateDDMMYYYY(
              proyeccionMeta?.fechaFin
            )}`}
            {` · Fecha actual de proyección: ${formatDateDDMMYYYY(proyeccionMeta?.fechaFin)}`}
            {" · Archivos: "}
            {proyeccionMeta?.linkVentas ? (
              <Link
                href={proyeccionMeta.linkVentas}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ mr: 1 }}
              >
                Ventas
              </Link>
            ) : (
              <Typography component="span" variant="inherit" sx={{ mr: 1, color: "text.disabled" }}>
                Ventas
              </Typography>
            )}
            {proyeccionMeta?.linkQuiebre || proyeccionMeta?.linkStock ? (
              <Link
                href={proyeccionMeta?.linkQuiebre || proyeccionMeta?.linkStock}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
              >
                Stock/Quiebre
              </Link>
            ) : (
              <Typography component="span" variant="inherit" sx={{ color: "text.disabled" }}>
                Stock/Quiebre
              </Typography>
            )}
          </>
        ) : proyeccionMayoritaria ? (
          `Proyección mayoritaria: ${proyeccionMayoritaria.id}`
        ) : (
          `Esta lista incluye ${proyeccionIdsEnPagina.length} proyecciones distintas.`
        )}
        </Typography>

        {/* Contador de productos seleccionados (debajo de acciones, arriba de la tabla) */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {selectedProducts.length > 0
            ? `${selectedProducts.length} producto${selectedProducts.length !== 1 ? "s" : ""} seleccionado${
                selectedProducts.length !== 1 ? "s" : ""
              }`
            : "Ningún producto seleccionado"}
        </Typography>

        <TableSelectComponent
          data={productos}
          columns={columns}
          isLoading={isLoading || isFetching}
          sortField={sortOptions.sortField}
          sortDirection={sortOptions.sortDirection}
          onSortChange={handleSortChange}
          getRowId={getProductId}
          onSelectionChange={handleSelectionChange}
          selectedItems={selectedProducts}
          emptyMessage="No hay productos disponibles"
          pagination={tablePagination}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />

        <Dialog open={isNotaDialogOpen} onClose={handleCloseNotaDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{notaEditando?.notaId ? "Editar nota del producto" : "Agregar nota al producto"}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {notaProducto?.codigo ? `${notaProducto.codigo} · ` : ""}
              {notaProducto?.nombre ?? ""}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              value={notaDraft}
              onChange={(event) => setNotaDraft(event.target.value)}
              placeholder="Escribí una nota…"
              size="small"
              disabled={isSavingNota}
              error={Boolean(notaError)}
              helperText={notaError || " "}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseNotaDialog} disabled={isSavingNota}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveNota}
              disabled={isSavingNota || String(notaDraft ?? "").trim().length === 0}
              startIcon={isSavingNota ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {notaEditando?.notaId ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isDeleteNotaDialogOpen} onClose={handleCloseDeleteNotaDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Borrar nota</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {notaParaEliminar?.producto?.codigo ? `${notaParaEliminar.producto.codigo} · ` : ""}
              {notaParaEliminar?.producto?.nombre ?? ""}
            </Typography>
            <Typography variant="body2">
              ¿Seguro que querés borrar esta nota?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteNotaDialog} disabled={isDeletingNota}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDeleteNota}
              disabled={isDeletingNota}
              startIcon={isDeletingNota ? <CircularProgress size={16} color="inherit" /> : null}
            >
              Borrar
            </Button>
          </DialogActions>
        </Dialog>

        <AgregarProyeccionModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onCreated={() => {refetchProductos(); refetchLotes();}}
        />

        <AgregarPedidoModal
          open={isAddPedidoOpen}
          onClose={() => {
            setIsAddPedidoOpen(false);
            setSelectedProductsMap(new Map());
          }}
          onCreated={() => {refetchProductos(); refetchLotes();}}
          productosSeleccionados={selectedProducts}
          pedidos={[]}
          contenedores={[]}
        />

        <GestionarTagsModal
          open={isGestionarTagsOpen}
          onClose={() => setIsGestionarTagsOpen(false)}
          onTagsUpdated={() => {
            refetchProductos();
          }}
        />

        <AgregarTagsProductosModal
          open={isAgregarTagsOpen}
          onClose={() => setIsAgregarTagsOpen(false)}
          productosSeleccionados={selectedProducts}
          onTagsAdded={() => {
            refetchProductos();
            setSelectedProductsMap(new Map());
          }}
        />

        <EliminarTagsModal
          open={isEliminarTagsOpen}
          onClose={() => setIsEliminarTagsOpen(false)}
          productosSeleccionados={selectedProducts}
          onTagsDeleted={() => {
            refetchProductos();
            setSelectedProductsMap(new Map());
          }}
        />

        <AgregarIgnorarProductosModal
          open={isIgnorarProductosOpen}
          onClose={() => {
            setIsIgnorarProductosOpen(false);
            refetchProductos();
          }}
        />
        <ProductDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          producto={detailModalProduct}
        />
      </Container>
      </DashboardLayout>
  );
};

export default ProyeccionesV2Page;