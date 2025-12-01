import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert } from '@mui/material';
import DataTable from 'src/components/celulandia/DataTable';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';

const ControlQuincenalPage = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('quincena');
  const [sortDirection, setSortDirection] = useState('desc');
  
  const columns = useMemo(() => [
    { key: 'seleccionar', label: '', sx: { display: 'none' }, onRowClick: (row) => {
      router.push(`${router.pathname}/${row.quincena}`);
    }},
    { key: 'quincena', label: 'Quincena', sortable: true,  },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'ok', label: 'OK', sortable: true },
    { key: 'incompleto', label: 'Incompleto', sortable: true },
    { key: 'advertencia', label: 'Advertencia', sortable: true },
    { key: 'conLicencia', label: 'Con Licencia', sortable: true },
    { key: 'sinHoras', label: 'Sin Horas', sortable: true },
    { key: 'sinParte', label: 'Sin Parte', sortable: true },
  ], [router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await TrabajoRegistradoService.getQuincenas();
      setData(Array.isArray(res) ? res : (res?.data ?? []));
      setError(null);
    } catch (e) {
      console.error("error", e);
      setError('Error al cargar quincenas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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


  return (
    <DashboardLayout title="Control Quincenal">
      <Container maxWidth="xl">
        <Stack spacing={3}>
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
          />
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default ControlQuincenalPage;


