import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Stack,
  Divider,
  Alert
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { formatCurrencyWithCode } from 'src/utils/formatters';

/**
 * Componente para mostrar información cuando un movimiento fue pagado desde otra caja
 * Muestra los detalles de la transferencia automática y el flujo contable
 */
const PagoEntreCajasInfo = ({ movimiento }) => {
  // Solo mostrar si el movimiento tiene los flags correspondientes
  if (!movimiento?.es_pago_entre_cajas) {
    return null;
  }

  const esEgresoOperativo = movimiento.movimiento_relacionado_tipo === 'egreso_operativo';
  const esTransferencia = movimiento.movimiento_relacionado_tipo === 'transferencia_pago';

  return (
    <Paper sx={{ p: 3, mt: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Chip 
          label="💳 PAGO ENTRE CAJAS" 
          color="warning" 
          variant="filled" 
          sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}
          icon={<AccountBalanceWalletIcon />}
        />
      </Box>

      {esEgresoOperativo && (
        <>
          <Typography variant="h6" gutterBottom color="warning.main" sx={{ mb: 2 }}>
            🏛️ Gasto pagado desde otra caja
          </Typography>
          
          <Box sx={{ mb: 3, bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid #ffcc02' }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: 'warning.main' }}>
              💰 Este gasto: {formatCurrencyWithCode(movimiento.total, movimiento.moneda)} 
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Pagado desde:</strong> {movimiento.caja_pagadora_nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Proyecto del gasto:</strong> {movimiento.proyecto}
            </Typography>
          </Box>

          <Alert 
            severity="info" 
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              💡 ¿Cómo funciona el pago entre cajas?
            </Typography>
            <Typography variant="body2" component="div">
              Este gasto se registró automáticamente junto con:
              <Box component="ol" sx={{ mt: 1, pl: 2, mb: 0 }}>
                <li>
                  <strong>Transferencia</strong> desde <em>{movimiento.caja_pagadora_nombre}</em> hacia <em>{movimiento.proyecto}</em>
                </li>
                <li>
                  <strong>Este egreso operativo</strong> en <em>{movimiento.proyecto}</em>
                </li>
              </Box>
            </Typography>
          </Alert>
        </>
      )}

      {esTransferencia && (
        <>
          <Typography variant="h6" gutterBottom color="warning.main" sx={{ mb: 2 }}>
            🔄 Transferencia para financiar gasto
          </Typography>
          
          <Box sx={{ mb: 3, bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid #ffcc02' }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: 'warning.main' }}>
              💸 Transferencia: {formatCurrencyWithCode(movimiento.total, movimiento.moneda)} 
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>De:</strong> {movimiento.proyecto}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Para:</strong> {movimiento.subcategoria}
            </Typography>
          </Box>

          <Alert 
            severity="info" 
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2">
              Esta transferencia se creó automáticamente para financiar un gasto en otro proyecto.
              Permite mantener la trazabilidad de los fondos entre diferentes cajas/proyectos.
            </Typography>
          </Alert>
        </>
      )}
    </Paper>
  );
};

export default PagoEntreCajasInfo;