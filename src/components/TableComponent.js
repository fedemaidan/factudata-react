import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  TableContainer,
  TableSortLabel,
  TablePagination,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * TableComponent - Componente de tabla reutilizable y simple
 * 
 * @param {Array} data - Array de datos a mostrar
 * @param {Array} columns - Array de objetos con la estructura: 
 *   { key, label, sortable, render, sx }
 * @param {Object} formatters - Objeto con funciones formateadoras: 
 *   { [key]: (value, item) => formattedValue }
 * @param {Boolean} isLoading - Estado de carga
 * @param {String} sortField - Campo actual de ordenamiento
 * @param {String} sortDirection - Dirección: 'asc' o 'desc'
 * @param {Function} onSortChange - Callback al cambiar ordenamiento
 * @param {Object} pagination - { total, page, rowsPerPage, rowsPerPageOptions }
 * @param {Function} onPageChange - (event, newPage) => void
 * @param {Function} onRowsPerPageChange - (event) => void
 * @param {Function} rowIsSelected - Función para determinar si una fila está seleccionada
 * @param {Function} onRowClick - Callback al hacer click en una fila: (item) => void
 */
const TableComponent = ({
  data = [],
  columns = [],
  formatters = {},
  isLoading = false,
  sortField = null,
  sortDirection = "asc",
  onSortChange = null,
  pagination = null,
  onPageChange = null,
  onRowsPerPageChange = null,
  rowIsSelected = null,
  onRowClick = null,
}) => {
  const ordenCampo = sortField;
  const ordenDireccion = sortDirection;

  const handleSort = (campo) => {
    if (onSortChange && campo) {
      onSortChange(campo);
    }
  };

  const formatValue = (value, field, item) => {
    if (formatters[field]) {
      return formatters[field](value, item);
    }
    return value;
  };

  const renderCellContent = (item, column) => {
    // Si la columna tiene render personalizado
    if (column.render) {
      const renderedContent = column.render(item);
      if (renderedContent === null || renderedContent === undefined) return "-";
      return renderedContent;
    }

    const value = item[column.key];
    if (value === null || value === undefined) return "-";

    const formattedValue = formatValue(value, column.key, item);
    if (formattedValue === null || formattedValue === undefined) return "-";

    return formattedValue;
  };

  const getRowKey = (item, index) => item._id || item.id || `row-${index}`;

  return (
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
                fontSize: "0.75rem",
                padding: "5px 2px",
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderBottom: "1px solid rgba(224, 224, 224, 1)",
                fontSize: "0.65rem",
                fontWeight: "bold",
                padding: "5px 2px",
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
                      ...(column.sx || {}),
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
              {data.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                    No hay datos para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => {
                  const isSelected =
                    typeof rowIsSelected === "function" ? rowIsSelected(item) : false;

                  return (
                    <TableRow
                      key={getRowKey(item, index)}
                      hover
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={-1}
                      selected={isSelected}
                      onClick={() => onRowClick && onRowClick(item)}
                      sx={{
                        cursor: onRowClick ? "pointer" : "default",
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
                            ...(column.sx || {}),
                          }}
                        >
                          {renderCellContent(item, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {pagination && (
          <TablePagination
            component="div"
            count={pagination.total ?? 0}
            page={pagination.page ?? 0}
            rowsPerPage={pagination.rowsPerPage ?? 50}
            onPageChange={onPageChange || (() => {})}
            onRowsPerPageChange={onRowsPerPageChange || (() => {})}
            rowsPerPageOptions={pagination.rowsPerPageOptions ?? [25, 50, 100, 200]}
            disabled={isLoading}
          />
        )}
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
  );
};

export default TableComponent;

