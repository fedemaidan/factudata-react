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
const mockPagos = [
  {
    id: 1,
    fecha: "2025-01-15",
    hora: "14:30",
    concepto: "Pago de servicios",
    cuentaOrigen: "Banco Galicia",
    monto: 25000,
    moneda: "ARS",
    usuario: "admin@celulandia.com",
  },
  {
    id: 2,
    fecha: "2025-01-14",
    hora: "16:45",
    concepto: "Transferencia a proveedor",
    cuentaOrigen: "Banco Santander",
    monto: 75000,
    moneda: "ARS",
    usuario: "operador@celulandia.com",
  },
  {
    id: 3,
    fecha: "2025-01-13",
    hora: "09:15",
    concepto: "Pago de impuestos",
    cuentaOrigen: "Banco Nación",
    monto: 50000,
    moneda: "ARS",
    usuario: "admin@celulandia.com",
  },
  {
    id: 4,
    fecha: "2025-01-12",
    hora: "11:20",
    concepto: "Compra de materiales",
    cuentaOrigen: "Banco Galicia",
    monto: 120000,
    moneda: "ARS",
    usuario: "operador@celulandia.com",
  },
  {
    id: 5,
    fecha: "2025-01-11",
    hora: "15:30",
    concepto: "Pago de alquiler",
    cuentaOrigen: "Banco Santander",
    monto: 180000,
    moneda: "ARS",
    usuario: "admin@celulandia.com",
  },
];

const PagosCelulandiaPage = () => {
  const [pagos, setPagos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [historialCambios, setHistorialCambios] = useState({});

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setPagos(mockPagos);
      setIsLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "hora", label: "Hora", sortable: false },
    { key: "concepto", label: "Concepto", sortable: false },
    { key: "cuentaOrigen", label: "Cuenta Origen", sortable: false },
    { key: "monto", label: "Monto", sortable: true },
    { key: "moneda", label: "Moneda", sortable: false },
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
    monto: (value) => formatearCampo("montoEnviado", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
  };

  const searchFields = ["fecha", "hora", "concepto", "cuentaOrigen", "monto", "moneda", "usuario"];

  const handleSaveEdit = (id, updatedData) => {
    // Encontrar el pago original antes de la edición
    const pagoOriginal = pagos.find((pago) => pago.id === id);

    // Detectar qué campos cambiaron
    const cambios = [];
    Object.keys(updatedData).forEach((campo) => {
      if (pagoOriginal[campo] !== updatedData[campo]) {
        cambios.push({
          campo,
          valorAnterior: pagoOriginal[campo],
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
        pago: pagoOriginal.concepto,
      };

      setHistorialCambios((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), registroCambio],
      }));
    }

    // Actualizar el pago
    setPagos((prevPagos) =>
      prevPagos.map((pago) => (pago.id === id ? { ...pago, ...updatedData } : pago))
    );
  };

  const handleSaveNew = (newData) => {
    // Agregar el nuevo pago a la lista
    setPagos((prevPagos) => [...prevPagos, newData]);
  };

  return (
    <>
      <Head>
        <title>Pagos Celulandia</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          title="Pagos Celulandia"
          data={pagos}
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

PagosCelulandiaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PagosCelulandiaPage;
