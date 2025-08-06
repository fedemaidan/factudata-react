import React, { useState, useEffect } from "react";
import { Box, Modal, IconButton, CircularProgress, Typography, Fade } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ComprobanteModal = ({ open, onClose, imagenUrl }) => {
  const [imagenCargando, setImagenCargando] = useState(false);

  useEffect(() => {
    if (open && imagenUrl) {
      setImagenCargando(true);
    }
  }, [open, imagenUrl]);

  const handleClose = () => {
    onClose();
    setImagenCargando(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      keepMounted
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "relative",
            minWidth: "300px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            overflow: "hidden",
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              bgcolor: "rgba(0, 0, 0, 0.5)",
              color: "white",
              zIndex: 1,
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {imagenCargando && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "300px",
                bgcolor: "grey.100",
              }}
            >
              <CircularProgress />
            </Box>
          )}

          <img
            src={imagenUrl}
            alt="Comprobante"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "90vh",
              objectFit: "contain",
              display: imagenCargando ? "none" : "block",
            }}
            onError={(e) => {
              console.error("Error al cargar imagen:", imagenUrl);
              setImagenCargando(false);
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
            onLoad={() => {
              console.log("Imagen cargada exitosamente:", imagenUrl);
              setImagenCargando(false);
            }}
          />

          <Box
            sx={{
              display: "none",
              width: "100%",
              height: "300px",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "grey.100",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1">Error al cargar la imagen</Typography>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ComprobanteModal;
