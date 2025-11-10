import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import TableComponent from 'src/components/TableComponent';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import conciliacionService from 'src/services/dhn/conciliacionService';

const ConciliacionDetallePage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, okAutomatico: 0, incompleto: 0, advertencia: 0, pendiente: 0, error: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await conciliacionService.getConciliacionRows(id, {
        estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
        text: searchTerm?.trim() ? searchTerm.trim() : undefined,
        limit: 1000
      });
      setRows(res.data || []);
      setStats(res.stats || { total: 0, okAutomatico: 0, incompleto: 0, advertencia: 0, pendiente: 0, error: 0 });
      setError(null);
    } catch (e) {
      setError('Error al cargar detalle de conciliación');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, estadoFiltro]);

  // Columnas de detalle
  const columns = useMemo(() => ([
    { key: 'fecha', label: 'Fecha' },
    { key: 'trabajador', label: 'Trabajador' },
    { key: 'dni', label: 'DNI' },
    { key: 'licencia', label: 'Licencia', render: (row) => (row.licencia ? 'Sí' : 'No') },
    { key: 'horasNormales', label: 'Norm' },
    { key: 'horas50', label: '50%' },
    { key: 'horas100', label: '100%' },
    { key: 'horasAltura', label: 'Altura' },
    { key: 'horasHormigon', label: 'Hormigón' },
    { key: 'horasZanjeo', label: 'Zanjeo' },
    { key: 'horasNocturnas', label: 'Noct' },
    { key: 'estado', label: 'Estado' },
    { key: 'observacion', label: 'Observación', sx: { maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
  ]), []);

  const formatters = useMemo(() => ({
    fecha: (value) => {
      if (!value) return '-';
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }), []);

  return (
    <DashboardLayout title="Conciliación - Detalle">
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Buscar"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 240 }}
              InputProps={{
                endAdornment: searchTerm.length > 0 && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchTerm('')}
                      edge="end"
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchData();
              }}
              onBlur={fetchData}
            />
          </Box>

          <FiltroTrabajoDiario stats={stats} />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableComponent
            data={rows}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
          />
        </Stack>
      </Container>
    </DashboardLayout>
  );
};

export default ConciliacionDetallePage;


