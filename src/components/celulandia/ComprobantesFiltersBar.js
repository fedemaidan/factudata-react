import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Box,
  Stack,
  TextField,
  IconButton,
  InputAdornment,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Divider,
  Button,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { formatearMonto, parsearMonto } from "src/utils/celulandia/separacionMiles";

const dateFilterOptions = [
  { value: "todos", label: "Todos" },
  { value: "hoy", label: "Hoy" },
  { value: "estaSemana", label: "Esta semana" },
  { value: "esteMes", label: "Este mes" },
  { value: "esteAño", label: "Este año" },
];

/**
 * Barra de filtros compacta para Comprobantes:
 * - Campo Buscar con debouncer (usa onSearchDebounced del padre)
 * - Botón de filtros que abre Popover con todos los filtros restantes
 */
const ComprobantesFiltersBar = ({
  // búsqueda
  onSearchDebounced,
  initialSearch = "",
  // fecha
  filtroFecha,
  onFiltroFechaChange,
  // data para selects
  clientes = [],
  cajas = [],
  usuariosOptions = [{ value: "", label: "(todos)" }],
  // valores actuales
  filtroNombreCliente,
  setFiltroNombreCliente,
  filtroMoneda,
  setFiltroMoneda,
  filtroCuentaCorriente,
  setFiltroCuentaCorriente,
  selectedCajaNombre,
  setSelectedCajaNombre,
  filtroUsuario,
  setFiltroUsuario,
  montoDesde,
  setMontoDesde,
  montoHasta,
  setMontoHasta,
  montoTipo,
  setMontoTipo,
}) => {
  const [searchLocal, setSearchLocal] = useState(initialSearch || "");
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const lastEmittedSearchRef = useRef((initialSearch || "").trim());

  useEffect(() => {
    const next = initialSearch || "";
    setSearchLocal((prev) => (prev === next ? prev : next));
    lastEmittedSearchRef.current = (next || "").trim();
  }, [initialSearch]);

  const emitSearch = useCallback(
    (rawValue) => {
      if (typeof onSearchDebounced !== "function") return;
      const next = (rawValue || "").trim();
      if (lastEmittedSearchRef.current === next) return;
      lastEmittedSearchRef.current = next;
      onSearchDebounced(next);
    },
    [onSearchDebounced]
  );

  const handleSearchChange = useCallback(
    (e) => {
      const rawValue = e?.target?.value ?? "";
      setSearchLocal(rawValue);
      emitSearch(rawValue);
    },
    [emitSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchLocal("");
    emitSearch("");
  }, [emitSearch]);

  const clienteOptions = useMemo(() => {
    return Array.from(
      new Set(
        (clientes || [])
          .map((c) => (c?.nombre || "").toString().trim())
          .filter((n) => n && n.length > 0)
      )
    )
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  }, [clientes]);

  const cajasOptions = useMemo(() => {
    return [{ value: "", label: "Todas" }].concat(
      (Array.isArray(cajas) ? cajas : []).map((caja) => ({
        value: caja?.nombre || "",
        label: caja?.nombre || "-",
      }))
    );
  }, [cajas]);

  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <TextField
          inputRef={anchorRef}
          label="Buscar"
          size="small"
          value={searchLocal}
          onChange={handleSearchChange}
          sx={{ width: 220 }}
          InputProps={{
            endAdornment: searchLocal.length > 0 && (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClearSearch}
                  edge="end"
                  size="small"
                  sx={{ color: "text.secondary" }}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <IconButton
          aria-label="Filtros"
          onClick={() => setOpen(true)}
          size="small"
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            ml: 0.5,
          }}
        >
          <FilterListIcon fontSize="small" />
        </IconButton>

        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchorEl={anchorRef.current}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: {
              p: 1.25,
              minWidth: 320,
              maxWidth: 380,
            },
          }}
        >
          <Stack spacing={1}>
            {/* Header con botón cerrar */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Box sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Filtros</Box>
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ p: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <FormControl size="small" fullWidth variant="filled">
              <InputLabel size="small">Filtrar por fecha</InputLabel>
              <Select
                size="small"
                value={filtroFecha}
                label="Filtrar por fecha"
                onChange={(e) => onFiltroFechaChange && onFiltroFechaChange(e.target.value)}
              >
                {dateFilterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              options={clienteOptions}
              size="small"
              value={
                filtroNombreCliente
                  ? { value: filtroNombreCliente, label: filtroNombreCliente }
                  : null
              }
              onChange={(_, v) => setFiltroNombreCliente(v?.value || "")}
              renderInput={(params) => (
                <TextField {...params} label="Cliente" variant="filled" />
              )}
              isOptionEqualToValue={(opt, v) => opt.value === v.value}
            />

            <FormControl size="small" fullWidth variant="filled">
              <InputLabel size="small">Moneda</InputLabel>
              <Select
                size="small"
                value={filtroMoneda}
                label="Moneda"
                onChange={(e) => setFiltroMoneda(e.target.value)}
              >
                <MenuItem value="">(todas)</MenuItem>
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth variant="filled">
              <InputLabel size="small">CC</InputLabel>
              <Select
                size="small"
                value={filtroCuentaCorriente}
                label="CC"
                onChange={(e) => setFiltroCuentaCorriente(e.target.value)}
              >
                <MenuItem value="">(todas)</MenuItem>
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD OFICIAL">USD OFICIAL</MenuItem>
                <MenuItem value="USD BLUE">USD BLUE</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth variant="filled">
              <InputLabel size="small">Cuenta destino</InputLabel>
              <Select
                size="small"
                value={selectedCajaNombre}
                label="Cuenta destino"
                onChange={(e) => setSelectedCajaNombre(e.target.value)}
              >
                {cajasOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth variant="filled">
              <InputLabel size="small">Usuario</InputLabel>
              <Select
                size="small"
                value={filtroUsuario}
                label="Usuario"
                onChange={(e) => setFiltroUsuario(e.target.value)}
              >
                {usuariosOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <Stack direction="row" spacing={0.5}>
              <Chip
                label="Monto Enviado"
                size="small"
                color={montoTipo === "enviado" ? "primary" : "default"}
                variant={montoTipo === "enviado" ? "filled" : "outlined"}
                onClick={() => setMontoTipo("enviado")}
                sx={{ height: 24, borderRadius: 2, fontSize: 12 }}
              />
              <Chip
                label="Monto CC"
                size="small"
                color={montoTipo === "cc" ? "primary" : "default"}
                variant={montoTipo === "cc" ? "filled" : "outlined"}
                onClick={() => setMontoTipo("cc")}
                sx={{ height: 24, borderRadius: 2, fontSize: 12 }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Desde"
                size="small"
                type="text"
                value={formatearMonto(montoDesde)}
                onChange={(e) => {
                  const valorParseado = parsearMonto(e.target.value);
                  if (valorParseado === "" || !isNaN(Number(valorParseado))) {
                    setMontoDesde(valorParseado);
                  }
                }}
                fullWidth
              />
              <TextField
                label="Hasta"
                size="small"
                type="text"
                value={formatearMonto(montoHasta)}
                onChange={(e) => {
                  const valorParseado = parsearMonto(e.target.value);
                  if (valorParseado === "" || !isNaN(Number(valorParseado))) {
                    setMontoHasta(valorParseado);
                  }
                }}
                fullWidth
              />
            </Stack>

            <Divider />

            {/* Botones de acción */}
            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => {
                  // Restablecer todos los filtros
                  onFiltroFechaChange && onFiltroFechaChange("todos");
                  setFiltroNombreCliente("");
                  setFiltroMoneda("");
                  setFiltroCuentaCorriente("");
                  setSelectedCajaNombre("");
                  setFiltroUsuario("");
                  setMontoDesde("");
                  setMontoHasta("");
                  setMontoTipo("enviado");
                }}
                fullWidth
                sx={{ fontSize: "0.75rem" }}
              >
                Restablecer
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => setOpen(false)}
                fullWidth
                sx={{ fontSize: "0.75rem" }}
              >
                Cerrar
              </Button>
            </Stack>
          </Stack>
        </Popover>
      </Stack>
    </Box>
  );
};

export default ComprobantesFiltersBar;


