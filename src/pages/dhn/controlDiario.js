import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import TableComponent from 'src/components/TableComponent';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import HistorialModal from 'src/components/dhn/HistorialModal';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';

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
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsTrabajo, setLogsTrabajo] = useState(null);

  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);

  const handleEdit = useCallback((trabajoDiario) => {
    setTrabajoDiarioSeleccionado(trabajoDiario);
    setEditarModalOpen(true);
  }, []);

  const handleOpenLogs = useCallback((item) => {
    if (!item?._id) return;
    setLogsTrabajo(item);
    setLogsModalOpen(true);
  }, []);

  const handleCloseLogs = useCallback(() => {
    setLogsModalOpen(false);
    setLogsTrabajo(null);
  }, []);

  const handleSaveEdit = async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error('Error al recargar trabajo registrado:', error);
    }
  };

  const renderAcciones = useCallback(
    (item) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Tooltip title="Editar">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
            color="primary"
            aria-label="Editar trabajo diario"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Ver historial">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenLogs(item);
            }}
            color="inherit"
            aria-label="Ver historial de cambios"
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    ),
    [handleEdit, handleOpenLogs]
  );

  const columns = useMemo(() => (
    buildTrabajoRegistradoColumns(renderAcciones, true)
      .filter((column) => column.key !== 'totalHoras')
  ), [renderAcciones]);

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

      <HistorialModal
        open={logsModalOpen}
        onClose={handleCloseLogs}
        entity={logsTrabajo}
        title="Historial de cambios"
        entityLabel="Trabajo diario"
        getEntityTitle={(t) => {
          const trabajador = t?.trabajadorId || {};
          const apellido = (trabajador?.apellido || '').toString();
          const nombre = (trabajador?.nombre || '').toString();
          const full = `${apellido} ${nombre}`.trim();
          return full || t?._id || '-';
        }}
        getEntitySubtitle={(t) => {
          const fechaFmt = t?.fecha ? formatDateDDMMYYYY(t.fecha) : '-';
          const estado = (t?.estado || '-').toString();
          const dni = t?.trabajadorId?.dni ? ` • DNI: ${t.trabajadorId.dni}` : '';
          return `Fecha: ${fechaFmt} • Estado: ${estado}${dni}`;
        }}
      />
    </DashboardLayout>
  );
};

export default ControlDiarioPage;