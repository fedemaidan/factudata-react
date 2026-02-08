import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem, Paper, Collapse, InputAdornment } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { MensajesProgramadosTable } from 'src/sections/mensajes-programados/mensajes-programados-table';
import { MensajeProgramadoDialog } from 'src/components/MensajeProgramadoDialog';
import mensajesProgramadosService from 'src/services/mensajesProgramadosService';
import PlusIcon from '@heroicons/react/24/solid/PlusIcon';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { SvgIcon } from '@mui/material';
import { useAuthContext } from 'src/contexts/auth-context';

const Page = () => {
  const { user } = useAuthContext();
  const [mensajes, setMensajes] = useState([]);
  const [totalMensajes, setTotalMensajes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMensaje, setCurrentMensaje] = useState(null);
  
  // Filtros
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTelefono, setFilterTelefono] = useState('');
  
  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchMensajes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await mensajesProgramadosService.getMensajes({
        page: page + 1,
        limit: rowsPerPage,
        estado: filterEstado || undefined,
        telefono: filterTelefono || undefined,
        fechaDesde: filterFechaDesde || undefined,
        fechaHasta: filterFechaHasta || undefined
      });
      setMensajes(data.items || []);
      setTotalMensajes(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, filterEstado, filterTelefono, filterFechaDesde, filterFechaHasta]);

  useEffect(() => {
    fetchMensajes();
  }, [fetchMensajes]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setFilterEstado('');
    setFilterTelefono('');
    setPage(0);
  };

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setPage(0);
  }, [filterFechaDesde, filterFechaHasta, filterEstado, filterTelefono]);

  const handleCreate = () => {
    setCurrentMensaje(null);
    setDialogOpen(true);
  };

  const handleEdit = (mensaje) => {
    setCurrentMensaje(mensaje);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este mensaje programado?')) {
      try {
        await mensajesProgramadosService.deleteMensaje(id);
        fetchMensajes();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (data) => {
    try {
      if (currentMensaje) {
        await mensajesProgramadosService.updateMensaje(currentMensaje._id, data);
      } else {
        await mensajesProgramadosService.createMensaje(data);
      }
      setDialogOpen(false);
      fetchMensajes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Head>
        <title>Mensajes Programados</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={4}
            >
              <Stack spacing={1}>
                <Typography variant="h4">
                  Mensajes Programados
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => setFiltersVisible(!filtersVisible)}
                >
                  {filtersVisible ? 'Ocultar Filtros' : 'Filtros'}
                </Button>
                <Button
                  startIcon={(
                    <SvgIcon fontSize="small">
                      <PlusIcon />
                    </SvgIcon>
                  )}
                  variant="contained"
                  onClick={handleCreate}
                >
                  Nuevo Mensaje
                </Button>
              </Stack>
            </Stack>
            
            {/* Filtros */}
            <Collapse in={filtersVisible}>
              <Paper sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
                  <TextField
                    label="Fecha desde"
                    type="date"
                    size="small"
                    value={filterFechaDesde}
                    onChange={(e) => setFilterFechaDesde(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="Fecha hasta"
                    type="date"
                    size="small"
                    value={filterFechaHasta}
                    onChange={(e) => setFilterFechaHasta(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="Teléfono"
                    size="small"
                    value={filterTelefono}
                    onChange={(e) => setFilterTelefono(e.target.value)}
                    placeholder="Buscar por teléfono..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 180 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={filterEstado}
                      onChange={(e) => setFilterEstado(e.target.value)}
                      label="Estado"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="pendiente">Pendiente</MenuItem>
                      <MenuItem value="enviado">Enviado</MenuItem>
                      <MenuItem value="cancelado">Cancelado</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                    size="small"
                  >
                    Limpiar
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {mensajes.length} de {totalMensajes} mensajes
                  </Typography>
                </Stack>
              </Paper>
            </Collapse>
            
            <MensajesProgramadosTable
              items={mensajes}
              onEdit={handleEdit}
              onDelete={handleDelete}
              count={totalMensajes}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </Stack>
        </Container>
      </Box>
      <MensajeProgramadoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        mensaje={currentMensaje}
        currentUser={user}
      />
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
