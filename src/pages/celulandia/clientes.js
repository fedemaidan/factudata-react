import React, { useState, useEffect, useCallback } from "react";
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
import ConfirmarEliminacionModal from "src/components/celulandia/ConfirmarEliminacionModal";

const ClientesCelulandiaPage = () => {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [limitePorPagina] = useState(20);
  const [sortField, setSortField] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");

  const fetchClientes = useCallback(async () => {
    try {
      const clientes = await clientesService.getAllClientes();
      setClientes(clientes.data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para refetch de clientes
  const refetchClientes = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchClientes();
    } catch (error) {
      console.error("Error al actualizar clientes:", error);
    }
  }, [fetchClientes]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

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
    { key: "descuento", label: "Descuento", sortable: true },
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
          onDelete={(item) => {
            setSelectedData(item);
            setConfirmarEliminacionOpen(true);
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

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }
    setPaginaActual(1); // Reset a primera página al cambiar orden
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
          dateFilterOptions={[]}
          total={clientes.length}
          currentPage={paginaActual}
          onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
          rowsPerPage={limitePorPagina}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          serverSide={false}
          showRefreshButton={true}
          onRefresh={refetchClientes}
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

      <ConfirmarEliminacionModal
        open={confirmarEliminacionOpen}
        onClose={() => {
          setConfirmarEliminacionOpen(false);
          setSelectedData(null);
        }}
        onConfirm={async () => {
          if (!selectedData) return;
          setIsDeleting(true);
          try {
            await clientesService.deleteCliente(selectedData._id);
            setClientes((prev) => prev.filter((c) => c._id !== selectedData._id));
            setConfirmarEliminacionOpen(false);
            setSelectedData(null);
          } catch (error) {
            console.error("Error al eliminar cliente:", error);
            alert("Error al eliminar cliente");
          } finally {
            setIsDeleting(false);
          }
        }}
        loading={isDeleting}
        title="Eliminar Cliente"
        message="¿Estás seguro que deseas eliminar este cliente?"
        itemName={selectedData ? `Cliente ${selectedData.nombre || selectedData._id}` : ""}
      />
    </>
  );
};

ClientesCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ClientesCelulandiaPage;
