import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import proyeccionService from "src/services/celulandia/proyeccionService";

const AgregarIgnorarProductosModal = ({ open, onClose }) => {
  const [productosIgnorados, setProductosIgnorados] = useState([]); // [{ _id, codigo }]
  const [inputValue, setInputValue] = useState("");
  const [nuevosProductos, setNuevosProductos] = useState([]); // ["CODIGO", ...]
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProductosIgnorados = useCallback(async () => {
    try {
      setErrorMsg("");
      const response = await proyeccionService.getProductosIgnorados();
      setProductosIgnorados(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error al cargar productos ignorados", error);
      setErrorMsg("No se pudo cargar la lista de productos ignorados.");
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchProductosIgnorados();
      setNuevosProductos([]);
      setInputValue("");
    }
  }, [open, fetchProductosIgnorados]);

  const todosLosExistentes = useMemo(
    () => new Set(productosIgnorados.map((item) => String(item?.codigo))),
    [productosIgnorados]
  );
  const todosLosNuevos = useMemo(
    () => new Set(nuevosProductos.map((codigo) => String(codigo))),
    [nuevosProductos]
  );

  const parseCodes = (text) => {
    return text
      .split(/[\s,;\n]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  };

  const addCodes = (codes) => {
    if (!codes || codes.length === 0) return;
    const filtrados = codes
      .map(String)
      .filter((c) => !todosLosExistentes.has(c) && !todosLosNuevos.has(c));
    if (filtrados.length === 0) return;
    setNuevosProductos((prev) => [...prev, ...filtrados]);
  };

  const handleAddFromInput = () => {
    const codes = parseCodes(inputValue);
    addCodes(codes);
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFromInput();
    }
  };

  const handleRemoveNuevo = (codigo) => {
    setNuevosProductos((prev) => prev.filter((c) => c !== codigo));
  };

  const handleRemoveExistente = async (id) => {
    try {
      setErrorMsg("");
      await proyeccionService.eliminarArticuloIgnorado({ id });
      await fetchProductosIgnorados();
    } catch (error) {
      console.error("Error al eliminar producto ignorado", error);
      setErrorMsg("No se pudo eliminar el producto ignorado.");
    }
  };

  const handleGuardar = async () => {
    if (nuevosProductos.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await proyeccionService.ignorarArticulos({ codigos: nuevosProductos });
      await fetchProductosIgnorados();
      setNuevosProductos([]);
      setInputValue("");
    } catch (error) {
      console.error("Error al guardar productos ignorados", error);
      setErrorMsg("No se pudo guardar. Verificá los códigos e intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Gestionar Productos Ignorados</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

          <TextField
            label="Agregar códigos (presionar Enter)"
            placeholder="Ej: A123, B456 C789"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
          />

          {nuevosProductos.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Para agregar
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {nuevosProductos.map((codigo) => (
                  <Chip
                    key={`nuevo-${codigo}`}
                    label={codigo}
                    color="secondary"
                    variant="filled"
                    onDelete={() => handleRemoveNuevo(codigo)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Stack>
          )}

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Existentes
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {productosIgnorados.map((item) => (
                <Chip
                  key={item._id || `existente-${item.codigo}`}
                  label={item.codigo}
                  color="primary"
                  variant="outlined"
                  onDelete={() => handleRemoveExistente(item._id)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          variant="contained"
          disabled={isSubmitting || nuevosProductos.length === 0}
        >
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarIgnorarProductosModal;
