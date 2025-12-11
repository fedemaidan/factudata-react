import React from "react";
import dayjs from "dayjs";
import { Card, CardContent, Stack, Box, Typography, Chip } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";

const ContenedorCard = ({ contenedor }) => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h6">{contenedor.codigo}</Typography>
          <Typography variant="caption" color="text.secondary">
            Creado: {contenedor.createdAt ? dayjs(contenedor.createdAt).format("DD/MM/YYYY") : "-"}
          </Typography>
        </Box>
        <Chip
          color="info"
          label={
            contenedor.fechaEstimadaLlegada
              ? `ETA ${dayjs(contenedor.fechaEstimadaLlegada).format("DD/MM/YYYY")}`
              : "Sin ETA"
          }
          icon={<ScheduleIcon fontSize="small" />}
          size="small"
        />
      </Stack>
      {contenedor.observaciones && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {contenedor.observaciones}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default ContenedorCard;
