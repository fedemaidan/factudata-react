import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/DataTable";
import TableActions from "src/components/TableActions";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";

import EditarModal from "src/components/EditarModal";
import HistorialModal from "src/components/HistorialModal";
import AgregarModal from "src/components/AgregarModal";

// Mock data para ejemplo
const mockEntregas = [
  {
    id: 1,
    numeroEntrega: "ENT-001-2025",
    fecha: "2025-01-15",
    hora: "14:30",
    cliente: "Juan Pérez",
    montoEnviado: 50000,
    moneda: "ARS",
    CC: "USD BLUE",
    montoCC: 100,
    tipoDeCambio: 500,
    estado: "PENDIENTE",
    usuario: "admin@celulandia.com",
    imagen: "https://via.placeholder.com/150",
  },
  {
    id: 2,
    numeroEntrega: "ENT-002-2025",
    fecha: "2025-01-14",
    hora: "16:45",
    cliente: "María González",
    montoEnviado: 75000,
    moneda: "ARS",
    CC: "USD OFICIAL",
    montoCC: 150,
    tipoDeCambio: 500,
    estado: "CONFIRMADO",
    usuario: "operador@celulandia.com",
    imagen: null,
  },
  {
    id: 3,
    numeroEntrega: "ENT-003-2025",
    fecha: "2025-01-13",
    hora: "09:15",
    cliente: "Roberto Silva",
    montoEnviado: 25000,
    moneda: "ARS",
    CC: "USD BLUE",
    montoCC: 50,
    tipoDeCambio: 500,
    estado: "PENDIENTE",
    usuario: "admin@celulandia.com",
    imagen: "https://via.placeholder.com/150",
  },
];

const EntregasCelulandiaPage = () => {
  const [entregas, setEntregas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [historialCambios, setHistorialCambios] = useState({});

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setEntregas(mockEntregas);
      setIsLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: "numeroEntrega", label: "Número de Entrega", sortable: false },
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "hora", label: "Hora", sortable: false },
    { key: "cliente", label: "Cliente", sortable: false },
    { key: "montoEnviado", label: "Monto Enviado", sortable: true },
    { key: "moneda", label: "Moneda", sortable: false },
    { key: "CC", label: "CC", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: false },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: false },
    { key: "estado", label: "Estado", sortable: false },
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
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    CC: (value) => formatearCampo("CC", value),
    montoCC: (value) => formatearCampo("montoCC", value),
    tipoDeCambio: (value) => formatearCampo("tipoDeCambio", value),
    estado: (value) => formatearCampo("estado", value),
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

  const handleSaveEdit = (id, updatedData) => {
    // Encontrar la entrega original antes de la edición
    const entregaOriginal = entregas.find((ent) => ent.id === id);

    // Detectar qué campos cambiaron
    const cambios = [];
    Object.keys(updatedData).forEach((campo) => {
      if (entregaOriginal[campo] !== updatedData[campo]) {
        cambios.push({
          campo,
          valorAnterior: entregaOriginal[campo],
          valorNuevo: updatedData[campo],
        });
      }
    });

    // Solo registrar cambios si hay modificaciones
    if (cambios.length > 0) {
      const registroCambio = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        usuario: "Martin Sorby",
        cambios: cambios,
        entrega: entregaOriginal.numeroEntrega,
      };

      setHistorialCambios((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), registroCambio],
      }));
    }

    // Actualizar la entrega
    setEntregas((prevEntregas) =>
      prevEntregas.map((ent) => (ent.id === id ? { ...ent, ...updatedData } : ent))
    );
  };

  const handleSaveNew = (newData) => {
    // Agregar la nueva entrega a la lista
    setEntregas((prevEntregas) => [...prevEntregas, newData]);
  };

  return (
    <>
      <Head>
        <title>Entregas Celulandia</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Entregas Celulandia"
          data={entregas}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          onAdd={() => setAgregarModalOpen(true)}
        />
      </Container>

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

EntregasCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EntregasCelulandiaPage;
