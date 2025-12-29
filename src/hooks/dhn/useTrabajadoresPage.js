import { useCallback, useEffect, useMemo, useState } from 'react';
import useFetch from 'src/hooks/useFetch';
import TrabajadorService from 'src/services/dhn/TrabajadorService';

const DEFAULT_ROWS_PER_PAGE = 100;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 200];
const SEARCH_DEBOUNCE_MS = 350;

const DEFAULT_RESPONSE = {
  data: [],
  total: 0,
  limit: 0,
  offset: 0,
  hasMore: false,
};

const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const normalizeRowsPerPage = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ROWS_PER_PAGE;
  }
  return parsed;
};

export default function useTrabajadoresPage(options = {}) {
  const {
    defaultRowsPerPage = DEFAULT_ROWS_PER_PAGE,
    debounceMs = SEARCH_DEBOUNCE_MS,
  } = options;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(() => normalizeRowsPerPage(defaultRowsPerPage));
  const [searchInput, setSearchInput] = useState('');

  const debouncedSearch = useDebouncedValue(searchInput, debounceMs);
  const searchTerm = useMemo(() => (debouncedSearch || '').trim(), [debouncedSearch]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const fetchTrabajadores = useCallback(async () => {
    const params = {
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    };

    if (searchTerm) {
      params.q = searchTerm;
    }

    return TrabajadorService.getAll(params);
  }, [page, rowsPerPage, searchTerm]);

  const {
    data: response = DEFAULT_RESPONSE,
    error,
    isError,
    isLoading,
    refetch,
  } = useFetch(fetchTrabajadores, [page, rowsPerPage, searchTerm], {
    initialData: DEFAULT_RESPONSE,
    keepPreviousData: true,
  });

  const trabajadores = Array.isArray(response?.data) ? response.data : [];
  const total = Number.isFinite(response?.total) ? response.total : Number(response?.total) || 0;

  const handleChangePage = useCallback((_event, nextPage) => {
    setPage(nextPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    const next = normalizeRowsPerPage(event?.target?.value);
    setRowsPerPage(next);
    setPage(0);
  }, []);

  const pagination = useMemo(
    () => ({
      total,
      page,
      rowsPerPage,
      rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
    }),
    [total, page, rowsPerPage]
  );

  return {
    trabajadores,
    pagination,
    isLoading,
    error,
    isError,
    refetch,
    searchInput,
    setSearchInput,
    handleChangePage,
    handleChangeRowsPerPage,
  };
}

