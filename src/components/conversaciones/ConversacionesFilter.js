import { useState, useRef, useEffect, useMemo } from "react";
import {
  IconButton,
  Popover,
  Box,
  TextField,
  Stack,
  Button,
  Autocomplete,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useConversationsContext } from "src/contexts/conversations-context";
import { getAllEmpresas } from "src/services/empresaService";

const getDateInputValue = (dateString = "") => {
  if (!dateString) return "";
  return dateString.includes("T") ? dateString.split("T")[0] : dateString;
};

const ConversacionesFilter = () => {
  const { filters = {}, onFiltersChange } = useConversationsContext();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  useEffect(() => {
    const loadEmpresas = async () => {
      setLoadingEmpresas(true);
      try {
        const empresasList = await getAllEmpresas();
        setEmpresas(empresasList);
      } catch (error) {
        console.error("Error al cargar empresas:", error);
      } finally {
        setLoadingEmpresas(false);
      }
    };
    loadEmpresas();
  }, []);

  const empresaOptions = useMemo(() => {
    return (empresas || [])
      .map((empresa) => {
        const nombre = (empresa?.nombre || empresa?.id || "").toString().trim();
        return {
          value: empresa.id,
          label: nombre,
        };
      })
      .filter((opt) => opt.label && opt.label.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [empresas]);

  const handleFilterChange = (field, value) => {
    onFiltersChange?.({ ...filters, [field]: value });
  };

  const handleApply = () => setOpen(false);

  const handleRestart = () => {
    onFiltersChange?.({ ...filters, fechaDesde: "", fechaHasta: "", empresaId: "", tipoContacto: "todos", showErrors: false });
  };

  const hasActiveFilters = 
    filters?.fechaDesde || 
    filters?.fechaHasta || 
    filters?.empresaId || 
    (filters?.tipoContacto && filters.tipoContacto !== "todos") ||
    filters?.showErrors;

  return (
    <>
      <IconButton
        ref={anchorRef}
        aria-label="Filtros"
        onClick={() => setOpen(true)}
        size="small"
        sx={{
          flexShrink: 0,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          color: hasActiveFilters ? "primary.main" : "action.active",
        }}
        title="Filtros"
      >
        <FilterListIcon fontSize="small" />
      </IconButton>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={anchorRef.current}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            p: 1.25,
            minWidth: 320,
            maxWidth: 380,
          },
        }}
      >
        <Stack spacing={1}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0.5,
            }}
          >
            <Box sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Filtros</Box>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ p: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <TextField
            label="Último mensaje desde"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={getDateInputValue(filters?.fechaDesde)}
            onChange={(e) => handleFilterChange("fechaDesde", e.target.value)}
            fullWidth
            size="small"
            variant="filled"
          />

          <TextField
            label="Último mensaje hasta"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={getDateInputValue(filters?.fechaHasta)}
            onChange={(e) => handleFilterChange("fechaHasta", e.target.value)}
            fullWidth
            size="small"
            variant="filled"
          />

          <Autocomplete
            options={empresaOptions}
            size="small"
            loading={loadingEmpresas}
            getOptionLabel={(option) => option?.label || ""}
            value={
              filters?.empresaId
                ? empresaOptions.find((opt) => opt.value === filters.empresaId) || null
                : null
            }
            onChange={(_, v) => handleFilterChange("empresaId", v?.value || "")}
            renderInput={(params) => (
              <TextField {...params} label="Empresa" variant="filled" />
            )}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.value || key} {...optionProps}>
                  {option.label}
                </li>
              );
            }}
            isOptionEqualToValue={(opt, v) => opt?.value === v?.value}
            noOptionsText={loadingEmpresas ? "Cargando empresas..." : "Sin empresas"}
          />

          <TextField
            select
            label="Tipo de contacto"
            value={filters?.tipoContacto || "todos"}
            onChange={(e) => handleFilterChange("tipoContacto", e.target.value)}
            fullWidth
            size="small"
            variant="filled"
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="cliente">Cliente</MenuItem>
            <MenuItem value="noCliente">No cliente</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={filters?.showErrors || false}
                onChange={(e) => handleFilterChange("showErrors", e.target.checked)}
                size="small"
              />
            }
            label="Mostrar errores"
            sx={{ ml: 0, mt: 0.5 }}
          />

          <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleRestart}
              disabled={!hasActiveFilters}
              fullWidth
              sx={{ fontSize: "0.75rem" }}
            >
              Restablecer
            </Button>
            <Button
              size="small"
              variant="contained"
            onClick={handleApply}
              fullWidth
              sx={{ fontSize: "0.75rem" }}
            >
              Aplicar
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
};

export default ConversacionesFilter;

