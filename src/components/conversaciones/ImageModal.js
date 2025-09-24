import { Dialog, DialogContent } from "@mui/material";

export default function ImageModal({ open, src, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={false}>
      <DialogContent sx={{ p: 0, bgcolor: "black" }}>
        <img
          src={src}
          alt="mensaje-imagen"
          style={{
            display: "block",
            maxWidth: "90vw",
            maxHeight: "90vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
          onClick={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
