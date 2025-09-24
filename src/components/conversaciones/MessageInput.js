import { useState } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

export default function MessageInput({ onSend }) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;
    onSend?.(text);
    setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      p={1}
      borderTop="1px solid"
      borderColor="divider"
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Escribe un mensaje"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        multiline
        maxRows={4}
      />
      <IconButton color="primary" onClick={handleSend} aria-label="Enviar">
        <SendIcon />
      </IconButton>
    </Box>
  );
}
