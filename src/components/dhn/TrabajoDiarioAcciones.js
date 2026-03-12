import React from 'react';
import { Stack, Tooltip, IconButton, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

export const AccionesTrabajoDiario = ({ item, onEdit, onOpenLogs, onExportPdf, exportingRowId }) => {
  const rowId = item?._id ?? item?.id;
  const isExporting = exportingRowId === rowId;
  const canExport = typeof onExportPdf === 'function';

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {typeof onEdit === 'function' && (
        <Tooltip title="Editar">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            color="primary"
            aria-label="Editar trabajo diario"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Ver historial">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLogs?.(item);
          }}
          color="inherit"
          aria-label="Ver historial de cambios"
        >
          <HistoryIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {canExport && (
        <Tooltip title="Exportar PDF">
          <IconButton
            size="small"
            color="primary"
            disabled={isExporting}
            onClick={(e) => {
              e.stopPropagation();
              onExportPdf(item);
            }}
            aria-label="Exportar comprobantes a PDF"
          >
            {isExporting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PictureAsPdfIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

export default AccionesTrabajoDiario;

