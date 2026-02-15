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
import { LoadingButton } from "@mui/lab";
import PedidoDetalleProductosTab from "src/components/celulandia/proyecciones/PedidoDetalleProductosTab";
import PedidoDetalleContenedoresTab from "src/components/celulandia/proyecciones/PedidoDetalleContenedoresTab";
import PedidoDetalleEditarTab from "src/components/celulandia/proyecciones/PedidoDetalleEditarTab";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import pedidoService from "src/services/celulandia/pedidoService";
import contenedorService from "src/services/celulandia/contenedorService";
import { useContenedores } from "src/hooks/celulandia/useContenedores";
import { useProductos } from "src/hooks/celulandia/useProductos";

const PEDIDO_ESTADOS = ["PENDIENTE", "ENTREGADO"];
const CONTENEDOR_ESTADOS = ["PENDIENTE", "ENTREGADO"];

const PedidoDetalleModal = ({ open, onClose, resumen }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { pedido, contenedores = [], productosTotales = [], unidadesTotales = 0 } = resumen || {};

  const [estadoPedido, setEstadoPedido] = useState(pedido?.estado || "PENDIENTE");
  const [estadosContenedores, setEstadosContenedores] = useState({});
  const [asignacionesEdicion, setAsignacionesEdicion] = useState([]);
  const [asignacionesOriginales, setAsignacionesOriginales] = useState([]);
  const [asignacionesNuevas, setAsignacionesNuevas] = useState([]);
  const [asignacionesEliminadas, setAsignacionesEliminadas] = useState([]);

  const { data: contenedoresData } = useContenedores();
  const contenedoresDisponibles = contenedoresData?.data ?? [];

  const { data: productosResponse, isLoading: loadingProductos } = useProductos({
    page: 0,
    pageSize: 200,
    sortField: "codigo",
    sortDirection: "asc",
  });
  const productosDisponibles = productosResponse?.data ?? [];

  useEffect(() => {
    setEstadoPedido(pedido?.estado || "PENDIENTE");
    setEstadosContenedores({});
    setAsignacionesEliminadas([]);
    setAsignacionesNuevas([]);

    const nuevosLotes = [];
    contenedores.forEach((contenedorItem) => {
      const contenedor = contenedorItem?.contenedor || null;
      const productos = contenedorItem?.productos || [];
      productos.forEach((productoItem) => {
        if (!productoItem?.loteId) return;
        nuevosLotes.push({
          asignacionId: productoItem.loteId,
          productoId: productoItem.producto?._id || productoItem.producto,
          productoCodigo: productoItem.producto?.codigo || "-",
          productoNombre: productoItem.producto?.nombre || productoItem.producto?.descripcion || "",
          cantidad: String(productoItem.cantidad || 0),
          tipoContenedor: contenedor ? "existente" : "sin",
          contenedorId: contenedor?._id || "",
          contenedorCodigo: contenedor?.codigo || "",
          contenedorFechaEstimada:
            contenedor?.fechaEstimadaLlegada
              ? dayjs(contenedor.fechaEstimadaLlegada).format("YYYY-MM-DD")
              : productoItem?.fechaEstimadaDeLlegada
              ? dayjs(productoItem.fechaEstimadaDeLlegada).format("YYYY-MM-DD")
              : "",
        });
      });
    });

    setAsignacionesEdicion(nuevosLotes);
    setAsignacionesOriginales(nuevosLotes);
  }, [pedido?._id]);

  const normalizeContenedorEstado = useCallback((estado) => {
    const upper = (estado || "").toUpperCase();
    return upper || "PENDIENTE";
  }, []);

  const getContenedorRowId = useCallback((contenedorItem, index) => {
    return (
      contenedorItem?.contenedor?._id ||
      contenedorItem?.contenedor?.codigo ||
      `tmp-${index}`
    );
  }, []);

  const cambiosContenedores = useMemo(() => {
    return contenedores
      .map((contenedorItem, index) => {
        const contenedorId = contenedorItem?.contenedor?._id;
        if (!contenedorId) return null;
        const rowId = getContenedorRowId(contenedorItem, index);
        const actual = normalizeContenedorEstado(contenedorItem?.estado || "PENDIENTE");
        const desired = (estadosContenedores[rowId] || actual || "PENDIENTE").toUpperCase();
        return { id: contenedorId, actual: actual.toUpperCase(), desired };
      })
      .filter(Boolean)
      .filter((c) => c.desired !== c.actual);
  }, [contenedores, estadosContenedores, getContenedorRowId, normalizeContenedorEstado]);

  const asignacionesOriginalesMap = useMemo(() => {
    return new Map(
      (asignacionesOriginales || []).map((asignacion) => [
        asignacion.asignacionId,
        asignacion,
      ])
    );
  }, [asignacionesOriginales]);

  const asignacionesActualizadas = useMemo(() => {
    return (asignacionesEdicion || [])
      .map((asignacion) => {
        const original = asignacionesOriginalesMap.get(asignacion.asignacionId);
        if (!original) return null;

        const cantidad = parseInt(String(asignacion.cantidad || ""), 10) || 0;
        const cantidadOriginal = parseInt(String(original.cantidad || ""), 10) || 0;
        const cambioCantidad = cantidad !== cantidadOriginal;

        const cambioTipo = asignacion.tipoContenedor !== original.tipoContenedor;
        const cambioContenedorId = asignacion.contenedorId !== original.contenedorId;
        const cambioFecha =
          asignacion.contenedorFechaEstimada !== original.contenedorFechaEstimada;

        if (!cambioCantidad && !cambioTipo && !cambioContenedorId && !cambioFecha) return null;

        const payload = { loteId: asignacion.asignacionId, cantidad };

        if (
          asignacion.tipoContenedor === "existente" &&
          (cambioTipo || cambioContenedorId)
        ) {
          payload.contenedor = { tipo: "existente", id: asignacion.contenedorId };
        }

        if (asignacion.tipoContenedor === "nuevo") {
          payload.contenedor = {
            tipo: "nuevo",
            codigo: asignacion.contenedorCodigo,
            fechaEstimadaLlegada: asignacion.contenedorFechaEstimada,
          };
        }

        if (asignacion.tipoContenedor === "sin" && (cambioTipo || cambioFecha)) {
          payload.contenedor = { tipo: "sin" };
          payload.fechaEstimadaLlegada = asignacion.contenedorFechaEstimada || null;
        }

        return payload;
      })
      .filter(Boolean);
  }, [asignacionesEdicion, asignacionesOriginalesMap]);

  const asignacionesCrear = useMemo(() => {
    return (asignacionesNuevas || [])
      .map((asignacion) => {
        if (!asignacion.productoId) return null;
        const cantidad = parseInt(String(asignacion.cantidad || ""), 10) || 0;
        if (cantidad < 1) return null;

        if (asignacion.tipoContenedor === "existente" && !asignacion.contenedorId) return null;
        if (
          asignacion.tipoContenedor === "nuevo" &&
          (!asignacion.contenedorCodigo || !asignacion.contenedorFechaEstimada)
        ) {
          return null;
        }
        if (asignacion.tipoContenedor === "sin" && !asignacion.contenedorFechaEstimada) return null;

        if (asignacion.tipoContenedor === "existente") {
          return {
            productoId: asignacion.productoId,
            cantidad,
            contenedor: { tipo: "existente", id: asignacion.contenedorId },
          };
        }
        if (asignacion.tipoContenedor === "nuevo") {
          return {
            productoId: asignacion.productoId,
            cantidad,
            contenedor: {
              tipo: "nuevo",
              codigo: asignacion.contenedorCodigo,
              fechaEstimadaLlegada: asignacion.contenedorFechaEstimada,
            },
          };
        }
        return {
          productoId: asignacion.productoId,
          cantidad,
          fechaEstimadaLlegada: asignacion.contenedorFechaEstimada,
        };
      })
      .filter(Boolean);
  }, [asignacionesNuevas]);

  const asignacionesEliminar = useMemo(
    () => (asignacionesEliminadas || []).filter(Boolean),
    [asignacionesEliminadas]
  );

  const cambiosEstadoPedido = useMemo(() => {
    const estadoPedidoActual = (pedido?.estado || "PENDIENTE").toUpperCase();
    const desiredPedido = (estadoPedido || "PENDIENTE").toUpperCase();
    return estadoPedidoActual !== desiredPedido;
  }, [pedido?.estado, estadoPedido]);

  const hasChanges = useMemo(() => {
    if (cambiosEstadoPedido) return true;
    if (cambiosContenedores.length > 0) return true;
    if (asignacionesActualizadas.length > 0) return true;
    if (asignacionesCrear.length > 0) return true;
    if (asignacionesEliminar.length > 0) return true;
    return false;
  }, [
    cambiosEstadoPedido,
    cambiosContenedores,
    asignacionesActualizadas,
    asignacionesCrear,
    asignacionesEliminar,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        pedidoId: pedido?._id,
        create: asignacionesCrear,
        update: asignacionesActualizadas,
        remove: asignacionesEliminar,
      };
      const tasks = [];

      if (pedido?._id && cambiosEstadoPedido) {
        tasks.push(pedidoService.updateEstado(pedido._id, estadoPedido));
      }

      if (cambiosContenedores.length > 0) {
        tasks.push(
          Promise.all(
            cambiosContenedores.map((c) => contenedorService.updateEstado(c.id, c.desired))
          )
        );
      }

      if (
        pedido?._id &&
        (asignacionesCrear.length > 0 ||
          asignacionesActualizadas.length > 0 ||
          asignacionesEliminar.length > 0)
      ) {
        tasks.push(
          pedidoService.updateLotes(pedido._id, {
            create: asignacionesCrear,
            update: asignacionesActualizadas,
            remove: asignacionesEliminar,
          })
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

  const handleEstadoContenedorChange = (rowId, value) => {
    setEstadosContenedores((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  };

  const asignacionesPorProducto = useMemo(() => {
    const map = new Map();
    asignacionesEdicion.forEach((asignacion) => {
      const key = asignacion.productoId || asignacion.asignacionId;
      const existing = map.get(key) || {
        productoId: asignacion.productoId,
        productoCodigo: asignacion.productoCodigo,
        productoNombre: asignacion.productoNombre,
        asignaciones: [],
      };
      existing.asignaciones.push(asignacion);
      map.set(key, existing);
    });
    return Array.from(map.values());
  }, [asignacionesEdicion]);

  const hasInvalidEdicion = useMemo(() => {
    const invalidCantidad = (value) => {
      const parsed = parseInt(String(value || ""), 10);
      return !Number.isFinite(parsed) || parsed < 1;
    };

    const invalidTipo = (asignacion) => {
      if (asignacion.tipoContenedor === "existente") return !asignacion.contenedorId;
      if (asignacion.tipoContenedor === "nuevo") {
        return !asignacion.contenedorCodigo || !asignacion.contenedorFechaEstimada;
      }
      if (asignacion.tipoContenedor === "sin") return !asignacion.contenedorFechaEstimada;
      return true;
    };

    const invalidEdit = (asignacionesEdicion || []).some(
      (asignacion) => invalidCantidad(asignacion.cantidad) || invalidTipo(asignacion)
    );
    if (invalidEdit) return true;

    const invalidCreate = (asignacionesNuevas || []).some((asignacion) => {
      if (!asignacion.productoId) return true;
      return invalidCantidad(asignacion.cantidad) || invalidTipo(asignacion);
    });
    return invalidCreate;
  }, [asignacionesEdicion, asignacionesNuevas]);

  if (!resumen) return null;


  const handleEditarAsignacion = (asignacionId, field, value) => {
    setAsignacionesEdicion((prev) =>
      prev.map((asignacion) =>
        asignacion.asignacionId === asignacionId ? { ...asignacion, [field]: value } : asignacion
      )
    );
  };

  const handleEliminarAsignacion = (asignacionId) => {
    setAsignacionesEdicion((prev) =>
      prev.filter((asignacion) => asignacion.asignacionId !== asignacionId)
    );
    setAsignacionesEliminadas((prev) => [...prev, asignacionId]);
  };

  const agregarAsignacionNueva = () => {
    setAsignacionesNuevas((prev) => [
      ...prev,
      {
        id: `nuevo-${Date.now()}-${Math.random()}`,
        productoId: "",
        productoCodigo: "",
        productoNombre: "",
        cantidad: "1",
        tipoContenedor: "existente",
        contenedorId: "",
        contenedorCodigo: "",
        contenedorFechaEstimada: "",
      },
    ]);
  };

  const handleEditarAsignacionNueva = (id, field, value) => {
    setAsignacionesNuevas((prev) =>
      prev.map((asignacion) => (asignacion.id === id ? { ...asignacion, [field]: value } : asignacion))
    );
  };

  const handleEliminarAsignacionNueva = (id) => {
    setAsignacionesNuevas((prev) => prev.filter((asignacion) => asignacion.id !== id));
  };

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
          <Tab label="Editar" />
        </Tabs>

        {tab === 0 && (
          <PedidoDetalleProductosTab
            contenedores={contenedores}
            productosTotales={productosTotales}
            unidadesTotales={unidadesTotales}
          />
        )}

        {tab === 1 && (
          <PedidoDetalleContenedoresTab
            contenedores={contenedores}
            estadosContenedores={estadosContenedores}
            onEstadoChange={handleEstadoContenedorChange}
            contenedorEstados={CONTENEDOR_ESTADOS}
            normalizeEstado={normalizeContenedorEstado}
            getRowId={getContenedorRowId}
          />
        )}

        {tab === 2 && (
          <PedidoDetalleEditarTab
            asignacionesEdicion={asignacionesEdicion}
            asignacionesPorProducto={asignacionesPorProducto}
            asignacionesNuevas={asignacionesNuevas}
            contenedoresDisponibles={contenedoresDisponibles}
            productosDisponibles={productosDisponibles}
            loadingProductos={loadingProductos}
            onAgregarAsignacion={agregarAsignacionNueva}
            onEditarAsignacion={handleEditarAsignacion}
            onEliminarAsignacion={handleEliminarAsignacion}
            onEditarAsignacionNueva={handleEditarAsignacionNueva}
            onEliminarAsignacionNueva={handleEliminarAsignacionNueva}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-end" }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cerrar</Button>
          <LoadingButton
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            loading={mutation.isPending}
            disabled={mutation.isPending || hasInvalidEdicion || !hasChanges}
          >
            {mutation.isPending ? "Guardando..." : "Confirmar cambios"}
          </LoadingButton>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default PedidoDetalleModal;
