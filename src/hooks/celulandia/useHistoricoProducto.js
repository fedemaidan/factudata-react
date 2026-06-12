import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import proyeccionService from "src/services/celulandia/proyeccionService";

/**
 * Trae la serie mensual + tendencia de un producto para el gráfico de evolución.
 * On-demand: solo fetchea cuando `enabled` y hay `codigo` (ej. al abrir la pestaña de
 * evolución en el detalle). La serie histórica no cambia entre cargas → staleTime alto.
 *
 * @param {string}  codigo
 * @param {object}  [opts]
 * @param {boolean} [opts.enabled=true]
 * @returns {{ serie: Array, tendencia: object|null, isLoading, isFetching, isError }}
 */
export const useHistoricoProducto = (codigo, { enabled = true } = {}) => {
  const query = useQuery({
    queryKey: ["historicoProducto", codigo],
    queryFn: () => proyeccionService.getHistoricoProducto(codigo),
    enabled: Boolean(enabled && codigo),
    staleTime: 1000 * 60 * 30, // 30 min: la historia no cambia mientras navegás
    retry: false,
  });

  const data = query.data?.data ?? null;
  const serie = useMemo(() => (Array.isArray(data?.serie) ? data.serie : []), [data]);
  const tendencia = data?.tendencia ?? null;

  return {
    serie,
    tendencia,
    isLoading: query.isLoading && query.isFetching,
    isFetching: query.isFetching,
    isError: query.isError,
  };
};

export default useHistoricoProducto;
