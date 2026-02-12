import { useCallback, useMemo, useRef, useState } from "react";
import { formatDateToDDMMYYYY } from "src/utils/handleDates";

const DEFAULT_FILTERS = {
  searchTerm: "",
  searchQuery: "",
  fechaDesde: null,
  fechaHasta: null,
  tipo: "",
  estado: "",
};

const useErroresSyncFilters = ({ onSearchApply } = {}) => {
  const searchInputRef = useRef(null);
  const isSearchTriggeredByInputRef = useRef(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchVersion, setSearchVersion] = useState(0);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState(null);

  const { fechaDesde, fechaHasta, tipo, estado, searchTerm, searchQuery } = filters;
  const filtersOpen = Boolean(filtersAnchorEl);

  const handleOpenFilters = useCallback(() => {
    if (searchInputRef.current) {
      setFiltersAnchorEl(searchInputRef.current);
    }
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFiltersAnchorEl(null);
  }, []);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applySearch = useCallback(
    (term) => {
      isSearchTriggeredByInputRef.current = true;
      const trimmed = String(term || "").trim();
      setFilters((prev) => ({ ...prev, searchQuery: trimmed }));
      setSearchVersion((prev) => prev + 1);
      onSearchApply?.();
    },
    [onSearchApply]
  );

  const handleSearchSubmit = useCallback(
    (event) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      applySearch(searchTerm);
    },
    [applySearch, searchTerm]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    handleCloseFilters();
    applySearch("");
  }, [applySearch, handleCloseFilters]);

  const activeFilters = useMemo(() => {
    const active = [];
    if (searchQuery) {
      active.push({ key: "search", label: `Buscar: ${searchQuery}` });
    }
    if (fechaDesde) {
      active.push({
        key: "desde",
        label: `Desde: ${formatDateToDDMMYYYY(fechaDesde)}`,
      });
    }
    if (fechaHasta) {
      active.push({
        key: "hasta",
        label: `Hasta: ${formatDateToDDMMYYYY(fechaHasta)}`,
      });
    }
    if (tipo) {
      active.push({
        key: "tipo",
        label: `Tipo: ${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}`,
      });
    }
    if (estado) {
      active.push({
        key: "estado",
        label: `Estado: ${estado.charAt(0).toUpperCase()}${estado.slice(1)}`,
      });
    }
    return active;
  }, [searchQuery, fechaDesde, fechaHasta, tipo, estado]);

  const filtersPayload = useMemo(() => {
    const payload = {};
    if (fechaDesde) payload.createdAtFrom = fechaDesde.toISOString();
    if (fechaHasta) payload.createdAtTo = fechaHasta.toISOString();
    if (tipo) payload.tipo = tipo;
    if (estado) payload.status = estado;
    if (searchQuery) payload.search = searchQuery;
    return payload;
  }, [fechaDesde, fechaHasta, tipo, estado, searchQuery]);

  return {
    filters,
    setFilter,
    filtersPayload,
    activeFilters,
    searchVersion,
    searchInputRef,
    filtersAnchorEl,
    filtersOpen,
    handleOpenFilters,
    handleCloseFilters,
    handleSearchSubmit,
    applySearch,
    handleClearFilters,
    isSearchTriggeredByInputRef,
  };
};

export default useErroresSyncFilters;
