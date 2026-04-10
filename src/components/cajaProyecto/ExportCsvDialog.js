import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DownloadIcon from '@mui/icons-material/Download';

const moveItem = (items, fromIndex, toIndex) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const ExportCsvDialog = ({
  open,
  onClose,
  fields,
  selectedKeys,
  orderedKeys,
  onToggleField,
  onReorderField,
  onSelectAll,
  onClearAll,
  onReset,
  onExport,
  exporting,
  totalRows,
}) => {
  const selectedCount = selectedKeys.length;
  const allSelected = fields.length > 0 && selectedCount === fields.length;
  const orderedFields = useMemo(
    () => orderedKeys.map((key) => fields.find((field) => field.key === key)).filter(Boolean),
    [fields, orderedKeys]
  );

  return (
    <Dialog open={open} onClose={exporting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <DownloadIcon fontSize="small" />
          <Typography variant="h6">Exportar CSV</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Elegí qué campos exportar y en qué orden aparecerán las columnas del archivo.
          </Alert>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" onClick={onSelectAll} disabled={allSelected || exporting}>
              Seleccionar todo
            </Button>
            <Button size="small" variant="outlined" onClick={onClearAll} disabled={selectedCount === 0 || exporting}>
              Limpiar selección
            </Button>
            <Button size="small" variant="text" onClick={onReset} disabled={exporting}>
              Restablecer orden y selección
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Se exportarán {totalRows} movimiento{totalRows !== 1 ? 's' : ''} con {selectedCount} campo{selectedCount !== 1 ? 's' : ''}.
          </Typography>

          <Divider />

          <List disablePadding>
            {orderedFields.map((field, index) => {
              const checked = selectedKeys.includes(field.key);
              return (
                <ListItem
                  key={field.key}
                  divider
                  secondaryAction={(
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => onReorderField(field.key, 'up')}
                        disabled={index === 0 || exporting}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => onReorderField(field.key, 'down')}
                        disabled={index === orderedFields.length - 1 || exporting}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                  sx={{ pr: 10 }}
                >
                  <Checkbox
                    edge="start"
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    onChange={() => onToggleField(field.key)}
                    disabled={exporting}
                  />
                  <ListItemText
                    primary={field.label}
                    secondary={field.description || null}
                    primaryTypographyProps={{ fontWeight: checked ? 600 : 400 }}
                  />
                </ListItem>
              );
            })}
          </List>

          {selectedCount === 0 && (
            <Box>
              <Alert severity="warning">Seleccioná al menos un campo para poder exportar.</Alert>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>Cancelar</Button>
        <Button variant="contained" onClick={onExport} disabled={selectedCount === 0 || exporting}>
          {exporting ? 'Exportando…' : 'Exportar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ExportCsvDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fields: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
  })).isRequired,
  selectedKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  orderedKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleField: PropTypes.func.isRequired,
  onReorderField: PropTypes.func.isRequired,
  onSelectAll: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  exporting: PropTypes.bool,
  totalRows: PropTypes.number,
};

ExportCsvDialog.defaultProps = {
  exporting: false,
  totalRows: 0,
};

export default ExportCsvDialog;
export { moveItem };