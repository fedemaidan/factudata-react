import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  TableSortLabel,
  TablePagination,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { formatCurrency } from "src/utils/formatters";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const DataTabTable = ({
  items = [],
  isLoading = false,
  options = [],
  defaultOption,
  showSearch = true,
  showDateFilterOptions = true,
  showDatePicker = false,
  selectedDate = null,
  onDateChange = null,
  onRefresh = null,
  showRefreshButton = false,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [internalSelectedDate, setInternalSelectedDate] = useState(null);
  const [currentOption, setCurrentOption] = useState(defaultOption || options?.[0]?.value || "");
  const [sortField, setSortField] = useState("fecha");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }
  };

  // Función para manejar la actualización
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

  const applyDateFilter = (rows, filtro) => {
    if (filtro === "todos") return rows;
    const now = new Date();
    const start = new Date(now);
    if (filtro === "hoy") {
      start.setHours(0, 0, 0, 0);
    } else if (filtro === "estaSemana") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (filtro === "esteMes") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (filtro === "esteAño") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    return rows.filter((r) => new Date(r.fecha) >= start);
  };

  const sortedAndFilteredItems = useMemo(() => {
    let rows = items;

    // Filtros
    if (showSearch && busqueda.trim()) {
      const q = busqueda.toLowerCase();
      rows = rows.filter((r) =>
        [r.cliente, r.monto?.toString()].some((v) => v && v.toLowerCase().includes(q))
      );
    }
    if (showDateFilterOptions) {
      rows = applyDateFilter(rows, filtroFecha);
    }
    // Filtro por DatePicker (día específico) - solo si no hay callback externo
    if (showDatePicker && !onDateChange && (selectedDate || internalSelectedDate)) {
      const dateToUse = selectedDate || internalSelectedDate;
      const targetDay = dayjs(dateToUse).startOf("day");
      rows = rows.filter((it) => {
        const val = it.fecha;
        if (!val) return false;
        const d = dayjs(val);
        return d.isValid() && d.isSame(targetDay, "day");
      });
    }

    // Ordenamiento
    if (sortField) {
      rows.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Manejo especial para fechas
        if (sortField === "fecha") {
          aVal = new Date(aVal || 0);
          bVal = new Date(bVal || 0);
        }
        // Manejo especial para números
        else if (sortField === "monto") {
          aVal = parseFloat(aVal || 0);
          bVal = parseFloat(bVal || 0);
        }
        // Manejo para strings
        else if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [
    items,
    busqueda,
    filtroFecha,
    selectedDate,
    sortField,
    sortDirection,
    showSearch,
    showDateFilterOptions,
    showDatePicker,
  ]);

  const grouped = useMemo(() => {
    const map = new Map();
    options.forEach((opt) => map.set(opt.value, []));
    sortedAndFilteredItems.forEach((it) => {
      const key = it.group;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });
    return map;
  }, [sortedAndFilteredItems, options]);

  const paginatedGrouped = useMemo(() => {
    const map = new Map();
    for (const [key, items] of grouped.entries()) {
      const startIndex = page * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      map.set(key, items.slice(startIndex, endIndex));
    }
    return map;
  }, [grouped, page, rowsPerPage]);

  const totals = useMemo(() => {
    const res = new Map();
    for (const [k, arr] of grouped.entries()) {
      const sum = arr.reduce((acc, it) => acc + (it.monto || 0), 0);
      res.set(k, sum);
    }
    return res;
  }, [grouped]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            {showSearch && (
              <TextField
                label="Buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                sx={{ minWidth: 300 }}
              />
            )}
            {showDateFilterOptions && (
              <FormControl sx={{ minWidth: 200 }} variant="filled">
                <InputLabel id="filtro-fecha-label">Filtrar por fecha</InputLabel>
                <Select
                  labelId="filtro-fecha-label"
                  id="filtro-fecha-select"
                  value={filtroFecha}
                  label="Filtrar por fecha"
                  onChange={(e) => setFiltroFecha(e.target.value)}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="hoy">Hoy</MenuItem>
                  <MenuItem value="estaSemana">Esta semana</MenuItem>
                  <MenuItem value="esteMes">Este mes</MenuItem>
                  <MenuItem value="esteAño">Este año</MenuItem>
                </Select>
              </FormControl>
            )}
            {showDatePicker && (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Seleccionar fecha"
                  value={onDateChange ? selectedDate : internalSelectedDate}
                  onChange={(newValue) => {
                    if (onDateChange) {
                      onDateChange(newValue);
                    } else {
                      setInternalSelectedDate(newValue);
                    }
                  }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
            )}

            {/* Botón de actualización */}
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
                    "&:hover": {
                      boxShadow: 2,
                    },
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
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexGrow: 1, justifyContent: "flex-end" }}>
            {options.map((opt) => (
              <Button
                key={opt.value}
                variant={currentOption === opt.value ? "contained" : "outlined"}
                color="primary"
                onClick={() => setCurrentOption(opt.value)}
                sx={{ py: 2, minWidth: 160 }}
              >
                {opt.label}: {formatCurrency(Math.round(totals.get(opt.value) || 0))}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Stack>

      {options.map((opt) => (
        <div key={opt.value} role="tabpanel" hidden={currentOption !== opt.value}>
          {currentOption === opt.value && (
            <Box sx={{ pt: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", cursor: "pointer" }}>
                      <TableSortLabel
                        active={sortField === "fecha"}
                        direction={sortField === "fecha" ? sortDirection : "asc"}
                        onClick={() => handleSortChange("fecha")}
                      >
                        Fecha
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", cursor: "pointer" }}>
                      <TableSortLabel
                        active={sortField === "cliente"}
                        direction={sortField === "cliente" ? sortDirection : "asc"}
                        onClick={() => handleSortChange("cliente")}
                      >
                        Cliente
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", cursor: "pointer" }}>
                      <TableSortLabel
                        active={sortField === "monto"}
                        direction={sortField === "monto" ? sortDirection : "asc"}
                        onClick={() => handleSortChange("monto")}
                      >
                        Monto ({opt.label})
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Tipo de Cambio</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Descuento</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Monto Original (sin descuento)
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", cursor: "pointer" }}>
                      <TableSortLabel
                        active={sortField === "monedaOriginal"}
                        direction={sortField === "monedaOriginal" ? sortDirection : "asc"}
                        onClick={() => handleSortChange("monedaOriginal")}
                      >
                        Moneda Original
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(paginatedGrouped.get(opt.value) || []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatearCampo("fecha", row.fecha)}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>
                        <Typography color={(row.monto || 0) < 0 ? "error.main" : "text.primary"}>
                          {formatCurrency(Math.round(row.monto || 0))}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatearCampo("tipoDeCambio", row.tipoDeCambio)}</TableCell>
                      <TableCell>
                        {row.descuentoAplicado !== undefined && row.descuentoAplicado !== null
                          ? `${Math.round(((row.descuentoAplicado ?? 1) - 1) * -100)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Typography
                          color={(row.montoOriginal || 0) < 0 ? "error.main" : "text.primary"}
                        >
                          {formatCurrency(Math.round(row.montoOriginal || 0))}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatearCampo("monedaDePago", row.monedaOriginal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={grouped.get(opt.value)?.length || 0}
                page={page}
                onPageChange={(event, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
              />
            </Box>
          )}
        </div>
      ))}
    </Paper>
  );
};

export default DataTabTable;
