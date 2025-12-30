import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  OutlinedInput,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";
import useDebouncedValue from "src/hooks/useDebouncedValue";

const formatFecha = (fecha) => {
  const date = dayjs(fecha);
  const hoy = dayjs();
  if (date.isSame(hoy, "day")) {
    return date.format("HH:mm");
  }
  return date.format("D/M");
};

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearch,
  onRefresh,
  messageMatches = [],
  onMessageSelect,
}) {
  const [localSearch, setLocalSearch] = useState(search || "");
  const debouncedSearch = useDebouncedValue(localSearch, 400);

  useEffect(() => {
    setLocalSearch(search || "");
  }, [search]);

  useEffect(() => {
    if (typeof onSearch === "function" && debouncedSearch !== (search || "")) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch, search]);

  const items = conversations || []

  const nombreCliente = (c) => {
    return ((c.profile && c.empresa)
      ? `${c.profile.firstName} ${c.profile.lastName} - (${c.empresa.nombre}) ${c.profile.phone.slice(-4)}`
      : c.ultimoMensaje?.emisor.toLowerCase() == "sorby" ? c.ultimoMensaje?.receptor : c.ultimoMensaje?.emisor)
  }

  const renderMessageSnippet = (match) => {
    const text = match?.matchMessage?.message || match?.matchMessage?.caption || "[Sin texto]";
    return text?.length > 80 ? `${text.slice(0, 80)}…` : text;
  };

  const hasConversationResults = items.length > 0;
  const hasMessageResults = messageMatches.length > 0;

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <OutlinedInput
          fullWidth
          size="small"
          placeholder="Buscar"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: "action.active" }} />
            </InputAdornment>
          }
          sx={{
            "& .MuiOutlinedInput-input": {
              py: 1,
            },
          }}
        />
        <IconButton
          onClick={onRefresh}
          title="Refrescar lista"
          size="small"
          sx={{
            flexShrink: 0,
            color: "action.active"
          }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box flex={1} overflow="auto">
        <List dense sx={{ overflowY: "auto" }}>
          {items.map((c) => (
            <ListItemButton
              key={c.ultimoMensaje?.id_conversacion}
              selected={c.ultimoMensaje?.id_conversacion === selectedId}
              onClick={() => onSelect?.(c)}
            >
              <ListItemAvatar>
                <Avatar>
                  {nombreCliente(c)?.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography fontWeight={600} noWrap>
                      {nombreCliente(c)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ minWidth: 45, textAlign: "right" }}
                    >
                      {formatFecha(c.ultimoMensaje?.fecha)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {c.ultimoMensaje?.type === "text" || c.ultimoMensaje?.type === "text_extended"
                      ? c.ultimoMensaje?.message || ""
                      : `${
                          c.ultimoMensaje?.type.charAt(0).toUpperCase() + c.ultimoMensaje?.type.slice(1)
                        }`}
                  </Typography>
                }
              />
            </ListItemButton>
          ))}
          {!hasConversationResults && !hasMessageResults && (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary">
                Sin conversaciones
              </Typography>
            </Box>
          )}
        </List>

        {hasMessageResults && (
          <>
            <Box px={2} py={1}>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600 }}>
                Mensajes
              </Typography>
            </Box>
            <List dense>
              {messageMatches.map((match, index) => {
                const primaryLabel = nombreCliente(match.conversation);
                const messageId = match.matchMessage?.id || match.matchMessage?._id;
                const uniqueKey = `${match.conversationId}-${messageId || index}`;
                return (
                  <ListItemButton
                    key={uniqueKey}
                    onClick={() => onMessageSelect?.(match)}
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
  );
}
