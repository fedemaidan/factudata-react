import React, { useMemo, useState } from "react";
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
  Tabs,
  Tab,
} from "@mui/material";
import TableComponent from "src/components/TableComponent";

const EstadoChip = ({ estado }) => {
  const normalized = (estado || "").toUpperCase();
  const config = {
    RECIBIDO: { color: "success", label: "Recibido" },
    EN_TRANSITO: { color: "info", label: "En tránsito" },
  }[normalized] || { color: "default", label: estado || "N/D" };
  return <Chip size="small" color={config.color} label={config.label} />;
};

const formatFecha = (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "—");

const PedidoDetalleModal = ({ open, onClose, resumen }) => {
  const [tab, setTab] = useState(0);

  const { pedido, contenedores = [], productosTotales = [], unidadesTotales = 0 } = resumen || {};

  const contenedoresRows = useMemo(
    () =>
      contenedores.map((c) => {
        const unidades = (c.productos || []).reduce((acc, p) => acc + (p.cantidad || 0), 0);
        return {
          id: c?.contenedor?._id || c?.contenedor?.codigo || Math.random(),
          codigo: c?.contenedor?.codigo || "Sin código",
          estado: c.estado,
          eta: c?.contenedor?.fechaEstimadaLlegada,
          unidades,
          productosResumen: (c.productos || [])
            .map((p) => `${p.producto?.codigo || "-"} (${p.cantidad || 0})`)
            .join(", "),
        };
      }),
    [contenedores]
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

  if (!resumen) return null;

  const contenedorColumns = [
    { key: "codigo", label: "Contenedor", sortable: false },
    {
      key: "estado",
      label: "Estado",
      render: (row) => <EstadoChip estado={row.estado} />,
    },
    {
      key: "eta",
      label: "ETA",
      render: (row) => formatFecha(row.eta),
    },
    { key: "unidades", label: "Unidades", sortable: false },
    { key: "productosResumen", label: "Productos", sortable: false, sx: { minWidth: 200 } },
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
            <Chip size="small" label={pedido?.estado || "No definido"} />
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
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PedidoDetalleModal;
