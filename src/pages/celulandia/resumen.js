import React, { useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
  Stack,
  Chip,
  TableContainer,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { es } from "date-fns/locale";

// -------------------------------
// Mock data
// -------------------------------
const MEDIOS = ["Banco", "Financiera", "Cheques", "Efectivo"];
const RUBROS = ["Flete/Papelería/Varios", "Impuestos", "Sueldos", "Alquileres", "Mercadería"];

const MOCK_MOVIMIENTOS = [
  // ingresos (ventas)
  { id: 1, fecha: "2025-09-18", type: "ingreso", moneda: "ARS", total: 950000, medio: "Banco" },
  { id: 2, fecha: "2025-09-18", type: "ingreso", moneda: "ARS", total: 800000, medio: "Efectivo" },
  { id: 3, fecha: "2025-09-17", type: "ingreso", moneda: "ARS", total: 420000, medio: "Cheques" },
  {
    id: 4,
    fecha: "2025-09-10",
    type: "ingreso",
    moneda: "ARS",
    total: 380000,
    medio: "Financiera",
  },
  { id: 5, fecha: "2025-08-25", type: "ingreso", moneda: "ARS", total: 1200000, medio: "Banco" },
  { id: 6, fecha: "2025-08-02", type: "ingreso", moneda: "ARS", total: 250000, medio: "Efectivo" },
  { id: 7, fecha: "2025-07-15", type: "ingreso", moneda: "ARS", total: 520000, medio: "Banco" },
  { id: 8, fecha: "2025-05-10", type: "ingreso", moneda: "ARS", total: 600000, medio: "Cheques" },
  {
    id: 9,
    fecha: "2024-12-20",
    type: "ingreso",
    moneda: "ARS",
    total: 310000,
    medio: "Financiera",
  },
  { id: 10, fecha: "2024-11-05", type: "ingreso", moneda: "ARS", total: 450000, medio: "Banco" },

  // egresos
  {
    id: 101,
    fecha: "2025-09-18",
    type: "egreso",
    moneda: "ARS",
    total: 85000,
    rubro: "Moto/Flete/Expresos/Papelería/Varios",
  },
  {
    id: 102,
    fecha: "2025-09-18",
    type: "egreso",
    moneda: "ARS",
    total: 200000,
    rubro: "Impuestos",
  },
  {
    id: 103,
    fecha: "2025-09-16",
    type: "egreso",
    moneda: "ARS",
    total: 620000,
    rubro: "Mercadería",
  },
  { id: 104, fecha: "2025-09-05", type: "egreso", moneda: "ARS", total: 480000, rubro: "Sueldos" },
  {
    id: 105,
    fecha: "2025-08-28",
    type: "egreso",
    moneda: "ARS",
    total: 300000,
    rubro: "Alquileres",
  },
  {
    id: 106,
    fecha: "2025-08-03",
    type: "egreso",
    moneda: "ARS",
    total: 120000,
    rubro: "Impuestos",
  },
  {
    id: 107,
    fecha: "2025-07-12",
    type: "egreso",
    moneda: "ARS",
    total: 95000,
    rubro: "Moto/Flete/Expresos/Papelería/Varios",
  },
  {
    id: 108,
    fecha: "2025-05-18",
    type: "egreso",
    moneda: "ARS",
    total: 180000,
    rubro: "Impuestos",
  },
  { id: 109, fecha: "2024-12-22", type: "egreso", moneda: "ARS", total: 440000, rubro: "Sueldos" },
  {
    id: 110,
    fecha: "2024-11-11",
    type: "egreso",
    moneda: "ARS",
    total: 220000,
    rubro: "Alquileres",
  },
];

// -------------------------------
// Helpers
// -------------------------------
const fmtARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseDateSafe(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// -------------------------------
// Component
// -------------------------------
export default function ResumenPage() {
  const [tab, setTab] = useState(0); // 0=Ventas, 1=Egresos
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [mediosChecked, setMediosChecked] = useState(() =>
    MEDIOS.reduce((acc, m) => ((acc[m] = true), acc), {})
  );
  const [rubrosChecked, setRubrosChecked] = useState(() =>
    RUBROS.reduce((acc, r) => ((acc[r] = true), acc), {})
  );

  const filtered = useMemo(() => {
    const monthKey = getMonthKey(selectedMonth);
    return MOCK_MOVIMIENTOS.filter((m) => {
      const [year, month] = m.fecha.split("-");
      return `${year}-${month}` === monthKey;
    });
  }, [selectedMonth]);

  const ventas = useMemo(
    () => filtered.filter((m) => m.type === "ingreso" && mediosChecked[m.medio]),
    [filtered, mediosChecked]
  );
  const egresos = useMemo(
    () => filtered.filter((m) => m.type === "egreso" && rubrosChecked[m.rubro]),
    [filtered, rubrosChecked]
  );

  const totales = useMemo(() => {
    const vARS = ventas.reduce((acc, m) => acc + m.total, 0);
    const eARS = egresos.reduce((acc, m) => acc + m.total, 0);
    return {
      ventasARS: vARS,
      egresosARS: eARS,
      resultadoARS: vARS - eARS,
    };
  }, [ventas, egresos]);

  const ventasPorMedio = useMemo(() => {
    const map = {};
    MEDIOS.forEach((m) => (map[m] = { ars: 0 }));
    ventas.forEach((m) => {
      map[m.medio].ars += m.total;
    });
    return map;
  }, [ventas]);

  const egresosPorRubro = useMemo(() => {
    const map = {};
    RUBROS.forEach((r) => (map[r] = { ars: 0 }));
    egresos.forEach((m) => {
      map[m.rubro].ars += m.total;
    });
    return map;
  }, [egresos]);

  return (
    <DashboardLayout title="Resumen">
      <Head>
        <title>Resumen</title>
      </Head>

      <Container maxWidth="xl" sx={{ mb: 4 }}>
        {/* Filtros */}
        <Card sx={{ mb: 1 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Mes"
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    views={["year", "month"]}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                      },
                    }}
                  />
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
                        {fmtARS.format(totales.ventasARS)}
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
                        {fmtARS.format(totales.egresosARS)}
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
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                        color={totales.resultadoARS >= 0 ? "success.main" : "error.main"}
                      >
                        {fmtARS.format(totales.resultadoARS)}
                      </Typography>
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
                  Medios de pago (Ventas)
                </Typography>
                <FormGroup row sx={{ gap: 3 }}>
                  {MEDIOS.map((m) => (
                    <FormControlLabel
                      key={m}
                      control={
                        <Checkbox
                          checked={!!mediosChecked[m]}
                          onChange={(e) =>
                            setMediosChecked((prev) => ({ ...prev, [m]: e.target.checked }))
                          }
                          size="small"
                          sx={{ p: 0.25 }}
                        />
                      }
                      label={
                        <Chip
                          label={m}
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
                  Rubros (Egresos)
                </Typography>
                <FormGroup row sx={{ gap: 0.25 }}>
                  {RUBROS.map((r) => (
                    <FormControlLabel
                      key={r}
                      control={
                        <Checkbox
                          checked={!!rubrosChecked[r]}
                          onChange={(e) =>
                            setRubrosChecked((prev) => ({ ...prev, [r]: e.target.checked }))
                          }
                          size="small"
                          sx={{ p: 0.25 }}
                        />
                      }
                      label={
                        <Chip
                          label={r}
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
                  {MEDIOS.map((m) => (
                    <Grid item xs={12} sm={6} md={3} key={m}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minWidth: 80,
                            fontSize: "0.75rem",
                          }}
                        >
                          {m}:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          {fmtARS.format(ventasPorMedio[m]?.ars || 0)}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    "& .MuiTableCell-root": {
                      borderRight: "none !important",
                      borderLeft: "none !important",
                      fontSize: "0.75rem",
                      padding: "5px 2px",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      borderBottom: "1px solid rgba(224, 224, 224, 1)",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                      padding: "5px 2px",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Medio</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventas.map((m) => (
                      <TableRow
                        key={m.id}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: alpha("#1976d2", 0.04) },
                        }}
                      >
                        <TableCell>{m.fecha}</TableCell>
                        <TableCell>{m.medio}</TableCell>
                        <TableCell align="right">{fmtARS.format(m.total)}</TableCell>
                      </TableRow>
                    ))}
                    {ventas.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align="center"
                          sx={{
                            py: 2,
                            color: "text.secondary",
                            fontSize: "0.75rem",
                          }}
                        >
                          Sin resultados para el período seleccionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
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
                  Totales por rubro
                </Typography>
                <Grid container spacing={1}>
                  {RUBROS.map((r) => (
                    <Grid item xs={12} sm={6} key={r}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minWidth: 80,
                            fontSize: "0.75rem",
                          }}
                        >
                          {r}:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          {fmtARS.format(egresosPorRubro[r]?.ars || 0)}
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
              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    "& .MuiTableCell-root": {
                      borderRight: "none !important",
                      borderLeft: "none !important",
                      fontSize: "0.75rem",
                      padding: "5px 2px",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      borderBottom: "1px solid rgba(224, 224, 224, 1)",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                      padding: "5px 2px",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Rubro</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {egresos.map((m) => (
                      <TableRow
                        key={m.id}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: alpha("#1976d2", 0.04) },
                        }}
                      >
                        <TableCell>{m.fecha}</TableCell>
                        <TableCell>{m.rubro}</TableCell>
                        <TableCell align="right">{fmtARS.format(m.total)}</TableCell>
                      </TableRow>
                    ))}
                    {egresos.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align="center"
                          sx={{
                            py: 2,
                            color: "text.secondary",
                            fontSize: "0.75rem",
                          }}
                        >
                          Sin resultados para el período seleccionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Card>
      </Container>
    </DashboardLayout>
  );
}
