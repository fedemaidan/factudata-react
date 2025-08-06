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
} from "@mui/material";
import Divider from "@mui/material/Divider";

import celulandiaService from "src/services/celulandiaService";
import { formatCurrency } from "src/utils/formatters";

const ClientesCelulandiaPage = () => {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [ordenCampo, setOrdenCampo] = useState("cliente");
  const [ordenDireccion, setOrdenDireccion] = useState("asc");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await celulandiaService.getClientesTotales();
      console.log("Datos de clientes cargados:", data);
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatearMonto = (monto) => {
    if (monto === undefined || monto === null) return "-";

    const isNegativo = monto < 0;
    const montoFormateado = formatCurrency(Math.abs(monto));

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

  const clientesFiltrados = useMemo(() => {
    console.log("Filtrando clientes:", clientes.length);
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

      if (ordenDireccion === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [clientesFiltrados, ordenCampo, ordenDireccion]);

  const clientesAMostrar = clientesOrdenados;

  const handleRowClick = (cliente) => {
    router.push(`/clientes/${cliente}`);
  };

  return (
    <>
      <Head>
        <title>Clientes Celulandia</title>
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
                <Typography variant="h4">Clientes</Typography>
              </Stack>
            </Stack>
            <Divider />

            <TextField
              label="Buscar cliente"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ maxWidth: 400 }}
            />

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
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "cliente") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("cliente");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
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
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
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
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
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
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
                        >
                          USD OFICIAL
                          {ordenCampo === "USD OFICIAL"
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
                          onClick={() => handleRowClick(cliente.cliente)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: "medium" }}>{cliente.cliente}</TableCell>
                          <TableCell>{formatearMonto(cliente.ARS)}</TableCell>
                          <TableCell>{formatearMonto(cliente["USD BLUE"])}</TableCell>
                          <TableCell>{formatearMonto(cliente["USD OFICIAL"])}</TableCell>
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

ClientesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ClientesCelulandiaPage;
