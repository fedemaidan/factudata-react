import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container, Button } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import movimientosService from "src/services/celulandia/movimientosService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import EditarModal from "src/components/celulandia/EditarModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import AgregarModal from "src/components/AgregarModal";
import { parseMovimientos } from "src/utils/celulandia/movimientos/parseMovimientos";

const ComprobantesCelulandiaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [historialCambios, setHistorialCambios] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await movimientosService.getAllMovimientos();
      console.log("Datos cargados:", data);
      setMovimientos(parseMovimientos(data));
    } catch (error) {
      console.error("Error al cargar movimientos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setImagenModal("");
  };

  const columns = [
    { key: "numeroFactura", label: "Comprobante", sortable: false },
    { key: "horaCreacion", label: "Hora", sortable: false },
    { key: "cliente", label: "Cliente", sortable: false },
    { key: "cuentaCorriente", label: "Cuenta Destino", sortable: false },
    { key: "total", label: "Monto Enviado", sortable: false },
    { key: "moneda", label: "Moneda", sortable: false },
    { key: "clienteId", label: "CC", sortable: false },
    { key: "fechaCobro", label: "Monto CC", sortable: false },
    { key: "tipoFactura", label: "Tipo Cambio", sortable: false },
    { key: "estado", label: "Estado", sortable: false },
    {
      key: "urlImagen",
      label: "Imagen",
      sortable: false,
      render: (item) =>
        item.urlImagen ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setImagenModal(item.urlImagen);
              setModalOpen(true);
            }}
          >
            Ver
          </Button>
        ) : (
          "-"
        ),
    },
    { key: "nombreUsuario", label: "Usuario", sortable: false },
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
    fechaCreacion: (value) => formatearCampo("fecha", value),
    horaCreacion: (value) => formatearCampo("hora", value),
    cuentaCorriente: (value) => formatearCampo("cuentaDestino", value),
    total: (value) => {
      if (value && typeof value === "object") {
        // Si es un objeto con diferentes monedas, mostrar el valor en ARS
        if (value.ars) {
          return formatearCampo("montoEnviado", value.ars);
        }
        // Si no hay ars, mostrar el primer valor disponible
        const firstValue = Object.values(value)[0];
        return formatearCampo("montoEnviado", firstValue);
      }
      return formatearCampo("montoEnviado", value);
    },
    moneda: (value) => formatearCampo("monedaDePago", value),
    clienteId: (value) => formatearCampo("CC", value),
    fechaCobro: (value) => formatearCampo("montoCC", value),
    tipoFactura: (value) => formatearCampo("tipoDeCambio", value),
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
    "fechaCreacion",
    "horaCreacion",
    "nombreCliente",
    "",
    "total",
    "moneda",
    "clienteId",
    "fechaCobro",
    "tipoFactura",
    "estado",
    "nombreUsuario",
  ];

  const handleSaveEdit = (id, updatedData) => {
    // Encontrar el movimiento original antes de la edición
    const movimientoOriginal = movimientos.find((mov) => mov._id === id || mov.id === id);

    // Detectar qué campos cambiaron
    const cambios = [];
    Object.keys(updatedData).forEach((campo) => {
      if (movimientoOriginal[campo] !== updatedData[campo]) {
        cambios.push({
          campo,
          valorAnterior: movimientoOriginal[campo],
          valorNuevo: updatedData[campo],
        });
      }
    });

    // Solo registrar cambios si hay modificaciones
    if (cambios.length > 0) {
      const registroCambio = {
        id: Date.now(), // ID único para el registro
        fecha: new Date().toISOString(),
        usuario: "Martin Sorby",
        cambios: cambios,
        comprobante: movimientoOriginal.numeroFactura,
      };

      const itemId = movimientoOriginal._id || movimientoOriginal.id;
      setHistorialCambios((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), registroCambio],
      }));
    }

    // Actualizar el movimiento
    setMovimientos((prevMovimientos) =>
      prevMovimientos.map((mov) =>
        mov._id === id || mov.id === id ? { ...mov, ...updatedData } : mov
      )
    );
  };

  const handleSaveNew = (newData) => {
    // Agregar el nuevo movimiento a la lista con un ID temporal si no lo tiene
    const newDataWithId = {
      ...newData,
      _id: newData._id || `temp-${Date.now()}`,
    };
    setMovimientos((prevMovimientos) => [...prevMovimientos, newDataWithId]);
  };

  return (
    <>
      <Head>
        <title>Movimientos Celulandia</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Comprobantes Celulandia"
          data={movimientos}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          onAdd={() => setAgregarModalOpen(true)}
        />
      </Container>

      <ComprobanteModal open={modalOpen} onClose={handleCloseModal} imagenUrl={imagenModal} />
      <EditarModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSave={handleSaveEdit}
      />
      <HistorialModal
        open={historialModalOpen}
        onClose={() => setHistorialModalOpen(false)}
        data={selectedData}
        historial={selectedData ? historialCambios[selectedData._id || selectedData.id] || [] : []}
      />
      <AgregarModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSave={handleSaveNew}
      />
    </>
  );
};

ComprobantesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ComprobantesCelulandiaPage;
