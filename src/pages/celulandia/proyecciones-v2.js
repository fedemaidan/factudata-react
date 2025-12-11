import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Stack, Button, Chip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AgregarProyeccionModal from "src/components/celulandia/AgregarProyeccionModal";
import AgregarPedidoModal from "src/components/celulandia/proyecciones/AgregarPedidoModal";
import TableSelectComponent from "src/components/TableSelectComponent";
import { useProductos } from "src/hooks/celulandia/useProductos";
import Alerts from "src/components/alerts";
import { SeAgotaChip } from "src/components/celulandia/proyecciones/productosProyecciones";

const INITIAL_SORT_OPTIONS = {
  sortField: "createdAt",
  sortDirection: "desc",
};

const ProyeccionesV2Page = () => {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddPedidoOpen, setIsAddPedidoOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState(INITIAL_SORT_OPTIONS);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "error" });
  const [selectedProducts, setSelectedProducts] = useState([]);

  const {
    data: productosResponse,
    isLoading,
    isFetching,
    error,
    invalidateProductos,
  } = useProductos(sortOptions);

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

  useEffect(() => {
    if (error) {
      setAlert({
        open: true,
        severity: "error",
        message: error?.message || "Error al cargar productos",
      });
    }
  }, [error]);

  const handleCloseAlert = () => setAlert((prev) => ({ ...prev, open: false }));

  const columns = [
    { key: "codigo", label: "Código", sortable: true },
    { key: "nombre", label: "Nombre", sortable: true, sx: { minWidth: 180 } },
    { key: "stockActual", label: "Stock actual", sortable: true },
    { key: "ventasPeriodo", label: "Ventas período", sortable: true },
    { key: "ventasProyectadas", label: "Ventas proyectadas", sortable: true },
    { key: "stockProyectado", label: "Stock proyectado", sortable: true },
    { key: "diasHastaAgotarStock", label: "Días hasta agotar", sortable: true },
    { key: "seAgota", label: "Se agota", sortable: true, render: SeAgotaChip },
  ];

  return (
    <DashboardLayout title="Proyecciones">
      <Container maxWidth="xl">
        <Alerts alert={alert} onClose={handleCloseAlert} />
        
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
          onCreated={invalidateProductos}
        />

        <AgregarPedidoModal
          open={isAddPedidoOpen}
          onClose={() => {
            setIsAddPedidoOpen(false);
            setSelectedProducts([]);
          }}
          onCreated={invalidateProductos}
          productosSeleccionados={selectedProducts}
          pedidos={[]}
          contenedores={[]}
        />
      </Container>
      </DashboardLayout>
  );
};

export default ProyeccionesV2Page;