import { useState, useMemo, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Papa from 'papaparse'; // ya deberías tenerlo instalado
import Head from 'next/head';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TablePagination from '@mui/material/TablePagination';
import movimientosService from 'src/services/movimientosService';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Select,
  MenuItem,
  Menu,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  Switch,
  FormControlLabel,
  DialogActions,
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
import { Tooltip } from '@mui/material';
import { ColumnSelector } from 'src/components/columnSelector';
import { match } from 'assert';


const TodosProyectosPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [proyectos, setProyectos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [tableHeadArray, setTableHeadArray] = useState([]);
  const [categoriasUnicas, setCategoriasUnicas] = useState([]);
  const [proveedoresUnicos, setProveedoresUnicos] = useState([]);
  const [etapasUnicas, setEtapasUnicas] = useState([]);
  const [mediosPagoUnicos, setMediosPagoUnicos] = useState([]);
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
  const [filtroCuentaInterna, setFiltroCuentaInterna] = useState([]);
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('columnasVisibles');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [open, setOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  

const [filtroFechaDesde, setFiltroFechaDesde] = useState(subDays(new Date(), 7));
const [filtroFechaHasta, setFiltroFechaHasta] = useState(new Date());
const [ordenCampo, setOrdenCampo] = useState('codigo_operacion');
const [ordenDireccion, setOrdenDireccion] = useState('desc');

const [filtroMedioPago, setFiltroMedioPago] = useState([]);
const [filtroPalabrasSueltas, setFiltroPalabrasSueltas] = useState('');
const [filtroTagsExtra, setFiltroTagsExtra] = useState([]);

const [page, setPage] = useState(0); // Página actual
const [rowsPerPage, setRowsPerPage] = useState(10); // Filas por página

const [anchorElExport, setAnchorElExport] = useState(null);
const handleExportClick = (event) => setAnchorElExport(event.currentTarget);
const handleExportClose = () => setAnchorElExport(null);
const [filtroEtapa, setFiltroEtapa] = useState([]);

  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  const camposBase = {
    codigo_operacion: 'Código',
    proyecto: 'Proyecto',
    nombre_proveedor: 'Proveedor',
    fecha_factura: 'Fecha',
    total: 'Monto',
    moneda: 'Moneda',
    type: 'Tipo',
  };
  
  const camposOpcionales = {
    categoria: 'Categoría',
    subcategoria: 'Subcategoría',
    nombre_proveedor: 'Proveedor',
    // cuit_proveedor: 'CUIT Proveedor',
    observacion: 'Observación',
    total_original: 'Monto Original',
    medio_pago: 'Medio de pago',
    tipo_factura: 'Tipo de factura',
    caja_chica: 'Caja chica',
    tags_extra: 'Extras',
    subtotal: 'Subtotal',
    impuestos: 'Impuestos',
    numero_factura: 'Número de factura',
    cuenta_interna: 'Cuenta interna',
  };

  function getTableHeadArray(empresa) {
    const head_array = [
      ['codigo_operacion', 'Código'],
      ['fecha_creacion', 'Fecha creacion'],
      ['fecha_factura', 'Fecha'],
      ['proyectoNombre', 'Proyecto'],
      ['categoria', 'Categoría']]
    if (empresa.comprobante_info?.subcategoria) {
      head_array.push(['subcategoria', 'Subcategoría']);
    }
    if (empresa.comprobante_info?.medio_pago) {
      head_array.push(['medio_pago', 'Medio de pago']);
    }
    if (empresa.comprobante_info?.cuenta_interna) {
      head_array.push(['cuenta_interna', 'Cuenta Interna']);
    }

    if (empresa.comprobante_info?.impuestos) {
      head_array.push(['impuestos', 'Impuestos']);
    }

    head_array.push(
      ['subtotal_usd_blue', 'Subtotal USD Blue'],
      ['total_usd_blue', 'Total USD Blue'],
      ['subtotal_usd_oficial', 'Subtotal USD Oficial'],
      ['total_usd_oficial', 'Total USD Oficial']
    );

    head_array.push(
      ['nombre_proveedor', 'Proveedor'],
      ['etapa', 'Etapa'],
      ['observacion', 'Observación'],
      ['type', 'Tipo'],
      ['moneda', 'Moneda'])

    if (empresa.comprobante_info?.subtotal) {
      head_array.push(['subtotal', 'Subtotal']);
    }
    if (empresa.comprobante_info?.total_original) {
      head_array.push(['total_original', 'Total Original']);
    }
      head_array.push(
        ['total', 'Monto'],
      ['acciones', 'Acciones'],
    )
    return head_array;
  }

const handleImportCsv = async () => {
  if (!csvFile) return;
  setImportLoading(true);

  Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    complete: async function (results) {
      const rows = results.data;

      const errores = [];

      for (let i = 0; i < rows.length; i++) {
        const { id, ...campos } = rows[i];

        try {
          if (!id) throw new Error('Falta ID en la fila');

          const camposNormalizados = {};
          for (const key in campos) {
            const value = campos[key];
            if (value === '') continue; // no actualizar campos vacíos
            if (!isNaN(value) && value.trim() !== '') {
              camposNormalizados[key] = Number(value);
            } else {
              camposNormalizados[key] = value;
            }
          }

          await movimientosService.updateMovimiento(id, camposNormalizados);
        } catch (err) {
          console.error(err);
          errores.push({ fila: i + 2, error: err.message }); // +2 porque hay encabezado
        }
      }

      setImportLoading(false);
      setOpenImportDialog(false);
      fetchData(); // refrescá los datos
      setAlert({
        open: true,
        severity: errores.length === 0 ? 'success' : 'warning',
        message: errores.length === 0
          ? 'Importación exitosa'
          : `Algunos movimientos fallaron (${errores.length})`,
      });
    },
    error: function (err) {
      console.error(err);
      setAlert({ open: true, severity: 'error', message: 'Error al leer CSV' });
      setImportLoading(false);
    },
  });
};


  function formatearCampo(campo, valor) {
    if (valor === undefined || valor === null) return '-';
    switch (campo) {
      case 'fecha_factura':
      case 'fecha_creacion':
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
        return Array.isArray(valor) ? valor.map((imp) => `${imp.nombre}: ${formatCurrency(imp.monto)}`).join('\n') : valor;
  
        case 'subtotal_usd_blue':
        case 'total_usd_blue':
        case 'subtotal_usd_oficial':
        case 'total_usd_oficial':
          return formatCurrency(valor);

      default:
        return valor;
    }
  }  

  const columnasFiltradas = useMemo(() => {
    const tableHeadArrayConf = tableHeadArray.filter(([key]) => key !== 'acciones');
    return (tableHeadArrayConf || []).filter(([key]) => columnasVisibles?.[key]);
  }, [tableHeadArray, columnasVisibles]);
  
  
  const exportToExcel = () => {
    const exportData = movimientosFiltrados.map((mov) => {
      const fila = {};
      
      // Siempre incluir campos base
      for (let key in camposBase) {
        fila[camposBase[key]] = obtenerValorExportable(key, mov[key]);
      }
  
      // Incluir opcionales según configuración
      for (let key in camposOpcionales) {
        if (empresa.comprobante_info?.[key]) {
          fila[camposOpcionales[key]] = obtenerValorExportable(key, mov[key]);
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
  
  const exportAfipExcel = () => {
    const rows = movimientosFiltrados.map((mov) => {
      const camposAfip = {
        'FACTURA A': '1 - FACTURAS A',
        'FACTURA B': '6 - FACTURAS B',
        'FACTURA C': '11 - FACTURAS C',
      };
  
      const iva = mov.impuestos?.find(i => i.nombre.includes('IVA'))?.monto || 0;
      const otrosTributos = mov.impuestos?.filter(i => !i.nombre.includes('IVA'))
        .reduce((acc, i) => acc + (i.monto || 0), 0) || 0;
  
      const proveedor = (empresa.proveedores_data || []).find(p => p.id === mov.id_proveedor);
      const punto_venta  = mov.numero_factura?.split('-')[0] || '';
      const numero_desde = mov.numero_factura?.split('-')[1] || '';
  
      return {
        'Fecha': formatTimestamp(mov.fecha_factura,'DIA/MES/ANO') || '',
        'Tipo': camposAfip[mov.tipo_factura] || '',
        'Punto de Venta': parseInt(punto_venta) || '',
        'Número Desde': parseInt(numero_desde) || '',
        'Número Hasta': '',
        'Cód. Autorización': '',
        'Tipo Doc. Emisor': 'CUIT',
        'Nro. Doc. Emisor': proveedor?.cuit || '',
        'Denominación Emisor': proveedor?.razon_social || mov.nombre_proveedor || '',
        'Tipo Cambio': 1,
        'Moneda': mov.moneda === 'USD' ? 'U$S' : '$',
        'Imp. Neto Gravado': mov.subtotal || mov.total - iva - otrosTributos,
        'Imp. Neto No Gravado': 0,
        'Imp. Op. Exentas': 0,
        'Otros Tributos': otrosTributos,
        'IVA': iva,
        'Imp. Total': mov.total || 0
      };
    });
  
    if (!rows.length) return;
  
    const headers = Object.keys(rows[0]);
    const fileTitle = `Mis Comprobantes Recibidos - CUIT ${empresa?.cuit}`;
  
    // Primera fila “vacía” pero con la columna I (índice 8) seteada
    const firstRow = new Array(Math.max(headers.length, 9)).fill('');
    firstRow[8] = fileTitle; // Columna I
  
    const aoa = [
      firstRow,                           // Fila 1
      headers,                            // Fila 2: títulos
      ...rows.map(r => headers.map(h => r[h] ?? '')) // Datos
    ];
  
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AFIP Comprobantes');
  
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, `${fileTitle}.xlsx`);
  };
  
  const exportToCSV = () => {
    const camposExportables = {
      'id': 'id', 
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
        obtenerValorExportable(campo, mov[campo])
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
      setTableHeadArray(getTableHeadArray(empresa));
      
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
        const movsConEquivalencias = movs.map((m) => ({
          ...m,
          proyectoNombre: proyecto.nombre,
          subtotal_usd_blue: m.equivalencias?.subtotal?.usd_blue,
          total_usd_blue: m.equivalencias?.total?.usd_blue,
          subtotal_usd_oficial: m.equivalencias?.subtotal?.usd_oficial,
          total_usd_oficial: m.equivalencias?.total?.usd_oficial,
        }));
        
        movimientosData.push(...movsConEquivalencias);        
      }
      
      setMovimientos(movimientosData);
    } catch (error) {
      setAlert({ open: true, message: 'Error al cargar los movimientos.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, filtroFechaDesde, filtroFechaHasta]);

  const movimientosFiltrados = useMemo(() => {
    const filtrados = movimientos.filter((mov) => {
      const matchProyecto = filtroProyecto.length === 0 || filtroProyecto.includes(mov.proyectoNombre);
      const matchCategoria = filtroCategoria.length === 0 || filtroCategoria.includes(mov.categoria);
      const matchSubcategoria = filtroSubcategoria.length === 0 || filtroSubcategoria.includes(mov.subcategoria);
      const matchProveedor = filtroProveedor.length === 0 || filtroProveedor.includes(mov.nombre_proveedor);
      const matchMoneda = filtroMoneda.length === 0 || filtroMoneda.includes(mov.moneda);
      const matchTipo = filtroTipo.length === 0 || filtroTipo.includes(mov.type);
      const matchMontoMin = filtroMontoMin ? mov.total >= parseFloat(filtroMontoMin) : true;
      const matchMontoMax = filtroMontoMax ? mov.total <= parseFloat(filtroMontoMax) : true;
      const matchEtapa = filtroEtapa.length === 0 || filtroEtapa.includes(mov.etapa);

      const matchObservacion = filtroObservacion
        ? mov.observacion?.toLowerCase().includes(filtroObservacion.toLowerCase())
        : true;
    
      const matchMedioPago = filtroMedioPago.length === 0 || filtroMedioPago.includes(mov.medio_pago);
      const matchCuentaInterna = filtroCuentaInterna.length === 0 || filtroCuentaInterna.includes(mov.cuenta_interna);

      const matchTagsExtra = filtroTagsExtra.length === 0 || (
        Array.isArray(mov.tags_extra) &&
        filtroTagsExtra.every((tag) => mov.tags_extra.includes(tag))
      );
    
      const matchPalabrasSueltas =
          filtroPalabrasSueltas === '' ||
          Object.values(mov).some((valor) => {
            if (typeof valor === 'string') {
              return valor.toLowerCase().includes(filtroPalabrasSueltas.toLowerCase());
            }
            if (Array.isArray(valor)) {
              return valor.some((item) =>
                typeof item === 'string' &&
                item.toLowerCase().includes(filtroPalabrasSueltas.toLowerCase())
              );
            }
            return false;
          });

    
      return (
        matchProyecto &&
        matchCategoria &&
        matchSubcategoria &&
        matchProveedor &&
        matchMontoMin &&
        matchMontoMax &&
        matchObservacion &&
        matchMoneda &&
        matchTipo &&
        matchMedioPago &&
        matchTagsExtra &&
        matchPalabrasSueltas &&
        matchCuentaInterna &&
        matchEtapa
      );
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
    movimientos, filtroProyecto, filtroCategoria, filtroSubcategoria, filtroProveedor,filtroEtapa,
    filtroMontoMin, filtroMontoMax, filtroObservacion, filtroMoneda, filtroTipo,
    ordenCampo, ordenDireccion, filtroMedioPago, filtroTagsExtra, filtroPalabrasSueltas, filtroCuentaInterna
  ]);
  
  const movimientosPaginados = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return movimientosFiltrados.slice(start, end);
  }, [movimientosFiltrados, page, rowsPerPage]);
  
  const totalesPorMoneda = useMemo(() => {
    return movimientosFiltrados.reduce((acc, mov) => {
      const valor = mov.type === 'ingreso' ? mov.total : -mov.total;
      if (mov.moneda === 'ARS') acc.ars += valor;
      if (mov.moneda === 'USD') acc.usd += valor;
      return acc;
    }, { ars: 0, usd: 0 });
  }, [movimientosFiltrados]);

  
  const subcategoriasUnicas = useMemo(() => {
    return [...new Set(movimientos.map(m => m.subcategoria).filter(Boolean))];
  }, [movimientos]);
  
  
  
  useEffect(() => {
    if (empresa) {
      let todas = getTableHeadArray(empresa);
      setCategoriasUnicas(empresa?.categorias.map((cat) => cat.name));
      setMediosPagoUnicos(empresa?.medios_pago || []);
      setProveedoresUnicos(empresa?.proveedores_data?.map(p => p.nombre) || empresa?.proveedores)
      setEtapasUnicas(empresa?.etapas?.map(e => e.nombre) || []);
      
      todas = todas.filter(([key]) => key !== 'acciones');
  
      let porDefecto = columnasVisibles || {};
  
      // Agregar nuevas columnas si no estaban
      for (const [key] of todas) {
        if (!(key in porDefecto)) {
          porDefecto[key] = false; // por defecto apagadas
        }
      }
  
      // ✅ Si todas están en false, borro la variable del localStorage
      const algunaActiva = Object.values(porDefecto).some((val) => val === true);
      if (!algunaActiva) {
        localStorage.removeItem('columnasVisibles');
        porDefecto = {};
        // Activar columnas mínimas para no quedar vacío
        for (const [key] of todas) {
          if (['codigo_operacion', 'proyectoNombre', 'fecha_factura', 'total', 'moneda', 'type'].includes(key)) {
            porDefecto[key] = true;
          }
        }
      }
  
      setColumnasVisibles(porDefecto);
      localStorage.setItem('columnasVisibles', JSON.stringify(porDefecto));
    }
  }, [empresa]);
  
  

  function obtenerValorExportable(campo, valor) {
    if (valor === undefined || valor === null) return '';
  
    switch (campo) {
      case 'fecha_factura':
        return formatTimestamp(valor); // string legible
  
      case 'total':
      case 'total_original':
      case 'subtotal':
      case 'subtotal_usd_blue':
      case 'total_usd_blue':
      case 'subtotal_usd_oficial':
      case 'total_usd_oficial':
        return typeof valor === 'number' ? valor : Number(String(valor).replace(/[^\d.-]+/g, ''));
  
      case 'type':
        return valor === 'ingreso' ? 'Ingreso' : 'Egreso';
  
      case 'caja_chica':
        return valor ? 'Sí' : 'No';
  
      case 'tags_extra':
        return Array.isArray(valor) ? valor.join(' - ') : valor;
  
      case 'impuestos':
        return Array.isArray(valor)
          ? valor.map((imp) => `${imp.nombre}: ${imp.monto}`).join('\n')
          : valor;
  
      default:
        return valor;
    }
  }

  
  return (
    <>
      <Head>
        <title>Todos los Proyectos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Movimientos de Todos los Proyectos</Typography>

            <Accordion defaultExpanded>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">Filtros</Typography>
  </AccordionSummary>
  <AccordionDetails>

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
                <InputLabel>Etapa</InputLabel>
                <Select
                  multiple
                  value={filtroEtapa}
                  onChange={(e) => setFiltroEtapa(e.target.value)}
                  label="Etapa"
                >
                  {(etapasUnicas || []).map((etapa, i) => (
                    <MenuItem key={i} value={etapa}>{etapa}</MenuItem>
                  ))}
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
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Medio de pago</InputLabel>
                <Select
                  multiple
                  value={filtroMedioPago}
                  onChange={(e) => setFiltroMedioPago(e.target.value)}
                  label="Medio de pago"
                >
                  {mediosPagoUnicos.map((medio, i) => (
                    <MenuItem key={i} value={medio}>{medio}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Palabras sueltas"
                value={filtroPalabrasSueltas}
                onChange={(e) => setFiltroPalabrasSueltas(e.target.value)}
                sx={{ minWidth: 200 }}
              />

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Tags extra</InputLabel>
                <Select
                  multiple
                  value={filtroTagsExtra}
                  onChange={(e) => setFiltroTagsExtra(e.target.value)}
                  label="Tags extra"
                >
                  {[...new Set(
                    movimientos.flatMap(m => Array.isArray(m.tags_extra) ? m.tags_extra : [])
                  )].map((tag, i) => (
                    <MenuItem key={i} value={tag}>{tag}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Cuenta Interna</InputLabel>
                <Select
                  multiple
                  value={filtroCuentaInterna}
                  onChange={(e) => setFiltroCuentaInterna(e.target.value)}
                  label="Cuenta Interna"
                >
                  {["Cuenta A", "Cuenta B","Cuenta C"].map((cuenta, i) => (
                    <MenuItem key={i} value={cuenta}>{cuenta}</MenuItem>
                  ))}
                </Select>
              </FormControl>


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
              <Button variant="contained" onClick={fetchData}>Actualizar</Button>
              <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                <div>
                {user.admin && 
                <Button variant="contained" color="secondary" onClick={() => setOpenImportDialog(true)}>
                    Importar CSV
                  </Button>
                }
                  <Button
                    variant="outlined"
                    onClick={handleExportClick}
                    endIcon={<MoreVertIcon />}
                  >
                    Exportar
                  </Button>
                  <Menu
                    anchorEl={anchorElExport}
                    open={Boolean(anchorElExport)}
                    onClose={handleExportClose}
                  >
                    <MenuItem
                      onClick={() => { exportAfipExcel(); handleExportClose(); }}
                    >
                      <TableViewIcon fontSize="small" sx={{ mr: 1 }} />
                      AFIP (Excel)
                    </MenuItem>
                    <MenuItem
                      onClick={() => { exportToExcel(); handleExportClose(); }}
                    >
                      <TableViewIcon fontSize="small" sx={{ mr: 1 }} />
                      Excel
                    </MenuItem>
                    <MenuItem
                      onClick={() => { exportToCSV(); handleExportClose(); }}
                    >
                      <InsertDriveFileIcon fontSize="small" sx={{ mr: 1 }} />
                      CSV
                    </MenuItem>
                    <MenuItem
                      onClick={() => { exportToPDF(); handleExportClose(); }}
                    >
                      <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} />
                      PDF
                    </MenuItem>
                  </Menu>
                </div>
              </Stack>
            </Stack>
  </AccordionDetails>
</Accordion>



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
                  <Button onClick={() => setOpen(true)}>Columnas visibles</Button>
                  
<ColumnSelector
  open={open}
  setOpen={setOpen}
  columnasVisibles={columnasVisibles}
  setColumnasVisibles={setColumnasVisibles}
  tableHeadArray={tableHeadArray}
/>


                </Stack>
                <Paper>
                  <Table>
                  <TableHead>
  <TableRow>
    {columnasFiltradas.map(([campo, label]) => (
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
    <TableCell key="acciones">Acciones</TableCell>
  </TableRow>
</TableHead>



<TableBody>
  {movimientosPaginados.map((mov, index) => (
    <TableRow key={index}>
      {columnasFiltradas.map(([campo]) => (
        campo !== 'acciones' && (
          <TableCell key={campo}>{formatearCampo(campo, mov[campo])}</TableCell>
        )
      ))}
      <TableCell>
        <Button
          variant="outlined"
          size="small"
          onClick={() =>
            router.push(
              `/movementForm?movimientoId=${mov.id}&lastPageName='Ver movimientos'&proyectoId=${mov.proyecto_id}&proyectoName=${mov.proyectoNombre}&lastPageUrl=${router.asPath}`
            )
          }
        >
          Ver
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
                  </Table>
                  <TablePagination
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      component="div"
                      count={movimientosFiltrados.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={(event, newPage) => setPage(newPage)}
                      onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0); // reset page cuando cambia el tamaño
                      }}
                    />

                </Paper>
              </>
            )}
          </Stack>
          <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Importar CSV para actualizar movimientos</DialogTitle>
  <DialogContent>
    <input
      type="file"
      accept=".csv"
      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenImportDialog(false)}>Cancelar</Button>
    <Button
      variant="contained"
      disabled={!csvFile || importLoading}
      onClick={handleImportCsv}
    >
      {importLoading ? 'Importando...' : 'Importar'}
    </Button>
  </DialogActions>
</Dialog>

        </Container>
      </Box>
    </>
  );
};

TodosProyectosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default TodosProyectosPage;

