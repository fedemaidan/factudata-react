import { useState, useMemo, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import ticketService from 'src/services/ticketService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useRouter } from 'next/router';

const TodosProyectosPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [proyectos, setProyectos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  // Estados de Filtros
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('');
  const [filtroMontoMin, setFiltroMontoMin] = useState('');
  const [filtroMontoMax, setFiltroMontoMax] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroDias, setFiltroDias] = useState(7);
  const [filtroObservacion, setFiltroObservacion] = useState('');
  const [filtroMoneda, setFiltroMoneda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');


  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { empresaId } = router.query;
        let empresa;

        if (empresaId) {
          empresa = await getEmpresaById(empresaId);
        } else {
          empresa = await getEmpresaDetailsFromUser(user);
        }

        const proyectosData = await getProyectosByEmpresa(empresa);
        setProyectos(proyectosData);

        const movimientosData = [];
        for (const proyecto of proyectosData) {
          const movs = await ticketService.getLastMovimientosForProyecto(proyecto.id, filtroDias);
          movimientosData.push(...movs.map((m) => ({ ...m, proyectoNombre: proyecto.nombre })));
        }
        setMovimientos(movimientosData);
      } catch (error) {
        setAlert({ open: true, message: 'Error al cargar los movimientos.', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, filtroDias]);

  
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      console.log(mov)
      const matchProyecto = filtroProyecto ? mov.proyectoNombre.includes(filtroProyecto) : true;
      const matchCategoria = filtroCategoria ? mov.categoria?.includes(filtroCategoria) : true;
      const matchSubcategoria = filtroSubcategoria ? mov.subcategoria?.includes(filtroSubcategoria) : true;
      const matchProveedor = filtroProveedor ? mov.nombre_proveedor?.includes(filtroProveedor) : true;
      const matchMontoMin = filtroMontoMin ? mov.total >= parseFloat(filtroMontoMin) : true;
      const matchMontoMax = filtroMontoMax ? mov.total <= parseFloat(filtroMontoMax) : true;
      const matchObservacion = filtroObservacion ? mov.observacion?.toLowerCase().includes(filtroObservacion.toLowerCase()) : true;
      const matchMoneda = filtroMoneda ? mov.moneda === filtroMoneda : true;
      const matchTipo = filtroTipo ? mov.type === filtroTipo : true;



      return matchProyecto && matchCategoria && matchSubcategoria && matchProveedor && matchMontoMin && matchMontoMax && matchObservacion && matchMoneda && matchTipo;
    });
  }, [movimientos, filtroProyecto, filtroCategoria, filtroSubcategoria, filtroProveedor, filtroMontoMin, filtroMontoMax, filtroObservacion, filtroMoneda, filtroTipo]);

  const totalesPorMoneda = useMemo(() => {
    return movimientosFiltrados.reduce(
      (acc, mov) => {
        const valor = mov.type === 'ingreso' ? mov.total : -mov.total;
        if (mov.moneda === 'ARS') acc.ars += valor;
        if (mov.moneda === 'USD') acc.usd += valor;
        return acc;
      },
      { ars: 0, usd: 0 }
    );
  }, [movimientosFiltrados]);

  const categoriasUnicas = useMemo(() => {
    return [...new Set(movimientos.map(m => m.categoria).filter(Boolean))];
  }, [movimientos]);
  
  const subcategoriasUnicas = useMemo(() => {
    return [...new Set(movimientos.map(m => m.subcategoria).filter(Boolean))];
  }, [movimientos]);
  
  const proveedoresUnicos = useMemo(() => {
    return [...new Set(movimientos.map(m => m.nombre_proveedor).filter(Boolean))];
  }, [movimientos]);
  

  return (
    <>
      <Head>
        <title>Todos los Proyectos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Movimientos de Todos los Proyectos</Typography>

            {/* Filtros */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  label="Proyecto"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {proyectos.map((proyecto) => (
                    <MenuItem key={proyecto.id} value={proyecto.nombre}>
                      {proyecto.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  label="Categoría"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categoriasUnicas.map((cat, i) => (
                    <MenuItem key={i} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Subcategoría</InputLabel>
                <Select
                  value={filtroSubcategoria}
                  onChange={(e) => setFiltroSubcategoria(e.target.value)}
                  label="Subcategoría"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {subcategoriasUnicas.map((sub, i) => (
                    <MenuItem key={i} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                  label="Proveedor"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {proveedoresUnicos.map((prov, i) => (
                    <MenuItem key={i} value={prov}>{prov}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="ingreso">Ingreso</MenuItem>
                  <MenuItem value="egreso">Egreso</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={filtroMoneda}
                  onChange={(e) => setFiltroMoneda(e.target.value)}
                  label="Moneda"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="ARS">Pesos (ARS)</MenuItem>
                  <MenuItem value="USD">Dólares (USD)</MenuItem>
                </Select>
              </FormControl>

              <TextField label="Monto Mínimo" type="number" value={filtroMontoMin} onChange={(e) => setFiltroMontoMin(e.target.value)} />
              <TextField label="Monto Máximo" type="number" value={filtroMontoMax} onChange={(e) => setFiltroMontoMax(e.target.value)} />
              <TextField
                  label="Observación"
                  value={filtroObservacion}
                  onChange={(e) => setFiltroObservacion(e.target.value)}
                  sx={{ minWidth: 200 }}
                />


              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Días</InputLabel>
                <Select value={filtroDias} onChange={(e) => setFiltroDias(e.target.value)} label="Días">
                  <MenuItem value={7}>Últimos 7 días</MenuItem>
                  <MenuItem value={30}>Últimos 30 días</MenuItem>
                  <MenuItem value={90}>Últimos 90 días</MenuItem>
                  <MenuItem value={365}>Últimos 365 días</MenuItem>
                  <MenuItem value={730}>Últimos 2 años</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Loading */}
            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
              <Stack direction="row" spacing={4}>
                <Typography variant="h6">
                  Total en Pesos: {formatCurrency(totalesPorMoneda.ars)}
                </Typography>
                <Typography variant="h6">
                  Total en Dólares: {formatCurrency(totalesPorMoneda.usd)}
                </Typography>
              </Stack>

              <Paper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Proyecto</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Subcategoría</TableCell>
                      <TableCell>Proveedor</TableCell>
                      <TableCell>Observacion</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Moneda</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Monto original</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movimientosFiltrados.map((mov, index) => (
                      <TableRow key={index}>
                        <TableCell>{mov.codigo_operacion}</TableCell>
                        <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                        <TableCell>{mov.proyectoNombre}</TableCell>
                        <TableCell>{mov.categoria || '-'}</TableCell>
                        <TableCell>{mov.subcategoria || '-'}</TableCell>
                        <TableCell>{mov.nombre_proveedor || '-'}</TableCell>
                        <TableCell>{mov.observacion || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={mov.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                            color={mov.type === 'ingreso' ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{mov.moneda || '-'}</TableCell>
                        <TableCell>{formatCurrency(mov.total)}</TableCell>
                        <TableCell>{formatCurrency(mov.total_original)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

TodosProyectosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default TodosProyectosPage;
