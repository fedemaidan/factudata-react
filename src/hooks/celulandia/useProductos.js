import { useQuery, queryClient } from "@tanstack/react-query";
import productoService from "src/services/celulandia/productoService";

export const useProductos = ({
  sortField = "createdAt",
  sortDirection = "desc",
  limit = 200,
  offset = 0,
} = {}) => {
  const query = useQuery({
    queryKey: ["productos", sortField, sortDirection, limit, offset],
    queryFn: () =>
      productoService.getAll({
        limit,
        offset,
        sortField,
        sortDirection,
      }),
    retry: false,
    keepPreviousData: true,
  });

  const invalidateProductos = () => {
    queryClient.invalidateQueries({ queryKey: ["productos"] });
  }

  return {
    ...query,
    invalidateProductos,
    data: query.data ?? [],
  };
};