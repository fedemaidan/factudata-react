import React from "react";
import StatusCircle from "src/components/celulandia/proyecciones/StatusCircle";

const StockActualProductoCell = ({ item }) => {
  const valor = Number(item?.stockActual ?? item?.cantidad ?? 0);
  const isCritico = Number.isFinite(valor) && valor <= 0;
  if (!Number.isFinite(valor)) return "-";
  if (!isCritico) return valor.toLocaleString();
  return <StatusCircle value={valor} color="error" />;
};

export default StockActualProductoCell;
