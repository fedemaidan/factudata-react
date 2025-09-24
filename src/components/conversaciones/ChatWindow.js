import { useEffect, useMemo, useRef } from "react";
import { Box, Divider, Typography } from "@mui/material";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages, myNumber = "X", title }) {
  const bottomRef = useRef(null);
  const items = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box px={2} py={1}>
        <Typography variant="subtitle1" fontWeight={600}>
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
