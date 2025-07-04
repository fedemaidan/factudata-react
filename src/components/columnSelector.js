import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Button
} from '@mui/material';

const clasificarColumnas = (columnas) => {
  return {
    principales: Object.entries(columnas).filter(([key]) =>
      ['codigo_operacion', 'fecha_factura', 'proyectoNombre', 'categoria', 'subtotal', 'total'].includes(key)
    ),
    equivalencias: Object.entries(columnas).filter(([key]) =>
      key.includes('usd')
    ),
    extras: Object.entries(columnas).filter(([key]) =>
      !['codigo_operacion', 'fecha_factura', 'proyectoNombre', 'categoria', 'subtotal', 'total'].includes(key) &&
      !key.includes('usd')
    ),
  };
};

export const ColumnSelector = ({ open, setOpen, columnasVisibles, setColumnasVisibles, tableHeadArray }) => {
  const [tab, setTab] = useState(0);
  const grupos = clasificarColumnas(columnasVisibles || {});

  const renderSwitches = (grupo) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 1,
        mt: 2,
      }}
    >
      {grupo.map(([key, visible]) => (
        <FormControlLabel
          key={key}
          control={
            <Switch
              checked={visible}
              onChange={() => {
                const updated = { ...columnasVisibles, [key]: !visible };
                setColumnasVisibles(updated);
                localStorage.setItem('columnasVisibles', JSON.stringify(updated));
              }}
            />
          }
          label={tableHeadArray.find(([campo]) => campo === key)?.[1] || key}
        />
      ))}
    </Box>
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Columnas visibles</DialogTitle>

      <Tabs value={tab} onChange={(e, newTab) => setTab(newTab)} centered>
        <Tab label="Principales" />
        <Tab label="Equivalencias" />
        <Tab label="Extras" />
      </Tabs>

      <DialogContent dividers>
        {tab === 0 && renderSwitches(grupos.principales)}
        {tab === 1 && renderSwitches(grupos.equivalencias)}
        {tab === 2 && renderSwitches(grupos.extras)}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
