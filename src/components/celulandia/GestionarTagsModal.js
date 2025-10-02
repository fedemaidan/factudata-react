import React, { useState, useEffect } from 'react';
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
import proyeccionService from 'src/services/celulandia/proyeccionService';

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
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const fetchTags = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await proyeccionService.getTags();
      setTags(data || []);
    } catch (err) {
      setError('Error al cargar los tags');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSaveTag = async () => {
    if (!editingTagName.trim()) {
      setError('El nombre del tag no puede estar vacío');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const data = await proyeccionService.actualizarTag({
        id: editingTag._id,
        nombre: editingTagName.trim(),
      });

      if (data.success) {
        setSuccess('Tag actualizado correctamente');
        await fetchTags();
        if (onTagsUpdated) onTagsUpdated();
        handleCancelEdit();
      } else {
        setError(data.error || 'Error al actualizar el tag');
      }
    } catch (err) {
      setError('Error al actualizar el tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el tag "${tag.nombre}"?`)) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const data = await proyeccionService.eliminarTag({
        id: tag._id,
      });

      if (data.success) {
        setSuccess('Tag eliminado correctamente');
        await fetchTags();
        if (onTagsUpdated) onTagsUpdated();
      } else {
        setError(data.error || 'Error al eliminar el tag');
      }
    } catch (err) {
      setError('Error al eliminar el tag');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Gestionar Tags</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

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
        <Button onClick={onClose} disabled={isSaving}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GestionarTagsModal;
