import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import movimientosService from "src/services/celulandia/movimientosService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import EditarModal from "src/components/celulandia/EditarModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import AgregarModal from "src/components/celulandia/AgregarModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import cajasService from "src/services/celulandia/cajasService";

const ComprobantesCelulandiaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fechaFactura");
  const [sortDirection, setSortDirection] = useState("desc");

  // Nuevos estados para los datos compartidos
  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [cajas, setCajas] = useState([]);

  const movimientoHistorialConfig = {
    title: "Historial del Comprobante",
    entityName: "comprobante",
    fieldNames: {
      tipoDeCambio: "Tipo de Cambio",
      estado: "Estado",
      caja: "Cuenta de Destino",
      cliente: "Cliente",
      cuentaCorriente: "Cuenta Corriente",
      moneda: "Moneda",
      numeroFactura: "Número de Factura",
      fechaFactura: "Fecha de Factura",
      nombreUsuario: "Usuario",
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
    fetchData(paginaActual);
  }, [paginaActual, sortField, sortDirection]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const [movimientosResponse, clientesResponse, tipoDeCambioResponse, cajasResponse] =
        await Promise.all([
          movimientosService.getAllMovimientos({
            type: "INGRESO",
            populate: "caja",
            limit: limitePorPagina,
            offset,
            sortField,
            sortDirection,
          }),
          clientesService.getAllClientes(),
          dolarService.getTipoDeCambio(),
          cajasService.getAllCajas(),
        ]);

      setMovimientos(movimientosResponse.data.map(parseMovimiento));
      setTotalMovimientos(movimientosResponse.total || 0);
      setPaginaActual(pagina);

      const clientesArray = Array.isArray(clientesResponse)
        ? clientesResponse
        : clientesResponse?.data || [];
      setClientes(clientesArray);

      setTipoDeCambio({
        ...tipoDeCambioResponse,
        current: tipoDeCambioResponse?.current || 1,
      });

      setCajas(cajasResponse.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setImagenModal("");
  };

  const columns = [
    { key: "fechaFactura", label: "Fecha", sortable: true },
    { key: "horaFactura", label: "Hora", sortable: true },
    { key: "cliente", label: "Cliente", sortable: true },
    { key: "cuentaDestino", label: "Cuenta Destino", sortable: true },
    { key: "montoEnviado", label: "Monto Enviado", sortable: true },
    { key: "moneda", label: "Moneda", sortable: true },
    { key: "montoCC", label: "Monto CC", sortable: true },
    { key: "cuentaCorriente", label: "CC", sortable: true },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: true },
    { key: "estado", label: "Estado", sortable: true },
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
          onViewImage={(urlImagen) => {
            setImagenModal(urlImagen);
            setModalOpen(true);
          }}
        />
      ),
    },
  ];

  const formatters = {
    fechaFactura: (value) => formatearCampo("fecha", value),
    horaFactura: (value) => formatearCampo("hora", value),
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
    cuentaCorriente: (value) => formatearCampo("CC", value),
    montoCC: (value) => formatearCampo("montoCC", value),
    tipoDeCambio: (value) => formatearCampo("tipoDeCambio", value),
    estado: (value) => formatearCampo("estado", value),
    cliente: (value) => {
      if (value && typeof value === "object" && value.nombre) {
        return value.nombre;
      }
      return value || "-";
    },
  };

  const searchFields = [
    "numeroFactura",
    "fechaFactura",
    "horaFactura",
    "nombreCliente",
    "cuentaDestino",
    "moneda",
    "clienteId",
    "fechaCobro",
    "tipoFactura",
    "estado",
    "nombreUsuario",
  ];

  const handleSaveEdit = async () => {
    try {
      await refetchMovimientos();
    } catch (error) {
      console.error("Error al actualizar movimientos:", error);
      await refetchMovimientos();
    }
  };

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }

    setPaginaActual(1);
  };

  const refetchMovimientos = async () => {
    try {
      const { data } = await movimientosService.getAllMovimientos({
        type: "INGRESO",
        populate: "caja",
      });
      setMovimientos(data.map(parseMovimiento));
    } catch (error) {
      console.error("Error al recargar movimientos:", error);
    }
  };

  const handleSaveNew = (newData) => {
    setMovimientos((prevMovimientos) => [...prevMovimientos, parseMovimiento(newData)]);
  };

  return (
    <>
      <Head>
        <title>Movimientos</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Comprobantes"
          data={movimientos}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          onAdd={() => setAgregarModalOpen(true)}
          dateField="fechaFactura"
          total={totalMovimientos}
          currentPage={paginaActual}
          onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
          rowsPerPage={limitePorPagina}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          showSearch={false}
          serverSide={true}
        />
      </Container>

      <ComprobanteModal open={modalOpen} onClose={handleCloseModal} imagenUrl={imagenModal} />
      <EditarModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSave={handleSaveEdit}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
        cajas={cajas}
      />
      <HistorialModal
        open={historialModalOpen}
        onClose={() => setHistorialModalOpen(false)}
        data={selectedData}
        loadHistorialFunction={movimientosService.getMovimientoLogs}
        {...movimientoHistorialConfig}
      />
      <AgregarModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSave={handleSaveNew}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
        cajas={cajas}
      />
    </>
  );
};

ComprobantesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ComprobantesCelulandiaPage;
