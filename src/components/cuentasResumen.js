import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { formatCurrency, toDateFromFirestore } from 'src/utils/formatters';

export const CuentasResumen = ({ cuentas }) => {
    const hoy = new Date();

    const sumar = (arr) => arr.reduce((sum, q) => sum + (q.monto_nominal || 0), 0);

    const cuotasPorMes = (cuentas, tipo, mesOffset) => {
    const hoy = new Date();
    return cuentas
        .flatMap(c => (c.tipo === tipo ? c.cuotas || [] : []))
        .filter(q => {
        const v = toDateFromFirestore(q.fecha_vencimiento);
        if (!v) return false;

        const objetivo = new Date(hoy);
        objetivo.setDate(1); // para evitar errores por desbordes
        objetivo.setMonth(objetivo.getMonth() + mesOffset);

        return (
            v.getMonth() === objetivo.getMonth() &&
            v.getFullYear() === objetivo.getFullYear()
        );
        });
    };

      

return (
<Paper sx={{ p: 2, mt: 1 }}>
    <Typography variant="h6" gutterBottom>Resumen de cuentas</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <Box>
        <Typography variant="subtitle2">💰 Cuentas a cobrar total</Typography>
        <Typography>{formatCurrency(
            cuentas.filter(c => c.tipo === 'a_cobrar').reduce((sum, c) => sum + (c.monto_total || 0), 0)
            )}
        </Typography>
    </Box>
<Box>
    <Typography variant="subtitle2">💸 Cuentas a pagar total</Typography>
        <Typography>{formatCurrency(
            cuentas.filter(c => c.tipo === 'a_pagar').reduce((sum, c) => sum + (c.monto_total || 0), 0)
        )}</Typography>
    </Box>
<Box>
    <Typography variant="subtitle2">📅 A cobrar este mes</Typography>
    <Typography>{formatCurrency(sumar(cuotasPorMes(cuentas, 'a_cobrar', 0)))}</Typography>
</Box>
<Box>
    <Typography variant="subtitle2">📅 A pagar este mes</Typography>
    <Typography>{formatCurrency(sumar(cuotasPorMes(cuentas, 'a_pagar', 0)))}</Typography>
</Box>
<Box>
<Typography variant="subtitle2">📆 A cobrar próximo mes</Typography>
<Typography>{formatCurrency(sumar(cuotasPorMes(cuentas, 'a_cobrar', 1)))}</Typography>
</Box>
<Box>
<Typography variant="subtitle2">📆 A pagar próximo mes</Typography>
<Typography>{formatCurrency(sumar(cuotasPorMes(cuentas, 'a_pagar', 1)))}</Typography>
</Box>
</Box>
</Paper>
);
};

