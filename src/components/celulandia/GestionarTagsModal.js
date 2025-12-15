import React, { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Chip,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import productoService from "src/services/celulandia/productoService";

// Genera un color pastel determinístico basado en el texto del tag
const getTagColor = (tag) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  const s = 75 + (hash % 10);
  const l = 85 + (hash % 5);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const GestionarTagsModal = ({ open, onClose, onTagsUpdated }) => {
  const queryClient = useQueryClient();

  const [editingTag, setEditingTag] = useState(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    data: tags = [],
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["productos-tags"],
    enabled: !!open,
    queryFn: async () => {
      const result = await productoService.getTags();
      if (!result?.success) {
        throw new Error(result?.error || "Error al cargar los tags");
      }
      return result.data || [];
    },
    retry: false,
  });

  const { mutateAsync: actualizarTag, isLoading: isUpdating } = useMutation({
    mutationFn: async ({ id, nombre }) => {
      const result = await productoService.actualizarTag({ id, nombre });
      if (!result?.success) {
        throw new Error(result?.error || "Error al actualizar el tag");
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos-tags"] });
      if (onTagsUpdated) onTagsUpdated();
    },
  });

  const { mutateAsync: eliminarTag, isLoading: isDeleting } = useMutation({
    mutationFn: async ({ id }) => {
      const result = await productoService.eliminarTag({ id });
      if (!result?.success) {
        throw new Error(result?.error || "Error al eliminar el tag");
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos-tags"] });
      if (onTagsUpdated) onTagsUpdated();
    },
  });

  const isSaving = isUpdating || isDeleting;
  const loadingText = useMemo(() => {
    if (isLoading || isFetching) return "Cargando tags...";
    if (isSaving) return "Guardando cambios...";
    return "";
  }, [isFetching, isLoading, isSaving]);

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setEditingTagName(tag.nombre);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditingTagName('');
    setError('');
    setSuccess('');
  };

  const handleSaveTag = useCallback(async () => {
    if (!editingTag?._id) return;

    const nombre = editingTagName?.trim();
    if (!nombre) {
      setError("El nombre del tag no puede estar vacío");
      return;
    }

    setError("");
    setSuccess("");
    try {
      await actualizarTag({ id: editingTag._id, nombre });
      setSuccess("Tag actualizado correctamente");
      handleCancelEdit();
    } catch (e) {
      setError(e?.message || "Error al actualizar el tag");
    }
  }, [actualizarTag, editingTag?._id, editingTagName, handleCancelEdit]);

  const handleDeleteTag = useCallback(
    async (tag) => {
      if (!tag?._id) return;

      const confirmed = window.confirm(
        `¿Estás seguro de que deseas eliminar el tag "${tag.nombre}"?`
      );
      if (!confirmed) return;

      setError("");
      setSuccess("");
      try {
        await eliminarTag({ id: tag._id });
        setSuccess("Tag eliminado correctamente");
      } catch (e) {
        setError(e?.message || "Error al eliminar el tag");
      }
    },
    [eliminarTag]
  );

  const handleClose = useCallback(() => {
    handleCancelEdit();
    onClose();
  }, [handleCancelEdit, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Gestionar Tags</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!!loadingText && (
            <Alert severity="info" sx={{ display: "flex", alignItems: "center" }}>
              {loadingText}
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {isError && !error && <Alert severity="error">Error al cargar los tags</Alert>}

          {/* Lista de tags existentes */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Tags existentes ({tags.length})
            </Typography>
            {isLoading ? (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Stack spacing={1}>
                {tags.map((tag) => (
                  <Box
                    key={tag._id}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {editingTag && editingTag._id === tag._id ? (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                        <TextField
                          size="small"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          sx={{ flexGrow: 1 }}
                          disabled={isSaving}
                        />
                        <IconButton
                          size="small"
                          onClick={handleSaveTag}
                          disabled={isSaving || !editingTagName.trim()}
                          color="primary"
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton size="small" onClick={handleCancelEdit} disabled={isSaving}>
                          <CancelIcon />
                        </IconButton>
                      </Stack>
                    ) : (
                      <>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                          <Chip
                            label={tag.nombre}
                            size="small"
                            sx={{
                              backgroundColor: getTagColor(tag.nombre),
                              color: 'text.primary',
                              fontWeight: 500,
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {tag.codigos?.length || 0} productos
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditTag(tag)}
                            disabled={isSaving}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTag(tag)}
                            disabled={isSaving}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </>
                    )}
                  </Box>
                ))}
                {tags.length === 0 && !isLoading && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 2 }}
                  >
                    No hay tags creados
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GestionarTagsModal;
