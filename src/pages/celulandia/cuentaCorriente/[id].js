import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import {
  Box,
  Container,
  Stack,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import Divider from "@mui/material/Divider";
import ClearIcon from "@mui/icons-material/Clear";

import movimientosService from "src/services/celulandia/movimientosService";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import cajasService from "src/services/celulandia/cajasService";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import { formatCurrency } from "src/utils/formatters";
import DataTabTable from "src/components/celulandia/DataTabTable";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { filtrarPorFecha, filtrarPorBusqueda } from "src/utils/celulandia/filtros";
import EditarModal from "src/components/celulandia/EditarModal";
import EditarEntregaModal from "src/components/celulandia/EditarEntregaModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";

const ClienteCelulandiaCCPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [movimientos, setMovimientos] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [cuentaCorriente, setCuentaCorriente] = useState("ARS");
  const [ordenCampo, setOrdenCampo] = useState("fecha");
  const [ordenDireccion, setOrdenDireccion] = useState("desc");
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [historialConfig, setHistorialConfig] = useState(null);
  const [historialLoader, setHistorialLoader] = useState(null);
  const [editarEntregaModalOpen, setEditarEntregaModalOpen] = useState(false);

  // Nuevos estados para los datos compartidos
  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [cajas, setCajas] = useState([]);

  console.log("movimientos", movimientos);
  const formatearMonto = (monto) => {
    if (monto === undefined || monto === null) return "-";
    const isNegativo = monto < 0;
    const montoFormateado = formatCurrency(Math.round(monto));
    return (
      <Typography
        component="span"
        sx={{
          color: isNegativo ? "error.main" : "text.primary",
          fontWeight: isNegativo ? "bold" : "normal",
        }}
      >
        {isNegativo ? `-${montoFormateado}` : montoFormateado}
      </Typography>
    );
  };

  const fetchData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [
        clienteResponse,
        movimientosData,
        clientesResponse,
        tipoDeCambioResponse,
        cajasResponse,
        cuentasPendientesResponse,
      ] = await Promise.all([
        clientesService.getClienteById(id),
        movimientosService.getMovimientosByCliente(id),
        clientesService.getAllClientes(),
        dolarService.getTipoDeCambio(),
        cajasService.getAllCajas(),
        cuentasPendientesService.getByClienteId(id),
      ]);

      if (clienteResponse.success) {
        setCliente(clienteResponse.data);
      }
      const movimientosParseados = movimientosData.data
        .filter((m) => m.type === "INGRESO")
        .map(parseMovimiento);

      // Las cuentas pendientes ya vienen filtradas por cliente desde el backend
      const cuentasRespData = Array.isArray(cuentasPendientesResponse?.data)
        ? cuentasPendientesResponse.data
        : cuentasPendientesResponse?.data || [];
      const cuentasCliente = cuentasRespData || [];

      const parseCuentaPendiente = (c) => {
        const fechaCuentaCompleta = new Date(c.fechaCuenta);
        const fecha = fechaCuentaCompleta.toISOString().split("T")[0]; // YYYY-MM-DD
        const hora = fechaCuentaCompleta.toTimeString().split(" ")[0]; // HH:MM:SS
        const cc = c.cc;
        let montoCC = 0;
        if (cc === "ARS") montoCC = Number(c?.montoTotal?.ars || 0);
        else if (cc === "USD BLUE") montoCC = Number(c?.montoTotal?.usdBlue || 0);
        else if (cc === "USD OFICIAL") montoCC = Number(c?.montoTotal?.usdOficial || 0);

        return {
          // Campos para la tabla
          id: c._id,
          _id: c._id,
          origen: "cuentaPendiente",
          numeroComprobante: c.descripcion || "-",
          fecha: c.fechaCuenta,
          hora,
          montoCC,
          tipoDeCambio: c.tipoDeCambio || 1,
          montoEnviado: Number(c?.subTotal?.ars || 0),
          monedaDePago: c.moneda,
          cuentaDestino: c.cc,
          estado: "-",
          type: "EGRESO",
          cuentaCorriente: c.cc,
          // Campos esperados por EditarEntregaModal
          proveedorOCliente: c.proveedorOCliente,
          descripcion: c.descripcion,
          CC: c.cc,
          descuentoAplicado: c.descuentoAplicado,
        };
      };

      const cuentasParseadas = cuentasCliente.map(parseCuentaPendiente);

      setMovimientos([...movimientosParseados, ...cuentasParseadas]);

      // Procesar clientes
      const clientesArray = Array.isArray(clientesResponse)
        ? clientesResponse
        : clientesResponse?.data || [];
      setClientes(clientesArray);

      // Procesar tipo de cambio
      setTipoDeCambio({
        ...tipoDeCambioResponse,
        current: tipoDeCambioResponse?.current || 1,
      });

      // Procesar cajas
      setCajas(cajasResponse.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  console.log(movimientos);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, fetchData]);

  // Adaptar a formato de DataTabTable: tabs por Cuenta Corriente (ARS / USD BLUE / USD OFICIAL)
  const itemsDataTab = useMemo(() => {
    return movimientos.map((m) => ({
      id: m.id || m._id,
      fecha: m.fechaFactura || m.fecha,
      cliente: m.nombreCliente || m.proveedorOCliente || m.cliente?.nombre || m.cliente || "-",
      group: m.cuentaCorriente || m.CC || m.cc,
      monto: Math.round(m.montoCC || 0),
    }));
  }, [movimientos]);

  const saldosPorCC = useMemo(() => {
    const saldos = {
      ARS: 0,
      "USD BLUE": 0,
      "USD OFICIAL": 0,
    };

    movimientos.forEach((mov) => {
      if (Object.prototype.hasOwnProperty.call(saldos, mov.cuentaCorriente)) {
        if (mov.type === "INGRESO") {
          saldos[mov.cuentaCorriente] += mov.montoCC;
        } else {
          saldos[mov.cuentaCorriente] -= mov.montoCC;
        }
      }
    });

    return saldos;
  }, [movimientos]);

  const handleVolver = () => {
    router.back();
  };

  const handleSaveEdit = (id, updatedData) => {
    setMovimientos((prevMovimientos) =>
      prevMovimientos.map((mov) => (mov.id === id ? { ...mov, ...updatedData } : mov))
    );
  };

  if (!id) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <Head>
        <title>Cuenta Corriente - {cliente?.nombre || id}</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 2,
        }}
      >
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
                  "&:hover": {
                    backgroundColor: "action.hover",
                    color: "primary.main",
                  },
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
                items={itemsDataTab}
                options={[
                  { label: "ARS", value: "ARS" },
                  { label: "USD BLUE", value: "USD BLUE" },
                  { label: "USD OFICIAL", value: "USD OFICIAL" },
                ]}
                defaultOption={"ARS"}
                showRefreshButton={true}
                onRefresh={fetchData}
              />
            )}
          </Stack>
        </Container>
      </Box>
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
    </>
  );
};

ClienteCelulandiaCCPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ClienteCelulandiaCCPage;
