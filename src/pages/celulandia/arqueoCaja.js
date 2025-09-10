import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import dayjs from "dayjs";
import Divider from "@mui/material/Divider";

import movimientosService from "src/services/celulandia/movimientosService";
import DataTabTable from "src/components/celulandia/DataTabTable";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";

const ArqueoCajaPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [diario, setDiario] = useState([]);
  const [arqueoTotalGeneral, setArqueoTotalGeneral] = useState({
    totalARS: 0,
    totalUSD: 0,
    totalMovimientos: 0,
  });

  const [sortFieldDiario, setSortFieldDiario] = useState("fecha");
  const [sortDirectionDiario, setSortDirectionDiario] = useState("desc");
  const [pageDiario, setPageDiario] = useState(0);
  const [rowsPerPageDiario, setRowsPerPageDiario] = useState(10);
  const [selectedDate, setSelectedDate] = useState(dayjs()); // Fecha actual por defecto

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

  const fetchData = useCallback(async (fecha = null) => {
    setIsLoading(true);
    try {
      const params = {
        cajaNombre: "EFECTIVO",
        limit: 1000,
      };

      if (fecha) {
        const fechaLocal = fecha.format("YYYY-MM-DD");
        params.fecha = fechaLocal;
        console.log("Enviando fecha al backend:", fechaLocal);
      }

      const movsResp = await movimientosService.getAllMovimientos(params);
      const arqueoTotalGeneralResp = await movimientosService.getArqueoTotalGeneral();
      const movimientos = movsResp?.data;

      setArqueoTotalGeneral(arqueoTotalGeneralResp.data);

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

      setItems(parsedMovs);

      const arqueo = await movimientosService.getArqueoDiario({ cajaNombre: "EFECTIVO" });

      console.log("arqueo", arqueo);
      console.log("arqueoTotalGeneral", arqueoTotalGeneral);

      setDiario(arqueo?.data || []);
    } catch (err) {
      console.error("Error cargando datos de arqueo:", err);
      setItems([]);
      setDiario([]);
      setArqueoTotalGeneral(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para refetch del arqueo
  const refetchArqueo = useCallback(async () => {
    try {
      await fetchData(selectedDate);
    } catch (error) {
      console.error("Error al actualizar arqueo:", error);
    }
  }, [fetchData, selectedDate]);

  // Handler para cambio de fecha
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (newDate) {
      fetchData(newDate);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [fetchData, selectedDate]);

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
    <DashboardLayout
      title={`                  TOTAL ARS: ${formatearCampo(
        "montoEnviado",
        arqueoTotalGeneral?.totalARS
      )} - TOTAL
                  USD: ${formatearCampo("montoEnviado", arqueoTotalGeneral?.totalUSD)}`}
    >
      <Head>
        <title>Arqueo de Caja</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, pb: 2 }}>
        <Container maxWidth="xl">
          <Stack>
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
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                showRefreshButton={true}
                onRefresh={refetchArqueo}
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
    </DashboardLayout>
  );
};
export default ArqueoCajaPage;
