import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Box, Container, Stack, Typography, CircularProgress, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

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
import {
  getMovimientoHistorialConfig,
  getCuentaPendienteHistorialConfig,
} from "src/utils/celulandia/historial";
import { parseCuentaPendiente } from "src/utils/celulandia/cuentasPendientes/parseCuentasPendientes";
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
  const [imagenModalOpen, setImagenModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");

  const [selectedData, setSelectedData] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // "movimiento" | "cuentaPendiente"
  const [historialConfig, setHistorialConfig] = useState(null);
  const [historialLoader, setHistorialLoader] = useState(null);

  const [grupoActual, setGrupoActual] = useState("ARS");
  const initialGroupSetRef = useRef(false);
  // const [filtroFecha, setFiltroFecha] = useState("todos"); // comentado: filtro por fecha deshabilitado en esta vista
  const [sortField, setSortField] = useState("fechaEntrega");
  const [sortDirection, setSortDirection] = useState("desc");
  const [totalesCC, setTotalesCC] = useState({
    ARS: 0,
    "USD BLUE": 0,
    "USD OFICIAL": 0,
  });

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
        cuentaCorrienteResponse,
        clientesResponse,
        tipoDeCambioResponse,
        cajasResponse,
      ] = await Promise.all([
        clientesService.getClienteById(id),
        clientesService.getClienteCCComputed(id, { sortDirection: "desc" }),
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
      setMovimientos(Array.isArray(cuentaCorrienteResponse?.data) ? cuentaCorrienteResponse.data : []);
      setTotalesCC(
        cuentaCorrienteResponse?.totalsCC || {
          ARS: 0,
          "USD BLUE": 0,
          "USD OFICIAL": 0,
        }
      );
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
    return Array.isArray(movimientos) ? movimientos : [];
  }, [movimientos]);

  const itemsOrdenados = useMemo(() => {
    if (!itemsDataTab.length) return [];
    const toTime = (v) => {
      if (!v) return 0;
      const d = new Date(v);
      return isNaN(d.getTime()) ? new Date().getTime() : d.getTime();
    };
    const key = sortField || "fechaEntrega";
    const ordenados = [...itemsDataTab].sort((a, b) => {
      const av = toTime(a[key] || a.fecha);
      const bv = toTime(b[key] || b.fecha);
      return sortDirection === "asc" ? av - bv : bv - av;
    });
    return ordenados;
  }, [itemsDataTab, sortField, sortDirection]);

  // Setear grupo inicial según primer total != 0 en orden preferido
  useEffect(() => {
    if (initialGroupSetRef.current) return;
    if (!itemsOrdenados.length) return;

    const preferredOrder = ["ARS", "USD BLUE", "USD OFICIAL"];
    const firstNonZero = preferredOrder.find((g) => (Number(totalesCC?.[g] || 0) !== 0));
    if (firstNonZero && firstNonZero !== grupoActual) {
      setGrupoActual(firstNonZero);
    }
    initialGroupSetRef.current = true;
  }, [itemsOrdenados, grupoActual, totalesCC]);

  const handleVolver = useCallback(() => router.back(), [router]);

  // const handleFiltroFechaChange = useCallback((nuevoFiltro) => {
  //   setFiltroFecha(nuevoFiltro);
  // }, []);

  const handleSortChange = useCallback((campo) => {
    const actualCampo = campo === "fecha" ? "fechaEntrega" : campo; // compat
    if (sortField === actualCampo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(actualCampo);
      setSortDirection("asc");
    }
  }, [sortField]);

  const normalizarCuentaPendienteParaEditar = useCallback(
    (item) => {
      if (!item || item.itemType !== "cuentaPendiente") return item?.originalData;

      const originalData = item.originalData || {};
      const parsedData = parseCuentaPendiente(originalData);
      const clienteActual = originalData?.cliente;
      const dataBase = {
        ...originalData,
        ...parsedData,
        CC: parsedData?.CC || originalData?.CC || originalData?.cc || "ARS",
        moneda:
          originalData?.moneda || parsedData?.monedaDePago || originalData?.monedaDePago || "ARS",
        monedaDePago:
          parsedData?.monedaDePago || originalData?.monedaDePago || originalData?.moneda || "ARS",
      };

      if (clienteActual && typeof clienteActual === "object") {
        return {
          ...dataBase,
        };
      }

      const clienteId = typeof clienteActual === "string" ? clienteActual : null;
      const clienteEncontrado = clienteId
        ? (Array.isArray(clientes) ? clientes : []).find((c) => c?._id === clienteId)
        : null;

      if (!clienteEncontrado) {
        return {
          ...dataBase,
        };
      }

      return {
        ...dataBase,
        cliente: clienteEncontrado,
        clienteNombre: clienteEncontrado.nombre || originalData.clienteNombre,
        proveedorOCliente:
          originalData.proveedorOCliente || clienteEncontrado.nombre || originalData.proveedorOCliente,
      };
    },
    [clientes]
  );

  const handleEdit = useCallback((item) => {
    const dataParaEditar =
      item?.itemType === "cuentaPendiente"
        ? normalizarCuentaPendienteParaEditar(item)
        : item?.originalData;

    setSelectedData(dataParaEditar);
    setSelectedItemType(item.itemType);
    if (item.itemType === "movimiento") {
      setEditarModalOpen(true);
    } else {
      setEditarEntregaModalOpen(true);
    }
  }, [normalizarCuentaPendienteParaEditar]);

  const handleViewHistory = useCallback(
    (item) => {
      setSelectedData(item.originalData);
      setSelectedItemType(item.itemType);
      if (item.itemType === "movimiento") {
        setHistorialConfig(getMovimientoHistorialConfig(cajas));
        setHistorialLoader(movimientosService.getMovimientoLogs);
      } else {
        setHistorialConfig(getCuentaPendienteHistorialConfig(clientes));
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
                backendTotals={totalesCC}
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
                // Orden por dos columnas (frontend)
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                // Filtro de fecha (frontend) — comentado
                // filtroFecha={filtroFecha}
                // onFiltroFechaChange={handleFiltroFechaChange}
                // Deshabilitar búsqueda y filtro de fecha en esta vista
                showSearch={true}
                showDateFilterOptions={false}
                showSaldoColumn={true}
                useBackendComputedSaldo={true}
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
        onSave={fetchData}
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
        loadHistorialFunction={
          selectedItemType === "movimiento"
            ? movimientosService.getMovimientoLogs
            : cuentasPendientesService.getLogs
        }
        {...(selectedItemType === "movimiento"
          ? getMovimientoHistorialConfig(cajas)
          : getCuentaPendienteHistorialConfig(clientes))}
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
