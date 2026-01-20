import React, { useMemo, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography, Skeleton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { usePedidosResumen } from "src/hooks/celulandia/usePedidosResumen";
import { useContenedores } from "src/hooks/celulandia/useContenedores";
import PedidoCard from "src/components/celulandia/proyecciones/PedidoCard";
import SectionHeader from "src/components/celulandia/proyecciones/SectionHeader";
import PedidoDetalleModal from "src/components/celulandia/proyecciones/PedidoDetalleModal";
import AgregarContenedorDialog from "src/components/celulandia/proyecciones/AgregarContenedorDialog";

const PedidosPage = () => {
  const router = useRouter();
  const [sortOptions] = useState({ sortField: "createdAt", sortDirection: "desc" });
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [contenedorDialogPedido, setContenedorDialogPedido] = useState(null);

  const {
    data: resumenResponse,
    isLoading: loadingPedidos,
    isFetching: fetchingPedidos,
    invalidatePedidosResumen,
  } = usePedidosResumen(sortOptions);

  const pedidos = resumenResponse?.data ?? [];

  const pedidosFiltrados = useMemo(() => pedidos, [pedidos]);

  const {
    data: contenedoresResponse,
  } = useContenedores();

  const contenedoresDisponibles = contenedoresResponse?.data ?? [];

  const handleRefresh = useCallback(() => {
    invalidatePedidosResumen();
  }, [invalidatePedidosResumen]);

  const handleVolver = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/celulandia/proyecciones");
  }, [router]);

  return (
    <>
      <Head>
        <title>Gestión de Pedidos</title>
      </Head>
      <DashboardLayout title="Gestión de Pedidos">
        <Box component="main" sx={{ flexGrow: 1, pb: 2, minHeight: "100vh", bgcolor: "grey.50" }}>
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Button startIcon={<ArrowBackIcon />} variant="text" onClick={handleVolver}>
                Volver a proyecciones
              </Button>
              <Box flex={1} />
              <Button
                startIcon={<RefreshIcon />}
                variant="outlined"
                onClick={handleRefresh}
                disabled={fetchingPedidos}
              >
                Refrescar
              </Button>
            </Stack>

            <SectionHeader title="Pedidos" />

            {loadingPedidos ? (
              <Grid container spacing={2}>
                {[1, 2, 3].map((key) => (
                  <Grid item xs={12} key={key}>
                    <Skeleton variant="rectangular" height={140} />
                  </Grid>
                ))}
              </Grid>
            ) : pedidosFiltrados.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="text.secondary">
                    No hay pedidos para mostrar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ajustá los filtros o creá un nuevo pedido desde Proyecciones.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={2}>
                {pedidosFiltrados.map((item) => (
                  <Grid item xs={12} key={item?.pedido?._id}>
                    <PedidoCard
                      pedido={item.pedido}
                      contenedores={item.contenedores}
                      productosTotales={item.productosTotales}
                      unidadesTotales={item.unidadesTotales}
                      onVerDetalle={() => setDetalleSeleccionado(item)}
                      onAgregarContenedor={() => setContenedorDialogPedido(item)}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            <PedidoDetalleModal
              open={Boolean(detalleSeleccionado)}
              onClose={() => setDetalleSeleccionado(null)}
              resumen={detalleSeleccionado}
            />
            <AgregarContenedorDialog
              open={Boolean(contenedorDialogPedido)}
              onClose={() => setContenedorDialogPedido(null)}
              contenedores={contenedoresDisponibles}
              pedidoId={contenedorDialogPedido?.pedido?._id}
              onAsociado={() => invalidatePedidosResumen()}
            />
          </Container>
        </Box>
      </DashboardLayout>
    </>
  );
};

PedidosPage.getLayout = (page) => page;

export default PedidosPage;
