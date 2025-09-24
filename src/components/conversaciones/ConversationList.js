import { useMemo } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearch,
}) {
  const items = useMemo(() => conversations || [], [conversations]);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box p={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar"
          value={search}
          onChange={(e) => onSearch?.(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <List dense sx={{ overflowY: "auto", flex: 1 }}>
        {items.map((c) => (
          <ListItemButton key={c.id} selected={c.id === selectedId} onClick={() => onSelect?.(c)}>
            <ListItemAvatar>
              <Avatar>{(c.displayName || c.userId || "?").charAt(0).toUpperCase()}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography fontWeight={600} noWrap>
                    {c.displayName || c.userId}
                  </Typography>
                </Box>
              }
              secondary={
                <Typography variant="body2" color="text.secondary" noWrap>
                  {c.lastMessage || ""}
                </Typography>
              }
            />
          </ListItemButton>
        ))}
        {items.length === 0 && (
          <Box p={2}>
            <Typography variant="body2" color="text.secondary">
              Sin conversaciones
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}
