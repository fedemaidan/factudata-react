import React, { useState } from "react";
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
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import { Close as CloseIcon, Add as AddIcon } from "@mui/icons-material";
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
  const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });

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
      return !!nuevoPedidoData.numero && !!nuevoPedidoData.fechaEstimada;
    }
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
        <ProductosList
          productos={productosSeleccionados}
          cantidades={cantidadesProductos}
          onCantidadChange={actualizarCantidadProducto}
        />

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
            </Grid>
          </Box>
        ) : (
          <Box>
            <NuevoPedidoForm formData={nuevoPedidoData} onChange={setNuevoPedidoData} />

            <Divider sx={{ my: 3 }} />

            <ContenedorSection
              tipoContenedor={tipoContenedor}
              onTipoChange={setTipoContenedor}
              contenedorSeleccionado={contenedorSeleccionado}
              onContenedorChange={setContenedorSeleccionado}
              nuevoContenedorData={nuevoContenedorData}
              onNuevoContenedorChange={setNuevoContenedorData}
              contenedores={contenedores}
            />
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
