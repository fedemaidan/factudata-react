import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";

const ConfirmarEliminacionModal = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = "Confirmar Eliminación",
  message = "¿Estás seguro que deseas eliminar este elemento?",
  itemName = "",
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutline color="error" />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta acción no se puede deshacer
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {message}
        </Typography>

        {itemName && (
          <Box
            sx={{
              p: 2,
              backgroundColor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Elemento a eliminar:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {itemName}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ mr: 1 }}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={<DeleteOutline />}
        >
          {loading ? "Eliminando..." : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmarEliminacionModal;
