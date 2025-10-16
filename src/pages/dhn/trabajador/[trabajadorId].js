import { useState, useEffect, useMemo } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import { Container, Box, Typography, CircularProgress, Alert, Stack, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import TableComponent from 'src/components/TableComponent';
import TrabajadorService from 'src/services/dhn/TrabajadorService';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';

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
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

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

      const response = await TrabajadorService.getTrabajoRegistradoByTrabajadorId(trabajadorId, params);
      setTrabajoRegistrado(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error al cargar trabajo registrado:', err);
      setError('Error al cargar los datos del trabajador');
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo(() => buildTrabajoRegistradoColumns(), []);

  const formatters = {
    fecha: (value) => formatearFecha(value),
  };


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
    <DashboardLayout title={`Trabajador - ${trabajadorId}`}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Trabajo Registrado
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {trabajadorId}
            </Typography>
          </Box>

          {/* Filtros */}
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
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={estadoFiltro}
                  label="Estado"
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="ok">OK</MenuItem>
                  <MenuItem value="incompleto">Incompleto</MenuItem>
                  <MenuItem value="advertencia">Advertencia</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </LocalizationProvider>

          {/* Error */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Resumen */}
          {!isLoading && trabajoRegistrado.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip 
                label={`Total registros: ${trabajoRegistrado.length}`} 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={`Horas totales: ${trabajoRegistrado.reduce((sum, r) => sum + (r.horasTrabajadasExcel?.total || 0), 0).toFixed(2)}h`}
                color="success"
                variant="outlined"
              />
            </Box>
          )}

          {/* Tabla */}
          <TableComponent
            data={trabajoRegistrado}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
          />
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default TrabajadorPage;