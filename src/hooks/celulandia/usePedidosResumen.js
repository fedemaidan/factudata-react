import { useQuery, useQueryClient } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";

export const usePedidosResumen = ({
  sortField = "createdAt",
  sortDirection = "desc",
  limit = 200,
  offset = 0,
  search = "",
  estado = "",
} = {}) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["pedidos-resumen", sortField, sortDirection, limit, offset, search, estado],
    queryFn: () =>
      pedidoService.getResumen({
        limit,
        offset,
        sortField,
        sortDirection,
        search,
        estado,
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
