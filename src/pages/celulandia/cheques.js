import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import RowActions from "src/components/celulandia/RowActions";
import movimientosService from "src/services/celulandia/movimientosService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { getFechaArgentina, calcularFechasFiltro } from "src/utils/celulandia/fechas";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import EditarChequeModal from "src/components/celulandia/EditarChequeModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import AgregarChequeModal from "src/components/celulandia/AgregarChequeModal";
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import clientesService from "src/services/celulandia/clientesService";
import dolarService from "src/services/celulandia/dolarService";
import cajasService from "src/services/celulandia/cajasService";
import { getUser } from "src/utils/celulandia/currentUser";
import useDebouncedValue from "src/hooks/useDebouncedValue";
import { formatearMonto, parsearMonto } from "src/utils/celulandia/separacionMiles";
import ChequesFiltersBar from "src/components/celulandia/ChequesFiltersBar";

const ChequesCelulandiaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fechaFactura");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroCaja, setFiltroCaja] = useState("ambas");
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);

  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [cajas, setCajas] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [filtroMoneda, setFiltroMoneda] = useState("");
  const [filtroCuentaCorriente, setFiltroCuentaCorriente] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [usuariosOptions, setUsuariosOptions] = useState([{ value: "", label: "(todos)" }]);
  const [filtroNombreCliente, setFiltroNombreCliente] = useState("");
  const [montoDesde, setMontoDesde] = useState("");
  const [montoHasta, setMontoHasta] = useState("");
  const [montoTipo, setMontoTipo] = useState("enviado"); // 'enviado' | 'cc'
  const debouncedMontoDesde = useDebouncedValue(montoDesde, 500);
  const debouncedMontoHasta = useDebouncedValue(montoHasta, 500);

  const movimientoHistorialConfig = {
    title: "Historial del Cheque",
    entityName: "cheque",
    fieldNames: {
      tipoDeCambio: "Tipo de Cambio",
      estado: "Estado",
      caja: "Cuenta de Destino",
      cliente: "Cliente",
      cuentaCorriente: "Cuenta Corriente",
      moneda: "Moneda",
      numeroFactura: "Número",
      fechaFactura: "Fecha de Emisión",
      fechaCobro: "Fecha de Cobro",
      nombreUsuario: "Usuario",
    },
    formatters: {
      tipoDeCambio: (valor) => `$${valor}`,
      fechaFactura: (valor) => getFechaArgentina(valor),
      fechaCobro: (valor) => (valor ? getFechaArgentina(valor) : "-"),
      fechaCreacion: (valor) => getFechaArgentina(valor),
      cliente: (valor) => (typeof valor === "object" ? valor?.nombre || "N/A" : valor),
      caja: (valor) => (typeof valor === "object" ? valor?.nombre || "N/A" : valor),
    },
  };

  useEffect(() => {
    fetchData(paginaActual);
  }, [
    paginaActual,
    sortField,
    sortDirection,
    filtroCaja,
    debouncedBusqueda,
    filtroFecha,
    filtroMoneda,
    filtroCuentaCorriente,
    filtroUsuario,
    debouncedMontoDesde,
    debouncedMontoHasta,
    montoTipo,
  ]);

  // Resetear a la primera página cuando cambia la búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [debouncedBusqueda, debouncedMontoDesde, debouncedMontoHasta]);

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const { fechaInicio, fechaFin } = calcularFechasFiltro(filtroFecha);

      // Siempre enviar el filtro de caja al backend
      const cajaFilter = filtroCaja;

      const [movimientosResponse, clientesResponse, tipoDeCambioResponse, cajasResponse] =
        await Promise.all([
          movimientosService.getAllMovimientos({
            type: "INGRESO",
            populate: "caja",
            limit: limitePorPagina,
            offset,
            sortField,
            sortDirection,
            tipoFactura: "cheque",
            cajaNombre: cajaFilter,
            ...(filtroMoneda ? { moneda: filtroMoneda } : {}),
            ...(filtroCuentaCorriente ? { cuentaCorriente: filtroCuentaCorriente } : {}),
            nombreUsuario: filtroUsuario || undefined,
            ...(filtroNombreCliente ? { clienteNombre: filtroNombreCliente } : {}),
            ...(debouncedMontoDesde ? { montoDesde: debouncedMontoDesde } : {}),
            ...(debouncedMontoHasta ? { montoHasta: debouncedMontoHasta } : {}),
            ...(montoTipo ? { montoTipo } : {}),
            fechaInicio,
            fechaFin,
            text: debouncedBusqueda || undefined,
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

      // Usuarios (lista simple como en comprobantes)
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
      setUsuariosOptions([{ value: "", label: "(todos)" }, ...uniqueUsers.map((u) => ({ value: u, label: u }))]);
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
    {
      key: "fechaHora",
      label: "Fecha y Hora",
      sortable: true,
      render: (item) => (
        <div>
          <div>{getFechaArgentina(item.fechaFactura)}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {formatearCampo("hora", item.horaCreacion)}
          </div>
        </div>
      ),
    },
    { key: "concepto", label: "Descripción", sortable: false },
    { key: "cliente", label: "Cliente", sortable: true },
    { key: "cuentaDestino", label: "Cuenta Destino", sortable: true },
    { key: "montoEnviado", label: "Monto Enviado", sortable: true },
    { key: "moneda", label: "Moneda", sortable: true },
    { key: "montoCC", label: "Monto CC", sortable: true },
    { key: "cuentaCorriente", label: "CC", sortable: true },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: true },
    { key: "estado", label: "Estado", sortable: true },
    { key: "fechaCobro", label: "Fecha Cobro", sortable: true },
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
          onViewImage={(urlImagen) => {
            setImagenModal(urlImagen);
            setModalOpen(true);
          }}
          onDelete={(item) => {
            setSelectedData(item);
            setConfirmarEliminacionOpen(true);
          }}
          showImage={true}
        />
      ),
    },
  ];

  const formatters = {
    fechaFactura: (value) => getFechaArgentina(value),
    horaCreacion: (value) => formatearCampo("hora", value),
    concepto: (value) => formatearCampo("default", value || "-"),
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
    cuentaCorriente: (value) => formatearCampo("CC", value),
    montoCC: (value) => formatearCampo("montoCC", value),
    tipoDeCambio: (value) => formatearCampo("tipoDeCambio", value),
    estado: (value) => formatearCampo("estado", value),
    fechaCobro: (value) => (value ? getFechaArgentina(value) : "-"),
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

  // Configuración del filtro por caja
  const selectFilterConfig = {
    label: "Filtrar por Caja",
    field: "cuentaDestino",
    options: [
      { value: "ambas", label: "CHEQUE y ECHEQ" },
      { value: "CHEQUE", label: "Solo CHEQUE" },
      { value: "ECHEQ", label: "Solo ECHEQ" },
    ],
    defaultValue: "ambas",
    onChange: (value) => {
      setFiltroCaja(value);
      setPaginaActual(1); // Resetear a la primera página
    },
  };

  const handleSaveEdit = async () => {
    try {
      await refetchMovimientos();
    } catch (error) {
      console.error("Error al actualizar movimientos:", error);
      await refetchMovimientos();
    }
  };

  const handleSortChange = (campo) => {
    // Si se hace click en la columna combinada "fechaHora", ordenar por "fechaFactura"
    const actualSortField = campo === "fechaHora" ? "fechaFactura" : campo;

    if (sortField === actualSortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(actualSortField);
      setSortDirection("asc");
    }

    setPaginaActual(1);
  };

  const refetchMovimientos = async () => {
    try {
      await fetchData(paginaActual);
    } catch (error) {
      console.error("Error al recargar movimientos:", error);
    }
  };

  const handleSaveNew = async (newData) => {
    try {
      await fetchData(paginaActual);
    } catch (error) {
      console.error("Error al recargar datos después de agregar cheque:", error);
      setMovimientos((prevMovimientos) => [...prevMovimientos, parseMovimiento(newData)]);
    }
  };

  const handleDelete = (item) => {
    setSelectedData(item);
    setConfirmarEliminacionOpen(true);
  };

  const confirmarEliminacion = async () => {
    if (!selectedData) return;
    setIsDeleting(true);
    try {
      await movimientosService.deleteMovimiento(selectedData._id, getUser());
      setMovimientos((prev) =>
        prev.map((mov) => (mov._id === selectedData._id ? { ...mov, active: false } : mov))
      );
      setConfirmarEliminacionOpen(false);
      setSelectedData(null);
    } catch (error) {
      console.error("Error al eliminar cheque:", error);
      alert("Error al eliminar cheque");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Cheques">
      <Head>
        <title>Cheques</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
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
          showDateFilterOptions={false}
          serverSide={true}
          filtroFecha={filtroFecha}
          onFiltroFechaChange={(nuevo) => {
            setFiltroFecha(nuevo);
            setPaginaActual(1);
          }}
          showRefreshButton={true}
          onRefresh={refetchMovimientos}
          customFiltersComponent={
            <ChequesFiltersBar
              onSearchDebounced={setBusquedaTexto}
              initialSearch={busquedaTexto}
              filtroFecha={filtroFecha}
              onFiltroFechaChange={(nuevo) => {
                setFiltroFecha(nuevo);
                setPaginaActual(1);
              }}
              clientes={clientes}
              usuariosOptions={usuariosOptions}
              filtroNombreCliente={filtroNombreCliente}
              setFiltroNombreCliente={(v) => {
                setFiltroNombreCliente(v);
                setPaginaActual(1);
              }}
              filtroMoneda={filtroMoneda}
              setFiltroMoneda={(v) => {
                setFiltroMoneda(v);
                setPaginaActual(1);
              }}
              filtroCuentaCorriente={filtroCuentaCorriente}
              setFiltroCuentaCorriente={(v) => {
                setFiltroCuentaCorriente(v);
                setPaginaActual(1);
              }}
              filtroUsuario={filtroUsuario}
              setFiltroUsuario={(v) => {
                setFiltroUsuario(v);
                setPaginaActual(1);
              }}
              filtroCaja={filtroCaja}
              setFiltroCaja={(v) => {
                setFiltroCaja(v);
                setPaginaActual(1);
              }}
              montoDesde={montoDesde}
              setMontoDesde={setMontoDesde}
              montoHasta={montoHasta}
              setMontoHasta={setMontoHasta}
              montoTipo={montoTipo}
              setMontoTipo={(v) => {
                setMontoTipo(v);
                setPaginaActual(1);
              }}
            />
          }
        />
      </Container>

      <ComprobanteModal open={modalOpen} onClose={handleCloseModal} imagenUrl={imagenModal} />
      <EditarChequeModal
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
      <AgregarChequeModal
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
        title="Eliminar Cheque"
        message="¿Estás seguro que deseas eliminar este cheque?"
        itemName={selectedData ? `Cheque ${selectedData.numeroFactura || selectedData._id}` : ""}
      />
    </DashboardLayout>
  );
};

export default ChequesCelulandiaPage;
