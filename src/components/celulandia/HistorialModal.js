import React from "react";
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
} from "@mui/material";
import { formatCurrency } from "src/utils/formatters";

const HistorialModal = ({ open, onClose, data, historial = {} }) => {
  // Función para formatear el valor de un campo
  const formatearValor = (campo, valor) => {
    if (valor === null || valor === undefined || valor === "") {
      return "-";
    }

    // Usar las funciones de formateo existentes para campos específicos
    if (campo === "montoEnviado" || campo === "montoCC") {
      return formatCurrency(valor);
    }

    if (campo === "fecha") {
      return new Date(valor).toLocaleDateString("es-AR");
    }

    if (campo === "tipoDeCambio") {
      return valor.toLocaleString();
    }

    return valor.toString();
  };

  // Función para obtener el nombre legible del campo
  const obtenerNombreCampo = (campo) => {
    const nombres = {
      numeroComprobante: "Número de Comprobante",
      fecha: "Fecha",
      hora: "Hora",
      cliente: "Cliente",
      cuentaDestino: "Cuenta Destino",
      montoEnviado: "Monto Enviado",
      monedaDePago: "Moneda de Pago",
      CC: "Cuenta Corriente",
      montoCC: "Monto CC",
      tipoDeCambio: "Tipo de Cambio",
      estado: "Estado",
      usuario: "Usuario",
    };
    return nombres[campo] || campo;
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Historial del Comprobante
        </Typography>
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Comprobante: {data.numeroComprobante}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {historial && historial.length > 0 ? (
            <Stack spacing={2}>
              {historial.map((registro, index) => {
                const { fecha, hora } = formatearFechaHora(registro.fecha);
                return (
                  <Card key={registro.id} variant="outlined">
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

                        {/* Lista de cambios */}
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Campos modificados:
                          </Typography>
                          {registro.cambios.map((cambio, cambioIndex) => (
                            <Box key={cambioIndex} sx={{ pl: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {obtenerNombreCampo(cambio.campo)}:
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body2" color="error">
                                    <strong>Antes:</strong>{" "}
                                    {formatearValor(cambio.campo, cambio.valorAnterior)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={1}>
                                  <Typography variant="body2" color="text.secondary">
                                    →
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="body2" color="success.main">
                                    <strong>Después:</strong>{" "}
                                    {formatearValor(cambio.campo, cambio.valorNuevo)}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          ))}
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
                No hay historial de cambios para este comprobante.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Los cambios se registrarán automáticamente cuando se edite el comprobante.
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
