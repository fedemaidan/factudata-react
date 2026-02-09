import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Divider,
  Box,
  Alert,
  Link,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningIcon from "@mui/icons-material/Warning";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { LineChart } from "@mui/x-charts/LineChart";
import { formatDateDDMMYYYY } from "src/utils/handleDates";

const MAX_EVENTS_PREVIEW = 10;

const serializeDay = (day, index) => {
  const dia = Number.isFinite(Number(day?.dia)) ? Number(day.dia) : Number.isFinite(index) ? index : null;
  const displayDay = Number.isFinite(dia) ? dia + 1 : null;
  const fechaRaw = day?.fecha ? new Date(day.fecha) : null;
  const fechaLabelFromServer = typeof day?.fechaLabel === "string" ? day.fechaLabel : null;
  const fechaLabel = fechaLabelFromServer || (fechaRaw ? formatDateDDMMYYYY(fechaRaw) : null);
  return {
    dia,
    displayDay,
    fecha: day?.fecha ? new Date(day.fecha) : null,
    fechaLabel,
    stockInicial: Number.isFinite(Number(day?.stockInicial)) ? Number(day.stockInicial) : 0,
    stockFinal: Number.isFinite(Number(day?.stockFinal)) ? Number(day.stockFinal) : 0,
    ingresosPedido: Number.isFinite(Number(day?.ingresosPedido)) ? Number(day.ingresosPedido) : 0,
    ventasDiarias: Number.isFinite(Number(day?.ventasDiarias)) ? Number(day.ventasDiarias) : 0,
  };
};

const getFechaLabel = (day) => {
  if (!day) return null;
  if (typeof day.fechaLabel === "string" && day.fechaLabel) return day.fechaLabel;
  if (day.fecha) return formatDateDDMMYYYY(day.fecha);
  return null;
};

const buildTooltip = (day, isFinalDay) => {
  if (!day) return [];
  const fechaLabel = getFechaLabel(day);
  return [
    { label: "Día", value: day.displayDay ?? day.dia ?? "-" },
    { label: "Fecha", value: fechaLabel ?? "-" },
    { label: "Stock", value: day.stockInicial },
    { label: "Ventas", value: `-${day.ventasDiarias}` },
    { label: "Ingreso pedido", value: `+${day.ingresosPedido}` },
    { label: isFinalDay ? "Stock proyectado (día 90)" : "Stock final", value: day.stockFinal },
  ];
};

const ProductDetailModal = ({ open, onClose, producto }) => {
  const theme = useTheme();
  const detalle = useMemo(
    () =>
      Array.isArray(producto?.proyeccionDetalle)
        ? producto.proyeccionDetalle
            .map((day, index) => serializeDay(day, index))
            .filter((day) => day.dia != null)
            .sort((a, b) => a.dia - b.dia)
        : [],
    [producto]
  );
  const hasDetalle = detalle.length > 0;
  const [tabIndex, setTabIndex] = useState(1);
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTabIndex(1);
    setShowAllEvents(false);
  }, [open]);

  const firstDay = detalle[0] || null;
  const lastDay = detalle[detalle.length - 1] || null;

  const events = useMemo(() => {
    if (!hasDetalle) return [];
    const ingresos = detalle.filter((day) => day.ingresosPedido > 0);
    const critical = detalle.find((day) => day.stockFinal <= 0);
    const merged = ingresos.map((day) => ({
      type: "ingreso",
      dia: day.displayDay ?? day.dia,
      label: `+${day.ingresosPedido} ingreso pedido`,
      stockInicial: day.stockInicial,
      stockFinal: day.stockFinal,
      fecha: day.fecha,
      fechaLabel: day.fechaLabel,
    }));
    if (critical && !ingresos.some((day) => day.dia === critical.dia)) {
      merged.push({
        type: "agotado",
        dia: critical.displayDay ?? critical.dia,
        label: "Stock agotado",
        stockInicial: critical.stockInicial,
        stockFinal: critical.stockFinal,
        fecha: critical.fecha,
        fechaLabel: getFechaLabel(critical),
      });
    }
    const weekMarkers = detalle
      .filter((day) => Number.isFinite(day.displayDay) && (day.displayDay - 1) % 7 === 0)
      .map((day) => ({
        type: "semana",
        dia: day.displayDay,
        label: `Inicio semana ${Math.floor((day.displayDay - 1) / 7) + 1}`,
        stockInicial: day.stockInicial,
        stockFinal: day.stockFinal,
        fecha: day.fecha,
          fechaLabel: day.fechaLabel,
      }));
    const combined = [...merged, ...weekMarkers];
    return combined
      .sort((a, b) => (a.dia ?? 0) - (b.dia ?? 0))
      .map((event, index) => ({ id: `${event.type}-${event.dia}-${index}`, ...event }));
  }, [detalle, hasDetalle]);

  const eventsToRender = useMemo(() => {
    if (showAllEvents) return events;
    return events.slice(0, MAX_EVENTS_PREVIEW);
  }, [events, showAllEvents]);

  const chartData = useMemo(() => {
    if (!hasDetalle) {
      return {
        x: [],
        y: [],
        criticalDay: null,
        yMin: 0,
        yMax: 0,
      };
    }

    const xValues = detalle.map((day) => day.displayDay ?? day.dia ?? 0);
    const yValues = detalle.map((day) => day.stockFinal);
    const safeY = yValues.length ? yValues : [0];
    const criticalDay = detalle.find((day) => day.stockFinal <= 0);

    return {
      x: xValues.length ? xValues : [0, 90],
      y: safeY,
      criticalDay,
      yMin: Math.min(0, ...safeY),
      yMax: Math.max(...safeY),
    };
  }, [detalle, hasDetalle]);

  const renderTooltipContent = useCallback(
    (payload) => {
      const index = typeof payload?.datum?.index === "number" ? payload.datum.index : null;
      const day = Number.isFinite(index) ? detalle[index] : null;
      const finalDay = detalle[detalle.length - 1];
      const isFinalDay = Boolean(finalDay && day && day.dia === finalDay.dia);
      const tooltipData = buildTooltip(day, isFinalDay);
      if (!tooltipData.length) return null;
      return (
        <Box
          sx={{
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1,
            boxShadow: theme.shadows[4],
          }}
        >
          {tooltipData.map((item) => (
            <Stack key={item.label} direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {item.value}
              </Typography>
            </Stack>
          ))}
        </Box>
      );
    },
    [chartData, detalle, theme]
  );
  
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h6" component="span">
            Detalle de proyección (90 días)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {producto?.codigo ? `${producto.codigo} · ` : ""}
            {producto?.nombre ?? "Producto sin nombre"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar detalle de proyección">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!hasDetalle ? (
          <Box sx={{ py: 6 }}>
            <Typography variant="body2" align="center" color="text.secondary">
              Sin datos de proyección disponibles
            </Typography>
          </Box>
        ) : (
          <>
            <Tabs value={tabIndex} onChange={(_, value) => setTabIndex(value)} sx={{ mb: 2 }}>
              <Tab label="Resumen" value={0} sx={{ display: "none" }} />
              <Tab label="Tabla completa" value={1} />
            </Tabs>
            {tabIndex === 0 ? (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Card
                      sx={{
                        bgcolor: theme.palette.background.paper,
                        border: `2px solid ${theme.palette.primary.main}`,
                        borderRadius: 2,
                        color: theme.palette.text.primary,
                        boxShadow: 1,
                        height: "100%",
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Stock inicial
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {firstDay?.stockInicial ?? "-"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getFechaLabel(firstDay) || "Día 1"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card
                      sx={{
                        bgcolor: theme.palette.background.paper,
                        border: `2px solid ${theme.palette.secondary.main}`,
                        borderRadius: 2,
                        color: theme.palette.text.primary,
                        boxShadow: 1,
                        height: "100%",
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Stock proyectado
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {lastDay?.stockFinal ?? "-"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getFechaLabel(lastDay) || `Día ${lastDay?.displayDay ?? "-"}`}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: 1,
                    mb: 1,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                <LineChart
                    height={380}
                    grid={{ horizontal: true, vertical: false }}
                    xAxis={[
                      {
                        data: chartData.x,
                        scaleType: "linear",
                        min: chartData.x[0] ?? 0,
                        max: chartData.x[chartData.x.length - 1] ?? 90,
                        tick: { values: chartData.x.filter((_, index) => index % 10 === 0) },
                      },
                    ]}
                    yAxis={[
                      {
                        min: chartData.yMin,
                        max: chartData.yMax,
                        tick: {
                          values: [...new Set([0, chartData.yMin, chartData.yMax])],
                        },
                      },
                    ]}
                    series={[
                      {
                        label: "Stock proyectado",
                        data: chartData.y,
                        curve: "linear",
                        color: theme.palette.primary.main,
                        lineWidth: 2.5,
                        showMark: (_, index) => {
                          const day = detalle[index];
                          return Boolean(day?.ingresosPedido);
                        },
                      },
                    ]}
                    tooltip={{
                      content: renderTooltipContent,
                    }}
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      px: 2,
                    }}
                  />
                </Box>
                {chartData.criticalDay ? (
                  <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    sx={{ mb: 1 }}
                  >
                    Stock agotado a partir del día {chartData.criticalDay.displayDay ?? chartData.criticalDay.dia}
                  </Alert>
                ) : null}

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, mb: 2 }}>
                  {detalle
                    .filter((day) => day?.ingresosPedido > 0)
                    .slice(0, 5)
                    .map((day) => (
                      <Chip
                        key={`chip-${day.dia}`}
                        label={`Día ${day.displayDay ?? day.dia}: +${day.ingresosPedido}`}
                        size="small"
                        color="success"
                        variant="filled"
                        sx={{
                          fontWeight: 600,
                          px: 1.25,
                          py: 0.2,
                        }}
                      />
                    ))}
                </Stack>

                <Divider sx={{ mb: 1 }} />
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Eventos ({events.length})</Typography>
                    {events.length > MAX_EVENTS_PREVIEW && (
                      <Link
                        component="button"
                        variant="body2"
                        underline="none"
                        onClick={() => setShowAllEvents((prev) => !prev)}
                        sx={{ fontWeight: 600, textTransform: "none", color: "primary.main" }}
                      >
                        {showAllEvents ? "Ver menos eventos" : "Ver más eventos"}
                      </Link>
                    )}
                  </Stack>
                  {eventsToRender.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay eventos relevantes en este período.
                    </Typography>
                  ) : (
                    <Stack
                      spacing={0}
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        bgcolor: theme.palette.background.paper,
                        px: 1,
                        py: 0.5,
                      }}
                    >
                      {eventsToRender.map((event, index) => {
                        const isCritical = event.type === "agotado";
                        const isIngreso = event.type === "ingreso";
                        const eventColor = isCritical
                          ? theme.palette.error.main
                          : isIngreso
                          ? theme.palette.success.main
                          : theme.palette.info.main;
                        const IconComponent = isCritical
                          ? WarningIcon
                          : isIngreso
                          ? TrendingUpIcon
                          : CalendarTodayIcon;
                        return (
                          <Box key={event.id} sx={{ px: 1.5, py: 1 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box
                                  sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: theme.palette.action.hover,
                                    color: eventColor,
                                  }}
                                >
                                  <IconComponent fontSize="small" />
                                </Box>
                                <Stack spacing={0.25}>
                                  <Typography variant="caption" color="text.secondary">
                                    {event.fechaLabel ?? `Día ${event.dia ?? "-"}`}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {event.label}
                                  </Typography>
                                </Stack>
                              </Stack>
                              <Stack alignItems="flex-end">
                                <Typography variant="caption" color="text.secondary">
                                  Stock
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {event.stockInicial} → {event.stockFinal}
                                </Typography>
                              </Stack>
                            </Stack>
                            {index < eventsToRender.length - 1 && (
                              <Divider sx={{ mt: 1, borderColor: theme.palette.divider }} />
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              </>
            ) : (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Día</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell align="right">Stock inicial</TableCell>
                      <TableCell align="right">Ventas diarias</TableCell>
                      <TableCell align="right">Ingreso pedido</TableCell>
                      <TableCell align="right">Stock proyectado</TableCell>
                    </TableRow>
                  </TableHead>
        <TableBody>
          {detalle.map((day) => (
            <TableRow key={`row-${day.dia}`}>
              <TableCell>{day.displayDay ?? day.dia}</TableCell>
                        <TableCell>{getFechaLabel(day) ?? "-"}</TableCell>
              <TableCell align="right">{day.stockInicial}</TableCell>
              <TableCell align="right">-{day.ventasDiarias}</TableCell>
              <TableCell align="right">+{day.ingresosPedido}</TableCell>
              <TableCell align="right">{day.stockFinal}</TableCell>
            </TableRow>
          ))}
        </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
