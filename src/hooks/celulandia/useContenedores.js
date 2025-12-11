import { useQuery, queryClient } from "@tanstack/react-query";
import contenedorService from "src/services/celulandia/contenedorService";

export const useContenedores = ({
  sortField = "createdAt",
  sortDirection = "desc",
  limit = 200,
  offset = 0,
} = {}) => {
  const query = useQuery({
    queryKey: ["contenedores", sortField, sortDirection, limit, offset],
    queryFn: () =>
      contenedorService.getAll({
        limit,
        offset,
        sortField,
        sortDirection,
      }),
    retry: false,
    keepPreviousData: true,
  });

  const invalidateContenedores = () => {
    queryClient.invalidateQueries({ queryKey: ["contenedores"] });
  };

  return {
    ...query,
    invalidateContenedores,
    data: query.data ?? { data: [], pagination: null },
  };
};
