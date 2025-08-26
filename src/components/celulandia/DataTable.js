import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import Divider from "@mui/material/Divider";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
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
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(null);

  // Usar filtro externo si está en modo serverSide
  const currentFiltroFecha =
    serverSide && externalFiltroFecha !== undefined ? externalFiltroFecha : filtroFecha;
  const ordenCampo = sortField;
  const ordenDireccion = sortDirection;

  const handleSort = (campo) => {
    if (onSortChange) {
      onSortChange(campo);
    }
  };

  const getSortIcon = (campo) => {
    if (ordenCampo === campo) {
      return ordenDireccion === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  const dataFiltrados = useMemo(() => {
    let filtered = [...data];

    // En modo serverSide, no filtrar en frontend - los datos ya vienen filtrados del backend
    if (serverSide) {
      return filtered;
    }

    // Filtro por fecha (opciones predefinidas) - solo en modo cliente
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

    // Filtro por datepicker (día específico)
    if (showDatePicker && selectedDate) {
      const targetDay = dayjs(selectedDate).startOf("day");
      filtered = filtered.filter((item) => {
        const val = item[dateField];
        if (!val) return false;
        const d = dayjs(val);
        return d.isValid() && d.isSame(targetDay, "day");
      });
    }

    // Filtro por búsqueda
    if (showSearch && busqueda.trim()) {
      const searchTerm = busqueda.toLowerCase();
      filtered = filtered.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm);
        });
      });
    }

    // Aplicar filtros adicionales
    Object.keys(filters).forEach((key) => {
      if (filters[key] && filters[key] !== "todos") {
        filtered = filtered.filter((item) => item[key] === filters[key]);
      }
    });

    return filtered;
  }, [data, busqueda, filtroFecha, filters, searchFields]);

  const dataOrdenados = useMemo(() => {
    if (serverSide) {
      return dataFiltrados;
    }
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

  const formatValue = (value, field) => {
    if (formatters[field]) {
      return formatters[field](value);
    }
    return value;
  };

  // Función para renderizar el contenido de una celda de manera segura
  const renderCellContent = (item, column) => {
    if (column.render) {
      const renderedContent = column.render(item);
      // Asegurar que el contenido sea un ReactNode válido
      if (renderedContent === null || renderedContent === undefined) {
        return "-";
      }
      return renderedContent;
    }

    const value = item[column.key];
    if (value === null || value === undefined) {
      return "-";
    }

    const formattedValue = formatValue(value, column.key);
    if (formattedValue === null || formattedValue === undefined) {
      return "-";
    }

    return formattedValue;
  };

  // Función para obtener una key única para cada fila
  const getRowKey = (item, index) => {
    // Usar _id si está disponible, sino id, sino el índice
    return item._id || item.id || `row-${index}`;
  };

  // Función para manejar click en fila
  const handleRowClick = (event, item) => {
    // Si el click es en un checkbox, no hacer nada (se maneja por separado)
    if (event.target.type === "checkbox") {
      return;
    }

    // Si la columna tiene un render personalizado (como botones), no seleccionar
    const targetCell = event.target.closest("td");
    if (targetCell) {
      const columnIndex = Array.from(targetCell.parentNode.children).indexOf(targetCell);
      const column = columns[columnIndex];

      // Si es la columna de selección o tiene render personalizado, no hacer nada
      if (column?.key === "seleccionar" || (column?.render && column.key !== "seleccionar")) {
        return;
      }
    }

    // Buscar si la fila tiene una función de toggle (para selección)
    const selectColumn = columns.find((col) => col.key === "seleccionar");
    if (selectColumn && selectColumn.onRowClick) {
      selectColumn.onRowClick(item);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 2,
      }}
    >
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h4">{title}</Typography>
          </Stack>
        </Stack>
        <Divider />

        <Stack direction="row" spacing={2} alignItems="center">
          {showSearch && (
            <TextField
              label="Buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ minWidth: 300 }}
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
                "&:hover": {
                  boxShadow: 4,
                },
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
                          "&:hover": {
                            backgroundColor: alpha("#1976d2", 0.04),
                          },
                          ...(isSelected && {
                            backgroundColor: alpha("#1976d2", 0.08),
                            "&:hover": {
                              backgroundColor: alpha("#1976d2", 0.12),
                            },
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
