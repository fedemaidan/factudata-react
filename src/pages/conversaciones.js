import { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { 
  Box, 
  Divider, 
  Drawer, 
  useMediaQuery, 
  useTheme,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import ConversationList from "src/components/conversaciones/ConversationList";
import ChatWindow from "src/components/conversaciones/ChatWindow";
import MessageInput from "src/components/conversaciones/MessageInput";
import EmptyState from "src/components/conversaciones/EmptyState";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  getConversationTitle,
  searchConversations,
  downloadConversation
} from "src/services/conversacionService";

export default function ConversacionesPage() {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [isListOpenMobile, setIsListOpenMobile] = useState(false);

  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(true);
  
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadDates, setDownloadDates] = useState({ start: '', end: '' });

  const PAGE = 50;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const myNumber = "sorby";

  console.log(conversations);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const data = await fetchConversations();
      if (!active) return;
      setConversations(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selected) {
        setMessages([]);
        setOffset(0);
        setTotal(0);
        setHasMore(false);
        return;
      }
      const { items, total } = await fetchMessages(selected.ultimoMensaje.id_conversacion, {
        limit: PAGE,
        offset: 0,
      });
      if (!active) return;
      setMessages(items.reverse());
      setOffset(items.length);
      setTotal(total);
      setHasMore(items.length < total);
      setScrollToBottom(true);
    })();
    return () => {
      active = false;
    };
  }, [selected]);

  const loadMore = async () => {
    if (!selected || !hasMore) return;
    setScrollToBottom(false);
    const { items, total: t } = await fetchMessages(selected.ultimoMensaje.id_conversacion, {
      limit: PAGE,
      offset,
    });
    setMessages((prev) => [...items.reverse(), ...prev]);
    setOffset((prev) => prev + items.length);
    setTotal(t);
    setHasMore(offset + items.length < t);
  };

  const onSelectConversation = (c) => setSelected(c);

  const onSend = async (text) => {
    if (!selected) return;
    const { message } = await sendMessage({
      conversationId: selected.ultimoMensaje.id_conversacion,
      text,
    });
    setMessages((prev) => [...prev, message]);
    setConversations((prev) =>
      prev.map((cv) =>
        cv.id === selected.id ? { ...cv, lastMessage: text, updatedAt: message.fecha } : cv
      )
    );
    setTotal((t) => t + 1);
    setScrollToBottom(true);
  };

  const onSearch = async (q) => {
    setSearch(q);
    setConversations(await searchConversations(q));
  };

  const handleDownload = async () => {
    if (!selected || !downloadDates.start || !downloadDates.end) return;
    try {
        const response = await downloadConversation(selected.ultimoMensaje.id_conversacion, downloadDates.start, downloadDates.end);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `conversacion_${downloadDates.start}_${downloadDates.end}.txt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setDownloadOpen(false);
    } catch (e) {
        console.error(e);
    }
  };

  const nombreCliente = (c) => {
    return ((c.profile && c.empresa)
        ? `${c.profile.firstName} ${c.profile.lastName} - (${c.empresa.nombre}) ${c.profile.phone.slice(-4)}`
        : c.ultimoMensaje.emisor.toLowerCase() == "sorby" ? c.ultimoMensaje.receptor : c.ultimoMensaje.emisor)
  }

  const getTitulo = useMemo(() => {
    if (!selected) return "Conversaciones";
    return nombreCliente(selected);
  }, [selected]);

  return (
    <DashboardLayout title={getTitulo}>
      <Head>
        <title>Conversaciones</title>
      </Head>
      <Box
        display="flex"
        height="calc(100vh - 120px)"
        border="1px solid"
        borderColor="divider"
        borderRadius={1}
        overflow="hidden"
      >
        <Box
          width={360}
          minWidth={320}
          maxWidth={420}
          display={{ xs: "none", sm: "none", md: "flex" }}
          flexDirection="column"
        >
          <ConversationList
            conversations={conversations}
            selectedId={selected?.ultimoMensaje.id_conversacion}
            onSelect={onSelectConversation}
            search={search}
            onSearch={onSearch}
          />
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1} display="flex" flexDirection="column" minHeight={0}>
          {selected ? (
            <>
              <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderBottom="1px solid" borderColor="divider">
                  <Typography variant="h6">{getTitulo}</Typography>
                  <IconButton onClick={() => setDownloadOpen(true)} title="Descargar conversación">
                      <DownloadIcon />
                  </IconButton>
              </Box>
              <ChatWindow
                messages={messages}
                myNumber={myNumber}
                onOpenList={isMobile ? () => setIsListOpenMobile(true) : undefined}
                onLoadMore={loadMore}
                hasMore={hasMore}
                scrollToBottom={scrollToBottom}
              />
              <MessageInput onSend={onSend} />
            </>
          ) : (
            <EmptyState onOpenList={isMobile ? () => setIsListOpenMobile(true) : undefined} />
          )}
        </Box>
      </Box>
      {isMobile ? (
        <Drawer
          open={isListOpenMobile}
          onClose={() => setIsListOpenMobile(false)}
          anchor="left"
          PaperProps={{ sx: { width: "100%", maxWidth: "100%" } }}
        >
          <Box height="100vh" display="flex" flexDirection="column">
            <ConversationList
              conversations={conversations}
              selectedId={selected?.ultimoMensaje.id_conversacion}
              onSelect={(c) => {
                onSelectConversation(c);
                setIsListOpenMobile(false);
              }}
              search={search}
              onSearch={onSearch}
            />
          </Box>
        </Drawer>
      ) : null}

      <Dialog open={downloadOpen} onClose={() => setDownloadOpen(false)}>
        <DialogTitle>Descargar Conversación</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Fecha Inicio"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={downloadDates.start}
              onChange={(e) => setDownloadDates({ ...downloadDates, start: e.target.value })}
              fullWidth
            />
            <TextField
              label="Fecha Fin"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={downloadDates.end}
              onChange={(e) => setDownloadDates({ ...downloadDates, end: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadOpen(false)}>Cancelar</Button>
          <Button onClick={handleDownload} variant="contained" disabled={!downloadDates.start || !downloadDates.end}>
            Descargar
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
