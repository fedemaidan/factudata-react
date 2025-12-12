import React, { useState } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Stack, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AgregarProyeccionModal from "src/components/celulandia/AgregarProyeccionModal";
import AgregarPedidoModal from "src/components/celulandia/proyecciones/AgregarPedidoModal";
import TableSelectComponent from "src/components/TableSelectComponent";
import { useProductos } from "src/hooks/celulandia/useProductos";
import { useLotesPendientes } from "src/hooks/celulandia/useLotesPendientes";
import { SeAgotaChip } from "src/components/celulandia/proyecciones/productosProyecciones";
import PedidoArriboChip from "src/components/celulandia/proyecciones/pedidoArriboChip";
import StatusCircle from "src/components/celulandia/proyecciones/StatusCircle";
import { formatDateDDMMYYYY } from "src/utils/handleDates";

const getDiasHastaAgotar = (item) => {
  const raw = item?.diasSinStock ?? item?.diasHastaAgotarStock;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;

  const fecha = item?.fechaAgotamientoStock;
  if (!fecha) return null;
  const target = new Date(fecha);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.ceil((startOfTarget - startOfToday) / (24 * 60 * 60 * 1000));
  return diffDays;
};

// Igual que el mock: <30 rojo, <60 warning, >=60 verde
const getSemaforoDiasColor = (dias) => {
  if (dias == null) return null;
  if (dias < 30) return "error";
  if (dias < 60) return "warning";
  return "success";
};

const INITIAL_SORT_OPTIONS = {
  sortField: "createdAt",
  sortDirection: "desc",
};

const ProyeccionesV2Page = () => {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddPedidoOpen, setIsAddPedidoOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState(INITIAL_SORT_OPTIONS);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const {
    data: productosResponse,
    isLoading,
    isFetching,
    refetch: refetchProductos,
  } = useProductos(sortOptions);

  const {
    proximoArriboPorCodigo,
    refetch: refetchLotes,
  } = useLotesPendientes();

  const handleSortChange = (campo) => {
    setSortOptions((prev) => {
      const isSameField = prev.sortField === campo;
      return {
        ...prev,
        sortField: campo,
        sortDirection: isSameField ? (prev.sortDirection === "asc" ? "desc" : "asc") : "asc",
      };
    });
  };

  const columns = [
    { key: "codigo", label: "Código", sortable: true },
    { key: "nombre", label: "Nombre", sortable: true, sx: { minWidth: 180 } },
    {
      key: "stockActual",
      label: "Stock actual",
      sortable: true,
      sx: { textAlign: "center", whiteSpace: "nowrap" },
      render: (item) => {
        const v = Number(item?.stockActual ?? item?.cantidad ?? 0);
        const isCritico = Number.isFinite(v) && v <= 0;
        if (!Number.isFinite(v)) return "-";
        if (!isCritico) return v.toLocaleString();
        // igual al mock: chip rojo con el número
        return <StatusCircle value={v} color="error" />;
      },
    },
    { key: "ventasPeriodo", label: "Ventas período", sortable: true },
    { key: "ventasProyectadas", label: "Ventas proyectadas", sortable: true },
    {
      key: "diasHastaAgotarStock",
      label: "Días hasta agotar stock",
      sortable: false,
      sx: { textAlign: "center", whiteSpace: "nowrap" },
      render: (item) => {
        const dias = getDiasHastaAgotar(item);
        if (dias == null) return "-";

        const color = getSemaforoDiasColor(dias);
        // pedido: no "Agotado", mostrar 0 en el circulito
        const value = Math.max(0, Math.trunc(dias));
        return <StatusCircle value={value} color={color} />;
      },
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
    { key: "seAgota", label: "Se agota", sortable: true, render: SeAgotaChip },
  ];

  return (
    <DashboardLayout title="Proyecciones">
      <Container maxWidth="xl">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          {/* Contador de productos seleccionados */}
          <Typography variant="body2" color="text.secondary">
            {selectedProducts.length > 0 
              ? `${selectedProducts.length} producto${selectedProducts.length !== 1 ? 's' : ''} seleccionado${selectedProducts.length !== 1 ? 's' : ''}`
              : 'Ningún producto seleccionado'}
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => router.push("/celulandia/proyecciones/pedidos")}
            >
              Gestionar pedidos
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsAddOpen(true)}
            >
              Agregar proyección
            </Button>
            <Button
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

        <TableSelectComponent
          data={productosResponse?.data ?? []}
          columns={columns}
          isLoading={isLoading || isFetching}
          sortField={sortOptions.sortField}
          sortDirection={sortOptions.sortDirection}
          onSortChange={handleSortChange}
          onSelectionChange={(selected) => setSelectedProducts(selected)}
          selectedItems={selectedProducts}
          emptyMessage="No hay productos disponibles"
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
      </Container>
      </DashboardLayout>
  );
};

export default ProyeccionesV2Page;