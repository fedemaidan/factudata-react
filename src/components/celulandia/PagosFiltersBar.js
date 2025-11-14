import React, { useRef, useState, useEffect } from "react";
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
  Divider,
  Button,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import useDebouncedValue from "src/hooks/useDebouncedValue";
import { formatearMonto, parsearMonto } from "src/utils/celulandia/separacionMiles";

const dateFilterOptions = [
  { value: "todos", label: "Todos" },
  { value: "hoy", label: "Hoy" },
  { value: "estaSemana", label: "Esta semana" },
  { value: "esteMes", label: "Este mes" },
  { value: "esteAño", label: "Este año" },
];

const PagosFiltersBar = ({
  // búsqueda
  onSearchDebounced,
  initialSearch = "",
  // fecha
  filtroFecha,
  onFiltroFechaChange,
  // data
  cajas = [],
  // valores y setters
  filtroMoneda,
  setFiltroMoneda,
  selectedCajaNombre,
  setSelectedCajaNombre,
  montoDesde,
  setMontoDesde,
  montoHasta,
  setMontoHasta,
}) => {
  const [searchLocal, setSearchLocal] = useState(initialSearch || "");
  const debouncedSearch = useDebouncedValue(searchLocal, 500);
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof onSearchDebounced === "function") {
      onSearchDebounced((debouncedSearch || "").trim());
    }
  }, [debouncedSearch, onSearchDebounced]);

  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <TextField
          inputRef={anchorRef}
          label="Buscar"
          size="small"
          value={searchLocal}
          onChange={(e) => setSearchLocal(e.target.value)}
          sx={{ width: 220 }}
          InputProps={{
            endAdornment: searchLocal.length > 0 && (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setSearchLocal("")}
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Box sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Filtros</Box>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ p: 0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Fecha primero */}
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
              <InputLabel size="small">Cuenta de Origen</InputLabel>
              <Select
                size="small"
                value={selectedCajaNombre}
                label="Cuenta de Origen"
                onChange={(e) => setSelectedCajaNombre(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {(Array.isArray(cajas) ? cajas : []).map((caja) => (
                  <MenuItem key={caja?._id || caja?.nombre} value={caja?.nombre || ""}>
                    {caja?.nombre || "-"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <Stack direction="row" spacing={1}>
              <TextField
                label="Monto desde"
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
                label="Monto hasta"
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

            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => {
                  onFiltroFechaChange && onFiltroFechaChange("todos");
                  setFiltroMoneda("");
                  setSelectedCajaNombre("");
                  setMontoDesde("");
                  setMontoHasta("");
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

export default PagosFiltersBar;


