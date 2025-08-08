import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";

import EditarModal from "src/components/celulandia/EditarModal";
import HistorialModal from "src/components/celulandia/HistorialModal";
import AgregarModal from "src/components/celulandia/AgregarModal";

// Mock data para ejemplo
const mockClientes = [
  {
    id: 1,
    cliente: "Juan Pérez",
    descuento: 15,
    ccActivas: ["USD BLUE", "USD OFICIAL"],
    usuario: "admin@celulandia.com",
  },
  {
    id: 2,
    cliente: "María González",
    descuento: 10,
    ccActivas: ["USD BLUE"],
    usuario: "operador@celulandia.com",
  },
  {
    id: 3,
    cliente: "Roberto Silva",
    descuento: 20,
    ccActivas: ["USD BLUE", "USD OFICIAL", "ARS"],
    usuario: "admin@celulandia.com",
  },
  {
    id: 4,
    cliente: "Ana Martínez",
    descuento: 5,
    ccActivas: ["USD OFICIAL"],
    usuario: "operador@celulandia.com",
  },
  {
    id: 5,
    cliente: "Carlos López",
    descuento: 25,
    ccActivas: ["USD BLUE"],
    usuario: "admin@celulandia.com",
  },
  {
    id: 6,
    cliente: "Laura Fernández",
    descuento: 0,
    ccActivas: ["USD BLUE", "USD OFICIAL"],
    usuario: "operador@celulandia.com",
  },
];

const ClientesCelulandiaPage = () => {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [historialCambios, setHistorialCambios] = useState({});

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setClientes(mockClientes);
      setIsLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: "cliente", label: "Cliente", sortable: true },
    { key: "descuento", label: "Descuento", sortable: false },
    { key: "ccActivas", label: "CC Activas", sortable: false },
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
    descuento: (value) => `${value}%`,
    ccActivas: (value) => formatearCampo("ccActivas", value),
  };

  const searchFields = ["cliente", "descuento", "ccActivas", "usuario"];

  const handleSaveEdit = (id, updatedData) => {
    // Encontrar el cliente original antes de la edición
    const clienteOriginal = clientes.find((cliente) => cliente.id === id);

    // Detectar qué campos cambiaron
    const cambios = [];
    Object.keys(updatedData).forEach((campo) => {
      if (clienteOriginal[campo] !== updatedData[campo]) {
        cambios.push({
          campo,
          valorAnterior: clienteOriginal[campo],
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
        cliente: clienteOriginal.cliente,
      };

      setHistorialCambios((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), registroCambio],
      }));
    }

    // Actualizar el cliente
    setClientes((prevClientes) =>
      prevClientes.map((cliente) => (cliente.id === id ? { ...cliente, ...updatedData } : cliente))
    );
  };

  const handleSaveNew = (newData) => {
    // Agregar el nuevo cliente a la lista
    setClientes((prevClientes) => [...prevClientes, newData]);
  };

  return (
    <>
      <Head>
        <title>Clientes Celulandia</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Clientes Celulandia"
          data={clientes}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          onAdd={() => setAgregarModalOpen(true)}
          dateFilterOptions={[]} // Sin filtro de fecha
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

ClientesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ClientesCelulandiaPage;
