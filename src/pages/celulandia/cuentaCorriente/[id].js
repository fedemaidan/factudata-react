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
        cuentasPendientesService.getAll(),
      ]);

      if (clienteResponse.success) {
        setCliente(clienteResponse.data);
      }

      const movimientosParseados = movimientosData.data
        .filter((m) => m.type === "INGRESO")
        .map(parseMovimiento);

      // Mapear cuentas pendientes de este cliente por nombre
      const nombreCliente = (clienteResponse?.data?.nombre || "").toString().trim().toLowerCase();
      const cuentasRespData = Array.isArray(cuentasPendientesResponse?.data)
        ? cuentasPendientesResponse.data
        : cuentasPendientesResponse?.data || [];
      const cuentasCliente = (cuentasRespData || []).filter(
        (c) => (c?.proveedorOCliente || "").toString().trim().toLowerCase() === nombreCliente
      );

      const parseCuentaPendiente = (c) => {
        const fecha = new Date(c.fechaCreacion);
        const hora = fecha?.toTimeString().split(" ")[0] || "-";
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

  const movimientosFiltrados = useMemo(() => {
    let movimientosFiltrados = movimientos.filter((mov) => mov.cuentaCorriente === cuentaCorriente);

    movimientosFiltrados = filtrarPorFecha(movimientosFiltrados, filtroFecha);

    const camposBusqueda = [
      "numeroComprobante",
      "fecha",
      "hora",
      "montoEnviado",
      "monedaDePago",
      "montoCC",
      "tipoDeCambio",
    ];
    movimientosFiltrados = filtrarPorBusqueda(movimientosFiltrados, busqueda, camposBusqueda);

    return movimientosFiltrados;
  }, [movimientos, busqueda, filtroFecha, cuentaCorriente]);

  const movimientosOrdenados = useMemo(() => {
    return [...movimientosFiltrados].sort((a, b) => {
      let aVal = a[ordenCampo];
      let bVal = b[ordenCampo];

      if (ordenCampo === "fecha") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (ordenDireccion === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [movimientosFiltrados, ordenCampo, ordenDireccion]);

  const movimientosAMostrar = movimientosOrdenados;

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

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                sx={{ minWidth: 300 }}
                InputProps={{
                  endAdornment: busqueda.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setBusqueda("")}
                        edge="end"
                        size="small"
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl sx={{ minWidth: 200 }} variant="filled">
                <InputLabel id="filtro-fecha-label">Filtrar por fecha</InputLabel>
                <Select
                  labelId="filtro-fecha-label"
                  id="filtro-fecha-select"
                  value={filtroFecha}
                  label="Filtrar por fecha"
                  onChange={(e) => setFiltroFecha(e.target.value)}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="hoy">Hoy</MenuItem>
                  <MenuItem value="estaSemana">Esta semana</MenuItem>
                  <MenuItem value="esteMes">Este mes</MenuItem>
                  <MenuItem value="esteAño">Este año</MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
                <Button
                  variant={cuentaCorriente === "ARS" ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setCuentaCorriente("ARS")}
                  sx={{ flexGrow: 1, py: 2 }}
                >
                  ARS:{" "}
                  {saldosPorCC.ARS > 0
                    ? formatCurrency(saldosPorCC.ARS)
                    : "(" + formatCurrency(Math.abs(saldosPorCC.ARS)) + ")"}
                </Button>
                <Button
                  variant={cuentaCorriente === "USD BLUE" ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setCuentaCorriente("USD BLUE")}
                  sx={{ flexGrow: 1, py: 2 }}
                >
                  USD BLUE:{" "}
                  {saldosPorCC["USD BLUE"] > 0
                    ? formatCurrency(saldosPorCC["USD BLUE"])
                    : "(" + formatCurrency(Math.abs(saldosPorCC["USD BLUE"])) + ")"}
                </Button>
                <Button
                  variant={cuentaCorriente === "USD OFICIAL" ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setCuentaCorriente("USD OFICIAL")}
                  sx={{ flexGrow: 1, py: 2 }}
                >
                  USD OFICIAL:{" "}
                  {saldosPorCC["USD OFICIAL"] > 0
                    ? formatCurrency(saldosPorCC["USD OFICIAL"])
                    : "(" + formatCurrency(Math.abs(saldosPorCC["USD OFICIAL"])) + ")"}
                </Button>
              </Stack>
            </Stack>

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
              <>
                <Paper>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "bold" }}>Número de Comprobante</TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "fecha") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("fecha");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
                        >
                          Fecha
                          {ordenCampo === "fecha" ? (ordenDireccion === "asc" ? " ▲" : " ▼") : ""}
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Hora</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>{cuentaCorriente}</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>TC</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Monto Original</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Moneda Original</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientosAMostrar.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>{mov.numeroComprobante}</TableCell>
                          <TableCell>{formatearCampo("fecha", mov.fecha)}</TableCell>
                          <TableCell>{mov.hora}</TableCell>
                          <TableCell>{formatearMonto(mov.montoCC)}</TableCell>
                          <TableCell>{formatearCampo("tipoDeCambio", mov.tipoDeCambio)}</TableCell>
                          <TableCell>{formatearMonto(mov.montoEnviado)}</TableCell>
                          <TableCell>{formatearCampo("monedaDePago", mov.monedaDePago)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedData(mov);
                                  if (mov.origen === "cuentaPendiente") {
                                    setEditarEntregaModalOpen(true);
                                  } else {
                                    setEditarModalOpen(true);
                                  }
                                }}
                                sx={{
                                  backgroundColor: "primary.main",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor: "primary.dark",
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedData(mov);
                                  if (mov.origen === "cuentaPendiente") {
                                    setHistorialConfig({
                                      title: "Historial de la Entrega",
                                      entityName: "entrega",
                                      fieldNames: {
                                        descripcion: "Descripción",
                                        fechaCuenta: "Fecha de Cuenta",
                                        proveedorOCliente: "Cliente",
                                        descuentoAplicado: "Descuento Aplicado",
                                        subTotal: "Sub Total",
                                        montoTotal: "Monto Total",
                                        moneda: "Moneda",
                                        cc: "Cuenta Corriente",
                                        usuario: "Usuario",
                                      },
                                      formatters: {
                                        fechaCuenta: (valor) =>
                                          new Date(valor).toLocaleDateString("es-AR"),
                                        descuentoAplicado: (valor) =>
                                          `${Math.round(((valor ?? 1) - 1) * -100)}%`,
                                      },
                                    });
                                    setHistorialLoader(() => cuentasPendientesService.getLogs);
                                  } else {
                                    setHistorialConfig({
                                      title: "Historial del Comprobante",
                                      entityName: "comprobante",
                                      fieldNames: {
                                        tipoDeCambio: "Tipo de Cambio",
                                        estado: "Estado",
                                        caja: "Cuenta de Destino",
                                        cliente: "Cliente",
                                        cuentaCorriente: "Cuenta Corriente",
                                        moneda: "Moneda",
                                        tipoFactura: "Tipo de Comprobante",
                                        urlImagen: "Imagen",
                                        numeroFactura: "Número de Factura",
                                        fechaFactura: "Fecha de Factura",
                                        fechaCreacion: "Fecha de Creación",
                                        userPhone: "Teléfono Usuario",
                                        nombreUsuario: "Usuario",
                                        concepto: "Concepto",
                                      },
                                      formatters: {
                                        tipoDeCambio: (valor) => `$${valor}`,
                                        fechaFactura: (valor) =>
                                          new Date(valor).toLocaleDateString("es-AR"),
                                        fechaCreacion: (valor) =>
                                          new Date(valor).toLocaleDateString("es-AR"),
                                        cliente: (valor) =>
                                          typeof valor === "object"
                                            ? valor?.nombre || "N/A"
                                            : valor,
                                        caja: (valor) =>
                                          typeof valor === "object"
                                            ? valor?.nombre || "N/A"
                                            : valor,
                                      },
                                    });
                                    setHistorialLoader(() => movimientosService.getMovimientoLogs);
                                  }
                                  setHistorialModalOpen(true);
                                }}
                                sx={{
                                  backgroundColor: "secondary.main",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor: "secondary.dark",
                                  },
                                }}
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>

                {movimientosAMostrar.length === 0 && !isLoading && (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    sx={{ minHeight: 100 }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron movimientos para este cliente en {cuentaCorriente}
                    </Typography>
                  </Box>
                )}
              </>
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
