import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, IconButton, Tooltip } from '@mui/material';
import BackButton from 'src/components/shared/BackButton';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import TableComponent from 'src/components/TableComponent';
import HistoryIcon from '@mui/icons-material/History';
import HistorialModal from 'src/components/dhn/HistorialModal';


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

  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsTrabajo, setLogsTrabajo] = useState(null);

  const handleOpenLogs = useCallback((item) => {
    if (!item?._id) return;
    setLogsTrabajo(item);
    setLogsModalOpen(true);
  }, []);

  const handleCloseLogs = useCallback(() => {
    setLogsModalOpen(false);
    setLogsTrabajo(null);
  }, []);

  const renderAcciones = useCallback(
    (item) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
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
    [handleOpenLogs]
  );

  const columns = useMemo(
    () => buildTrabajoRegistradoColumns(renderAcciones, true),
    [renderAcciones]
  );

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
          const fecha = t?.fecha ? formatDateDDMMYYYY(t.fecha) : '-';
          const estado = (t?.estado || '-').toString();
          const dni = t?.trabajadorId?.dni ? ` • DNI: ${t.trabajadorId.dni}` : '';
          return `Fecha: ${fecha} • Estado: ${estado}${dni}`;
        }}
      />
    </DashboardLayout>
  );
};

export default ControlDiaPage;
