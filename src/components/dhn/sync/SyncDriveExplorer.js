import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Stack,
  Typography,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import FolderIcon from "@mui/icons-material/Folder";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getSubfolderNamesAtPath,
  getFileRowsAtPath,
  groupPdfPagesInFolder,
  sortDriveTableRows,
  pathSegmentsToKey,
} from "src/utils/dhn/driveViewModel";

const EMPTY_MSG = "Esta carpeta está vacía";

function SyncDriveExplorer({
  flatRows,
  isLoading,
  columns,
  onFolderNavigate,
  /** Segmentos de ruta relativos al prefijo de sincronización (navegación del usuario). */
  currentPathSegments,
  /** Carpeta raíz de la sync = prefijo común (ej. carpeta de Drive sincronizada). */
  syncRootSegments,
}) {
  const [expandedPdf, setExpandedPdf] = useState({});

  const absolutePathSegments = useMemo(
    () => [...(syncRootSegments || []), ...(currentPathSegments || [])],
    [syncRootSegments, currentPathSegments]
  );

  const subfolders = useMemo(
    () => getSubfolderNamesAtPath(flatRows || [], absolutePathSegments),
    [flatRows, absolutePathSegments]
  );

  const tableRows = useMemo(() => {
    const filesHere = getFileRowsAtPath(flatRows || [], absolutePathSegments);
    const { pdfParents, singles } = groupPdfPagesInFolder(filesHere);

    const folderRows = subfolders.map((name) => ({
      rowType: "folder",
      _id: `folder-${pathSegmentsToKey([...absolutePathSegments, name])}`,
      folderName: name,
      pathSegments: [...(currentPathSegments || []), name],
    }));

    const merged = sortDriveTableRows(folderRows, pdfParents, singles);
    const out = [];

    for (const row of merged) {
      if (row.rowType === "pdfParent") {
        out.push(row);
        const id = String(row._id);
        if (expandedPdf[id]) {
          for (const page of row._pdfPages || []) {
            out.push({
              ...page,
              rowType: "pdfPage",
              _parentPdfId: id,
            });
          }
        }
      } else {
        out.push(row);
      }
    }

    return out;
  }, [flatRows, absolutePathSegments, subfolders, expandedPdf, currentPathSegments]);

  const handleTogglePdf = useCallback((parentId) => {
    setExpandedPdf((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  }, []);

  const breadcrumbItems = useMemo(() => {
    const rootSegs = syncRootSegments || [];
    const rel = currentPathSegments || [];
    const items = [];

    const rootLabel =
      rootSegs.length > 0 ? rootSegs.join(" / ") : "Sincronización";

    items.push({
      key: "root",
      label: rootLabel,
      relativeSegments: [],
    });

    for (let i = 0; i < rel.length; i++) {
      items.push({
        key: pathSegmentsToKey(rel.slice(0, i + 1)),
        label: rel[i],
        relativeSegments: rel.slice(0, i + 1),
      });
    }

    return items;
  }, [syncRootSegments, currentPathSegments]);

  const renderCell = (column, item) => {
    if (item.rowType === "folder") {
      if (column.key === "status") {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      if (column.key === "acciones") {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      if (column.key === "fechasDetectadas") {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      if (column.key === "archivo") {
        return (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <FolderIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
            <Tooltip title={item.folderName}>
              <Typography
                variant="body2"
                noWrap
                sx={{ cursor: "pointer", fontWeight: 600 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderNavigate(item.pathSegments);
                }}
              >
                {item.folderName}
              </Typography>
            </Tooltip>
          </Stack>
        );
      }
      if (column.key === "observacion") {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      return "—";
    }

    if (item.rowType === "pdfParent") {
      const firstPage = item._pdfPages?.[0];
      if (column.key === "fechasDetectadas") {
        const parts = (item._pdfPages || [])
          .map((p) => p.fechasDetectadas)
          .filter((v) => v && String(v).trim());
        const text = parts.length ? [...new Set(parts)].join(" · ") : "—";
        return (
          <Typography variant="body2" color="text.secondary">
            {text}
          </Typography>
        );
      }
      if (column.key === "observacion") {
        if (column.render && firstPage) {
          return column.render(firstPage);
        }
        return "—";
      }
      if (column.key === "acciones") {
        if (column.render && firstPage) {
          return column.render(firstPage);
        }
        return "—";
      }
      if (column.key === "archivo") {
        const open = Boolean(expandedPdf[String(item._id)]);
        return (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <Tooltip title={open ? "Ocultar páginas" : "Ver páginas del PDF"}>
              <IconButton
                size="small"
                aria-label={open ? "Ocultar páginas del PDF" : "Expandir páginas del PDF"}
                aria-expanded={open}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePdf(String(item._id));
                }}
                sx={{ flexShrink: 0 }}
              >
                {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {column.render ? column.render(item) : "—"}
          </Stack>
        );
      }
      if (column.render) {
        return column.render(item);
      }
      return "—";
    }

    if (item.rowType === "pdfPage") {
      const indent = 3;
      const content = column.render ? column.render(item) : "—";
      return (
        <Box sx={{ pl: indent }} onClick={(e) => e.stopPropagation()}>
          {content}
        </Box>
      );
    }

    if (column.render) {
      return column.render(item);
    }
    return "—";
  };

  return (
    <Stack spacing={1.5}>
      <Breadcrumbs aria-label="Ruta de carpetas" sx={{ mb: 0 }}>
        {breadcrumbItems.map((b, i) => {
          const isLast = i === breadcrumbItems.length - 1;
          return isLast ? (
            <Typography key={b.key} color="text.primary" variant="body2">
              {b.label}
            </Typography>
          ) : (
            <Link
              key={b.key}
              component="button"
              variant="body2"
              underline="hover"
              color="inherit"
              sx={{ cursor: "pointer", maxWidth: "100%" }}
              onClick={() => onFolderNavigate(b.relativeSegments)}
            >
              {b.label}
            </Link>
          );
        })}
      </Breadcrumbs>

      <Box sx={{ position: "relative", width: "100%", minWidth: 0 }}>
        <TableContainer>
          <Table
            size="small"
            stickyHeader
            sx={{
              minWidth: 640,
              "& .MuiTableCell-root": {
                borderRight: "none !important",
                borderLeft: "none !important",
                fontSize: "0.75rem",
                padding: "5px 8px",
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderBottom: "1px solid rgba(224, 224, 224, 1)",
                fontSize: "0.65rem",
                fontWeight: "bold",
                padding: "5px 8px",
              },
            }}
          >
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={column.sx}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {EMPTY_MSG}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((item, rowIndex) => {
                  const key = item._id || item.id || `drive-${rowIndex}`;
                  const isFolder = item.rowType === "folder";
                  return (
                    <TableRow
                      key={key}
                      hover
                      onClick={() => {
                        if (isFolder) {
                          onFolderNavigate(item.pathSegments);
                        }
                      }}
                      sx={{
                        cursor: isFolder ? "pointer" : "default",
                        "&:hover": {
                          backgroundColor: isFolder ? alpha("#1976d2", 0.06) : alpha("#1976d2", 0.04),
                        },
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell key={`${key}-${column.key}`} sx={column.sx}>
                          {renderCell(column, item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
            bgcolor="rgba(255,255,255,0.65)"
            zIndex={1}
          >
            <CircularProgress size={32} />
          </Box>
        )}
      </Box>
    </Stack>
  );
}

SyncDriveExplorer.propTypes = {
  flatRows: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string,
      render: PropTypes.func,
      sx: PropTypes.object,
    })
  ),
  onFolderNavigate: PropTypes.func.isRequired,
  currentPathSegments: PropTypes.arrayOf(PropTypes.string),
  syncRootSegments: PropTypes.arrayOf(PropTypes.string),
};

SyncDriveExplorer.defaultProps = {
  flatRows: [],
  isLoading: false,
  columns: [],
  currentPathSegments: [],
  syncRootSegments: [],
};

export default SyncDriveExplorer;
