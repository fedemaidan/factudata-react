import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  Grid,
  Stack,
  TextField,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import TableComponent from "src/components/TableComponent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";
import contenedorService from "src/services/celulandia/contenedorService";

const PEDIDO_ESTADOS = ["PENDIENTE", "ENTREGADO", "CANCELADO"];
const CONTENEDOR_ESTADOS = ["PENDIENTE", "ENTREGADO", "CANCELADO"];

const PEDIDO_ESTADOS_LABELS = {
  PENDIENTE: "Pendiente",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const CONTENEDOR_ESTADOS_LABELS = {
  PENDIENTE: "En tránsito",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const EstadoChip = ({ estado }) => {
  const normalized = (estado || "").toUpperCase();
  const config = {
    PENDIENTE: { color: "warning", label: "Pendiente" },
    ENTREGADO: { color: "success", label: "Entregado" },
    CANCELADO: { color: "error", label: "Cancelado" },
    RECIBIDO: { color: "success", label: "Recibido" },
    EN_TRANSITO: { color: "info", label: "En tránsito" },
  }[normalized] || { color: "default", label: estado || "N/D" };
  return <Chip size="small" color={config.color} label={config.label} />;
};

const formatFecha = (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "—");

const PedidoDetalleModal = ({ open, onClose, resumen }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { pedido, contenedores = [], productosTotales = [], unidadesTotales = 0 } = resumen || {};

  const [estadoPedido, setEstadoPedido] = useState(pedido?.estado || "PENDIENTE");
  const [estadosContenedores, setEstadosContenedores] = useState({});

  useEffect(() => {
    setEstadoPedido(pedido?.estado || "PENDIENTE");
    setEstadosContenedores({});
  }, [pedido?._id]);

  const normalizeContenedorEstado = useCallback((estado) => {
    const upper = (estado || "").toUpperCase();
    if (upper === "RECIBIDO") return "ENTREGADO";
    if (upper === "EN_TRANSITO") return "PENDIENTE";
    return upper || "PENDIENTE";
  }, []);

  const contenedoresRows = useMemo(
    () =>
      contenedores.map((c) => {
        const unidades = (c.productos || []).reduce((acc, p) => acc + (p.cantidad || 0), 0);
        const normalizedEstado = normalizeContenedorEstado(c.estado);
        return {
          id: c?.contenedor?._id || c?.contenedor?.codigo || Math.random(),
          contenedorId: c?.contenedor?._id,
          codigo: c?.contenedor?.codigo || "Sin código",
          estado: normalizedEstado,
          eta: c?.contenedor?.fechaEstimadaLlegada,
          unidades,
          productosResumen: (c.productos || [])
            .map((p) => `${p.producto?.codigo || "-"} (${p.cantidad || 0})`)
            .join(", "),
        };
      }),
    [contenedores, normalizeContenedorEstado]
  );

  const productosRows = useMemo(
    () =>
      productosTotales.map((p) => ({
        id: p.producto?._id || p.producto,
        codigo: p.producto?.codigo || "-",
        nombre: p.producto?.nombre || p.producto?.descripcion || "",
        cantidad: p.cantidad || 0,
      })),
    [productosTotales]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const tasks = [];

      const estadoPedidoActual = (pedido?.estado || "PENDIENTE").toUpperCase();
      const desiredPedido = (estadoPedido || "PENDIENTE").toUpperCase();
      if (pedido?._id && desiredPedido !== estadoPedidoActual) {
        tasks.push(pedidoService.updateEstado(pedido._id, desiredPedido));
      }

      const contenedoresCambios = contenedoresRows
        .filter((row) => row.contenedorId)
        .map((row) => {
          const actual = (row.estado || "PENDIENTE").toUpperCase();
          const desired = (estadosContenedores[row.id] || row.estado || "PENDIENTE").toUpperCase();
          return { id: row.contenedorId, actual, desired };
        })
        .filter((c) => c.desired !== c.actual);

      if (contenedoresCambios.length > 0) {
        tasks.push(
          Promise.all(
            contenedoresCambios.map((c) => contenedorService.updateEstado(c.id, c.desired))
          )
        );
      }

      await Promise.all(tasks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["contenedores"] });
      onClose?.();
    },
  });

  const handleConfirm = () => {
    if (!resumen) return;
    mutation.mutate();
  };

  if (!resumen) return null;

  const contenedorColumns = [
    { key: "codigo", label: "Contenedor", sortable: false },
    {
      key: "estado",
      label: "Estado",
      render: (row) => <EstadoChip estado={estadosContenedores[row.id] ?? row.estado} />,
    },
    {
      key: "eta",
      label: "ETA",
      render: (row) => formatFecha(row.eta),
    },
    { key: "unidades", label: "Unidades", sortable: false },
    { key: "productosResumen", label: "Productos", sortable: false, sx: { minWidth: 200 } },
    {
      key: "cambiarEstado",
      label: "Cambiar estado",
      sortable: false,
      render: (row) => (
        <TextField
          select
          size="small"
          label="Estado"
          value={estadosContenedores[row.id] ?? row.estado ?? CONTENEDOR_ESTADOS[0]}
          onChange={(e) =>
            setEstadosContenedores((prev) => ({
              ...prev,
              [row.id]: e.target.value,
            }))
          }
          sx={{ minWidth: 150 }}
        >
          {CONTENEDOR_ESTADOS.map((estado) => (
            <MenuItem key={estado} value={estado}>
              {CONTENEDOR_ESTADOS_LABELS[estado] || estado}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
  ];

  const productosColumns = [
    { key: "codigo", label: "Código", sortable: false },
    { key: "nombre", label: "Nombre", sortable: false, sx: { minWidth: 180 } },
    { key: "cantidad", label: "Cantidad", sortable: false },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalle del pedido {pedido?.numeroPedido}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Estado</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip size="small" label={estadoPedido || "No definido"} />
              <TextField
                select
                size="small"
                label="Cambiar estado"
                value={estadoPedido}
                onChange={(e) => setEstadoPedido(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                {PEDIDO_ESTADOS.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {estado}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Creado</Typography>
            <Typography variant="body2" color="text.secondary">
              {pedido?.createdAt ? dayjs(pedido.createdAt).format("DD/MM/YYYY HH:mm") : "-"}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2">Observaciones</Typography>
            <Typography variant="body2" color="text.secondary">
              {pedido?.observaciones || "Sin observaciones"}
            </Typography>
          </Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Productos" />
          <Tab label="Contenedores" />
        </Tabs>

        {tab === 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {productosRows.length} referencias, {unidadesTotales} unidades
            </Typography>
            <TableComponent data={productosRows} columns={productosColumns} />
          </>
        )}

        {tab === 1 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {contenedoresRows.length} contenedores
            </Typography>
            <TableComponent data={contenedoresRows} columns={contenedorColumns} />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-end" }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" color="primary" onClick={handleConfirm} disabled={mutation.isLoading}>
            {mutation.isLoading ? "Guardando..." : "Confirmar cambios"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default PedidoDetalleModal;
