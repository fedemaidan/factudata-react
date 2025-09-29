import { useRouter } from "next/router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import {
  Container,
  Typography,
  Box,
  Stack,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Head from "next/head";
import DataTable from "src/components/celulandia/DataTable";
import proyeccionService from "src/services/celulandia/proyeccionService";

export default function ProyeccionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [productosProyeccion, setProductosProyeccion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [total, setTotal] = useState(0);
  const [limitePorPagina] = useState(500);
  const [sortField, setSortField] = useState("codigo");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);

  useEffect(() => {
    if (!id) return;
    fetchData(paginaActual);
  }, [id, paginaActual, sortField, sortDirection]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const proyeccionResponse = await proyeccionService.getProyeccionById(id, {
        limit: limitePorPagina,
        offset,
        sortField,
        sortDirection,
      });

      setProductosProyeccion(proyeccionResponse.data || proyeccionResponse?.data?.data || []);
      setTotal(proyeccionResponse.total || proyeccionResponse?.data?.total || 0);
      setPaginaActual(pagina);
      setSelectedKeys(new Set());
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }
    setPaginaActual(1);
  };

  const handleVolver = useCallback(() => router.back(), [router]);

  const allVisibleKeys = useMemo(
    () => new Set(productosProyeccion.map((i) => i._id)),
    [productosProyeccion]
  );
  const allSelected = useMemo(
    () =>
      productosProyeccion.length > 0 && productosProyeccion.every((i) => selectedKeys.has(i._id)),
    [productosProyeccion, selectedKeys]
  );
  const someSelected = useMemo(
    () => productosProyeccion.some((i) => selectedKeys.has(i._id)) && !allSelected,
    [productosProyeccion, selectedKeys, allSelected]
  );

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        productosProyeccion.forEach((i) => next.delete(i._id));
      } else {
        productosProyeccion.forEach((i) => next.add(i._id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDelete = async () => {
    if (!itemsToDelete || itemsToDelete.length === 0) {
      setIsConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const ids = itemsToDelete.map((p) => p._id).filter(Boolean);
      const codigos = Array.from(new Set(itemsToDelete.map((p) => p.codigo).filter(Boolean)));
      await proyeccionService.eliminarProductosYAgregarIgnorar({ ids, codigos });
      setSelectedKeys(new Set());
      setItemsToDelete([]);
      setIsConfirmOpen(false);
      await fetchData(paginaActual);
    } catch (e) {
      console.error("Error eliminando/ignorando productos:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setItemsToDelete([]);
    setIsConfirmOpen(false);
  };

  const columns = [
    {
      key: "seleccionar",
      label: (
        <Checkbox indeterminate={someSelected} checked={allSelected} onChange={toggleSelectAll} />
      ),
      sortable: false,
      render: (item) => (
        <Checkbox checked={selectedKeys.has(item._id)} onChange={() => toggleRow(item._id)} />
      ),
      onRowClick: (item) => toggleRow(item._id),
    },
    {
      key: "codigo",
      label: "Código",
      sortable: true,
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
    },
    {
      key: "cantidad",
      label: "Stock Actual",
      sortable: true,
      render: (item) => {
        const cantidad = item.cantidad;
        const color = cantidad < 0 ? "error" : cantidad < 100 ? "warning" : "success";
        return (
          <Typography
            variant="body2"
            sx={{
              color: `${color}.main`,
              fontWeight: cantidad < 0 ? "bold" : "normal",
            }}
          >
            {cantidad.toLocaleString()}
          </Typography>
        );
      },
    },
    {
      key: "ventasPeriodo",
      label: "Ventas Período",
      sortable: true,
      render: (item) => item.ventasPeriodo.toLocaleString(),
    },
    {
      key: "ventasProyectadas",
      label: "Ventas 3M",
      sortable: true,
      render: (item) => item.ventasProyectadas.toLocaleString(),
    },
    {
      key: "diasSinStock",
      label: "Días p/Agotar",
      sortable: true,
      render: (item) => {
        const dias = item.diasSinStock;
        let color = "success";
        if (dias === 0) color = "error";
        else if (dias < 30) color = "warning";

        return (
          <Typography
            variant="body2"
            sx={{
              color: `${color}.main`,
              fontWeight: dias < 30 ? "bold" : "normal",
            }}
          >
            {dias === 0 ? "Agotado" : `${dias} días`}
          </Typography>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Detalle de Proyección">
      <Head>
        <title>Detalle de Proyección</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, pb: 2 }}>
        <Container maxWidth="xl">
          <Stack
            spacing={2}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <div />
            <Button
              variant="contained"
              color="error"
              disabled={selectedKeys.size === 0 || isDeleting}
              onClick={() => {
                if (selectedKeys.size === 0) return;
                const selected = productosProyeccion.filter((p) => selectedKeys.has(p._id));
                setItemsToDelete(selected);
                setIsConfirmOpen(true);
              }}
              startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isDeleting ? "Eliminando..." : `Eliminar seleccionados (${selectedKeys.size})`}
            </Button>
          </Stack>

          <DataTable
            data={productosProyeccion}
            isLoading={isLoading}
            columns={columns}
            showSearch={false}
            showDateFilterOptions={false}
            showDatePicker={false}
            showRefreshButton={false}
            searchFields={["codigo", "descripcion"]}
            serverSide={true}
            total={total}
            currentPage={paginaActual}
            onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
            rowsPerPage={limitePorPagina}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            showBackButton={true}
            onBack={handleVolver}
          />
        </Container>
      </Box>

      <Dialog open={isConfirmOpen} onClose={isDeleting ? undefined : handleCancelDelete} fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {`¿Seguro que deseas eliminar ${itemsToDelete.length} producto(s) de la proyección?`}
          </Typography>
          {itemsToDelete.length > 0 && (
            <Box sx={{ maxHeight: 200, overflow: "auto", mt: 1 }}>
              {itemsToDelete.slice(0, 15).map((p) => (
                <Typography key={p._id} variant="caption" display="block">
                  {p.codigo ? `${p.codigo} - ` : ""}
                  {p.descripcion || "Sin descripción"}
                </Typography>
              ))}
              {itemsToDelete.length > 15 && (
                <Typography variant="caption" color="text.secondary">
                  {`… y ${itemsToDelete.length - 15} más`}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
