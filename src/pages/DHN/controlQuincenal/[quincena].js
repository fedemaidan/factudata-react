import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert } from '@mui/material';
import TableComponent from 'src/components/TableComponent';
import BackButton from 'src/components/shared/BackButton';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import dayjs from 'dayjs';

// --- FUNCION PURA: NO hooks adentro ---
const parseQuincena = (qStr) => {
  if (!qStr || typeof qStr !== 'string') throw new Error('quincena inválida');
  const [year, month, q] = qStr.split('-'); // ej: "2025-09-1Q"
  if (!year || !month || !q) throw new Error('Formato de quincena esperado: YYYY-MM-1Q|2Q');

  const date = dayjs(`${year}-${month}-01`);
  const isFirstQuincena = q === '1Q';

  const from = isFirstQuincena
    ? date.startOf('month').startOf('day')
    : date.date(16).startOf('day');

  const to = isFirstQuincena
    ? date.date(15).endOf('day')
    : date.endOf('month').endOf('day');

  return { from: from.toDate(), to: to.toDate() };
};

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  return dayjs(fecha).format('DD-MM-YYYY');
};

const ControlQuincenaPage = () => {
  const router = useRouter();
  const { quincena: quincenaParam, estado: estadoParam } = router.query;

  // Normalizar (Next puede darte array si hay repetidos)
  const quincena = Array.isArray(quincenaParam) ? quincenaParam[0] : quincenaParam;
  const estadoFiltro = useMemo(() => (Array.isArray(estadoParam) ? estadoParam[0] : (estadoParam || 'todos')), [estadoParam]);

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = useMemo(() => buildTrabajoRegistradoColumns(null, true), []);

  const formatters = {
    fecha: formatearFecha,
  };

  const fetchData = useCallback(async () => {
    if (!router.isReady || !quincena) return;

    setIsLoading(true);
    try {
      const { from, to } = parseQuincena(quincena);
      const params = { limit: 500 };
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;

      const res = await TrabajoRegistradoService.getByRange(from, to, params);
      setData(res.data || []);
      setStats(res.stats || { total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Error al cargar control quincenal');
    } finally {
      setIsLoading(false);
    }
  }, [router.isReady, quincena, estadoFiltro]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVolver = useCallback(() => router.back(), [router]);

  return (
    <DashboardLayout title={`Control Quincena ${quincena || ''}`}>
      <Container maxWidth="xl">
        <Stack>
          <BackButton onClick={handleVolver} sx={{ mb: 3 }} />
          
          <Stack spacing={3}>
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
            formatters={formatters}
          />
          </Stack>
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default ControlQuincenaPage;
