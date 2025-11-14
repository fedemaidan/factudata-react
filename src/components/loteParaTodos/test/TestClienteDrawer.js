// Componente de prueba para el ClienteResumenDrawer
import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import ClienteResumenDrawer from '../ClienteResumenDrawer';
import { mockClientes } from '../../../data/loteParaTodos/mockClientes';

const TestClienteDrawer = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const openDrawer = (cliente) => {
    setSelectedCliente(cliente);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedCliente(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <h2>Test Cliente Resumen Drawer</h2>
      
      {mockClientes.slice(0, 3).map(cliente => (
        <Button 
          key={cliente.id} 
          variant="contained" 
          onClick={() => openDrawer(cliente)}
          sx={{ mr: 2, mb: 2 }}
        >
          Ver Cliente: {cliente.nombre} {cliente.apellido}
        </Button>
      ))}
      
      <ClienteResumenDrawer 
        cliente={selectedCliente}
        open={drawerOpen}
        onClose={closeDrawer}
      />
    </Box>
  );
};

export default TestClienteDrawer;