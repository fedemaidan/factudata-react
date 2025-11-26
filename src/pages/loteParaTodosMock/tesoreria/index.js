import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, Stack, TextField, MenuItem, InputAdornment,
  Divider, LinearProgress, Tooltip
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ReceiptLong as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
import { 
  mockCuentas, 
  mockMovimientos, 
  CATEGORIAS_MOVIMIENTOS 
} from 'src/data/loteParaTodos/index';

const TesoreriaPage = () => {
  const [filtros, setFiltros] = useState({
    global: '',
    cuenta: '',
    tipo: '',
    categoria: ''
  });

  // Calcular totales globales
  const totales = useMemo(() => {
    return mockCuentas.reduce((acc, cuenta) => {
      if (cuenta.moneda === 'ARS') acc.ars += cuenta.saldo;
      if (cuenta.moneda === 'USD') acc.usd += cuenta.saldo;
      return acc;
    }, { ars: 0, usd: 0 });
  }, []);

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return mockMovimientos.filter(mov => {
      if (filtros.cuenta && mov.cuenta_id !== parseInt(filtros.cuenta)) return false;
      if (filtros.tipo && mov.tipo !== filtros.tipo) return false;
      if (filtros.categoria && mov.categoria !== filtros.categoria) return false;
      
      if (filtros.global) {
        const search = filtros.global.toLowerCase();
        return (
          mov.descripcion.toLowerCase().includes(search) ||
          mov.monto.toString().includes(search)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [filtros]);

  const getCuentaNombre = (id) => {
    const cuenta = mockCuentas.find(c => c.id === id);
    return cuenta ? cuenta.nombre : 'Desconocida';
  };

  return (
    <LoteParaTodosLayout title="Tesorería y Finanzas">
      <Head>
        <title>Tesorería | Lote Para Todos</title>
      </Head>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Cajas y Bancos
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Visión general de saldos, cuentas y movimientos financieros.
          </Typography>
        </Box>

        {/* Resumen Global */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Saldo Total Consolidado (ARS)</Typography>
                <Typography variant="h3" fontWeight="bold">
                  $ {totales.ars.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  Disponible en {mockCuentas.filter(c => c.moneda === 'ARS').length} cuentas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'success.dark', color: 'white' }}>
              <CardContent>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Saldo Total Consolidado (USD)</Typography>
                <Typography variant="h3" fontWeight="bold">
                  US$ {totales.usd.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  Disponible en {mockCuentas.filter(c => c.moneda === 'USD').length} cuentas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Cuentas Activas
        </Typography>
        
        {/* Grid de Cuentas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {mockCuentas.map((cuenta) => (
            <Grid item xs={12} sm={6} md={4} key={cuenta.id}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{cuenta.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{cuenta.tipo}</Typography>
                    </Box>
                    {cuenta.tipo === 'BANCO' ? <BankIcon color="action" /> : <MoneyIcon color="action" />}
                  </Stack>
                  
                  <Typography variant="h5" fontWeight="bold" color={cuenta.moneda === 'USD' ? 'success.main' : 'primary.main'}>
                    {cuenta.moneda === 'USD' ? 'US$' : '$'} {cuenta.saldo.toLocaleString()}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Último mov: {cuenta.ultimo_movimiento}
                    </Typography>
                    <Button size="small" endIcon={<ReceiptIcon />}>
                      Ver Movimientos
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filtros de Movimientos */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar movimiento..."
                value={filtros.global}
                onChange={(e) => setFiltros({ ...filtros, global: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Cuenta"
                value={filtros.cuenta}
                onChange={(e) => setFiltros({ ...filtros, cuenta: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                {mockCuentas.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Tipo"
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="INGRESO">Ingreso</MenuItem>
                <MenuItem value="EGRESO">Egreso</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Categoría"
                value={filtros.categoria}
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                {CATEGORIAS_MOVIMIENTOS.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabla de Movimientos */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movimientosFiltrados.length > 0 ? (
                  movimientosFiltrados.map((row) => (
                    <TableRow hover key={row.id}>
                      <TableCell>{row.fecha}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{row.descripcion}</Typography>
                        {row.contrato_id && (
                          <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }}>
                            Ref. Contrato #{row.contrato_id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={row.categoria.replace(/_/g, ' ')} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{getCuentaNombre(row.cuenta_id)}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={row.tipo === 'INGRESO' ? 'success.main' : 'error.main'}
                        >
                          {row.tipo === 'INGRESO' ? '+' : '-'} 
                          {row.moneda === 'USD' ? 'US$' : '$'} {row.monto.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {row.conciliado ? (
                          <Tooltip title="Conciliado">
                            <CheckCircleIcon color="success" fontSize="small" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Pendiente de Conciliación">
                            <WarningIcon color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No se encontraron movimientos.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Container>
    </LoteParaTodosLayout>
  );
};

export default TesoreriaPage;
