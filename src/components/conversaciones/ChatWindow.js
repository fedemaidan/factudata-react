import { useEffect, useMemo, useRef } from "react";
import { Box, Divider, Typography, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages, myNumber = "X", title, onOpenList }) {
  const bottomRef = useRef(null);
  const items = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box px={1} py={1} display="flex" alignItems="center" gap={1}>
        {onOpenList ? (
          <IconButton
            onClick={onOpenList}
            aria-label="Abrir conversaciones"
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        ) : null}
        <Typography variant="subtitle1" fontWeight={600} noWrap>
          {title}
        </Typography>
      </Box>
      <Divider />
      <Box
        flex={1}
        overflow="auto"
        bgcolor={(theme) => (theme.palette.mode === "light" ? "#eceff1" : "background.default")}
      >
        {items.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.emisor === myNumber} />
        ))}
        <div ref={bottomRef} />
      </Box>
    </Box>
  );
}
