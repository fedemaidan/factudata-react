import React from 'react';
import { Box, Fade, IconButton, Modal, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ComprobantePdfModal = ({ open, onClose, pdfUrl }) => {
  if (!pdfUrl) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      keepMounted
      aria-labelledby="comprobante-pdf-modal-title"
      aria-describedby="comprobante-pdf-modal-description"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: 'relative',
            width: 'min(96vw, 1200px)',
            height: 'min(92vh, 900px)',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'hidden',
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              bgcolor: 'rgba(0, 0, 0, 0.45)',
              color: 'white',
              zIndex: 2,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.65)',
              },
            }}
            aria-label="Cerrar"
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ width: '100%', height: '100%', pt: 0 }}>
            <Typography id="comprobante-pdf-modal-title" sx={{ display: 'none' }}>
              Comprobante PDF
            </Typography>
            <embed
              src={pdfUrl}
              type="application/pdf"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ComprobantePdfModal;
