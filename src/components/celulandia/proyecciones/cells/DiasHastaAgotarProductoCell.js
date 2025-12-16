import React from "react";
import { Chip, Tooltip } from "@mui/material";
import StatusCircle from "src/components/celulandia/proyecciones/StatusCircle";

const getDiasHastaAgotar = (item) => {
  const raw = item?.diasSinStock ?? item?.diasHastaAgotarStock;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;

  const fecha = item?.fechaAgotamientoStock;
  if (!fecha) return null;
  const target = new Date(fecha);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.ceil((startOfTarget - startOfToday) / (24 * 60 * 60 * 1000));
  return diffDays;
};

const getSemaforoDiasColor = (dias) => {
  if (dias == null) return null;
  if (dias < 30) return "error";
  if (dias < 60) return "warning";
  return "success";
};

const DiasHastaAgotarProductoCell = ({ item }) => {
  const dias = getDiasHastaAgotar(item);
  if (dias == null) {
    if (item?.agotamientoExcede365Dias) {
      return (
        <Tooltip title="No se agota en los próximos 365 días (límite de simulación).">
          <Chip
            label="+ 1 año"
            size="small"
            variant="outlined"
            color="info"
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
      );
    }
    return "-";
  }
  const color = getSemaforoDiasColor(dias);
  const value = Math.max(0, Math.trunc(dias));
  return <StatusCircle value={value} color={color} />;
};

export default DiasHastaAgotarProductoCell;
