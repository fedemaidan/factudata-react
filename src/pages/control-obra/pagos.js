import { Box, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import CarteraNav from 'src/components/controlObra/CarteraNav';

// Cola de pagos a contratistas (mano de obra) de todas las obras.
// El backend de mano de obra / órdenes de pago llega en la Fase 3.
function PagosObraPage() {
  return (
    <DashboardLayout title="Control de Obra — Pagos a obra">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" mb={1}>Control de Obra</Typography>
        <CarteraNav />

        <Card>
          <CardContent>
            <Stack spacing={2} alignItems="center" sx={{ py: 6, textAlign: 'center' }}>
              <ConstructionIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Box>
                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" mb={1}>
                  <Typography variant="h6">Pagos a contratistas</Typography>
                  <Chip size="small" label="Fase 3" color="warning" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                  Acá vas a ver la cola de órdenes de pago a la mano de obra de todas tus obras
                  (el “jueves de pagos” consolidado): certificaciones de avance de cada contratista,
                  retenciones y el egreso correspondiente.
                  Requiere el módulo de mano de obra, que se desarrolla en la Fase&nbsp;3.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}

export default PagosObraPage;
