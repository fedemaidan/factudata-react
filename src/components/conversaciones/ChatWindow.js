import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Divider, Typography, IconButton, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MessageBubble from './MessageBubble';

export default function ChatWindow({
  messages,
  myNumber = 'X',
  title,
  onOpenList,
  onLoadMore,
  hasMore,
  scrollToBottom = true,
}) {
  const bottomRef = useRef(null);
  const [atTop, setAtTop] = useState(false);
  const items = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    if (scrollToBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length, scrollToBottom]);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {onOpenList ? (
        <Box px={1} py={1} display="flex" alignItems="center" gap={1}>
          <IconButton
            onClick={onOpenList}
            aria-label="Abrir conversaciones"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      ) : null}
      <Divider />
      <Box
        onScroll={(e) => setAtTop(e.currentTarget.scrollTop <= 0)}
        flex={1}
        overflow="auto"
        bgcolor={(t) => (t.palette.mode === 'light' ? '#eceff1' : 'background.default')}
      >
        {hasMore && atTop && onLoadMore ? (
          <Box textAlign="center" py={1}>
            <Button size="small" onClick={onLoadMore}>
              Cargar más
            </Button>
          </Box>
        ) : null}
        {items.map((m, i) => (
          <MessageBubble
            key={(m.id || m.conversationId || m.conversacionId) + '-' + i}
            message={m}
            isMine={m.emisor === myNumber}
          />
        ))}
        <div ref={bottomRef} />
      </Box>
    </Box>
  );
}
