import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Box, Container, Stack, Typography, CircularProgress, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Divider from "@mui/material/Divider";

import movimientosService from "src/services/celulandia/movimientosService";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import cajasService from "src/services/celulandia/cajasService";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import DataTabTable from "src/components/celulandia/DataTabTable";
import EditarModal from "src/components/celulandia/EditarModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import { parseCuentaPendiente } from "src/utils/celulandia/cuentasPendientes/parseCuentasPendientes";
import {
  getMovimientoHistorialConfig,
  getCuentaPendienteHistorialConfig,
} from "src/utils/celulandia/historial";
import { getUser } from "src/utils/celulandia/currentUser";
import EditarEntregaModal from "src/components/celulandia/EditarEntregaModal";

const ClienteCelulandiaCCPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [movimientos, setMovimientos] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [editarEntregaModalOpen, setEditarEntregaModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);

  const [selectedData, setSelectedData] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // "movimiento" | "cuentaPendiente"
  const [historialConfig, setHistorialConfig] = useState(null);
  const [historialLoader, setHistorialLoader] = useState(null);

  const [grupoActual, setGrupoActual] = useState("ARS");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [sortDirection, setSortDirection] = useState("desc");

  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [cajas, setCajas] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [
        clienteResponse,
        movimientosData,
        cuentasPendientesResponse,
        clientesResponse,
        tipoDeCambioResponse,
        cajasResponse,
      ] = await Promise.all([
        clientesService.getClienteById(id),
        movimientosService.getMovimientosByCliente(id),
        cuentasPendientesService.getByClienteId(id, "cliente"),
        clientesService.getAllClientes(),
        dolarService.getTipoDeCambio(),
        cajasService.getAllCajas(),
      ]);

      if (clienteResponse?.success) {
        setCliente(clienteResponse.data);
      }
      const clientesArray = Array.isArray(clientesResponse)
        ? clientesResponse
        : clientesResponse?.data || [];
      setClientes(clientesArray);

      setTipoDeCambio({
        ...tipoDeCambioResponse,
        current: tipoDeCambioResponse?.current || 1,
      });

      setCajas(cajasResponse?.data || []);

      const movimientosParseados = (movimientosData?.data || [])
        .filter((m) => m.type === "INGRESO")
        .map((m) => ({ ...parseMovimiento(m), itemType: "movimiento" }));

      const cuentasRespData = Array.isArray(cuentasPendientesResponse?.data)
        ? cuentasPendientesResponse.data
        : cuentasPendientesResponse?.data || [];
      const cuentasParseadas = (cuentasRespData || []).map((m) => ({
        ...parseCuentaPendiente(m),
        itemType: "cuentaPendiente",
      }));

      setMovimientos([...movimientosParseados, ...cuentasParseadas]);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, filtroFecha]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const itemsDataTab = useMemo(() => {
    return movimientos.map((m) => {
      const isMov = m.itemType === "movimiento";
      const fecha = isMov ? m.fecha : m.fechaCuenta;

      console.log("fecha", isMov, fecha);
      return {
        id: m.id || m._id,
        fecha,
        cliente: m?.nombreCliente || m?.clienteNombre || m.cliente?.nombre || "-",
        group: m.cuentaCorriente || m.CC || m.cc,
        monto: Math.round(m.montoCC || 0),
        tipoDeCambio: m.tipoDeCambio || 1,
        descuentoAplicado: m.descuentoAplicado,
        montoOriginal: Math.round(m.montoEnviado || 0),
        monedaOriginal: m.moneda || m.monedaDePago,
        itemType: m.itemType,
        originalData: m,
      };
    });
  }, [movimientos]);

  const itemsOrdenados = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...itemsDataTab].sort((a, b) => {
      const ta = a?.fecha ? new Date(a.fecha).getTime() : 0; // fallback si falta fecha
      const tb = b?.fecha ? new Date(b.fecha).getTime() : 0;
      return (ta - tb) * factor;
    });
  }, [itemsDataTab, sortDirection]);

  const handleVolver = () => router.back();

  const handleFiltroFechaChange = (nuevoFiltro) => {
    setFiltroFecha(nuevoFiltro);
  };

  // Solo permitimos cambiar dirección de orden por fecha
  const handleSortChange = (campo) => {
    if (campo !== "fecha") return;
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleSaveEdit = (id, updatedData) => {
    setMovimientos((prevMovimientos) =>
      prevMovimientos.map((mov) =>
        mov.id === id || mov._id === id ? { ...mov, ...updatedData } : mov
      )
    );
  };

  const handleEdit = (item) => {
    setSelectedData(item.originalData);
    setSelectedItemType(item.itemType);
    if (item.itemType === "movimiento") {
      setEditarModalOpen(true);
    } else {
      setEditarEntregaModalOpen(true);
    }
  };

  const handleViewHistory = (item) => {
    setSelectedData(item.originalData);
    setSelectedItemType(item.itemType);
    if (item.itemType === "movimiento") {
      setHistorialConfig(getMovimientoHistorialConfig(cajas));
      setHistorialLoader(movimientosService.getMovimientoLogs);
    } else {
      setHistorialConfig(getCuentaPendienteHistorialConfig());
      setHistorialLoader(cuentasPendientesService.getLogs);
    }
    setHistorialModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedData(item.originalData);
    setSelectedItemType(item.itemType);
    setConfirmarEliminacionOpen(true);
  };

  const confirmarEliminacion = async () => {
    if (!selectedData) return;

    setIsDeleting(true);
    try {
      if (selectedItemType === "movimiento") {
        await movimientosService.deleteMovimiento(selectedData._id, getUser());
      } else {
        await cuentasPendientesService.deleteCuentaPendiente(selectedData._id, getUser());
      }

      setConfirmarEliminacionOpen(false);
      setSelectedData(null);
      setSelectedItemType(null);

      await fetchData();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Error al eliminar el elemento");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!id) return <div>Cargando...</div>;

  return (
    <>
      <Head>
        <title>Cuenta Corriente - {cliente?.nombre || id}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack spacing={2}>
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
                }}
              >
                Volver
              </Button>

              <Stack spacing={1}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Cuenta Corriente
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                  Cliente: {cliente?.nombre || id}
                </Typography>
              </Stack>
            </Stack>

            <Divider />

            {isLoading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ minHeight: 200 }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <DataTabTable
                items={itemsOrdenados}
                options={[
                  { label: "ARS", value: "ARS" },
                  { label: "USD BLUE", value: "USD BLUE" },
                  { label: "USD OFICIAL", value: "USD OFICIAL" },
                ]}
                defaultOption="ARS"
                currentOption={grupoActual}
                onOptionChange={(newGroup) => setGrupoActual(newGroup)}
                showRefreshButton={true}
                onRefresh={fetchData}
                // Solo orden por fecha (frontend)
                sortField="fecha"
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                // Filtro de fecha (frontend)
                filtroFecha={filtroFecha}
                onFiltroFechaChange={handleFiltroFechaChange}
                // Acciones
                onEdit={handleEdit}
                onViewHistory={handleViewHistory}
                onDelete={handleDelete}
              />
            )}
          </Stack>
        </Container>
      </Box>

      {/* Modales */}
      <EditarModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSave={handleSaveEdit}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
        cajas={cajas}
      />
      <EditarEntregaModal
        open={editarEntregaModalOpen}
        onClose={() => setEditarEntregaModalOpen(false)}
        data={selectedData}
        onSaved={fetchData}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
      />
      <HistorialModal
        open={historialModalOpen}
        onClose={() => setHistorialModalOpen(false)}
        data={selectedData}
        loadHistorialFunction={historialLoader}
        {...(historialConfig || {})}
      />
      <ConfirmarEliminacionModal
        open={confirmarEliminacionOpen}
        onClose={() => {
          setConfirmarEliminacionOpen(false);
          setSelectedData(null);
          setSelectedItemType(null);

          fetchData();
        }}
        onConfirm={confirmarEliminacion}
        loading={isDeleting}
        title="Eliminar Elemento"
        message="¿Estás seguro que deseas eliminar este elemento?"
        itemName={
          selectedData
            ? selectedItemType === "movimiento"
              ? `Comprobante ${selectedData.numeroFactura || selectedData._id}`
              : `Entrega ${selectedData.descripcion || selectedData._id}`
            : ""
        }
      />
    </>
  );
};

ClienteCelulandiaCCPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ClienteCelulandiaCCPage;
