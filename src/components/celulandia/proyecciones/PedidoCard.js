import React from "react";
import dayjs from "dayjs";
import { Card, CardContent, Stack, Box, Typography, Chip, Divider, Grid, Button } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const estadoConfig = {
  PENDIENTE: { label: "Pendiente", color: "warning", icon: <ScheduleIcon fontSize="small" /> },
  ENTREGADO: { label: "Entregado", color: "success", icon: <CheckCircleIcon fontSize="small" /> },
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
}) => {
  const estado = getEstadoConfig(pedido?.estado);
  const productosCount = productosTotales.length || 0;
  const unidades = unidadesTotales || 0;

  const { contenedoresReales, tieneSinContenedor, fechasPedidoSinContenedor } = (() => {
    const all = Array.isArray(contenedores) ? contenedores : [];
    const reales = all.filter((c) => !!c?.contenedor?._id);
    const sinCont = all.filter((c) => !c?.contenedor?._id);

    const fechasPedido = sinCont
      .flatMap((c) => c?.productos || [])
      .map((p) => p?.fechaEstimadaDeLlegada)
      .filter(Boolean)
      .map((date) => dayjs(date).format("DD/MM/YYYY"));

    return {
      contenedoresReales: reales,
      tieneSinContenedor: sinCont.length > 0,
      fechasPedidoSinContenedor: [...new Set(fechasPedido)],
    };
  })();

  const proximaEtaEnTransito = (() => {
    const enTransito = contenedoresReales
      .filter(
        (c) =>
          c.estado === "PENDIENTE" &&
          c?.contenedor?.fechaEstimadaLlegada
      )
      .map((c) => new Date(c.contenedor.fechaEstimadaLlegada).getTime());

    if (enTransito.length === 0) return null;
    const masCercana = Math.min(...enTransito);
    return new Date(masCercana);
  })();

  const renderLlegadasResumen = () => {
    const fechasContenedores = contenedoresReales.map((c) => {
      const codigo = c?.contenedor?.codigo || "Contenedor";
      const fecha = c?.contenedor?.fechaEstimadaLlegada
        ? dayjs(c.contenedor.fechaEstimadaLlegada).format("DD/MM/YYYY")
        : null;
      return { codigo, fecha };
    });

    const contenedoresSinFecha = fechasContenedores.filter((c) => !c.fecha).length;
    const contenedoresConFecha = fechasContenedores.filter((c) => !!c.fecha);
    const uniqueFechasCont = [...new Set(contenedoresConFecha.map((c) => c.fecha))];

    const partes = [];

    if (tieneSinContenedor) {
      if (fechasPedidoSinContenedor.length === 0) {
        partes.push("Pedido: sin fecha");
      } else if (fechasPedidoSinContenedor.length === 1) {
        partes.push(`Pedido: ${fechasPedidoSinContenedor[0]}`);
      } else if (fechasPedidoSinContenedor.length === 2) {
        partes.push(`Pedido: ${fechasPedidoSinContenedor.join(", ")}`);
      } else {
        partes.push(
          `Pedido: ${fechasPedidoSinContenedor[0]}, ${fechasPedidoSinContenedor[1]} +${
            fechasPedidoSinContenedor.length - 2
          }`
        );
      }
    }

    if (contenedoresConFecha.length > 0) {
      if (uniqueFechasCont.length === 1) {
        const codigos = contenedoresConFecha.map((c) => c.codigo).join(", ");
        partes.push(`${codigos}: ${uniqueFechasCont[0]}`);
      } else {
        contenedoresConFecha.slice(0, 3).forEach((c) => partes.push(`${c.codigo}: ${c.fecha}`));
        if (contenedoresConFecha.length > 3) {
          partes.push(`+${contenedoresConFecha.length - 3} contenedor(es)`);
        }
      }
    }

    if (contenedoresSinFecha > 0) {
      partes.push(`${contenedoresSinFecha} sin fecha`);
    }

    if (partes.length === 0) {
      return "No informadas";
    }

    return partes.join(" · ");
  };

  return (
    <Card variant="outlined" sx={{ py: 0, px: 1 }}>
      <CardContent sx={{ py: 0.5, px: 0 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack spacing={0.2}>
              <Typography variant="subtitle2">{pedido.numeroPedido}</Typography>
              <Typography variant="caption" color="text.secondary">
                Creado: {pedido.createdAt ? dayjs(pedido.createdAt).format("DD/MM/YYYY") : "-"}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip color={estado.color} label={estado.label} icon={estado.icon} size="small" />
              {pedido?.observaciones && (
                <Chip size="small" variant="outlined" label="Con observaciones" />
              )}
              <Button variant="text" size="small" onClick={onVerDetalle}>
                Ver detalle
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ fontSize: "0.7rem" }}>
            <Stack spacing={0.2}>
              <Typography variant="caption" color="text.secondary">
                Productos
              </Typography>
              <Typography variant="body2">
                {productosCount} referencias · {unidades} unidades
              </Typography>
            </Stack>
            <Stack spacing={0.2} sx={{ maxWidth: 240 }}>
              <Typography variant="caption" color="text.secondary">
                Llegadas
              </Typography>
              <Typography variant="body2" noWrap>
                {renderLlegadasResumen()}
              </Typography>
            </Stack>
            <Stack spacing={0.2}>
              <Typography variant="caption" color="text.secondary">
                Contenedores
              </Typography>
              <Stack direction="row" spacing={0.4} flexWrap="wrap">
                {contenedoresReales.slice(0, 3).map((c) => (
                  <Chip
                    key={c?.contenedor?._id || c?.contenedor?.codigo || Math.random()}
                    size="small"
                    label={c?.contenedor?.codigo || "Sin código"}
                    color={c.estado === "ENTREGADO" ? "success" : "info"}
                  />
                ))}
                {contenedoresReales.length > 3 && (
                  <Chip size="small" label={`+${contenedoresReales.length - 3}`} />
                )}
                {tieneSinContenedor && <Chip size="small" label="Sin contenedor" />}
              </Stack>
              {proximaEtaEnTransito && (
                <Typography variant="caption" color="text.secondary" display="block">
                  ETA: {dayjs(proximaEtaEnTransito).format("DD/MM/YYYY")}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PedidoCard;
