import { Box, Paper, Typography } from "@mui/material";
import { useState } from "react";
import ImageModal from "./ImageModal";

export default function MessageBubble({ message, isMine }) {
  const [open, setOpen] = useState(false);
  const text = message?.mensaje || "";
  const date = message?.fechaMensaje ? new Date(message.fechaMensaje) : null;
  const pad = (n) => String(n).padStart(2, "0");

  const dateStr = date
    ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
    : "";
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "";

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Box display="flex" justifyContent={isMine ? "flex-end" : "flex-start"} px={2} py={0.5}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: "75%",
          p: 1,
          bgcolor: isMine ? "#d1f4cc" : "background.paper",
          borderRadius: 2,
        }}
      >
        {message.urlImagen ? (
          <Box mb={text ? 1 : 0}>
            <img
              src={message.urlImagen}
              alt="mensaje-imagen"
              style={{
                display: "block",
                width: "min(420px, 100%)",
                height: "auto",
                maxHeight: "220px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={handleOpen}
            />
          </Box>
        ) : null}
        <Typography variant="body2" whiteSpace="pre-wrap">
          {text}
        </Typography>
        <Box mt={0.5} display="flex" justifyContent="flex-end" gap={1}>
          {dateStr ? (
            <Typography variant="caption" color="text.secondary">
              {dateStr}
            </Typography>
          ) : null}
          {timeStr ? (
            <Typography variant="caption" color="text.secondary">
              {timeStr}
            </Typography>
          ) : null}
        </Box>
        {message.urlImagen ? (
          <ImageModal open={open} src={message.urlImagen} onClose={handleClose} />
        ) : null}
      </Paper>
    </Box>
  );
}
