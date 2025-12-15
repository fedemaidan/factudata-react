import React, { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useMutation } from "@tanstack/react-query";
import productoService from "src/services/celulandia/productoService";

const EliminarTagsModal = ({
  open,
  onClose,
  productosSeleccionados = [],
  onTagsDeleted,
}) => {
  const [localError, setLocalError] = useState("");

  const productoIds = useMemo(
    () => productosSeleccionados.map((p) => p?._id).filter(Boolean),
    [productosSeleccionados]
  );

  const selectedCount = productoIds.length;

  const { mutateAsync: eliminarTagsDeProductos, isLoading: isSaving } = useMutation({
    mutationFn: async ({ productoIds: ids }) => {
      const result = await productoService.eliminarTagsDeProductos({ productoIds: ids });
      if (!result?.success) {
        throw new Error(result?.error || "No se pudieron eliminar los tags");
      }
      return result.data;
    },
  });

  const handleConfirm = useCallback(async () => {
    if (selectedCount === 0) return;

    setLocalError("");
    try {
      await eliminarTagsDeProductos({ productoIds });
      if (onTagsDeleted) onTagsDeleted();
      onClose();
    } catch (e) {
      setLocalError(e?.message || "No se pudieron eliminar los tags");
    }
  }, [eliminarTagsDeProductos, onClose, onTagsDeleted, productoIds, selectedCount]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    setLocalError("");
    onClose();
  }, [isSaving, onClose]);

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : handleClose}
      fullWidth
      TransitionProps={{ timeout: 0 }}
    >
      <DialogTitle>Eliminar todos los tags</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          ¿Estás seguro de que deseas eliminar <strong>TODOS los tags</strong> de los{' '}
          {selectedCount} productos seleccionados?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Esta acción eliminará todos los tags asociados a los productos seleccionados y no se puede
          deshacer.
        </Typography>
        {localError && (
          <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
            {localError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="warning"
          disabled={isSaving || selectedCount === 0}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSaving ? 'Eliminando...' : 'Eliminar todos los tags'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EliminarTagsModal;
