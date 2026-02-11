import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Chip,
  Popover,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

const FiltroErrores = ({
  filterContext,
  onActualizar,
  onIniciarCorreccion,
  isLoading,
  isCargandoCorreccion,
  totalDisponibles,
}) => {
  const {
    filters,
    setFilter,
    handleSearchSubmit,
    filtersOpen,
    filtersAnchorEl,
    handleOpenFilters,
    handleCloseFilters,
    handleClearFilters,
    activeFilters,
    searchInputRef,
  } = filterContext;

  return (
    <Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 2, mb: 1, alignItems: "center", flexWrap: "wrap" }}
      >
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: "flex", gap: 1 }}>
          <TextField
            inputRef={searchInputRef}
            label="Buscar"
            placeholder="Archivo, carpeta, fecha, observación o estado"
            size="small"
            variant="outlined"
            value={filters.searchTerm}
            onChange={(event) => setFilter("searchTerm", event.target.value)}
            sx={{ width: 260 }}
            inputProps={{ "aria-label": "Buscar errores", type: "search" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <IconButton
          aria-label="Filtros"
          size="small"
          onClick={handleOpenFilters}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: filtersOpen ? "primary.main" : "divider",
            color: filtersOpen ? "primary.main" : "text.primary",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <FilterListIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button variant="outlined" size="small" onClick={onActualizar} disabled={isLoading}>
            {isLoading ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onIniciarCorreccion}
            disabled={isLoading || isCargandoCorreccion || totalDisponibles === 0}
          >
            {isCargandoCorreccion ? "Cargando..." : "Corrección asistida"}
          </Button>
        </Box>
      </Stack>

      <Popover
        open={filtersOpen}
        onClose={handleCloseFilters}
        anchorEl={filtersAnchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            p: 1.5,
            minWidth: 300,
            maxWidth: 360,
          },
        }}
      >
        <Stack spacing={1.25}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Más filtros
            </Typography>
            <IconButton size="small" onClick={handleCloseFilters} sx={{ p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <DatePicker
            label="Desde"
            value={filters.fechaDesde}
            onChange={(value) => setFilter("fechaDesde", value)}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
          <DatePicker
            label="Hasta"
            value={filters.fechaHasta}
            onChange={(value) => setFilter("fechaHasta", value)}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
          <TextField
            select
            label="Tipo"
            value={filters.tipo}
            onChange={(e) => setFilter("tipo", e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="parte">Parte</MenuItem>
            <MenuItem value="licencia">Licencia</MenuItem>
            <MenuItem value="horas">Horas</MenuItem>
          </TextField>
          <TextField
            select
            label="Estado"
            value={filters.estado}
            onChange={(e) => setFilter("estado", e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ok">Ok</MenuItem>
            <MenuItem value="incompleto">Incompleto</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="duplicado">Duplicado</MenuItem>
          </TextField>
          <Divider />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" fullWidth onClick={handleClearFilters}>
              Limpiar
            </Button>
            <Button size="small" variant="contained" fullWidth onClick={handleCloseFilters}>
              Cerrar
            </Button>
          </Stack>
        </Stack>
      </Popover>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {activeFilters.length > 0 ? (
          activeFilters.map((filter) => (
            <Chip key={filter.key} label={filter.label} size="small" variant="outlined" />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sin filtros activos
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default FiltroErrores;
