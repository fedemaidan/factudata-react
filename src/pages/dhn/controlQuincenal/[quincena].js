import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert } from '@mui/material';
import DataTable from 'src/components/celulandia/DataTable';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import BackButton from 'src/components/shared/BackButton';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';
import useDHNDocTypePermissions from 'src/hooks/dhn/useDHNDocTypePermissions';

const ControlQuincenalDiasPage = () => {
  const router = useRouter();
  const { quincena } = router.query;
  const { allowedTypes, hasAny, loading: permsLoading } = useDHNDocTypePermissions();
  const showParte = allowedTypes.includes('parte');
  const showHoras = allowedTypes.includes('horas');
  const showLicencia = allowedTypes.includes('licencia');

  const quincenaParsed = quincena ? quincena.split('-').reverse().join('-') : '';

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('dia');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const columns = useMemo(() => [
    { key: 'seleccionar', label: '', sx: { display: 'none' }, onRowClick: (row) => {
      const fecha = row.fecha ? formatDateDDMMYYYY(row.fecha) : null;
      if (fecha) {
        router.push(`/dhn/controlQuincenal/diario/${fecha}`);
      }
    }},
    { key: 'dia', label: 'Día', sortable: true },
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'ok', label: 'OK', sortable: true },
    { key: 'incompleto', label: 'Incompleto', sortable: true },
    { key: 'advertencia', label: 'Advertencia', sortable: true },
    ...(showLicencia ? [{ key: 'conLicencia', label: 'Con Licencia', sortable: true }] : []),
    ...(showHoras ? [{ key: 'sinHoras', label: 'Sin Horas', sortable: true }] : []),
    ...(showParte ? [{ key: 'sinParte', label: 'Sin Parte', sortable: true }] : []),
  ], [router, showLicencia, showHoras, showParte]);

  const fetchData = useCallback(async () => {
    if (!router.isReady || !quincena) return;

    setIsLoading(true);
    try {
      const res = await TrabajoRegistradoService.getStatsByQuincena(quincena);
      setData(Array.isArray(res) ? res : []);
      setError(null);
    } catch (e) {
      console.error("error", e);
      setError('Error al cargar estadísticas por día');
    } finally {
      setIsLoading(false);
    }
  }, [router.isReady, quincena]);

  useEffect(() => {
    if (permsLoading || !hasAny) return;
    fetchData();
  }, [fetchData, permsLoading, hasAny]);

  const handleVolver = useCallback(() => router.back(), [router]);

  const handleSortChange = useCallback((field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const formatters = useMemo(() => ({
    fecha: (value) => formatDateDDMMYYYY(value)
  }), []);

  if (!permsLoading && !hasAny) {
    return (
      <DashboardLayout title={`Control Días - Quincena ${quincenaParsed || ''}`}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <BackButton onClick={handleVolver} />
            <Alert severity="warning">
              No tenés permisos para ver ningún tipo de documento (partes, licencias u horas). Contactá al administrador.
            </Alert>
          </Stack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Control Días - Quincena ${quincenaParsed || ''}`}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <BackButton onClick={handleVolver} />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <DataTable
            data={data}
            columns={columns}
            isLoading={isLoading}
            showSearch={false}
            showDateFilterOptions={false}
            showDatePicker={false}
            serverSide={false}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            dateField="fecha"
            formatters={formatters}
          />
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default ControlQuincenalDiasPage;

