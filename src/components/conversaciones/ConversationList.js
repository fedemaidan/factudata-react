import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  CircularProgress,
  Chip,
  Stack,
} from "@mui/material";
import ConversacionesFilter from "./ConversacionesFilter";
import ConversationSearchBox from "./ConversationSearchBox";
import ConversationListItem from "./ConversationListItem";
import Alerts from "src/components/alerts";
import { formatFecha } from "src/utils/handleDates";
import { useConversationsContext } from "src/contexts/conversations-context";
import { getNombreCliente } from "src/utils/conversacionesUtils";
import { subDays, format, differenceInDays, parseISO } from "date-fns";

export default function ConversationList({ onSelect, onMessageSelect }) {
  const {
    conversations = [],
    selected,
    search,
    filters = {},
    messageResults = [],
    onSearchCache,
    searchConversations,
    cacheSearchActive,
    onRefreshConversations,
    onForceRefresh,
    onSelectConversation,
    onMessageSelect: handleMessageSelect,
    onFiltersChange,
    loading
  } = useConversationsContext();

  const [searchLoading, setSearchLoading] = useState(false);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState("");
  const [messagesSearchIncluded, setMessagesSearchIncluded] = useState(false);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState({ open: false, message: "", severity: "info" });
  const [searchCount, setSearchCount] = useState(0);
  const [dates, setDates] = useState({
    start: format(subDays(new Date(), 5), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (error) {
      setAlert({ open: true, message: error, severity: "error", autoHideDuration: 5000 });
    }
  }, [error]);

  useEffect(() => {
    if (searchCount === 0) return;
    const hasNoResults =
      cacheSearchActive &&
      messagesSearchIncluded &&
      !(searchConversations?.length || messageResults?.length);
    if (hasNoResults) {
      setAlert({
        open: true,
        message: "Sin resultados",
        severity: "warning",
        autoHideDuration: 3000,
      });
    }
  }, [searchCount, cacheSearchActive, messagesSearchIncluded, searchConversations?.length, messageResults?.length]);

  const handleAlertClose = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
    setError("");
  }, []);

  const handleSearchInMessages = useCallback(async () => {
    setError("");
    if (!dates.start || !dates.end) {
      setError("Debes seleccionar un rango de fechas para buscar en mensajes.");
      return;
    }
    const start = parseISO(dates.start);
    const end = parseISO(dates.end);
    const diff = differenceInDays(end, start);
    if (diff > 5) {
      setError("El rango máximo para buscar en mensajes es de 5 días.");
      return;
    }
    if (diff < 0) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }
    setSearchLoading(true);
    try {
      await onSearchCache?.(lastSubmittedQuery, {
        includeMessages: true,
        fechaDesde: dates.start,
        fechaHasta: dates.end,
      });
    } finally {
      setSearchLoading(false);
      setMessagesSearchIncluded(true);
    }
  }, [dates, lastSubmittedQuery, onSearchCache]);

  const handleSearchSubmit = useCallback(
    async (query) => {
      setError("");
      setMessagesSearchIncluded(false);
      setLastSubmittedQuery(query || "");
      setSearchCount((c) => c + 1);
      setSearchLoading(true);
      try {
        await onSearchCache?.(query, { includeMessages: false });
      } finally {
        setSearchLoading(false);
      }
    },
    [onSearchCache]
  );

  const selectedId = selected?.ultimoMensaje?.id_conversacion;

  const renderMessageSnippet = useCallback((match) => {
    const text = match?.matchMessage?.message || match?.matchMessage?.caption || "[Sin texto]";
    return text?.length > 80 ? `${text.slice(0, 80)}…` : text;
  }, []);

  const displayConversations = cacheSearchActive
    ? (searchConversations ?? [])
    : conversations;
  const hasConversationResults = displayConversations.length > 0;
  const hasMessageResults = messageResults.length > 0;

  return (
    <>
    <Box display="flex" flexDirection="column" height="100%">
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <ConversationSearchBox
          initialSearch={search}
          onSearchSubmit={handleSearchSubmit}
          loading={loading || searchLoading}
          searchLoading={searchLoading}
          onRefreshConversations={onRefreshConversations}
          onForceRefresh={onForceRefresh}
        />

        {/* Búsqueda en mensajes deshabilitada temporalmente
        {localSearch && (
          <Box>
             <Button 
                size="small" 
                onClick={() => {
                    setSearchInMessages(!searchInMessages);
                    if (!searchInMessages) setShowFilters(true);
                }}
                sx={{ textTransform: 'none', p: 0, justifyContent: 'flex-start' }}
             >
                {searchInMessages ? "No buscar en mensajes" : "¿Buscar también en mensajes?"}
             </Button>
          </Box>
        )}

        <Collapse in={searchInMessages}>
            <Box display="flex" flexDirection="column" gap={1} mt={1} p={1} bgcolor="action.hover" borderRadius={1}>
                <Typography variant="caption" color="text.secondary">
                    Búsqueda en mensajes (Máx 7 días)
                </Typography>
                <Box display="flex" gap={1}>
                    <TextField
                        type="date"
                        size="small"
                        value={dates.start}
                        onChange={(e) => setDates({...dates, start: e.target.value})}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        type="date"
                        size="small"
                        value={dates.end}
                        onChange={(e) => setDates({...dates, end: e.target.value})}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
                {error && (
                    <Alert severity="warning" sx={{ py: 0, px: 1, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                        {error}
                    </Alert>
                )}
            </Box>
        </Collapse>
        */}
        
        <ConversacionesFilter />

        {/* Chips de filtro rápido por estado de cliente */}
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          {[
            { value: 'todos', label: 'Todos', color: 'default' },
            { value: 'cliente_activo', label: 'Activos', color: 'success' },
            { value: 'dado_de_baja', label: 'Bajas', color: 'default' },
            { value: 'no_cliente', label: 'Nuevos', color: 'info' },
          ].map((option) => {
            const isSelected = filters?.estadoCliente === option.value || (!filters?.estadoCliente && option.value === 'todos');
            return (
              <Chip
                key={option.value}
                label={option.label}
                size="small"
                color={isSelected ? (option.value === 'todos' ? 'primary' : option.color) : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                onClick={() => onFiltersChange?.({ ...filters, estadoCliente: option.value, empresaId: '' })}
                sx={{ 
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  height: 24,
                  ...(isSelected && {
                    fontWeight: 600,
                    boxShadow: 1,
                  }),
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Box flex={1} overflow="auto" position="relative">
        {loading && (
            <Box 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                bottom={0} 
                bgcolor="rgba(255,255,255,0.7)" 
                zIndex={1} 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
            >
                <CircularProgress />
            </Box>
        )}
        <List dense sx={{ overflowY: "auto" }}>
          {displayConversations.map((c) => (
            <ConversationListItem
              key={c.ultimoMensaje?.id_conversacion}
              conversation={c}
              isSelected={selectedId}
              onSelect={onSelect}
              onSelectConversation={onSelectConversation}
              showInsight={filters?.showInsight}
              insightCount={c.insightCount}
            />
          ))}
          {!hasConversationResults && !hasMessageResults && (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary">
                Sin conversaciones
              </Typography>
            </Box>
          )}
        </List>

        {cacheSearchActive && lastSubmittedQuery.trim() && !messagesSearchIncluded && (
          <Box px={2} py={1.5}>
            <Stack spacing={0.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={handleSearchInMessages}
                disabled={searchLoading}
                sx={{ textTransform: "none" }}
              >
                {searchLoading ? "Buscando..." : "Buscar también en mensajes"}
              </Button>
            </Stack>
          </Box>
        )}

        {hasMessageResults && (
          <>
            <Box px={2} py={1}>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600 }}>
                Mensajes
              </Typography>
            </Box> 
            <List dense>
              {messageResults.map((match, index) => {
                const primaryLabel = getNombreCliente(match.conversation);
                const messageId = match.matchMessage?.id || match.matchMessage?._id;
                const uniqueKey = `${match.conversationId}-${messageId || index}`;
                return (
                  <ListItemButton
                    key={uniqueKey}
                    onClick={() => {
                      handleMessageSelect(match);
                      onMessageSelect?.(match);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {primaryLabel?.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography fontWeight={600} noWrap>
                            {primaryLabel}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ minWidth: 50, textAlign: "right" }}
                          >
                            {formatFecha(match.matchMessage?.createdAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {renderMessageSnippet(match)}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        )}
      </Box>
    </Box>
    <Alerts alert={alert} onClose={handleAlertClose} />
    </>
  );
}
