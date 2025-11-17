import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert } from '@mui/material';
import BackButton from 'src/components/shared/BackButton';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import TableComponent from 'src/components/TableComponent';


const ControlDiaPage = () => {
  const router = useRouter();
  const { dia: diaParam, estado: estadoParam } = router.query;

  const diaFormatoParam = Array.isArray(diaParam) ? diaParam[0] : diaParam;
  const estadoFiltro = Array.isArray(estadoParam) ? estadoParam[0] : (estadoParam || 'todos');  
  const dia = formatDateDDMMYYYY(diaFormatoParam);

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = useMemo(() => buildTrabajoRegistradoColumns(null, true), []);

  const formatters = {
    fecha: formatDateDDMMYYYY,
  };

  const fetchData = useCallback(async () => {
    if (!router.isReady || !dia) {
      if (!dia && diaFormatoParam) {
        setError('Formato de fecha inválido. Use el formato DD-MM-YYYY');
      }
      return;
    }

    setIsLoading(true);
    try {
      const params = { limit: 500 };
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;

      const res = await TrabajoRegistradoService.getByDay(dia, params);
      setData(res.data || []);
      setStats(res.stats || { total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Error al cargar control diario');
    } finally {
      setIsLoading(false);
    }
  }, [router.isReady, dia, estadoFiltro, diaFormatoParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVolver = useCallback(() => router.back(), [router]);

  return (
    <DashboardLayout title={`Control Diario - ${diaParam}`}>
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

export default ControlDiaPage;
