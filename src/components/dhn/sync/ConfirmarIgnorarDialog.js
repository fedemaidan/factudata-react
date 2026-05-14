import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";

const ConfirmarIgnorarDialog = ({ open, onClose, onConfirm, row, loading = false }) => {
  const fileName = row?.file_name || "este archivo";

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirmar-ignorar-title"
    >
      <DialogTitle
        id="confirmar-ignorar-title"
        sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}
      >
        <BlockIcon sx={{ color: "grey.600" }} />
        ¿Ignorar este archivo?
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            mb: 1.5,
            p: 1,
            borderLeft: "3px solid",
            borderColor: "grey.400",
            backgroundColor: "grey.50",
            borderRadius: 0.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              wordBreak: "break-all",
              color: "text.primary",
            }}
          >
            {fileName}
          </Typography>
        </Box>
        <DialogContentText sx={{ fontSize: "0.875rem" }}>
          Se marcará como ignorado y dejará de aparecer en la lista de errores.
          Podés volver a verlo filtrando por estado &quot;Ignorado&quot;.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} variant="text" color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color="warning"
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : <BlockIcon />
          }
        >
          Ignorar archivo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmarIgnorarDialog;
