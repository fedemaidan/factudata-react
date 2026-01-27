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

const INSIGHT_TYPES = [
  { value: 'operacion_cancelada', label: 'Operacion cancelada', isError: false },
  { value: 'opcion_no_reconocida', label: 'Opcion no reconocida', isError: false },
  { value: 'mensaje_no_entendido', label: 'Mensaje no entendido', isError: false },
  { value: 'datos_incompletos', label: 'Datos incompletos', isError: true },
  { value: 'eliminacion_fallida', label: 'Eliminacion fallida', isError: true },
  { value: 'movimiento_no_encontrado', label: 'Movimiento no encontrado', isError: true },
];

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

  const filteredInsightTypes = useMemo(() => {
    const category = filters?.insightCategory;
    if (!category || category === 'todos') return INSIGHT_TYPES;
    if (category === 'error') return INSIGHT_TYPES.filter((t) => t.isError);
    return INSIGHT_TYPES;
  }, [filters?.insightCategory]);

  const handleFilterChange = (field, value) => {
    onFiltersChange?.({ ...filters, [field]: value });
  };

  const handleApply = () => setOpen(false);

  const handleRestart = () => {
    onFiltersChange?.({ 
      ...filters, 
      fechaDesde: "", 
      fechaHasta: "", 
      creadaDesde: "", 
      creadaHasta: "", 
      empresaId: "", 
      tipoContacto: "todos", 
      showInsight: false,
      insightCategory: "todos",
      insightTypes: [],
    });
  };

  const hasActiveFilters = 
    filters?.fechaDesde || 
    filters?.fechaHasta || 
    filters?.creadaDesde ||
    filters?.creadaHasta ||
    filters?.empresaId || 
    (filters?.tipoContacto && filters.tipoContacto !== "todos") ||
    filters?.showInsight;

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
            width: { xs: 340, sm: 400 },
            maxWidth: "90vw",
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

          <Box
            sx={{
              p: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Box sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>Último mensaje</Box>
            <Box sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.75 }}>
              Fecha del último mensaje en la conversación
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              <TextField
                label="Desde"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={getDateInputValue(filters?.fechaDesde)}
                onChange={(e) => handleFilterChange("fechaDesde", e.target.value)}
                fullWidth
                size="small"
                variant="filled"
              />
              <TextField
                label="Hasta"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={getDateInputValue(filters?.fechaHasta)}
                onChange={(e) => handleFilterChange("fechaHasta", e.target.value)}
                fullWidth
                size="small"
                variant="filled"
              />
            </Box>
          </Box>

          <Box
            sx={{
              p: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Box sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>Creación</Box>
            <Box sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.75 }}>
              Fecha en que se creó la conversación
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              <TextField
                label="Desde"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={getDateInputValue(filters?.creadaDesde)}
                onChange={(e) => handleFilterChange("creadaDesde", e.target.value)}
                fullWidth
                size="small"
                variant="filled"
              />
              <TextField
                label="Hasta"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={getDateInputValue(filters?.creadaHasta)}
                onChange={(e) => handleFilterChange("creadaHasta", e.target.value)}
                fullWidth
                size="small"
                variant="filled"
              />
            </Box>
          </Box>

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
                checked={filters?.showInsight || false}
                onChange={(e) => handleFilterChange("showInsight", e.target.checked)}
                size="small"
              />
            }
            label="Mostrar insights"
            sx={{ ml: 0, mt: 0.5 }}
          />

          {filters?.showInsight && (
            <Box
              sx={{
                p: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ fontWeight: 600, fontSize: "0.8125rem", mb: 0.75 }}>Filtros de insight</Box>
              <Stack spacing={1}>
                <TextField
                  select
                  label="Categoria"
                  value={filters?.insightCategory || "todos"}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    if (newCategory !== filters?.insightCategory) {
                      onFiltersChange?.({ ...filters, insightCategory: newCategory, insightTypes: [] });
                    } else {
                      handleFilterChange("insightCategory", newCategory);
                    }
                  }}
                  fullWidth
                  size="small"
                  variant="filled"
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="error">Solo errores</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Tipo"
                  value={filters?.insightTypes?.[0] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleFilterChange("insightTypes", val ? [val] : []);
                  }}
                  fullWidth
                  size="small"
                  variant="filled"
                >
                  <MenuItem value="">Todos los tipos</MenuItem>
                  {filteredInsightTypes.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>
          )}

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

