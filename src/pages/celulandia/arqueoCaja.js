import React, { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import {
  Box,
  Container,
  Stack,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  TableSortLabel,
  TablePagination,
} from "@mui/material";
import dayjs from "dayjs";
import Divider from "@mui/material/Divider";

import movimientosService from "src/services/celulandia/movimientosService";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import DataTabTable from "src/components/celulandia/DataTabTable";

const ArqueoCajaPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [diario, setDiario] = useState([]);
  const [sortFieldDiario, setSortFieldDiario] = useState("fecha");
  const [sortDirectionDiario, setSortDirectionDiario] = useState("desc");
  const [pageDiario, setPageDiario] = useState(0);
  const [rowsPerPageDiario, setRowsPerPageDiario] = useState(10);

  const handleSortChangeDiario = (campo) => {
    if (sortFieldDiario === campo) {
      setSortDirectionDiario((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortFieldDiario(campo);
      setSortDirectionDiario("asc");
    }
  };
  const options = [
    { label: "ARS", value: "ARS" },
    { label: "USD", value: "USD" },
  ];

  console.log("diario", diario);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [movsResp, cuentasResp] = await Promise.all([
          movimientosService.getAllMovimientos({ populate: "caja", cajaNombre: "EFECTIVO" }),
          cuentasPendientesService.getAll(),
        ]);
        const movimientos = movsResp?.data || [];

        const cuentas = Array.isArray(cuentasResp?.data)
          ? cuentasResp.data
          : cuentasResp?.data || [];

        const parsedMovs = movimientos.map((m) => ({
          id: m._id,
          fecha: m.fechaFactura || m.fechaCreacion,
          cliente: m?.cliente?.nombre || "-",
          group: m.moneda,
          monto:
            m.moneda === "ARS"
              ? Math.round(m?.total?.ars || 0)
              : Math.round(
                  m.cuentaCorriente === "USD BLUE"
                    ? m?.total?.usdBlue || 0
                    : m?.total?.usdOficial || 0
                ),
        }));

        const parsedCuentas = cuentas
          .filter((c) => c && (c.moneda === "ARS" || c.moneda === "USD"))
          .map((c) => ({
            id: c._id,
            fecha: c.fechaCuenta || c.fechaCreacion,
            cliente: c.proveedorOCliente || "-",
            group: c.moneda,
            monto:
              c.moneda === "ARS"
                ? -Math.round(Math.abs(c?.montoTotal?.ars || 0))
                : -Math.round(
                    c.cc === "USD BLUE"
                      ? Math.abs(c?.montoTotal?.usdBlue || 0)
                      : Math.abs(c?.montoTotal?.usdOficial || 0)
                  ),
          }));

        setItems([...parsedMovs, ...parsedCuentas]);

        const arqueo = await movimientosService.getArqueoDiario({ cajaNombre: "EFECTIVO" });
        setDiario(arqueo?.data || []);
      } catch (err) {
        console.error("Error cargando datos de arqueo:", err);
        setItems([]);
        setDiario([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedDiario = useMemo(() => {
    const sorted = [...diario];
    sorted.sort((a, b) => {
      let aVal = a[sortFieldDiario];
      let bVal = b[sortFieldDiario];

      if (sortFieldDiario === "fecha") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (sortFieldDiario === "totalARS" || sortFieldDiario === "totalUSD") {
        aVal = parseFloat(aVal || 0);
        bVal = parseFloat(bVal || 0);
      }

      if (aVal < bVal) return sortDirectionDiario === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirectionDiario === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [diario, sortFieldDiario, sortDirectionDiario]);

  const paginatedDiario = useMemo(() => {
    const startIndex = pageDiario * rowsPerPageDiario;
    const endIndex = startIndex + rowsPerPageDiario;
    return sortedDiario.slice(startIndex, endIndex);
  }, [sortedDiario, pageDiario, rowsPerPageDiario]);

  return (
    <>
      <Head>
        <title>Arqueo de Caja</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" spacing={4}>
              <Stack spacing={1}>
                <Typography variant="h4">Arqueo de Caja</Typography>
              </Stack>
            </Stack>
            <Divider />

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Detalle" />
              <Tab label="Totales por día" />
            </Tabs>

            {activeTab === 0 && (
              <DataTabTable
                items={items}
                isLoading={isLoading}
                options={options}
                defaultOption="ARS"
                showSearch={false}
                showDateFilterOptions={false}
                showDatePicker={true}
              />
            )}

            {activeTab === 1 && (
              <Paper sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", cursor: "pointer" }}>
                        <TableSortLabel
                          active={sortFieldDiario === "fecha"}
                          direction={sortFieldDiario === "fecha" ? sortDirectionDiario : "asc"}
                          onClick={() => handleSortChangeDiario("fecha")}
                        >
                          Fecha
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", cursor: "pointer" }}>
                        <TableSortLabel
                          active={sortFieldDiario === "totalARS"}
                          direction={sortFieldDiario === "totalARS" ? sortDirectionDiario : "asc"}
                          onClick={() => handleSortChangeDiario("totalARS")}
                        >
                          Total ARS
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", cursor: "pointer" }}>
                        <TableSortLabel
                          active={sortFieldDiario === "totalUSD"}
                          direction={sortFieldDiario === "totalUSD" ? sortDirectionDiario : "asc"}
                          onClick={() => handleSortChangeDiario("totalUSD")}
                        >
                          Total USD
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedDiario.map((row) => (
                      <TableRow key={row.fecha}>
                        <TableCell>{dayjs(row.fecha).format("DD/MM/YYYY")}</TableCell>
                        <TableCell align="right">
                          <Typography
                            color={(row.totalARS || 0) < 0 ? "error.main" : "text.primary"}
                          >
                            {Math.round(row.totalARS || 0).toLocaleString("es-AR")}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={(row.totalUSD || 0) < 0 ? "error.main" : "text.primary"}
                          >
                            {Math.round(row.totalUSD || 0).toLocaleString("es-AR")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={sortedDiario.length}
                  page={pageDiario}
                  onPageChange={(event, newPage) => setPageDiario(newPage)}
                  rowsPerPage={rowsPerPageDiario}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPageDiario(parseInt(event.target.value, 10));
                    setPageDiario(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="Filas por página:"
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                  }
                />
              </Paper>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

ArqueoCajaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ArqueoCajaPage;
