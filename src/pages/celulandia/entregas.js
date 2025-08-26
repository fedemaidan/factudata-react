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
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";

const EntregasCelulandiaPage = () => {
  const [entregas, setEntregas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({});
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalEntregas, setTotalEntregas] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fecha");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");

  // Configuración del historial para entregas
  const entregaHistorialConfig = {
    title: "Historial de la Entrega",
    entityName: "entrega",
    fieldNames: {
      descripcion: "Descripción",
      fechaCuenta: "Fecha de Cuenta",
      proveedorOCliente: "Cliente",
      descuentoAplicado: "Descuento Aplicado",
      subTotal: "Sub Total",
      montoTotal: "Monto Total",
      moneda: "Moneda",
      cc: "Cuenta Corriente",
      usuario: "Usuario",
    },
    formatters: {
      fechaCuenta: (valor) => new Date(valor).toLocaleDateString("es-AR"),
      descuentoAplicado: (valor) => `${Math.round(((valor ?? 1) - 1) * -100)}%`,
      subTotal: (valor) => {
        if (typeof valor === "object") {
          return `ARS: $${valor.ars || 0} | USD Of: $${valor.usdOficial || 0} | USD Blue: $${
            valor.usdBlue || 0
          }`;
        }
        return valor;
      },
      montoTotal: (valor) => {
        if (typeof valor === "object") {
          return `ARS: $${valor.ars || 0} | USD Of: $${valor.usdOficial || 0} | USD Blue: $${
            valor.usdBlue || 0
          }`;
        }
        return valor;
      },
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

      console.log(`Filtro aplicado en entregas: ${filtroFecha}`, { fechaInicio, fechaFin });

      const [cuentasResp, clientesResp, tcResp] = await Promise.all([
        cuentasPendientesService.getAll({
          limit: limitePorPagina,
          offset,
          sortField: sortField === "fecha" ? "fechaCuenta" : sortField,
          sortDirection,
          fechaInicio,
          fechaFin,
        }),
        clientesService.getAllClientes(),
        dolarService.getTipoDeCambio(),
      ]);

      const cuentas = cuentasResp?.data || [];
      setTotalEntregas(cuentasResp?.total || 0);
      setPaginaActual(pagina);

      setEntregas(
        cuentas.map((c) => {
          return {
            _id: c._id,
            proveedorOCliente: c.proveedorOCliente,
            descripcion: c.descripcion,
            fecha: c.fechaCuenta,
            horaCreacion: c.fechaCuenta?.split("T").slice(1, 2).join(":") || "-",
            moneda: c.moneda,
            CC: c.cc,
            descuentoAplicado: c.descuentoAplicado,
            montoEnviado: c.subTotal?.ars || 0,
            montoCC: c.montoTotal?.ars || 0,
          };
        })
      );
      const clientesArray = Array.isArray(clientesResp) ? clientesResp : clientesResp?.data || [];
      setClientes(clientesArray);
      setTipoDeCambio(tcResp);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "horaCreacion", label: "Hora", sortable: false },
    { key: "proveedorOCliente", label: "Cliente", sortable: true },
    { key: "descripcion", label: "Descripción", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: true },
    { key: "moneda", label: "Moneda", sortable: false },
    { key: "CC", label: "CC", sortable: false },
    { key: "descuentoAplicado", label: "Descuento", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: false },
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
    fecha: (value) => formatearCampo("fecha", value),
    horaCreacion: (value) => formatearCampo("hora", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    CC: (value) => formatearCampo("CC", value),
    montoCC: (value) => formatearCampo("montoCC", value),
    descuentoAplicado: (value) => `${Math.round(((value ?? 1) - 1) * -100)}%`,
  };

  const searchFields = [
    "numeroEntrega",
    "fecha",
    "hora",
    "cliente",
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
            setPaginaActual(1); // Resetear a la primera página
          }}
          onAdd={() => setAgregarModalOpen(true)}
        />
      </Container>

      <EditarEntregaModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSaved={handleSaved}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
      />
      <AgregarEntregaModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSaved={handleSaved}
        clientes={clientes}
        tipoDeCambio={tipoDeCambio}
      />
      <HistorialModal
        open={historialModalOpen}
        onClose={() => setHistorialModalOpen(false)}
        data={selectedData}
        loadHistorialFunction={cuentasPendientesService.getLogs}
        {...entregaHistorialConfig}
      />
    </>
  );
};

EntregasCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EntregasCelulandiaPage;
