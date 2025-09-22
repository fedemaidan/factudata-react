import { useRouter } from "next/router";
import { useState, useEffect, useCallback } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Typography, Box, Stack, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
  const [limitePorPagina] = useState(1000);
  const [sortField, setSortField] = useState("codigo");
  const [sortDirection, setSortDirection] = useState("asc");

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

  const columns = [
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
          <Stack>
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
                mb: 2,
              }}
            >
              Volver
            </Button>

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
            />
          </Stack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}
