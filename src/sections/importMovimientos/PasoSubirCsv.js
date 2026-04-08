import React from 'react';
import { Box } from '@mui/material';
import ImportPlanillaStep from 'src/components/importMovimientos/ImportPlanillaStep';

const PasoSubirCsv = (props) => (
  <Box>
    <ImportPlanillaStep {...props} title={null} subtitle={null} />
  </Box>
);

export default PasoSubirCsv;
