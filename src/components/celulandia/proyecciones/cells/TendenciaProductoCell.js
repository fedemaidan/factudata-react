import React from "react";
import { Stack, Tooltip, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";

const CLASIF = {
  sube: { Icon: TrendingUpRoundedIcon, color: "success.main", label: "En alza" },
  baja: { Icon: TrendingDownRoundedIcon, color: "error.main", label: "En baja" },
  estable: { Icon: TrendingFlatRoundedIcon, color: "info.main", label: "Estable" },
  sin_dato: { Icon: RemoveRoundedIcon, color: "text.disabled", label: "Sin datos suficientes" },
};

const formatPct = (pct) => {
  const n = Number(pct);
  if (!Number.isFinite(n)) return null;
  const value = n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
  return `${n > 0 ? "+" : ""}${value}%`;
};

/**
 * Celda de "Variación": muestra si el producto viene subiendo/bajando/estable y el % vs.
 * el mes pasado, leyendo `producto.tendencia` (ya viene en el payload paginado → sin fetch).
 */
const TendenciaProductoCell = ({ tendencia }) => {
  const clasificacion = tendencia?.clasificacion || "sin_dato";
  const { Icon, color, label } = CLASIF[clasificacion] || CLASIF.sin_dato;
  const pct = formatPct(tendencia?.variacionPct);
  const hayDato = clasificacion !== "sin_dato" && pct != null;

  const tooltipTitle = hayDato
    ? `${label} · ${pct} vs. el mes pasado`
    : "Todavía no hay suficientes meses para comparar";

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ color }}>
        <Icon sx={{ fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "inherit" }}>
          {hayDato ? pct : "—"}
        </Typography>
      </Stack>
    </Tooltip>
  );
};

export default TendenciaProductoCell;
