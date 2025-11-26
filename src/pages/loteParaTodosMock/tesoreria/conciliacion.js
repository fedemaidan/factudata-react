import React, { useState, useMemo, useRef } from 'react';
import Head from 'next/head';
import * as XLSX from 'xlsx';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, Stack, TextField, MenuItem, InputAdornment,
  Divider, Checkbox, Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Link as LinkIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  CompareArrows as CompareIcon,
  UploadFile as UploadFileIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
import { 
  mockCuentas, 
  mockMovimientos, 
  mockExtractoBancario 
} from 'src/data/loteParaTodos/index';

const ConciliacionPage = () => {
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(3); // Default Galicia ARS
  const [movimientosSistema, setMovimientosSistema] = useState(mockMovimientos);
  const [movimientosBanco, setMovimientosBanco] = useState(mockExtractoBancario);
  const fileInputRef = useRef(null);
  
  const [seleccionSistema, setSeleccionSistema] = useState([]);
  const [seleccionBanco, setSeleccionBanco] = useState([]);

  // Filtrar datos por cuenta seleccionada y estado no conciliado
  const sistemaPendientes = useMemo(() => {
    return movimientosSistema.filter(m => 
      m.cuenta_id === cuentaSeleccionada && !m.conciliado
    );
  }, [movimientosSistema, cuentaSeleccionada]);

  const bancoPendientes = useMemo(() => {
    return movimientosBanco.filter(m => 
      m.cuenta_id === cuentaSeleccionada && !m.conciliado
    );
  }, [movimientosBanco, cuentaSeleccionada]);

  const cuentaActual = mockCuentas.find(c => c.id === cuentaSeleccionada);

  // Manejo de selección
  const handleToggleSistema = (id) => {
    setSeleccionSistema(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleBanco = (id) => {
    setSeleccionBanco(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Calcular totales seleccionados para validar conciliación
  const totalSistema = useMemo(() => {
    return seleccionSistema.reduce((acc, id) => {
      const mov = sistemaPendientes.find(m => m.id === id);
      return acc + (mov ? (mov.tipo === 'INGRESO' ? mov.monto : -mov.monto) : 0);
    }, 0);
  }, [seleccionSistema, sistemaPendientes]);

  const totalBanco = useMemo(() => {
    return seleccionBanco.reduce((acc, id) => {
      const mov = bancoPendientes.find(m => m.id === id);
      return acc + (mov ? (mov.tipo === 'INGRESO' ? mov.monto : -mov.monto) : 0);
    }, 0);
  }, [seleccionBanco, bancoPendientes]);

  const diferencia = totalSistema - totalBanco;
  const puedeConciliar = seleccionSistema.length > 0 && seleccionBanco.length > 0 && Math.abs(diferencia) < 0.01;

  const handleConciliar = () => {
    if (!puedeConciliar) return;

    if (confirm('¿Confirmar conciliación de los movimientos seleccionados?')) {
      // Marcar como conciliados en sistema
      setMovimientosSistema(prev => prev.map(m => 
        seleccionSistema.includes(m.id) ? { ...m, conciliado: true } : m
      ));
      
      // Marcar como conciliados en banco (simulado)
      setMovimientosBanco(prev => prev.map(m => 
        seleccionBanco.includes(m.id) ? { ...m, conciliado: true } : m
      ));

      setSeleccionSistema([]);
      setSeleccionBanco([]);
      alert('Conciliación realizada exitosamente.');
    }
  };

  const handleCrearMovimientoDesdeBanco = (movBanco) => {
    // Simular creación de movimiento espejo en el sistema
    const nuevoMov = {
      id: Date.now(),
      fecha: movBanco.fecha,
      descripcion: movBanco.descripcion,
      monto: movBanco.monto,
      moneda: cuentaActual.moneda,
      tipo: movBanco.tipo,
      categoria: 'GASTOS_VARIOS', // Default
      cuenta_id: cuentaSeleccionada,
      contrato_id: null,
      conciliado: true, // Nace conciliado
      usuario: 'admin'
    };

    setMovimientosSistema(prev => [...prev, nuevoMov]);
    
    // Marcar el del banco como conciliado también
    setMovimientosBanco(prev => prev.map(m => 
      m.id === movBanco.id ? { ...m, conciliado: true } : m
    ));

    alert('Movimiento creado en el sistema y conciliado automáticamente.');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Asumimos estructura simple: [Fecha, Descripcion, Monto]
      // Omitimos header si existe (fila 0)
      const nuevosMovimientos = data.slice(1).map((row, index) => ({
        id: `imp-${Date.now()}-${index}`,
        fecha: row[0] || new Date().toISOString().split('T')[0],
        descripcion: row[1] || 'Movimiento Importado',
        monto: parseFloat(row[2]) || 0,
        conciliado: false
      })).filter(m => m.monto !== 0);

      setMovimientosBanco(prev => [...prev, ...nuevosMovimientos]);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <LoteParaTodosLayout title="Conciliación Bancaria">
      <Head>
        <title>Conciliación | Lote Para Todos</title>
      </Head>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Conciliación Bancaria
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Compare y vincule los movimientos del sistema con el extracto bancario.
            </Typography>
          </Box>
          
          <Box sx={{ minWidth: 300 }}>
            <TextField
              select
              fullWidth
              label="Cuenta a Conciliar"
              value={cuentaSeleccionada}
              onChange={(e) => {
                setCuentaSeleccionada(e.target.value);
                setSeleccionSistema([]);
                setSeleccionBanco([]);
              }}
            >
              {mockCuentas.filter(c => c.tipo === 'BANCO').map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nombre} ({c.moneda})
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        {/* Panel de Control de Conciliación */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Selección Sistema</Typography>
              <Typography variant="h6" color={totalSistema >= 0 ? 'success.main' : 'error.main'}>
                $ {totalSistema.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">Selección Banco</Typography>
              <Typography variant="h6" color={totalBanco >= 0 ? 'success.main' : 'error.main'}>
                $ {totalBanco.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" display="block">Diferencia</Typography>
                  <Typography 
                    variant="h6" 
                    color={Math.abs(diferencia) < 0.01 ? 'success.main' : 'error.main'}
                    fontWeight="bold"
                  >
                    $ {diferencia.toLocaleString()}
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<CompareIcon />}
                  disabled={!puedeConciliar}
                  onClick={handleConciliar}
                >
                  Conciliar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          {/* Columna Izquierda: Sistema */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="h6" color="primary.main">Movimientos en Sistema</Typography>
                <Typography variant="caption" color="text.secondary">
                  Pendientes de conciliar: {sistemaPendientes.length}
                </Typography>
              </Box>
              <TableContainer sx={{ flexGrow: 1, maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sistemaPendientes.length > 0 ? (
                      sistemaPendientes.map((row) => (
                        <TableRow 
                          key={row.id} 
                          hover 
                          selected={seleccionSistema.includes(row.id)}
                          onClick={() => handleToggleSistema(row.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={seleccionSistema.includes(row.id)} />
                          </TableCell>
                          <TableCell>{row.fecha}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.descripcion}</Typography>
                            <Chip label={row.categoria} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight="bold"
                              color={row.tipo === 'INGRESO' ? 'success.main' : 'error.main'}
                            >
                              {row.tipo === 'INGRESO' ? '+' : '-'} {row.monto.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            Todo conciliado en sistema.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Columna Derecha: Banco */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">Extracto Bancario</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pendientes de conciliar: {bancoPendientes.length}
                  </Typography>
                </Box>
                <Box>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    startIcon={<UploadFileIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => fileInputRef.current.click()}
                  >
                    Importar
                  </Button>
                </Box>
              </Box>
              <TableContainer sx={{ flexGrow: 1, maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bancoPendientes.length > 0 ? (
                      bancoPendientes.map((row) => (
                        <TableRow 
                          key={row.id} 
                          hover 
                          selected={seleccionBanco.includes(row.id)}
                          onClick={() => handleToggleBanco(row.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={seleccionBanco.includes(row.id)} />
                          </TableCell>
                          <TableCell>{row.fecha}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.descripcion}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight="bold"
                              color={row.tipo === 'INGRESO' ? 'success.main' : 'error.main'}
                            >
                              {row.tipo === 'INGRESO' ? '+' : '-'} {row.monto.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <IconButton 
                              size="small" 
                              color="primary" 
                              title="Crear movimiento en sistema"
                              onClick={() => handleCrearMovimientoDesdeBanco(row)}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            Todo conciliado en banco.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

      </Container>
    </LoteParaTodosLayout>
  );
};

export default ConciliacionPage;
