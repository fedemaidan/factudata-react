import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import {
  Box,
  Container,
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DataTable from "src/components/celulandia/DataTable";
import movimientosService from "src/services/celulandia/movimientosService";

const mapMovimientoToRow = (m) => {
  const fecha = m.fechaFactura || m.fechaCreacion;
  const cliente = m?.cliente?.nombre || "-";
  const moneda = m.moneda;
  let montoARS = null;
  let montoUSD = null;
  if (moneda === "ARS") {
    montoARS = Math.round(m?.total?.ars || 0);
  } else if (moneda === "USD") {
    montoUSD = Math.round(m.total.usdBlue);
  }

  return {
    id: m._id,
    fecha,
    cliente,
    montoARS,
    montoUSD,
  };
};

const columns = [
  {
    key: "fecha",
    label: "Fecha",
    sortable: true,
    render: (row) => (row.fecha ? dayjs(row.fecha).format("DD/MM/YYYY") : "-"),
  },
  { key: "cliente", label: "Cliente", sortable: true },
  {
    key: "montoARS",
    label: "Monto ARS",
    sortable: true,
    render: (row) => (row.montoARS != null ? row.montoARS.toLocaleString("es-AR") : "-"),
  },
  {
    key: "montoUSD",
    label: "Monto USD",
    sortable: true,
    render: (row) => (row.montoUSD != null ? row.montoUSD.toLocaleString("es-AR") : "-"),
  },
];

const EzeNicoPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [ezeRows, setEzeRows] = useState([]);
  const [nicoRows, setNicoRows] = useState([]);

  const [sortFieldEze, setSortFieldEze] = useState("fecha");
  const [sortDirEze, setSortDirEze] = useState("desc");
  const [sortFieldNico, setSortFieldNico] = useState("fecha");
  const [sortDirNico, setSortDirNico] = useState("desc");

  // Filtro de fechas compartido
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [desde, setDesde] = useState(null);
  const [hasta, setHasta] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ezeResp, nicoResp] = await Promise.all([
          movimientosService.getAllMovimientos({
            populate: "cliente",
            cajaNombre: "EZE",
            limit: 200,
          }),
          movimientosService.getAllMovimientos({
            populate: "cliente",
            cajaNombre: "NICO",
            limit: 200,
          }),
        ]);

        const ezeData = Array.isArray(ezeResp?.data) ? ezeResp.data : ezeResp?.data || [];
        const nicoData = Array.isArray(nicoResp?.data) ? nicoResp.data : nicoResp?.data || [];

        setEzeRows(ezeData.map(mapMovimientoToRow));
        setNicoRows(nicoData.map(mapMovimientoToRow));
      } catch (err) {
        console.error("Error cargando movimientos EZE/NICO:", err);
        setEzeRows([]);
        setNicoRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const rangoFechas = useMemo(() => {
    const hoy = dayjs();
    let inicio = null;
    let fin = null;

    if (filtroFecha === "hoy") {
      inicio = hoy.startOf("day");
      fin = hoy.endOf("day");
    } else if (filtroFecha === "ultimos7") {
      inicio = hoy.startOf("day").subtract(6, "day");
      fin = hoy.endOf("day");
    } else if (filtroFecha === "estaSemana") {
      const dayOfWeek = hoy.day(); // 0 (dom) - 6 (sab)
      inicio = hoy.startOf("day").subtract(dayOfWeek, "day");
      fin = hoy.endOf("day");
    } else if (filtroFecha === "esteMes") {
      inicio = hoy.startOf("month");
      fin = hoy.endOf("month");
    } else if (filtroFecha === "personalizado") {
      inicio = desde ? dayjs(desde).startOf("day") : null;
      fin = hasta ? dayjs(hasta).endOf("day") : null;
    }

    return { inicio, fin };
  }, [filtroFecha, desde, hasta]);

  const filtrarPorRango = useMemo(() => {
    return (rows) => {
      const { inicio, fin } = rangoFechas;
      if (!inicio && !fin) return rows;
      return rows.filter((r) => {
        const f = dayjs(r.fecha);
        if (!f.isValid()) return false;
        if (inicio && f.isBefore(inicio)) return false;
        if (fin && f.isAfter(fin)) return false;
        return true;
      });
    };
  }, [rangoFechas]);

  const filteredEze = useMemo(() => filtrarPorRango(ezeRows), [ezeRows, filtrarPorRango]);
  const filteredNico = useMemo(() => filtrarPorRango(nicoRows), [nicoRows, filtrarPorRango]);

  const sortedEze = useMemo(() => {
    const arr = [...filteredEze];
    arr.sort((a, b) => {
      let aVal = a[sortFieldEze];
      let bVal = b[sortFieldEze];
      if (sortFieldEze === "fecha") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      if (aVal < bVal) return sortDirEze === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirEze === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredEze, sortFieldEze, sortDirEze]);

  const sortedNico = useMemo(() => {
    const arr = [...filteredNico];
    arr.sort((a, b) => {
      let aVal = a[sortFieldNico];
      let bVal = b[sortFieldNico];
      if (sortFieldNico === "fecha") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      if (aVal < bVal) return sortDirNico === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirNico === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredNico, sortFieldNico, sortDirNico]);

  const handleSortEze = (campo) => {
    if (sortFieldEze === campo) {
      setSortDirEze((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortFieldEze(campo);
      setSortDirEze("asc");
    }
  };

  const handleSortNico = (campo) => {
    if (sortFieldNico === campo) {
      setSortDirNico((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortFieldNico(campo);
      setSortDirNico("asc");
    }
  };

  return (
    <>
      <Head>
        <title>EZE y NICO</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 2 }}>
        <Container maxWidth="xl">
          <Stack>
            <Stack direction="row" justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                <FormControl sx={{ minWidth: 220 }} variant="filled">
                  <InputLabel id="filtro-fecha-label">Rango</InputLabel>
                  <Select
                    labelId="filtro-fecha-label"
                    id="filtro-fecha-select"
                    value={filtroFecha}
                    label="Rango"
                    onChange={(e) => setFiltroFecha(e.target.value)}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="hoy">Hoy</MenuItem>
                    <MenuItem value="ultimos7">Últimos 7 días</MenuItem>
                    <MenuItem value="estaSemana">Esta semana</MenuItem>
                    <MenuItem value="esteMes">Este mes</MenuItem>
                    <MenuItem value="personalizado">Personalizado</MenuItem>
                  </Select>
                </FormControl>

                {filtroFecha === "personalizado" && (
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Desde"
                      value={desde}
                      onChange={(v) => setDesde(v)}
                      format="DD/MM/YYYY"
                    />
                    <DatePicker
                      label="Hasta"
                      value={hasta}
                      onChange={(v) => setHasta(v)}
                      format="DD/MM/YYYY"
                    />
                  </LocalizationProvider>
                )}
              </Stack>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <DataTable
                  title="EZE"
                  data={sortedEze}
                  isLoading={isLoading}
                  columns={columns.map((c) => ({
                    ...c,
                    sortable: true,
                  }))}
                  searchFields={["cliente"]}
                  dateField="fecha"
                  showSearch={false}
                  showDateFilterOptions={false}
                  showDatePicker={false}
                  sortField={sortFieldEze}
                  sortDirection={sortDirEze}
                  onSortChange={handleSortEze}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DataTable
                  title="NICO"
                  data={sortedNico}
                  isLoading={isLoading}
                  columns={columns.map((c) => ({
                    ...c,
                    sortable: true,
                  }))}
                  searchFields={["cliente"]}
                  dateField="fecha"
                  showSearch={false}
                  showDateFilterOptions={false}
                  showDatePicker={false}
                  sortField={sortFieldNico}
                  sortDirection={sortDirNico}
                  onSortChange={handleSortNico}
                />
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EzeNicoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EzeNicoPage;
