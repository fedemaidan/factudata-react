import { Dialog, DialogContent } from "@mui/material";

export default function MediaModal({ open, src, type = "image", onClose }) {
  const isVideo = type === "video";

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false}>
      <DialogContent sx={{ p: 0, bgcolor: "black" }}>
        {isVideo ? (
          <video
            src={src}
            controls
            autoPlay
            style={{
              display: "block",
              maxWidth: "90vw",
              maxHeight: "90vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
          />
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
