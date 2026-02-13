import { useEffect, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Button,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Checkbox
} from '@mui/material';
import { LinearProgress } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { useRouter } from 'next/router';
import { Add, Delete } from '@mui/icons-material';
import { useAuthContext } from 'src/contexts/auth-context';
import presupuestoService from 'src/services/presupuestoService';
import MonedasService from 'src/services/monedasService';
import PresupuestoDrawer from 'src/components/PresupuestoDrawer';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import * as XLSX from 'xlsx';

const formatFechaInput = (fecha) => {
  if (!fecha) return '';

  try {
    if (typeof fecha.toDate === 'function') {
      // Timestamp de Firebase
      return fecha.toDate().toISOString().split('T')[0];
    }
    if (fecha._seconds) {
      // Timestamp crudo de Firebase
      return new Date(fecha._seconds * 1000).toISOString().split('T')[0];
    }

    const date = new Date(fecha);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formateando fecha para input:', fecha, error);
    return '';
  }
};



const PresupuestosPage = () => {

  const { user } = useAuthContext();
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [empresaId, setEmpresaId] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [proveedores, setProveedores] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');

  // Cotizaciones para mostrar montos indexados en su moneda_display
  const [dolarRate, setDolarRate] = useState(null);
  const [cacIndice, setCacIndice] = useState(null);

  // Drawer de presupuesto
  const [drawerPresupuesto, setDrawerPresupuesto] = useState({
    open: false,
    mode: 'crear',
    presupuesto: null,
  });
  const [orderBy, setOrderBy] = useState('fechaInicio');
  const [orderDirection, setOrderDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPresupuestos, setFilteredPresupuestos] = useState([]);
  const [selectedPresupuestos, setSelectedPresupuestos] = useState([]);
  const [deleteMultipleDialog, setDeleteMultipleDialog] = useState(false);

  const handleSelectPresupuesto = (codigo) => {
    setSelectedPresupuestos(prev => {
      if (prev.includes(codigo)) {
        return prev.filter(c => c !== codigo);
      } else {
        return [...prev, codigo];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPresupuestos.length === sortedPresupuestos.length) {
      setSelectedPresupuestos([]);
    } else {
      setSelectedPresupuestos(sortedPresupuestos.map(p => p.codigo));
    }
  };

  const handleEliminarMultiples = async () => {
    try {
      await Promise.all(
        selectedPresupuestos.map(codigo => 
          presupuestoService.eliminarPresupuesto(codigo, empresaId)
        )
      );
      setPresupuestos(prev => prev.filter(p => !selectedPresupuestos.includes(p.codigo)));
      setSelectedPresupuestos([]);
      setDeleteMultipleDialog(false);
      setAlert({ 
        open: true, 
        message: `Se eliminaron ${selectedPresupuestos.length} presupuestos correctamente.`, 
        severity: 'success' 
      });
    } catch (err) {
      setAlert({ open: true, message: 'Error al eliminar presupuestos.', severity: 'error' });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const term = searchTerm.toLowerCase();
      setFilteredPresupuestos(
        presupuestos.filter((p) => {
          const proveedor = p.proveedor?.toLowerCase() || '';
          const etapa = p.etapa?.toLowerCase() || '';
          const proyecto = proyectos.find(pr => pr.id === p.proyecto_id)?.nombre?.toLowerCase() || '';
          const matchTerm = proveedor.includes(term) || etapa.includes(term) || proyecto.includes(term);
          const matchTipo = filtroTipo === 'todos' || (p.tipo || 'egreso') === filtroTipo;
          return matchTerm && matchTipo;
        })
      );
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, presupuestos, proyectos, filtroTipo]);

  const handleSort = (field) => {
    if (orderBy === field) {
      setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(field);
      setOrderDirection('asc');
    }
  };

  const sortedPresupuestos = [...filteredPresupuestos].sort((a, b) => {
    const valA = a[orderBy] || '';
    const valB = b[orderBy] || '';
    if (typeof valA === 'number' && typeof valB === 'number') {
      return orderDirection === 'asc' ? valA - valB : valB - valA;
    }
    return orderDirection === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const handleRecalcularPresupuesto = async (id) => {
    try {
      const { success, presupuesto } = await presupuestoService.recalcularPresupuesto(id, empresaId);
      if (success) {
        setPresupuestos(prev =>
          prev.map(p => p.id === id ? presupuesto : p)
        );
        setAlert({ open: true, message: 'Presupuesto recalculado.', severity: 'success' });
      } else {
        setAlert({ open: true, message: 'No se pudo recalcular.', severity: 'warning' });
      }
    } catch (err) {
      setAlert({ open: true, message: 'Error al recalcular.', severity: 'error' });
    }
  };

  useEffect(() => {
    const fetchData = async () => {

      try {
        const { empresaId } = router.query;
        let empresa;

        if (empresaId) {
          empresa = await getEmpresaById(empresaId);
        } else {
          empresa = await getEmpresaDetailsFromUser(user);
        }

        const proyectosUsuario = await getProyectosFromUser(user);

        setProyectos(proyectosUsuario);
        setEmpresaId(empresa.id);
        setProveedores(empresa.proveedores || []);

        const categoriasEmpresa = empresa.categorias || [];
        const categoriasFormateadas = categoriasEmpresa.map(cat => ({
          name: cat.name,
          subcategorias: cat.subcategorias || [],
        }));
        setCategorias(categoriasFormateadas);

        const etapas = empresa.etapas ? empresa.etapas.map(etapa => etapa.nombre) : [];
        setEtapas(etapas || []);

        const { presupuestos, success } = await presupuestoService.listarPresupuestos(empresa.id);
        setPresupuestos(presupuestos);
        setFilteredPresupuestos(presupuestos);

        // Cargar cotizaciones para mostrar montos indexados en ARS
        try {
          const [dolarData, cacData] = await Promise.all([
            MonedasService.listarDolar({ limit: 1 }).catch(() => null),
            MonedasService.listarCAC({ limit: 1 }).catch(() => null),
          ]);
          if (dolarData?.[0]) {
            const d = dolarData[0];
            setDolarRate(d.blue?.venta || d.blue?.promedio || d.oficial?.venta || null);
          }
          if (cacData?.[0]) {
            setCacIndice(cacData[0].general || cacData[0].valor || null);
          }
        } catch (e) {
          console.warn('No se pudieron cargar cotizaciones:', e);
        }

      } catch (err) {
        console.log(err)
        setAlert({ open: true, message: 'Error al cargar presupuestos.', severity: 'error' });
      }
    };
    fetchData();
  }, [user]);

  const handleDrawerSuccess = async (message, presupuestoCreado) => {
    setAlert({ open: true, message, severity: 'success' });
    // Recargar todos los presupuestos
    try {
      const { presupuestos: lista } = await presupuestoService.listarPresupuestos(empresaId);
      setPresupuestos(lista);
    } catch (err) {
      console.error('Error al recargar presupuestos:', err);
    }
  };

  const abrirDrawerCrear = () => {
    setDrawerPresupuesto({ open: true, mode: 'crear', presupuesto: null });
  };

  const abrirDrawerEditar = (p) => {
    setDrawerPresupuesto({
      open: true,
      mode: 'editar',
      presupuesto: {
        id: p.id,
        codigo: p.codigo,
        monto: p.monto,
        moneda: p.moneda || 'ARS',
        moneda_display: p.moneda_display || p.moneda || 'ARS',
        indexacion: p.indexacion || null,
        monto_ingresado: p.monto_ingresado || p.monto,
        base_calculo: p.base_calculo || 'total',
        tipo: p.tipo || 'egreso',
        label: `#${p.codigo} — ${p.proveedor || proyectos.find(pr => pr.id === p.proyecto_id)?.nombre || 'Sin nombre'}`,
        historial: p.historial || [],
        ejecutado: p.ejecutado || 0,
        cotizacion_snapshot: p.cotizacion_snapshot || null,
      },
    });
  };

  return (
    <>
      <Head><title>Presupuestos</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth={false} sx={{ px: 4 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Presupuestos</Typography>
              <Stack direction="row" spacing={2}>
                {selectedPresupuestos.length > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteMultipleDialog(true)}
                  >
                    Eliminar ({selectedPresupuestos.length})
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={abrirDrawerCrear}
                >
                  Nuevo Presupuesto
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                  const data = filteredPresupuestos.map((p) => ({
                    Código: p.codigo,
                    Tipo: p.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
                    'Fecha inicio': formatTimestamp(p.fechaInicio),
                    Monto: p.monto,
                    Proveedor: p.proveedor,
                    Etapa: p.etapa,
                    Proyecto: proyectos.find((pr) => pr.id === p.proyecto_id)?.nombre || '',
                    Gastado: p.ejecutado,
                    '% Ejecutado': `${((p.ejecutado / p.monto) * 100).toFixed(1)}%`,
                  }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Presupuestos');
                  XLSX.writeFile(wb, 'presupuestos.xlsx');
                }}
              >
                Exportar a Excel
              </Button>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Buscar proveedor, etapa o proyecto"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="egreso">Egreso</MenuItem>
                  <MenuItem value="ingreso">Ingreso</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          <Paper>


            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedPresupuestos.length > 0 && selectedPresupuestos.length < sortedPresupuestos.length}
                      checked={sortedPresupuestos.length > 0 && selectedPresupuestos.length === sortedPresupuestos.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  {[
                    { label: 'Código', field: 'codigo' },
                    { label: 'Tipo', field: 'tipo' },
                    { label: 'Fecha inicio', field: 'fechaInicio' },
                    { label: 'Monto', field: 'monto' },
                    { label: 'Proveedor', field: 'proveedor' },
                    { label: 'Etapa', field: 'etapa' },
                    { label: 'Proyecto', field: 'proyecto_id' },
                    { label: 'Categoria', field: 'categoria' },
                    { label: 'SubCategoria', field: 'subCategoria' },
                    { label: 'Ejecutado', field: 'ejecutado' },
                    { label: 'Disponible', field: 'ejecutado' },
                    { label: '% Ejecutado', field: 'ejecutado' }, // sin sorting
                  ].map(({ label, field }) => (
                    <TableCell
                      key={label}
                      onClick={() => field && handleSort(field)}
                      sx={{ cursor: field ? 'pointer' : 'default' }}
                    >
                      {label}
                      {orderBy === field &&
                        (orderDirection === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {sortedPresupuestos.map(p => {
                  const porcentaje = p.monto ? (p.ejecutado / p.monto) * 100 : 0;
                  const esSobreejecucion = p.ejecutado > p.monto;

                  // Si tiene indexación, mostrar el valor actual en la moneda_display (ARS)
                  const tieneIndexacion = !!p.indexacion;
                  const monDisplay = p.moneda_display || p.moneda || 'ARS';

                  const convertirADisplay = (val) => {
                    if (!tieneIndexacion) return val;
                    // val está en la moneda de almacenamiento (CAC o USD), convertir a moneda_display (ARS)
                    if (p.indexacion === 'CAC' && cacIndice) return val * cacIndice;
                    if (p.indexacion === 'USD' && dolarRate) return val * dolarRate;
                    return val;
                  };

                  const fmtMonto = (val) => {
                    if (val === null || val === undefined) return '-';
                    const monMostrar = tieneIndexacion ? monDisplay : (p.moneda || 'ARS');
                    const valMostrar = tieneIndexacion ? convertirADisplay(val) : val;
                    if (monMostrar === 'USD') return `USD ${Number(valMostrar).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    return formatCurrency(valMostrar);
                  };

                  return (
                    <TableRow
                      key={p.codigo}
                      hover
                      onClick={() => abrirDrawerEditar(p)}
                      sx={{
                        cursor: 'pointer',
                        ...(esSobreejecucion ? { backgroundColor: '#ffe0e0' } : {}),
                        ...(selectedPresupuestos.includes(p.codigo) ? { backgroundColor: 'action.selected' } : {})
                      }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPresupuestos.includes(p.codigo)}
                          onChange={() => handleSelectPresupuesto(p.codigo)}
                        />
                      </TableCell>
                      <TableCell>{p.codigo}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          size="small"
                          color={p.tipo === 'ingreso' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {formatFechaInput(p.fechaInicio) || '-'}
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <span>{fmtMonto(p.monto)}</span>
                          {tieneIndexacion && (
                            <Chip label={`idx ${p.indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.6rem' } }} />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>{p.proveedor || '-'}</TableCell>
                      <TableCell>{p.etapa || '-'}</TableCell>
                      <TableCell>{proyectos.find(pr => pr.id === p.proyecto_id)?.nombre || '-'}</TableCell>
                      <TableCell>{p.categoria ||'-'}</TableCell>
                      <TableCell>{p.subcategoria || '-'}</TableCell>
                      <TableCell>{fmtMonto(p.ejecutado || 0)}</TableCell>
                      <TableCell>{fmtMonto((p.monto || 0) - (p.ejecutado || 0))}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color={esSobreejecucion ? 'error' : 'text.primary'}>
                            {porcentaje.toFixed(1)}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(porcentaje, 100)}
                            color={esSobreejecucion ? 'error' : 'primary'}
                            sx={{ height: 8, borderRadius: 2 }}
                          />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

            </Table>
          </Paper>

        </Container>
        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>

        <Dialog
          open={deleteMultipleDialog}
          onClose={() => setDeleteMultipleDialog(false)}
        >
          <DialogTitle>Confirmar eliminación múltiple</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Estás seguro de que querés eliminar {selectedPresupuestos.length} presupuesto(s)? Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteMultipleDialog(false)}>Cancelar</Button>
            <Button
              color="error"
              onClick={handleEliminarMultiples}
            >
              Eliminar {selectedPresupuestos.length} presupuesto(s)
            </Button>
          </DialogActions>
        </Dialog>

        {/* Drawer de Presupuesto (crear/editar) */}
        <PresupuestoDrawer
          open={drawerPresupuesto.open}
          onClose={() => setDrawerPresupuesto(prev => ({ ...prev, open: false }))}
          onSuccess={handleDrawerSuccess}
          mode={drawerPresupuesto.mode}
          empresaId={empresaId}
          userId={user?.uid}
          presupuesto={drawerPresupuesto.presupuesto}
          onRecalcular={handleRecalcularPresupuesto}
          showFullForm
          proyectos={proyectos}
          categorias={categorias}
          etapas={etapas}
          proveedoresEmpresa={proveedores}
        />

      </Box>
    </>
  );
};

PresupuestosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default PresupuestosPage;
