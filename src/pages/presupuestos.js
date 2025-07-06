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
  IconButton,
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
  DialogTitle
} from '@mui/material';
import { LinearProgress } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { useRouter } from 'next/router';
import { Autorenew, Delete, Edit, Save } from '@mui/icons-material';
import { useAuthContext } from 'src/contexts/auth-context';
import presupuestoService from 'src/services/presupuestoService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { Timestamp } from 'firebase/firestore';
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

const parseFechaInput = (fechaString) => {
  if (!fechaString) return null;
  const [year, month, day] = fechaString.split('-').map(Number);
  return new Date(year, month - 1, day); // mes: 0-based
};



const PresupuestosPage = () => {

  const { user } = useAuthContext();
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState([]);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [nuevoProyecto, setNuevoProyecto] = useState('');
  const [proyectos, setProyectos] = useState([]);
  const [empresaId, setEmpresaId] = useState(null);
  const [editing, setEditing] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [proveedores, setProveedores] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [nuevaEtapa, setNuevaEtapa] = useState('');
  const [orderBy, setOrderBy] = useState('fechaInicio');
const [orderDirection, setOrderDirection] = useState('asc');
const [searchTerm, setSearchTerm] = useState('');
const [filteredPresupuestos, setFilteredPresupuestos] = useState([]);
const [deleteDialog, setDeleteDialog] = useState({ open: false, codigo: null });

useEffect(() => {
  const timeout = setTimeout(() => {
    const term = searchTerm.toLowerCase();
    setFilteredPresupuestos(
      presupuestos.filter((p) => {
        const proveedor = p.proveedor?.toLowerCase() || '';
        const etapa = p.etapa?.toLowerCase() || '';
        const proyecto = proyectos.find(pr => pr.id === p.proyecto_id)?.nombre?.toLowerCase() || '';
        return proveedor.includes(term) || etapa.includes(term) || proyecto.includes(term);
      })
    );
  }, 300);
  return () => clearTimeout(timeout);
}, [searchTerm, presupuestos, proyectos]);

const handleSort = (field) => {
  if (orderBy === field) {
    setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  } else {
    setOrderBy(field);
    setOrderDirection('asc');
  }
};

const sortedPresupuestos = [...presupuestos].sort((a, b) => {
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
        const etapas = empresa.etapas.map( etapa => etapa.nombre);
        setEtapas(etapas || []);

        const {presupuestos, success} = await presupuestoService.listarPresupuestos(empresa.id);
        setPresupuestos(presupuestos);
        setFilteredPresupuestos(presupuestos);

      } catch (err) {
        setAlert({ open: true, message: 'Error al cargar presupuestos.', severity: 'error' });
      }
    };
    fetchData();
  }, [user]);

  const handleAgregarPresupuesto = async () => {
    try {
      if (!nuevoMonto || !nuevoProveedor || !nuevoProyecto) return;
      const {presupuesto} = await presupuestoService.crearPresupuesto({ empresa_id: empresaId, monto: parseFloat(nuevoMonto), proveedor: nuevoProveedor, proyecto_id: nuevoProyecto, etapa: nuevaEtapa });
      setPresupuestos(prev => [...prev, presupuesto]);
      setNuevoMonto('');
      setNuevoProveedor('');
      setNuevoProyecto('');
    } catch (err) {
      setAlert({ open: true, message: 'Error al agregar presupuesto.', severity: 'error' });
    }
  };

  
  const safeToISOString = (f) => {
    if (!f) return null;
    try {
      if (typeof f.toDate === 'function') return f.toDate().toISOString();
      if (f._seconds) return new Date(f._seconds * 1000).toISOString();
      const d = new Date(f);
      return isNaN(d.getTime()) ? null : d.toISOString();
    } catch {
      return null;
    }
  };
  const dateToTimestamp = (input) => {
    if (!input) return null;
  
    try {
      if (input instanceof Date) {
        return Timestamp.fromDate(input);
      }
      if (typeof input === 'string') {
        const [year, month, day] = input.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return Timestamp.fromDate(date);
      }
      // ya es Timestamp
      if (input._seconds) {
        return input;
      }
    } catch (e) {
      console.error('Error en dateToTimestamp:', input, e);
    }
  
    return null;
  };
  
  
  const handleGuardar = async (codigo) => {
    const item = presupuestos.find(p => p.codigo === codigo);
    try {
      await presupuestoService.modificarPresupuesto(codigo, {
        nuevo_monto: item.monto,
        empresa_id: empresaId,
        nuevaFechaInicio: formatFechaInput(item.fechaInicio),
      });
      setEditing(prev => ({ ...prev, [codigo]: false }));
    } catch (err) {
      setAlert({ open: true, message: 'Error al editar presupuesto.', severity: 'error' });
    }
  };
  

  const handleEliminar = async (codigo) => {
    try {
      await presupuestoService.eliminarPresupuesto(codigo, empresaId);
      setPresupuestos(prev => prev.filter(p => p.codigo !== codigo));
    } catch (err) {
      setAlert({ open: true, message: 'Error al eliminar presupuesto.', severity: 'error' });
    }
  };

  return (
    <>
      <Head><title>Presupuestos</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth={false} sx={{ px: 4 }}>
      <Stack spacing={2}>
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
    <Typography variant="h4">Presupuestos</Typography>
    <Button
      variant="outlined"
      onClick={() => {
        const data = filteredPresupuestos.map((p) => ({
          Código: p.codigo,
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

  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
    <TextField
      label="Monto"
      type="number"
      value={nuevoMonto}
      onChange={(e) => setNuevoMonto(e.target.value)}
      size="small"
    />
    <FormControl sx={{ minWidth: 150 }} size="small">
      <InputLabel>Proveedor</InputLabel>
      <Select
        value={nuevoProveedor}
        onChange={(e) => setNuevoProveedor(e.target.value)}
        label="Proveedor"
      >
        {proveedores.map((prov, index) => (
          <MenuItem key={index} value={prov}>{prov}</MenuItem>
        ))}
      </Select>
    </FormControl>
    <FormControl sx={{ minWidth: 150 }} size="small">
      <InputLabel>Proyecto</InputLabel>
      <Select
        value={nuevoProyecto}
        onChange={(e) => setNuevoProyecto(e.target.value)}
        label="Proyecto"
      >
        {proyectos.map(p => (
          <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
        ))}
      </Select>
    </FormControl>
    <FormControl sx={{ minWidth: 150 }} size="small">
      <InputLabel>Etapa</InputLabel>
      <Select
        value={nuevaEtapa}
        onChange={(e) => setNuevaEtapa(e.target.value)}
        label="Etapa"
      >
        <MenuItem value="">(Ninguna)</MenuItem>
        {etapas.map((etapa, idx) => (
          <MenuItem key={idx} value={etapa}>{etapa}</MenuItem>
        ))}
      </Select>
    </FormControl>

    <Button variant="contained" onClick={handleAgregarPresupuesto} size="small">Agregar</Button>
  </Stack>

  <TextField
    label="Buscar proveedor, etapa o proyecto"
    variant="outlined"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    size="small"
    fullWidth
  />
</Stack>

            <Paper>


              <Table>
              <TableHead>
  <TableRow>
    {[
      { label: 'Código', field: 'codigo' },
      { label: 'Fecha inicio', field: 'fechaInicio' },
      { label: 'Monto', field: 'monto' },
      { label: 'Proveedor', field: 'proveedor' },
      { label: 'Etapa', field: 'etapa' },
      { label: 'Proyecto', field: 'proyecto_id' },
      { label: 'Gastado', field: 'ejecutado' },
      { label: '% Ejecutado', field: 'ejecutado' }, // sin sorting
      { label: 'Acciones' },
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

    return (
      <TableRow
        key={p.codigo}
        sx={esSobreejecucion ? { backgroundColor: '#ffe0e0' } : {}}
      >
        <TableCell>{p.codigo}</TableCell>
        <TableCell>{formatTimestamp(p.fechaInicio)}</TableCell>
        <TableCell>{formatCurrency(p.monto)}</TableCell>
        <TableCell>{p.proveedor || '-'}</TableCell>
        <TableCell>{p.etapa || '-'}</TableCell>
        <TableCell>{proyectos.find(pr => pr.id === p.proyecto_id)?.nombre || '-'}</TableCell>
        <TableCell>{formatCurrency(p.ejecutado || 0)}</TableCell>
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
        <TableCell>
          <IconButton onClick={() => handleGuardar(p.codigo)}><Save /></IconButton>
          <IconButton onClick={() => setEditing(prev => ({ ...prev, [p.codigo]: true }))}><Edit /></IconButton>
          <IconButton onClick={() => setDeleteDialog({ open: true, codigo: p.codigo })}>
  <Delete />
</IconButton>
          <IconButton onClick={() => handleRecalcularPresupuesto(p.id)}><Autorenew /></IconButton>
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
  open={deleteDialog.open}
  onClose={() => setDeleteDialog({ open: false, codigo: null })}
>
  <DialogTitle>Confirmar eliminación</DialogTitle>
  <DialogContent>
    <DialogContentText>
      ¿Estás seguro de que querés eliminar este presupuesto? Esta acción no se puede deshacer.
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteDialog({ open: false, codigo: null })}>Cancelar</Button>
    <Button
      color="error"
      onClick={async () => {
        await handleEliminar(deleteDialog.codigo);
        setDeleteDialog({ open: false, codigo: null });
      }}
    >
      Eliminar
    </Button>
  </DialogActions>
</Dialog>

      </Box>
    </>
  );
};

PresupuestosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default PresupuestosPage;
