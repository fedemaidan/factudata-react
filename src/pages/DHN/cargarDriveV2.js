import { useEffect, useMemo, useState } from "react";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import { Container, Box, Chip, IconButton } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TableComponent from "src/components/TableComponent";
import DhnDriveService from "src/services/dhn/cargarUrlDriveService";

const formatearFechaHora = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusChip = (status) => {
  const map = {
    pending: { color: "default", label: "Pendiente" },
    processing: { color: "warning", label: "Procesando" },
    done: { color: "success", label: "Completado" },
    error: { color: "error", label: "Error" },
  };
  const cfg = map[status] || { color: "default", label: status || "-" };
  return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" />;
};

const CargarDriveV2 = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSyncs();
  }, []);

  const fetchSyncs = async () => {
    setIsLoading(true);
    try {
      const data = await DhnDriveService.getAllSyncs();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "created_at",
        label: "Fecha de creación",
        sortable: true,
        render: (item) => formatearFechaHora(item.created_at),
      },
      {
        key: "updated_at",
        label: "Fecha de actualización",
        sortable: true,
        render: (item) => formatearFechaHora(item.updated_at),
      },
      { key: "tipo", label: "Tipo", sortable: true, render: (item) => item.tipo.toUpperCase() },
      {
        key: "status",
        label: "Estado",
        sortable: true,
        render: (item) => statusChip(item.status),
      },
      {
        key: "observacion",
        label: "Observación",
        sortable: false,
        render: (item) => item.observacion || "-",
        sx: { maxWidth: "320px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      },
      {
        key: "url_drive",
        label: "URL Drive",
        sortable: false,
        render: (item) => (
          <IconButton
            size="small"
            href={item.url_drive || undefined}
            target="_blank"
            rel="noreferrer"
            disabled={!item.url_drive}
            onClick={(e) => e.stopPropagation()}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  return (
    <DashboardLayout title="Cargar Drive - Historial">
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <TableComponent data={items} columns={columns} isLoading={isLoading} />
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default CargarDriveV2;