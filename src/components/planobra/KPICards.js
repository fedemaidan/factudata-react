import React, { useMemo } from 'react';
import { Box, Card, CardContent, Chip, LinearProgress, Typography } from '@mui/material';
import { avanceObraPct, ejecutadoEtapa, numberFmt, planTotalEtapa, tienePrecioFaltante } from 'src/utils/planobra';

const KPICards = ({ proyectoNombre, etapas, moneda = 'ARS' }) => {
  const { pctObra, planTotalObra, ejecutadoObra, desvioObra, faltanPrecios } = useMemo(() => {
    const plan = etapas.reduce((acc, e) => acc + planTotalEtapa(e.materiales, e.certificados), 0);
    const ejec = etapas.reduce((acc, e) => acc + ejecutadoEtapa(e.materiales, e.certificados), 0);
    const desvio = ejec - plan;
    const pct = avanceObraPct(etapas);
    const hasMissing = etapas.some(e => tienePrecioFaltante(e.materiales || []));
    return { pctObra: pct, planTotalObra: plan, ejecutadoObra: ejec, desvioObra: desvio, faltanPrecios: hasMissing };
  }, [etapas]);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Planificación de Obra {proyectoNombre || '—'}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2, mb: 2 }}>
        <Card><CardContent>
          <Typography variant="overline">Avance de obra</Typography>
          <Typography variant="h5">{pctObra}%</Typography>
          <LinearProgress variant="determinate" value={pctObra} sx={{ mt: 1 }} />
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="overline">Plan total ({moneda})</Typography>
          <Typography variant="h5">{numberFmt(planTotalObra)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="overline">Ejecutado ({moneda})</Typography>
          <Typography variant="h5">{numberFmt(ejecutadoObra)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="overline">Desvío ({moneda})</Typography>
          <Typography variant="h5" color={desvioObra > 0 ? 'error.main' : 'success.main'}>
            {numberFmt(desvioObra)}
          </Typography>
          {faltanPrecios && <Chip size="small" label="⚠ materiales sin precio" sx={{ mt: 1 }} />}
        </CardContent></Card>
      </Box>
    </>
  );
};

export default KPICards;