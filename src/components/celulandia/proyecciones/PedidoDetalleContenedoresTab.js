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

  const contenedoresRows = useMemo(
    () =>
      (contenedores || []).map((contenedorItem, index) => {
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
      }),
    [contenedores, getRowId, normalizeEstado]
  );

  const contenedorColumns = useMemo(
    () => [
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
            value={estadosContenedores[row.id] ?? row.estado ?? contenedorEstados[0]}
            onChange={(e) => onEstadoChange(row.id, e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {contenedorEstados.map((estado) => (
              <MenuItem key={estado} value={estado}>
                {contenedorEstadosLabels[estado] || estado}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
    ],
    [contenedorEstados, contenedorEstadosLabels, estadosContenedores, onEstadoChange]
  );

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {contenedoresRows.length} contenedores
      </Typography>
      <TableComponent data={contenedoresRows} columns={contenedorColumns} />
    </>
  );
};

export default PedidoDetalleContenedoresTab;
