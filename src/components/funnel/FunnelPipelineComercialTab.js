import { useState, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import FunnelFilters from './FunnelFilters';
import FunnelBarChart from './FunnelBarChart';
import FunnelTerminalStates from './FunnelTerminalStates';
import funnelService from '../../services/funnelService';

export default function FunnelPipelineComercialTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApply = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const result = await funnelService.getPipelineComercial({
        desde: params.desde,
        hasta: params.hasta,
        segmento: params.segmento,
      });
      setData(result);
    } catch (err) {
      console.error('Error cargando funnel pipeline comercial:', err);
      setError(err?.response?.data?.message || err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Box>
      <FunnelFilters onApply={handleApply} loading={loading} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cohorte: {data.cohorte.totalContactos} contactos creados entre{' '}
            {data.cohorte.desde} y {data.cohorte.hasta} — Segmento: {data.cohorte.segmento}
          </Typography>

          {data.cohorte.totalContactos === 0 ? (
            <Alert severity="info">
              No se encontraron contactos SDR en el rango y segmento seleccionados.
            </Alert>
          ) : (
            <>
              <FunnelBarChart pasos={data.pasos} titulo="Pipeline Comercial" />
              <FunnelTerminalStates
                estadosTerminales={data.estadosTerminales}
                totalCohorte={data.cohorte.totalContactos}
              />
            </>
          )}
        </Box>
      )}

      {!loading && !data && !error && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Seleccioná un rango de fechas y hacé clic en &quot;Consultar&quot; para ver el pipeline.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
