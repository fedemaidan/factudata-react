import React, { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const STORAGE_KEY = 'columnasOrden';

const getLabelByKey = (columnasFiltradas, key) =>
  columnasFiltradas.find(([campo]) => campo === key)?.[1] || key;

const OrdenarColumnasDialog = ({
  open,
  onClose,
  columnasFiltradas,
  columnasOrden,
  onOrdenChange,
  ordenPredeterminado,
}) => {
  const draggingIndex = useRef(null);

  const columnasVisiblesKeys = (columnasFiltradas || []).map(([key]) => key);

  const ordenActual = useCallback(() => columnasVisiblesKeys, [columnasVisiblesKeys]);

  const handleDragStart = useCallback((event, index) => {
    draggingIndex.current = index;
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (dropIndex) => {
      const fromIndex = draggingIndex.current;
      if (fromIndex == null || fromIndex === dropIndex) return;
      const visibleOrden = [...ordenActual()];
      const [removed] = visibleOrden.splice(fromIndex, 1);
      visibleOrden.splice(dropIndex, 0, removed);
      const visibleSet = new Set(visibleOrden);
      const ocultas = (columnasOrden || []).filter((k) => !visibleSet.has(k));
      onOrdenChange([...visibleOrden, ...ocultas]);
      draggingIndex.current = null;
    },
    [ordenActual, columnasOrden, onOrdenChange]
  );

  const handleGuardar = useCallback(() => {
    const visibleOrden = ordenActual();
    const visibleSet = new Set(visibleOrden);
    const ocultas = (columnasOrden || []).filter((k) => !visibleSet.has(k));
    const nuevoOrden = [...visibleOrden, ...ocultas];
    onOrdenChange(nuevoOrden);
    onClose();
  }, [ordenActual, columnasOrden, onOrdenChange, onClose]);

  const handleRestablecer = useCallback(() => {
    if (!ordenPredeterminado?.length) return;
    const visibleSet = new Set(columnasVisiblesKeys);
    const ordenVisible = ordenPredeterminado.filter((k) => visibleSet.has(k));
    const ocultas = (columnasOrden || []).filter((k) => !visibleSet.has(k));
    onOrdenChange([...ordenVisible, ...ocultas]);
  }, [ordenPredeterminado, columnasVisiblesKeys, columnasOrden, onOrdenChange]);

  if (!open) return null;

  const orden = ordenActual();

  if (orden.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Ordenar columnas</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            No hay columnas visibles. Activá columnas en &quot;Columnas visibles&quot; primero.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ordenar columnas</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Arrastrá las columnas para cambiar el orden en la tabla.
        </Typography>
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          sx={{
            minHeight: 48,
            p: 1,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'action.hover',
          }}
        >
          {orden.map((key, index) => (
            <Box
              key={key}
              component="div"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <DragIndicatorIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2">{getLabelByKey(columnasFiltradas, key)}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        {ordenPredeterminado?.length > 0 && (
          <Button onClick={handleRestablecer} color="inherit" sx={{ mr: 'auto' }}>
            Restablecer orden
          </Button>
        )}
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar}>
          Guardar orden
        </Button>
      </DialogActions>
    </Dialog>
  );
};

OrdenarColumnasDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  columnasFiltradas: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
  columnasOrden: PropTypes.arrayOf(PropTypes.string),
  onOrdenChange: PropTypes.func.isRequired,
  ordenPredeterminado: PropTypes.arrayOf(PropTypes.string),
};

export default OrdenarColumnasDialog;
export { STORAGE_KEY };
