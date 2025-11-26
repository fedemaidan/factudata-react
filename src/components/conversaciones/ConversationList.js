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
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";

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
}) {
  const items = useMemo(() => conversations || [], [conversations]);

  const nombreCliente = (c) => {
   return ((c.profile && c.empresa)
      ? `${c.profile.firstName} ${c.profile.lastName} - (${c.empresa.nombre}) ${c.profile.phone.slice(-4)}`
      : c.ultimoMensaje?.emisor.toLowerCase() == "sorby" ? c.ultimoMensaje?.receptor : c.ultimoMensaje?.emisor)
  }
  console.log(items)
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box p={1} display="flex" alignItems="center" gap={1}>
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
        <IconButton onClick={onRefresh} title="Refrescar lista">
            <RefreshIcon />
        </IconButton>
      </Box>
      <List dense sx={{ overflowY: "auto", flex: 1 }}>
        {items.map((c) => {
          return (
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
        )})}
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
