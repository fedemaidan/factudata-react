import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import { Container, Box, Typography, Alert, Stack, Chip, IconButton } from '@mui/material';
import BackButton from 'src/components/shared/BackButton';
import EditIcon from '@mui/icons-material/Edit';
import TableComponent from 'src/components/TableComponent';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const TrabajadorPage = () => {
  const router = useRouter();
  const { trabajadorId } = router.query;
  const [trabajoRegistrado, setTrabajoRegistrado] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [trabajoDiarioSeleccionado, setTrabajoDiarioSeleccionado] = useState(null);
  const [trabajador, setTrabajador] = useState(null);
  const [stats, setStats] = useState({ total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });

  console.log("trabajoRegistrado", trabajoRegistrado);
  useEffect(() => {
    if (trabajadorId) {
      fetchTrabajoRegistrado();
    }
  }, [trabajadorId, fechaDesde, fechaHasta, estadoFiltro]);

  const fetchTrabajoRegistrado = async () => {
    setIsLoading(true);
    try {
      const params = {
        limit: 200,
        offset: 0,
        };

      // Agregar filtros de fecha si existen
      if (fechaDesde) {
        params.from = fechaDesde.toISOString();
      }
      if (fechaHasta) {
        params.to = fechaHasta.toISOString();
      }

      // Agregar filtro de estado si no es 'todos'
      if (estadoFiltro !== 'todos') {
        params.estado = estadoFiltro;
      }

      const response = await TrabajoRegistradoService.getTrabajoRegistradoByTrabajadorId(trabajadorId, params);
      setTrabajoRegistrado(response.data || []);
      setStats(response.stats || { total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
      
      // Extraer datos del trabajador del primer registro (si existe)
      if (response.data && response.data.length > 0 && response.data[0].trabajadorId) {
        setTrabajador(response.data[0].trabajadorId);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error al cargar trabajo registrado:', err);
      setError('Error al cargar los datos del trabajador');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (trabajoDiario) => {
    setTrabajoDiarioSeleccionado(trabajoDiario);
    setEditarModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await fetchTrabajoRegistrado();
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

  const columns = useMemo(() => buildTrabajoRegistradoColumns(renderEditButton), []);

  const formatters = {
    fecha: (value) => formatearFecha(value),
  };

  const estadisticas = stats;

  const handleVolver = useCallback(() => router.back(), [router]);


  if (!trabajadorId) {
    return (
      <DashboardLayout title="Trabajador">
        <Container maxWidth="xl">
          <Alert severity="warning">ID de trabajador no especificado</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${trabajador ? `${trabajador.apellido}, ${trabajador.nombre}` : trabajadorId}`}
>
      <Container maxWidth="xl">
        <Stack>
          <BackButton onClick={handleVolver} sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <Box>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              {trabajador?.dni && (
                <Typography variant="body2" color="textSecondary">
                  DNI: {trabajador.dni}
                </Typography>
              )}
              {trabajador?.categoria && (
                <Chip 
                  label={`Categoría: ${trabajador.categoria}`} 
                  size="small" 
                  variant="outlined"
                />
              )}
              {trabajador?.active !== undefined && (
                <Chip 
                  label={trabajador.active ? 'Activo' : 'Inactivo'} 
                  size="small" 
                  color={trabajador.active ? 'success' : 'default'}
                />
              )}
            </Stack>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Desde"
                value={fechaDesde}
                onChange={(newValue) => setFechaDesde(newValue)}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { width: 200 }
                  }
                }}
              />
              <DatePicker
                label="Hasta"
                value={fechaHasta}
                onChange={(newValue) => setFechaHasta(newValue)}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { width: 200 }
                  }
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
            data={trabajoRegistrado}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
          />
          </Stack>
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

export default TrabajadorPage;