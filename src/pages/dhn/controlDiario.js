import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Typography, Alert, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import TableComponent from 'src/components/TableComponent';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import ControlDiarioService from 'src/services/dhn/ControlDiarioService';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const ControlDiarioPage = () => {
  const [fecha, setFecha] = useState(() => dayjs());
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = useMemo(() => buildTrabajoRegistradoColumns(), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 500 };
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;
      const res = await ControlDiarioService.getByDay(fecha.toDate(), params);
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

  return (
    <DashboardLayout title="Control Diario">
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Control Diario
            </Typography>
          </Box>

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
            </Box>
          </LocalizationProvider>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableComponent
            data={data}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
          />
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default ControlDiarioPage;