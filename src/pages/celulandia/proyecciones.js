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
  Menu,
  MenuItem,
  Link,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Block as BlockIcon } from "@mui/icons-material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
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
} from "src/components/celulandia/proyecciones/cells";
import { formatDateDDMMYYYY } from "src/utils/handleDates";
const INITIAL_SORT_OPTIONS = {
  sortField: "createdAt",
  sortDirection: "desc",
};

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
  const [tagsMenuAnchorEl, setTagsMenuAnchorEl] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(200);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);

  const {
    data: productosResponse,
    isLoading,
    isFetching,
    refetch: refetchProductos,
    isExporting,
    handleExportExcel,
  } = useProductos({ ...sortOptions, page, pageSize: rowsPerPage, text: debouncedBusqueda });

  const {
    proximoArriboPorCodigo,
    refetch: refetchLotes,
  } = useLotesPendientes();

  const handleSortChange = useCallback((campo) => {
    setPage(0);
    setSelectedProductsMap(new Map());
    setSortOptions((prev) => {
      const isSameField = prev.sortField === campo;
      return {
        ...prev,
        sortField: campo,
        sortDirection: isSameField ? (prev.sortDirection === "asc" ? "desc" : "asc") : "asc",
      };
    });
  }, []);

  const handlePageChange = (_event, newPage) => {
    setPage(newPage);
  }

  const handleRowsPerPageChange = (event) => {
    const next = parseInt(event.target.value, 10);
    setRowsPerPage(Number.isNaN(next) ? 200 : next);
    setPage(0);
  }

  useEffect(() => {
    setPage(0);
    setSelectedProductsMap(new Map());
  }, [debouncedBusqueda]);

  const actionButtonProps = {
    size: "small",
    sx: { textTransform: "none", minWidth: 0, px: 1.25, py: 0.5 },
  };

  const columns = useMemo(
    () => [
      { key: "codigo", label: "Código", sortable: true },
      {
        key: "nombre",
        label: "Nombre",
        sortable: true,
        sx: {

        },
        render: (item) => <NombreProductoCell nombre={item?.nombre} />,
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
        label: "Fecha agotamiento",
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
    [proximoArriboPorCodigo]
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

  useEffect(() => {
    const shouldFetch = proyeccionIdsEnPagina.length === 1;
    if (!shouldFetch) {
      setProyeccionMeta(null);
      setIsLoadingProyeccionMeta(false);
      return;
    }

    let isActive = true;
    const fetchMeta = async () => {
      try {
        setIsLoadingProyeccionMeta(true);
        const payload = await proyeccionService.getProyeccionesMetadata({ ids: proyeccionIdsEnPagina });
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
  }, [proyeccionIdsEnPagina]);

  const rowsPerPageOptions = [100, 200]
  const tablePagination = useMemo(
    () => ({
      total: productosPagination?.total ?? 0,
      page,
      rowsPerPage,
      rowsPerPageOptions,
    }),
    [productosPagination?.total, page, rowsPerPage, rowsPerPageOptions]
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
          <Stack direction="row" alignItems="center" spacing={2}>
            <TextField
              id="proyecciones-v2-buscar-texto"
              value={busquedaTexto}
              onChange={(event) => setBusquedaTexto(event.target.value)}
              placeholder="Buscar por código, nombre o tag…"
              size="small"
              type="search"
              fullWidth
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
                maxWidth: { xs: "100%", sm: 420 },
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
          ) : proyeccionIdsEnPagina.length > 1 ? (
            `Esta lista incluye ${proyeccionIdsEnPagina.length} proyecciones distintas.`
          ) : (
            <>
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
              {proyeccionMeta?.linkStock ? (
                <Link
                  href={proyeccionMeta.linkStock}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ mr: 1 }}
                >
                  Stock
                </Link>
              ) : (
                <Typography component="span" variant="inherit" sx={{ mr: 1, color: "text.disabled" }}>
                  Stock
                </Typography>
              )}
              {proyeccionMeta?.linkQuiebre ? (
                <Link
                  href={proyeccionMeta.linkQuiebre}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Quiebre
                </Link>
              ) : (
                <Typography component="span" variant="inherit" sx={{ color: "text.disabled" }}>
                  Quiebre
                </Typography>
              )}
            </>
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
      </Container>
      </DashboardLayout>
  );
};

export default ProyeccionesV2Page;