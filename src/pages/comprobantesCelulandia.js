import { useState, useMemo, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Modal,
  IconButton,
} from "@mui/material";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import { Fade } from "@mui/material";

import celulandiaService from "src/services/celulandiaService";
import { formatCurrency } from "src/utils/formatters";

const ComprobantesCelulandiaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [ordenCampo, setOrdenCampo] = useState("fecha");
  const [ordenDireccion, setOrdenDireccion] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [imagenCargando, setImagenCargando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await celulandiaService.getAllMovimientos();
      console.log("Datos cargados:", data);
      setMovimientos(data);
    } catch (error) {
      console.error("Error al cargar movimientos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatearCampo = (campo, valor) => {
    if (valor === undefined || valor === null) return "-";

    switch (campo) {
      case "fecha":
        return new Date(valor).toLocaleDateString("es-AR");

      case "hora":
        if (valor && typeof valor === "string") {
          const horaParts = valor.split(":");
          if (horaParts.length >= 2) {
            return `${horaParts[0]}:${horaParts[1]}`;
          }
        }
        return valor;

      case "montoEnviado":
      case "montoCC":
        return formatCurrency(valor);

      case "tipoDeCambio":
        return valor === 1 ? "-" : valor.toLocaleString();

      case "cuentaDestino":
        const cuentaStyles = {
          "ENSHOP SRL": {
            backgroundColor: "#E8EAF6",
            color: "#3F51B5",
          },
        };
        const cuentaStyle = cuentaStyles[valor] || {
          backgroundColor: "#F3E5F5",
          color: "#7B1FA2",
        };
        return (
          <Chip
            label={valor}
            size="small"
            sx={{
              backgroundColor: cuentaStyle.backgroundColor,
              color: cuentaStyle.color,
              fontWeight: "bold",
              fontSize: "0.75rem",
              height: "24px",
              "& .MuiChip-label": {
                fontWeight: "bold",
              },
            }}
          />
        );

      case "monedaDePago":
        const monedaStyles = {
          ARS: {
            backgroundColor: "#E3F2FD",
            color: "#1565C0",
          },
          USD: {
            backgroundColor: "#C8E6C9",
            color: "#33691E",
          },
        };
        const monedaStyle = monedaStyles[valor] || {
          backgroundColor: "#F5F5F5",
          color: "#424242",
        };
        return (
          <Chip
            label={valor}
            size="small"
            sx={{
              backgroundColor: monedaStyle.backgroundColor,
              color: monedaStyle.color,
              fontWeight: "bold",
              fontSize: "0.75rem",
              height: "24px",
              "& .MuiChip-label": {
                fontWeight: "bold",
              },
            }}
          />
        );

      case "CC":
        const ccStyles = {
          ARS: {
            backgroundColor: "#E3F2FD",
            color: "#1565C0",
          },
          "USD BLUE": {
            backgroundColor: "#aadcac",
            color: "#1B5E20",
          },
          "USD OFICIAL": {
            backgroundColor: "#C8E6C9",
            color: "#33691E",
          },
        };
        const ccStyle = ccStyles[valor] || {
          backgroundColor: "#F5F5F5",
          color: "#424242",
        };
        return (
          <Chip
            label={valor}
            size="small"
            sx={{
              backgroundColor: ccStyle.backgroundColor,
              color: ccStyle.color,
              fontWeight: "bold",
              fontSize: "0.75rem",
              height: "24px",
              "& .MuiChip-label": {
                fontWeight: "bold",
              },
            }}
          />
        );

      case "estado":
        const estadoStyles = {
          CONFIRMADO: {
            backgroundColor: "#E8F5E8",
            color: "#2E7D32",
          },
        };
        const estadoStyle = estadoStyles[valor] || {
          backgroundColor: "#FFF3E0",
          color: "#E65100",
        };
        return (
          <Chip
            label={valor}
            size="small"
            sx={{
              backgroundColor: estadoStyle.backgroundColor,
              color: estadoStyle.color,
              fontWeight: "bold",
              fontSize: "0.75rem",
              height: "24px",
              "& .MuiChip-label": {
                fontWeight: "bold",
              },
            }}
          />
        );

      case "imagen":
        return valor ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setImagenModal(valor);
              setModalOpen(true);
              setImagenCargando(true);
            }}
          >
            Ver
          </Button>
        ) : (
          "-"
        );

      default:
        return valor;
    }
  };

  const movimientosFiltrados = useMemo(() => {
    console.log("Filtrando movimientos:", movimientos.length);
    if (!busqueda.trim()) {
      return movimientos;
    }

    const terminoBusqueda = busqueda.toLowerCase().trim();

    return movimientos.filter((mov) => {
      const campos = [
        mov.numeroComprobante,
        mov.fecha,
        mov.hora,
        mov.cliente,
        mov.cuentaDestino,
        mov.montoEnviado?.toString(),
        mov.monedaDePago,
        mov.CC,
        mov.montoCC?.toString(),
        mov.tipoDeCambio?.toString(),
        mov.estado,
        mov.usuario,
      ];

      return campos.some((campo) => campo && campo.toLowerCase().includes(terminoBusqueda));
    });
  }, [movimientos, busqueda]);

  const movimientosOrdenados = useMemo(() => {
    return [...movimientosFiltrados].sort((a, b) => {
      let aVal = a[ordenCampo];
      let bVal = b[ordenCampo];

      if (ordenCampo === "fecha") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (ordenDireccion === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [movimientosFiltrados, ordenCampo, ordenDireccion]);

  const movimientosAMostrar = movimientosOrdenados;

  const handleCloseModal = () => {
    setModalOpen(false);
    setImagenModal("");
    setImagenCargando(false);
  };

  return (
    <>
      <Head>
        <title>Movimientos Celulandia | FactuData</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 2,
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" spacing={4}>
              <Stack spacing={1}>
                <Typography variant="h4">Comprobantes Celulandia</Typography>
              </Stack>
            </Stack>
            <Divider />

            <TextField
              label="Buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ maxWidth: 400 }}
            />

            {isLoading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ minHeight: 200 }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Paper>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "numeroComprobante") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("numeroComprobante");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
                        >
                          Comprobante
                          {ordenCampo === "numeroComprobante"
                            ? ordenDireccion === "asc"
                              ? " ▲"
                              : " ▼"
                            : ""}
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "fecha") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("fecha");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
                        >
                          Fecha
                          {ordenCampo === "fecha" ? (ordenDireccion === "asc" ? " ▲" : " ▼") : ""}
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Hora</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Cliente</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Cuenta Destino</TableCell>
                        <TableCell
                          onClick={() => {
                            if (ordenCampo === "montoEnviado") {
                              setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
                            } else {
                              setOrdenCampo("montoEnviado");
                              setOrdenDireccion("asc");
                            }
                          }}
                          sx={{ cursor: "pointer", fontWeight: "bold" }}
                        >
                          Monto Enviado
                          {ordenCampo === "montoEnviado"
                            ? ordenDireccion === "asc"
                              ? " ▲"
                              : " ▼"
                            : ""}
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Moneda</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>CC</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Monto CC</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Tipo Cambio</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Estado</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Imagen</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Usuario</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientosAMostrar.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>{mov.numeroComprobante}</TableCell>
                          <TableCell>{formatearCampo("fecha", mov.fecha)}</TableCell>
                          <TableCell>{mov.hora}</TableCell>
                          <TableCell>{mov.cliente}</TableCell>
                          <TableCell>
                            {formatearCampo("cuentaDestino", mov.cuentaDestino)}
                          </TableCell>
                          <TableCell>{formatearCampo("montoEnviado", mov.montoEnviado)}</TableCell>
                          <TableCell>{formatearCampo("monedaDePago", mov.monedaDePago)}</TableCell>
                          <TableCell>{formatearCampo("CC", mov.CC)}</TableCell>
                          <TableCell>{formatearCampo("montoCC", mov.montoCC)}</TableCell>
                          <TableCell>{formatearCampo("tipoDeCambio", mov.tipoDeCambio)}</TableCell>
                          <TableCell>{formatearCampo("estado", mov.estado)}</TableCell>
                          <TableCell>{formatearCampo("imagen", mov.imagen)}</TableCell>
                          <TableCell>{mov.usuario}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Modal para mostrar imagen */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        keepMounted
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Fade in={modalOpen}>
          <Box
            sx={{
              position: "relative",
              minWidth: "300px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 24,
              overflow: "hidden",
            }}
          >
            <IconButton
              onClick={handleCloseModal}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                bgcolor: "rgba(0, 0, 0, 0.5)",
                color: "white",
                zIndex: 1,
                "&:hover": {
                  bgcolor: "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
            {imagenCargando && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "300px",
                  bgcolor: "grey.100",
                }}
              >
                <CircularProgress />
              </Box>
            )}
            <img
              src={imagenModal}
              alt="Comprobante"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "90vh",
                objectFit: "contain",
                display: imagenCargando ? "none" : "block",
              }}
              onError={(e) => {
                console.error("Error al cargar imagen:", imagenModal);
                setImagenCargando(false);
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
              onLoad={() => {
                console.log("Imagen cargada exitosamente:", imagenModal);
                setImagenCargando(false);
              }}
            />
            <Box
              sx={{
                display: "none",
                width: "100%",
                height: "300px",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.100",
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">Error al cargar la imagen</Typography>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

ComprobantesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ComprobantesCelulandiaPage;
