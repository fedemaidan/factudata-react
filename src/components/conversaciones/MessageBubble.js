import { Box, Paper, Typography } from "@mui/material";

export default function MessageBubble({ message, isMine }) {
  const text = message?.mensaje || "";
  const date = message?.fechaMensaje ? new Date(message.fechaMensaje) : null;
  const pad = (n) => String(n).padStart(2, "0");

  const dateStr = date
    ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
    : "";
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "";

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
      </Paper>
    </Box>
  );
}
