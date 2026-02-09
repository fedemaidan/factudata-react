import React, { useMemo, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
  Skeleton,
  TextField,
  IconButton,
  InputAdornment,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { usePedidosResumen } from "src/hooks/celulandia/usePedidosResumen";
import useDebouncedValue from "src/hooks/useDebouncedValue";
import PedidoCard from "src/components/celulandia/proyecciones/PedidoCard";
import PedidoDetalleModal from "src/components/celulandia/proyecciones/PedidoDetalleModal";

const ESTADO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ENTREGADO", label: "Entregado" },
];

const STATE_LABELS = {
  PENDIENTE: "Pendiente",
  ENTREGADO: "Entregado",
};

const PedidosPage = () => {
  const router = useRouter();
  const [sortOptions] = useState({ sortField: "createdAt", sortDirection: "desc" });
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [filtersAnchorEl, setFiltersAnchorEl] = useState(null);
  const filterMenuOpen = Boolean(filtersAnchorEl);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: resumenResponse,
    isLoading: loadingPedidos,
    isFetching: fetchingPedidos,
    invalidatePedidosResumen,
  } = usePedidosResumen({
    ...sortOptions,
    search: debouncedBusqueda.trim(),
    estado: estadoFilter,
  });

  const pedidosFiltrados = resumenResponse?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await invalidatePedidosResumen();
    } catch (error) {
      console.error("Error al actualizar pedidos:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [invalidatePedidosResumen]);

  const handleSearchChange = useCallback((event) => {
    setBusquedaTexto(event.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setBusquedaTexto("");
  }, []);

  const handleToggleFilters = useCallback((event) => {
    setFiltersAnchorEl((prev) => (prev ? null : event.currentTarget));
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFiltersAnchorEl(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    setEstadoFilter("");
  }, []);

  const filterChips = useMemo(() => {
    const chips = [];
    if (busquedaTexto.trim()) {
      chips.push({
        key: "busqueda",
        label: `Buscar: ${busquedaTexto.trim()}`,
        onDelete: handleClearSearch,
      });
    }
    if (estadoFilter) {
      chips.push({
        key: "estado",
        label: `Estado: ${STATE_LABELS[estadoFilter] || estadoFilter}`,
        onDelete: () => setEstadoFilter(""),
      });
    }
    return chips;
  }, [busquedaTexto, estadoFilter, handleClearSearch]);

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
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={handleVolver}
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{ textTransform: "none" }}
            >
              Volver
            </Button>
            <TextField
              label="Buscar"
              size="small"
              value={busquedaTexto}
              onChange={handleSearchChange}
              InputProps={{
                endAdornment: busquedaTexto.length > 0 && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ width: 220 }}
            />
            <IconButton
              aria-label="Filtros"
              size="small"
              onClick={handleToggleFilters}
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                ml: 0.5,
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
            <Tooltip title="Actualizar pedidos">
              <span>
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={isRefreshing || fetchingPedidos}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    px: 1,
                    py: 1,
                    boxShadow: 1,
                    "&:hover": { boxShadow: 2 },
                  }}
                >
                  <RefreshIcon
                    sx={{
                      animation: isRefreshing ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Popover
              open={filterMenuOpen}
              anchorEl={filtersAnchorEl}
              onClose={handleCloseFilters}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              PaperProps={{
                sx: {
                  p: 1.25,
                  minWidth: 220,
                },
              }}
            >
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle2">Filtros</Typography>
                  <IconButton size="small" onClick={handleCloseFilters}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <FormControl size="small" fullWidth variant="filled">
                  <InputLabel size="small">Estado</InputLabel>
                  <Select
                    size="small"
                    value={estadoFilter}
                    label="Estado"
                    onChange={(event) => setEstadoFilter(event.target.value)}
                  >
                    {ESTADO_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Divider />
                <Stack direction="row" spacing={0.5}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    onClick={() => {
                      handleResetFilters();
                      handleCloseFilters();
                    }}
                    sx={{ fontSize: "0.75rem" }}
                  >
                    Restablecer
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleCloseFilters}
                    sx={{ fontSize: "0.75rem" }}
                  >
                    Cerrar
                  </Button>
                </Stack>
              </Stack>
            </Popover>
          </Stack>
          {filterChips.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2 }}>
              {filterChips.map((chip) => (
                <Chip key={chip.key} label={chip.label} size="small" onDelete={chip.onDelete} />
              ))}
            </Stack>
          )}

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
          </Container>
        </Box>
      </DashboardLayout>
    </>
  );
};

PedidosPage.getLayout = (page) => page;

export default PedidosPage;
