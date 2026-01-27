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
import { useAuth } from "src/hooks/use-auth";

export default function ChatWindow({ myNumber = "X", onOpenList }) {
  const { user } = useAuth()
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
  const [loadingNotes, setLoadingNotes] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const {
    messages,
    hasMore,
    scrollToBottom,
    scrollToMessageId,
    highlightedMessageId,
    loadMore,
    handleScrollToMessageHandled,
    onAddNote,
  } = useConversationsContext();

  const items = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    if (scrollToBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length, scrollToBottom]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    const attemptScroll = (retries = 0) => {
      const targetId = `message-${scrollToMessageId}`;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        handleScrollToMessageHandled();
      } else if (retries < 5) {
        setTimeout(() => attemptScroll(retries + 1), 100);
      } else {
        handleScrollToMessageHandled();
      }
    };
    requestAnimationFrame(() => attemptScroll());
  }, [scrollToMessageId, handleScrollToMessageHandled, items.length]);

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
    setErrorMessage("");
  }, []);

  const handleSaveAnnotation = useCallback(async () => {
    if (!annotationDialog?.messageId) return;
    const trimmed = (annotationText || "").trim();
    if (!trimmed) {
      handleCloseAnnotationDialog();
      return;
    }

    if (!user?.email) {
      setErrorMessage("No se pudo obtener el email del usuario");
      return;
    }

    const messageId = annotationDialog.messageId;
    setLoadingNotes((prev) => ({ ...prev, [messageId]: true }));
    setErrorMessage("");

    try {
      const result = await onAddNote({
        messageId,
        content: trimmed,
        userEmail: user.email,
      });

      if (result.success) {
        handleCloseAnnotationDialog();
      } else {
        setErrorMessage(result.error || "Error al guardar la nota");
      }
    } catch (error) {
      setErrorMessage("Error al guardar la nota");
      console.error("Error al guardar nota:", error);
    } finally {
      setLoadingNotes((prev) => ({ ...prev, [messageId]: false }));
    }
  }, [annotationDialog, annotationText, user, onAddNote, handleCloseAnnotationDialog]);

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
          const messageId = m._id || m.id || `${m.id_conversacion || m.conversationId || "msg"}-${i}`;
          return (
            <MessageBubble
              key={`${messageId}-${i}`}
              message={m}
              isMine={m.emisor?.toLowerCase().includes(myNumber?.toLowerCase())}
              messageId={messageId}
              isHighlighted={String(messageId) === String(highlightedMessageId)}
              onMediaClick={handleMediaClick}
              onAddAnnotation={handleOpenAnnotationDialog}
              notes={m.notas || []}
              isLoadingNote={loadingNotes[messageId] || false}
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
        <DialogTitle>Agregar nota</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              label="Nota"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              autoFocus
              error={!!errorMessage}
              helperText={errorMessage}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAnnotationDialog} disabled={loadingNotes[annotationDialog.messageId]}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveAnnotation} 
            variant="contained" 
            disabled={!annotationText.trim() || loadingNotes[annotationDialog.messageId]}
          >
            {loadingNotes[annotationDialog.messageId] ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
