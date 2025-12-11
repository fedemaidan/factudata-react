import { useQuery, queryClient } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";

export const usePedidos = ({
  sortField = "createdAt",
  sortDirection = "desc",
  limit = 200,
  offset = 0,
} = {}) => {
  const query = useQuery({
    queryKey: ["pedidos", sortField, sortDirection, limit, offset],
    queryFn: () =>
      pedidoService.getAll({
        limit,
        offset,
        sortField,
        sortDirection,
      }),
    retry: false,
    keepPreviousData: true,
  });

  const invalidatePedidos = () => {
    queryClient.invalidateQueries({ queryKey: ["pedidos"] });
  };

  return {
    ...query,
    invalidatePedidos,
    data: query.data ?? { data: [], pagination: null },
  };
};
