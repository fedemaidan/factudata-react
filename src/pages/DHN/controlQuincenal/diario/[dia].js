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

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const fechaParsed = dayjs(fecha);
  if (!fechaParsed.isValid()) return '-';
  return fechaParsed.format('DD-MM-YYYY');
};

const ControlDiaPage = () => {
  const router = useRouter();
  const { dia: diaParam, estado: estadoParam } = router.query;

  // Normalizar (Next puede darte array si hay repetidos)
  const diaFormatoParam = Array.isArray(diaParam) ? diaParam[0] : diaParam;
  const estadoFiltro = useMemo(() => (Array.isArray(estadoParam) ? estadoParam[0] : (estadoParam || 'todos')), [estadoParam]);

  // Convertir dd-mm-yyyy de la URL a YYYY-MM-DD para el backend
  const dia = useMemo(() => {
    if (!diaFormatoParam) return null;
    
    // Primero intentar como DD-MM-YYYY (formato de la URL)
    let fechaParsed = dayjs(diaFormatoParam, 'DD-MM-YYYY', true);
    if (fechaParsed.isValid()) {
      return fechaParsed.format('YYYY-MM-DD');
    }
    
    // Si falla, intentar parsear sin formato específico (por si viene con otro formato)
    fechaParsed = dayjs(diaFormatoParam);
    if (fechaParsed.isValid()) {
      return fechaParsed.format('YYYY-MM-DD');
    }
    
    // Si todo falla, devolver null para evitar errores
    console.error('Formato de fecha inválido:', diaFormatoParam);
    return null;
  }, [diaFormatoParam]);

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, incompleto: 0, advertencia: 0, sinParte: 0, sinHoras: 0, sinLicencia: 0, conLicencia: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = useMemo(() => buildTrabajoRegistradoColumns(null, true), []);

  const formatters = {
    fecha: formatearFecha,
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

  // Usar el formato original (dd-mm-yyyy) para visualización
  const fechaFormateada = useMemo(() => {
    if (!diaFormatoParam) return '';
    // Intentar parsear como dd-mm-yyyy
    const fechaParsed = dayjs(diaFormatoParam, 'DD-MM-YYYY', true);
    if (fechaParsed.isValid()) {
      return fechaParsed.format('DD-MM-YYYY');
    }
    // Si falla, intentar como YYYY-MM-DD y formatear
    const fechaParsedISO = dayjs(diaFormatoParam, 'YYYY-MM-DD', true);
    if (fechaParsedISO.isValid()) {
      return fechaParsedISO.format('DD-MM-YYYY');
    }
    return diaFormatoParam;
  }, [diaFormatoParam]);

  return (
    <DashboardLayout title={`Control Diario - ${fechaFormateada}`}>
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
