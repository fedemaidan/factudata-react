import React, { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  CircularProgress,
  TablePagination,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

const TableSelectComponent = ({
  data = [],
  columns = [],
  selectedItems,
  onSelectionChange = () => {},
  isLoading = false,
  sortField = "",
  sortDirection = "asc",
  onSortChange = () => {},
  getRowId = (item) => item._id || item.id,
  emptyMessage = "No hay datos para mostrar",
  pagination = null, // { total, page, rowsPerPage, rowsPerPageOptions }
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const isSelectionControlled = Array.isArray(selectedItems);
  const selectedSet = isSelectionControlled
    ? new Set(selectedItems.map(getRowId))
    : selectedIds;

  const handleSelectOne = (item) => {
    const itemId = getRowId(item);
    const newSelectedIds = new Set(selectedSet);

    if (newSelectedIds.has(itemId)) {
      newSelectedIds.delete(itemId);
    } else {
      newSelectedIds.add(itemId);
    }

    if (!isSelectionControlled) {
      setSelectedIds(newSelectedIds);
    }
    const selectedData = data.filter((item) => newSelectedIds.has(getRowId(item)));
    onSelectionChange(selectedData);
  };

  const handleSelectAll = () => {
    if (selectedSet.size === data.length && data.length > 0) {
      if (!isSelectionControlled) {
        setSelectedIds(new Set());
      }
      onSelectionChange([]);
    } else {
      const allIds = new Set(data.map(getRowId));
      if (!isSelectionControlled) {
        setSelectedIds(allIds);
      }
      onSelectionChange([...data]);
    }
  };

  const handleSort = (campo) => {
    onSortChange(campo);
  };

  const renderCellContent = (item, column) => {
    if (column.render) {
      const content = column.render(item);
      return content ?? "-";
    }
    const value = item[column.key];
    return value ?? "-";
  };

  const isSelected = (item) => {
    return selectedSet.has(getRowId(item));
  };

  const isAllSelected = data.length > 0 && selectedSet.size === data.length;
  const isSomeSelected = selectedSet.size > 0 && selectedSet.size < data.length;

  return (
    <Box sx={{ position: "relative" }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <TableContainer>
          <Table
            stickyHeader
            size="small"
            sx={{
              minWidth: 750,
              "& .MuiTableCell-root": {
                fontSize: "0.7rem",
                padding: "6px 8px",
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderBottom: "1px solid rgba(224, 224, 224, 1)",
                fontSize: "0.6rem",
                fontWeight: "bold",
                backgroundColor: "background.paper",
              },
              "& .MuiTableCell-paddingCheckbox": {
                padding: "4px",
              },
            }}
          >
            {/* Header */}
            <TableHead>
              <TableRow>
                {/* Checkbox "seleccionar todos" */}
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isSomeSelected}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={isLoading || data.length === 0}
                    color="primary"
                    size="small"
                  />
                </TableCell>

                {/* Columnas dinámicas */}
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    sx={{
                      cursor: column.sortable ? "pointer" : "default",
                      ...column.sx,
                    }}
                  >
                    {column.sortable ? (
                      <TableSortLabel
                        active={sortField === column.key}
                        direction={sortField === column.key ? sortDirection : "asc"}
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

            {/* Body */}
            <TableBody>
              {data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {data.map((item, index) => {
                const itemSelected = isSelected(item);
                const rowId = getRowId(item);

                return (
                  <TableRow
                    key={rowId || `row-${index}`}
                    hover
                    onClick={() => handleSelectOne(item)}
                    role="checkbox"
                    aria-checked={itemSelected}
                    tabIndex={-1}
                    selected={itemSelected}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: alpha("#1976d2", 0.04),
                      },
                      ...(itemSelected && {
                        backgroundColor: alpha("#1976d2", 0.08),
                        "&:hover": {
                          backgroundColor: alpha("#1976d2", 0.12),
                        },
                      }),
                    }}
                  >
                    {/* Checkbox de selección */}
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={itemSelected}
                        color="primary"
                        size="small"
                        onChange={() => handleSelectOne(item)}
                      />
                    </TableCell>

                    {/* Celdas de datos */}
                    {columns.map((column) => (
                      <TableCell
                        key={`${rowId}-${column.key}`}
                        sx={column.sx}
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

        {pagination && (
          <TablePagination
            component="div"
            count={pagination.total ?? 0}
            page={pagination.page ?? 0}
            rowsPerPage={pagination.rowsPerPage ?? 50}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={pagination.rowsPerPageOptions ?? [25, 50, 100, 200]}
            disabled={isLoading}
          />
        )}
      </Paper>

      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "rgba(255, 255, 255, 0.7)",
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(TableSelectComponent);
