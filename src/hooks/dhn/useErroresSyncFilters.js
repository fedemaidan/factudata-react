import { useCallback, useMemo, useRef, useState } from "react";
import { formatDateToDDMMYYYY } from "src/utils/handleDates";

const toLocalDateString = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const DEFAULT_FILTERS = {
  searchTerm: "",
  searchQuery: "",
  fechaDetectadaDesde: null,
  fechaDetectadaHasta: null,
  fechaDocumentoDesde: null,
  fechaDocumentoHasta: null,
  tipo: "",
  estado: "",
};

const useErroresSyncFilters = ({ onSearchApply } = {}) => {
  const searchInputRef = useRef(null);
  const isSearchTriggeredByInputRef = useRef(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchVersion, setSearchVersion] = useState(0);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState(null);

  const {
    fechaDetectadaDesde,
    fechaDetectadaHasta,
    fechaDocumentoDesde,
    fechaDocumentoHasta,
    tipo,
    estado,
    searchTerm,
    searchQuery,
  } = filters;
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
    if (fechaDetectadaDesde) {
      active.push({
        key: "fechaDetectadaDesde",
        label: `Fecha detectada desde: ${formatDateToDDMMYYYY(fechaDetectadaDesde)}`,
      });
    }
    if (fechaDetectadaHasta) {
      active.push({
        key: "fechaDetectadaHasta",
        label: `Fecha detectada hasta: ${formatDateToDDMMYYYY(fechaDetectadaHasta)}`,
      });
    }
    if (fechaDocumentoDesde) {
      active.push({
        key: "fechaDocumentoDesde",
        label: `Fecha documento desde: ${formatDateToDDMMYYYY(fechaDocumentoDesde)}`,
      });
    }
    if (fechaDocumentoHasta) {
      active.push({
        key: "fechaDocumentoHasta",
        label: `Fecha documento hasta: ${formatDateToDDMMYYYY(fechaDocumentoHasta)}`,
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
  }, [
    searchQuery,
    fechaDetectadaDesde,
    fechaDetectadaHasta,
    fechaDocumentoDesde,
    fechaDocumentoHasta,
    tipo,
    estado,
  ]);

  const filtersPayload = useMemo(() => {
    const payload = {};
    if (fechaDetectadaDesde) payload.fechaDetectadaFrom = toLocalDateString(fechaDetectadaDesde);
    if (fechaDetectadaHasta) payload.fechaDetectadaTo = toLocalDateString(fechaDetectadaHasta);
    if (fechaDocumentoDesde) payload.createdAtFrom = fechaDocumentoDesde.toISOString();
    if (fechaDocumentoHasta) payload.createdAtTo = fechaDocumentoHasta.toISOString();
    if (tipo) payload.tipo = tipo;
    if (estado) payload.status = estado;
    if (searchQuery) payload.search = searchQuery;
    return payload;
  }, [
    fechaDetectadaDesde,
    fechaDetectadaHasta,
    fechaDocumentoDesde,
    fechaDocumentoHasta,
    tipo,
    estado,
    searchQuery,
  ]);

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
