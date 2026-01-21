import React, { useMemo } from "react";
import dayjs from "dayjs";
import { Typography, Chip, TextField, MenuItem } from "@mui/material";
import TableComponent from "src/components/TableComponent";

const PedidoDetalleContenedoresTab = ({
  contenedores,
  estadosContenedores,
  onEstadoChange,
  contenedorEstados,
  contenedorEstadosLabels,
  normalizeEstado,
  getRowId,
}) => {
  const formatFecha = (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "—");

  const estadoLabels = useMemo(() => {
    if (contenedorEstadosLabels) return contenedorEstadosLabels;
    const defaults = {};
    (contenedorEstados || []).forEach((estado) => {
      defaults[estado] = estado;
    });
    return defaults;
  }, [contenedorEstados, contenedorEstadosLabels]);

  const EstadoChip = ({ estado }) => {
    const normalized = (estado || "").toUpperCase();
    const config = {
      PENDIENTE: { color: "warning", label: "Pendiente" },
      ENTREGADO: { color: "success", label: "Entregado" },
    }[normalized] || { color: "default", label: estado || "N/D" };
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  const { itemsConContenedor, unidadesSinContenedor } = useMemo(() => {
    const all = Array.isArray(contenedores) ? contenedores : [];
    const withCont = [];
    let sinContUnidades = 0;

    all.forEach((item) => {
      const tieneContenedor = !!item?.contenedor?._id;
      if (tieneContenedor) {
        withCont.push(item);
        return;
      }

      const unidades = (item?.productos || []).reduce((acc, p) => acc + (p?.cantidad || 0), 0);
      sinContUnidades += unidades;
    });

    return { itemsConContenedor: withCont, unidadesSinContenedor: sinContUnidades };
  }, [contenedores]);

  const contenedoresRows = useMemo(() => {
    return itemsConContenedor.map((contenedorItem, index) => {
      const unidades = (contenedorItem.productos || []).reduce(
        (acc, p) => acc + (p.cantidad || 0),
        0
      );
      const normalizedEstado = normalizeEstado(contenedorItem.estado);
      return {
        id: getRowId(contenedorItem, index),
        contenedorId: contenedorItem?.contenedor?._id,
        codigo: contenedorItem?.contenedor?.codigo || "Sin código",
        estado: normalizedEstado,
        eta: contenedorItem?.contenedor?.fechaEstimadaLlegada,
        unidades,
        productosResumen: (contenedorItem.productos || [])
          .map((p) => `${p.producto?.codigo || "-"} (${p.cantidad || 0})`)
          .join(", "),
      };
    });
  }, [getRowId, itemsConContenedor, normalizeEstado]);

  const contenedorColumns = useMemo(() => {
    const estadosDisponibles = contenedorEstados || [];
    const resolveEstadoValue = (row) => {
      const selectedOverride = estadosContenedores[row.id];
      if (selectedOverride) return selectedOverride;
      if (estadosDisponibles.includes(row.estado)) return row.estado;
      return estadosDisponibles[0] ?? row.estado ?? "PENDIENTE";
    };

    return [
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
            value={resolveEstadoValue(row)}
            onChange={(e) => onEstadoChange(row.id, e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {estadosDisponibles.map((estado) => (
              <MenuItem key={estado} value={estado}>
                {estadoLabels[estado] || estado}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
    ];
  }, [contenedorEstados, estadoLabels, estadosContenedores, onEstadoChange]);

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {contenedoresRows.length} contenedores
        {unidadesSinContenedor > 0 ? ` · ${unidadesSinContenedor} unidades sin contenedor` : ""}
      </Typography>
      <TableComponent data={contenedoresRows} columns={contenedorColumns} />
    </>
  );
};

export default PedidoDetalleContenedoresTab;
