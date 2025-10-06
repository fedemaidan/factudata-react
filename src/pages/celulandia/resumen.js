import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  Chip,
  Button,
} from "@mui/material";
import { es } from "date-fns/locale";
import cajasService from "src/services/celulandia/cajasService";
import { useAuthContext } from "src/contexts/auth-context";
import { getEmpresaDetailsFromUser } from "src/services/empresaService";
import movimientosService from "src/services/celulandia/movimientosService";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import DataTable from "src/components/celulandia/DataTable";
import { getFechaArgentina } from "src/utils/celulandia/fechas";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";

const fmtARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const fmtUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function ResumenPage() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState(0); // 0=Ventas, 1=Egresos
  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(new Date());

  const [cajasChecked, setCajasChecked] = useState({});
  const [rubrosChecked, setRubrosChecked] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState("ARS");
  const [cajas, setCajas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [egresosData, setEgresosData] = useState([]);
  const [isLoadingVentas, setIsLoadingVentas] = useState(false);
  const [isLoadingEgresos, setIsLoadingEgresos] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [paginaActualEgresos, setPaginaActualEgresos] = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0);
  const [agrupadosCategorias, setAgrupadosCategorias] = useState([]);
  const [agrupadosCajas, setAgrupadosCajas] = useState([]);
  const [limitePorPagina] = useState(100);
  const [sortField, setSortField] = useState("fechaCreacion");
  const [sortDirection, setSortDirection] = useState("desc");
  const [sortFieldEgresos, setSortFieldEgresos] = useState("fechaFactura");
  const [sortDirectionEgresos, setSortDirectionEgresos] = useState("desc");
  const [initialized, setInitialized] = useState(false);
  const fetchData = async () => {
    try {
      const [cajasResponse, empresaResponse] = await Promise.all([
        cajasService.getAllCajas(),
        getEmpresaDetailsFromUser(user),
      ]);
      setCajas(
        cajasResponse.data.filter((caja) => caja.nombre !== "EZE" && caja.nombre !== "NICO")
      );
      setCategorias(empresaResponse?.categorias || []);

      const initialCajasChecked = cajasResponse.data.reduce((acc, caja) => {
        acc[caja._id] = true;
        return acc;
      }, {});
      setCajasChecked(initialCajasChecked);

      const initialRubrosChecked = (empresaResponse?.categorias || []).reduce((acc, categoria) => {
        acc[categoria.id] = true;
        return acc;
      }, {});
      setRubrosChecked(initialRubrosChecked);
      setInitialized(true);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper para formatear fechas a YYYY-MM-DD (zona local)
  const formatYMD = (d) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Cargar ingresos desde backend dentro de fetchData-like según filtros y paginación
  useEffect(() => {
    const fetchIngresos = async () => {
      if (!initialized) return;
      if (Object.keys(cajasChecked || {}).length === 0) return;
      setIsLoadingVentas(true);
      try {
        const cajasIds = Object.entries(cajasChecked)
          .filter(([, checked]) => checked)
          .map(([id]) => id);

        const offset = (paginaActual - 1) * limitePorPagina;
        const fechaInicio = formatYMD(dateFrom);
        const fechaFin = formatYMD(dateTo);

        const resp = await movimientosService.getAllMovimientos({
          type: "INGRESO",
          populate: "caja",
          limit: limitePorPagina,
          offset,
          sortField,
          sortDirection,
          fechaInicio,
          fechaFin,
          cajasIds,
          moneda: selectedCurrency,
        });

        const rows = Array.isArray(resp?.data) ? resp.data : [];
        setVentas(rows.map((r) => parseMovimiento(r)));
        setTotalVentas(resp?.total || rows.length);
      } catch (error) {
        console.error("Error al cargar ingresos:", error);
        setVentas([]);
        setTotalVentas(0);
      } finally {
        setIsLoadingVentas(false);
      }
    };
    fetchIngresos();
  }, [
    dateFrom,
    dateTo,
    cajasChecked,
    selectedCurrency,
    paginaActual,
    sortField,
    sortDirection,
    limitePorPagina,
    initialized,
  ]);

  useEffect(() => {
    const fetchEgresos = async () => {
      if (!initialized) return;
      if (
        Object.keys(rubrosChecked || {}).length === 0 &&
        Object.keys(cajasChecked || {}).length === 0
      )
        return;
      setIsLoadingEgresos(true);
      try {
        const categoriasIds = Object.entries(rubrosChecked)
          .filter(([, checked]) => checked)
          .map(([id]) => id);

        const offset = (paginaActualEgresos - 1) * limitePorPagina;
        const fechaInicio = formatYMD(dateFrom);
        const fechaFin = formatYMD(dateTo);

        const resp = await movimientosService.getAllMovimientos({
          type: "EGRESO",
          populate: "caja",
          limit: limitePorPagina,
          offset,
          sortField: sortFieldEgresos,
          sortDirection: sortDirectionEgresos,
          fechaInicio,
          fechaFin,
          categorias: categoriasIds,
          moneda: selectedCurrency,
        });

        const rows = Array.isArray(resp?.data) ? resp.data : [];
        setEgresosData(rows.map((r) => parseMovimiento(r)));
        setTotalEgresos(resp?.total || rows.length);

        // Obtener totales agrupados (dos llamadas separadas)
        try {
          const categoriasIdsOrNull = Object.entries(rubrosChecked)
            .filter(([, checked]) => checked)
            .map(([id]) => id);
          const cajasIdsOrNull = Object.entries(cajasChecked)
            .filter(([, checked]) => checked)
            .map(([id]) => id);

          const totalesCategorias = await movimientosService.getTotalesAgrupados({
            fechaInicio,
            fechaFin,
            categorias: categoriasIdsOrNull.join(","),
            type: "EGRESO",
            moneda: selectedCurrency,
          });

          const totalesCajas = await movimientosService.getTotalesAgrupados({
            fechaInicio,
            fechaFin,
            cajasIds: cajasIdsOrNull.join(","),
            type: "INGRESO",
            moneda: selectedCurrency,
          });

          const agCat = totalesCategorias?.data?.porCategoria || [];
          const agCaj = totalesCajas?.data?.porCaja || [];

          setAgrupadosCategorias(Array.isArray(agCat) ? agCat : []);
          setAgrupadosCajas(Array.isArray(agCaj) ? agCaj : []);
        } catch (e) {
          console.error("Error al cargar totales agrupados:", e);
          setAgrupadosCategorias([]);
          setAgrupadosCajas([]);
        }
      } catch (error) {
        console.error("Error al cargar egresos:", error);
        setEgresosData([]);
        setTotalEgresos(0);
      } finally {
        setIsLoadingEgresos(false);
      }
    };
    fetchEgresos();
  }, [
    dateFrom,
    dateTo,
    rubrosChecked,
    cajasChecked,
    selectedCurrency,
    paginaActualEgresos,
    sortFieldEgresos,
    sortDirectionEgresos,
    limitePorPagina,
    initialized,
  ]);

  return (
    <DashboardLayout title="Resumen">
      <Head>
        <title>Resumen</title>
      </Head>

      <Container maxWidth="xl" sx={{ mb: 4 }}>
        <Card sx={{ mb: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant={selectedCurrency === "ARS" ? "contained" : "outlined"}
                onClick={() => setSelectedCurrency("ARS")}
              >
                ARS
              </Button>
              <Button
                variant={selectedCurrency === "USD" ? "contained" : "outlined"}
                onClick={() => setSelectedCurrency("USD")}
              >
                USD
              </Button>
            </Stack>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DatePicker
                      label="Desde"
                      value={dateFrom}
                      onChange={setDateFrom}
                      views={["year", "month", "day"]}
                      format="dd/MM/yy"
                      slotProps={{
                        textField: {
                          size: "medium",
                          fullWidth: true,
                        },
                      }}
                    />
                    <DatePicker
                      label="Hasta"
                      value={dateTo}
                      onChange={setDateTo}
                      views={["year", "month", "day"]}
                      format="dd/MM/yy"
                      slotProps={{
                        textField: {
                          size: "medium",
                          fullWidth: true,
                        },
                      }}
                    />
                  </Stack>
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={9}>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem", minWidth: 90 }}
                      >
                        Total Ventas:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500 }}>
                        {(selectedCurrency === "ARS" ? fmtARS : fmtUSD).format(
                          (agrupadosCajas || []).reduce(
                            (acc, g) =>
                              acc +
                              Math.round(
                                selectedCurrency === "ARS" ? g.totalARS || 0 : g.totalUSD || 0
                              ),
                            0
                          )
                        )}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem", minWidth: 90 }}
                      >
                        Total Egresos:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500 }}>
                        {(selectedCurrency === "ARS" ? fmtARS : fmtUSD).format(
                          (agrupadosCategorias || []).reduce(
                            (acc, g) =>
                              acc +
                              Math.round(
                                selectedCurrency === "ARS" ? g.totalARS || 0 : g.totalUSD || 0
                              ),
                            0
                          )
                        )}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem", minWidth: 90 }}
                      >
                        Resultado:
                      </Typography>
                      {(() => {
                        const ventas = (agrupadosCajas || []).reduce(
                          (acc, g) =>
                            acc +
                            Math.round(
                              selectedCurrency === "ARS" ? g.totalARS || 0 : g.totalUSD || 0
                            ),
                          0
                        );
                        const egresos = (agrupadosCategorias || []).reduce(
                          (acc, g) =>
                            acc +
                            Math.round(
                              selectedCurrency === "ARS" ? g.totalARS || 0 : g.totalUSD || 0
                            ),
                          0
                        );
                        const res = ventas + egresos;
                        return (
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                            color={res >= 0 ? "success.main" : "error.main"}
                          >
                            {(selectedCurrency === "ARS" ? fmtARS : fmtUSD).format(res)}
                          </Typography>
                        );
                      })()}
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    mb: 0.5,
                  }}
                >
                  Cajas (Ventas)
                </Typography>
                <FormGroup row sx={{ gap: 3 }}>
                  {cajas.map((caja) => (
                    <FormControlLabel
                      key={caja._id}
                      control={
                        <Checkbox
                          checked={!!cajasChecked[caja._id]}
                          onChange={(e) =>
                            setCajasChecked((prev) => ({ ...prev, [caja._id]: e.target.checked }))
                          }
                          size="small"
                          sx={{ p: 0.25 }}
                        />
                      }
                      label={
                        <Chip
                          label={caja.nombre}
                          size="small"
                          sx={{
                            height: 20,
                            "& .MuiChip-label": {
                              fontSize: "0.75rem",
                              px: 1,
                            },
                          }}
                        />
                      }
                      sx={{
                        mr: 0,
                        "& .MuiFormControlLabel-label": {
                          fontSize: "0.75rem",
                        },
                      }}
                    />
                  ))}
                </FormGroup>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    mb: 0.5,
                  }}
                >
                  Categorías (Egresos)
                </Typography>
                <FormGroup row sx={{ gap: 2 }}>
                  {categorias.map((categoria) => (
                    <FormControlLabel
                      key={categoria.id}
                      control={
                        <Checkbox
                          checked={!!rubrosChecked[categoria.id]}
                          onChange={(e) =>
                            setRubrosChecked((prev) => ({
                              ...prev,
                              [categoria.id]: e.target.checked,
                            }))
                          }
                          size="small"
                          sx={{ p: 0.25 }}
                        />
                      }
                      label={
                        <Chip
                          label={categoria.name}
                          size="small"
                          sx={{
                            height: 20,
                            "& .MuiChip-label": {
                              fontSize: "0.75rem",
                              px: 1,
                            },
                          }}
                        />
                      }
                      sx={{
                        mr: 0,
                        "& .MuiFormControlLabel-label": {
                          fontSize: "0.75rem",
                        },
                      }}
                    />
                  ))}
                </FormGroup>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card sx={{ p: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
            <Tab label="Ventas" />
            <Tab label="Egresos" />
          </Tabs>
          <Divider />

          {/* Ventas */}
          {tab === 0 && (
            <Box sx={{ p: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  {cajas.map((caja) => (
                    <Grid item xs={12} sm={6} md={3} key={caja._id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minWidth: 80,
                            fontSize: "0.75rem",
                          }}
                        >
                          {caja.nombre}:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          {(() => {
                            const match = (agrupadosCajas || []).find(
                              (g) => String(g.key) === String(caja._id)
                            );
                            const valor =
                              selectedCurrency === "ARS"
                                ? match?.totalARS || 0
                                : match?.totalUSD || 0;
                            return (selectedCurrency === "ARS" ? fmtARS : fmtUSD).format(
                              Math.round(valor)
                            );
                          })()}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <DataTable
                data={ventas}
                isLoading={isLoadingVentas}
                columns={[
                  {
                    key: "fechaHoraCreacion",
                    label: "Fecha y Hora Creación",
                    sortable: true,
                    render: (item) => (
                      <div>
                        <div>{getFechaArgentina(item.fechaCreacion)}</div>
                        <div style={{ fontSize: "0.75rem", color: "#666" }}>
                          {formatearCampo("hora", item.horaCreacion, item)}
                        </div>
                      </div>
                    ),
                  },
                  { key: "fechaFactura", label: "Fecha Factura", sortable: true },
                  { key: "cliente", label: "Cliente", sortable: true },
                  {
                    key: "cuentaDestino",
                    label: "Cuenta Destino",
                    sortable: true,
                    sx: {
                      maxWidth: "185px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  },
                  { key: "montoYMoneda", label: "Monto Enviado", sortable: true },
                ]}
                formatters={{
                  fechaFactura: (value, item) => getFechaArgentina(value),
                  fechaCreacion: (value, item) => getFechaArgentina(value),
                  horaCreacion: (value, item) => formatearCampo("hora", value, item),
                  nombreUsuario: (value, item) => formatearCampo("nombreUsuario", value, item),
                  cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
                  montoYMoneda: (value, item) => formatearCampo("montoYMoneda", value, item),
                  cliente: (value, item) => {
                    let clienteValue;
                    if (value && typeof value === "object" && value.nombre) {
                      clienteValue = value.nombre;
                    } else {
                      clienteValue = value || "-";
                    }
                    return formatearCampo("default", clienteValue, item);
                  },
                }}
                serverSide={true}
                total={totalVentas}
                currentPage={paginaActual}
                onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
                rowsPerPage={limitePorPagina}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={(campo) => {
                  let actualSortField = campo;
                  if (campo === "fechaHoraCreacion") actualSortField = "fechaCreacion";
                  else if (campo === "montoYMoneda") actualSortField = "montoEnviado";

                  if (sortField === actualSortField)
                    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                  else {
                    setSortField(actualSortField);
                    setSortDirection("asc");
                  }
                  setPaginaActual(1);
                }}
                showSearch={false}
                showDateFilterOptions={false}
                showClienteListedChip={true}
              />
            </Box>
          )}

          {/* Egresos */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    mb: 1,
                  }}
                >
                  Totales por categoría
                </Typography>
                <Grid container spacing={1}>
                  {categorias.map((categoria) => (
                    <Grid item xs={12} sm={6} key={categoria.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minWidth: 80,
                            fontSize: "0.75rem",
                          }}
                        >
                          {categoria.name}:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          {(() => {
                            const match = (agrupadosCategorias || []).find(
                              (g) => String(g.key) === String(categoria.id)
                            );
                            const valor =
                              selectedCurrency === "ARS"
                                ? match?.totalARS || 0
                                : match?.totalUSD || 0;
                            return (selectedCurrency === "ARS" ? fmtARS : fmtUSD).format(
                              Math.round(valor)
                            );
                          })()}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Typography
                variant="subtitle2"
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                  mb: 1,
                }}
              >
                Detalle de egresos
              </Typography>
              <DataTable
                data={egresosData}
                isLoading={isLoadingEgresos}
                columns={[
                  {
                    key: "fechaHora",
                    label: "Fecha y Hora",
                    sortable: true,
                    render: (item) => (
                      <div>
                        <div>{getFechaArgentina(item.fechaFactura)}</div>
                        <div style={{ fontSize: "0.75rem", color: "#666" }}>
                          {formatearCampo("hora", item.horaCreacion, item)}
                        </div>
                      </div>
                    ),
                  },
                  { key: "cliente", label: "Cliente", sortable: true },
                  { key: "categoria", label: "Categoría", sortable: false },
                  { key: "cuentaDestino", label: "Cuenta Origen", sortable: true },
                  { key: "montoEnviado", label: "Monto", sortable: true },
                  { key: "moneda", label: "Moneda", sortable: true },
                ]}
                formatters={{
                  fechaFactura: (value) => getFechaArgentina(value),
                  horaCreacion: (value, item) => formatearCampo("hora", value, item),
                  cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
                  montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
                  moneda: (value, item) => formatearCampo("monedaDePago", value, item),
                  categoria: (value, item) => {
                    const id = item?.categoriaId || item?.categoria;
                    const found = categorias.find((c) => String(c.id) === String(id));
                    return found ? found.name : "-";
                  },
                  cliente: (value, item) => {
                    if (!value) return "-";
                    if (typeof value === "object" && value.nombre) return value.nombre;
                    return String(value);
                  },
                }}
                serverSide={true}
                total={totalEgresos}
                currentPage={paginaActualEgresos}
                onPageChange={(nuevaPagina) => setPaginaActualEgresos(nuevaPagina)}
                rowsPerPage={limitePorPagina}
                sortField={sortFieldEgresos}
                sortDirection={sortDirectionEgresos}
                onSortChange={(campo) => {
                  const actual = campo === "fechaHora" ? "fechaFactura" : campo;
                  if (sortFieldEgresos === actual)
                    setSortDirectionEgresos((prev) => (prev === "asc" ? "desc" : "asc"));
                  else {
                    setSortFieldEgresos(actual);
                    setSortDirectionEgresos("asc");
                  }
                  setPaginaActualEgresos(1);
                }}
                showSearch={false}
                showDateFilterOptions={false}
                showClienteListedChip={true}
              />
            </Box>
          )}
        </Card>
      </Container>
    </DashboardLayout>
  );
}
