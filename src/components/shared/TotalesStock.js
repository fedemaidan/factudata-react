import { Box, Stack, Typography } from "@mui/material";


export const TotalesStock = ({ data }) => {
    if (!data) return null;
    const { entrada = 0, salida = 0, neto = 0 } = data;
    return (
      <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Stock del material filtrado
        </Typography>
        <Stack direction="row" spacing={2}>
          <Typography sx={{ color: 'success.main', fontWeight: 600 }}>+ {entrada}</Typography>
          <Typography sx={{ color: 'error.main', fontWeight: 600 }}>- {salida}</Typography>
          <Typography sx={{ color: neto >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
            Neto: {neto}
          </Typography>
        </Stack>
      </Box>
    );
  };