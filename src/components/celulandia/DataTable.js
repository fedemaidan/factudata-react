import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  TableContainer,
  Tooltip,
  Chip,
} from "@mui/material";
import Divider from "@mui/material/Divider";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import Pagination from "@mui/material/Pagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import { alpha } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const DataTable = ({
  title,
  data,
  isLoading,
  columns,
  onAdd,
  searchFields = [],
  dateFilterOptions = [
    { value: "todos", label: "Todos" },
    { value: "hoy", label: "Hoy" },
    { value: "estaSemana", label: "Esta semana" },
    { value: "esteMes", label: "Este mes" },
    { value: "esteAño", label: "Este año" },
  ],
  formatters = {},
  filters = {},
  dateField = "fecha",
  total,
  currentPage,
  rowsPerPage,
  onPageChange,
  sortField = "fechaFactura",
  sortDirection = "desc",
  onSortChange,
  showSearch = true,
  showDateFilterOptions = true,
  showDatePicker = false,
  serverSide = false,
  filtroFecha: externalFiltroFecha,
  onFiltroFechaChange,
  // soporte legacy para un solo select
  selectFilter = null,
  // NUEVO: múltiples selects server-side o client-side
  multipleSelectFilters = [],
  onRefresh = null,
  showRefreshButton = false,
  onSearchDebounced,
  searchDebounceMs = 500,
  // Mostrar un chip sutil en la columna "cliente" cuando el item tiene clienteId
  showClienteListedChip = false,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(null);
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // estado local para select único (legacy)
  const [selectFilterValue, setSelectFilterValue] = useState(selectFilter?.defaultValue || "todos");

  // estado local para múltiples selects en modo client-side
  const [localMultiSelects, setLocalMultiSelects] = useState(
    multipleSelectFilters.reduce((acc, f) => ({ ...acc, [f.key]: f.value ?? "" }), {})
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentFiltroFecha =
    serverSide && externalFiltroFecha !== undefined ? externalFiltroFecha : filtroFecha;
  const ordenCampo = sortField;
  const ordenDireccion = sortDirection;

  const handleSort = (campo) => {
    if (onSortChange) onSortChange(campo);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debounce simple para el campo de búsqueda (cuando se entregue onSearchDebounced)
  useEffect(() => {
    if (!onSearchDebounced) return;
    const id = setTimeout(() => setDebouncedTerm(busqueda.trim()), searchDebounceMs);
    return () => clearTimeout(id);
  }, [busqueda, onSearchDebounced, searchDebounceMs]);

  useEffect(() => {
    if (!onSearchDebounced) return;
    onSearchDebounced(debouncedTerm);
  }, [debouncedTerm, onSearchDebounced]);

  // Manejador para múltiples selects
  const handleMultiSelectChange = (key, value, onChange) => {
    if (serverSide && typeof onChange === "function") {
      onChange(value);
    } else {
      setLocalMultiSelects((prev) => ({ ...prev, [key]: value }));
    }
  };

  const dataFiltrados = useMemo(() => {
    let filtered = [...data];

    if (serverSide) {
      // En server-side no filtramos acá (ya viene filtrado)
      return filtered;
    }

    // Filtros por fecha (cliente)
    if (!showDatePicker && currentFiltroFecha !== "todos") {
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      switch (currentFiltroFecha) {
        case "hoy": {
          filtered = filtered.filter((item) => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= inicioDia;
          });
          break;
        }
        case "estaSemana": {
          const inicioSemana = new Date(inicioDia);
          inicioSemana.setDate(inicioDia.getDate() - inicioDia.getDay());
          filtered = filtered.filter((item) => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= inicioSemana;
          });
          break;
        }
        case "esteMes": {
          const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          filtered = filtered.filter((item) => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= inicioMes;
          });
          break;
        }
        case "esteAño": {
          const inicioAño = new Date(hoy.getFullYear(), 0, 1);
          filtered = filtered.filter((item) => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= inicioAño;
          });
          break;
        }
      }
    }

    if (showDatePicker && selectedDate) {
      const targetDay = dayjs(selectedDate).startOf("day");
      filtered = filtered.filter((item) => {
        const val = item[dateField];
        if (!val) return false;
        const d = dayjs(val);
        return d.isValid() && d.isSame(targetDay, "day");
      });
    }

    // Búsqueda
    if (showSearch && busqueda.trim()) {
      const searchTerm = busqueda.toLowerCase();
      filtered = filtered.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm);
        })
      );
    }

    // Select único (legacy)
    if (selectFilter && selectFilterValue !== "todos") {
      filtered = filtered.filter((item) => {
        const value = item[selectFilter.field];
        if (selectFilterValue === "ambas") {
          return value && (value.nombre === "CHEQUE" || value.nombre === "ECHEQ");
        }
        return value && value.nombre === selectFilterValue;
      });
    }

    // Múltiples selects en client-side (cuando no es serverSide)
    if (!serverSide && multipleSelectFilters.length > 0) {
      for (const f of multipleSelectFilters) {
        const val = localMultiSelects[f.key] ?? "";
        if (val !== "" && val !== "todos") {
          filtered = filtered.filter((item) => (item?.[f.key] ?? "") === val);
        }
      }
    }

    // Filtros adicionales
    Object.keys(filters).forEach((key) => {
      if (filters[key] && filters[key] !== "todos") {
        filtered = filtered.filter((item) => item[key] === filters[key]);
      }
    });

    return filtered;
  }, [
    data,
    busqueda,
    filtroFecha,
    filters,
    searchFields,
    selectFilter,
    selectFilterValue,
    serverSide,
    multipleSelectFilters,
    localMultiSelects,
    selectedDate,
    showDatePicker,
    currentFiltroFecha,
    dateField,
  ]);

  const dataOrdenados = useMemo(() => {
    if (serverSide) return dataFiltrados;
    return [...dataFiltrados].sort((a, b) => {
      let aVal = a[ordenCampo];
      let bVal = b[ordenCampo];

      if (ordenCampo === dateField) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (ordenDireccion === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [serverSide, dataFiltrados, ordenCampo, ordenDireccion, dateField]);

  const formatValue = (value, field, item) => {
    if (formatters[field]) {
      return formatters[field](value, item);
    }
    return value;
  };

  const renderCellContent = (item, column) => {
    if (column.render) {
      const renderedContent = column.render(item);
      if (renderedContent === null || renderedContent === undefined) return "-";
      return renderedContent;
    }

    const value = item[column.key];
    if (value === null || value === undefined) return "-";

    if (column.key === "cliente" && showClienteListedChip) {
      const hasClienteId = Boolean(item?.clienteId || item?.cliente?._id);
      const formattedValue = formatValue(value, column.key, item);
      if (hasClienteId) {
        return (
          <Chip
            label={formattedValue ?? "-"}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: 12 }}
          />
        );
      }
      return formattedValue ?? "-";
    }

    const formattedValue = formatValue(value, column.key, item);
    if (formattedValue === null || formattedValue === undefined) return "-";

    return formattedValue;
  };

  const getRowKey = (item, index) => item._id || item.id || `row-${index}`;

  const handleRowClick = (event, item) => {
    if (event.target.type === "checkbox") return;

    const targetCell = event.target.closest("td");
    if (targetCell) {
      const columnIndex = Array.from(targetCell.parentNode.children).indexOf(targetCell);
      const column = columns[columnIndex];
      if (column?.key === "seleccionar" || (column?.render && column.key !== "seleccionar")) return;
    }

    const selectColumn = columns.find((col) => col.key === "seleccionar");
    if (selectColumn && selectColumn.onRowClick) {
      selectColumn.onRowClick(item);
    }
  };

  const handleSelectFilterChange = (event) => {
    const newValue = event.target.value;
    setSelectFilterValue(newValue);
    if (serverSide && selectFilter?.onChange) {
      selectFilter.onChange(newValue);
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, pb: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h4">{title}</Typography>
          </Stack>
        </Stack>
        <Stack direction="row" sx={{ margin: 0, gap: 1 }} alignItems="center" flexWrap="wrap">
          {showSearch && (
            <TextField
              label="Buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ minWidth: 280 }}
              InputProps={{
                endAdornment: busqueda.length > 0 && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setBusqueda("")}
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
          )}

          {/* Select único (compatibilidad) */}
          {selectFilter && (
            <FormControl sx={{ minWidth: 200 }} variant="filled">
              <InputLabel id="select-filter-label">{selectFilter.label}</InputLabel>
              <Select
                labelId="select-filter-label"
                id="select-filter-select"
                value={selectFilterValue}
                label={selectFilter.label}
                onChange={handleSelectFilterChange}
              >
                {selectFilter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {multipleSelectFilters.map((f) => (
            <FormControl key={f.key} sx={{ minWidth: 200 }} variant="filled">
              <InputLabel id={`msf-${f.key}-label`}>{f.label}</InputLabel>
              <Select
                labelId={`msf-${f.key}-label`}
                id={`msf-${f.key}-select`}
                value={serverSide ? f.value ?? "" : localMultiSelects[f.key] ?? ""}
                label={f.label}
                onChange={(e) => handleMultiSelectChange(f.key, e.target.value, f.onChange)}
              >
                {(f.options || []).map((option) => (
                  <MenuItem key={`${f.key}-${option.value}`} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}

          {showDateFilterOptions && !showDatePicker && dateFilterOptions.length > 0 && (
            <FormControl sx={{ minWidth: 200 }} variant="filled">
              <InputLabel id="filtro-fecha-label">Filtrar por fecha</InputLabel>
              <Select
                labelId="filtro-fecha-label"
                id="filtro-fecha-select"
                value={currentFiltroFecha}
                label="Filtrar por fecha"
                onChange={(e) => {
                  if (serverSide && onFiltroFechaChange) {
                    onFiltroFechaChange(e.target.value);
                  } else {
                    setFiltroFecha(e.target.value);
                  }
                }}
              >
                {dateFilterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {showDatePicker && (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Seleccionar fecha"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                format="DD/MM/YYYY"
              />
            </LocalizationProvider>
          )}

          {showRefreshButton && onRefresh && (
            <Tooltip title="Actualizar datos">
              <IconButton
                onClick={handleRefresh}
                disabled={isRefreshing}
                sx={{
                  borderRadius: 2,
                  px: 1,
                  py: 1,
                  boxShadow: 1,
                  "&:hover": { boxShadow: 2 },
                }}
              >
                <RefreshIcon
                  sx={{
                    animation: isRefreshing ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          {onAdd && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={onAdd}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: 2,
                "&:hover": { boxShadow: 4 },
              }}
            >
              Agregar
            </Button>
          )}
        </Stack>

        <Box position="relative">
          <Paper sx={{ width: "100%", mb: 2 }}>
            <TableContainer>
              <Table
                stickyHeader
                size="small"
                sx={{
                  minWidth: 750,
                  "& .MuiTableCell-root": {
                    borderRight: "none !important",
                    borderLeft: "none !important",
                    fontSize: "0.8rem",
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    borderBottom: "1px solid rgba(224, 224, 224, 1)",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        padding={column.key === "seleccionar" ? "checkbox" : "normal"}
                        sx={{
                          cursor: column.sortable ? "pointer" : "default",
                          ...(column.key.includes("fecha") || column.key.includes("hora")
                            ? {
                                minWidth: "80px",
                                maxWidth: "100px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }
                            : {}),
                        }}
                      >
                        {column.sortable ? (
                          <TableSortLabel
                            active={ordenCampo === column.key}
                            direction={ordenCampo === column.key ? ordenDireccion : "asc"}
                            onClick={() => handleSort(column.key)}
                          >
                            {column.label}
                          </TableSortLabel>
                        ) : (
                          column.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataOrdenados.map((item, index) => {
                    const selectColumn = columns.find((col) => col.key === "seleccionar");
                    const isSelected = selectColumn?.render?.(item)?.props?.checked || false;

                    return (
                      <TableRow
                        key={getRowKey(item, index)}
                        hover
                        onClick={(event) => handleRowClick(event, item)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={-1}
                        selected={isSelected}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: alpha("#1976d2", 0.04) },
                          ...(isSelected && {
                            backgroundColor: alpha("#1976d2", 0.08),
                            "&:hover": { backgroundColor: alpha("#1976d2", 0.12) },
                          }),
                        }}
                      >
                        {columns.map((column) => (
                          <TableCell
                            key={`${getRowKey(item, index)}-${column.key}`}
                            padding={column.key === "seleccionar" ? "checkbox" : "normal"}
                            sx={{
                              textDecoration: item.active === false ? "line-through" : "none",
                              opacity: item.active === false ? 0.6 : 1,
                              color: item.active === false ? "text.disabled" : "text.primary",
                              ...(column.key.includes("fecha") || column.key.includes("hora")
                                ? {
                                    minWidth: "80px",
                                    maxWidth: "100px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }
                                : {}),
                            }}
                          >
                            {renderCellContent(item, column)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          {isLoading && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              justifyContent="center"
              alignItems="center"
              bgcolor="rgba(255,255,255,0.6)"
              zIndex={1}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Stack>

      {total && onPageChange && (
        <Stack alignItems="center" mt={2}>
          <Pagination
            count={Math.ceil(total / rowsPerPage)}
            page={currentPage}
            onChange={(event, value) => onPageChange(value)}
            color="primary"
          />
        </Stack>
      )}
    </Box>
  );
};

export default DataTable;
