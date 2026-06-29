import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";

export const useLotesPendientes = () => {
  const query = useQuery({
    queryKey: ["lotesPendientes"],
    queryFn: () => pedidoService.getLotesPendientes(),
    staleTime: 1000 * 60 * 60 ,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const lotesPendientesPorCodigo = useMemo(() => {
    const map = new Map();
    const payload = query.data;

    if (!payload || !payload.success || !Array.isArray(payload.data)) {
      return map;
    }

    payload.data.forEach((lote) => {
      const codigo = lote?.producto?.codigo;
      if (!codigo) return;

      const fechaContenedor = lote?.contenedor?.fechaEstimadaLlegada
        ? new Date(lote.contenedor.fechaEstimadaLlegada)
        : null;
      const fechaLote = lote?.fechaEstimadaDeLlegada
        ? new Date(lote.fechaEstimadaDeLlegada)
        : null;
      const fechaArribo = fechaContenedor || fechaLote;
      if (!fechaArribo || Number.isNaN(fechaArribo.getTime())) return;

      const cantidad = Number(lote.cantidad) || 0;
      if (!cantidad) return;

      const item = {
        fecha: fechaArribo,
        cantidad,
        contenedorCodigo: lote?.contenedor?.codigo || null,
        numeroPedido: lote?.pedido?.numeroPedido || null,
      };

      if (!map.has(codigo)) map.set(codigo, []);
      map.get(codigo).push(item);
    });

    map.forEach((arr) => arr.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()));

    return map;
  }, [query.data]);

  return {
    ...query,
    lotesPendientesPorCodigo,
  };
};
