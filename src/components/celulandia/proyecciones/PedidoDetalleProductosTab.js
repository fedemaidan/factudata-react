import React, { useMemo } from "react";
import { Typography } from "@mui/material";
import TableComponent from "src/components/TableComponent";

const PedidoDetalleProductosTab = ({ contenedores, productosTotales, unidadesTotales }) => {
  const productosRows = useMemo(() => {
    const distribucionPorProducto = new Map();
    (contenedores || []).forEach((contenedorItem) => {
      const productos = contenedorItem?.productos || [];
      productos.forEach((producto) => {
        const pid = producto.producto?._id || producto.producto;
        const label = contenedorItem?.contenedor?.codigo
          ? contenedorItem.contenedor.codigo
          : "Sin contenedor";
        const entry = distribucionPorProducto.get(pid) || [];
        entry.push({
          label,
          cantidad: producto.cantidad || 0,
        });
        distribucionPorProducto.set(pid, entry);
      });
    });

    return (productosTotales || []).map((p) => {
      const pid = p.producto?._id || p.producto;
      const destinos = distribucionPorProducto.get(pid) || [];
      const destinosLabel =
        destinos.length === 0
          ? "Sin contenedor"
          : destinos.map((dest) => `${dest.label} (${dest.cantidad || 0})`).join(", ");
      return {
        id: pid,
        codigo: p.producto?.codigo || "-",
        nombre: p.producto?.nombre || p.producto?.descripcion || "",
        cantidad: p.cantidad || 0,
        contenedores: destinosLabel,
      };
    });
  }, [contenedores, productosTotales]);

  const productosColumns = useMemo(
    () => [
      { key: "codigo", label: "Código", sortable: false },
      { key: "nombre", label: "Nombre", sortable: false, sx: { minWidth: 180 } },
      { key: "cantidad", label: "Cantidad", sortable: false },
      {
        key: "contenedores",
        label: "Contenedores",
        sortable: false,
        sx: { minWidth: 220 },
      },
    ],
    []
  );

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {productosRows.length} referencias, {unidadesTotales} unidades
      </Typography>
      <TableComponent data={productosRows} columns={productosColumns} />
    </>
  );
};

export default PedidoDetalleProductosTab;
