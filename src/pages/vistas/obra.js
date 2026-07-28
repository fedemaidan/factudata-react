// Vista única de obra (TAR-579): dashboard presupuestado vs gastado vs cobrado.
// Un pantallazo por obra —o todas juntas— cruzando cajas, cobros y presupuestos.
// Todo dolarizado. Reusa los datasets de reportes vía useVistaObraData.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box, Container, Stack, Typography, Chip, MenuItem, TextField,
  LinearProgress, Alert, Link as MuiLink,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIosNew';
import { useQueryClient } from '@tanstack/react-query';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useVistaObraData } from 'src/hooks/useVistaObraData';
import { buildObraRows, buildTotales, buildDetalle } from 'src/utils/vistaObra/aggregate';
import KpiCards from 'src/sections/vistaObra/KpiCards';
import ObrasTable from 'src/sections/vistaObra/ObrasTable';
import ObraDetalle from 'src/sections/vistaObra/ObraDetalle';
import ProyectoConfigDrawer from 'src/components/cajaProyecto/ProyectoConfigDrawer';

function VistaUnicaObra() {
  const { user } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { empresa, proyectos, movimientos, presupuestos, planes, dolar, loading, error } = useVistaObraData(user);
  const [configOpen, setConfigOpen] = useState(false);

  const selectedId = router.query.obra || '';

  const rows = useMemo(
    () => buildObraRows({ proyectos, movimientos, presupuestos, planes, dolar }),
    [proyectos, movimientos, presupuestos, planes, dolar],
  );

  const totales = useMemo(() => {
    const scoped = selectedId ? rows.filter((r) => r.proyectoId === selectedId) : rows;
    return buildTotales(scoped);
  }, [rows, selectedId]);

  const detalle = useMemo(() => {
    if (!selectedId) return null;
    const proyecto = proyectos.find((p) => p.id === selectedId);
    return buildDetalle({ proyecto, movimientos, presupuestos, planes, dolar });
  }, [selectedId, proyectos, movimientos, presupuestos, planes, dolar]);

  const selectObra = (id) => {
    const query = { ...router.query };
    if (id) query.obra = id; else delete query.obra;
    router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const selectedRow = selectedId ? rows.find((r) => r.proyectoId === selectedId) : null;
  const selectedProyecto = selectedId ? proyectos.find((p) => p.id === selectedId) : null;

  return (
    <DashboardLayout title="Vista de obra">
      <Head><title>Vista de obra · Sorby</title></Head>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header: selector de obra + moneda */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {selectedId && (
              <MuiLink component="button" underline="hover" color="text.secondary"
                onClick={() => selectObra('')}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <ArrowBackIcon sx={{ fontSize: 14 }} /> Todas
              </MuiLink>
            )}
            <TextField
              select
              size="small"
              label="Vista de obra"
              value={selectedId}
              onChange={(e) => selectObra(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Todas las obras</MenuItem>
              {proyectos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </TextField>
            {selectedRow?.modoCobro && (
              <Chip size="small" variant="outlined" label={selectedRow.modoCobro} />
            )}
          </Stack>
          <Chip size="small" color="default" variant="filled" label="Valores en USD" />
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>No se pudieron cargar todos los datos de la obra.</Alert>}

        {/* Las 4 tarjetas: siempre arriba, filtradas o de cartera */}
        <Box mb={3}>
          <KpiCards totales={totales} onEditM2={selectedProyecto ? () => setConfigOpen(true) : undefined} />
        </Box>

        {/* Abajo: tabla de obras (Todas) o detalle (una obra) */}
        {selectedId && detalle ? (
          <ObraDetalle detalle={detalle} />
        ) : (
          <ObrasTable rows={rows} onSelect={selectObra} />
        )}

        {!loading && rows.length === 0 && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Todavía no hay obras con movimientos, presupuestos o planes de cobro cargados.
          </Typography>
        )}
      </Container>

      {selectedProyecto && (
        <ProyectoConfigDrawer
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          proyecto={selectedProyecto}
          empresa={empresa}
          initialTab={2}
          onProyectoUpdated={() => {
            // Refrescar proyectos para recalcular m²/análisis con los nuevos valores.
            queryClient.invalidateQueries({ queryKey: ['vistaObra', 'proyectos'] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

export default VistaUnicaObra;
