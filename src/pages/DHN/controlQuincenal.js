import { useState, useMemo, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Box, Alert, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TableComponent from 'src/components/TableComponent';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';

const getQuincenaRange = (date, quincena) => {
  const startOfMonth = dayjs(date).startOf('month');
  const endOfMonth = dayjs(date).endOf('month');
  if (quincena === 'primera') {
    const from = startOfMonth.startOf('day');
    const to = startOfMonth.date(15).endOf('day');
    return { from: from.toDate(), to: to.toDate() };
  }
  const from = startOfMonth.date(16).startOf('day');
  const to = endOfMonth.endOf('day');
  return { from: from.toDate(), to: to.toDate() };
};

const ControlQuincenalPage = () => {
  const router = useRouter();
  const [mesAnio, setMesAnio] = useState(() => dayjs());
  const [quincena, setQuincena] = useState(() => (dayjs().date() <= 15 ? 'primera' : 'segunda'));
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);

  const columns = useMemo(() => buildTrabajoRegistradoColumns(null, true), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { from, to } = getQuincenaRange(mesAnio, quincena);
      const params = { limit: 500 };
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;
      const res = await TrabajoRegistradoService.getByRange(from, to, params);
      setData(res.data || []);
      setStats(res.stats || { total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
      setError(null);
    } catch (e) {
      setError('Error al cargar control quincenal');
    } finally {
      setIsLoading(false);
    }
  }, [mesAnio, quincena, estadoFiltro]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  return (
    <DashboardLayout title="Control Quincenal">
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Mes / Año"
                views={["year", "month"]}
                value={mesAnio}
                onChange={(nv) => setMesAnio(nv || dayjs())}
                format="MM/YYYY"
                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
              />

              <ToggleButtonGroup
                size="small"
                exclusive
                value={quincena}
                onChange={(e, val) => { if (val) setQuincena(val); }}
                color="primary"
              >
                <ToggleButton value="primera">1ra Quincena</ToggleButton>
                <ToggleButton value="segunda">2da Quincena</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </LocalizationProvider>

          <FiltroTrabajoDiario stats={stats} />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableComponent
            data={data}
            columns={columns}
            isLoading={isLoading}
          />
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default ControlQuincenalPage;


