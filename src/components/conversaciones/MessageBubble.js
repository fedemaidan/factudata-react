import { Box, Paper, Typography } from "@mui/material";
import { useState } from "react";
import MediaModal from "./MediaModal";
import AudioPlayer from "./AudioPlayer";

export default function MessageBubble({ message, isMine }) {
  const [open, setOpen] = useState(false);
  const [mediaType, setMediaType] = useState("image");
  const text = message?.mensaje || "";
  const date = message?.fechaMensaje ? new Date(message.fechaMensaje) : null;
  const pad = (n) => String(n).padStart(2, "0");

  const dateStr = date
    ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
    : "";
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "";

  const handleOpen = (type = "image") => {
    setMediaType(type);
    setOpen(true);
  };
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
              onClick={() => handleOpen("image")}
            />
          </Box>
        ) : null}

        {message.urlVideo ? (
          <Box mb={text ? 1 : 0} position="relative">
            <video
              src={message.urlVideo}
              style={{
                display: "block",
                width: "min(420px, 100%)",
                height: "auto",
                maxHeight: "220px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={() => handleOpen("video")}
              preload="metadata"
            />
            <Box
              position="absolute"
              top="50%"
              left="50%"
              sx={{
                transform: "translate(-50%, -50%)",
                bgcolor: "rgba(0, 0, 0, 0.6)",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => handleOpen("video")}
            >
              <Box
                sx={{
                  width: 0,
                  height: 0,
                  borderLeft: "12px solid white",
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  marginLeft: "4px",
                }}
              />
            </Box>
          </Box>
        ) : null}

        {message.tipoMensaje === "audio" && message.urlAudio ? (
          <Box mb={text ? 1 : 0}>
            <AudioPlayer
              src={message.urlAudio}
              duration={message.duracionAudio || 0}
              isMine={isMine}
            />
          </Box>
        ) : null}

        {text ? (
          <Typography variant="body2" whiteSpace="pre-wrap">
            {text}
          </Typography>
        ) : null}
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
        {message.urlImagen || message.urlVideo ? (
          <MediaModal
            open={open}
            src={message.urlImagen || message.urlVideo}
            type={mediaType}
            onClose={handleClose}
          />
        ) : null}
      </Paper>
    </Box>
  );
}
