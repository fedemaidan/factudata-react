import {
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Box,
  Typography,
} from "@mui/material";

export default function ConversationListItem({ conversation, selected, onClick }) {
  const initial = (conversation.displayName || conversation.userId || "?").charAt(0).toUpperCase();
  return (
    <ListItemButton selected={selected} onClick={onClick}>
      <ListItemAvatar>
        <Avatar>{initial}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={600} noWrap>
              {conversation.displayName || conversation.userId}
            </Typography>
          </Box>
        }
        secondary={
          <Typography variant="body2" color="text.secondary" noWrap>
            {conversation.lastMessage || ""}
          </Typography>
        }
      />
    </ListItemButton>
  );
}
