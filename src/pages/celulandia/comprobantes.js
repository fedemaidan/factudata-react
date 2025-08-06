import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container, Button } from "@mui/material";

import DataTable from "src/components/DataTable";
import TableActions from "src/components/TableActions";
import celulandiaService from "src/services/celulandiaService";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import ComprobanteModal from "src/components/ComprobanteModal";
import EditarModal from "src/components/EditarModal";
import HistorialModal from "src/components/HistorialModal";
import AgregarModal from "src/components/AgregarModal";

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

    // Agregar algunos datos de ejemplo al historial para demostración
    const historialEjemplo = {
      1: [
        {
          id: Date.now() - 1000,
          fecha: new Date(Date.now() - 86400000).toISOString(), // Hace 1 día
          usuario: "admin@celulandia.com",
          cambios: [
            {
              campo: "montoEnviado",
              valorAnterior: 45000,
              valorNuevo: 50000,
            },
            {
              campo: "estado",
              valorAnterior: "PENDIENTE",
              valorNuevo: "CONFIRMADO",
            },
          ],
          comprobante: "COMP-001-2025",
        },
      ],
      2: [
        {
          id: Date.now() - 2000,
          fecha: new Date(Date.now() - 172800000).toISOString(), // Hace 2 días
          usuario: "operador@celulandia.com",
          cambios: [
            {
              campo: "cliente",
              valorAnterior: "María González",
              valorNuevo: "María González López",
            },
          ],
          comprobante: "COMP-002-2025",
        },
        {
          id: Date.now() - 3000,
          fecha: new Date(Date.now() - 3600000).toISOString(), // Hace 1 hora
          usuario: "admin@celulandia.com",
          cambios: [
            {
              campo: "montoEnviado",
              valorAnterior: 950,
              valorNuevo: 1000,
            },
            {
              campo: "tipoDeCambio",
              valorAnterior: 800,
              valorNuevo: 850,
            },
          ],
          comprobante: "COMP-002-2025",
        },
      ],
      3: [
        {
          id: Date.now() - 4000,
          fecha: new Date(Date.now() - 43200000).toISOString(), // Hace 12 horas
          usuario: "operador@celulandia.com",
          cambios: [
            {
              campo: "montoEnviado",
              valorAnterior: 700,
              valorNuevo: 750,
            },
            {
              campo: "CC",
              valorAnterior: "USD OFICIAL",
              valorNuevo: "USD BLUE",
            },
          ],
          comprobante: "COMP-003-2025",
        },
      ],
      4: [
        {
          id: Date.now() - 5000,
          fecha: new Date(Date.now() - 7200000).toISOString(), // Hace 2 horas
          usuario: "admin@celulandia.com",
          cambios: [
            {
              campo: "estado",
              valorAnterior: "PENDIENTE",
              valorNuevo: "CONFIRMADO",
            },
            {
              campo: "montoEnviado",
              valorAnterior: 70000,
              valorNuevo: 75000,
            },
          ],
          comprobante: "COMP-004-2025",
        },
      ],
      5: [
        {
          id: Date.now() - 6000,
          fecha: new Date(Date.now() - 1800000).toISOString(), // Hace 30 minutos
          usuario: "operador@celulandia.com",
          cambios: [
            {
              campo: "cliente",
              valorAnterior: "Roberto Silva",
              valorNuevo: "Roberto Silva Martínez",
            },
            {
              campo: "montoEnviado",
              valorAnterior: 1800,
              valorNuevo: 2000,
            },
          ],
          comprobante: "COMP-005-2025",
        },
      ],
    };

    setHistorialCambios(historialEjemplo);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await celulandiaService.getAllMovimientos();
      console.log("Datos cargados:", data);
      setMovimientos(data);
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
    { key: "numeroComprobante", label: "Comprobante", sortable: false },
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "hora", label: "Hora", sortable: false },
    { key: "cliente", label: "Cliente", sortable: false },
    { key: "cuentaDestino", label: "Cuenta Destino", sortable: false },
    { key: "montoEnviado", label: "Monto Enviado", sortable: false },
    { key: "monedaDePago", label: "Moneda", sortable: false },
    { key: "CC", label: "CC", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: false },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: false },
    { key: "estado", label: "Estado", sortable: false },
    {
      key: "imagen",
      label: "Imagen",
      sortable: false,
      render: (item) =>
        item.imagen ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setImagenModal(item.imagen);
              setModalOpen(true);
            }}
          >
            Ver
          </Button>
        ) : (
          "-"
        ),
    },
    { key: "usuario", label: "Usuario", sortable: false },
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
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
    monedaDePago: (value) => formatearCampo("monedaDePago", value),
    CC: (value) => formatearCampo("CC", value),
    montoCC: (value) => formatearCampo("montoCC", value),
    tipoDeCambio: (value) => formatearCampo("tipoDeCambio", value),
    estado: (value) => formatearCampo("estado", value),
  };

  const searchFields = [
    "numeroComprobante",
    "fecha",
    "hora",
    "cliente",
    "cuentaDestino",
    "montoEnviado",
    "monedaDePago",
    "CC",
    "montoCC",
    "tipoDeCambio",
    "estado",
    "usuario",
  ];

  const handleSaveEdit = (id, updatedData) => {
    // Encontrar el movimiento original antes de la edición
    const movimientoOriginal = movimientos.find((mov) => mov.id === id);

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
        comprobante: movimientoOriginal.numeroComprobante,
      };

      setHistorialCambios((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), registroCambio],
      }));
    }

    // Actualizar el movimiento
    setMovimientos((prevMovimientos) =>
      prevMovimientos.map((mov) => (mov.id === id ? { ...mov, ...updatedData } : mov))
    );
  };

  const handleSaveNew = (newData) => {
    // Agregar el nuevo movimiento a la lista
    setMovimientos((prevMovimientos) => [...prevMovimientos, newData]);
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
        historial={selectedData ? historialCambios[selectedData.id] || [] : []}
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
