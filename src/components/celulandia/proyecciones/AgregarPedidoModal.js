import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  IconButton,
  Box,
  Grid,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import { Close as CloseIcon, Add as AddIcon, DeleteOutline as DeleteOutlineIcon } from "@mui/icons-material";
import Alerts from "src/components/alerts";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import axiosCelulandia from "src/services/axiosCelulandia";
import ProductosList from "./ProductosList";
import NuevoPedidoForm from "./NuevoPedidoForm";
import PedidoExistenteSelector from "./PedidoExistenteSelector";
import ContenedorSection from "./ContenedorSection";

const AgregarPedidoModal = ({
  open,
  onClose,
  onCreated,
  productosSeleccionados = [],
  pedidos = [],
  contenedores = [],
}) => {
  const { mutateAsync: crearPedido, isLoading } = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosCelulandia.post("/pedidos", payload);
      return data;
    },
  });

  const {
    data: pedidosData,
    isLoading: loadingPedidos,
    error: errorPedidos,
  } = useQuery({
    queryKey: ["pedidos-existentes"],
    queryFn: async () => {
      const { data } = await axiosCelulandia.get("/pedidos", {
        params: { limit: 200, offset: 0 },
      });
      return data?.data || [];
    },
  });

  const {
    data: contenedoresData,
    isLoading: loadingContenedores,
    error: errorContenedores,
  } = useQuery({
    queryKey: ["contenedores-existentes"],
    queryFn: async () => {
      const { data } = await axiosCelulandia.get("/contenedores", {
        params: { limit: 200, offset: 0 },
      });
      return data?.data || [];
    },
  });

  const [tipoAgregar, setTipoAgregar] = useState("existente");
  const [tipoContenedor, setTipoContenedor] = useState("existente");
  const [modoAsignacion, setModoAsignacion] = useState("simple");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState("");
  const [nuevoPedidoData, setNuevoPedidoData] = useState({
    numero: "",
    fechaEstimada: "",
    observaciones: "",
  });
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState("");
  const [nuevoContenedorData, setNuevoContenedorData] = useState({
    numero: "",
    fechaEstimada: "",
  });
  const [cantidadesProductos, setCantidadesProductos] = useState({});
  const [distribucionProductos, setDistribucionProductos] = useState({});
  const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });

  const sanitizeCantidadInput = (value) => {
    const stringValue = String(value ?? "");
    if (stringValue === "") return "";
    return stringValue.replace(/[^\d]/g, "");
  };

  const normalizeCantidadOnBlur = (value) => {
    const sanitized = sanitizeCantidadInput(value);
    const parsed = parseInt(sanitized, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return "1";
    return String(parsed);
  };

  const actualizarCantidadProducto = (productoId, cantidad) => {
    const cantidadString = String(cantidad ?? "");
    setCantidadesProductos((prev) => ({
      ...prev,
      [productoId]: cantidadString,
    }));
  };

  const normalizarCantidad = (cantidad) => {
    const parsed = parseInt(String(cantidad ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return parsed;
  };

  const resetForm = () => {
    setPedidoSeleccionado("");
    setContenedorSeleccionado("");
    setTipoContenedor("existente");
    setNuevoPedidoData({ numero: "", fechaEstimada: "", observaciones: "" });
    setNuevoContenedorData({ numero: "", fechaEstimada: "" });
    setCantidadesProductos({});
    setDistribucionProductos({});
    setModoAsignacion("simple");
    setTipoAgregar("existente");
    setAlert({ open: false, message: "", severity: "success" });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isFormValid = () => {
    if (productosSeleccionados.length === 0) return false;

    if (tipoAgregar === "existente") {
      return !!pedidoSeleccionado;
    } else {
      if (!nuevoPedidoData.numero || !nuevoPedidoData.fechaEstimada) return false;
      if (modoAsignacion === "simple") return true;

      const filas = Object.values(distribucionProductos).flat();
      if (filas.length === 0) return false;

      const validarFila = (fila) => {
        const cantidad = normalizarCantidad(fila.cantidad);
        if (!cantidad || cantidad < 1) return false;
        if (fila.tipoContenedor === "existente" && !fila.contenedorId) return false;
        if (fila.tipoContenedor === "nuevo") {
          return !!fila.contenedorCodigo && !!fila.contenedorFechaEstimada;
        }
        if (fila.tipoContenedor === "sin") {
          return fila.contenedorFechaEstimada || !!nuevoPedidoData.fechaEstimada;
        }
        return true;
      };

      return filas.every((fila) => validarFila(fila));
    }
  };

  const crearFilaDistribucion = (productoId, cantidadDefault) => ({
    id: `${productoId}-${Date.now()}-${Math.random()}`,
    cantidad: cantidadDefault || "1",
    tipoContenedor: "existente",
    contenedorId: "",
    contenedorCodigo: "",
    contenedorFechaEstimada: "",
  });

  useEffect(() => {
    if (modoAsignacion !== "distribucion") return;

    setDistribucionProductos((prev) => {
      const next = { ...prev };
      const idsActuales = new Set(productosSeleccionados.map((p) => p._id));

      Object.keys(next).forEach((key) => {
        if (!idsActuales.has(key)) {
          delete next[key];
        }
      });

      productosSeleccionados.forEach((producto) => {
        if (!next[producto._id] || next[producto._id].length === 0) {
          const defaultCantidad = cantidadesProductos[producto._id] || "1";
          next[producto._id] = [crearFilaDistribucion(producto._id, defaultCantidad)];
        }
      });

      return next;
    });
  }, [modoAsignacion, productosSeleccionados, cantidadesProductos]);

  const actualizarFilaDistribucion = (productoId, filaId, field, value) => {
    setDistribucionProductos((prev) => {
      const filas = prev[productoId] || [];
      return {
        ...prev,
        [productoId]: filas.map((fila) =>
          fila.id === filaId ? { ...fila, [field]: value } : fila
        ),
      };
    });
  };

  const agregarFilaDistribucion = (productoId) => {
    setDistribucionProductos((prev) => {
      const filas = prev[productoId] || [];
      return {
        ...prev,
        [productoId]: [...filas, crearFilaDistribucion(productoId, "")],
      };
    });
  };

  const eliminarFilaDistribucion = (productoId, filaId) => {
    setDistribucionProductos((prev) => {
      const filas = prev[productoId] || [];
      const nextFilas = filas.filter((fila) => fila.id !== filaId);
      return {
        ...prev,
        [productoId]: nextFilas.length > 0 ? nextFilas : [crearFilaDistribucion(productoId, "1")],
      };
    });
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      return;
    }

    // Por ahora solo soportamos crear nuevo pedido
    if (tipoAgregar === "existente") {
      setAlert({
        open: true,
        severity: "error",
        message: "Agregar a pedido existente aún no está disponible",
      });
      return;
    }

    const productosPayload = productosSeleccionados.map((p) => ({
      productoId: p._id,
      cantidad: normalizarCantidad(cantidadesProductos[p._id]),
    }));

    const contenedorPayload =
      tipoContenedor === "existente" && contenedorSeleccionado
        ? { tipo: "existente", id: contenedorSeleccionado }
        : tipoContenedor === "nuevo" && nuevoContenedorData.numero
        ? {
            tipo: "nuevo",
            codigo: nuevoContenedorData.numero,
            fechaEstimadaLlegada:
              nuevoContenedorData.fechaEstimada || nuevoPedidoData.fechaEstimada,
          }
        : null;

    const payload = {
      numeroPedido: nuevoPedidoData.numero,
      observaciones: nuevoPedidoData.observaciones,
      fechaEstimadaLlegada: nuevoPedidoData.fechaEstimada,
      productos: productosPayload,
      ...(contenedorPayload ? { contenedor: contenedorPayload } : {}),
    };

    if (modoAsignacion === "distribucion") {
      const distribucion = productosSeleccionados.flatMap((producto) => {
        const filas = distribucionProductos[producto._id] || [];
        return filas
          .map((fila) => {
            const cantidad = normalizarCantidad(fila.cantidad);
            if (!cantidad || cantidad < 1) return null;

            if (fila.tipoContenedor === "existente") {
              if (!fila.contenedorId) return null;
              return {
                productoId: producto._id,
                cantidad,
                contenedor: { tipo: "existente", id: fila.contenedorId },
              };
            }

            if (fila.tipoContenedor === "nuevo") {
              if (!fila.contenedorCodigo || !fila.contenedorFechaEstimada) return null;
              return {
                productoId: producto._id,
                cantidad,
                contenedor: {
                  tipo: "nuevo",
                  codigo: fila.contenedorCodigo,
                  fechaEstimadaLlegada: fila.contenedorFechaEstimada,
                },
              };
            }

            return {
              productoId: producto._id,
              cantidad,
              fechaEstimadaLlegada: fila.contenedorFechaEstimada || nuevoPedidoData.fechaEstimada || null,
            };
          })
          .filter(Boolean);
      });

      payload.distribucion = distribucion;
      delete payload.contenedor;
    }

    crearPedido(payload)
      .then(() => {
        const totalUnidades = productosSeleccionados.reduce(
          (total, producto) =>
            total + normalizarCantidad(cantidadesProductos[producto._id]),
          0
        );

        setAlert({
          open: true,
          severity: "success",
          message: `${productosSeleccionados.length} producto(s) (${totalUnidades} unidades) pedido creado exitosamente`,
        });

        if (onCreated) {
          onCreated();
        }

        handleClose();
      })
      .catch((error) => {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          "No se pudo crear el pedido";

        console.log("error", error);
        console.log("error.message", error.message);
        setAlert({
          open: true,
          severity: "error",
          message,
        });
      });
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      <Alerts alert={alert} onClose={handleCloseAlert} />
      
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Agregar Productos a Pedido</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

      <DialogContent>
        <Tabs
          value={modoAsignacion}
          onChange={(e, newValue) => setModoAsignacion(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Todo en un contenedor" value="simple" />
          <Tab label="Dividir por contenedor" value="distribucion" />
        </Tabs>

        {modoAsignacion === "simple" ? (
          <ProductosList
            productos={productosSeleccionados}
            cantidades={cantidadesProductos}
            onCantidadChange={actualizarCantidadProducto}
          />
        ) : (
          <Box sx={{ mb: 3 }}>
            {productosSeleccionados.map((producto) => {
              const filas = distribucionProductos[producto._id] || [];
              const total = filas.reduce(
                (acc, fila) => acc + normalizarCantidad(fila.cantidad),
                0
              );

              return (
                <Box
                  key={producto._id}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    bgcolor: "background.paper",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2">{producto.codigo}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {producto.nombre || producto.descripcion}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Total asignado: {total}
                    </Typography>
                  </Stack>

                  <Stack spacing={1.5}>
                    {filas.map((fila) => (
                      <Grid container spacing={2} alignItems="center" key={fila.id}>
                        <Grid item xs={12} md={3}>
                          <TextField
                            select
                            size="small"
                            label="Tipo"
                            value={fila.tipoContenedor}
                            onChange={(e) =>
                              actualizarFilaDistribucion(producto._id, fila.id, "tipoContenedor", e.target.value)
                            }
                            fullWidth
                          >
                            <MenuItem value="existente">Existente</MenuItem>
                            <MenuItem value="nuevo">Nuevo</MenuItem>
                            <MenuItem value="sin">Sin contenedor</MenuItem>
                          </TextField>
                        </Grid>

                        {fila.tipoContenedor === "existente" && (
                          <Grid item xs={12} md={4}>
                            <TextField
                              select
                              size="small"
                              label="Contenedor"
                              value={fila.contenedorId}
                              onChange={(e) =>
                                actualizarFilaDistribucion(producto._id, fila.id, "contenedorId", e.target.value)
                              }
                              fullWidth
                              disabled={loadingContenedores || !!errorContenedores}
                            >
                              {(contenedoresData || contenedores).map((cont) => (
                                <MenuItem key={cont._id} value={cont._id}>
                                  {cont.codigo}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                        )}

                        {fila.tipoContenedor === "nuevo" && (
                          <>
                            <Grid item xs={12} md={4}>
                              <TextField
                                size="small"
                                label="Código contenedor"
                                value={fila.contenedorCodigo}
                                onChange={(e) =>
                                  actualizarFilaDistribucion(
                                    producto._id,
                                    fila.id,
                                    "contenedorCodigo",
                                    e.target.value
                                  )
                                }
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                size="small"
                                label="Fecha estimada"
                                type="date"
                                value={fila.contenedorFechaEstimada}
                                onChange={(e) =>
                                  actualizarFilaDistribucion(
                                    producto._id,
                                    fila.id,
                                    "contenedorFechaEstimada",
                                    e.target.value
                                  )
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Grid>
                          </>
                        )}

                        {fila.tipoContenedor === "sin" && (
                          <Grid item xs={12} md={4}>
                            <TextField
                              size="small"
                              label="Fecha estimada"
                              type="date"
                              value={fila.contenedorFechaEstimada}
                              onChange={(e) =>
                                actualizarFilaDistribucion(
                                  producto._id,
                                  fila.id,
                                  "contenedorFechaEstimada",
                                  e.target.value
                                )
                              }
                              helperText="Si se deja vacío, se usa la fecha del pedido"
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                            />
                          </Grid>
                        )}

                        <Grid item xs={10} md={2}>
                          <TextField
                            size="small"
                            label="Cantidad"
                            type="text"
                            value={fila.cantidad}
                            onChange={(e) =>
                              actualizarFilaDistribucion(
                                producto._id,
                                fila.id,
                                "cantidad",
                                sanitizeCantidadInput(e.target.value)
                              )
                            }
                            onBlur={(e) =>
                              actualizarFilaDistribucion(
                                producto._id,
                                fila.id,
                                "cantidad",
                                normalizeCantidadOnBlur(e.target.value)
                              )
                            }
                            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={2} md={1}>
                          <IconButton
                            onClick={() => eliminarFilaDistribucion(producto._id, fila.id)}
                            size="small"
                            disabled={filas.length === 1}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                  </Stack>

                  <Box sx={{ mt: 1 }}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => agregarFilaDistribucion(producto._id)}>
                      Agregar contenedor
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        <Tabs
          value={tipoAgregar}
          onChange={(e, newValue) => setTipoAgregar(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Pedido Existente" value="existente" />
          <Tab label="Crear Nuevo Pedido" value="nuevo" />
        </Tabs>

        {/* Formulario según el tipo seleccionado */}
        {tipoAgregar === "existente" ? (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <PedidoExistenteSelector
                  pedidos={pedidosData || pedidos}
                  value={pedidoSeleccionado}
                  onChange={setPedidoSeleccionado}
                  disabled={loadingPedidos || !!errorPedidos}
                />
              </Grid>

              {modoAsignacion === "simple" && (
                <Grid item xs={12}>
                  <ContenedorSection
                    tipoContenedor={tipoContenedor}
                    onTipoChange={setTipoContenedor}
                    contenedorSeleccionado={contenedorSeleccionado}
                    onContenedorChange={setContenedorSeleccionado}
                    nuevoContenedorData={nuevoContenedorData}
                    onNuevoContenedorChange={setNuevoContenedorData}
                    contenedores={contenedoresData || contenedores}
                    disabled={loadingContenedores || !!errorContenedores}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        ) : (
          <Box>
            <NuevoPedidoForm formData={nuevoPedidoData} onChange={setNuevoPedidoData} />

            <Divider sx={{ my: 3 }} />

            {modoAsignacion === "simple" && (
              <ContenedorSection
                tipoContenedor={tipoContenedor}
                onTipoChange={setTipoContenedor}
                contenedorSeleccionado={contenedorSeleccionado}
                onContenedorChange={setContenedorSeleccionado}
                nuevoContenedorData={nuevoContenedorData}
                onNuevoContenedorChange={setNuevoContenedorData}
                contenedores={contenedores}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading}
          startIcon={<AddIcon />}
        >
          {isLoading
            ? "Creando..."
            : tipoAgregar === "existente"
            ? "Agregar a Pedido"
            : "Crear y Agregar"}
        </Button>
      </DialogActions>
      </Dialog>
    </>
  );
};

export default AgregarPedidoModal;
