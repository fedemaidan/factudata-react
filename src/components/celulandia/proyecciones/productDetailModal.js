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

const formatNum = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return "-";
  const num = Number(n);
  return num % 1 === 0 ? String(num) : num.toFixed(2);
};

const formatNum2Dec = (n, useAbsolute = false) => {
  if (n == null || !Number.isFinite(Number(n))) return "-";
  let num = Number(n);
  if (useAbsolute) num = Math.abs(num);
  return num % 1 === 0 ? String(num) : num.toFixed(2);
};

const TabCalculoContent = ({ producto, calculo, formatDateDDMMYYYY, theme }) => {
  const inputs = calculo?.inputs || {};
  const intermedios = calculo?.resultadosIntermedios || {};
  const flags = calculo?.flags || {};
  const arribos = Array.isArray(calculo?.arribos) ? calculo.arribos : [];

  const ventasDiarias = Number(inputs.ventasDiarias) || 0;
  const ventasPeriodo = Number(inputs.ventasPeriodo) || 0;
  const diasPeriodo = Number(inputs.diasPeriodo) || 0;
  const diasConStock = Number(inputs.diasConStock) || 0;
  const stockInicial = Number(inputs.stockInicial) || 0;
  const horizonte90 = Number(inputs.horizonte90) || 90;
  const demanda90 = Number(intermedios.demanda90) || 0;
  const demanda200 = Number(intermedios.demanda200) || 0;
  const oferta200 = Number(intermedios.oferta200) || 0;
  const faltanteNeto = Number(intermedios.faltanteNeto) || 0;
  const stockAlDia90 = Number(intermedios.stockAlDia90) ?? 0;
  const diaAgotamiento = intermedios.diaAgotamiento;
  const diasAnticipacion = Number(inputs.diasAnticipacion100) || 100;
  const fechaBase = inputs.fechaBase ? new Date(inputs.fechaBase) : null;

  const ventasProyectadas = producto?.ventasProyectadas ?? Math.round(demanda90);
  const diasHastaAgotar = producto?.diasHastaAgotarStock ?? diaAgotamiento;
  const stockProyectado = producto?.stockProyectado ?? Math.round(stockAlDia90);
  const fechaAgotamiento = producto?.fechaAgotamientoStock;
  const cantidadCompra = producto?.cantidadCompraSugerida ?? faltanteNeto;
  const fechaCompraSugerida = producto?.fechaCompraSugerida;

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper,
    overflow: "hidden",
  };

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Card sx={cardSx}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            1. Ventas proyectadas (90 días)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Tomamos tus ventas del período ({formatNum(ventasPeriodo)} unidades en {diasConStock > 0 ? diasConStock : diasPeriodo} días) y calculamos el promedio diario.
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1, fontFamily: "monospace", fontSize: 14 }}>
            {formatNum2Dec(ventasDiarias, true)} ventas/día × {horizonte90} días = {formatNum(ventasProyectadas)} unidades
          </Box>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            2. Días hasta agotar stock
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Simulamos día a día: stock + arribos de pedidos - ventas. El primer día en que el stock llega a 0 es el resultado.
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
            {flags.seAgota ? (
              <Typography variant="body2">Stock en 0 en el día {formatNum(diaAgotamiento)} → {formatNum(diasHastaAgotar)} días desde la fecha {fechaBase ? formatDateDDMMYYYY(fechaBase) : "-"}</Typography>
            ) : flags.agotamientoExcede365Dias ? (
              <Typography variant="body2" color="success.main">No se agota en el próximo año</Typography>
            ) : (
              <Typography variant="body2">{formatNum(diasHastaAgotar)} días</Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            3. Stock proyectado (día 90)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Resultado de la simulación al final del horizonte de 90 días (stock + arribos de pedidos - ventas). Mas detalle en la pestaña (Tabla Completa).
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
            <Typography variant="body2">{formatNum(stockProyectado)} unidades</Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            4. Fecha agotamiento (Stock 0)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Fecha en la que el stock llegaría a 0 según la simulación.
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
            <Typography variant="body2">{fechaAgotamiento ? formatDateDDMMYYYY(fechaAgotamiento) : (flags.agotamientoExcede365Dias ? "Más de 1 año" : "-")}</Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            5. Cantidad a comprar (200 días)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Ventas que proyectamos en 200 días menos lo que ya tenés (stock + pedidos en camino).
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
            <Typography variant="body2" component="span">
              {formatNum(demanda200)} (Ventas proyectadas) − {formatNum(oferta200)} (Stock + pedidos en camino) = {formatNum(faltanteNeto)} → sugerir comprar {formatNum(cantidadCompra)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            6. Fecha compra sugerida
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {diasAnticipacion} días antes de que se agote el stock, para que llegue a tiempo.
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
            <Typography variant="body2">{fechaCompraSugerida ? formatDateDDMMYYYY(fechaCompraSugerida) : "-"}</Typography>
          </Box>
        </CardContent>
      </Card>

      {arribos.length > 0 && (
        <Card sx={cardSx}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              7. Pedidos considerados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Arribos en camino que se suman al stock en la simulación.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {arribos.map((a, index) => (
                <Chip
                  key={`arribo-${index}`}
                  label={`+${formatNum(a.cantidad)} día ${a.dia}${a.atrasado ? " (atrasado, al inicio)" : ""}`}
                  size="small"
                  color={a.atrasado ? "warning" : "success"}
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

const buildTooltip = (day, isFinalDay) => {
  if (!day) return [];
  const fechaLabel = getFechaLabel(day);
  return [
    { label: "Día", value: day.displayDay ?? day.dia ?? "-" },
    { label: "Fecha", value: fechaLabel ?? "-" },
    { label: "Stock", value: formatNum2Dec(day.stockInicial) },
    { label: "Ventas", value: formatNum2Dec(day.ventasDiarias, true) },
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
  const calculo = producto?.proyeccionCalculo || null;
  const hasCalculo = Boolean(calculo?.inputs);
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          minHeight: "88vh",
          maxHeight: "96vh",
        },
      }}
    >
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
      <DialogContent
        dividers
        sx={{
          maxHeight: "calc(96vh - 120px)",
          overflowY: "auto",
        }}
      >
        {!hasDetalle && !hasCalculo ? (
          <Box sx={{ py: 6 }}>
            <Typography variant="body2" align="center" color="text.secondary">
              Sin datos de proyección disponibles
            </Typography>
          </Box>
        ) : (
          <>
            <Tabs value={tabIndex} onChange={(_, value) => setTabIndex(value)} sx={{ mb: 2 }}>
              <Tab label="Resumen" value={0} sx={{ display: "none" }} />
              <Tab label="Tabla completa" value={1} disabled={!hasDetalle} />
              <Tab label="Cálculo" value={2} disabled={!hasCalculo} />
            </Tabs>
            {tabIndex === 2 && hasCalculo ? (
              <TabCalculoContent producto={producto} calculo={calculo} formatDateDDMMYYYY={formatDateDDMMYYYY} theme={theme} />
            ) : tabIndex === 0 ? (
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
                          {formatNum2Dec(firstDay?.stockInicial)}
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
                                  {formatNum2Dec(event.stockInicial)} → {formatNum2Dec(event.stockFinal)}
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
              <TableContainer
                component={Paper}
                sx={{
                  mt: 2,
                  maxHeight: "calc(96vh - 260px)",
                  overflowY: "auto",
                  borderRadius: 2,
                }}
              >
                <Table
                  size="small"
                  stickyHeader
                  sx={{
                    borderCollapse: "separate",
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: theme.palette.background.paper,
                          zIndex: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Día
                      </TableCell>
                      <TableCell
                        sx={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: theme.palette.background.paper,
                          zIndex: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Fecha
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: theme.palette.background.paper,
                          zIndex: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Stock inicial
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: theme.palette.background.paper,
                          zIndex: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Ventas diarias
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: theme.palette.background.paper,
                          zIndex: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Ingreso pedido
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: theme.palette.background.paper,
                          zIndex: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Stock proyectado
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalle.map((day) => (
                      <TableRow key={`row-${day.dia}`}>
                        <TableCell>{day.displayDay ?? day.dia}</TableCell>
                        <TableCell>{getFechaLabel(day) ?? "-"}</TableCell>
                        <TableCell align="right">{formatNum2Dec(day.stockInicial)}</TableCell>
                        <TableCell align="right">{formatNum2Dec(day.ventasDiarias, true)}</TableCell>
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
