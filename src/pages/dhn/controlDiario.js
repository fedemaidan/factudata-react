import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import TableComponent from 'src/components/TableComponent';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';

const ControlDiarioPage = () => {
  const router = useRouter();
  const [fecha, setFecha] = useState(() => dayjs());
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [trabajoDiarioSeleccionado, setTrabajoDiarioSeleccionado] = useState(null);

  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);

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

  const columns = useMemo(() => (
    buildTrabajoRegistradoColumns(renderEditButton, true)
      .filter((column) => column.key !== 'totalHoras')
  ), [renderEditButton]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 500 };
      if (estadoFiltro !== 'todos') {
        params.estado = estadoFiltro;
      }
      const res = await TrabajoRegistradoService.getByDay(fecha.toDate(), params);
      setData(res.data || []);
      setStats(res.stats || { total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
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

  const estadisticas = stats;

  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (estadoFiltro !== 'todos') {
      filtered = filtered.filter(item => {
        switch (estadoFiltro) {
          case 'ok':
            return item.estado === 'ok';
          case 'incompleto':
            return item.estado === 'incompleto';
          case 'advertencia':
            return item.estado === 'advertencia';
          case 'sinParte':
            if (!item.comprobantes || item.comprobantes.length === 0) return true;
            return !item.comprobantes.some(comp => comp.type === 'parte');
          case 'sinHoras':
            if (!item.comprobantes || item.comprobantes.length === 0) return true;
            return !item.comprobantes.some(comp => comp.type === 'horas');
          case 'sinLicencia':
            if (!item.comprobantes || item.comprobantes.length === 0) return true;
            return !item.comprobantes.some(comp => comp.type === 'licencia');
          case 'conLicencia':
            if (!item.comprobantes || item.comprobantes.length === 0) return false;
            return item.comprobantes.some(comp => comp.type === 'licencia');
          default:
            return true;
        }
      });
    }
    
    if (!searchTerm.trim()) return filtered;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return filtered.filter(item => {
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
  }, [data, searchTerm, estadoFiltro]);

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
              <TextField
                label="Buscar"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: 200 }}
                InputProps={{
                  endAdornment: searchTerm.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setSearchTerm('')}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </LocalizationProvider>

          <FiltroTrabajoDiario stats={estadisticas} />

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