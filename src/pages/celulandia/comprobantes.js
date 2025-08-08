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
import AgregarModal from "src/components/celulandia/AgregarModal";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";

const ComprobantesCelulandiaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await movimientosService.getAllMovimientos();
      setMovimientos(data.map(parseMovimiento));
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
    { key: "fechaCreacion", label: "Fecha", sortable: true },
    { key: "horaCreacion", label: "Hora", sortable: true },
    { key: "cliente", label: "Cliente", sortable: false },
    { key: "cuentaDestino", label: "Cuenta Destino", sortable: false },
    { key: "montoEnviado", label: "Monto Enviado", sortable: false },
    { key: "moneda", label: "Moneda", sortable: false },
    { key: "montoCC", label: "Monto CC", sortable: false },
    { key: "cuentaCorriente", label: "CC", sortable: false },
    { key: "tipoDeCambio", label: "Tipo Cambio", sortable: false },
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
    fechaCreacion: (value) => formatearCampo("fecha", value),
    horaCreacion: (value) => formatearCampo("hora", value),
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    moneda: (value) => formatearCampo("monedaDePago", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
    cuentaCorriente: (value) => formatearCampo("CC", value),
    montoCC: (value) => formatearCampo("montoCC", value),
    tipoDeCambio: (value) => formatearCampo("tipoDeCambio", value),
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
    "cuentaDestino",
    "moneda",
    "clienteId",
    "fechaCobro",
    "tipoFactura",
    "estado",
    "nombreUsuario",
  ];

  const handleSaveEdit = (id, updatedData) => {
    // Encontrar el movimiento original antes de la edición
    //const movimientoOriginal = movimientos.find((mov) => mov._id === id || mov.id === id);

    setMovimientos((prevMovimientos) =>
      prevMovimientos.map((mov) =>
        mov._id === id || mov.id === id ? { ...mov, ...updatedData } : mov
      )
    );
  };

  const handleSaveNew = (newData) => {
    setMovimientos((prevMovimientos) => [...prevMovimientos, parseMovimiento(newData)]);
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
          dateField="fechaCreacion"
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
