import { useQuery, queryClient } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";

export const usePedidosResumen = ({
  sortField = "createdAt",
  sortDirection = "desc",
  limit = 200,
  offset = 0,
} = {}) => {
  const query = useQuery({
    queryKey: ["pedidos-resumen", sortField, sortDirection, limit, offset],
    queryFn: () =>
      pedidoService.getResumen({
        limit,
        offset,
        sortField,
        sortDirection,
      }),
    retry: false,
    keepPreviousData: true,
  });

  const invalidatePedidosResumen = () => {
    queryClient.invalidateQueries({ queryKey: ["pedidos-resumen"] });
  };

  return {
    ...query,
    invalidatePedidosResumen,
    data: query.data ?? { data: [], pagination: null },
  };
};
