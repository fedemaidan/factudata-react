import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Divider, Typography, IconButton, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  messages,
  myNumber = "X",
  title,
  onOpenList,
  onLoadMore,
  hasMore,
  scrollToBottom = true,
}) {
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [atTop, setAtTop] = useState(false);
  const items = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    if (scrollToBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length, scrollToBottom]);

  const handleScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    setAtTop(scrollTop <= 10);
  };

  const handleLoadMore = async () => {
    if (!onLoadMore) return;
    const el = scrollContainerRef.current;
    if (!el) {
      await onLoadMore();
      return;
    }
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;
    await Promise.resolve(onLoadMore());
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        const delta = newScrollHeight - prevScrollHeight;
        el.scrollTop = prevScrollTop + delta;
      });
    });
  };

  console.log(atTop)
  console.log(hasMore)
  console.log(onLoadMore)

  return (
    <Box display="flex" flexDirection="column" height="100%" minHeight={0}>
      {onOpenList ? (
        <Box px={1} py={1} display="flex" alignItems="center" gap={1}>
          <IconButton
            onClick={onOpenList}
            aria-label="Abrir conversaciones"
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      ) : null}
      <Divider />

      {hasMore && atTop && onLoadMore ? (
        <Box textAlign="center" py={0.5} px={2}>
          <Button
            size="small"
            onClick={handleLoadMore}
            variant="text"
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: '0.813rem',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            Cargar mensajes anteriores
          </Button>
        </Box>
      ) : null}

      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        flex={1}
        overflow="auto"
        bgcolor={(t) => (t.palette.mode === "light" ? "#eceff1" : "background.default")}
        sx={{ overflowY: 'scroll', position: 'relative', minHeight: 0, pt: 1, pb: 2 }}
      >
        {items.map((m, i) => (
          <MessageBubble
            key={(m.id || m.conversationId || m.id_conversacion) + "-" + i}
            message={m}
            isMine={m.emisor?.toLowerCase().includes(myNumber?.toLowerCase())}
          />
        ))}
        <div ref={bottomRef} />
      </Box>
    </Box>
  );
}
