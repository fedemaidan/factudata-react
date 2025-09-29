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
import DataTabTableV2 from "src/components/celulandia/DataTabTableV2";

const ArqueoCajaPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [diario, setDiario] = useState([]);
  const [arqueoTotalGeneral, setArqueoTotalGeneral] = useState({
    totalARS: 0,
    totalUSD: 0,
    totalMovimientos: 0,
  });
  const [externalTotalsMap, setExternalTotalsMap] = useState(null);

  const [sortFieldDiario, setSortFieldDiario] = useState("fecha");
  const [sortDirectionDiario, setSortDirectionDiario] = useState("desc");
  const [pageDiario, setPageDiario] = useState(0);
  const [rowsPerPageDiario, setRowsPerPageDiario] = useState(100);
  // Rango de fechas (server-side). Por defecto vacío => trae todo
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  // Paginación y ordenación server-side
  const [serverPage, setServerPage] = useState(1); // 1-based
  const [serverRowsPerPage, setServerRowsPerPage] = useState(50);
  const [currentOption, setCurrentOption] = useState("ARS");
  const [sortField, setSortField] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        cajaNombre: "EFECTIVO",
        limit: serverRowsPerPage,
        offset: (serverPage - 1) * serverRowsPerPage,
        sortField: sortField,
        sortDirection: sortDir,
      };

      if (dateFrom) {
        params.fechaInicio = dayjs(dateFrom).format("YYYY-MM-DD");
      }
      if (dateTo) {
        params.fechaFin = dayjs(dateTo).format("YYYY-MM-DD");
      }

      const movsResp = await movimientosService.getAllMovimientos(params);
      // Traer totales general y (si hay rango) filtrado por fecha
      const totalResp = await movimientosService.getArqueoTotalGeneralFiltrado({
        fechaInicio: dateFrom ? dayjs(dateFrom).format("YYYY-MM-DD") : undefined,
        fechaFin: dateTo ? dayjs(dateTo).format("YYYY-MM-DD") : undefined,
        cajaNombre: "EFECTIVO",
      });
      const movimientos = movsResp?.data || [];

      // Si backend devuelve ambos totales, preferirlos
      if (totalResp?.data) {
        const { general, filtrado } = totalResp.data;
        const useTotals = filtrado || general;
        const totalARS = Math.round(useTotals?.totalARS || 0);
        const totalUSD = Math.round(useTotals?.totalUSD || 0);
        setArqueoTotalGeneral({
          totalARS,
          totalUSD,
          totalMovimientos: useTotals?.totalMovimientos || 0,
        });
        setExternalTotalsMap(
          new Map([
            ["ARS", totalARS],
            ["USD", totalUSD],
          ])
        );
      } else {
        setExternalTotalsMap(null);
      }
      setTotalItems(movsResp?.total || 0);

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
  }, [currentOption, serverRowsPerPage, serverPage, sortField, sortDir, dateFrom, dateTo]);

  // Función para refetch del arqueo
  const refetchArqueo = useCallback(async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error("Error al actualizar arqueo:", error);
    }
  }, [fetchData]);

  // Handler para cambio de rango de fechas (desde/hasta)
  const handleDateRangeChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setServerPage(1);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
              <DataTabTableV2
                items={items}
                isLoading={isLoading}
                options={options}
                defaultOption="ARS"
                currentOption={currentOption}
                onOptionChange={(opt) => {
                  setCurrentOption(opt);
                  setServerPage(1);
                }}
                showSearch={false}
                showDateFilterOptions={false}
                showDatePicker={false}
                showDateRange={true}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateRangeChange={handleDateRangeChange}
                showRefreshButton={true}
                onRefresh={refetchArqueo}
                // Server-side pagination/sort
                total={totalItems}
                currentPage={serverPage}
                rowsPerPage={serverRowsPerPage}
                onPageChange={(newPage) => setServerPage(newPage)}
                sortField={sortField}
                sortDirection={sortDir}
                onSortChange={(field, direction) => {
                  setSortField(field);
                  setSortDir(direction);
                  setServerPage(1);
                }}
                onRowsPerPageChange={(rpp) => {
                  setServerRowsPerPage(rpp);
                  setServerPage(1);
                }}
                externalTotals={externalTotalsMap}
              />
            )}

            {activeTab === 1 && (
              <Paper sx={{ mt: 2 }}>
                <Table
                  size="small"
                  sx={{ "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "5px 8px" } }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          padding: "5px 8px",
                        }}
                      >
                        <TableSortLabel
                          active={sortFieldDiario === "fecha"}
                          direction={sortFieldDiario === "fecha" ? sortDirectionDiario : "asc"}
                          onClick={() => handleSortChangeDiario("fecha")}
                        >
                          Fecha
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          padding: "5px 8px",
                        }}
                      >
                        <TableSortLabel
                          active={sortFieldDiario === "totalARS"}
                          direction={sortFieldDiario === "totalARS" ? sortDirectionDiario : "asc"}
                          onClick={() => handleSortChangeDiario("totalARS")}
                        >
                          Total ARS
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          padding: "5px 8px",
                        }}
                      >
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
                      <TableRow
                        key={row.fecha}
                        onClick={() => console.log("row", row)}
                        sx={{ "& .MuiTableCell-root": { fontSize: "0.75rem", padding: "5px 8px" } }}
                      >
                        <TableCell sx={{ fontSize: "0.75rem" }}>
                          {dayjs(row.fecha).format("DD/MM/YYYY")}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{ fontSize: "0.75rem" }}
                            color={(row.totalARS || 0) < 0 ? "error.main" : "text.primary"}
                          >
                            {`${row.totalARS < 0 ? "-" : ""}$${Math.abs(
                              Math.round(row.totalARS || 0)
                            ).toLocaleString("es-AR")}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{ fontSize: "0.75rem" }}
                            color={(row.totalUSD || 0) < 0 ? "error.main" : "text.primary"}
                          >
                            {`${row.totalUSD < 0 ? "-" : ""}$${Math.abs(
                              Math.round(row.totalUSD || 0)
                            ).toLocaleString("es-AR")}`}
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
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
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
