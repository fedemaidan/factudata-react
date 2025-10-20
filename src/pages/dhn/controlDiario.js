import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Typography, Alert, Box, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import TableComponent from 'src/components/TableComponent';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const ControlDiarioPage = () => {
  const [fecha, setFecha] = useState(() => dayjs());
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [trabajoDiarioSeleccionado, setTrabajoDiarioSeleccionado] = useState(null);

  const handleEdit = (trabajoDiario) => {
    setTrabajoDiarioSeleccionado(trabajoDiario);
    setEditarModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error('Error al recargar trabajo registrado:', error);
    }
  };

  const renderEditButton = (item) => (
    <IconButton 
      size="small" 
      onClick={(e) => {
        e.stopPropagation();
        handleEdit(item);
      }}
      color="primary"
    >
      <EditIcon fontSize="small" />
    </IconButton>
  );

  const columns = useMemo(() => buildTrabajoRegistradoColumns(renderEditButton, true), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 500 };
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;
      const res = await TrabajoRegistradoService.getByDay(fecha.toDate(), params);
      setData(res.data || []);
      setError(null);
    } catch (e) {
      setError('Error al cargar control diario');
    } finally {
      setIsLoading(false);
    }
  }, [fecha, estadoFiltro]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatters = useMemo(() => ({
    fecha: (value) => {
      if (!value) return '-';
      const d = new Date(value);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }), []);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return data.filter(item => {
      if (!item.trabajadorId) return false;
      
      const apellido = item.trabajadorId.apellido?.toLowerCase() || '';
      const nombre = item.trabajadorId.nombre?.toLowerCase() || '';
      const dni = item.trabajadorId.dni || '';
      const nombreCompleto = `${apellido} ${nombre}`;
      
      return (
        apellido.includes(searchLower) ||
        nombre.includes(searchLower) ||
        nombreCompleto.includes(searchLower) ||
        dni.includes(searchLower)
      );
    });
  }, [data, searchTerm]);

  return (
    <DashboardLayout title="Control Diario">
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Día"
                value={fecha}
                onChange={(nv) => setFecha(nv || dayjs())}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Estado</InputLabel>
                <Select value={estadoFiltro} label="Estado" onChange={(e) => setEstadoFiltro(e.target.value)}>
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="ok">OK</MenuItem>
                  <MenuItem value="incompleto">Incompleto</MenuItem>
                  <MenuItem value="advertencia">Advertencia</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </LocalizationProvider>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableComponent
            data={filteredData}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
          />
        </Stack>
      </Container>

      <EditarTrabajoDiarioModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        onSave={handleSaveEdit}
        trabajoDiario={trabajoDiarioSeleccionado}
      />
    </DashboardLayout>
  );
};

export default ControlDiarioPage;