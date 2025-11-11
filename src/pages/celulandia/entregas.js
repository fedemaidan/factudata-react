import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import RowActions from "src/components/celulandia/RowActions";
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
import { EditarEntregaModalV2 } from "src/components/celulandia/EditarEntregaModalV2";
import useDebouncedValue from "src/hooks/useDebouncedValue";

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
  const [limitePorPagina] = useState(75);

  const [sortField, setSortField] = useState("fechaEntrega");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);

  // NUEVOS: filtros server-side
  const [filtroMoneda, setFiltroMoneda] = useState("");
  const [filtroCC, setFiltroCC] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroNombreCliente, setFiltroNombreCliente] = useState("");
  const [usuariosOptions, setUsuariosOptions] = useState([{ value: "", label: "(todos)" }]);

  const [entregaHistorialConfig, setEntregaHistorialConfig] = useState(null);

  useEffect(() => {
    fetchData(paginaActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paginaActual,
    sortField,
    sortDirection,
    filtroFecha,
    filtroMoneda,
    filtroCC,
    filtroUsuario,
    filtroNombreCliente,
    debouncedBusqueda,
  ]);

  // Al cambiar el término de búsqueda, resetear a página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [debouncedBusqueda]);

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
          // Mapeo de campos de orden: UI -> backend
          sortField:
            sortField === "fechaEntrega"
              ? "fechaCuenta"
              : sortField === "fechaHoraCreacion"
              ? "fechaCreacion"
              : sortField,
          sortDirection,
          fechaInicio,
          fechaFin,
          cliente: filtroNombreCliente,
          ...(filtroMoneda ? { moneda: filtroMoneda } : {}),
          ...(filtroCC ? { cc: filtroCC } : {}),
          ...(filtroUsuario ? { usuario: filtroUsuario } : {}),
          ...(filtroNombreCliente ? { nombreCliente: filtroNombreCliente } : {}),
          text: debouncedBusqueda || undefined,
        }),
        clientesService.getAllClientes(),
        dolarService.getTipoDeCambio(),
      ]);

      const cuentas = cuentasResp?.data || [];
      setTotalEntregas(cuentasResp?.total || 0);
      setPaginaActual(pagina);

      setEntregas(cuentas.map(parseCuentaPendiente));

      const uniqueUsers = Array.from(
        new Set([
          "ezequielszejman@gmail.com",
          "matias_kat14@hotmail.com",
          "lidnicolas@gmail.com",
          "ventas@celulandiaweb.com.ar",
          "info@celulandiaweb.com.ar",
          "Sistema",
        ])
      ).sort();
      setUsuariosOptions([
        { value: "", label: "(todos)" },
        ...uniqueUsers.map((u) => ({ value: u, label: u })),
      ]);

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
    {
      key: "fechaHoraCreacion",
      label: "Fecha y Hora Creación",
      sortable: true,
      render: (item) => (
        <div>
          <div>{getFechaArgentina(item.fechaCreacion)}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {item.horaCreacion}
          </div>
        </div>
      ),
    },
    { key: "fechaEntrega", label: "Fecha Entrega", sortable: true },
    { key: "clienteNombre", label: "Cliente", sortable: false },
    { key: "descripcion", label: "Descripción", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: true },
    { key: "monedaDePago", label: "Moneda", sortable: false },
    { key: "CC", label: "CC", sortable: true },
    { key: "descuentoAplicado", label: "Descuento", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: true },
    { key: "usuario", label: "Usuario", sortable: true },
    {
      key: "acciones",
      label: "",
      sortable: false,
      render: (item) => (
        <RowActions
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
          showImage={false}
        />
      ),
    },
  ];

  const formatters = {
    fecha: (value, item) => getFechaArgentina(value),
    fechaEntrega: (value, item) => getFechaArgentina(value),
    horaCreacion: (value, item) => value,
    descripcion: (value, item) => formatearCampo("default", value, item),
    montoEnviado: (value, item) => formatearCampo("montoEnviado", value, item),
    monedaDePago: (value, item) => formatearCampo("monedaDePago", value, item),
    CC: (value, item) => formatearCampo("CC", value, item),
    montoCC: (value, item) => formatearCampo("montoCC", value, item),
    usuario: (value, item) => formatearCampo("nombreUsuario", value, item),
    descuentoAplicado: (value, item) => {
      const formattedValue = `${Math.round(((value ?? 1) - 1) * -100)}%`;
      return formatearCampo("default", formattedValue, item);
    },
  };

  const searchFields = [
    "numeroEntrega",
    "fechaEntrega",
    "fechaCreacion",
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
    // Mapear columnas combinadas a campos de orden reales
    let actualSortField = campo;
    if (campo === "fechaHoraCreacion") {
      actualSortField = "fechaHoraCreacion";
    } else if (campo === "fechaEntrega") {
      actualSortField = "fechaEntrega";
    }

    if (sortField === actualSortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(actualSortField);
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
    <DashboardLayout title="Entregas">
      <Head>Entregas</Head>
      <Container maxWidth="xl">
        <DataTable
          data={entregas}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          showSearch={true}
          onSearchDebounced={setBusquedaTexto}
          dateField="fechaEntrega"
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
          // NUEVO: múltiples selects server-side
          multipleSelectFilters={[
            {
              key: "nombreCliente",
              label: "Cliente",
              type: "autocomplete",
              value: filtroNombreCliente,
              options: Array.from(
                new Set(
                  (clientes || [])
                    .map((c) => (c?.nombre || "").toString().trim())
                    .filter((n) => n && n.length > 0)
                )
              )
                .sort((a, b) => a.localeCompare(b))
                .map((n) => ({ value: n, label: n })),
              onChange: (v) => {
                setFiltroNombreCliente(v);
                setPaginaActual(1);
              },
            },
            {
              key: "moneda",
              label: "Moneda",
              value: filtroMoneda,
              options: [
                { value: "", label: "(todas)" },
                { value: "ARS", label: "ARS" },
                { value: "USD", label: "USD" },
              ],
              onChange: (v) => {
                setFiltroMoneda(v);
                setPaginaActual(1);
              },
            },
            {
              key: "cc",
              label: "CC",
              value: filtroCC,
              options: [
                { value: "", label: "(todas)" },
                { value: "ARS", label: "ARS" },
                { value: "USD OFICIAL", label: "USD OFICIAL" },
                { value: "USD BLUE", label: "USD BLUE" },
              ],
              onChange: (v) => {
                setFiltroCC(v);
                setPaginaActual(1);
              },
            },
            {
              key: "usuario",
              label: "Usuario",
              value: filtroUsuario,
              options: usuariosOptions,
              onChange: (v) => {
                setFiltroUsuario(v);
                setPaginaActual(1);
              },
            },
          ]}
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
    </DashboardLayout>
  );
};

export default EntregasCelulandiaPage;
