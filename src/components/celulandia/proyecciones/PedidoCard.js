import React from "react";
import dayjs from "dayjs";
import { Card, CardContent, Stack, Box, Typography, Chip, Divider, Grid, Button } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const estadoConfig = {
  PENDIENTE: { label: "Pendiente", color: "warning", icon: <ScheduleIcon fontSize="small" /> },
  EN_TRANSITO: { label: "En tránsito", color: "info", icon: <LocalShippingIcon fontSize="small" /> },
  ENTREGADO: { label: "Entregado", color: "success", icon: <CheckCircleIcon fontSize="small" /> },
  CANCELADO: { label: "Cancelado", color: "error", icon: <ErrorIcon fontSize="small" /> },
};

const getEstadoConfig = (estadoRaw) => {
  const normalized = (estadoRaw || "").toUpperCase();
  return estadoConfig[normalized] || { label: normalized || "Desconocido", color: "default", icon: null };
};

const PedidoCard = ({
  pedido,
  contenedores = [],
  productosTotales = [],
  unidadesTotales = 0,
  onVerDetalle,
  onAgregarContenedor,
}) => {
  const estado = getEstadoConfig(pedido?.estado);
  const productosCount = productosTotales.length || 0;
  const unidades = unidadesTotales || 0;

  const proximaEtaEnTransito = (() => {
    const enTransito = contenedores
      .filter(
        (c) =>
          c.estado === "EN_TRANSITO" &&
          c?.contenedor?.fechaEstimadaLlegada
      )
      .map((c) => new Date(c.contenedor.fechaEstimadaLlegada).getTime());

    if (enTransito.length === 0) return null;
    const masCercana = Math.min(...enTransito);
    return new Date(masCercana);
  })();

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h6">{pedido.numeroPedido}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Creado: {pedido.createdAt ? dayjs(pedido.createdAt).format("DD/MM/YYYY") : "-"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip color={estado.color} label={estado.label} icon={estado.icon} size="small" />
            {pedido?.observaciones && (
              <Chip size="small" variant="outlined" label="Con observaciones" />
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Productos</Typography>
            <Typography variant="body2" color="text.secondary">
              {productosCount} referencia(s), {unidades} unidades totales
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Llegadas estimadas</Typography>
            {(() => {
              const fechas = contenedores
                .map((c) => c?.contenedor?.fechaEstimadaLlegada)
                .filter(Boolean)
                .map((date) => dayjs(date).format("DD/MM/YYYY"));
              const uniqueFechas = [...new Set(fechas)];
              const sinFecha = contenedores.filter(
                (c) => !c?.contenedor?.fechaEstimadaLlegada
              ).length;

              if (uniqueFechas.length === 0 && sinFecha === 0) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    No informadas
                  </Typography>
                );
              }

              if (uniqueFechas.length === 1 && sinFecha === 0) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    {uniqueFechas[0]}
                  </Typography>
                );
              }

              const textParts = [];
              if (uniqueFechas.length > 0) {
                if (uniqueFechas.length === 2) {
                  textParts.push(uniqueFechas.join(", "));
                } else if (uniqueFechas.length > 2) {
                  textParts.push(`${uniqueFechas[0]}, ${uniqueFechas[1]} +${uniqueFechas.length - 2}`);
                } else {
                  textParts.push(uniqueFechas[0]);
                }
              }
              if (sinFecha > 0) {
                textParts.push(`${sinFecha} sin fecha`);
              }

              return (
                <Typography variant="body2" color="text.secondary">
                  {textParts.join(" · ")}
                </Typography>
              );
            })()}
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Contenedores</Typography>
            {contenedores.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin contenedores
              </Typography>
            ) : (
              <>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {contenedores.slice(0, 3).map((c) => (
                    <Chip
                      key={c?.contenedor?._id || c?.contenedor?.codigo || c.contenedor || Math.random()}
                      size="small"
                      label={c?.contenedor?.codigo || "Sin código"}
                      color={c.estado === "RECIBIDO" ? "success" : "info"}
                    />
                  ))}
                  {contenedores.length > 3 && (
                    <Chip size="small" label={`+${contenedores.length - 3}`} />
                  )}
                </Stack>
                {proximaEtaEnTransito && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    Fecha estimada de llegada: {dayjs(proximaEtaEnTransito).format("DD/MM/YYYY")}
                  </Typography>
                )}
              </>
            )}
          </Grid>
        </Grid>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" size="small" onClick={onVerDetalle}>
          Ver detalle
        </Button>
        <Button variant="contained" color="secondary" size="small" onClick={onAgregarContenedor}>
          Agregar contenedor
        </Button>
      </Stack>
      </CardContent>
    </Card>
  );
};

export default PedidoCard;
