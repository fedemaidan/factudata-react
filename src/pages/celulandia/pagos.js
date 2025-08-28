import React, { useState, useEffect, useMemo } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import movimientosService from "src/services/celulandia/movimientosService";

import cajasService from "src/services/celulandia/cajasService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { getFechaArgentina } from "src/utils/celulandia/fechas";
import HistorialModal from "src/components/celulandia/HistorialModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import EditarPagoModal from "src/components/celulandia/EditarPagoModal";
import AgregarPagoModal from "src/components/celulandia/AgregarPagoModal";
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";

const PagosCelulandiaPage = () => {
  const [pagos, setPagos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Estados para paginación y ordenación del servidor
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPagos, setTotalPagos] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fechaFactura");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");

  const [cajas, setCajas] = useState([]);

  const movimientoHistorialConfig = useMemo(
    () => ({
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
        fechaFactura: (valor) => getFechaArgentina(valor),
        fechaCreacion: (valor) => getFechaArgentina(valor),
        cliente: (valor) => {
          if (typeof valor === "object" && valor?.nombre) {
            return valor.nombre;
          }
          if (typeof valor === "string") {
            return valor;
          }
          return "N/A";
        },
        caja: (valor) => {
          if (typeof valor === "object" && valor?.nombre) {
            return valor.nombre;
          }
          if (typeof valor === "string" && cajas.length > 0) {
            const caja = cajas.find((c) => c._id === valor);
            return caja ? caja.nombre : `ID: ${valor}`;
          }
          return valor || "N/A";
        },
        total: (valor, item) => {
          if (typeof valor === "object" && valor.ars !== undefined) {
            if (item?.moneda === "USD") {
              const usdValue = valor.usdBlue || valor.usdOficial || 0;
              return `USD: $${Math.abs(usdValue).toFixed(2)}`;
            } else {
              return `ARS: $${Math.abs(valor.ars).toFixed(2)}`;
            }
          }
          return valor || "N/A";
        },
      },
    }),
    [cajas]
  );

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
          includeInactive: true, // Incluir registros inactivos para mostrarlos tachados
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
          onDelete={handleDelete}
        />
      ),
    },
  ];

  const formatters = {
    fechaFactura: (value, item) => getFechaArgentina(value),
    horaCreacion: (value, item) => formatearCampo("hora", value, item),
    cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
    moneda: (value, item) => formatearCampo("monedaDePago", value, item),
    montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
  };

  const searchFields = [
    "fechaFactura",
    "horaCreacion",
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
      setPagos((prevPagos) =>
        prevPagos.map((pago) => (pago._id === selectedData._id ? { ...pago, active: false } : pago))
      );

      setConfirmarEliminacionOpen(false);
      setSelectedData(null);
    } catch (error) {
      console.error("Error al eliminar pago:", error);
      alert("Error al eliminar pago");
    } finally {
      setIsDeleting(false);
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
          showRefreshButton={true}
          onRefresh={refetchPagos}
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
      <ConfirmarEliminacionModal
        open={confirmarEliminacionOpen}
        onClose={() => {
          setConfirmarEliminacionOpen(false);
          setSelectedData(null);
        }}
        onConfirm={confirmarEliminacion}
        loading={isDeleting}
        title="Eliminar Pago"
        message="¿Estás seguro que deseas eliminar este pago?"
        itemName={selectedData ? `Pago ${selectedData.concepto || selectedData._id}` : ""}
      />
    </>
  );
};

PagosCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PagosCelulandiaPage;
