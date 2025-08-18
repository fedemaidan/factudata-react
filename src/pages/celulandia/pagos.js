import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import movimientosService from "src/services/celulandia/movimientosService";

import cajasService from "src/services/celulandia/cajasService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import HistorialModal from "src/components/celulandia/HistorialModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import EditarPagoModal from "src/components/celulandia/EditarPagoModal";
import AgregarPagoModal from "src/components/celulandia/AgregarPagoModal";

const PagosCelulandiaPage = () => {
  const [pagos, setPagos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const [cajas, setCajas] = useState([]);

  const movimientoHistorialConfig = {
    title: "Historial del Pago",
    entityName: "pago",
    fieldNames: {
      tipoDeCambio: "Tipo de Cambio",
      estado: "Estado",
      caja: "Cuenta de Origen",
      cliente: "Cliente",
      cuentaCorriente: "Cuenta Corriente",
      moneda: "Moneda",
      numeroFactura: "Número de Factura",
      fechaFactura: "Fecha de Factura",
      nombreUsuario: "Usuario",
      concepto: "Concepto",
    },
    formatters: {
      tipoDeCambio: (valor) => `$${valor}`,
      fechaFactura: (valor) => new Date(valor).toLocaleDateString("es-AR"),
      fechaCreacion: (valor) => new Date(valor).toLocaleDateString("es-AR"),
      cliente: (valor) => (typeof valor === "object" ? valor?.nombre || "N/A" : valor),
      caja: (valor) => (typeof valor === "object" ? valor?.nombre || "N/A" : valor),
    },
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [movimientosResponse, cajasResponse] = await Promise.all([
        movimientosService.getAllMovimientos({ type: "EGRESO", populate: "caja" }),
        cajasService.getAllCajas(),
      ]);

      setPagos(movimientosResponse.data.map(parseMovimiento));
      setCajas(cajasResponse.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };
  console.log(pagos);

  const columns = [
    { key: "fechaCreacion", label: "Fecha", sortable: true },
    { key: "horaCreacion", label: "Hora", sortable: true },
    { key: "concepto", label: "Concepto", sortable: false },
    { key: "cuentaDestino", label: "Cuenta Origen", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: false },
    { key: "moneda", label: "Moneda", sortable: false },
    {
      key: "acciones",
      label: "Acciones",
      sortable: false,
      render: (item) => (
        <TableActions
          item={item}
          onEdit={(item) => {
            setSelectedData(item);
            setEditarModalOpen(true);
          }}
          onViewHistory={(item) => {
            setSelectedData(item);
            setHistorialModalOpen(true);
          }}
        />
      ),
    },
  ];

  const formatters = {
    fechaCreacion: (value) => formatearCampo("fecha", value),
    horaCreacion: (value) => formatearCampo("hora", value),
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
  };

  const searchFields = [
    "fechaCreacion",
    "horaCreacion",
    "concepto",
    "cuentaDestino",
    "moneda",
    "nombreUsuario",
  ];

  const refetchPagos = async () => {
    try {
      const { data } = await movimientosService.getAllMovimientos({
        type: "EGRESO",
        populate: "caja",
      });
      setPagos(data.map(parseMovimiento));
    } catch (error) {
      console.error("Error al recargar pagos:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Pagos</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Pagos"
          data={pagos}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          onAdd={() => setAgregarModalOpen(true)}
          dateField="fechaCreacion"
        />
      </Container>

      <EditarPagoModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSave={refetchPagos}
        cajas={cajas}
      />
      <HistorialModal
        open={historialModalOpen}
        onClose={() => setHistorialModalOpen(false)}
        data={selectedData}
        loadHistorialFunction={movimientosService.getMovimientoLogs}
        {...movimientoHistorialConfig}
      />
      <AgregarPagoModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSave={refetchPagos}
        cajas={cajas}
      />
    </>
  );
};

PagosCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PagosCelulandiaPage;
