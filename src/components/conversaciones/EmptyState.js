import { Box, Typography } from "@mui/material";

export default function EmptyState() {
  return (
    <Box height="100%" display="flex" alignItems="center" justifyContent="center" p={2}>
      <Typography color="text.secondary">Selecciona una conversación para comenzar</Typography>
    </Box>
  );
}
