import { useCallback, useMemo, useRef, useState } from "react";
import { formatDateToDDMMYYYY } from "src/utils/handleDates";

const toJsDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.isValid === "function" && !value.isValid()) return null;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toLocalDateString = (value) => {
  const d = toJsDate(value);
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toIsoSafe = (value) => {
  const d = toJsDate(value);
  return d ? d.toISOString() : null;
};

const FECHA_DETECTADA_KEYS = ["fechaDetectadaDesde", "fechaDetectadaHasta"];
const FECHA_DOCUMENTO_KEYS = ["fechaDocumentoDesde", "fechaDocumentoHasta"];

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
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (value != null) {
        if (FECHA_DETECTADA_KEYS.includes(key)) {
          FECHA_DOCUMENTO_KEYS.forEach((k) => {
            next[k] = null;
          });
        } else if (FECHA_DOCUMENTO_KEYS.includes(key)) {
          FECHA_DETECTADA_KEYS.forEach((k) => {
            next[k] = null;
          });
        }
      }
      return next;
    });
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
    const fechaDetectadaFrom = toLocalDateString(fechaDetectadaDesde);
    const fechaDetectadaTo = toLocalDateString(fechaDetectadaHasta);
    const createdAtFrom = toIsoSafe(fechaDocumentoDesde);
    const createdAtTo = toIsoSafe(fechaDocumentoHasta);
    if (fechaDetectadaFrom) payload.fechaDetectadaFrom = fechaDetectadaFrom;
    if (fechaDetectadaTo) payload.fechaDetectadaTo = fechaDetectadaTo;
    if (createdAtFrom) payload.createdAtFrom = createdAtFrom;
    if (createdAtTo) payload.createdAtTo = createdAtTo;
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
