import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";

const TIPOS_HORAS = [
  { key: "horasNormales", label: "Normales", color: "default" },
  { key: "horas50", label: "50%", color: "primary" },
  { key: "horas100", label: "100%", color: "success" },
  { key: "horasAltura", label: "Altura", color: "warning" },
  { key: "horasHormigon", label: "Hormigon", color: "info" },
  { key: "horasZanjeo", label: "Zanjeo", color: "secondary" },
  { key: "horasNocturnas", label: "Nocturnas", color: "default", sx: { borderColor: "#5c6bc0", color: "#5c6bc0" } },
  { key: "horasNocturnas50", label: "Noct. 50%", color: "default", sx: { borderColor: "#ab47bc", color: "#ab47bc" } },
  { key: "horasNocturnas100", label: "Noct. 100%", color: "default", sx: { borderColor: "#ec407a", color: "#ec407a" } },
];

const formatFecha = (fecha) => {
  if (!fecha) return "-";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const HorasChips = ({ item }) => {
  const horasConValor = TIPOS_HORAS.filter(
    (tipo) => item[tipo.key] != null && item[tipo.key] > 0
  );

  if (horasConValor.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin horas registradas
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {horasConValor.map((tipo) => (
        <Chip
          key={tipo.key}
          label={`${tipo.label}: ${item[tipo.key]}h`}
          size="small"
          color={tipo.color}
          variant="outlined"
          sx={{
            fontSize: "0.65rem",
            height: 20,
            "& .MuiChip-label": { px: 1 },
            ...tipo.sx,
          }}
        />
      ))}
    </Box>
  );
};

const TrabajoItem = ({ trabajo }) => {
  const trabajador = trabajo?.trabajadorId;
  const nombreCompleto = trabajador
    ? `${trabajador.apellido || ""}, ${trabajador.nombre || ""}`.trim()
    : "Trabajador desconocido";

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        backgroundColor: "grey.50",
        border: "1px solid",
        borderColor: "grey.200",
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight={600}>
            {nombreCompleto}
          </Typography>
        </Box>

        <HorasChips item={trabajo} />
      </Stack>
    </Box>
  );
};

const TrabajosDetectadosList = ({ urlStorage }) => {
  const [trabajos, setTrabajos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrabajos = useCallback(async () => {
    if (!urlStorage) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await TrabajoRegistradoService.getByComprobante(urlStorage);
      const data = response?.data || [];
      setTrabajos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching trabajos:", err);
      setError("Error al cargar los trabajos detectados");
      setTrabajos([]);
    } finally {
      setIsLoading(false);
    }
  }, [urlStorage]);

  useEffect(() => {
    fetchTrabajos();
  }, [fetchTrabajos]);

  const fechaDetectada = useMemo(() => {
    if (!trabajos || trabajos.length === 0) return null;
    return formatFecha(trabajos[0]?.fecha);
  }, [trabajos]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
          gap: 1,
        }}
      >
        <CircularProgress size={24} />
        <Typography variant="caption" color="text.secondary">
          Cargando trabajos...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {fechaDetectada && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: 1.5,
            color: "text.secondary",
          }}
        >
          <CalendarTodayIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">{fechaDetectada}</Typography>
        </Box>
      )}

      {trabajos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No se encontraron trabajos asociados a esta imagen.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {trabajos.map((trabajo) => (
            <TrabajoItem key={trabajo._id} trabajo={trabajo} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default TrabajosDetectadosList;
