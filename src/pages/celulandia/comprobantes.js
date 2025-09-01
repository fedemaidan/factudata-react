import React, { useState, useEffect, useMemo } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import movimientosService from "src/services/celulandia/movimientosService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { getFechaArgentina, calcularFechasFiltro } from "src/utils/celulandia/fechas";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import EditarModal from "src/components/celulandia/EditarModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import AgregarModal from "src/components/celulandia/AgregarModal";
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import cajasService from "src/services/celulandia/cajasService";
import { getMovimientoHistorialConfig } from "src/utils/celulandia/historial";

const ComprobantesCelulandiaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fechaCreacion");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");

  // Nuevos estados para los datos compartidos
  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [cajas, setCajas] = useState([]);

  const movimientoHistorialConfig = useMemo(() => getMovimientoHistorialConfig(cajas), [cajas]);

  useEffect(() => {
    fetchData(paginaActual);
  }, [paginaActual, sortField, sortDirection, filtroFecha]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const { fechaInicio, fechaFin } = calcularFechasFiltro(filtroFecha);

      const [movimientosResponse, clientesResponse, tipoDeCambioResponse, cajasResponse] =
        await Promise.all([
          movimientosService.getAllMovimientos({
            type: "INGRESO",
            populate: "caja",
            limit: limitePorPagina,
            offset,
            sortField,
            sortDirection,
            fechaInicio,
            fechaFin,
            includeInactive: true,
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
    { key: "fechaCreacion", label: "Fecha Creación", sortable: true },
    { key: "horaCreacion", label: "Hora Creación", sortable: true },
    { key: "fechaFactura", label: "Fecha Factura", sortable: true },
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
          onDelete={handleDelete}
        />
      ),
    },
  ];

  const formatters = {
    fechaFactura: (value, item) => getFechaArgentina(value),
    fechaCreacion: (value, item) => getFechaArgentina(value),
    horaCreacion: (value, item) => formatearCampo("hora", value, item),
    cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
    moneda: (value, item) => formatearCampo("monedaDePago", value, item),
    montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
    cuentaCorriente: (value, item) => formatearCampo("CC", value, item),
    montoCC: (value, item) => formatearCampo("montoCC", value, item),
    tipoDeCambio: (value, item) => formatearCampo("tipoDeCambio", value, item),
    estado: (value, item) => formatearCampo("estado", value, item),
    cliente: (value, item) => {
      let clienteValue;
      if (value && typeof value === "object" && value.nombre) {
        clienteValue = value.nombre;
      } else {
        clienteValue = value || "-";
      }
      return formatearCampo("default", clienteValue, item);
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
      // Usar fetchData para respetar filtros, paginación y ordenamiento actuales
      await fetchData(paginaActual);
    } catch (error) {
      console.error("Error al recargar movimientos:", error);
    }
  };

  const handleSaveNew = async (newData) => {
    try {
      // Hacer refetch completo para mantener sincronización con paginación y filtros
      await fetchData(paginaActual);
    } catch (error) {
      console.error("Error al recargar datos después de agregar:", error);
      // Fallback: agregar localmente si el refetch falla
      setMovimientos((prevMovimientos) => [...prevMovimientos, parseMovimiento(newData)]);
    }
  };

  const handleDelete = async (item) => {
    setSelectedData(item);
    setConfirmarEliminacionOpen(true);
  };

  const confirmarEliminacion = async () => {
    if (!selectedData) return;

    setIsDeleting(true);
    try {
      await movimientosService.deleteMovimiento(selectedData._id, "Usuario Sistema");

      // Actualizar el estado local para mostrar el cambio visual inmediato
      setMovimientos((prevMovimientos) =>
        prevMovimientos.map((mov) =>
          mov._id === selectedData._id ? { ...mov, active: false } : mov
        )
      );

      setConfirmarEliminacionOpen(false);
      setSelectedData(null);
    } catch (error) {
      console.error("Error al eliminar comprobante:", error);
      alert("Error al eliminar comprobante");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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
          filtroFecha={filtroFecha}
          onFiltroFechaChange={(nuevoFiltro) => {
            setFiltroFecha(nuevoFiltro);
            setPaginaActual(1); // Resetear a la primera página
          }}
          showRefreshButton={true}
          onRefresh={refetchMovimientos}
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
      <ConfirmarEliminacionModal
        open={confirmarEliminacionOpen}
        onClose={() => {
          setConfirmarEliminacionOpen(false);
          setSelectedData(null);
        }}
        onConfirm={confirmarEliminacion}
        loading={isDeleting}
        title="Eliminar Comprobante"
        message="¿Estás seguro que deseas eliminar este comprobante?"
        itemName={
          selectedData ? `Comprobante ${selectedData.numeroFactura || selectedData._id}` : ""
        }
      />
    </>
  );
};

ComprobantesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ComprobantesCelulandiaPage;
