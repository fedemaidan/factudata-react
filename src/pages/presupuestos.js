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
} from '@mui/material';
import { useRouter } from 'next/router';
import { Delete, Edit, Save } from '@mui/icons-material';
import { useAuthContext } from 'src/contexts/auth-context';
import presupuestoService from 'src/services/presupuestoService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp } from 'src/utils/formatters';
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
        const {presupuestos, success} = await presupuestoService.listarPresupuestos(empresa.id);
        setPresupuestos(presupuestos);
      } catch (err) {
        setAlert({ open: true, message: 'Error al cargar presupuestos.', severity: 'error' });
      }
    };
    fetchData();
  }, [user]);

  const handleAgregarPresupuesto = async () => {
    try {
      if (!nuevoMonto || !nuevoProveedor || !nuevoProyecto) return;
      const {presupuesto} = await presupuestoService.crearPresupuesto({ empresa_id: empresaId, monto: parseFloat(nuevoMonto), proveedor: nuevoProveedor, proyecto_id: nuevoProyecto });
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
        nuevaFechaFin: formatFechaInput(item.fechaFin),
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
        <Container maxWidth="md">
          <Stack spacing={3}>
            <Typography variant="h4">Presupuestos</Typography>

            <Stack direction="row" spacing={2}>
              <TextField label="Monto" type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={nuevoProveedor}
                  onChange={(e) => setNuevoProveedor(e.target.value)}
                >
                  {proveedores.map((prov, index) => (
                    <MenuItem key={index} value={prov}>{prov}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={nuevoProyecto}
                  onChange={(e) => setNuevoProyecto(e.target.value)}
                >
                  {proyectos.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleAgregarPresupuesto}>Agregar</Button>
            </Stack>

            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Fecha inicio</TableCell>
                    <TableCell>Fecha fin</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Gastado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {presupuestos.map(p => (
                    <TableRow key={p.codigo}>
                      <TableCell>{p.codigo}</TableCell>
                      <TableCell>
                        {editing[p.codigo] ? (
                          <TextField
                            type="date"
                            value={formatFechaInput(p.fechaInicio)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPresupuestos(prev =>
                                prev.map(x => x.codigo === p.codigo ? { ...x, fechaInicio: parseFechaInput(val) } : x)
                              );
                            }}
                          />
                        ) : (
                          formatTimestamp(p.fechaInicio)
                        )}
                      </TableCell>
                      <TableCell>
                        {editing[p.codigo] ? (
                          <TextField
                            type="date"
                            value={formatFechaInput(p.fechaFin)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPresupuestos(prev =>
                                prev.map(x => x.codigo === p.codigo ? { ...x, fechaFin: parseFechaInput(val) } : x)
                              );
                            }}
                          />
                        ) : (
                          formatTimestamp(p.fechaFin)
                        )}
                      </TableCell>


                      <TableCell>
                        {editing[p.codigo] ? (
                          <TextField
                            type="number"
                            value={p.monto}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPresupuestos(prev => prev.map(x => x.codigo === p.codigo ? { ...x, monto: val } : x));
                            }}
                          />
                        ) : (
                          `$${p.monto}`
                        )}
                      </TableCell>
                      <TableCell>{p.proveedor || '-'}</TableCell>
                      <TableCell>{proyectos.find(pr => pr.id === p.proyecto_id)?.nombre || '-'}</TableCell>
                      <TableCell>$ {p.ejecutado || 0}</TableCell>
                      <TableCell>
                        {editing[p.codigo] ? (
                          <IconButton onClick={() => handleGuardar(p.codigo)}><Save /></IconButton>
                        ) : (
                          <IconButton onClick={() => setEditing(prev => ({ ...prev, [p.codigo]: true }))}><Edit /></IconButton>
                        )}
                        <IconButton onClick={() => handleEliminar(p.codigo)}><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>
        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
};

PresupuestosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default PresupuestosPage;
