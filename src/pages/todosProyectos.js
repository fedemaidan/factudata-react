import { useState, useMemo, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import {
  Box,
  Button,
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
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useRouter } from 'next/router';
import { subDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TodosProyectosPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [proyectos, setProyectos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  // Estados de Filtros existentes
  const [filtroProyecto, setFiltroProyecto] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState([]);
  const [filtroSubcategoria, setFiltroSubcategoria] = useState([]);
  const [filtroProveedor, setFiltroProveedor] = useState([]);
  const [filtroMoneda, setFiltroMoneda] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState([]);
  const [filtroMontoMin, setFiltroMontoMin] = useState('');
  const [filtroMontoMax, setFiltroMontoMax] = useState('');
  const [filtroObservacion, setFiltroObservacion] = useState('');

const [filtroFechaDesde, setFiltroFechaDesde] = useState(subDays(new Date(), 7));
const [filtroFechaHasta, setFiltroFechaHasta] = useState(new Date());
const [ordenCampo, setOrdenCampo] = useState('codigo_operacion');
const [ordenDireccion, setOrdenDireccion] = useState('desc');


  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  const camposBase = {
    codigo_operacion: 'Código',
    proyecto: 'Proyecto',
    fecha_factura: 'Fecha',
    total: 'Monto',
    moneda: 'Moneda',
    type: 'Tipo',
  };
  
  const camposOpcionales = {
    categoria: 'Categoría',
    subcategoria: 'Subcategoría',
    nombre_proveedor: 'Proveedor',
    cuit_proveedor: 'CUIT Proveedor',
    observacion: 'Observación',
    total_original: 'Monto Original',
    medio_pago: 'Medio de pago',
    tipo_factura: 'Tipo de factura',
    caja_chica: 'Caja chica',
    tags_extra: 'Extras',
    subtotal: 'Subtotal',
    impuestos: 'Impuestos',
    numero_factura: 'Número de factura',
  };

  function formatearCampo(campo, valor) {
    if (valor === undefined || valor === null) return '-';
  
    switch (campo) {
      case 'fecha_factura':
        return formatTimestamp(valor); // ya tenés esta función
  
      case 'total':
      case 'total_original':
        return formatCurrency(valor); // ya tenés esta función también
  
      case 'type':
        return valor === 'ingreso' ? 'Ingreso' : 'Egreso';
  
      case 'caja_chica':
        return valor ? 'Sí' : 'No';
  
      case 'tags_extra':
        return Array.isArray(valor) ? valor.join(' - ') : valor;
      
      case 'impuestos':
        return Array.isArray(valor) ? valor.map((imp) => `${imp.nombre}: ${formatCurrency(imp.monto)}`).join(' - ') : valor;
  
      default:
        return valor;
    }
  }  

  
  const exportToExcel = () => {
    const exportData = movimientosFiltrados.map((mov) => {
      const fila = {};
      
      // Siempre incluir campos base
      for (let key in camposBase) {
        fila[camposBase[key]] = formatearCampo(key, mov[key]);
      }
  
      // Incluir opcionales según configuración
      for (let key in camposOpcionales) {
        if (empresa.comprobante_info?.[key]) {
          fila[camposOpcionales[key]] = formatearCampo(key, mov[key]);
        }
      }
  
      return fila;
    });
  
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'movimientos.xlsx');
  };
  
  
  const exportToCSV = () => {
    const camposExportables = {
      ...camposBase,
      ...Object.fromEntries(
        Object.entries(camposOpcionales).filter(
          ([key]) => empresa.comprobante_info?.[key]
        )
      ),
    };
  
    const headers = Object.values(camposExportables);
    const rows = movimientosFiltrados.map((mov) =>
      Object.keys(camposExportables).map((campo) =>
        formatearCampo(campo, mov[campo])
      )
    );
  
    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'movimientos.csv');
  };
  
  const exportToPDF = () => {
    const camposExportables = {
      ...camposBase,
      ...Object.fromEntries(
        Object.entries(camposOpcionales).filter(
          ([key]) => empresa.comprobante_info?.[key]
        )
      ),
    };
  
    const headers = [Object.values(camposExportables)];
    const rows = movimientosFiltrados.map((mov) =>
      Object.keys(camposExportables).map((campo) =>
        formatearCampo(campo, mov[campo])
      )
    );
  
    const doc = new jsPDF();
    autoTable(doc, {
      head: headers,
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210] },
    });
    doc.save('movimientos.pdf');
  };
  
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { empresaId } = router.query;
        let empresa;
        if (empresaId) {
          empresa = await getEmpresaById(empresaId);
          setEmpresa(empresa);
        } else {
          empresa = await getEmpresaDetailsFromUser(user);
          setEmpresa(empresa);
        }
        const proyectosData = await getProyectosFromUser(user);
        setProyectos(proyectosData);

        const movimientosData = [];
        for (const proyecto of proyectosData) {
          let movs;
          // Si se han seleccionado ambas fechas, se usa el rango personalizado
          if (filtroFechaDesde && filtroFechaHasta) {
            movs = await ticketService.getMovimientosEnRango(
              proyecto.id,
              filtroFechaDesde,
              filtroFechaHasta
            );
          }
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
  }, [user, filtroFechaDesde, filtroFechaHasta]);

  const movimientosFiltrados = useMemo(() => {
    const filtrados = movimientos.filter((mov) => {
      const matchProyecto = filtroProyecto.length === 0 || filtroProyecto.includes(mov.proyectoNombre);
      const matchSubcategoria = filtroSubcategoria.length === 0 || filtroSubcategoria.includes(mov.subcategoria);
      const matchProveedor = filtroProveedor.length === 0 || filtroProveedor.includes(mov.nombre_proveedor);
      const matchMoneda = filtroMoneda.length === 0 || filtroMoneda.includes(mov.moneda);
      const matchTipo = filtroTipo.length === 0 || filtroTipo.includes(mov.type);
      const matchCategoria = filtroCategoria.length === 0 || filtroCategoria.includes(mov.categoria);
      const matchMontoMin = filtroMontoMin ? mov.total >= parseFloat(filtroMontoMin) : true;
      const matchMontoMax = filtroMontoMax ? mov.total <= parseFloat(filtroMontoMax) : true;
      const matchObservacion = filtroObservacion ? mov.observacion?.toLowerCase().includes(filtroObservacion.toLowerCase()) : true;
  
      return matchProyecto && matchCategoria && matchSubcategoria && matchProveedor && matchMontoMin && matchMontoMax && matchObservacion && matchMoneda && matchTipo;
    });
  
    if (!ordenCampo) return filtrados;
  
    return [...filtrados].sort((a, b) => {
      const aVal = a[ordenCampo];
      const bVal = b[ordenCampo];
  
      if (aVal == null) return 1;
      if (bVal == null) return -1;
  
      if (typeof aVal === 'number') {
        return ordenDireccion === 'asc' ? aVal - bVal : bVal - aVal;
      }
  
      if (aVal instanceof Date) {
        return ordenDireccion === 'asc'
          ? new Date(aVal) - new Date(bVal)
          : new Date(bVal) - new Date(aVal);
      }
  
      return ordenDireccion === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [
    movimientos, filtroProyecto, filtroCategoria, filtroSubcategoria, filtroProveedor,
    filtroMontoMin, filtroMontoMax, filtroObservacion, filtroMoneda, filtroTipo,
    ordenCampo, ordenDireccion,
  ]);
  
  const totalesPorMoneda = useMemo(() => {
    return movimientosFiltrados.reduce((acc, mov) => {
      const valor = mov.type === 'ingreso' ? mov.total : -mov.total;
      if (mov.moneda === 'ARS') acc.ars += valor;
      if (mov.moneda === 'USD') acc.usd += valor;
      return acc;
    }, { ars: 0, usd: 0 });
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
              {/* Filtros existentes */}
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  multiple
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  label="Proyecto"
                >
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
                  multiple
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  label="Categoría"
                >
                  {categoriasUnicas.map((cat, i) => (
                    <MenuItem key={i} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Subcategoría</InputLabel>
                <Select
                  multiple
                  value={filtroSubcategoria}
                  onChange={(e) => setFiltroSubcategoria(e.target.value)}
                  label="Subcategoría"
                >
                  {subcategoriasUnicas.map((sub, i) => (
                    <MenuItem key={i} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Proveedor</InputLabel>
                <Select
                  multiple
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                  label="Proveedor"
                >
                  {proveedoresUnicos.map((prov, i) => (
                    <MenuItem key={i} value={prov}>{prov}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  multiple
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="ingreso">Ingreso</MenuItem>
                  <MenuItem value="egreso">Egreso</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Moneda</InputLabel>
                <Select
                  multiple
                  value={filtroMoneda}
                  onChange={(e) => setFiltroMoneda(e.target.value)}
                  label="Moneda"
                >
                  <MenuItem value="ARS">Pesos (ARS)</MenuItem>
                  <MenuItem value="USD">Dólares (USD)</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Monto Mínimo"
                type="number"
                value={filtroMontoMin}
                onChange={(e) => setFiltroMontoMin(e.target.value)}
              />
              <TextField
                label="Monto Máximo"
                type="number"
                value={filtroMontoMax}
                onChange={(e) => setFiltroMontoMax(e.target.value)}
              />
              <TextField
                label="Observación"
                value={filtroObservacion}
                onChange={(e) => setFiltroObservacion(e.target.value)}
                sx={{ minWidth: 200 }}
              />

              {/* NUEVO: Filtro de rango de fechas */}
              <Stack direction="row" spacing={1} alignItems="center">
                <DatePicker
                  selected={filtroFechaDesde}
                  onChange={(date) => setFiltroFechaDesde(date)}
                  selectsStart
                  startDate={filtroFechaDesde}
                  endDate={filtroFechaHasta}
                  placeholderText="Fecha Desde"
                  dateFormat="dd/MM/yyyy"
                />
                <DatePicker
                  selected={filtroFechaHasta}
                  onChange={(date) => setFiltroFechaHasta(date)}
                  selectsEnd
                  startDate={filtroFechaDesde}
                  endDate={filtroFechaHasta}
                  minDate={filtroFechaDesde}
                  placeholderText="Fecha Hasta"
                  dateFormat="dd/MM/yyyy"
                />
              </Stack>
            </Stack>
            <Stack direction="row" spacing={2}>
  <Button variant="outlined" onClick={exportToExcel}>Exportar a Excel</Button>
  <Button variant="outlined" onClick={exportToCSV}>Exportar a CSV</Button>
  <Button variant="outlined" onClick={exportToPDF}>Exportar a PDF</Button>
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
                        {[
                          ['codigo_operacion', 'Código'],
                          ['fecha_factura', 'Fecha'],
                          ['proyectoNombre', 'Proyecto'],
                          ['categoria', 'Categoría'],
                          ['subcategoria', 'Subcategoría'],
                          ['nombre_proveedor', 'Proveedor'],
                          ['observacion', 'Observación'],
                          ['type', 'Tipo'],
                          ['moneda', 'Moneda'],
                          ['total', 'Monto'],
                          ['total_original', 'Monto original'],
                        ].map(([campo, label]) => (
                          <TableCell
                            key={campo}
                            onClick={() => {
                              if (ordenCampo === campo) {
                                setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
                              } else {
                                setOrdenCampo(campo);
                                setOrdenDireccion('asc');
                              }
                            }}
                            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {label}
                            {ordenCampo === campo ? (ordenDireccion === 'asc' ? ' ▲' : ' ▼') : ''}
                          </TableCell>
                        ))}
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

