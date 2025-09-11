import React, { useMemo, useState, useEffect, useCallback, memo } from "react";
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
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import * as XLSX from "xlsx";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { formatCurrency } from "src/utils/formatters";
import RowActions from "src/components/celulandia/RowActions";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import agregarSaldoCalculado from "src/utils/celulandia/agregarSaldoCalculado";

const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const getTimeSafe = (v) => {
  if (!v) return 0;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.getTime();
  const p = dayjs(
    v,
    ["DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", "YYYY/MM/DD", "MM/DD/YYYY", "M/D/YYYY"],
    true
  );
  return p.isValid() ? p.valueOf() : 0;
};

const DataTabTable = ({
  items = [],
  isLoading = false,
  options = [],
  defaultOption,
  currentOption: controlledOption, // <-- control externo opcional
  showSearch = true,
  showDateFilterOptions = true,
  showDatePicker = false,
  selectedDate = null,
  onDateChange = null,
  onRefresh = null,
  showRefreshButton = false,
  // Acciones
  onEdit = null,
  onViewHistory = null,
  onDelete = null,
  onViewImage = null,
  // Paginación server-side (opcional). Si no las pasás, usa client-side.
  total = 0,
  currentPage = 1,
  rowsPerPage = 1000,
  onPageChange = null,
  sortField = "fecha",
  sortDirection = "desc",
  onSortChange = null,
  filtroFecha = "todos",
  onFiltroFechaChange = null,
  onOptionChange = null,
  showSaldoColumn = false,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [internalFiltroFecha, setInternalFiltroFecha] = useState(filtroFecha);
  const [internalSelectedDate, setInternalSelectedDate] = useState(null);

  // Estado interno de tab (si no es controlado desde el padre)
  const [currentOption, setCurrentOption] = useState(
    controlledOption ?? defaultOption ?? options?.[0]?.value ?? ""
  );
  useEffect(() => {
    if (controlledOption !== undefined && controlledOption !== null) {
      setCurrentOption(controlledOption);
    }
  }, [controlledOption]);

  const [internalSortDirection, setInternalSortDirection] = useState(sortDirection);
  useEffect(() => setInternalSortDirection(sortDirection), [sortDirection]);

  const [page, setPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(rowsPerPage);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const finalSortField = "fecha"; // <-- forzado a 'fecha'
  const finalSortDirection = onSortChange ? sortDirection : internalSortDirection;
  const finalFiltroFecha = onFiltroFechaChange ? filtroFecha : internalFiltroFecha;
  const finalRowsPerPage = onPageChange ? rowsPerPage : internalRowsPerPage;
  const finalPage = onPageChange ? currentPage - 1 : page;

  const handleSortChange = useCallback(
    (campo) => {
      if (campo !== "fecha") return; // solo permitimos ordenar por fecha
      if (onSortChange) {
        onSortChange("fecha");
      } else {
        setInternalSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      }
    },
    [onSortChange]
  );

  const handleFiltroFechaChange = useCallback(
    (nuevo) => {
      if (onFiltroFechaChange) onFiltroFechaChange(nuevo);
      else setInternalFiltroFecha(nuevo);
    },
    [onFiltroFechaChange]
  );

  const handleOptionChange = useCallback(
    (newOption) => {
      // actualizamos SIEMPRE el estado interno para ver el cambio ya
      setCurrentOption(newOption);
      if (onPageChange) {
        onPageChange(1);
      } else {
        setPage(0);
      }
      // notificamos al padre si quiere escuchar
      onOptionChange?.(newOption);
    },
    [onPageChange, onOptionChange]
  );

  const handlePageChange = useCallback(
    (event, newPage) => {
      if (onPageChange) onPageChange(newPage + 1);
      else setPage(newPage);
    },
    [onPageChange]
  );

  const handleRowsPerPageChange = useCallback(
    (event) => {
      const newRowsPerPage = parseInt(event.target.value, 10);
      if (onPageChange) {
        // si es server-side, el padre decide
      } else {
        setInternalRowsPerPage(newRowsPerPage);
        setPage(0);
      }
    },
    [onPageChange]
  );

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const applyDateFilter = useCallback((rows, filtro) => {
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
    return rows.filter((r) => r.fecha && new Date(r.fecha) >= start);
  }, []);

  const sortedAndFilteredItems = useMemo(() => {
    if (!items.length) return [];

    let rows = items;

    if (showSearch && busqueda.trim()) {
      const q = busqueda.toLowerCase();
      rows = rows.filter((r) =>
        [r.cliente, r.monto?.toString()].some((v) => v && String(v).toLowerCase().includes(q))
      );
    }

    if (showDateFilterOptions) {
      rows = applyDateFilter(rows, finalFiltroFecha);
    }

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

    // Si el padre controla el sort (onSortChange), NO re-ordenamos acá.
    if (!onSortChange) {
      rows = [...rows].sort((a, b) => {
        // Manejar fechas de manera más robusta
        let aVal = a?.fecha;
        let bVal = b?.fecha;

        // Convertir a Date objects
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);

        // Verificar si las fechas son válidas
        if (isNaN(aVal.getTime())) aVal = new Date(0);
        if (isNaN(bVal.getTime())) bVal = new Date(0);

        const aTime = aVal.getTime();
        const bTime = bVal.getTime();

        if (aTime < bTime) return finalSortDirection === "asc" ? -1 : 1;
        if (aTime > bTime) return finalSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [
    items,
    busqueda,
    finalFiltroFecha,
    selectedDate,
    finalSortField,
    finalSortDirection,
    showSearch,
    showDateFilterOptions,
    showDatePicker,
    internalSelectedDate,
    onDateChange,
    applyDateFilter,
    onSortChange,
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

  // Recalcular Debe/Haber/Saldo por grupo según la pestaña (CC) y en orden cronológico ASC
  const groupedWithSaldo = useMemo(() => {
    const map = new Map();
    for (const [key, itemsArr] of grouped.entries()) {
      const asc = [...itemsArr].sort((a, b) => getTimeSafe(a.fecha) - getTimeSafe(b.fecha));
      const computedAsc = agregarSaldoCalculado(asc);
      const byId = new Map(computedAsc.map((it) => [it.id, it]));
      const merged = itemsArr.map((it) => {
        const comp = byId.get(it.id) || {};
        return {
          ...it,
          debe: comp.debe ?? it.debe,
          haber: comp.haber ?? it.haber,
          saldoAcumulado: comp.saldoAcumulado ?? it.saldoAcumulado,
        };
      });
      map.set(key, merged);
    }
    return map;
  }, [grouped]);

  const paginatedGrouped = useMemo(() => {
    const map = new Map();
    for (const [key, itemsArr] of groupedWithSaldo.entries()) {
      const startIndex = finalPage * finalRowsPerPage;
      const endIndex = startIndex + finalRowsPerPage;
      map.set(key, itemsArr.slice(startIndex, endIndex));
    }
    return map;
  }, [groupedWithSaldo, finalPage, finalRowsPerPage]);

  const totals = useMemo(() => {
    const res = new Map();
    for (const [k, arr] of grouped.entries()) {
      const sum = arr.reduce((acc, it) => acc + (it.monto || 0), 0);
      res.set(k, sum);
    }
    return res;
  }, [grouped]);

  // Exportar a Excel (pestaña actual) — con Debe/Haber/Saldo acumulado y números puros
  const handleExportExcel = () => {
    const allRows = groupedWithSaldo.get(currentOption) || [];
    const monedaLabel = options.find((o) => o.value === currentOption)?.label || "";

    // Orden cronológico ASC (más viejo primero)
    const rowsSorted = [...allRows].sort((a, b) => getTimeSafe(a.fecha) - getTimeSafe(b.fecha));

    let running = 0;

    const data = rowsSorted.map((row) => {
      console.log(row);
      // Derivar Debe/Haber numéricos puros desde montoCC si existe (según CC seleccionada)
      const raw = row.montoCC != null ? row.montoCC : row.monto;
      const monto = n(raw);
      const debe = row.debe != null ? n(row.debe) : monto < 0 ? Math.abs(monto) : 0;
      const haber = row.haber != null ? n(row.haber) : monto > 0 ? monto : 0;

      // Saldo acumulado = saldo previo + (Haber - Debe)
      running = r2(running + (haber - debe));

      return {
        Fecha: formatearCampo("fecha", row.fecha),
        Cliente: row.cliente ?? "",
        "N° comprobante": String(row.descripcion || ""),
        Debe: n(debe),
        Haber: n(haber),
        "Saldo acumulado": n(running),
        "Tipo de cambio": n(row.tipoDeCambio || 1),
        "Monto original": n(row.montoYMonedaOriginal?.monto || row.montoOriginal || 0),
        "Moneda original": row.montoYMonedaOriginal?.moneda || row.monedaOriginal || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monedaLabel || "Datos");
    const filename = `reporte_${monedaLabel || "datos"}_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <Stack sx={{ pb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
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
                  value={finalFiltroFecha}
                  label="Filtrar por fecha"
                  onChange={(e) => handleFiltroFechaChange(e.target.value)}
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
                    if (onDateChange) onDateChange(newValue);
                    else setInternalSelectedDate(newValue);
                  }}
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
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexGrow: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              sx={{ py: 2, minWidth: 180 }}
            >
              Exportar Excel
            </Button>

            {options.map((opt) => (
              <Button
                key={opt.value}
                variant={currentOption === opt.value ? "contained" : "outlined"}
                color="primary"
                onClick={() => handleOptionChange(opt.value)}
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
            <Box>
              <Table
                size="small"
                sx={{
                  "& .MuiTableCell-root": {
                    fontSize: "0.75rem",
                    padding: "5px 8px",
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    padding: "5px 8px",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", cursor: "pointer" }}>
                      <TableSortLabel
                        active={true} // siempre ordenamos por fecha
                        direction={finalSortDirection}
                        onClick={() => handleSortChange("fecha")}
                      >
                        Fecha
                      </TableSortLabel>
                    </TableCell>

                    {/* Sin orden en el resto de columnas */}
                    <TableCell sx={{ fontWeight: "bold" }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Monto ({opt.label})</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>TC</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Descuento</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Monto Original</TableCell>
                    {showSaldoColumn && <TableCell sx={{ fontWeight: "bold" }}>Saldo</TableCell>}

                    {(onEdit || onViewHistory || onDelete || onViewImage) && (
                      <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}></TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(paginatedGrouped.get(opt.value) || []).map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => console.log(row)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>{formatearCampo("fecha", row.fecha)}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>
                        <Typography
                          color={(row.monto || 0) < 0 ? "error.main" : "text.primary"}
                          sx={{ fontSize: "0.75rem" }}
                        >
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
                        {formatearCampo("montoYMoneda", row.montoYMonedaOriginal, row)}
                      </TableCell>
                      {showSaldoColumn && (
                        <TableCell>
                          <Typography
                            color={(row.saldoAcumulado || 0) < 0 ? "error.main" : "text.primary"}
                            sx={{ fontSize: "0.75rem" }}
                          >
                            {formatCurrency(Math.round(row.saldoAcumulado || 0))}
                          </Typography>
                        </TableCell>
                      )}

                      {(onEdit || onViewHistory || onDelete || onViewImage) && (
                        <TableCell sx={{ textAlign: "center" }}>
                          <RowActions
                            item={row}
                            onEdit={onEdit}
                            onViewHistory={onViewHistory}
                            onDelete={onDelete}
                            onViewImage={onViewImage}
                            showImage={Boolean(onViewImage)}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={onPageChange ? total : grouped.get(opt.value)?.length || 0}
                page={finalPage}
                onPageChange={handlePageChange}
                rowsPerPage={finalRowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={onPageChange ? [finalRowsPerPage] : [1000]}
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

export default memo(DataTabTable);
