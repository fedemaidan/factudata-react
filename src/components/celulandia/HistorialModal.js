import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Grid,
  CircularProgress,
} from "@mui/material";

const HistorialModal = ({
  open,
  onClose,
  data,
  title = "Historial",
  entityName = "entidad",
  loadHistorialFunction,
  formatters = {},
  fieldNames = {},
  renderSpecialField = null,
}) => {
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar historial cuando se abre el modal
  useEffect(() => {
    if (open && (data?._id || data?.id) && typeof loadHistorialFunction === "function") {
      loadHistorial();
    }
  }, [open, data, loadHistorialFunction]);
  const loadHistorial = async () => {
    const targetId = data?._id || data?.id;
    if (!targetId || typeof loadHistorialFunction !== "function") return;

    setIsLoading(true);
    try {
      const result = await loadHistorialFunction(targetId);
      if (result.success) {
        setHistorial(
          (result.data || []).filter((registro) => registro.campo !== "proveedorOCliente")
        );
      } else {
        console.error("Error al cargar historial:", result.error);
        setHistorial([]);
      }
    } catch (error) {
      console.error("Error al cargar historial:", error);
      setHistorial([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para formatear el valor de un campo
  const formatearValor = (campo, valor) => {
    if (valor === null || valor === undefined || valor === "") {
      return "-";
    }

    // Usar formateadores personalizados si existen
    if (formatters[campo]) {
      return formatters[campo](valor);
    }

    // Formateo por defecto
    if (campo === "fechaActualizacion" || campo === "fecha") {
      return new Date(valor).toLocaleDateString("es-AR");
    }

    if (Array.isArray(valor)) {
      return valor.join(", ");
    }

    return valor.toString();
  };

  // Función para obtener el nombre legible del campo
  const obtenerNombreCampo = (campo) => {
    return fieldNames[campo] || campo;
  };

  // Función para formatear fecha y hora
  const formatearFechaHora = (fechaISO) => {
    const fecha = new Date(fechaISO);
    return {
      fecha: fecha.toLocaleDateString("es-AR"),
      hora: fecha.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Función para renderizar campos especiales
  const renderFieldValue = (campo, valor) => {
    if (renderSpecialField && renderSpecialField[campo]) {
      return renderSpecialField[campo](valor);
    }

    return <Typography variant="body2">{formatearValor(campo, valor)}</Typography>;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {title}
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            {entityName}: {data.nombre || data.numeroComprobante || data._id || data.id}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historial && historial.length > 0 ? (
            <Stack spacing={2}>
              {historial.map((registro, index) => {
                const { fecha, hora } = formatearFechaHora(
                  registro.fechaActualizacion || registro.fecha
                );
                return (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        {/* Header del registro */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2" color="primary">
                              Modificación #{index + 1}
                            </Typography>
                            <Chip
                              label={registro.usuario}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </Stack>
                          <Stack alignItems="flex-end">
                            <Typography variant="caption" color="text.secondary">
                              {fecha}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {hora}
                            </Typography>
                          </Stack>
                        </Box>

                        <Divider />

                        {/* Detalle del cambio */}
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Campo modificado:
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={3}>
                                <Typography variant="body2" fontWeight="medium">
                                  {obtenerNombreCampo(registro.campo)}:
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="error">
                                  <strong>Antes:</strong>
                                </Typography>
                                {renderFieldValue(registro.campo, registro?.valorAnterior)}
                              </Grid>
                              <Grid item xs={12} sm={1}>
                                <Typography variant="body2" color="text.secondary">
                                  →
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="success.main">
                                  <strong>Después:</strong>
                                </Typography>
                                {renderFieldValue(registro.campo, registro.valorNuevo)}
                              </Grid>
                            </Grid>
                          </Box>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No hay historial de cambios para este {entityName}.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Los cambios se registrarán automáticamente cuando se edite el {entityName}.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HistorialModal;
