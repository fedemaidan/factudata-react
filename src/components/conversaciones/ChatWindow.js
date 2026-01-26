import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Divider,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MessageBubble from "./MessageBubble";
import MediaModal from "./MediaModal";
import { useConversationsContext } from "src/contexts/conversations-context";

export default function ChatWindow({ myNumber = "X", onOpenList }) {
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [atTop, setAtTop] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, src: null, type: 'image' });
  const [annotationDialog, setAnnotationDialog] = useState({
    open: false,
    messageId: null,
    message: null,
  });
  const [annotationText, setAnnotationText] = useState("");
  const [annotationsByMessageId, setAnnotationsByMessageId] = useState({});
  const {
    messages,
    hasMore,
    scrollToBottom,
    scrollToMessageId,
    highlightedMessageId,
    loadMore,
    handleScrollToMessageHandled,
  } = useConversationsContext();

  const items = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    if (scrollToBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length, scrollToBottom]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    const handleScroll = () => {
      const target = document.getElementById(`message-${scrollToMessageId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      handleScrollToMessageHandled();
    };
    requestAnimationFrame(handleScroll);
  }, [scrollToMessageId, handleScrollToMessageHandled]);

  const handleScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    setAtTop(scrollTop <= 10);
  };

  const handleLoadMore = async () => {
    if (!loadMore) return;
    const el = scrollContainerRef.current;
    if (!el) {
      await loadMore();
      return;
    }
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;
    await Promise.resolve(loadMore());
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        const delta = newScrollHeight - prevScrollHeight;
        el.scrollTop = prevScrollTop + delta;
      });
    });
  };

  const handleMediaClick = ({ src, type }) => {
    setMediaModal({ open: true, src, type });
  };

  const handleMediaClose = () => {
    setMediaModal({ open: false, src: null, type: 'image' });
  };

  const handleOpenAnnotationDialog = useCallback(({ messageId, message }) => {
    if (!messageId) return;
    setAnnotationDialog({ open: true, messageId, message: message || null });
    setAnnotationText("");
  }, []);

  const handleCloseAnnotationDialog = useCallback(() => {
    setAnnotationDialog({ open: false, messageId: null, message: null });
    setAnnotationText("");
  }, []);

  const handleSaveAnnotation = useCallback(() => {
    if (!annotationDialog?.messageId) return;
    const trimmed = (annotationText || "").trim();
    if (!trimmed) {
      handleCloseAnnotationDialog();
      return;
    }

    setAnnotationsByMessageId((prev) => ({
      ...prev,
      [annotationDialog.messageId]: [
        ...(prev?.[annotationDialog.messageId] || []),
        {
          text: trimmed,
          createdAt: new Date().toISOString(),
          messageSnapshot: annotationDialog.message || null,
        },
      ],
    }));

    handleCloseAnnotationDialog();
  }, [annotationDialog, annotationText, handleCloseAnnotationDialog]);

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

      {hasMore && atTop && loadMore ? (
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
        {items.map((m, i) => {
          const messageId = m.id || m._id || `${m.id_conversacion || m.conversationId || "msg"}-${i}`;
          return (
            <MessageBubble
              key={`${messageId}-${i}`}
              message={m}
              isMine={m.emisor?.toLowerCase().includes(myNumber?.toLowerCase())}
              messageId={messageId}
              isHighlighted={messageId === highlightedMessageId}
              onMediaClick={handleMediaClick}
              onAddAnnotation={handleOpenAnnotationDialog}
              annotationsCount={(annotationsByMessageId?.[messageId] || []).length}
            />
          );
        })}
        <div ref={bottomRef} />
      </Box>
      <MediaModal
        open={mediaModal.open}
        src={mediaModal.src}
        type={mediaModal.type}
        onClose={handleMediaClose}
      />
      <Dialog open={annotationDialog.open} onClose={handleCloseAnnotationDialog} fullWidth maxWidth="sm">
        <DialogTitle>Agregar anotación</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              label="Anotación"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAnnotationDialog}>Cancelar</Button>
          <Button onClick={handleSaveAnnotation} variant="contained" disabled={!annotationText.trim()}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
