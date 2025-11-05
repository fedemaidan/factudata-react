// src/pages/loteParaTodosMock/contratos/index.js
import React, { useState, useMemo } from 'react';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  TextField, InputAdornment, MenuItem, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Alert, AlertTitle, Collapse, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Assignment as AssignmentIcon,
  MonetizationOn as MoneyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  NotificationsActive as NotificationsIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';

// Importar datos
import { mockContratos } from '../../../data/loteParaTodos/mockContratos';
import { mockClientes } from '../../../data/loteParaTodos/mockClientes';
import { mockLotes } from '../../../data/loteParaTodos/mockLotes';
import { mockVendedores } from '../../../data/loteParaTodos/mockVendedores';
import { mockEmprendimientos } from '../../../data/loteParaTodos/mockEmprendimientos';
import { mockPlanes } from '../../../data/loteParaTodos/mockPlanes';

// Importar XLSX para exportación
import * as XLSX from 'xlsx';
import LoteParaTodosLayout from '../../../components/layouts/LoteParaTodosLayout';

export default function ContratosIndex() {
  const router = useRouter();
  const { clienteId, clienteNombre } = router.query;
  
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroVendedor, setFiltroVendedor] = useState(null);
  const [filtroEmprendimiento, setFiltroEmprendimiento] = useState(null);
  


  // Aplicar filtro automático si viene de clientes
  React.useEffect(() => {
    if (clienteNombre) {
      setFiltroTexto(clienteNombre);
    }
  }, [clienteNombre]);

  // Funciones de utilidad (definir antes de usar)
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
  };

  // Estados disponibles
  const estados = [
    { value: 'TODOS', label: 'Todos los estados' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'CAIDO', label: 'Caído' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'RESCINDIDO', label: 'Rescindido' }
  ];

  // Función para obtener información completa del contrato
  const getContratoCompleto = (contrato) => {
    const cliente = mockClientes.find(c => c.id === contrato.cliente_id);
    const lote = mockLotes.find(l => l.id === contrato.lote_id);
    const vendedor = mockVendedores.find(v => v.id === contrato.vendedor_id);
    const emprendimiento = mockEmprendimientos.find(e => e.id === lote?.emprendimiento_id);
    const plan = mockPlanes.find(p => p.id === contrato.plan_financiacion_id);

    return {
      ...contrato,
      cliente_nombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado',
      cliente_dni: cliente?.dni || '',
      lote_numero: lote?.numero || 'N/A',
      lote_manzana: lote?.manzana || 'N/A',
      emprendimiento_nombre: emprendimiento?.nombre || 'N/A',
      vendedor_nombre: vendedor?.nombre || 'N/A',
      plan_nombre: plan?.nombre || 'N/A'
    };
  };

  // Contratos filtrados
  const contratosFiltrados = useMemo(() => {
    let contratos = mockContratos.map(getContratoCompleto);

    // Filtro por texto (cliente, lote, vendedor)
    if (filtroTexto) {
      const texto = filtroTexto.toLowerCase();
      contratos = contratos.filter(contrato =>
        contrato.cliente_nombre.toLowerCase().includes(texto) ||
        contrato.cliente_dni.includes(texto) ||
        contrato.lote_numero.toString().includes(texto) ||
        contrato.vendedor_nombre.toLowerCase().includes(texto) ||
        contrato.emprendimiento_nombre.toLowerCase().includes(texto) ||
        contrato.id.toString().includes(texto)
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'TODOS') {
      contratos = contratos.filter(contrato => contrato.estado === filtroEstado);
    }

    // Filtro por vendedor
    if (filtroVendedor) {
      contratos = contratos.filter(contrato => contrato.vendedor_id === filtroVendedor.id);
    }

    // Filtro por emprendimiento
    if (filtroEmprendimiento) {
      contratos = contratos.filter(contrato => contrato.emprendimiento_nombre === filtroEmprendimiento.nombre);
    }

    return contratos.sort((a, b) => new Date(b.fecha_contrato) - new Date(a.fecha_contrato));
  }, [filtroTexto, filtroEstado, filtroVendedor, filtroEmprendimiento]);

  // Estadísticas generales
  const estadisticas = useMemo(() => {
    const total = mockContratos.length;
    const activos = mockContratos.filter(c => c.estado === 'ACTIVO').length;
    const completados = mockContratos.filter(c => c.estado === 'COMPLETADO').length;
    const caidos = mockContratos.filter(c => c.estado === 'CAIDO').length;
    
    const montoTotal = mockContratos.reduce((sum, c) => sum + c.precio_acordado, 0);
    const saldoPendiente = mockContratos
      .filter(c => c.estado === 'ACTIVO')
      .reduce((sum, c) => sum + c.saldo_pendiente, 0);

    // Métricas básicas
    const montoCobrado = mockContratos.reduce((sum, c) => 
      sum + (c.precio_acordado - c.saldo_pendiente), 0);

    return {
      total,
      activos,
      completados,
      caidos,
      montoTotal,
      saldoPendiente,
      montoCobrado
    };
  }, []);



  const getColorEstado = (estado) => {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'COMPLETADO': return 'primary';
      case 'CAIDO': return 'warning';
      case 'RESCINDIDO': return 'error';
      default: return 'default';
    }
  };



  const exportarAExcel = () => {
    const datosExportar = contratosFiltrados.map(contrato => ({
      'ID Contrato': contrato.id,
      'Cliente': contrato.cliente_nombre,
      'DNI': contrato.cliente_dni,
      'Lote': `${contrato.lote_numero} - Mza. ${contrato.lote_manzana}`,
      'Emprendimiento': contrato.emprendimiento_nombre,
      'Vendedor': contrato.vendedor_nombre,
      'Precio Acordado': contrato.precio_acordado,
      'Estado': contrato.estado,
      'Fecha Contrato': formatearFecha(contrato.fecha_contrato),
      'Entrega Inicial': contrato.entrega_inicial,
      'Cuota Mensual': contrato.cuota_mensual,
      'Saldo Pendiente': contrato.saldo_pendiente,
      'Comentarios': contrato.comentarios || contrato.observaciones || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contratos');
    
    const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    XLSX.writeFile(wb, `Contratos_${fecha}.xlsx`);
  };



  return (
    <LoteParaTodosLayout currentModule="contratos" pageTitle="Gestión de Contratos">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestión de Contratos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {clienteNombre ? `Contratos de ${clienteNombre}` : 'Administra todos los contratos de venta de lotes'}
            </Typography>
          </Box>
        </Box>
        
        {clienteNombre && (
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={`Filtrado por cliente: ${clienteNombre}`}
              color="info"
              variant="outlined"
              onDelete={() => {
                setFiltroTexto('');
                router.push('/loteParaTodosMock/contratos');
              }}
              sx={{ mr: 1 }}
            />
          </Box>
        )}
      </Box>

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon sx={{ color: '#1976d2', mr: 1 }} />
                <Typography variant="h6" color="#1976d2">
                  Total Contratos
                </Typography>
              </Box>
              <Typography variant="h3" color="#1976d2" fontWeight="bold">
                {estadisticas.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: '#2e7d32', mr: 1 }} />
                <Typography variant="h6" color="#2e7d32">
                  Contratos Activos
                </Typography>
              </Box>
              <Typography variant="h3" color="#2e7d32" fontWeight="bold">
                {estadisticas.activos}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ color: '#7b1fa2', mr: 1 }} />
                <Typography variant="h6" color="#7b1fa2">
                  Monto Total
                </Typography>
              </Box>
              <Typography variant="h4" color="#7b1fa2" fontWeight="bold">
                {formatearMoneda(estadisticas.montoTotal)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceIcon sx={{ color: '#f57c00', mr: 1 }} />
                <Typography variant="h6" color="#f57c00">
                  Saldo Pendiente
                </Typography>
              </Box>
              <Typography variant="h4" color="#f57c00" fontWeight="bold">
                {formatearMoneda(estadisticas.saldoPendiente)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ mr: 1 }} />
            Filtros de Búsqueda
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Buscar contrato"
                placeholder="ID, cliente, DNI, lote..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                {estados.map((estado) => (
                  <MenuItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <Autocomplete
                options={mockVendedores}
                getOptionLabel={(option) => option.nombre}
                value={filtroVendedor}
                onChange={(event, newValue) => setFiltroVendedor(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Vendedor" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Autocomplete
                options={mockEmprendimientos}
                getOptionLabel={(option) => option.nombre}
                value={filtroEmprendimiento}
                onChange={(event, newValue) => setFiltroEmprendimiento(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Emprendimiento" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setFiltroTexto('');
                  setFiltroEstado('TODOS');
                  setFiltroVendedor(null);
                  setFiltroEmprendimiento(null);
                }}
                sx={{ height: '56px' }}
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de contratos */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Contratos ({contratosFiltrados.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={exportarAExcel}
                disabled={contratosFiltrados.length === 0}
              >
                Exportar Excel
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Cliente</strong></TableCell>
                  <TableCell><strong>Lote</strong></TableCell>
                  <TableCell><strong>Emprendimiento</strong></TableCell>
                  <TableCell><strong>Vendedor</strong></TableCell>
                  <TableCell><strong>Precio</strong></TableCell>
                  <TableCell><strong>Estado</strong></TableCell>
                  <TableCell><strong>Fecha</strong></TableCell>
                  <TableCell><strong>Saldo</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contratosFiltrados.map((contrato) => (
                  <TableRow 
                    key={contrato.id} 
                    hover
                    onClick={() => router.push(`/loteParaTodosMock/contratos/${contrato.id}`)}
                    sx={{ 
                      '&:hover': { backgroundColor: '#f8f9fa', cursor: 'pointer' },
                      cursor: 'pointer'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        #{contrato.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {contrato.cliente_nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        DNI: {contrato.cliente_dni}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Lote {contrato.lote_numero}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mza. {contrato.lote_manzana}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {contrato.emprendimiento_nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {contrato.vendedor_nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {formatearMoneda(contrato.precio_acordado)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={contrato.estado} 
                        color={getColorEstado(contrato.estado)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatearFecha(contrato.fecha_contrato)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={contrato.saldo_pendiente > 0 ? 'error' : 'success.main'}
                        fontWeight="500"
                      >
                        {formatearMoneda(contrato.saldo_pendiente)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {contratosFiltrados.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No se encontraron contratos con los filtros aplicados
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </LoteParaTodosLayout>
  );
}
