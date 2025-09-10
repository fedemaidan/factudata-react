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
  Tooltip,
} from "@mui/material";
import Divider from "@mui/material/Divider";
import RefreshIcon from "@mui/icons-material/Refresh";

import movimientosService from "src/services/celulandia/movimientosService";
import { formatCurrency } from "src/utils/formatters";

const CuentaCorrienteCelulandiaPage = () => {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [ordenCampo, setOrdenCampo] = useState("cliente");
  const [ordenDireccion, setOrdenDireccion] = useState("asc");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await movimientosService.getClientesTotales();
      if (response.success) {
        setClientes(response.data);
      } else {
        console.error("Error al cargar clientes:", response.error);
        setClientes([]);
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para manejar la actualización
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatearMonto = (monto) => {
    if (monto === undefined || monto === null) return "-";

    const isNegativo = monto < 0;
    const montoFormateado = formatCurrency(Math.round(Math.abs(monto)));

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

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin pagos";

    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diferenciaDias = Math.floor((ahora - fechaObj) / (1000 * 60 * 60 * 24));

    if (diferenciaDias === 0) {
      return "Hoy";
    } else if (diferenciaDias === 1) {
      return "Ayer";
    } else if (diferenciaDias < 7) {
      return `Hace ${diferenciaDias} días`;
    } else if (diferenciaDias < 30) {
      const semanas = Math.floor(diferenciaDias / 7);
      return `Hace ${semanas} semana${semanas > 1 ? "s" : ""}`;
    } else if (diferenciaDias < 365) {
      const meses = Math.floor(diferenciaDias / 30);
      return `Hace ${meses} mes${meses > 1 ? "es" : ""}`;
    } else {
      const años = Math.floor(diferenciaDias / 365);
      return `Hace ${años} año${años > 1 ? "s" : ""}`;
    }
  };

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) {
      return clientes;
    }

    const terminoBusqueda = busqueda.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const campos = [
        cliente.cliente,
        cliente.ARS?.toString(),
        cliente["USD BLUE"]?.toString(),
        cliente["USD OFICIAL"]?.toString(),
      ];

      return campos.some((campo) => campo && campo.toLowerCase().includes(terminoBusqueda));
    });
  }, [clientes, busqueda]);

  const clientesOrdenados = useMemo(() => {
    return [...clientesFiltrados].sort((a, b) => {
      let aVal = a[ordenCampo];
      let bVal = b[ordenCampo];

      // Para campos numéricos, convertimos a número
      if (ordenCampo === "ARS" || ordenCampo === "USD BLUE" || ordenCampo === "USD OFICIAL") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      // Para fechas, convertimos a timestamp para ordenar
      if (ordenCampo === "fechaUltimoPago" || ordenCampo === "fechaUltimaEntrega") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (ordenDireccion === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [clientesFiltrados, ordenCampo, ordenDireccion]);

  const clientesAMostrar = clientesOrdenados;

  const handleRowClick = (cliente) => {
    router.push(`/celulandia/cuentaCorriente/${cliente._id}`);
  };

  return (
    <>
      <Head>
        <title>Cuenta Corriente</title>
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
            <Stack direction="row" justifyContent="space-between" spacing={4}>
              <Stack spacing={1}>
                <Typography variant="h4">Cuenta Corriente</Typography>
              </Stack>
            </Stack>
            <Divider />

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Buscar cliente"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                sx={{ maxWidth: 400 }}
              />

              {/* Botón de actualización */}
              <Tooltip title="Actualizar datos">
                <IconButton
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  sx={{
                    borderRadius: 2,
                    px: 1,
                    py: 1,
                    boxShadow: 1,
                    "&:hover": {
                      boxShadow: 2,
                    },
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
              </Tooltip>
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
                  <Table
                    sx={{
                      "& .MuiTableCell-root": {
                        fontSize: "0.8rem",
                      },
                      "& .MuiTableHead-root .MuiTableCell-root": {
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "cliente") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("cliente");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer" }}
                        >
                          Cliente
                          {ordenCampo === "cliente" ? (ordenDireccion === "asc" ? " ▲" : " ▼") : ""}
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "ARS") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("ARS");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer" }}
                        >
                          ARS
                          {ordenCampo === "ARS" ? (ordenDireccion === "asc" ? " ▲" : " ▼") : ""}
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "USD BLUE") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("USD BLUE");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer" }}
                        >
                          USD BLUE
                          {ordenCampo === "USD BLUE"
                            ? ordenDireccion === "asc"
                              ? " ▲"
                              : " ▼"
                            : ""}
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "USD OFICIAL") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("USD OFICIAL");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer" }}
                        >
                          USD OFICIAL
                          {ordenCampo === "USD OFICIAL"
                            ? ordenDireccion === "asc"
                              ? " ▲"
                              : " ▼"
                            : ""}
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "fechaUltimaEntrega") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("fechaUltimaEntrega");
                              setOrdenDireccion("desc");
                            }
                          }}
                          sx={{ cursor: "pointer" }}
                        >
                          Última Entrega
                          {ordenCampo === "fechaUltimaEntrega"
                            ? ordenDireccion === "asc"
                              ? " ▲"
                              : " ▼"
                            : ""}
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "fechaUltimoPago") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("fechaUltimoPago");
                              setOrdenDireccion("desc");
                            }
                          }}
                          sx={{ cursor: "pointer" }}
                        >
                          Último Pago
                          {ordenCampo === "fechaUltimoPago"
                            ? ordenDireccion === "asc"
                              ? " ▲"
                              : " ▼"
                            : ""}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clientesAMostrar.map((cliente, index) => (
                        <TableRow
                          key={index}
                          onClick={() => handleRowClick(cliente)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          <TableCell>{cliente.cliente}</TableCell>
                          <TableCell>{formatearMonto(cliente.ARS)}</TableCell>
                          <TableCell>{formatearMonto(cliente["USD BLUE"])}</TableCell>
                          <TableCell>{formatearMonto(cliente["USD OFICIAL"])}</TableCell>
                          <TableCell>{formatearFecha(cliente.fechaUltimaEntrega)}</TableCell>
                          <TableCell>{formatearFecha(cliente.fechaUltimoPago)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>

                {clientesAMostrar.length === 0 && !isLoading && (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    sx={{ minHeight: 100 }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron clientes
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

CuentaCorrienteCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CuentaCorrienteCelulandiaPage;
