import React, { useState, useEffect } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Button, Chip } from "@mui/material";
import {
  Launch as LaunchIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Block as BlockIcon,
  Label as LabelIcon,
} from "@mui/icons-material";
import Head from "next/head";
import { useRouter } from "next/router";
import DataTable from "src/components/celulandia/DataTable";
import AgregarProyeccionModal from "src/components/celulandia/AgregarProyeccionModal";
import GestionarTagsModal from "src/components/celulandia/GestionarTagsModal";
import proyeccionService from "src/services/celulandia/proyeccionService";
import { getFechaArgentina } from "src/utils/celulandia/fechas";
import AgregarIgnorarProductosModal from "src/components/celulandia/AgregarIgnorarProductosModal";

const ProyeccionesCelulandiaPage = () => {
  const [proyecciones, setProyecciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [total, setTotal] = useState(0);
  const [limitePorPagina] = useState(100);
  const [sortField, setSortField] = useState("fechaCreacion");
  const [sortDirection, setSortDirection] = useState("desc");
  const router = useRouter();

  useEffect(() => {
    fetchProyecciones(paginaActual);
  }, [paginaActual, sortField, sortDirection]);

  const fetchProyecciones = async (pagina = 1) => {
    setIsLoading(true);
    try {
      const offset = (pagina - 1) * limitePorPagina;
      const response = await proyeccionService.getAllProyecciones({
        limit: limitePorPagina,
        offset,
        sortField,
        sortDirection,
      });
      setProyecciones(response.data || []);
      setTotal(response.total || 0);
      setPaginaActual(pagina);
    } catch (error) {
      console.error("Error al cargar proyecciones:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSortChange = (campo) => {
    if (sortField === campo) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(campo);
      setSortDirection("asc");
    }
    setPaginaActual(1);
  };

  const handleLinkClick = (url) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleRowClick = (item) => {
    router.push(`/celulandia/proyecciones/${item._id}`);
  };

  const columns = [
    {
      key: "seleccionar",
      label: "",
      sortable: false,
      render: () => null,
      onRowClick: handleRowClick,
    },
    {
      key: "fechaCreacion",
      label: "Fecha Creación",
      sortable: true,
      render: (item) => getFechaArgentina(item.fechaCreacion),
    },
    {
      key: "fechaInicio",
      label: "Fecha Inicio",
      sortable: true,
      render: (item) => getFechaArgentina(item.fechaInicio),
    },
    {
      key: "fechaFin",
      label: "Fecha Fin",
      sortable: true,
      render: (item) => getFechaArgentina(item.fechaFin),
    },
    {
      key: "linkStock",
      label: "Stock Período",
      sortable: false,
      render: (item) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<InventoryIcon />}
          endIcon={<LaunchIcon />}
          onClick={() => handleLinkClick(item.linkStock)}
          sx={{
            minWidth: "120px",
            borderRadius: 2,
            textTransform: "none",
            fontSize: "0.75rem",
            py: 0.5,
            px: 1.5,
            borderColor: "primary.main",
            color: "primary.main",
            "&:hover": {
              backgroundColor: "primary.main",
              color: "white",
              borderColor: "primary.main",
            },
          }}
        >
          Ver Stock
        </Button>
      ),
    },
    {
      key: "linkVentas",
      label: "Ventas Período",
      sortable: false,
      render: (item) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<TrendingUpIcon />}
          endIcon={<LaunchIcon />}
          onClick={() => handleLinkClick(item.linkVentas)}
          sx={{
            minWidth: "120px",
            borderRadius: 2,
            textTransform: "none",
            fontSize: "0.75rem",
            py: 0.5,
            px: 1.5,
            borderColor: "success.main",
            color: "success.main",
            "&:hover": {
              backgroundColor: "success.main",
              color: "white",
              borderColor: "success.main",
            },
          }}
        >
          Ver Ventas
        </Button>
      ),
    },
  ];

  const formatters = {
    fechaCreacion: (value) => getFechaArgentina(value),
    fechaInicio: (value) => getFechaArgentina(value),
    fechaFin: (value) => getFechaArgentina(value),
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIgnoreOpen, setIsIgnoreOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  const handleOpenAdd = () => setIsAddOpen(true);
  const handleCloseAdd = () => setIsAddOpen(false);
  const handleOpenIgnore = () => setIsIgnoreOpen(true);
  const handleCloseIgnore = () => setIsIgnoreOpen(false);
  const handleOpenTags = () => setIsTagsOpen(true);
  const handleCloseTags = () => setIsTagsOpen(false);

  return (
    <DashboardLayout title="Proyecciones">
      <Head>
        <title>Proyecciones</title>
      </Head>
      <Container maxWidth="xl">
        <DataTable
          data={proyecciones}
          isLoading={isLoading}
          columns={columns}
          formatters={formatters}
          showSearch={false}
          showDateFilterOptions={false}
          showDatePicker={false}
          showRefreshButton={true}
          onRefresh={fetchProyecciones}
          dateField="fechaCreacion"
          serverSide={true}
          total={total}
          currentPage={paginaActual}
          onPageChange={(nuevaPagina) => setPaginaActual(nuevaPagina)}
          rowsPerPage={limitePorPagina}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onAdd={handleOpenAdd}
          additionalButtons={[
            {
              label: "Ignorar Productos",
              onClick: handleOpenIgnore,
              icon: <BlockIcon />,
              variant: "contained",
            },
            {
              label: "Gestionar Tags",
              onClick: handleOpenTags,
              icon: <LabelIcon />,
              variant: "contained",
              color: "secondary",
            },
          ]}
        />

        <AgregarProyeccionModal
          open={isAddOpen}
          onClose={handleCloseAdd}
          onCreated={fetchProyecciones}
        />
        <AgregarIgnorarProductosModal open={isIgnoreOpen} onClose={handleCloseIgnore} />
        <GestionarTagsModal
          open={isTagsOpen}
          onClose={handleCloseTags}
          onTagsUpdated={() => {
            console.log("Tags actualizados");
          }}
        />
      </Container>
    </DashboardLayout>
  );
};

export default ProyeccionesCelulandiaPage;
