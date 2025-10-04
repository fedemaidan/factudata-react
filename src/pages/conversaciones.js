import { useEffect, useMemo, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Divider, Drawer, useMediaQuery, useTheme } from '@mui/material';
import ConversationList from 'src/components/conversaciones/ConversationList';
import ChatWindow from 'src/components/conversaciones/ChatWindow';
import MessageInput from 'src/components/conversaciones/MessageInput';
import EmptyState from 'src/components/conversaciones/EmptyState';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  getConversationTitle,
  searchConversations,
} from 'src/services/conversacionService';

export default function ConversacionesPage() {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [isListOpenMobile, setIsListOpenMobile] = useState(false);

  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(true);
  const PAGE = 20;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const myNumber = 'Sorby';

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
      const { items, total } = await fetchMessages(selected.conversacionId, {
        limit: PAGE,
        offset: 0,
      });
      if (!active) return;
      setMessages(items);
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
    const { items, total: t } = await fetchMessages(selected.conversacionId, {
      limit: PAGE,
      offset,
    });
    setMessages((prev) => [...prev, ...items]);
    setOffset((prev) => prev + items.length);
    setTotal(t);
    setHasMore(offset + items.length < t);
  };

  const onSelectConversation = (c) => setSelected(c);

  const onSend = async (text) => {
    if (!selected) return;
    const { message } = await sendMessage({ conversationId: selected.conversacionId, text });
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

  return (
    <DashboardLayout
      title={
        selected ? `${selected.profile.firstName} ${selected.profile.lastName}` : 'Conversaciones'
      }
    >
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
          display={{ xs: 'none', sm: 'none', md: 'flex' }}
          flexDirection="column"
        >
          <ConversationList
            conversations={conversations}
            selectedId={selected?.conversacionId}
            onSelect={onSelectConversation}
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
          PaperProps={{ sx: { width: '100%', maxWidth: '100%' } }}
        >
          <Box height="100vh" display="flex" flexDirection="column">
            <ConversationList
              conversations={conversations}
              selectedId={selected?.conversacionId}
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
