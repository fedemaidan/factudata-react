import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import {
  Box, Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Button,
  Stack, TextField, MenuItem, InputAdornment, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
import { 
  mockContratos, 
  mockClientes, 
  mockLotes, 
  mockEmprendimientos,
  mockPlanes,
  mockCuentas // Importamos cuentas para el registro de pagos
} from 'src/data/loteParaTodos/index';

// Estados comerciales que nos interesan en esta vista
const ESTADOS_COMERCIALES = ['PRE-RESERVA', 'RESERVA', 'CANCELADO', 'VENCIDO'];

const ContratosComercialesPage = () => {
  const [filtros, setFiltros] = useState({
    global: '',
    estado: '',
    vendedor: '',
    emprendimiento: ''
  });
  
  const [contratos, setContratos] = useState(mockContratos);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [openConfirmarReserva, setOpenConfirmarReserva] = useState(false);
  const [openRegistrarPago, setOpenRegistrarPago] = useState(false); // Nuevo estado para modal de pagos
  
  const [reservaData, setReservaData] = useState({
    monto_seña: '',
    fecha_pago: new Date().toISOString().slice(0, 10),
    medio_pago: 'EFECTIVO',
    documentacion_ok: false
  });

  const [pagoData, setPagoData] = useState({
    monto: '',
    moneda: 'ARS',
    fecha: new Date().toISOString().slice(0, 10),
    cuenta_id: '',
    concepto: 'COBRANZA_ANTICIPO',
    observaciones: ''
  });

  // Obtener listas para filtros
  const vendedores = useMemo(() => [...new Set(mockContratos.map(c => c.vendedor_id).filter(Boolean))], []);
  const emprendimientos = mockEmprendimientos;

  // Filtrar y enriquecer datos
  const contratosFiltrados = useMemo(() => {
    return contratos
      .filter(c => ESTADOS_COMERCIALES.includes(c.estado))
      .map(contrato => {
        const cliente = mockClientes.find(cl => cl.id === contrato.cliente_id);
        const lote = mockLotes.find(l => l.id === contrato.lote_id);
        const emprendimiento = lote ? mockEmprendimientos.find(e => e.id === lote.emprendimiento_id) : null;
        const plan = mockPlanes.find(p => p.id === contrato.plan_financiacion_id);
        
        return {
          ...contrato,
          cliente_nombre: cliente ? `${cliente.nombre} ${cliente.apellido || ''}` : 'Desconocido',
          cliente_dni: cliente?.dni || '',
          lote_numero: lote?.numero || '?',
          lote_manzana: lote?.manzana || '?',
          emprendimiento_nombre: emprendimiento?.nombre || '?',
          plan_nombre: plan?.nombre || '?',
          emprendimiento_id: emprendimiento?.id
        };
      })
      .filter(item => {
        // Filtros
        if (filtros.estado && item.estado !== filtros.estado) return false;
        if (filtros.vendedor && item.vendedor_id !== filtros.vendedor) return false;
        if (filtros.emprendimiento && item.emprendimiento_id !== parseInt(filtros.emprendimiento)) return false;
        
        if (filtros.global) {
          const search = filtros.global.toLowerCase();
          return (
            item.cliente_nombre.toLowerCase().includes(search) ||
            item.cliente_dni.includes(search) ||
            item.lote_numero.toString().includes(search) ||
            item.id.toString().includes(search)
          );
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.fecha_contrato) - new Date(a.fecha_contrato));
  }, [contratos, filtros]);

  const handleVerDetalle = (contrato) => {
    setSelectedContrato(contrato);
    setOpenDetalle(true);
  };

  const handleAbrirPago = () => {
    setPagoData({
      monto: '',
      moneda: 'ARS',
      fecha: new Date().toISOString().slice(0, 10),
      cuenta_id: '',
      concepto: selectedContrato?.estado === 'RESERVA' ? 'COBRANZA_ANTICIPO' : 'COBRANZA_CUOTA',
      observaciones: ''
    });
    setOpenRegistrarPago(true);
  };

  const handleGuardarPago = () => {
    if (!pagoData.monto || !pagoData.cuenta_id) {
      alert('Por favor complete el monto y la cuenta de destino.');
      return;
    }

    // Simular impacto en el contrato
    setContratos(prev => prev.map(c => {
      if (c.id === selectedContrato.id) {
        const nuevoPagado = (c.pago_contado_hoy || 0) + parseFloat(pagoData.monto);
        const nuevoSaldo = c.precio_acordado - nuevoPagado; // Simplificación
        
        return {
          ...c,
          pago_contado_hoy: nuevoPagado,
          // Si completó el anticipo, podríamos sugerir activar, pero por ahora solo actualizamos saldos
          observaciones: `${c.observaciones || ''} | Pago registrado: $${pagoData.monto} (${pagoData.moneda})`
        };
      }
      return c;
    }));

    alert('Pago registrado exitosamente. El movimiento se ha generado en Tesorería.');
    setOpenRegistrarPago(false);
    setOpenDetalle(false);
  };

  const handleCambiarEstado = (id, nuevoEstado) => {
    if (nuevoEstado === 'RESERVA') {
      // Si es para reservar, abrir modal de confirmación de seña
      const contrato = contratos.find(c => c.id === id);
      setSelectedContrato(contrato);
      setReservaData({
        monto_seña: contrato.entrega_inicial * 0.1, // Sugerir 10% del anticipo como seña mínima
        fecha_pago: new Date().toISOString().slice(0, 10),
        medio_pago: 'EFECTIVO',
        documentacion_ok: false
      });
      setOpenConfirmarReserva(true);
      return;
    }

    if (confirm(`¿Está seguro de cambiar el estado a ${nuevoEstado}?`)) {
      setContratos(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
      if (selectedContrato && selectedContrato.id === id) {
        setSelectedContrato(prev => ({ ...prev, estado: nuevoEstado }));
      }
    }
  };

  const confirmarReservaConSeña = () => {
    if (!reservaData.monto_seña || reservaData.monto_seña <= 0) {
      alert('Debe ingresar un monto de seña válido.');
      return;
    }
    
    setContratos(prev => prev.map(c => {
      if (c.id === selectedContrato.id) {
        return {
          ...c,
          estado: 'RESERVA',
          pago_contado_hoy: parseFloat(reservaData.monto_seña),
          saldo_pendiente: c.entrega_inicial - parseFloat(reservaData.monto_seña),
          observaciones: `${c.observaciones || ''} | Seña recibida: $${reservaData.monto_seña} (${reservaData.medio_pago})`
        };
      }
      return c;
    }));
    
    setOpenConfirmarReserva(false);
    setOpenDetalle(false);
    alert('Reserva confirmada exitosamente. El contrato ha cambiado de estado.');
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PRE-RESERVA': return 'info';
      case 'RESERVA': return 'warning';
      case 'ACTIVO': return 'success';
      case 'CANCELADO': return 'error';
      case 'VENCIDO': return 'default';
      default: return 'default';
    }
  };

  return (
    <LoteParaTodosLayout title="Gestión de Contratos Comerciales">
      <Head>
        <title>Contratos Comerciales | Lote Para Todos</title>
      </Head>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Gestión de Reservas
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Administre las pre-reservas y reservas en curso antes de su activación final.
          </Typography>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por cliente, DNI o lote..."
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
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {ESTADOS_COMERCIALES.map(e => (
                  <MenuItem key={e} value={e}>{e}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Emprendimiento"
                value={filtros.emprendimiento}
                onChange={(e) => setFiltros({ ...filtros, emprendimiento: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {emprendimientos.map(e => (
                  <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Vendedor"
                value={filtros.vendedor}
                onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {vendedores.map(v => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => setFiltros({ global: '', estado: '', vendedor: '', emprendimiento: '' })}
                sx={{ height: 56 }}
              >
                <FilterListIcon />
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabla */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Lote / Emprendimiento</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Valores</TableCell>
                  <TableCell>Fechas</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contratosFiltrados.length > 0 ? (
                  contratosFiltrados.map((row) => (
                    <TableRow 
                      hover 
                      key={row.id}
                      onClick={() => handleVerDetalle(row)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>#{row.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{row.cliente_nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.cliente_dni}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">Lote {row.lote_numero}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.emprendimiento_nombre}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.plan_nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.cuotas_cantidad} cuotas</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">Total: ${row.precio_acordado.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Anticipo: ${row.entrega_inicial.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">Creado: {row.fecha_contrato}</Typography>
                        <Typography variant="caption" color={new Date(row.fecha_vencimiento) < new Date() ? 'error.main' : 'text.secondary'}>
                          Vence: {row.fecha_vencimiento}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={row.estado} 
                          color={getEstadoColor(row.estado)} 
                          size="small" 
                          variant={row.estado === 'PRE-RESERVA' ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Ver Detalle">
                            <IconButton size="small" onClick={() => handleVerDetalle(row)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {row.estado === 'PRE-RESERVA' && (
                            <Tooltip title="Confirmar Reserva (Recibir Seña)">
                              <IconButton 
                                size="small" 
                                color="warning"
                                onClick={() => handleCambiarEstado(row.id, 'RESERVA')}
                              >
                                <ArrowForwardIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {row.estado === 'RESERVA' && (
                            <Tooltip title="Activar Contrato (Admin)">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleCambiarEstado(row.id, 'ACTIVO')}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {['PRE-RESERVA', 'RESERVA'].includes(row.estado) && (
                            <Tooltip title="Cancelar">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleCambiarEstado(row.id, 'CANCELADO')}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No se encontraron contratos comerciales con los filtros seleccionados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Modal de Detalle */}
        <Dialog open={openDetalle} onClose={() => setOpenDetalle(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Detalle de Operación #{selectedContrato?.id}
            {selectedContrato && (
              <Chip 
                label={selectedContrato.estado} 
                color={getEstadoColor(selectedContrato.estado)} 
                size="small" 
                sx={{ ml: 2 }}
              />
            )}
          </DialogTitle>
          <DialogContent dividers>
            {selectedContrato && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">CLIENTE</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedContrato.cliente_nombre}</Typography>
                  <Typography variant="body2">DNI: {selectedContrato.cliente_dni}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">PROPIEDAD</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedContrato.emprendimiento_nombre}
                  </Typography>
                  <Typography variant="body2">
                    Lote {selectedContrato.lote_numero} - Manzana {selectedContrato.lote_manzana}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>CONDICIONES COMERCIALES</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption">Precio Acordado</Typography>
                        <Typography variant="body2" fontWeight="bold">${selectedContrato.precio_acordado.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption">Anticipo</Typography>
                        <Typography variant="body2" fontWeight="bold">${selectedContrato.entrega_inicial.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption">Cuotas</Typography>
                        <Typography variant="body2">{selectedContrato.cuotas_cantidad} x ${selectedContrato.cuota_mensual.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption">Vendedor</Typography>
                        <Typography variant="body2">{selectedContrato.vendedor_id}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">OBSERVACIONES</Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    {selectedContrato.observaciones || 'Sin observaciones.'}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDetalle(false)}>Cerrar</Button>
            
            {/* Botón Registrar Pago */}
            {['PRE-RESERVA', 'RESERVA'].includes(selectedContrato?.estado) && (
              <Button 
                variant="outlined" 
                startIcon={<ArrowForwardIcon />} // Usamos un icono genérico por ahora
                onClick={handleAbrirPago}
              >
                Registrar Pago
              </Button>
            )}

            {selectedContrato?.estado === 'PRE-RESERVA' && (
              <Button variant="contained" color="warning" onClick={() => {
                // handleCambiarEstado ya maneja la apertura del modal
                handleCambiarEstado(selectedContrato.id, 'RESERVA');
              }}>
                Confirmar Reserva
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Modal de Registro de Pago (X1) */}
        <Dialog open={openRegistrarPago} onClose={() => setOpenRegistrarPago(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar Pago en Contrato #{selectedContrato?.id}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="subtitle2" color="primary.main">Estado de Cuenta Actual</Typography>
                  <Typography variant="body2">
                    Precio Total: <strong>${selectedContrato?.precio_acordado?.toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Pagado hasta hoy: <strong>${(selectedContrato?.pago_contado_hoy || 0).toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Saldo Pendiente: <strong>${(selectedContrato?.saldo_pendiente || 0).toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Monto"
                  type="number"
                  fullWidth
                  required
                  value={pagoData.monto}
                  onChange={(e) => setPagoData({ ...pagoData, monto: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Moneda"
                  fullWidth
                  value={pagoData.moneda}
                  onChange={(e) => setPagoData({ ...pagoData, moneda: e.target.value })}
                >
                  <MenuItem value="ARS">Pesos (ARS)</MenuItem>
                  <MenuItem value="USD">Dólares (USD)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha de Pago"
                  type="date"
                  fullWidth
                  value={pagoData.fecha}
                  onChange={(e) => setPagoData({ ...pagoData, fecha: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Concepto"
                  fullWidth
                  value={pagoData.concepto}
                  onChange={(e) => setPagoData({ ...pagoData, concepto: e.target.value })}
                >
                  <MenuItem value="COBRANZA_ANTICIPO">Anticipo / Seña</MenuItem>
                  <MenuItem value="COBRANZA_CUOTA">Cuota Mensual</MenuItem>
                  <MenuItem value="COBRANZA_REFUERZO">Refuerzo / Aguinaldo</MenuItem>
                  <MenuItem value="GASTOS_ADMINISTRATIVOS">Gastos Administrativos</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  select
                  label="Cuenta de Destino (Caja/Banco)"
                  fullWidth
                  required
                  value={pagoData.cuenta_id}
                  onChange={(e) => setPagoData({ ...pagoData, cuenta_id: e.target.value })}
                  helperText="Seleccione dónde ingresó el dinero"
                >
                  {mockCuentas
                    .filter(c => c.moneda === pagoData.moneda)
                    .map(cuenta => (
                      <MenuItem key={cuenta.id} value={cuenta.id}>
                        {cuenta.nombre} (Saldo: {cuenta.moneda} {cuenta.saldo.toLocaleString()})
                      </MenuItem>
                    ))
                  }
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Observaciones / Nro Comprobante"
                  fullWidth
                  multiline
                  rows={2}
                  value={pagoData.observaciones}
                  onChange={(e) => setPagoData({ ...pagoData, observaciones: e.target.value })}
                  placeholder="Ej: Transferencia #12345678"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRegistrarPago(false)}>Cancelar</Button>
            <Button 
              variant="contained" 
              color="success"
              onClick={handleGuardarPago}
              disabled={!pagoData.monto || !pagoData.cuenta_id}
            >
              Confirmar Ingreso
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Confirmación de Reserva (Seña) */}
        <Dialog open={openConfirmarReserva} onClose={() => setOpenConfirmarReserva(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirmar Reserva - Recibir Seña</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" paragraph>
              Para pasar el contrato a estado <strong>RESERVA</strong>, es necesario registrar el pago de una seña o anticipo parcial.
            </Typography>
            
            <Box sx={{ bgcolor: 'info.50', p: 2, mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
              <Typography variant="subtitle2" color="info.800">Datos del Contrato</Typography>
              <Typography variant="body2">Anticipo Total Pactado: <strong>${selectedContrato?.entrega_inicial?.toLocaleString()}</strong></Typography>
            </Box>

            <Stack spacing={3}>
              <TextField
                label="Monto de Seña Recibido"
                type="number"
                fullWidth
                required
                value={reservaData.monto_seña}
                onChange={(e) => setReservaData({ ...reservaData, monto_seña: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText={`Sugerido: 10% ($${(selectedContrato?.entrega_inicial * 0.1)?.toLocaleString()})`}
              />
              
              <TextField
                label="Fecha de Pago"
                type="date"
                fullWidth
                value={reservaData.fecha_pago}
                onChange={(e) => setReservaData({ ...reservaData, fecha_pago: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                select
                label="Medio de Pago"
                fullWidth
                value={reservaData.medio_pago}
                onChange={(e) => setReservaData({ ...reservaData, medio_pago: e.target.value })}
              >
                <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia Bancaria</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
              </TextField>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input 
                  type="checkbox" 
                  id="doc-check" 
                  checked={reservaData.documentacion_ok}
                  onChange={(e) => setReservaData({ ...reservaData, documentacion_ok: e.target.checked })}
                  style={{ width: 20, height: 20 }}
                />
                <label htmlFor="doc-check">
                  <Typography variant="body2">He verificado la documentación básica del cliente (DNI)</Typography>
                </label>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConfirmarReserva(false)}>Cancelar</Button>
            <Button 
              variant="contained" 
              color="primary"
              disabled={!reservaData.monto_seña || !reservaData.documentacion_ok}
              onClick={confirmarReservaConSeña}
            >
              Confirmar Pago y Reservar
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </LoteParaTodosLayout>
  );
};

export default ContratosComercialesPage;
