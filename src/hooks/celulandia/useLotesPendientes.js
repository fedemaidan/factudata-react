import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";

export const useLotesPendientes = () => {
  const query = useQuery({
    queryKey: ["lotesPendientes"],
    queryFn: () => pedidoService.getLotesPendientes(),
    staleTime: 1000 * 60 * 60 , 
    retry: false,
  });

  const proximoArriboPorCodigo = useMemo(() => {
    const map = new Map();
    const payload = query.data;

    if (!payload || !payload.success || !Array.isArray(payload.data)) {
      return map;
    }

    payload.data.forEach((lote) => {
      const codigo = lote?.producto?.codigo;
      if (!codigo) return;

      // Determinar fecha de arribo (contenedor o lote)
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

      const existing = map.get(codigo);
      if (!existing || fechaArribo < existing.fecha) {
        // Primer arribo (o el más cercano en el tiempo)
        map.set(codigo, { fecha: fechaArribo, cantidad });
      } else if (fechaArribo.getTime() === existing.fecha.getTime()) {
        // Si es el mismo día, sumamos cantidades
        map.set(codigo, {
          fecha: existing.fecha,
          cantidad: existing.cantidad + cantidad,
        });
      }
    });

    return map;
  }, [query.data]);

  return {
    ...query,
    proximoArriboPorCodigo,
  };
};
