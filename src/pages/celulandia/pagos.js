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
  // Estados para paginación y ordenación del servidor
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPagos, setTotalPagos] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fechaFactura");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");

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

  // Función para calcular las fechas según el filtro seleccionado
  const calcularFechasFiltro = (filtro) => {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    switch (filtro) {
      case "hoy":
        return {
          fechaInicio: inicioHoy.toISOString().split("T")[0],
          fechaFin: inicioHoy.toISOString().split("T")[0],
        };
      case "estaSemana": {
        const inicioSemana = new Date(inicioHoy);
        inicioSemana.setDate(inicioHoy.getDate() - inicioHoy.getDay());
        return {
          fechaInicio: inicioSemana.toISOString().split("T")[0],
          fechaFin: inicioHoy.toISOString().split("T")[0],
        };
      }
      case "esteMes": {
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        return {
          fechaInicio: inicioMes.toISOString().split("T")[0],
          fechaFin: inicioHoy.toISOString().split("T")[0],
        };
      }
      case "esteAño": {
        const inicioAño = new Date(hoy.getFullYear(), 0, 1);
        return {
          fechaInicio: inicioAño.toISOString().split("T")[0],
          fechaFin: inicioHoy.toISOString().split("T")[0],
        };
      }
      default:
        return { fechaInicio: null, fechaFin: null };
    }
  };

  useEffect(() => {
    fetchData(paginaActual);
  }, [paginaActual, sortField, sortDirection, filtroFecha]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const { fechaInicio, fechaFin } = calcularFechasFiltro(filtroFecha);

      console.log(`Filtro aplicado en pagos: ${filtroFecha}`, { fechaInicio, fechaFin });

      const [movimientosResponse, cajasResponse] = await Promise.all([
        movimientosService.getAllMovimientos({
          type: "EGRESO",
          populate: "caja",
          limit: limitePorPagina,
          offset,
          sortField,
          sortDirection,
          fechaInicio,
          fechaFin,
        }),
        cajasService.getAllCajas(),
      ]);

      setPagos(movimientosResponse.data.map(parseMovimiento));
      setTotalPagos(movimientosResponse.total || 0);
      setPaginaActual(pagina);
      setCajas(cajasResponse.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };
  console.log(pagos);

  const columns = [
    { key: "fechaFactura", label: "Fecha", sortable: true },
    { key: "horaFactura", label: "Hora", sortable: true },
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
    fechaFactura: (value) => formatearCampo("fecha", value),
    horaFactura: (value) => formatearCampo("hora", value),
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
  };

  const searchFields = [
    "fechaFactura",
    "horaFactura",
    "concepto",
    "cuentaDestino",
    "moneda",
    "nombreUsuario",
  ];

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }

    setPaginaActual(1); // Reset a primera página al cambiar orden
  };

  const refetchPagos = async () => {
    try {
      // Usar fetchData para respetar filtros, paginación y ordenamiento actuales
      await fetchData(paginaActual);
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
          dateField="fechaFactura"
          total={totalPagos}
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
