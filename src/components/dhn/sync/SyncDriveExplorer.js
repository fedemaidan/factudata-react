import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import FolderIcon from "@mui/icons-material/Folder";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import {
  getSubfolderNamesAtPath,
  getFileRowsAtPath,
  groupPdfPagesInFolder,
  sortDriveTableRows,
  pathSegmentsToKey,
  getFolderStats,
} from "src/utils/dhn/driveViewModel";
import { getStatusChipConfig } from "src/utils/dhn/syncHelpers";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const FOLDER_YELLOW = "#FBBC04";
const PDF_RED = "#EA4335";
const IMG_BLUE = "#4285F4";
const FILE_GREY = "#5f6368";
const DRIVE_HOVER = alpha("#1a73e8", 0.07);
const DRIVE_HOVER_FILE = alpha("#000", 0.03);
const ROW_HEIGHT = 44;
const COL_STATUS_W = 100;
const COL_FECHA_W = 152;
const COL_ACTIONS_W = 120;

// ─── Status summary order ───────────────────────────────────────────────────────
const STATUS_PRIORITY = ["error", "incompleto", "duplicado", "processing", "pending", "ok", "done"];

const STATUS_BADGE = {
  error:      { text: "#c62828", bg: "#ffebee", label: "error" },
  incompleto: { text: "#bf360c", bg: "#fff3e0", label: "incompleto" },
  duplicado:  { text: "#e65100", bg: "#fff3e0", label: "duplicado" },
  ok:         { text: "#1b5e20", bg: "#e8f5e9", label: "ok" },
  done:       { text: "#1b5e20", bg: "#e8f5e9", label: "ok" },
  processing: { text: "#0d47a1", bg: "#e3f2fd", label: "procesando" },
  pending:    { text: "#616161", bg: "#f5f5f5", label: "pendiente" },
};

// ─── Folder status badges ───────────────────────────────────────────────────────
const FolderStatusSummary = ({ stats }) => {
  if (!stats || stats.total === 0) return null;

  const merged = { ...stats.byStatus };
  if (merged.done) {
    merged.ok = (merged.ok || 0) + merged.done;
    delete merged.done;
  }

  const entries = STATUS_PRIORITY
    .filter((s) => s !== "done" && (merged[s] || 0) > 0)
    .map((s) => ({ status: s, count: merged[s] }));

  if (entries.length === 0) return null;

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ flexShrink: 0 }}>
      {entries.map(({ status, count }) => {
        const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending;
        return (
          <Box
            key={status}
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 0.75,
              py: "2px",
              borderRadius: "4px",
              backgroundColor: cfg.bg,
              color: cfg.text,
              fontSize: "0.62rem",
              fontWeight: 700,
              border: `1px solid ${alpha(cfg.text, 0.2)}`,
              lineHeight: 1.5,
              letterSpacing: "0.15px",
            }}
          >
            {count}&nbsp;{cfg.label}
          </Box>
        );
      })}
    </Stack>
  );
};

// ─── File type icon ─────────────────────────────────────────────────────────────
const FileTypeIcon = ({ fileName, size = 19 }) => {
  const name = String(fileName || "").toLowerCase();
  if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || name.match(/_p\d+\.(jpg|jpeg|png)$/i)) {
    return <ImageIcon sx={{ color: IMG_BLUE, fontSize: size, flexShrink: 0 }} />;
  }
  if (name.endsWith(".pdf")) {
    return <PictureAsPdfIcon sx={{ color: PDF_RED, fontSize: size, flexShrink: 0 }} />;
  }
  return <InsertDriveFileIcon sx={{ color: FILE_GREY, fontSize: size, flexShrink: 0 }} />;
};

// ─── Inline status chip ─────────────────────────────────────────────────────────
const InlineStatus = ({ status }) => {
  if (!status) return null;
  const cfg = getStatusChipConfig(status);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 0.75,
        py: "2px",
        borderRadius: "4px",
        border: `1px solid ${cfg.color}`,
        color: cfg.color,
        fontSize: "0.62rem",
        fontWeight: 700,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        letterSpacing: "0.15px",
      }}
    >
      {cfg.label}
    </Box>
  );
};

// ─── Drive-style breadcrumb ─────────────────────────────────────────────────────
const DriveBreadcrumb = ({ breadcrumbItems, onFolderNavigate }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 0.25,
      px: 2,
      py: 0.75,
      borderBottom: "1px solid",
      borderColor: "divider",
      backgroundColor: "grey.50",
      minHeight: 38,
    }}
  >
    {breadcrumbItems.map((b, i) => {
      const isLast = i === breadcrumbItems.length - 1;
      return (
        <React.Fragment key={b.key}>
          {i > 0 && (
            <NavigateNextIcon sx={{ color: "text.disabled", fontSize: 14, mx: 0.25 }} />
          )}
          {isLast ? (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              {i === 0 && <HomeIcon sx={{ fontSize: 15, color: "text.secondary" }} />}
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.primary"
                sx={{ fontSize: "0.8rem" }}
              >
                {b.label}
              </Typography>
            </Box>
          ) : (
            <Box
              component="button"
              onClick={() => onFolderNavigate(b.relativeSegments)}
              sx={{
                background: "none",
                border: "none",
                p: "2px 6px",
                cursor: "pointer",
                borderRadius: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                color: "text.secondary",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                fontWeight: 400,
                "&:hover": { backgroundColor: "action.hover", color: "primary.main" },
                transition: "all 0.12s ease",
              }}
            >
              {i === 0 && <HomeIcon sx={{ fontSize: 14 }} />}
              {b.label}
            </Box>
          )}
        </React.Fragment>
      );
    })}
  </Box>
);

// ─── Column header bar ──────────────────────────────────────────────────────────
const DriveListHeader = ({ hasFecha }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      minHeight: 32,
      px: 2,
      gap: 1,
      borderBottom: "1px solid",
      borderColor: "divider",
      backgroundColor: "grey.50",
    }}
  >
    <Typography
      component="span"
      sx={{ flex: 1, minWidth: 0, fontSize: "0.67rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.6px" }}
    >
      Nombre
    </Typography>
    <Box sx={{ width: COL_STATUS_W, flexShrink: 0 }}>
      <Typography component="span" sx={{ fontSize: "0.67rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.6px" }}>
        Estado
      </Typography>
    </Box>
    {hasFecha && (
      <Box sx={{ width: COL_FECHA_W, flexShrink: 0 }}>
        <Typography component="span" sx={{ fontSize: "0.67rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Fecha detectada
        </Typography>
      </Box>
    )}
    <Box sx={{ width: COL_ACTIONS_W, flexShrink: 0 }} />
  </Box>
);

// ─── Row wrapper ────────────────────────────────────────────────────────────────
const DriveRow = ({ isFolder, isIndented, onClick, children }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      minHeight: ROW_HEIGHT,
      px: 2,
      pl: isIndented ? 5.5 : 2,
      gap: 1,
      cursor: isFolder ? "pointer" : "default",
      borderBottom: "1px solid",
      borderColor: "divider",
      "&:last-child": { borderBottom: "none" },
      "&:hover": { backgroundColor: isFolder ? DRIVE_HOVER : DRIVE_HOVER_FILE },
      "&:hover .drive-arrow": { opacity: 1 },
      transition: "background-color 0.1s ease",
    }}
  >
    {children}
  </Box>
);

// ─── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = () => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 7, gap: 1.5 }}>
    <FolderIcon sx={{ fontSize: 52, color: "grey.300" }} />
    <Typography variant="body2" color="text.disabled" fontWeight={500}>
      Esta carpeta está vacía
    </Typography>
  </Box>
);

// ─── Loading skeleton ───────────────────────────────────────────────────────────
const SKELETON_WIDTHS = ["32%", "48%", "28%", "55%", "38%"];

const SkeletonRows = () => (
  <>
    {SKELETON_WIDTHS.map((w, i) => (
      <Box
        key={i}
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: ROW_HEIGHT,
          px: 2,
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ width: 19, height: 19, borderRadius: 0.5, bgcolor: "grey.200", flexShrink: 0, animation: "drivePulse 1.4s ease-in-out infinite", "@keyframes drivePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.35 } } }} />
        <Box sx={{ height: 12, width: w, borderRadius: 1, bgcolor: "grey.200", animation: "drivePulse 1.4s ease-in-out infinite", "@keyframes drivePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.35 } } }} />
      </Box>
    ))}
  </>
);

// ─── Main component ─────────────────────────────────────────────────────────────
function SyncDriveExplorer({
  flatRows,
  isLoading,
  columns,
  onFolderNavigate,
  currentPathSegments,
  syncRootSegments,
}) {
  const [expandedPdf, setExpandedPdf] = useState({});

  const absolutePathSegments = useMemo(
    () => [...(syncRootSegments || []), ...(currentPathSegments || [])],
    [syncRootSegments, currentPathSegments]
  );

  const colByKey = useMemo(() => {
    const map = {};
    for (const col of columns) map[col.key] = col;
    return map;
  }, [columns]);

  const hasFecha = Boolean(colByKey["fechasDetectadas"]);

  const subfolders = useMemo(
    () => getSubfolderNamesAtPath(flatRows || [], absolutePathSegments),
    [flatRows, absolutePathSegments]
  );

  const folderStatsMap = useMemo(() => {
    const map = {};
    for (const name of subfolders) {
      map[name] = getFolderStats(flatRows || [], [...absolutePathSegments, name]);
    }
    return map;
  }, [flatRows, absolutePathSegments, subfolders]);

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
        if (expandedPdf[String(row._id)]) {
          for (const page of row._pdfPages || []) {
            out.push({ ...page, rowType: "pdfPage", _parentPdfId: String(row._id) });
          }
        }
      } else {
        out.push(row);
      }
    }

    return out;
  }, [flatRows, absolutePathSegments, subfolders, expandedPdf, currentPathSegments]);

  const handleTogglePdf = useCallback((parentId) => {
    setExpandedPdf((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  }, []);

  const breadcrumbItems = useMemo(() => {
    const rootSegs = syncRootSegments || [];
    const rel = currentPathSegments || [];
    const rootLabel = rootSegs.length > 0 ? rootSegs.join(" / ") : "Sincronización";
    const items = [{ key: "root", label: rootLabel, relativeSegments: [] }];
    for (let i = 0; i < rel.length; i++) {
      items.push({
        key: pathSegmentsToKey(rel.slice(0, i + 1)),
        label: rel[i],
        relativeSegments: rel.slice(0, i + 1),
      });
    }
    return items;
  }, [syncRootSegments, currentPathSegments]);

  // ─── Folder row ─────────────────────────────────────────────────────────────
  const renderFolderRow = (item) => {
    const stats = folderStatsMap[item.folderName] || { total: 0, byStatus: {} };
    return (
      <DriveRow key={item._id} isFolder onClick={() => onFolderNavigate(item.pathSegments)}>
        {/* Icon */}
        <FolderIcon sx={{ color: FOLDER_YELLOW, fontSize: 22, flexShrink: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }} />

        {/* Name + counts + status badges */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
          <Typography noWrap fontWeight={500} variant="body2" sx={{ fontSize: "0.85rem", flexShrink: 1, minWidth: 0 }}>
            {item.folderName}
          </Typography>
          {stats.total > 0 && (
            <Typography component="span" sx={{ fontSize: "0.71rem", color: "text.disabled", flexShrink: 0, whiteSpace: "nowrap" }}>
              {stats.total} {stats.total === 1 ? "archivo" : "archivos"}
            </Typography>
          )}
          <FolderStatusSummary stats={stats} />
        </Box>

        {/* Empty status + fecha cols */}
        <Box sx={{ width: COL_STATUS_W, flexShrink: 0 }} />
        {hasFecha && <Box sx={{ width: COL_FECHA_W, flexShrink: 0 }} />}

        {/* Navigate arrow (visible on hover) */}
        <Box
          className="drive-arrow"
          sx={{ width: COL_ACTIONS_W, flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center", opacity: 0, transition: "opacity 0.15s ease" }}
        >
          <ChevronRightIcon sx={{ color: "text.secondary", fontSize: 18 }} />
        </Box>
      </DriveRow>
    );
  };

  // ─── File / PDF rows ────────────────────────────────────────────────────────
  const renderFileRow = (item, { isIndented = false } = {}) => {
    const isPdfParent = item.rowType === "pdfParent";
    const expandedKey = String(item._id);
    const isExpanded = Boolean(expandedPdf[expandedKey]);
    const firstPage = isPdfParent ? (item._pdfPages?.[0] || null) : null;

    // AccionesCell works best with the real urlStorage row data (needs real _id for resync tracking)
    const accionesItem = isPdfParent && firstPage ? firstPage : item;

    const fileName = item.file_name || "";
    const hasObservacion =
      item?.observacion && item.observacion !== "-" && String(item.observacion).trim().length > 0;

    const pdfFechaText = isPdfParent
      ? (() => {
          const parts = (item._pdfPages || [])
            .map((p) => p.fechasDetectadas)
            .filter((v) => v && String(v).trim());
          return parts.length ? [...new Set(parts)].join(" · ") : "—";
        })()
      : null;

    return (
      <DriveRow key={item._id || `file-${fileName}`} isIndented={isIndented}>
        {/* Icon area: expand toggle for PDFs, then file icon */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
          {isPdfParent ? (
            <Tooltip title={isExpanded ? "Ocultar páginas" : "Ver páginas del PDF"}>
              <IconButton
                size="small"
                aria-label={isExpanded ? "Ocultar páginas" : "Expandir páginas"}
                aria-expanded={isExpanded}
                onClick={(e) => { e.stopPropagation(); handleTogglePdf(expandedKey); }}
                sx={{ p: "3px" }}
              >
                {isExpanded
                  ? <ExpandMoreIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                  : <ChevronRightIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                }
              </IconButton>
            </Tooltip>
          ) : (
            <Box sx={{ width: 26 }} />
          )}
          {isPdfParent
            ? <PictureAsPdfIcon sx={{ color: PDF_RED, fontSize: 19, flexShrink: 0 }} />
            : <FileTypeIcon fileName={fileName} size={19} />
          }
        </Box>

        {/* Name + secondary observacion line */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, overflow: "hidden" }}>
            <Tooltip title={fileName} placement="top">
              <Typography
                noWrap
                variant="body2"
                sx={{ fontSize: "0.84rem", fontWeight: isPdfParent ? 500 : 400, flexShrink: 1, minWidth: 0 }}
              >
                {fileName || "—"}
              </Typography>
            </Tooltip>
            {isPdfParent && (
              <Typography
                component="span"
                sx={{
                  fontSize: "0.68rem",
                  color: "text.disabled",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "4px",
                  px: 0.6,
                  py: "1px",
                  lineHeight: 1.5,
                }}
              >
                {(item._pdfPages || []).length} págs.
              </Typography>
            )}
          </Box>
          {hasObservacion && colByKey["observacion"] && (
            <Box
              sx={{
                mt: 0.25,
                maxWidth: "100%",
                overflow: "hidden",
                maxHeight: 36,
                "& *": { fontSize: "0.72rem !important", color: "text.secondary !important" },
                "& .MuiChip-root": { height: "18px !important", fontSize: "0.68rem !important" },
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {colByKey["observacion"].render(item)}
            </Box>
          )}
        </Box>

        {/* Status chip */}
        <Box sx={{ width: COL_STATUS_W, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <InlineStatus status={item.status} />
        </Box>

        {/* Fecha detectada */}
        {hasFecha && (
          <Box sx={{ width: COL_FECHA_W, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            {isPdfParent ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
                {pdfFechaText}
              </Typography>
            ) : colByKey["fechasDetectadas"]?.render ? (
              colByKey["fechasDetectadas"].render(item)
            ) : null}
          </Box>
        )}

        {/* Actions: view image + open drive (from ArchivoCell) + resync/resolver (from AccionesCell) */}
        <Box
          sx={{ width: COL_ACTIONS_W, flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ArchivoCell: renders filename + view + drive buttons. We hide the filename via CSS. */}
          {colByKey["archivo"]?.render && (
            <Box
              sx={{
                "& > div > span:first-of-type": { display: "none" },
                display: "flex",
                alignItems: "center",
              }}
            >
              {colByKey["archivo"].render(item)}
            </Box>
          )}
          {colByKey["acciones"]?.render && colByKey["acciones"].render(accionesItem)}
        </Box>
      </DriveRow>
    );
  };

  const renderRow = (item) => {
    if (item.rowType === "folder") return renderFolderRow(item);
    if (item.rowType === "pdfPage") return renderFileRow(item, { isIndented: true });
    return renderFileRow(item);
  };

  return (
    <Box>
      <DriveBreadcrumb breadcrumbItems={breadcrumbItems} onFolderNavigate={onFolderNavigate} />
      <DriveListHeader hasFecha={hasFecha} />
      <Box>
        {isLoading ? (
          <SkeletonRows />
        ) : tableRows.length === 0 ? (
          <EmptyState />
        ) : (
          tableRows.map((item) => renderRow(item))
        )}
      </Box>
    </Box>
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
