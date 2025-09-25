import { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Box, Divider, Drawer, useMediaQuery, useTheme } from "@mui/material";
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
} from "src/services/conversacionService";

export default function ConversacionesPage() {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [isListOpenMobile, setIsListOpenMobile] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Número del usuario local (POV). "X" según requerimiento
  const myNumber = "X";

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const data = await fetchConversations();
      if (!active) return;
      setConversations(data);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selected) {
        setMessages([]);
        return;
      }
      const msgs = await fetchMessages(selected.id);
      if (!active) return;
      setMessages(msgs);
    };
    load();
    return () => {
      active = false;
    };
  }, [selected?.id]);

  const onSelectConversation = (c) => setSelected(c);

  const onSend = async (text) => {
    if (!selected) return;
    const m = await sendMessage({ conversationId: selected.id, text, myNumber });
    setMessages((prev) => [...prev, m]);
    setConversations((prev) =>
      prev.map((cv) =>
        cv.id === selected.id ? { ...cv, lastMessage: text, updatedAt: m.fechaMensaje } : cv
      )
    );
  };

  const onSearch = async (q) => {
    setSearch(q);
    const results = await searchConversations(q);
    setConversations(results);
  };

  const title = useMemo(() => (selected ? getConversationTitle(selected) : ""), [selected]);

  return (
    <DashboardLayout title="Conversaciones">
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
            selectedId={selected?.id}
            onSelect={(c) => {
              onSelectConversation(c);
            }}
            search={search}
            onSearch={onSearch}
          />
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1} display="flex" flexDirection="column">
          {selected ? (
            <>
              <ChatWindow
                messages={messages}
                myNumber={myNumber}
                title={title}
                onOpenList={isMobile ? () => setIsListOpenMobile(true) : undefined}
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
              selectedId={selected?.id}
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
    </DashboardLayout>
  );
}
