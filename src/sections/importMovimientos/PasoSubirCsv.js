import React from 'react';
import { Box, Typography } from '@mui/material';
import ImportPlanillaStep from 'src/components/importMovimientos/ImportPlanillaStep';

const PasoSubirCsv = (props) => (
  <Box>
    <Typography variant="h5" gutterBottom>
      Paso 1: Subir archivo CSV o Excel
    </Typography>
    <Typography variant="body1" color="text.secondary" paragraph>
      Seleccioná uno o más archivos con los movimientos. Deben incluir las columnas necesarias para cada movimiento.
    </Typography>
    <ImportPlanillaStep
      {...props}
      title={null}
      subtitle={null}
    />
  </Box>
);

export default PasoSubirCsv;
