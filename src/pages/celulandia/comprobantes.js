import React, { useState, useEffect, useMemo } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import RowActions from "src/components/celulandia/RowActions";
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
import Head from "next/head";
import useDebouncedValue from "src/hooks/useDebouncedValue";
import ComprobantesFiltersBar from "src/components/celulandia/ComprobantesFiltersBar";
import { formatearMonto, parsearMonto } from "src/utils/celulandia/separacionMiles";

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
  const [limitePorPagina] = useState(50);
  const [sortField, setSortField] = useState("fechaCreacion");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);

  // Nuevos estados para los datos compartidos
  const [clientes, setClientes] = useState([]);
  const [tipoDeCambio, setTipoDeCambio] = useState({
    ultimaActualizacion: "",
    oficial: null,
    blue: null,
    current: 1,
  });
  const [cajas, setCajas] = useState([]);
  const [selectedCajaNombre, setSelectedCajaNombre] = useState(""); // "" => Todas
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [usuariosOptions, setUsuariosOptions] = useState([{ value: "", label: "(todos)" }]);
  const [filtroNombreCliente, setFiltroNombreCliente] = useState("");
  const [filtroMoneda, setFiltroMoneda] = useState("");
  const [filtroCuentaCorriente, setFiltroCuentaCorriente] = useState("");
  const [montoDesde, setMontoDesde] = useState("");
  const [montoHasta, setMontoHasta] = useState("");
  const [montoTipo, setMontoTipo] = useState("enviado"); // 'enviado' | 'cc'
  const debouncedMontoDesde = useDebouncedValue(montoDesde, 500);
  const debouncedMontoHasta = useDebouncedValue(montoHasta, 500);


  const movimientoHistorialConfig = useMemo(() => getMovimientoHistorialConfig(cajas), [cajas]);

  useEffect(() => {
    fetchData(paginaActual);
  }, [
    paginaActual,
    sortField,
    sortDirection,
    filtroFecha,
    selectedCajaNombre,
    filtroUsuario,
    filtroNombreCliente,
    filtroMoneda,
    filtroCuentaCorriente,
    debouncedMontoDesde,
    debouncedMontoHasta,
    montoTipo,
    debouncedBusqueda,
  ]);

  useEffect(() => {
    setPaginaActual(1);
  }, [debouncedBusqueda, debouncedMontoDesde, debouncedMontoHasta]);

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
            cajaNombre: selectedCajaNombre || undefined,
            nombreUsuario: filtroUsuario || undefined,
            ...(filtroNombreCliente ? { clienteNombre: filtroNombreCliente } : {}),
          ...(filtroMoneda ? { moneda: filtroMoneda } : {}),
          ...(filtroCuentaCorriente ? { cuentaCorriente: filtroCuentaCorriente } : {}),
          ...(debouncedMontoDesde ? { montoDesde: debouncedMontoDesde } : {}),
          ...(debouncedMontoHasta ? { montoHasta: debouncedMontoHasta } : {}),
          ...(montoTipo ? { montoTipo } : {}),
            fechaInicio,
            fechaFin,
            text: debouncedBusqueda || undefined,
            //includeInactive: true,
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

      // Opciones de usuarios (simple, como en entregas)
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
      key: "fechaHoraCreacion",
      label: "Fecha y Hora Creación",
      sortable: true,
      render: (item) => (
        <div>
          <div>{getFechaArgentina(item.fechaCreacion)}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {formatearCampo("hora", item.horaCreacion)}
          </div>
        </div>
      ),
    },
    { key: "fechaFactura", label: "Fecha Factura", sortable: true },
    { key: "cliente", label: "Cliente", sortable: true },
    {
      key: "cuentaDestino",
      label: "Cuenta Destino",
      sortable: true,
      sx: {
        maxWidth: "185px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
    },
    { key: "montoYMoneda", label: "Monto Enviado", sortable: true },
    { key: "montoCC", label: "Monto CC", sortable: true },
    { key: "cuentaCorriente", label: "CC", sortable: true },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: true },
    { key: "estado", label: "Estado", sortable: true },
    { key: "nombreUsuario", label: "Usuario", sortable: true },
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
          onDelete={handleDelete}
          showImage={true}
        />
      ),
    },
  ];

  const formatters = {
    fechaFactura: (value, item) => getFechaArgentina(value),
    fechaCreacion: (value, item) => getFechaArgentina(value),
    horaCreacion: (value, item) => formatearCampo("hora", value, item),
    nombreUsuario: (value, item) => formatearCampo("nombreUsuario", value, item),
    cuentaDestino: (value, item) => formatearCampo("cuentaDestino", value, item),
    montoYMoneda: (value, item) => formatearCampo("montoYMoneda", value, item),
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
    // Si se hace click en la columna combinada "fechaHoraCreacion", ordenar por "fechaCreacion"
    // Si se hace click en la columna combinada "montoYMoneda", ordenar por "montoEnviado"
    let actualSortField = campo;
    if (campo === "fechaHoraCreacion") {
      actualSortField = "fechaCreacion";
    } else if (campo === "montoYMoneda") {
      actualSortField = "montoEnviado";
    }

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

  const filterChips = useMemo(() => {
    const chips = [];
    const fechaLabels = {
      todos: "Todos",
      hoy: "Hoy",
      estaSemana: "Esta semana",
      esteMes: "Este mes",
      esteAño: "Este año",
    };
    if (filtroFecha && filtroFecha !== "todos") chips.push(`Fecha: ${fechaLabels[filtroFecha] || filtroFecha}`);
    if (filtroNombreCliente) chips.push(`Cliente: ${filtroNombreCliente}`);
    if (filtroMoneda) chips.push(`Moneda: ${filtroMoneda}`);
    if (filtroCuentaCorriente) chips.push(`CC: ${filtroCuentaCorriente}`);
    if (selectedCajaNombre) chips.push(`Cuenta destino: ${selectedCajaNombre}`);
    if (filtroUsuario) chips.push(`Usuario: ${filtroUsuario}`);
    if (montoDesde) chips.push(`Desde: $${formatearMonto(montoDesde)}`);
    if (montoHasta) chips.push(`Hasta: $${formatearMonto(montoHasta)}`);
    if (busquedaTexto) chips.push(`Buscar: ${busquedaTexto}`);
    return chips;
  }, [
    filtroFecha,
    filtroNombreCliente,
    filtroMoneda,
    filtroCuentaCorriente,
    selectedCajaNombre,
    filtroUsuario,
    montoTipo,
    montoDesde,
    montoHasta,
    busquedaTexto,
  ]);

  return (
    <DashboardLayout title="Comprobantes">
      <Head>Comprobantes</Head>
      <Container maxWidth="xl">
        <DataTable
          data={movimientos}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          showClienteListedChip={true}
          serverSide={true}
          showSearch={false}
          showDateFilterOptions={false}
          multipleSelectFilters={[]}
          onAdd={() => setAgregarModalOpen(true)}
          dateField="fechaFactura"
          total={totalMovimientos}
          currentPage={paginaActual}
          onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
          rowsPerPage={limitePorPagina}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          filtroFecha={filtroFecha}
          onFiltroFechaChange={(nuevoFiltro) => {
            setFiltroFecha(nuevoFiltro);
            setPaginaActual(1); // Resetear a la primera página
          }}
          showRefreshButton={true}
          onRefresh={refetchMovimientos}
          customFiltersComponent={
            <ComprobantesFiltersBar
              // búsqueda
              onSearchDebounced={setBusquedaTexto}
              initialSearch={busquedaTexto}
              // fecha
              filtroFecha={filtroFecha}
              onFiltroFechaChange={(nuevoFiltro) => {
                setFiltroFecha(nuevoFiltro);
                setPaginaActual(1);
              }}
              // datos
              clientes={clientes}
              cajas={cajas}
              usuariosOptions={usuariosOptions}
              // valores y setters
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
              selectedCajaNombre={selectedCajaNombre}
              setSelectedCajaNombre={(v) => {
                setSelectedCajaNombre(v);
                setPaginaActual(1);
              }}
              filtroUsuario={filtroUsuario}
              setFiltroUsuario={(v) => {
                setFiltroUsuario(v);
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
          filterChips={filterChips}
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
    </DashboardLayout>
  );
};

export default ComprobantesCelulandiaPage;
