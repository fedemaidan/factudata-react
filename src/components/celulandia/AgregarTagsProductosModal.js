import React, { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import productoService from "src/services/celulandia/productoService";

const AgregarTagsProductosModal = ({
  open,
  onClose,
  productosSeleccionados = [],
  onTagsAdded,
}) => {
  const queryClient = useQueryClient();
  const [selectedExistingTag, setSelectedExistingTag] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const productoIds = useMemo(
    () => productosSeleccionados.map((p) => p?._id).filter(Boolean),
    [productosSeleccionados]
  );

  const selectedCount = productoIds.length;

  const { data: tags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ["productos-tags"],
    enabled: !!open,
    queryFn: async () => {
      const result = await productoService.getTags();
      if (!result?.success) throw new Error(result?.error || "Error al cargar tags");
      return result.data || [];
    },
    retry: false,
  });

  const availableTagNames = () => {
    const names = tags.map((t) => t?.nombre).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  };

  const { mutateAsync: asignarTag, isLoading: isSaving } = useMutation({
    mutationFn: async ({ productoIds: ids, tagNombre }) => {
      const result = await productoService.agregarTagAProductos({ productoIds: ids, tagNombre });
      if (!result?.success) throw new Error(result?.error || "No se pudo agregar el tag");
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
      await queryClient.invalidateQueries({ queryKey: ["productos-tags"] });
    },
  });

  const handleClose = () => {
    if (isSaving) return;
    setErrorMsg("");
    setSelectedExistingTag("");
    setNewTagName("");
    onClose();
    }

  const handleGuardar = useCallback(async () => {
    if (selectedCount === 0) return;

    const finalTag = (newTagName || selectedExistingTag || "").trim();
    if (!finalTag) {
      setErrorMsg("Elegí un tag existente o escribí uno nuevo");
      return;
    }

    setErrorMsg("");
    try {
      await asignarTag({ productoIds, tagNombre: finalTag });
      if (onTagsAdded) onTagsAdded();
      handleClose();
    } catch (e) {
      setErrorMsg(e?.message || "No se pudo agregar el tag");
    }
  }, [
    asignarTag,
    handleClose,
    newTagName,
    onTagsAdded,
    productoIds,
    selectedCount,
    selectedExistingTag,
  ]);

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : handleClose}
      fullWidth
      maxWidth="sm"
      TransitionProps={{ timeout: 0 }}
    >
      <DialogTitle>Asignar tag a productos seleccionados</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Seleccionados: {selectedCount}
          </Typography>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

          <FormControl fullWidth size="small" disabled={isSaving || isLoadingTags}>
            <InputLabel id="existing-tag-label">Tag existente</InputLabel>
            <Select
              labelId="existing-tag-label"
              label="Tag existente"
              value={selectedExistingTag}
              onChange={(e) => setSelectedExistingTag(e.target.value)}
            >
              <MenuItem value="">
                <em>Ninguno</em>
              </MenuItem>
              {availableTagNames()?.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            O crear uno nuevo
          </Typography>
          <TextField
            size="small"
            label="Nuevo tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            disabled={isSaving}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          variant="contained"
          disabled={isSaving || selectedCount === 0}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSaving ? "Guardando…" : "Guardar tag"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarTagsProductosModal;

