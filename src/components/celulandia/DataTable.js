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
} from "@mui/material";
import Divider from "@mui/material/Divider";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";

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
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [ordenCampo, setOrdenCampo] = useState(dateField);
  const [ordenDireccion, setOrdenDireccion] = useState("desc");

  const handleSort = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDireccion("asc");
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

    // Filtro por fecha
    if (filtroFecha !== "todos") {
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      switch (filtroFecha) {
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

    // Filtro por búsqueda
    if (busqueda.trim()) {
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
  }, [dataFiltrados, ordenCampo, ordenDireccion]);

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

          {dateFilterOptions.length > 0 && (
            <FormControl sx={{ minWidth: 200 }} variant="filled">
              <InputLabel id="filtro-fecha-label">Filtrar por fecha</InputLabel>
              <Select
                labelId="filtro-fecha-label"
                id="filtro-fecha-select"
                value={filtroFecha}
                label="Filtrar por fecha"
                onChange={(e) => setFiltroFecha(e.target.value)}
              >
                {dateFilterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper>
            <Table
              stickyHeader
              sx={{
                "& .MuiTableCell-root": {
                  borderRight: "none !important",
                  borderLeft: "none !important",
                },
                "& .MuiTableHead-root .MuiTableCell-root": {
                  borderBottom: "1px solid rgba(224, 224, 224, 1)",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                      sx={{
                        fontWeight: "bold",
                        cursor: column.sortable ? "pointer" : "default",
                      }}
                    >
                      {column.label}
                      {column.sortable && getSortIcon(column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dataOrdenados.map((item, index) => (
                  <TableRow key={getRowKey(item, index)}>
                    {columns.map((column) => (
                      <TableCell key={`${getRowKey(item, index)}-${column.key}`}>
                        {renderCellContent(item, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default DataTable;
