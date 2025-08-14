import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import { Container } from "@mui/material";
import { Chip, Box, Typography } from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import TableActions from "src/components/celulandia/TableActions";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";

import HistorialModal from "src/components/celulandia/HistorialModal";
import AgregarClienteModal from "src/components/celulandia/AgregarClienteModal";
import EditarClienteModal from "src/components/celulandia/EditarClienteModal";
import clientesService from "src/services/celulandia/clientesService";

const ClientesCelulandiaPage = () => {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const clientes = await clientesService.getAllClientes();
        setClientes(clientes.data);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientes();
  }, []);

  const clienteHistorialConfig = {
    title: "Historial del Cliente",
    entityName: "cliente",
    fieldNames: {
      nombre: "Nombre del Cliente",
      descuento: "Descuento",
      ccActivas: "Cuentas Corrientes Activas",
    },
    formatters: {
      descuento: (valor) => `${(valor * 100).toFixed(0)}%`,
    },
    renderSpecialField: {
      ccActivas: (valor) => {
        if (!Array.isArray(valor)) {
          return <Typography variant="body2">{valor}</Typography>;
        }

        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {valor.map((cc, index) => (
              <Chip
                key={index}
                label={cc}
                size="small"
                sx={{
                  backgroundColor:
                    cc === "USD BLUE" ? "#aadcac" : cc === "USD OFICIAL" ? "#C8E6C9" : "#E3F2FD",
                  color:
                    cc === "USD BLUE" ? "#1B5E20" : cc === "USD OFICIAL" ? "#33691E" : "#1565C0",
                  fontWeight: "bold",
                  fontSize: "0.7rem",
                  height: "20px",
                }}
              />
            ))}
          </Box>
        );
      },
    },
  };

  const columns = [
    { key: "nombre", label: "Cliente", sortable: true },
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
    descuento: (value) => `${(value * 100).toFixed(0)}%`,
    ccActivas: (value) => formatearCampo("ccActivas", value),
  };

  const searchFields = ["nombre", "descuento", "ccActivas", "usuario"];

  const handleSaveEdit = (id, updatedData) => {
    setClientes((prevClientes) =>
      prevClientes.map((cliente) => (cliente._id === id ? updatedData : cliente))
    );
  };

  const handleSaveNew = (newData) => {
    setClientes((prevClientes) => [...prevClientes, newData]);
  };

  return (
    <>
      <Head>
        <title>Clientes</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Clientes"
          data={clientes}
          isLoading={isLoading}
          columns={columns}
          searchFields={searchFields}
          formatters={formatters}
          onAdd={() => setAgregarModalOpen(true)}
          dateFilterOptions={[]} // Sin filtro de fecha
        />
      </Container>

      <EditarClienteModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        data={selectedData}
        onSave={handleSaveEdit}
      />
      <HistorialModal
        open={historialModalOpen}
        onClose={() => setHistorialModalOpen(false)}
        data={selectedData}
        loadHistorialFunction={clientesService.getClienteLogs}
        {...clienteHistorialConfig}
      />
      <AgregarClienteModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSave={handleSaveNew}
      />
    </>
  );
};

ClientesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ClientesCelulandiaPage;
