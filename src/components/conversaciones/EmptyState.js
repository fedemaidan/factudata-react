import { Box, Button, Typography } from "@mui/material";

export default function EmptyState({ onOpenList }) {
  return (
    <Box height="100%" display="flex" alignItems="center" justifyContent="center" p={2}>
      <Box textAlign="center">
        <Typography color="text.secondary" mb={2}>
          Selecciona una conversación para comenzar
        </Typography>
        {onOpenList ? (
          <Button
            variant="contained"
            onClick={onOpenList}
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            Abrir conversaciones
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
