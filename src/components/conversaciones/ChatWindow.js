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
  Chip,
  Tooltip,
  Link as MuiLink,
  CircularProgress,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SyncIcon from "@mui/icons-material/Sync";
import MessageBubble from "./MessageBubble";
import MediaModal from "./MediaModal";
import UserConfigDialog from "./UserConfigDialog";
import { useConversationsContext } from "src/contexts/conversations-context";
import { useAuth } from "src/hooks/use-auth";
import { syncConversationProfile } from "src/services/conversacionService";
import Link from "next/link";

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
  const [userConfigOpen, setUserConfigOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const {
    messages,
    hasMore,
    scrollToBottom,
    scrollToMessageId,
    highlightedMessageId,
    insightMessageIds,
    loadMore,
    handleScrollToMessageHandled,
    onAddNote,
    selected,
    onRefreshConversations,
  } = useConversationsContext();

  // Datos de la conversación seleccionada
  const conversationEmpresa = selected?.empresa;
  const conversationProfile = selected?.profile;
  const conversationPhone = selected?.wPid?.split('@')[0] || selected?.lid || '';

  const items = useMemo(() => messages || [], [messages]);
  const insightIdsSet = useMemo(() => new Set((insightMessageIds || []).map(String)), [insightMessageIds]);

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
      {/* Header con menú móvil, info empresa y configurar usuario */}
      <Box 
        px={1.5} 
        py={1} 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
        sx={{ minHeight: 48 }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          {onOpenList && (
            <IconButton
              onClick={onOpenList}
              aria-label="Abrir conversaciones"
              sx={{ display: { xs: "inline-flex", md: "none" } }}
              size="small"
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* Link a la empresa */}
          {conversationEmpresa && (
            <Tooltip title={`Ir a ${conversationEmpresa.nombre}`}>
              <Chip
                icon={<BusinessIcon />}
                label={conversationEmpresa.nombre}
                size="small"
                color="primary"
                variant="outlined"
                component={Link}
                href={`/empresa?empresaId=${conversationEmpresa.id}`}
                clickable
                sx={{
                  maxWidth: { xs: 150, sm: 200 },
                  '& .MuiChip-label': { 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }
                }}
              />
            </Tooltip>
          )}
          
          {/* Info del perfil si existe */}
          {conversationProfile && (
            <Chip
              icon={<PersonIcon />}
              label={`${conversationProfile.firstName || ''} ${conversationProfile.lastName || ''}`.trim() || conversationPhone}
              size="small"
              variant="outlined"
              sx={{
                maxWidth: { xs: 120, sm: 180 },
                '& .MuiChip-label': { 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }
              }}
            />
          )}
        </Box>
        
        {/* Botón para configurar usuario - OCULTO TEMPORALMENTE */}
        <Box display="flex" alignItems="center" gap={0.5}>
          {/* Botón para sincronizar profile */}
          {selected?._id && (
            <Tooltip title={conversationProfile ? "Actualizar datos del usuario" : "Buscar y vincular usuario registrado"}>
              <IconButton
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const result = await syncConversationProfile(selected._id);
                    if (result.updated) {
                      await onRefreshConversations();
                    } else {
                      alert(result.reason || 'No se encontró un usuario registrado con este número');
                    }
                  } catch (error) {
                    console.error('Error sincronizando profile:', error);
                    alert('Error al buscar usuario');
                  } finally {
                    setSyncing(false);
                  }
                }}
                size="small"
                color="primary"
                disabled={syncing}
              >
                {syncing ? <CircularProgress size={18} /> : <SyncIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          
          {/* <Tooltip title="Configurar usuario">
            <IconButton
              onClick={() => setUserConfigOpen(true)}
              size="small"
              color="primary"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip> */}
          
          {conversationEmpresa && (
            <Tooltip title="Abrir empresa en nueva pestaña">
              <IconButton
                component="a"
                href={`/empresa?empresaId=${conversationEmpresa.id}`}
                target="_blank"
                size="small"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
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
              isFilteredInsight={insightIdsSet.has(String(messageId))}
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
      
      {/* Modal para configurar usuario */}
      <UserConfigDialog
        open={userConfigOpen}
        onClose={() => setUserConfigOpen(false)}
        usuario={conversationProfile}
        empresa={conversationEmpresa}
        phone={conversationPhone}
        onSuccess={() => {
          // Opcionalmente refrescar la conversación
          setUserConfigOpen(false);
        }}
      />
    </Box>
  );
}
