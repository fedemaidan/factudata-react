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
} from "@mui/material";
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
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentOption, setCurrentOption] = useState(defaultOption || options?.[0]?.value || "");
  const [sortField, setSortField] = useState("fecha");
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
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
    // Filtro por DatePicker (día específico)
    if (showDatePicker && selectedDate) {
      const targetDay = dayjs(selectedDate).startOf("day");
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
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(grouped.get(opt.value) || []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatearCampo("fecha", row.fecha)}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>
                        <Typography color={(row.monto || 0) < 0 ? "error.main" : "text.primary"}>
                          {formatCurrency(Math.round(row.monto || 0))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </div>
      ))}
    </Paper>
  );
};

export default DataTabTable;
