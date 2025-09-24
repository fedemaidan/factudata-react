import { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Box, Divider } from "@mui/material";
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
        <Box width={360} minWidth={320} maxWidth={420} display="flex" flexDirection="column">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id}
            onSelect={onSelectConversation}
            search={search}
            onSearch={onSearch}
          />
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1} display="flex" flexDirection="column">
          {selected ? (
            <>
              <ChatWindow messages={messages} myNumber={myNumber} title={title} />
              <MessageInput onSend={onSend} />
            </>
          ) : (
            <EmptyState />
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
