import React, { useState, useEffect, useMemo, useRef } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import RowActions from "src/components/celulandia/RowActions";
import movimientosService from "src/services/celulandia/movimientosService";

import cajasService from "src/services/celulandia/cajasService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { getFechaArgentina } from "src/utils/celulandia/fechas";
import HistorialModal from "src/components/celulandia/HistorialModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import EditarPagoModal from "src/components/celulandia/EditarPagoModal";
import AgregarPagoModal from "src/components/celulandia/AgregarPagoModal";
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";
import { getEmpresaDetailsFromUser } from "src/services/empresaService";
import { useAuthContext } from "src/contexts/auth-context";
import { formatearMonto } from "src/utils/celulandia/separacionMiles";
import useDebouncedValue from "src/hooks/useDebouncedValue";
import PagosFiltersBar from "src/components/celulandia/PagosFiltersBar";
import { usersSistema } from "src/utils/celulandia/users";

const PagosCelulandiaPage = () => {
  const { user } = useAuthContext();
  const [pagos, setPagos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPagos, setTotalPagos] = useState(0);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("fechaFactura");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [categorias, setCategorias] = useState([]);

  const [cajas, setCajas] = useState([]);
  const [filtroMoneda, setFiltroMoneda] = useState("");
  const [selectedCajaNombre, setSelectedCajaNombre] = useState(""); // "" => Todas
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const usuariosOptions = useMemo(
    () => [
      { value: "", label: "(todos)" },
      ...[...usersSistema].sort().map((u) => ({ value: u, label: u })),
    ],
    []
  );
  const [montoDesde, setMontoDesde] = useState("");
  const [montoHasta, setMontoHasta] = useState("");
  const debouncedMontoDesde = useDebouncedValue(montoDesde, 500);
  const debouncedMontoHasta = useDebouncedValue(montoHasta, 500);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const debouncedBusqueda = useDebouncedValue(busquedaTexto, 500);

  const prevDebouncedRef = useRef({
    busqueda: debouncedBusqueda,
    desde: debouncedMontoDesde,
    hasta: debouncedMontoHasta,
  });
  const fetchRequestIdRef = useRef(0);

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
    const prev = prevDebouncedRef.current;
    const debouncedChanged =
      prev.busqueda !== debouncedBusqueda ||
      prev.desde !== debouncedMontoDesde ||
      prev.hasta !== debouncedMontoHasta;

    prevDebouncedRef.current = {
      busqueda: debouncedBusqueda,
      desde: debouncedMontoDesde,
      hasta: debouncedMontoHasta,
    };

    // Evitar doble request: si cambió el debounce y estamos en otra página,
    // primero reseteamos a página 1 y dejamos que el siguiente render fetchee.
    if (debouncedChanged && paginaActual !== 1) {
      setPaginaActual(1);
      return;
    }

    fetchData(paginaActual);
  }, [
    paginaActual,
    sortField,
    sortDirection,
    filtroFecha,
    selectedCajaNombre,
    filtroMoneda,
    filtroUsuario,
    debouncedMontoDesde,
    debouncedMontoHasta,
    debouncedBusqueda,
  ]);

  const fetchData = async (pagina = 1) => {
    const requestId = (fetchRequestIdRef.current += 1);
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const { fechaInicio, fechaFin } = calcularFechasFiltro(filtroFecha);

      // Convertir montos a negativos e invertir desde/hasta para EGRESOS
      // Si el usuario busca desde 100 hasta 500, en la BD buscamos desde -500 hasta -100
      let montoDesdeNegativo = undefined;
      let montoHastaNegativo = undefined;
      
      if (debouncedMontoDesde || debouncedMontoHasta) {
        // Si hay montoHasta del usuario, se convierte en montoDesde negativo (límite inferior)
        if (debouncedMontoHasta) {
          montoDesdeNegativo = -Math.abs(Number(debouncedMontoHasta));
        }
        // Si hay montoDesde del usuario, se convierte en montoHasta negativo (límite superior)
        if (debouncedMontoDesde) {
          montoHastaNegativo = -Math.abs(Number(debouncedMontoDesde));
        }
      }

      const [movimientosResponse, cajasResponse, empresaResponse] = await Promise.all([
        movimientosService.getAllMovimientos({
          type: "EGRESO",
          populate: "caja",
          limit: limitePorPagina,
          offset,
          sortField,
          sortDirection,
          cajaNombre: selectedCajaNombre || undefined,
          moneda: filtroMoneda || undefined,
          nombreUsuario: filtroUsuario || undefined,
          ...(montoDesdeNegativo !== undefined ? { montoDesde: montoDesdeNegativo } : {}),
          ...(montoHastaNegativo !== undefined ? { montoHasta: montoHastaNegativo } : {}),
          montoTipo: "enviado",
          fechaInicio,
          fechaFin,
          text: debouncedBusqueda || undefined,
          //includeInactive: true, // Incluir registros inactivos para mostrarlos tachados
        }),
        cajasService.getAllCajas(),
        getEmpresaDetailsFromUser(user),
      ]);

      if (requestId !== fetchRequestIdRef.current) return;

      setPagos(movimientosResponse.data.map(parseMovimiento));
      setTotalPagos(movimientosResponse.total || 0);
      setCajas(cajasResponse.data);
      const cates = empresaResponse?.categorias || [];
      setCategorias(cates);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
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
    { key: "concepto", label: "Concepto", sortable: false },
    { key: "cuentaDestino", label: "Cuenta Origen", sortable: false },
    { key: "montoEnviado", label: "Monto", sortable: false },
    { key: "moneda", label: "Moneda", sortable: false },
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
          onDelete={handleDelete}
          showImage={false}
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
    nombreUsuario: (value, item) => formatearCampo("default", value, item),
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
    // Si se hace click en la columna combinada "fechaHora", ordenar por "fechaFactura"
    const actualSortField = campo === "fechaHora" ? "fechaFactura" : campo;

    if (sortField === actualSortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(actualSortField);
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
    if (filtroMoneda) chips.push(`Moneda: ${filtroMoneda}`);
    if (selectedCajaNombre) chips.push(`Cuenta de Origen: ${selectedCajaNombre}`);
    if (filtroUsuario) chips.push(`Usuario: ${filtroUsuario}`);
    if (montoDesde) chips.push(`Desde: $${formatearMonto(montoDesde)}`);
    if (montoHasta) chips.push(`Hasta: $${formatearMonto(montoHasta)}`);
    if (busquedaTexto) chips.push(`Buscar: ${busquedaTexto}`);
    return chips;
  }, [filtroFecha, filtroMoneda, selectedCajaNombre, filtroUsuario, montoDesde, montoHasta, busquedaTexto]);

  return (
    <DashboardLayout title="Pagos">
      <Head>
        <title>Pagos</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
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
          showDateFilterOptions={false}
          serverSide={true}
          filtroFecha={filtroFecha}
          onFiltroFechaChange={(nuevoFiltro) => {
            setFiltroFecha(nuevoFiltro);
            setPaginaActual(1); // Resetear a la primera página
          }}
          showRefreshButton={true}
          onRefresh={refetchPagos}
          customFiltersComponent={
            <PagosFiltersBar
              onSearchDebounced={setBusquedaTexto}
              initialSearch={busquedaTexto}
              filtroFecha={filtroFecha}
              onFiltroFechaChange={(nuevo) => {
                setFiltroFecha(nuevo);
                setPaginaActual(1);
              }}
              cajas={cajas}
              usuariosOptions={usuariosOptions}
              filtroMoneda={filtroMoneda}
              setFiltroMoneda={(v) => {
                setFiltroMoneda(v);
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
            />
          }
          filterChips={filterChips}
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
        categorias={categorias}
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
    </DashboardLayout>
  );
};

export default PagosCelulandiaPage;
