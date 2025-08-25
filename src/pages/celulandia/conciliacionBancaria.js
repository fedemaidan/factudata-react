import React, { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import Head from "next/head";
import {
  Box,
  Button,
  Checkbox,
  Container,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";

import DataTable from "src/components/celulandia/DataTable";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import movimientosService from "src/services/celulandia/movimientosService";
import { parseMovimiento } from "src/utils/celulandia/movimientos/parseMovimientos";
import conciliacionService from "src/services/celulandia/conciliacionService";
import ComprobanteModal from "src/components/celulandia/ComprobanteModal";
import { getUser } from "src/utils/celulandia/currentUser";

const ConciliacionBancariaPage = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Paginación y orden
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [limitePorPagina] = useState(100);
  const [sortField, setSortField] = useState("fechaFactura");
  const [sortDirection, setSortDirection] = useState("desc");

  const fetchData = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const movsResp = await movimientosService.getAllMovimientos({
        type: "INGRESO",
        populate: "caja",
        estado: "PENDIENTE",
        limit: limitePorPagina,
        offset,
      });

      const movimientos = (movsResp?.data || []).map((m) => {
        const pm = parseMovimiento(m);
        return {
          _id: pm._id,
          fecha: pm.fechaCreacion || pm.fechaFactura,
          hora: pm.horaCreacion || pm.horaFactura,
          cliente: pm.cliente?.nombre || pm.nombreCliente || "-",
          cuentaDestino: pm.cuentaDestino || pm.caja?.nombre || "-",
          montoEnviado: pm.montoEnviado || 0,
          urlImagen: pm.urlImagen || m.urlImagen || "",
          raw: pm,
        };
      });
      setItems(movimientos);
      setTotalMovimientos(movsResp.total || movimientos.length || 0);
      setPaginaActual(pagina);
    } catch (e) {
      console.error("Error cargando conciliación:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(paginaActual);
  }, [paginaActual, sortField, sortDirection]);

  const allVisibleKeys = useMemo(() => new Set(items.map((i) => i._id)), [items]);
  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selectedKeys.has(i._id)),
    [items, selectedKeys]
  );
  const someSelected = useMemo(
    () => items.some((i) => selectedKeys.has(i._id)) && !allSelected,
    [items, selectedKeys, allSelected]
  );

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((i) => next.delete(i._id));
      } else {
        items.forEach((i) => next.add(i._id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = [
    {
      key: "seleccionar",
      label: (
        <Checkbox indeterminate={someSelected} checked={allSelected} onChange={toggleSelectAll} />
      ),
      sortable: false,
      render: (item) => (
        <Checkbox checked={selectedKeys.has(item._id)} onChange={() => toggleRow(item._id)} />
      ),
      onRowClick: (item) => toggleRow(item._id),
    },
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "hora", label: "Hora", sortable: true },
    { key: "cliente", label: "Cliente", sortable: true },
    { key: "cuentaDestino", label: "Cuenta Destino", sortable: true },
    { key: "montoEnviado", label: "Monto Enviado", sortable: true },
    {
      key: "verImagen",
      label: "Imagen",
      sortable: false,
      render: (item) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setImagenModal(item.urlImagen || item.raw?.urlImagen || "");
            setModalOpen(true);
          }}
        >
          Ver imagen
        </Button>
      ),
    },
  ];

  const formatters = {
    fecha: (value) => formatearCampo("fecha", value),
    hora: (value) => formatearCampo("hora", value),
    cuentaDestino: (value) => formatearCampo("cuentaDestino", value),
    montoEnviado: (value) => formatearCampo("montoEnviado", value),
  };

  const handleConfirmar = async () => {
    if (selectedKeys.size === 0) return;

    setIsConfirming(true);
    try {
      await conciliacionService.confirmarSeleccionados(Array.from(selectedKeys), getUser());
      setSelectedKeys(new Set());
      await fetchData(paginaActual);
    } catch (error) {
      console.error("Error confirmando selección:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const searchFields = ["fecha", "hora", "cliente", "cuentaDestino", "montoEnviado"];

  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }
    setPaginaActual(1);
  };

  return (
    <>
      <Head>
        <title>Conciliación Bancaria</title>
      </Head>
      <Container maxWidth="xl">
        <Stack
          spacing={2}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="h4">Conciliación Bancaria</Typography>
          <Button
            variant="contained"
            color="primary"
            disabled={selectedKeys.size === 0 || isConfirming}
            onClick={handleConfirmar}
            startIcon={isConfirming ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isConfirming ? "Confirmando..." : `Confirmar seleccionados (${selectedKeys.size})`}
          </Button>
        </Stack>
        <Box>
          <DataTable
            data={items}
            isLoading={isLoading}
            columns={columns}
            searchFields={searchFields}
            formatters={formatters}
            dateField="fecha"
            total={totalMovimientos}
            currentPage={paginaActual}
            onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
            rowsPerPage={limitePorPagina}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </Box>
      </Container>
      <ComprobanteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        imagenUrl={imagenModal}
      />
    </>
  );
};

ConciliacionBancariaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ConciliacionBancariaPage;
