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

import LoteParaTodosLayout from '../../../components/layouts/LoteParaTodosLayout';
import { 
  mockEmprendimientos,
  mockLotes,
  mockContratos,
  mockPlanes,
  getEmprendimientoById,
  getLotesByEmprendimiento,
  getPlanesActivos,
  calcularFinanciacion,
  // Nuevas importaciones
  CONDICION_LOTE,
  CONDICION_LOTE_LABELS,
  CONDICION_LOTE_COLORS,
  ESTADO_LEGAL_LABELS,
  SITUACION_FISICA_LABELS,
  getLotesDisponiblesParaVenta,
  getEstadisticasLotesPorEmprendimiento,
  CONDICIONES_PARA_NUEVA_RESERVA
} from 'src/data/loteParaTodos/index';
import * as XLSX from 'xlsx';

// Nuevos componentes
import NuevaReservaDialog from '../../../components/loteParaTodos/NuevaReservaDialog';
import LoteInfoExtendida from '../../../components/loteParaTodos/LoteInfoExtendida';
import LoteFormDrawer from '../../../components/loteParaTodos/LoteFormDrawer';

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
    condicion_lote: '', // Cambio de 'estado' a 'condicion_lote'
    estado_legal: '',
    situacion_fisica: '',
    superficie_min: '', 
    superficie_max: '',
    vendedor_responsable: ''
  });
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  // Nuevos estados para los componentes
  const [openLoteDrawer, setOpenLoteDrawer] = useState(false);
  const [openReservaDialog, setOpenReservaDialog] = useState(false);
  const [selectedLote, setSelectedLote] = useState(null);
  const [vistaDetallada, setVistaDetallada] = useState(false);
  const [editingLote, setEditingLote] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, lote: null });

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

  // Filtros actualizados
  const applyFilters = useMemo(() => {
    if (!lotes.length) return [];

    return lotes.filter(lote => {
      const matchNumero = !filters.numero || lote.numero.toLowerCase().includes(filters.numero.toLowerCase());
      const matchManzana = !filters.manzana || lote.manzana.toLowerCase().includes(filters.manzana.toLowerCase());
      const matchCondicion = !filters.condicion_lote || lote.condicion_lote === filters.condicion_lote;
      const matchEstadoLegal = !filters.estado_legal || lote.estado_legal === filters.estado_legal;
      const matchSituacionFisica = !filters.situacion_fisica || lote.situacion_fisica === filters.situacion_fisica;
      const matchSuperficieMin = !filters.superficie_min || lote.superficie >= parseInt(filters.superficie_min);
      const matchSuperficieMax = !filters.superficie_max || lote.superficie <= parseInt(filters.superficie_max);
      const matchVendedor = !filters.vendedor_responsable || lote.vendedor_responsable_id?.toString() === filters.vendedor_responsable;

      return matchNumero && matchManzana && matchCondicion && matchEstadoLegal && 
             matchSituacionFisica && matchSuperficieMin && matchSuperficieMax && matchVendedor;
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

  // Estadísticas actualizadas del emprendimiento
  const estadisticas = useMemo(() => {
    if (!lotes.length || !id) return {};
    return getEstadisticasLotesPorEmprendimiento(parseInt(id));
  }, [lotes, id]);

  // Funciones
  const handleSort = (field) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
  };

  const clearFilters = () => {
    setFilters({ 
      numero: '', 
      manzana: '', 
      condicion_lote: '', 
      estado_legal: '',
      situacion_fisica: '',
      superficie_min: '', 
      superficie_max: '',
      vendedor_responsable: ''
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Funciones actualizadas
  const openNuevoLote = () => {
    setEditingLote(null);
    setSelectedLote(null);
    setOpenLoteDrawer(true);
  };

  const openNuevaReserva = (lote) => {
    setSelectedLote(lote);
    setOpenReservaDialog(true);
  };

  const handleReservaCreada = (reservaData) => {
    // Actualizar el lote con la nueva condición
    const nuevosLotes = lotes.map(l => 
      l.id === reservaData.lote_id 
        ? { ...l, condicion_lote: reservaData.nueva_condicion_lote }
        : l
    );
    setLotes(nuevosLotes);
    
    // Aquí se podría hacer la llamada a la API para guardar la reserva
    console.log('Reserva creada:', reservaData);
  };

  const handleLoteGuardado = (loteData) => {
    if (loteData.id) {
      // Actualizar lote existente
      const nuevosLotes = lotes.map(l => 
        l.id === loteData.id ? loteData : l
      );
      setLotes(nuevosLotes);
    } else {
      // Crear nuevo lote
      const nuevoId = Math.max(...lotes.map(l => l.id), 0) + 1;
      setLotes(prev => [...prev, { ...loteData, id: nuevoId }]);
    }
  };

  const openEditarLote = (lote) => {
    setEditingLote(lote);
    setSelectedLote(lote);
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

  const getColorForCondicion = (condicion) => {
    return CONDICION_LOTE_COLORS[condicion] || 'default';
  };

  if (!emprendimiento) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <LoteParaTodosLayout currentModule="lotes" pageTitle={emprendimiento?.nombre || 'Detalle Emprendimiento'}>
      <Head>
        <title>{emprendimiento.nombre} - Lote Para Todos</title>
      </Head>
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

            {/* ESTADÍSTICAS ACTUALIZADAS */}
            <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
              <Chip 
                label={`Disponibles: ${estadisticas.disponibles || 0}`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`Pre-reservados: ${estadisticas.pre_reservados || 0}`} 
                color="info" 
                variant="outlined"
              />
              <Chip 
                label={`Reservados: ${estadisticas.reservados || 0}`} 
                color="warning" 
                variant="outlined"
              />
              <Chip 
                label={`Activos: ${estadisticas.activos || 0}`} 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={`No a la venta: ${estadisticas.no_a_la_venta || 0}`} 
                color="default" 
                variant="outlined"
              />
              <Chip 
                label={`Oficinas: ${estadisticas.oficinas || 0}`} 
                color="secondary" 
                variant="outlined"
              />
              <Chip 
                label={`Total: ${estadisticas.total || 0}`} 
                variant="filled"
              />
            </Stack>
          </Paper>

          {/* CONTROL DE VISTA */}
          <Paper sx={{ mb: 3, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Gestión de Lotes
              </Typography>
              <Button
                variant={vistaDetallada ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setVistaDetallada(!vistaDetallada)}
              >
                {vistaDetallada ? 'Vista Tabla' : 'Vista Detallada'}
              </Button>
            </Stack>
          </Paper>

          {/* FILTROS ACTUALIZADOS */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Número de Lote"
                      value={filters.numero}
                      onChange={(e) => handleFilterChange('numero', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Manzana"
                      value={filters.manzana}
                      onChange={(e) => handleFilterChange('manzana', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Condición"
                      select
                      value={filters.condicion_lote}
                      onChange={(e) => handleFilterChange('condicion_lote', e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">Todas</MenuItem>
                      {Object.entries(CONDICION_LOTE_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Estado Legal"
                      select
                      value={filters.estado_legal}
                      onChange={(e) => handleFilterChange('estado_legal', e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {Object.entries(ESTADO_LEGAL_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Situación Física"
                      select
                      value={filters.situacion_fisica}
                      onChange={(e) => handleFilterChange('situacion_fisica', e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">Todas</MenuItem>
                      {Object.entries(SITUACION_FISICA_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Sup. Min (m²)"
                      type="number"
                      value={filters.superficie_min}
                      onChange={(e) => handleFilterChange('superficie_min', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      size="small"
                      label="Sup. Max (m²)"
                      type="number"
                      value={filters.superficie_max}
                      onChange={(e) => handleFilterChange('superficie_max', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={2}>
                    <Button
                      variant="outlined"
                      startIcon={<FilterAltOffIcon />}
                      onClick={clearFilters}
                      fullWidth
                    >
                      Limpiar
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* VISTA DETALLADA DE LOTES */}
              {vistaDetallada ? (
                <Stack spacing={2}>
                  {paginatedLotes.map((lote) => (
                    <LoteInfoExtendida
                      key={lote.id}
                      lote={lote}
                      emprendimiento={emprendimiento}
                      onNuevaReserva={openNuevaReserva}
                      onEditarLote={openEditarLote}
                      onVerDocumentos={(emp) => console.log('Ver documentos:', emp)}
                    />
                  ))}
                  
                  {/* Paginación para vista detallada */}
                  <Paper>
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
                      labelRowsPerPage="Lotes por página:"
                    />
                  </Paper>
                </Stack>
              ) : (
              /* TABLA TRADICIONAL */
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
                        <TableCell>Condición</TableCell>
                        <TableCell>Estado Legal</TableCell>
                        <TableCell>Situación</TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortConfig.field === 'precio_base'}
                            direction={sortConfig.direction}
                            onClick={() => handleSort('precio_base')}
                          >
                            Precio Base
                          </TableSortLabel>
                        </TableCell>
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
                              label={CONDICION_LOTE_LABELS[lote.condicion_lote]} 
                              size="small"
                              color={getColorForCondicion(lote.condicion_lote)}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={ESTADO_LEGAL_LABELS[lote.estado_legal]} 
                              size="small"
                              color={lote.estado_legal === 'normal' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={SITUACION_FISICA_LABELS[lote.situacion_fisica]} 
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            ${lote.precio_base?.toLocaleString('es-AR') || 'No definido'}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1}>
                              {CONDICIONES_PARA_NUEVA_RESERVA.includes(lote.condicion_lote) && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => openNuevaReserva(lote)}
                                >
                                  {lote.condicion_lote === 'pre_reservado' ? 'Completar' : 'Reservar'}
                                </Button>
                              )}
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
                            </Stack>
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
              )}
      </Container>

      {/* DRAWER FORMULARIO LOTE ACTUALIZADO */}
      <LoteFormDrawer
        open={openLoteDrawer}
        onClose={() => setOpenLoteDrawer(false)}
        lote={editingLote}
        emprendimientoId={parseInt(id)}
        onSave={handleLoteGuardado}
      />

      {/* DIALOG NUEVA RESERVA */}
      <NuevaReservaDialog
        open={openReservaDialog}
        onClose={() => setOpenReservaDialog(false)}
        lote={selectedLote}
        emprendimiento={emprendimiento}
        onReservaCreada={handleReservaCreada}
      />

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
    </LoteParaTodosLayout>
  );
};

export default EmprendimientoDetalle;
