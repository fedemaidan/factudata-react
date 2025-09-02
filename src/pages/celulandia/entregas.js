import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";

import EditarEntregaModal from "src/components/celulandia/EditarEntregaModal";
import AgregarEntregaModal from "src/components/celulandia/AgregarEntregaModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import {
  calcularFechasFiltro,
  getFechaArgentina,
  getHoraArgentina,
} from "src/utils/celulandia/fechas";
import { getCuentaPendienteHistorialConfig } from "src/utils/celulandia/historial";
import { parseCuentaPendiente } from "src/utils/celulandia/cuentasPendientes/parseCuentasPendientes";

const EntregasCelulandiaPage = () => {
  const [entregas, setEntregas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({});
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalEntregas, setTotalEntregas] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fecha");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");

  const [entregaHistorialConfig, setEntregaHistorialConfig] = useState(null);

  useEffect(() => {
    fetchData(paginaActual);
  }, [paginaActual, sortField, sortDirection, filtroFecha]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const { fechaInicio, fechaFin } = calcularFechasFiltro(filtroFecha);

      const [cuentasResp, clientesResp, tcResp] = await Promise.all([
        cuentasPendientesService.getAll({
          populate: "cliente",
          limit: limitePorPagina,
          offset,
          sortField: sortField === "fecha" ? "fechaCuenta" : sortField,
          sortDirection,
          fechaInicio,
          fechaFin,
          //includeInactive: true,
        }),
        clientesService.getAllClientes(),
        dolarService.getTipoDeCambio(),
      ]);

      const cuentas = cuentasResp?.data || [];
      setTotalEntregas(cuentasResp?.total || 0);
      setPaginaActual(pagina);

      setEntregas(cuentas.map(parseCuentaPendiente));
      const clientesArray = Array.isArray(clientesResp) ? clientesResp : clientesResp?.data || [];
      setClientes(clientesArray);
      setTipoDeCambio(tcResp);

      // Actualizar configuración del historial con la lista de clientes
      setEntregaHistorialConfig(getCuentaPendienteHistorialConfig(clientesArray));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "horaCreacion", label: "Hora", sortable: false },
    { key: "clienteNombre", label: "Cliente", sortable: false },
    { key: "descripcion", label: "Descripción", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: true },
    { key: "moneda", label: "Moneda", sortable: false },
    { key: "CC", label: "CC", sortable: true },
    { key: "descuentoAplicado", label: "Descuento", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: false },
    { key: "usuario", label: "Usuario", sortable: true },
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
          onDelete={handleDelete}
        />
      ),
    },
  ];

  const formatters = {
    fecha: (value, item) => getFechaArgentina(value),
    horaCreacion: (value, item) => value,
    descripcion: (value, item) => formatearCampo("default", value, item),
    montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
    moneda: (value, item) => formatearCampo("monedaDePago", value, item),
    CC: (value, item) => formatearCampo("CC", value, item),
    montoCC: (value, item) => formatearCampo("montoCC", value, item),
    usuario: (value, item) => formatearCampo("default", value, item),
    descuentoAplicado: (value, item) => {
      const formattedValue = `${Math.round(((value ?? 1) - 1) * -100)}%`;
      return formatearCampo("default", formattedValue, item);
    },
  };

  const searchFields = [
    "numeroEntrega",
    "fecha",
    "hora",
    "montoEnviado",
    "moneda",
    "CC",
    "montoCC",
    "tipoDeCambio",
    "estado",
    "usuario",
  ];

  const refetch = async () => {
    await fetchData(paginaActual);
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

  const handleSaved = async () => {
    await refetch();
  };

  const handleDelete = async (item) => {
    setSelectedData(item);
    setConfirmarEliminacionOpen(true);
  };

  const confirmarEliminacion = async () => {
    if (!selectedData) return;

    setIsDeleting(true);
    try {
      await cuentasPendientesService.deleteCuentaPendiente(selectedData._id, "Usuario Sistema");

      setEntregas((prevEntregas) =>
        prevEntregas.map((entrega) =>
          entrega._id === selectedData._id ? { ...entrega, active: false } : entrega
        )
      );

      setConfirmarEliminacionOpen(false);
      setSelectedData(null);
    } catch (error) {
      console.error("Error al eliminar entrega:", error);
      alert("Error al eliminar entrega");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Entregas</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Entregas"
          data={entregas}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          showSearch={false}
          dateField="fecha"
          total={totalEntregas}
          currentPage={paginaActual}
          onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
          rowsPerPage={limitePorPagina}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          serverSide={true}
          filtroFecha={filtroFecha}
          onFiltroFechaChange={(nuevoFiltro) => {
            setFiltroFecha(nuevoFiltro);
            setPaginaActual(1);
          }}
          onAdd={() => setAgregarModalOpen(true)}
          showRefreshButton={true}
          onRefresh={refetch}
        />
      </Container>

      {/* <EditarEntregaModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSaved={handleSaved}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
      /> */}
      <AgregarEntregaModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSaved={handleSaved}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
      />
      {entregaHistorialConfig && (
        <HistorialModal
          open={historialModalOpen}
          onClose={() => setHistorialModalOpen(false)}
          data={selectedData}
          loadHistorialFunction={cuentasPendientesService.getLogs}
          {...entregaHistorialConfig}
        />
      )}
      <ConfirmarEliminacionModal
        open={confirmarEliminacionOpen}
        onClose={() => {
          setConfirmarEliminacionOpen(false);
          setSelectedData(null);
        }}
        onConfirm={confirmarEliminacion}
        loading={isDeleting}
        title="Eliminar Entrega"
        message="¿Estás seguro que deseas eliminar esta entrega?"
        itemName={selectedData ? `Entrega ${selectedData.descripcion || selectedData._id}` : ""}
      />
    </>
  );
};

EntregasCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EntregasCelulandiaPage;
