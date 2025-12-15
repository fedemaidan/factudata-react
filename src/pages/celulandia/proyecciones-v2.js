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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Block as BlockIcon } from "@mui/icons-material";
import { Label as LabelIcon } from "@mui/icons-material";
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
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
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
    setSelectedProducts([]);
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
    setSelectedProducts([]);
  }

  const handleRowsPerPageChange = (event) => {
    const next = parseInt(event.target.value, 10);
    setRowsPerPage(Number.isNaN(next) ? 50 : next);
    setPage(0);
    setSelectedProducts([]);
  }

  useEffect(() => {
    setPage(0);
    setSelectedProducts([]);
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
          maxWidth: 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
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
        label: "Cant. a comprar (100 días)",
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

          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            spacing={1}
            sx={{
              justifyContent: { xs: "flex-start", lg: "flex-end" },
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
              color="info"
              onClick={() => setIsGestionarTagsOpen(true)}
            >
              Gestionar tags
            </Button>
            <Button
              {...actionButtonProps}
              variant="outlined"
              color="secondary"
              startIcon={<LabelIcon />}
              onClick={() => setIsAgregarTagsOpen(true)}
              disabled={selectedProducts.length === 0}
            >
              Agregar tag
            </Button>
            <Button
              {...actionButtonProps}
              variant="outlined"
              color="warning"
              onClick={() => setIsEliminarTagsOpen(true)}
              disabled={selectedProducts.length === 0}
            >
              Eliminar tags
            </Button>
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
        </Stack>

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
          onSelectionChange={(selected) => setSelectedProducts(selected)}
          selectedItems={selectedProducts}
          emptyMessage="No hay productos disponibles"
          pagination={{
            total: productosPagination?.total ?? 0, 
            page,
            rowsPerPage,
            rowsPerPageOptions: [200, 500, 1000, 2000],
          }}
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
            setSelectedProducts([]);
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
            setSelectedProducts([]);
          }}
        />

        <EliminarTagsModal
          open={isEliminarTagsOpen}
          onClose={() => setIsEliminarTagsOpen(false)}
          productosSeleccionados={selectedProducts}
          onTagsDeleted={() => {
            refetchProductos();
            setSelectedProducts([]);
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