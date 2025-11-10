import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Container, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack } from "@mui/material";
import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import DataTable from "src/components/celulandia/DataTable";
import conciliacionService from "src/services/dhn/conciliacionService";
import { useRouter } from "next/router";

const ConciliacionPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sheetLink, setSheetLink] = useState("");

  const fetchConciliaciones = async () => {
    setIsLoading(true);
    try {
      const lista = await conciliacionService.getConciliaciones();
      setItems(lista);
    } catch (e) {
      console.error("Error cargando conciliaciones", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConciliaciones();
  }, []);

  const handleRowClick = (item) => {
    if (!item?._id) return;
    router.push(`/dhn/conciliacion/${item._id}`);
  };

  const columns = useMemo(() => ([
    { key: "seleccionar", label: "", sortable: false, onRowClick: handleRowClick },
    { key: "periodo", label: "Periodo (YYYY-MM)", sortable: true },
    { key: "procesados", label: "Procesados", sortable: true, render: (row) => row?.stats?.procesados ?? 0 },
    { key: "okAutomatico", label: "OK Automático", sortable: true, render: (row) => row?.stats?.okAutomatico ?? 0 },
    { key: "advertencia", label: "Advertencias", sortable: true, render: (row) => row?.stats?.advertencia ?? 0 },
    { key: "created_at", label: "Creada", sortable: true, render: (row) => {
      const d = row?.created_at ? new Date(row.created_at) : null;
      return d ? d.toLocaleString() : "-";
    }},
  ]), []);

  const handleOpenAdd = () => {
    setSheetLink("");
    setAddOpen(true);
  };

  const handleCloseAdd = () => {
    setAddOpen(false);
    setSheetLink("");
  };

  const handleCreate = async () => {
    if (!sheetLink?.trim()) return;
    setIsLoading(true);
    try {
      await conciliacionService.crearConciliacion(sheetLink.trim());
      await fetchConciliaciones();
      handleCloseAdd();
    } catch (e) {
      console.error("Error creando conciliación", e);
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Conciliación DHN">
      <Head>Conciliación DHN</Head>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="flex-start" mb={1}>
          <Button variant="contained" color="primary" onClick={handleOpenAdd}>
            Agregar conciliación
          </Button>
        </Stack>

        <DataTable
          data={items}
          isLoading={isLoading}
          columns={columns}
          showSearch={false}
          showDateFilterOptions={false}
          showDatePicker={false}
          serverSide={false}
          total={items.length}
          currentPage={1}
          rowsPerPage={items.length || 50}
          sortField="periodo"
          sortDirection="desc"
          onSortChange={() => {}}
        />
      </Container>

      <Dialog open={addOpen} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar conciliación</DialogTitle>
        <DialogContent>
          <TextField
            label="Link de Google Sheet"
            fullWidth
            value={sheetLink}
            onChange={(e) => setSheetLink(e.target.value)}
            margin="dense"
            placeholder="Pega el enlace del Google Sheet"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={isLoading}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ConciliacionPage;


