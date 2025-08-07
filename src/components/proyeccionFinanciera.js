import React, { useState, useMemo, useEffect } from 'react';
import {
  Paper, Typography, Box, Select, MenuItem, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress
} from '@mui/material';
import { formatCurrency } from 'src/utils/formatters';
import ConversorMonedaService from 'src/services/conversorMonedasService';
import { toDateFromFirestore } from 'src/utils/formatters';

const MONEDAS = ['ARS', 'USD', 'CAC'];

export const ProyeccionFinanciera = ({ cuotas }) => {
  const [modo, setModo] = useState('mensual'); // semanal o mensual
  const [monedaBase, setMonedaBase] = useState('original'); // original, ARS, USD
  const [loading, setLoading] = useState(false);
  const [cuotasConvertidas, setCuotasConvertidas] = useState([]);

  useEffect(() => {
    if (monedaBase === 'original') {
      setCuotasConvertidas(cuotas);
      return;
    }

    const convertirCuotas = async () => {
      setLoading(true);
      try {
        const convertidas = await Promise.all(
          cuotas.map(async (c) => {
            const fecha = toDateFromFirestore(c.fecha_vencimiento);
            const moneda = normalizarMoneda(c.moneda_nominal);
            const res = await ConversorMonedaService.convertirMoneda({
              monto: c.monto_nominal,
              moneda_origen: moneda,
              moneda_destino: monedaBase,
              fecha: new Date().toISOString().split('T')[0],
              tipo_dolar: c.tipo_dolar || 'BLUE_VENTA'
            });
            console.log(`Convertiendo cuota ${c.id} de ${moneda} a ${monedaBase}:`, res);
            return { ...c, monto_convertido: res.monto_convertido, moneda_convertida: monedaBase };
          })
        );
        setCuotasConvertidas(convertidas);
      } catch (e) {
        console.error('Error en conversión de proyección', e);
      } finally {
        setLoading(false);
      }
    };

    convertirCuotas();
  }, [cuotas, monedaBase]);

  const agrupadas = useMemo(() => {
    const agrupadasPorPeriodo = {};

    cuotasConvertidas.forEach((c) => {
      const fecha = toDateFromFirestore(c.fecha_vencimiento);
      const year = fecha.getFullYear();
      const month = fecha.getMonth() + 1;
      

      const clave = modo === 'mensual'
        ? `${year}-${month.toString().padStart(2, '0')}`
        : getWeekRange(fecha);
    

      const tipo = c.tipo; // a_cobrar / a_pagar
      const moneda = monedaBase === 'original'
        ? normalizarMoneda(c.moneda_nominal)
        : c.moneda_convertida;

      const monto = monedaBase === 'original' ? c.monto_nominal : c.monto_convertido;

      if (!agrupadasPorPeriodo[clave]) agrupadasPorPeriodo[clave] = {};
      if (!agrupadasPorPeriodo[clave][tipo]) agrupadasPorPeriodo[clave][tipo] = {};
      if (!agrupadasPorPeriodo[clave][tipo][moneda]) agrupadasPorPeriodo[clave][tipo][moneda] = 0;

      agrupadasPorPeriodo[clave][tipo][moneda] += monto;
    });

    return agrupadasPorPeriodo;
  }, [cuotasConvertidas, modo, monedaBase]);

  const periodos = Object.keys(agrupadas).sort();

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Proyección Financiera</Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <FormControl>
          <InputLabel>Modo</InputLabel>
          <Select value={modo} onChange={(e) => setModo(e.target.value)}>
            <MenuItem value="semanal">Semanal</MenuItem>
            <MenuItem value="mensual">Mensual</MenuItem>
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel>Moneda</InputLabel>
          <Select value={monedaBase} onChange={(e) => setMonedaBase(e.target.value)}>
            <MenuItem value="original">Sin convertir</MenuItem>
            <MenuItem value="ARS">Convertir a ARS</MenuItem>
            <MenuItem value="USD">Convertir a USD</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? <CircularProgress /> : (
        <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Periodo</TableCell>
            {MONEDAS.map((m) => (
              <TableCell key={`diff-${m}`}>Diferencia {m}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {periodos.map((periodo) => (
            <TableRow key={periodo}>
              <TableCell>{periodo}</TableCell>
              {MONEDAS.map((m) => {
                const cobrar = agrupadas[periodo]?.a_cobrar?.[m] || 0;
                const pagar = agrupadas[periodo]?.a_pagar?.[m] || 0;
                const diferencia = cobrar - pagar;
                return (
                  <TableCell key={`diff-${periodo}-${m}`} sx={{ color: diferencia >= 0 ? 'green' : 'red' }}>
                    {formatCurrency(diferencia)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      )}
    </Paper>
  );
};

const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 (domingo) a 6 (sábado)
    const diffToMonday = (day === 0 ? -6 : 1) - day; // lunes = 1
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
  
    return `${monday.toISOString().split('T')[0]} al ${sunday.toISOString().split('T')[0]}`;
  };
  

const normalizarMoneda = (m) => {
  if (!m || !['ARS', 'USD', 'CAC'].includes(m)) return 'ARS';
  return m;
};
