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
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import { parseCuentaPendiente } from "src/utils/celulandia/cuentasPendientes/parseCuentasPendientes";
import {
  getMovimientoHistorialConfig,
  getCuentaPendienteHistorialConfig,
} from "src/utils/celulandia/historial";
import { getUser } from "src/utils/celulandia/currentUser";
import EditarEntregaModal from "src/components/celulandia/EditarEntregaModal";
import agregarSaldoCalculado from "src/utils/celulandia/agregarSaldoCalculado";
import { ascByOrderKey, descByOrderKey } from "src/utils/dateOrder";

// helpers numéricos simples
const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

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
  const [imagenModalOpen, setImagenModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");

  const [selectedData, setSelectedData] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // "movimiento" | "cuentaPendiente"
  const [historialConfig, setHistorialConfig] = useState(null);
  const [historialLoader, setHistorialLoader] = useState(null);

  const [grupoActual, setGrupoActual] = useState("ARS");
  // const [filtroFecha, setFiltroFecha] = useState("todos"); // comentado: filtro por fecha deshabilitado en esta vista
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
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const itemsDataTab = useMemo(() => {
    if (!movimientos.length) return [];

    return movimientos.map((m) => {
      const isMov = m.itemType === "movimiento";
      const fecha = isMov ? m.fecha : m.fechaCuenta;

      const monto = round2(toNumber(m.montoCC || 0)); // base en CC
      const tipoDeCambio = toNumber(m.tipoDeCambio || 1);
      const montoOriginalBase = round2(toNumber(m.montoEnviado || 0));
      const montoOriginal =
        montoOriginalBase === 0 ? round2(monto * tipoDeCambio) : montoOriginalBase;

      return {
        id: m.id || m._id,
        fecha,
        descripcion: isMov ? m.numeroFactura || m._id : m.descripcion || "-",
        cliente: m?.nombreCliente || m?.clienteNombre || m.cliente?.nombre || "-",
        group: m.cuentaCorriente || m.CC || m.cc,
        monto,
        montoCC: monto,
        tipoDeCambio,
        descuentoAplicado: m.descuentoAplicado,
        montoOriginal,
        monedaOriginal: m.moneda || m.monedaDePago,
        montoYMonedaOriginal: {
          monto: montoOriginal,
          moneda: m.moneda || m.monedaDePago || "ARS",
        },
        urlImagen: isMov ? m?.urlImagen : null,
        itemType: m.itemType,
        originalData: m,
      };
    });
  }, [movimientos]);

  const itemsOrdenados = useMemo(() => {
    if (!itemsDataTab.length) return [];
    const ordenados = [...itemsDataTab].sort(
      sortDirection === "desc" ? descByOrderKey : ascByOrderKey
    );
    return ordenados;
  }, [itemsDataTab, sortDirection]);
  

  const handleVolver = useCallback(() => router.back(), [router]);

  // const handleFiltroFechaChange = useCallback((nuevoFiltro) => {
  //   setFiltroFecha(nuevoFiltro);
  // }, []);

  const handleSortChange = useCallback((campo) => {
    if (campo !== "fecha") return;
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const handleSaveEdit = useCallback((id, updatedData) => {
    setMovimientos((prevMovimientos) =>
      prevMovimientos.map((mov) =>
        mov.id === id || mov._id === id ? { ...mov, ...updatedData } : mov
      )
    );
  }, []);

  const handleEdit = useCallback((item) => {
    setSelectedData(item.originalData);
    setSelectedItemType(item.itemType);
    if (item.itemType === "movimiento") {
      setEditarModalOpen(true);
    } else {
      setEditarEntregaModalOpen(true);
    }
  }, []);

  const handleViewHistory = useCallback(
    (item) => {
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
    },
    [cajas]
  );

  const handleDelete = useCallback((item) => {
    setSelectedData(item.originalData);
    setSelectedItemType(item.itemType);
    setConfirmarEliminacionOpen(true);
  }, []);

  const handleViewImage = useCallback((urlImagen) => {
    setImagenModal(urlImagen);
    setImagenModalOpen(true);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setImagenModalOpen(false);
    setImagenModal("");
  }, []);

  const confirmarEliminacion = useCallback(async () => {
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
  }, [selectedData, selectedItemType, fetchData]);

  if (!id) return <div>Cargando...</div>;

  return (
    <DashboardLayout title={`Cuenta Corriente - ${cliente?.nombre || id}`}>
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
              }}
            >
              Volver
            </Button>

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
                // Filtro de fecha (frontend) — comentado
                // filtroFecha={filtroFecha}
                // onFiltroFechaChange={handleFiltroFechaChange}
                // Deshabilitar búsqueda y filtro de fecha en esta vista
                showSearch={false}
                showDateFilterOptions={false}
                showSaldoColumn={true}
                // Acciones
                onEdit={handleEdit}
                onViewHistory={handleViewHistory}
                onDelete={handleDelete}
                onViewImage={handleViewImage}
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
      <ComprobanteModal
        open={imagenModalOpen}
        onClose={handleCloseImageModal}
        imagenUrl={imagenModal}
      />
    </DashboardLayout>
  );
};

export default ClienteCelulandiaCCPage;
