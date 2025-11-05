import Head from 'next/head';
import React, { useMemo, useState, useEffect } from 'react';
import {
  Box, Button, Container, Paper, Stack, Typography, Table, TableBody, 
  TableCell, TableContainer, TableHead, TablePagination, TableRow, 
  TextField, Chip, IconButton, Tooltip, Drawer, MenuItem, Breadcrumbs,
  Link, Tabs, Tab, TableSortLabel, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grid, Card, CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import { useRouter } from 'next/router';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { 
  mockEmprendimientos,
  mockLotes,
  mockContratos,
  mockPlanes,
  getEmprendimientoById,
  getLotesByEmprendimiento,
  getPlanesActivos,
  calcularFinanciacion
} from 'src/data/loteParaTodos/index';
import * as XLSX from 'xlsx';

const EmprendimientoDetalle = () => {
  const router = useRouter();
  const { id } = router.query;

  // Estados
  const [emprendimiento, setEmprendimiento] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [filteredLotes, setFilteredLotes] = useState([]);
  const [filters, setFilters] = useState({ 
    numero: '', 
    manzana: '', 
    estado: '', 
    superficie_min: '', 
    superficie_max: '' 
  });
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [openLoteDrawer, setOpenLoteDrawer] = useState(false);
  const [editingLote, setEditingLote] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, lote: null });
  const [activeTab, setActiveTab] = useState(0);

  // Formulario de lote
  const initialLoteForm = {
    numero: '',
    manzana: '',
    superficie: '',
    precio_base: '',
    estado: 'DISPONIBLE',
    observaciones: ''
  };
  const [loteForm, setLoteForm] = useState(initialLoteForm);

  // Cargar datos cuando llega el ID
  useEffect(() => {
    if (id) {
      const emp = getEmprendimientoById(parseInt(id));
      if (emp) {
        setEmprendimiento(emp);
        const lotesEmp = getLotesByEmprendimiento(parseInt(id));
        setLotes(lotesEmp);
        setFilteredLotes(lotesEmp);
      }
    }
  }, [id]);

  // Filtros
  const applyFilters = useMemo(() => {
    if (!lotes.length) return [];

    return lotes.filter(lote => {
      const matchNumero = !filters.numero || lote.numero.toLowerCase().includes(filters.numero.toLowerCase());
      const matchManzana = !filters.manzana || lote.manzana.toLowerCase().includes(filters.manzana.toLowerCase());
      const matchEstado = !filters.estado || lote.estado === filters.estado;
      const matchSuperficieMin = !filters.superficie_min || lote.superficie >= parseInt(filters.superficie_min);
      const matchSuperficieMax = !filters.superficie_max || lote.superficie <= parseInt(filters.superficie_max);

      return matchNumero && matchManzana && matchEstado && matchSuperficieMin && matchSuperficieMax;
    });
  }, [lotes, filters]);

  // Ordenamiento
  const sortedLotes = useMemo(() => {
    if (!sortConfig.field) return applyFilters;

    return [...applyFilters].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [applyFilters, sortConfig]);

  // Paginación
  const paginatedLotes = sortedLotes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Estadísticas del emprendimiento
  const estadisticas = useMemo(() => {
    const stats = {
      disponibles: 0,
      vendidos: 0,
      reservados: 0,
      bloqueados: 0,
      total: lotes.length
    };

    lotes.forEach(lote => {
      switch (lote.estado) {
        case 'DISPONIBLE': stats.disponibles++; break;
        case 'VENDIDO': stats.vendidos++; break;
        case 'RESERVADO': stats.reservados++; break;
        case 'BLOQUEADO': stats.bloqueados++; break;
      }
    });

    return stats;
  }, [lotes]);

  // Funciones
  const handleSort = (field) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
  };

  const clearFilters = () => {
    setFilters({ numero: '', manzana: '', estado: '', superficie_min: '', superficie_max: '' });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const openNuevoLote = () => {
    setEditingLote(null);
    setLoteForm(initialLoteForm);
    setOpenLoteDrawer(true);
  };

  const openEditarLote = (lote) => {
    setEditingLote(lote);
    setLoteForm({
      numero: lote.numero,
      manzana: lote.manzana,
      superficie: lote.superficie,
      precio_base: lote.precio_base,
      estado: lote.estado,
      observaciones: lote.observaciones || ''
    });
    setOpenLoteDrawer(true);
  };

  const saveLote = () => {
    if (!loteForm.numero || !loteForm.manzana || !loteForm.superficie) {
      return alert('Número, manzana y superficie son obligatorios');
    }

    const loteData = {
      ...loteForm,
      emprendimiento_id: parseInt(id),
      superficie: parseFloat(loteForm.superficie),
      precio_base: parseFloat(loteForm.precio_base) || 0,
      fecha_venta: loteForm.estado === 'VENDIDO' ? new Date().toISOString().slice(0, 10) : null
    };

    if (editingLote) {
      // Actualizar lote existente
      const nuevosLotes = lotes.map(l => 
        l.id === editingLote.id ? { ...loteData, id: editingLote.id } : l
      );
      setLotes(nuevosLotes);
    } else {
      // Crear nuevo lote
      const nuevoId = Math.max(...lotes.map(l => l.id), 0) + 1;
      setLotes(prev => [...prev, { ...loteData, id: nuevoId }]);
    }

    setOpenLoteDrawer(false);
    setLoteForm(initialLoteForm);
    setEditingLote(null);
  };

  const confirmDelete = (lote) => {
    setDeleteDialog({ open: true, lote });
  };

  const deleteLote = () => {
    if (deleteDialog.lote) {
      setLotes(prev => prev.filter(l => l.id !== deleteDialog.lote.id));
    }
    setDeleteDialog({ open: false, lote: null });
  };

  const exportToExcel = () => {
    const dataExport = sortedLotes.map(lote => ({
      'Lote': lote.numero,
      'Manzana': lote.manzana,
      'Superficie (m²)': lote.superficie,
      'Estado': lote.estado,
      'Precio Base': lote.precio_base,
      'Fecha Venta': lote.fecha_venta || '-',
      'Observaciones': lote.observaciones || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lotes');
    XLSX.writeFile(wb, `lotes-${emprendimiento?.nombre || 'emprendimiento'}.xlsx`);
  };

  const getColorForEstado = (estado) => {
    switch (estado) {
      case 'DISPONIBLE': return 'success';
      case 'VENDIDO': return 'info';
      case 'RESERVADO': return 'warning';
      case 'BLOQUEADO': return 'default';
      default: return 'default';
    }
  };

  if (!emprendimiento) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <>
      <Head>
        <title>{emprendimiento.nombre} | Gestión de Lotes</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          {/* BREADCRUMBS */}
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link
              color="inherit"
              href="/loteParaTodosMock/lotes"
              onClick={(e) => {
                e.preventDefault();
                router.push('/loteParaTodosMock/lotes');
              }}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Gestión de Lotes
            </Link>
            <Typography color="text.primary">{emprendimiento.nombre}</Typography>
          </Breadcrumbs>

          {/* HEADER */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                  <IconButton 
                    onClick={() => router.push('/loteParaTodosMock/lotes')}
                    size="small"
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography variant="h4" fontWeight={700}>
                    {emprendimiento.nombre}
                  </Typography>
                  <Chip 
                    label={emprendimiento.estado} 
                    color={emprendimiento.estado === 'ACTIVO' ? 'success' : 'default'}
                  />
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 6 }}>
                  {emprendimiento.ubicacion}
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToExcel}>
                  Excel
                </Button>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNuevoLote}>
                  Nuevo Lote
                </Button>
              </Stack>
            </Stack>

            {/* ESTADÍSTICAS */}
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Chip 
                label={`Disponibles: ${estadisticas.disponibles}`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`Vendidos: ${estadisticas.vendidos}`} 
                color="info" 
                variant="outlined"
              />
              <Chip 
                label={`Reservados: ${estadisticas.reservados}`} 
                color="warning" 
                variant="outlined"
              />
              <Chip 
                label={`Bloqueados: ${estadisticas.bloqueados}`} 
                color="default" 
                variant="outlined"
              />
              <Chip 
                label={`Total: ${estadisticas.total}`} 
                variant="filled"
              />
            </Stack>
          </Paper>

          {/* TABS */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
            >
              <Tab label="Listado de Lotes" />
              <Tab label="Calculadora de Precios" />
              <Tab label="Vista Disponibilidad" />
            </Tabs>
          </Paper>

          {/* CONTENIDO DEL TAB */}
          {activeTab === 0 && (
            <>
              {/* FILTROS */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <TextField
                    size="small"
                    label="Número de Lote"
                    value={filters.numero}
                    onChange={(e) => handleFilterChange('numero', e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    size="small"
                    label="Manzana"
                    value={filters.manzana}
                    onChange={(e) => handleFilterChange('manzana', e.target.value)}
                    sx={{ minWidth: 100 }}
                  />
                  <TextField
                    size="small"
                    label="Estado"
                    select
                    value={filters.estado}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="DISPONIBLE">Disponible</MenuItem>
                    <MenuItem value="VENDIDO">Vendido</MenuItem>
                    <MenuItem value="RESERVADO">Reservado</MenuItem>
                    <MenuItem value="BLOQUEADO">Bloqueado</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    label="Sup. Min (m²)"
                    type="number"
                    value={filters.superficie_min}
                    onChange={(e) => handleFilterChange('superficie_min', e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    size="small"
                    label="Sup. Max (m²)"
                    type="number"
                    value={filters.superficie_max}
                    onChange={(e) => handleFilterChange('superficie_max', e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FilterAltOffIcon />}
                    onClick={clearFilters}
                  >
                    Limpiar
                  </Button>
                </Stack>
              </Paper>

              {/* TABLA */}
              <Paper>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={sortConfig.field === 'numero'}
                            direction={sortConfig.direction}
                            onClick={() => handleSort('numero')}
                          >
                            Lote
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortConfig.field === 'manzana'}
                            direction={sortConfig.direction}
                            onClick={() => handleSort('manzana')}
                          >
                            Manzana
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortConfig.field === 'superficie'}
                            direction={sortConfig.direction}
                            onClick={() => handleSort('superficie')}
                          >
                            Superficie (m²)
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortConfig.field === 'precio_base'}
                            direction={sortConfig.direction}
                            onClick={() => handleSort('precio_base')}
                          >
                            Precio Base
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Fecha Venta</TableCell>
                        <TableCell>Observaciones</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedLotes.map((lote) => (
                        <TableRow key={lote.id} hover>
                          <TableCell fontWeight={600}>{lote.numero}</TableCell>
                          <TableCell>{lote.manzana}</TableCell>
                          <TableCell>{lote.superficie}m²</TableCell>
                          <TableCell>
                            <Chip 
                              label={lote.estado} 
                              size="small"
                              color={getColorForEstado(lote.estado)}
                            />
                          </TableCell>
                          <TableCell>
                            ${lote.precio_base?.toLocaleString('es-AR') || 'No definido'}
                          </TableCell>
                          <TableCell>{lote.fecha_venta || '-'}</TableCell>
                          <TableCell>
                            {lote.observaciones ? (
                              <Tooltip title={lote.observaciones}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                  {lote.observaciones}
                                </Typography>
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={() => openEditarLote(lote)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => confirmDelete(lote)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={sortedLotes.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  labelRowsPerPage="Filas por página:"
                />
              </Paper>
            </>
          )}

          {activeTab === 1 && <CalculadoraPrecios emprendimientoId={parseInt(id)} lotes={lotes} />}

          {activeTab === 2 && <VistaDisponibilidad emprendimientoId={parseInt(id)} lotes={lotes} />}
        </Container>
      </Box>

      {/* DRAWER FORMULARIO LOTE */}
      <Drawer
        anchor="right"
        open={openLoteDrawer}
        onClose={() => setOpenLoteDrawer(false)}
        sx={{ '& .MuiDrawer-paper': { width: 500 } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            {editingLote ? 'Editar Lote' : 'Nuevo Lote'}
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              label="Número de Lote"
              value={loteForm.numero}
              onChange={(e) => setLoteForm(prev => ({ ...prev, numero: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Manzana"
              value={loteForm.manzana}
              onChange={(e) => setLoteForm(prev => ({ ...prev, manzana: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Superficie (m²)"
              type="number"
              value={loteForm.superficie}
              onChange={(e) => setLoteForm(prev => ({ ...prev, superficie: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Precio Base"
              type="number"
              value={loteForm.precio_base}
              onChange={(e) => setLoteForm(prev => ({ ...prev, precio_base: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Estado"
              select
              value={loteForm.estado}
              onChange={(e) => setLoteForm(prev => ({ ...prev, estado: e.target.value }))}
              fullWidth
            >
              <MenuItem value="DISPONIBLE">Disponible</MenuItem>
              <MenuItem value="VENDIDO">Vendido</MenuItem>
              <MenuItem value="RESERVADO">Reservado</MenuItem>
              <MenuItem value="BLOQUEADO">Bloqueado</MenuItem>
            </TextField>
            
            <TextField
              label="Observaciones"
              multiline
              rows={4}
              value={loteForm.observaciones}
              onChange={(e) => setLoteForm(prev => ({ ...prev, observaciones: e.target.value }))}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button 
              onClick={() => setOpenLoteDrawer(false)} 
              fullWidth
              color="inherit"
            >
              Cancelar
            </Button>
            <Button 
              onClick={saveLote} 
              variant="contained" 
              fullWidth
            >
              {editingLote ? 'Guardar' : 'Crear'}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* DIALOG CONFIRMAR ELIMINACIÓN */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, lote: null })}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el lote {deleteDialog.lote?.numero}?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, lote: null })}>
            Cancelar
          </Button>
          <Button onClick={deleteLote} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// COMPONENTE: Calculadora de Precios
const CalculadoraPrecios = ({ emprendimientoId, lotes }) => {
  const [step, setStep] = useState(1);
  const [selectedLote, setSelectedLote] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [condicionesEspeciales, setCondicionesEspeciales] = useState({
    anticipo_personalizado: '',
    descuento_adicional: '',
    precio_personalizado: ''
  });
  const [resultados, setResultados] = useState(null);

  const planesActivos = getPlanesActivos();
  const lotesDisponibles = lotes.filter(l => ['DISPONIBLE', 'RESERVADO'].includes(l.estado));

  const calcularPlan = () => {
    if (!selectedLote || !selectedPlan) return;

    const precioBase = condicionesEspeciales.precio_personalizado 
      ? parseFloat(condicionesEspeciales.precio_personalizado)
      : selectedLote.precio_base;

    const condiciones = [];
    if (condicionesEspeciales.anticipo_personalizado) {
      condiciones.push({
        tipo: 'anticipo_personalizado',
        valor: parseFloat(condicionesEspeciales.anticipo_personalizado)
      });
    }
    if (condicionesEspeciales.descuento_adicional) {
      condiciones.push({
        tipo: 'descuento_adicional',
        valor: parseFloat(condicionesEspeciales.descuento_adicional)
      });
    }

    const calculo = calcularFinanciacion(precioBase, selectedPlan.id, condiciones);
    setResultados(calculo);
  };

  useEffect(() => {
    if (selectedLote && selectedPlan) {
      calcularPlan();
    }
  }, [selectedLote, selectedPlan, condicionesEspeciales]);

  return (
    <Box>
      {/* WIZARD STEPS */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={4} alignItems="center">
          <Box sx={{ textAlign: 'center' }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                bgcolor: step >= 1 ? 'primary.main' : 'grey.300',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                mb: 1,
                mx: 'auto'
              }}
            >
              1
            </Box>
            <Typography variant="body2" color={step >= 1 ? 'primary' : 'text.secondary'}>
              Seleccionar Lote
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, height: 2, bgcolor: step >= 2 ? 'primary.main' : 'grey.300' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                bgcolor: step >= 2 ? 'primary.main' : 'grey.300',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                mb: 1,
                mx: 'auto'
              }}
            >
              2
            </Box>
            <Typography variant="body2" color={step >= 2 ? 'primary' : 'text.secondary'}>
              Plan de Financiación
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, height: 2, bgcolor: step >= 3 ? 'primary.main' : 'grey.300' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                bgcolor: step >= 3 ? 'primary.main' : 'grey.300',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                mb: 1,
                mx: 'auto'
              }}
            >
              3
            </Box>
            <Typography variant="body2" color={step >= 3 ? 'primary' : 'text.secondary'}>
              Resultados
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* PASO 1: Seleccionar Lote */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          1. Seleccionar Lote para Cotizar
        </Typography>
        <Grid container spacing={2}>
          {lotesDisponibles.map(lote => (
            <Grid item xs={12} sm={6} md={4} key={lote.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedLote?.id === lote.id ? 2 : 1,
                  borderColor: selectedLote?.id === lote.id ? 'primary.main' : 'grey.300',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                onClick={() => {
                  setSelectedLote(lote);
                  setStep(Math.max(step, 2));
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {lote.numero}
                    </Typography>
                    <Chip 
                      label={lote.estado} 
                      size="small"
                      color={lote.estado === 'DISPONIBLE' ? 'success' : 'warning'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Manzana {lote.manzana} • {lote.superficie}m²
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    ${lote.precio_base?.toLocaleString('es-AR')}
                  </Typography>
                  {lote.observaciones && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {lote.observaciones}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* PASO 2: Seleccionar Plan */}
      {step >= 2 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            2. Plan de Financiación
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {planesActivos.map(plan => (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedPlan?.id === plan.id ? 2 : 1,
                    borderColor: selectedPlan?.id === plan.id ? 'primary.main' : 'grey.300',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setStep(Math.max(step, 3));
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                      {plan.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {plan.descripcion}
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Cuotas:</Typography>
                        <Typography variant="body2" fontWeight={600}>{plan.cuotas_cantidad}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Interés mensual:</Typography>
                        <Typography variant="body2" fontWeight={600}>{plan.interes_mensual}%</Typography>
                      </Stack>
                      {plan.descuento_porcentaje > 0 && (
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Descuento:</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {plan.descuento_porcentaje}%
                          </Typography>
                        </Stack>
                      )}
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Entrega mín.:</Typography>
                        <Typography variant="body2" fontWeight={600}>{plan.entrega_inicial_minima}%</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* CONDICIONES ESPECIALES */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Condiciones Especiales (Opcional)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Precio Personalizado"
                type="number"
                fullWidth
                value={condicionesEspeciales.precio_personalizado}
                onChange={(e) => setCondicionesEspeciales(prev => ({
                  ...prev,
                  precio_personalizado: e.target.value
                }))}
                helperText="Dejar vacío para usar precio base del lote"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Anticipo Personalizado (%)"
                type="number"
                fullWidth
                value={condicionesEspeciales.anticipo_personalizado}
                onChange={(e) => setCondicionesEspeciales(prev => ({
                  ...prev,
                  anticipo_personalizado: e.target.value
                }))}
                helperText="Porcentaje diferente al del plan"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Descuento Adicional (%)"
                type="number"
                fullWidth
                value={condicionesEspeciales.descuento_adicional}
                onChange={(e) => setCondicionesEspeciales(prev => ({
                  ...prev,
                  descuento_adicional: e.target.value
                }))}
                helperText="Descuento extra sobre el plan"
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* PASO 3: Resultados */}
      {step >= 3 && selectedLote && selectedPlan && resultados && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            3. Cotización Detallada
          </Typography>
          
          {/* RESUMEN DEL LOTE Y PLAN */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  📍 Lote Seleccionado
                </Typography>
                <Typography variant="body2">
                  <strong>Lote:</strong> {selectedLote.numero} - Manzana {selectedLote.manzana}
                </Typography>
                <Typography variant="body2">
                  <strong>Superficie:</strong> {selectedLote.superficie}m²
                </Typography>
                <Typography variant="body2">
                  <strong>Precio Base:</strong> ${selectedLote.precio_base?.toLocaleString('es-AR')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  💰 Plan Seleccionado
                </Typography>
                <Typography variant="body2">
                  <strong>Plan:</strong> {selectedPlan.nombre}
                </Typography>
                <Typography variant="body2">
                  <strong>Cuotas:</strong> {selectedPlan.cuotas_cantidad}
                </Typography>
                <Typography variant="body2">
                  <strong>Interés:</strong> {selectedPlan.interes_mensual}% mensual
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* CÁLCULOS FINANCIEROS */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                💵 Resumen Financiero
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography>Precio Final:</Typography>
                  <Typography fontWeight={600}>${resultados.precio_final?.toLocaleString('es-AR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                  <Typography>Entrega Inicial ({resultados.porcentaje_entrega}%):</Typography>
                  <Typography fontWeight={600}>${resultados.entrega_inicial?.toLocaleString('es-AR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Typography>Monto a Financiar:</Typography>
                  <Typography fontWeight={600}>${resultados.monto_financiado?.toLocaleString('es-AR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography>Cuota Mensual:</Typography>
                  <Typography fontWeight={600}>${resultados.cuota_mensual?.toLocaleString('es-AR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                  <Typography>Total a Pagar:</Typography>
                  <Typography fontWeight={600}>${resultados.total_a_pagar?.toLocaleString('es-AR')}</Typography>
                </Stack>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📋 Cronograma de Pagos (Primeras 6 cuotas)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cuota</TableCell>
                      <TableCell align="right">Importe</TableCell>
                      <TableCell align="right">Saldo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultados.cronograma?.slice(0, 6).map((cuota, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell align="right">
                          ${cuota.importe?.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell align="right">
                          ${cuota.saldo_restante?.toLocaleString('es-AR')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {resultados.cronograma?.length > 6 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ fontStyle: 'italic' }}>
                          ... y {resultados.cronograma.length - 6} cuotas más
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

// COMPONENTE: Vista de Disponibilidad
const VistaDisponibilidad = ({ emprendimientoId, lotes }) => {
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [vistaMode, setVistaMode] = useState('GRID'); // GRID | LIST

  const lotesFiltrados = useMemo(() => {
    if (filtroEstado === 'TODOS') return lotes;
    return lotes.filter(lote => lote.estado === filtroEstado);
  }, [lotes, filtroEstado]);

  const estadisticas = useMemo(() => {
    const stats = {
      DISPONIBLE: lotes.filter(l => l.estado === 'DISPONIBLE').length,
      VENDIDO: lotes.filter(l => l.estado === 'VENDIDO').length,
      RESERVADO: lotes.filter(l => l.estado === 'RESERVADO').length,
      BLOQUEADO: lotes.filter(l => l.estado === 'BLOQUEADO').length
    };
    return stats;
  }, [lotes]);

  const getColorForEstado = (estado) => {
    switch (estado) {
      case 'DISPONIBLE': return '#4caf50';
      case 'VENDIDO': return '#2196f3';
      case 'RESERVADO': return '#ff9800';
      case 'BLOQUEADO': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  return (
    <Box>
      {/* CONTROLES */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              🗺️ Vista de Disponibilidad
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label={`Todos (${lotes.length})`}
                onClick={() => setFiltroEstado('TODOS')}
                color={filtroEstado === 'TODOS' ? 'primary' : 'default'}
                variant={filtroEstado === 'TODOS' ? 'filled' : 'outlined'}
              />
              <Chip 
                label={`Disponibles (${estadisticas.DISPONIBLE})`}
                onClick={() => setFiltroEstado('DISPONIBLE')}
                color={filtroEstado === 'DISPONIBLE' ? 'success' : 'default'}
                variant={filtroEstado === 'DISPONIBLE' ? 'filled' : 'outlined'}
              />
              <Chip 
                label={`Vendidos (${estadisticas.VENDIDO})`}
                onClick={() => setFiltroEstado('VENDIDO')}
                color={filtroEstado === 'VENDIDO' ? 'info' : 'default'}
                variant={filtroEstado === 'VENDIDO' ? 'filled' : 'outlined'}
              />
              <Chip 
                label={`Reservados (${estadisticas.RESERVADO})`}
                onClick={() => setFiltroEstado('RESERVADO')}
                color={filtroEstado === 'RESERVADO' ? 'warning' : 'default'}
                variant={filtroEstado === 'RESERVADO' ? 'filled' : 'outlined'}
              />
              <Chip 
                label={`Bloqueados (${estadisticas.BLOQUEADO})`}
                onClick={() => setFiltroEstado('BLOQUEADO')}
                sx={{ 
                  bgcolor: filtroEstado === 'BLOQUEADO' ? 'grey.400' : 'transparent',
                  color: filtroEstado === 'BLOQUEADO' ? 'white' : 'text.primary'
                }}
              />
            </Stack>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant={vistaMode === 'GRID' ? 'contained' : 'outlined'}
              onClick={() => setVistaMode('GRID')}
              size="small"
            >
              🔲 Grid
            </Button>
            <Button
              variant={vistaMode === 'LIST' ? 'contained' : 'outlined'}
              onClick={() => setVistaMode('LIST')}
              size="small"
            >
              📋 Lista
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* LEYENDA */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Leyenda de Estados:</Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50', borderRadius: 1 }} />
            <Typography variant="body2">Disponible</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#2196f3', borderRadius: 1 }} />
            <Typography variant="body2">Vendido</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#ff9800', borderRadius: 1 }} />
            <Typography variant="body2">Reservado</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#9e9e9e', borderRadius: 1 }} />
            <Typography variant="body2">Bloqueado</Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* VISTA GRID */}
      {vistaMode === 'GRID' && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {lotesFiltrados.map((lote) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={lote.id}>
                <Card 
                  sx={{ 
                    minHeight: 160,
                    border: 2,
                    borderColor: getColorForEstado(lote.estado),
                    bgcolor: lote.estado === 'DISPONIBLE' ? 'success.50' : 'grey.50',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Typography variant="h6" fontWeight={700}>
                        {lote.numero}
                      </Typography>
                      <Chip 
                        label={lote.estado} 
                        size="small"
                        sx={{ 
                          bgcolor: getColorForEstado(lote.estado),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Manzana: {lote.manzana}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Superficie: {lote.superficie}m²
                    </Typography>
                    
                    {lote.precio_base && (
                      <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>
                        ${lote.precio_base.toLocaleString('es-AR')}
                      </Typography>
                    )}
                    
                    {lote.fecha_venta && (
                      <Typography variant="caption" color="text.secondary">
                        Vendido: {new Date(lote.fecha_venta).toLocaleDateString('es-AR')}
                      </Typography>
                    )}
                    
                    {lote.observaciones && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          display: 'block',
                          mt: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {lote.observaciones}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* VISTA LISTA */}
      {vistaMode === 'LIST' && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lote</TableCell>
                  <TableCell>Manzana</TableCell>
                  <TableCell>Superficie</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Precio</TableCell>
                  <TableCell>Fecha Venta</TableCell>
                  <TableCell>Observaciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lotesFiltrados.map((lote) => (
                  <TableRow 
                    key={lote.id}
                    sx={{ 
                      bgcolor: lote.estado === 'DISPONIBLE' ? 'success.50' : 'inherit',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {lote.numero}
                      </Typography>
                    </TableCell>
                    <TableCell>{lote.manzana}</TableCell>
                    <TableCell>{lote.superficie}m²</TableCell>
                    <TableCell>
                      <Chip 
                        label={lote.estado} 
                        size="small"
                        sx={{ 
                          bgcolor: getColorForEstado(lote.estado),
                          color: 'white'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {lote.precio_base ? `$${lote.precio_base.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell>
                      {lote.fecha_venta ? new Date(lote.fecha_venta).toLocaleDateString('es-AR') : '-'}
                    </TableCell>
                    <TableCell>
                      {lote.observaciones ? (
                        <Tooltip title={lote.observaciones}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {lote.observaciones}
                          </Typography>
                        </Tooltip>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

EmprendimientoDetalle.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default EmprendimientoDetalle;