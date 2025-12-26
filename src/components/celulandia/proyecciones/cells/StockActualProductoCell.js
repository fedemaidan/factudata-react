import React from "react";
import { Tooltip } from "@mui/material";
import StatusCircle from "src/components/celulandia/proyecciones/StatusCircle";

const StockActualProductoCell = ({ item }) => {
  const valor = Number(item?.stockActual ?? item?.cantidad ?? 0);
  const isCritico = Number.isFinite(valor) && valor <= 0;
  if (!Number.isFinite(valor)) return "-";

  const diasConStockRaw = item?.diasConStock;
  const diasConStock = Number.isFinite(Number(diasConStockRaw)) ? Math.max(0, Math.trunc(Number(diasConStockRaw))) : null;
  const tooltipTitle =
    diasConStock == null
      ? "Días con stock en el período: -"
      : `Días con stock en el período: ${diasConStock}`;

  const content = !isCritico ? valor.toLocaleString() : <StatusCircle value={valor} color="error" />;

  return (
    <Tooltip title={tooltipTitle} arrow>
      <span style={{ display: "inline-flex", alignItems: "center" }}>{content}</span>
    </Tooltip>
  );
};

export default StockActualProductoCell;
