import { useCallback, memo } from "react";
import {
  Box,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Tooltip,
} from "@mui/material";
import { formatFecha } from "src/utils/handleDates";
import { getNombreCliente } from "src/utils/conversacionesUtils";

const ESTADO_CLIENTE_COLORS = {
  cliente_activo: { border: "#4caf50", bg: "#e8f5e9", label: "Activo" },
  dado_de_baja: { border: "#ef5350", bg: "#ffebee", label: "Baja" },
  no_cliente: { border: "#2196f3", bg: "#e3f2fd", label: "Nuevo" },
};

const getEstadoCliente = (conversation) => {
  const empresa = conversation?.empresa;
  if (!empresa) return "no_cliente";
  if (!empresa.esCliente) return "no_cliente";
  if (empresa.estaDadoDeBaja) return "dado_de_baja";
  return "cliente_activo";
};

const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
  onSelectConversation,
  showInsight,
  insightCount,
}) {
  const estadoCliente = getEstadoCliente(conversation);
  const estadoConfig = ESTADO_CLIENTE_COLORS[estadoCliente];
  const nombre = getNombreCliente(conversation);
  const id = conversation?.ultimoMensaje?.id_conversacion;

  const handleClick = useCallback(() => {
    onSelectConversation(conversation);
    onSelect?.(conversation);
  }, [conversation, onSelectConversation, onSelect]);

  const renderInsightBadge = () => {
    const count = Number(insightCount || 0);
    if (!count) return null;
    return (
      <Badge
        color="warning"
        badgeContent={count}
        sx={{
          "& .MuiBadge-badge": {
            fontSize: "0.65rem",
            minWidth: 16,
            height: 16,
            px: 0.5,
          },
        }}
      >
        <Box sx={{ width: 8, height: 8 }} />
      </Badge>
    );
  };

  const lastMsg = conversation?.ultimoMensaje;
  const secondaryText =
    lastMsg?.type === "text" || lastMsg?.type === "text_extended"
      ? lastMsg?.message || ""
      : lastMsg?.type
        ? lastMsg.type.charAt(0).toUpperCase() + lastMsg.type.slice(1)
        : "";

  return (
    <Tooltip title={estadoConfig?.label || ""} placement="left" arrow>
      <ListItemButton
        selected={id === isSelected}
        onClick={handleClick}
        sx={{
          borderLeft: `4px solid ${estadoConfig?.border || "transparent"}`,
          "&:hover": { bgcolor: estadoConfig?.bg || "action.hover" },
          "&.Mui-selected": {
            borderLeft: `4px solid ${estadoConfig?.border || "transparent"}`,
          },
        }}
      >
        <ListItemAvatar>
          <Avatar>{nombre?.charAt(0).toUpperCase()}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography fontWeight={600} noWrap>
                {nombre}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {showInsight && renderInsightBadge()}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 45, textAlign: "right" }}
                >
                  {formatFecha(lastMsg?.fecha)}
                </Typography>
              </Box>
            </Box>
          }
          secondary={
            <Typography variant="body2" color="text.secondary" noWrap>
              {secondaryText}
            </Typography>
          }
        />
      </ListItemButton>
    </Tooltip>
  );
});

export default ConversationListItem;
