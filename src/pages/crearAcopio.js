import React, { useRef, useState } from 'react';
import { Box, Button, Container, Stack, Stepper, Step, StepLabel, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel,
  TextField, IconButton, Grid, Tooltip, Chip, Collapse
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ImageIcon from '@mui/icons-material/Image';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';

import ProgressBackdrop from 'src/components/importar/ProgressBackdrop';
import { Backdrop, CircularProgress } from '@mui/material';
// Nuevos componentes de pasos atómicos
import StepTipoAcopio from 'src/components/importar/StepTipoAcopio';
import StepProveedor from 'src/components/importar/StepProveedor';
import StepProyecto from 'src/components/importar/StepProyecto';
import StepIdentificacion from 'src/components/importar/StepIdentificacion';
import StepMetodoCarga from 'src/components/importar/StepMetodoCarga';
import StepCopiarAcopio from 'src/components/importar/StepCopiarAcopio';
import StepDesdeFactura from 'src/components/importar/StepDesdeFactura';
// Componentes existentes para subir archivo y ajustar columnas
import Step1SubirAjustar from 'src/components/importar/Step1SubirAjustar';
import Step2AjustarColumnas from 'src/components/importar/Step2AjustarColumnas';
import Step3RevisionFinal from 'src/components/importar/Step3RevisionFinal';
import useExtractionProcess from 'src/hooks/importar/useExtractionProcess';
import useColumnMapping from 'src/hooks/importar/useColumnMapping';
import { fmtMoney } from 'src/utils/importar/money';
import { toNumber } from 'src/utils/importar/numbers';
import { steps, METODO_CARGA, getStepsToSkip } from 'src/constant/importarSteps';
import { applyPriceFormulaToValue } from 'src/utils/importar/priceFormula';
import { codeFromDescription } from 'src/utils/importar/codeFromDescription';
import { formatCurrency } from 'src/utils/formatters';
import AcopioService from 'src/services/acopioService';
import { updateEmpresaDetails, getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { useRouter } from 'next/router';
import { Alert, Snackbar } from '@mui/material';
import {
  readSpreadsheetFile,
  guessMapping,
  buildProductosFromMatrix,
  toNumberSafe
} from 'src/components/importar/excelImportUtils';


const ImportarPage = () => {
  const router = useRouter();
  const { empresaId, acopioId } = router.query;
  const { setBreadcrumbs } = useBreadcrumbs();

  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [proveedoresOptions, setProveedoresOptions] = useState([]);
  const [proyectosOptions, setProyectosOptions] = useState([]);

  const [activeStep, setActiveStep] = useState(0);
  const [tipoLista, setTipoLista] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [codigo, setCodigo] = useState('');
  const [urls, setUrls] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [guideY, setGuideY] = useState(50);
  const [showGuide, setShowGuide] = useState(true);
  const [totalFacturaOriginal, setTotalFacturaOriginal] = useState(0); // Total original de factura importada
  const containerRef = useRef(null);
  const [draggingGuide, setDraggingGuide] = useState(false);

  // Estado para modo de extracción: 'rapido', 'balanceado', 'preciso'
  const [modoExtraccion, setModoExtraccion] = useState('balanceado');

  // Estados para diálogo de discrepancias
  const [discrepanciasDialogOpen, setDiscrepanciasDialogOpen] = useState(false);
  const [materialesConDiscrepancia, setMaterialesConDiscrepancia] = useState([]);
  const [confirmaciones, setConfirmaciones] = useState({});
  const [pendingPreviewData, setPendingPreviewData] = useState(null);
  // Estado para visor de imagen original
  const [imagenVisorOpen, setImagenVisorOpen] = useState(false);
  const [imagenVisorIndex, setImagenVisorIndex] = useState(0);
  // Estado para valores manuales (cuando el usuario quiere ingresar otro valor)
  const [valoresManuales, setValoresManuales] = useState({});
  const [mostrarManual, setMostrarManual] = useState({});

  const [finalRows, setFinalRows] = useState([]);
  const [selectionModel, setSelectionModel] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);

  // Nuevo estado para método de carga (ARCHIVO, MANUAL, COPIAR_ACOPIO, DESDE_FACTURA)
  const [metodoCarga, setMetodoCarga] = useState(null);

  // Setear breadcrumbs
  React.useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Acopios', href: `/acopios?empresaId=${empresaId}`, icon: <InventoryIcon fontSize="small" /> },
      { label: acopioId ? 'Editar Acopio' : 'Crear Acopio', icon: <AddIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [acopioId, empresaId, setBreadcrumbs]);

  const { cargando, progreso, procesar } = useExtractionProcess();
const {
  previewCols, setPreviewCols,
  previewRows, setPreviewRows,
  columnMapping, setColumnMapping,
  loadPreview, confirmMapping
} = useColumnMapping();


const [archivoTabla, setArchivoTabla] = useState(null);

const [includeHeaderAsRow, setIncludeHeaderAsRow] = useState(false);

  // Calcula qué steps saltar según el método de carga
  const stepsToSkip = React.useMemo(() => getStepsToSkip(metodoCarga), [metodoCarga]);

  // Avanza al siguiente step saltando los que corresponda
  const handleNext = () => {
    let next = activeStep + 1;
    while (next < steps.length && stepsToSkip.includes(next)) {
      next++;
    }
    setActiveStep(Math.min(next, steps.length - 1));
  };

  // Retrocede al step anterior saltando los que corresponda
  const handleBack = () => {
    let prev = activeStep - 1;
    while (prev >= 0 && stepsToSkip.includes(prev)) {
      prev--;
    }
    setActiveStep(Math.max(prev, 0));
  };

  // guía: helpers de eventos
  const yToPercentInContainer = (pageY) => {
    const el = containerRef.current; if (!el) return guideY;
    const rect = el.getBoundingClientRect();
    const y = Math.min(Math.max(pageY - rect.top, 0), rect.height);
    return (y / rect.height) * 100;
  };
  const onGuideMouseDown = (e) => { e.preventDefault(); setDraggingGuide(true); };
  const onContainerMouseMove = (e) => { if (draggingGuide) setGuideY(yToPercentInContainer(e.clientY)); };
  const onContainerMouseUp = () => setDraggingGuide(false);
  const onContainerLeave = () => setDraggingGuide(false);
  const onContainerTouchMove = (e) => {
    if (!draggingGuide) return; const t = e.touches?.[0]; if (!t) return;
    setGuideY(yToPercentInContainer(t.clientY));
  };
  const onContainerKeyDown = (e) => {
    if (!showGuide) return;
    const step = e.shiftKey ? 0.2 : 1;
    if (e.key === 'ArrowUp') { e.preventDefault(); setGuideY((v) => Math.max(0, v - step)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setGuideY((v) => Math.min(100, v + step)); }
  };

const onProcesar = async () => {
  if (!archivo) return;

  const nombre = archivo.name.toLowerCase();
  // Si es Excel o CSV, procesamos directo desde frontend
  if (nombre.endsWith('.xlsx') || nombre.endsWith('.csv')) {
    await onProcesarTabla(archivo); // 👈 esta función ya la tenés más abajo
    setActiveStep(6); // Ir a ajustar columnas
    return;
  }

  // Caso contrario, seguimos con el flujo OCR/imagen existente
  await procesar({
    archivo,
    rotation,
    guideY,
    meta: { tipoLista, proveedor, proyecto, valorTotal, modo: modoExtraccion },
    onPreviewReady: ({ rawRows, cols, rows, mapping, urls, tieneDiscrepancias }) => {
      // Función para limpiar campos internos de los materiales
      const limpiarMateriales = (materiales) => materiales.map(mat => {
        const { _verificacion, _extraccion_inicial, _requiere_confirmacion_usuario, materiales_requieren_input, resumen_verificacion, ...limpio } = mat;
        return limpio;
      });
      
      // DEBUG: Log para entender qué llega del backend
      console.log('[crearAcopio] tieneDiscrepancias del backend:', tieneDiscrepancias);
      console.log('[crearAcopio] rawRows recibidos:', rawRows?.length, 'materiales');
      console.log('[crearAcopio] Materiales con _verificacion:', rawRows?.filter(m => m._verificacion).length);
      console.log('[crearAcopio] Materiales con requiere_input:', rawRows?.filter(m => m._verificacion?.requiere_input).length);
      
      // Log detallado de cada material
      rawRows?.forEach((m, i) => {
        console.log(`[crearAcopio] Material ${i}: ${m.Nombre || m.nombre || 'Sin nombre'}`, {
          tiene_verificacion: !!m._verificacion,
          requiere_input: m._verificacion?.requiere_input,
          requiere_cantidad_input: m._verificacion?.requiere_cantidad_input,
          requiere_precio_input: m._verificacion?.requiere_precio_input,
          cantidad: m.cantidad,
          cant_original: m._verificacion?.cantidad_original,
          cant_verificada: m._verificacion?.cantidad_verificada,
          precio: m.precio_unitario,
          precio_original: m._verificacion?.precio_original,
          precio_verificado: m._verificacion?.precio_verificado
        });
      });
      
      // Las discrepancias ahora se manejan en el paso final (Step3RevisionFinal)
      // NO abrimos diálogo, sino que pasamos los materiales con sus discrepancias marcadas
      // El campo _verificacion contiene la info de discrepancias para mostrar en la grilla
      console.log('[crearAcopio] Continuando al preview. Discrepancias se validarán en paso final.');
      
      // Mantener los campos de verificación para mostrar en la grilla final
      const rawRowsConDiscrepancias = rawRows.map(mat => {
        const { _extraccion_inicial, _requiere_confirmacion_usuario, materiales_requieren_input, ...matLimpio } = mat;
        // Mantener _verificacion para que Step3RevisionFinal pueda mostrar las discrepancias
        return matLimpio;
      });
      
      loadPreview({ rawRows: rawRowsConDiscrepancias, cols, rows, mapping });
      setActiveStep(6); // Ir a ajustar columnas
      setUrls(urls);
    },
  });
};


const moveColumnValues = (field, fromIndex, direction = 'up') => {
  setFinalRows((rows) => {
    const newRows = [...rows];
    if (direction === 'up') {
      for (let i = fromIndex; i < newRows.length - 1; i++) {
        newRows[i][field] = newRows[i + 1][field];
      }
      newRows[newRows.length - 1][field] = '';
    } else {
      for (let i = newRows.length - 1; i > fromIndex; i--) {
        newRows[i][field] = newRows[i - 1][field];
      }
      newRows[0][field] = '';
    }
    return newRows;
  });
};

// Confirmar las cantidades y/o precios seleccionados por el usuario
const handleConfirmarDiscrepancias = () => {
  if (!pendingPreviewData) return;
  
  // Aplicar las confirmaciones a los materiales y limpiar campos internos
  const materialesConfirmados = materialesConDiscrepancia.map(mat => {
    // Limpiar campos internos que no deben ir al DataGrid
    const { _verificacion, _extraccion_inicial, _requiere_confirmacion_usuario, materiales_requieren_input, ...matLimpio } = mat;
    const nombreMat = mat.nombre || mat.Nombre || mat.descripcion;
    
    // Aplicar confirmación de código si hay discrepancia
    if (mat._verificacion?.requiere_codigo_input) {
      const codigoManual = valoresManuales[`${nombreMat}_codigo`];
      const codigoElegido = codigoManual !== undefined && codigoManual !== '' 
        ? codigoManual 
        : confirmaciones[`${nombreMat}_codigo`];
      if (codigoElegido !== undefined && codigoElegido !== '') {
        matLimpio.SKU = codigoElegido;
        matLimpio.codigo = codigoElegido;
        matLimpio._codigo_confirmado = true;
      }
    }
    
    // Aplicar confirmación de cantidad si hay discrepancia
    if (mat._verificacion?.requiere_cantidad_input) {
      // Primero revisar si hay valor manual
      const cantidadManual = valoresManuales[`${nombreMat}_cantidad`];
      const cantidadElegida = cantidadManual !== undefined && cantidadManual !== '' 
        ? cantidadManual 
        : confirmaciones[`${nombreMat}_cantidad`];
      if (cantidadElegida !== undefined && cantidadElegida !== '') {
        matLimpio.cantidad = parseFloat(cantidadElegida);
        matLimpio._cantidad_confirmada = true;
      }
    }
    
    // Aplicar confirmación de precio si hay discrepancia
    if (mat._verificacion?.requiere_precio_input) {
      // Primero revisar si hay valor manual
      const precioManual = valoresManuales[`${nombreMat}_precio`];
      const precioElegido = precioManual !== undefined && precioManual !== ''
        ? precioManual
        : confirmaciones[`${nombreMat}_precio`];
      if (precioElegido !== undefined && precioElegido !== '') {
        matLimpio.precio_unitario = parseFloat(precioElegido);
        matLimpio.Precio = parseFloat(precioElegido);
        matLimpio._precio_confirmado = true;
      }
    }
    
    return matLimpio;
  });

  // Continuar con el flujo normal
  const { cols, rows, mapping, urls } = pendingPreviewData;
  loadPreview({ rawRows: materialesConfirmados, cols, rows, mapping });
  setActiveStep(6);
  setUrls(urls);
  
  // Limpiar estados
  setDiscrepanciasDialogOpen(false);
  setMaterialesConDiscrepancia([]);
  setConfirmaciones({});
  setValoresManuales({});
  setMostrarManual({});
  setPendingPreviewData(null);
};

// NUEVO useEffect: carga empresa -> proveedores y proyectos
React.useEffect(() => {
  const cargar = async () => {
    if (!empresaId) return;
    try {
      const empresa = await getEmpresaById(empresaId);
      setProveedoresOptions(empresa?.proveedores || []);
      const proyectos = await getProyectosByEmpresa(empresa);
      setProyectosOptions(proyectos);
    } catch (err) {
      console.error('Error al cargar datos de empresa:', err);
    }
  };
  cargar();
}, [empresaId]);

React.useEffect(() => {
  const cargarAcopio = async () => {
    if (!acopioId) return;
    try {
      setEditando(true);
      setGuardando(true);
      const acopio = await AcopioService.obtenerAcopio(acopioId);
      if (!acopio) return;

      
      setCodigo(acopio.codigo || '');
      setTipoLista(acopio.tipo || '');
      setProveedor(acopio.proveedor || '');
      setProyecto(acopio.proyecto_id || '');
      setValorTotal(acopio.valorTotal || 0);
      setUrls(acopio.url_image || [])

      console.log(acopio, "acopio cargado");
      if (Array.isArray(acopio.url_imagen_compra) && acopio.url_imagen_compra.length) {
        setUrls(acopio.url_imagen_compra);
      }

      const movimientos = await AcopioService.obtenerCompras(acopioId);
      console.log(movimientos)
      setFinalRows(
        (movimientos || []).map((m, i) => ({
          id: m.id || i,
          codigo: m.codigo || '',
          descripcion: m.descripcion || '',
          cantidad: m.cantidad || 0,
          valorUnitario: m.valorUnitario || 0,
          valorTotal: m.valorTotal || 0,
        }))
      );
      setActiveStep(7); // Ir directo a revisión final cuando editamos

    } catch (error) {
      console.error('Error al cargar acopio:', error);
    } finally {
      setGuardando(false);
    }
  };

  cargarAcopio();
}, [acopioId]);

const columns = React.useMemo(() => {
  // Función para renderizar celdas con indicador de discrepancia MUY VISIBLE
  const renderCellConDiscrepancia = (params, campo) => {
    const verif = params.row._verificacion;
    const tieneDiscrepancia = campo === 'codigo' 
      ? verif?.requiere_codigo_input
      : campo === 'cantidad' 
        ? verif?.requiere_cantidad_input 
        : verif?.requiere_precio_input;
    
    if (!tieneDiscrepancia) {
      return params.formattedValue ?? params.value;
    }
    
    // Mostrar con indicador visual de discrepancia MUY VISIBLE
    const valorOriginal = campo === 'codigo' 
      ? verif?.codigo_original 
      : campo === 'cantidad' 
        ? verif?.cantidad_original 
        : verif?.precio_original;
    const valorVerificado = campo === 'codigo' 
      ? verif?.codigo_verificado 
      : campo === 'cantidad' 
        ? verif?.cantidad_verificada 
        : verif?.precio_verificado;
    
    return (
      <Tooltip 
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" fontWeight="bold">⚠️ Discrepancia detectada</Typography>
            <br />
            <Typography variant="caption">Lectura 1: {valorOriginal}</Typography>
            <br />
            <Typography variant="caption">Lectura 2: {valorVerificado}</Typography>
            <br />
            <Typography variant="caption" color="warning.light">Hacé clic para editar</Typography>
          </Box>
        }
        arrow
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          width: '100%',
          bgcolor: '#fff3cd',
          borderRadius: 1,
          px: 1,
          py: 0.5,
          border: '2px solid #ffc107',
          boxShadow: '0 0 8px rgba(255, 193, 7, 0.5)',
          animation: 'pulse 2s infinite',
          cursor: 'pointer',
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 4px rgba(255, 193, 7, 0.3)' },
            '50%': { boxShadow: '0 0 12px rgba(255, 193, 7, 0.7)' },
            '100%': { boxShadow: '0 0 4px rgba(255, 193, 7, 0.3)' }
          }
        }}>
          <WarningAmberIcon sx={{ fontSize: 18, color: '#ff9800' }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: '#856404' }}>
            {params.formattedValue ?? params.value}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  const common = [
    { 
      field: 'codigo', 
      headerName: 'Código', 
      flex: 1, 
      minWidth: 120, 
      editable: true,
      renderCell: (params) => renderCellConDiscrepancia(params, 'codigo')
    },
    { field: 'descripcion', headerName: 'Descripción', flex: 2, minWidth: 220, editable: true },
  ];

  if (tipoLista === 'materiales') {
    return [
      ...common,
      {
        field: 'cantidad',
        headerName: 'Cantidad',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.8,
        minWidth: 120,
        editable: true,
        valueGetter: (p) => toNumber(p.row.cantidad),
        renderCell: (params) => renderCellConDiscrepancia(params, 'cantidad')
      },
      {
        field: 'valorUnitario',
        headerName: 'Valor unitario',
        align: 'right',
        headerAlign: 'right',
        flex: 1,
        minWidth: 140,
        editable: true,
        valueGetter: (p) => toNumber(p.row.valorUnitario),
        valueFormatter: ({ value }) => formatCurrency(value),
        renderCell: (params) => renderCellConDiscrepancia(params, 'precio')
      },
      {
        field: 'valorTotal',
        headerName: 'Valor total',
        align: 'right',
        headerAlign: 'right',
        flex: 1,
        minWidth: 140,
        editable: true,
        valueGetter: (p) =>
          toNumber(p.row.valorTotal ?? (toNumber(p.row.cantidad) * toNumber(p.row.valorUnitario))),
        valueFormatter: ({ value }) => formatCurrency(value),
      },
    ];
  }

  return [
    ...common,
    {
      field: 'valorUnitario',
      headerName: 'Valor unitario',
      align: 'right',
      headerAlign: 'right',
      flex: 1,
      minWidth: 140,
      editable: true,
      valueGetter: (p) => toNumber(p.row.valorUnitario),
      valueFormatter: ({ value }) => formatCurrency(value),
      renderCell: (params) => renderCellConDiscrepancia(params, 'precio')
    },
  ];
}, [tipoLista]);
const guardarAcopio = async () => {
  try {
    setGuardando(true);

    const proyecto_nombre = proyectosOptions.find(p => p.id === proyecto)?.nombre;

    const acopio = {
      codigo: codigo?.trim() || `AC-${Date.now()}`,
      tipo: tipoLista,
      proveedor,
      proyecto_id: proyecto,
      proyecto_nombre,
      valorTotal: Number(valorTotal) || 0,
      url_imagen_compra: urls || [],
      productos: finalRows.map((r) => ({
        descripcion: r.descripcion,
        cantidad: Number(r.cantidad) || 1,
        valorUnitario: Number(r.valorUnitario) || 0,
        valorTotal: Number(r.valorTotal) || 0,
        codigo: r.codigo || '',
      })),
      empresaId,
    };

    if (proveedor && !proveedoresOptions.includes(proveedor)) {
      const nuevos = [...proveedoresOptions, proveedor];
      await updateEmpresaDetails(empresaId, { proveedores: nuevos });
    }
    console.log(acopio, "acopio a guardar");

    let nuevoAcopioId = acopioId;
    
    if (editando) {
      await AcopioService.editarAcopio(acopioId, acopio);
      setAlert({ open: true, message: '✏️ Acopio actualizado con éxito.', severity: 'success' });
    } else {
      const result = await AcopioService.crearAcopio(acopio);
      nuevoAcopioId = result?.acopioId;
      setAlert({ open: true, message: '✅ Acopio creado con éxito.', severity: 'success' });
    }

    // Redirigir al detalle del acopio
    setTimeout(() => {
      if (nuevoAcopioId) {
        router.push(`/movimientosAcopio?acopioId=${nuevoAcopioId}`);
      } else {
        router.push(`/acopios?empresaId=${empresaId}`);
      }
    }, 1500);
  } catch (error) {
    console.error('Error al guardar acopio:', error);
    setAlert({ open: true, message: '❌ Error al guardar acopio', severity: 'error' });
  } finally {
    setGuardando(false);
  }
};

async function onProcesarTabla(file) {
  try {
    const matrix = await readSpreadsheetFile(file);
    console.log(matrix, "matrix leída desde excel/csv en onProcesarTabla");

    if (!matrix || matrix.length === 0) {
      setAlert({ open: true, message: 'El archivo está vacío.', severity: 'warning' });
      return;
    }

    const headers = matrix[0].map((h, i) => h || `Col ${i + 1}`);
    const dataRows = matrix.slice(1);
    const mappingGuess = guessMapping(headers, tipoLista);

    // ✅ Guardamos todo dentro del hook
    loadPreview({
      rawRows: dataRows,   // filas reales sin header
      cols: headers,       // encabezados
      rows: dataRows.slice(0, 10), // preview
      mapping: mappingGuess,
    });

    // Seteamos para UI o debug
    setColumnMapping(mappingGuess);
    setArchivoTabla({ file, matrix });
    setAlert({
      open: true,
      message: 'Archivo leído correctamente. Ajustá las columnas si hace falta.',
      severity: 'info',
    });

  } catch (e) {
    console.error(e);
    setAlert({ open: true, message: 'No se pudo leer el archivo.', severity: 'error' });
  }
}


// cuando el usuario confirma el mapeo en Step2
function onConfirmColumns({ includeHeaderAsRow: includeHdr }) {
  setIncludeHeaderAsRow(!!includeHdr);
  if (!archivoTabla?.matrix) return;

  const nuevos = buildProductosFromMatrix(
    archivoTabla.matrix,
    columnMapping,
    !!includeHdr,
    tipoLista,
    acopioId
  );

  const merged = [...finalRows, ...nuevos];
  setFinalRows(merged);

  // recalcular valorTotal SOLO si es materiales
  // para lista_precios, mantener el valor inicial ingresado por el usuario
  if (tipoLista === 'materiales') {
    const total = merged.reduce((acc, p) =>
      acc + (toNumberSafe(p.valorTotal) || (toNumberSafe(p.cantidad) * toNumberSafe(p.valorUnitario))), 0);
    setValorTotal(total);
  }
  // Si es lista_precios, NO tocamos valorTotal - se mantiene el valor inicial

  setAlert({ open: true, message: `Se agregaron ${nuevos.length} ítems.`, severity: 'success' });
}



  const processRowUpdate = (newRow, oldRow) => {
    const updated = { ...newRow };
    
    // Limpiar flags de discrepancia cuando el usuario edita un campo
    if (updated._verificacion) {
      const verif = { ...updated._verificacion };
      // Si editó código, limpiar discrepancia de código
      if (newRow.codigo !== oldRow.codigo) {
        verif.requiere_codigo_input = false;
      }
      // Si editó cantidad, limpiar discrepancia de cantidad
      if (newRow.cantidad !== oldRow.cantidad) {
        verif.requiere_cantidad_input = false;
      }
      // Si editó precio, limpiar discrepancia de precio
      if (newRow.valorUnitario !== oldRow.valorUnitario) {
        verif.requiere_precio_input = false;
      }
      // Actualizar requiere_input general
      verif.requiere_input = verif.requiere_codigo_input || verif.requiere_cantidad_input || verif.requiere_precio_input;
      updated._verificacion = verif;
    }
    
    if (tipoLista === 'materiales') {
      const cantidad = toNumber(updated.cantidad);
      const valorUnitario = toNumber(updated.valorUnitario);
      if (String(newRow.valorTotal) === String(oldRow.valorTotal)) {
        updated.valorTotal = Number.isFinite(cantidad * valorUnitario) ? cantidad * valorUnitario : 0;
      }
      updated.cantidad = cantidad; updated.valorUnitario = valorUnitario;
    } else {
      updated.valorUnitario = toNumber(updated.valorUnitario);
      delete updated.cantidad; delete updated.valorTotal;
    }
    setFinalRows((rows) => rows.map((r, i) => (String((r.id ?? i)) === String(updated.id) ? updated : r)));
    return updated;
  };


  const onApplyPriceFormula = (formula, scope = 'all') => {
  if (!formula?.trim()) return;
  setFinalRows((rows) => {
    const setSelected = new Set(selectionModel.map(String));
    return rows.map((r, i) => {
      const id = String(r.id ?? `${i}`);
      if (scope === 'selected' && !setSelected.has(id)) return r;

      const nuevoVU = applyPriceFormulaToValue(r.valorUnitario, formula);
      const actualizado = { ...r, valorUnitario: nuevoVU };

      if (tipoLista === 'materiales') {
        const cant = toNumber(actualizado.cantidad);
        actualizado.valorTotal = cant * toNumber(nuevoVU);
      }
      return actualizado;
    });
  });
};

const onGenerateMissingCodes = ({ prefix = '', maxLen = 16 } = {}) => {
  setFinalRows((rows) => {
    const used = new Set(rows.map(r => String(r.codigo || '').trim()).filter(Boolean));
    return rows.map((r) => {
      const codigo = String(r.codigo || '').trim();
      if (codigo) return r;
      const nuevo = codeFromDescription(r.descripcion, { prefix, maxLen }, used);
      return { ...r, codigo: nuevo };
    });
  });
};

const onConfirmMapping = ({ includeHeaderAsRow } = {}) => {
  const normalized = confirmMapping(tipoLista, { includeHeaderAsRow });
  console.log('✅ normalized desde confirmMapping', normalized);
  if (!normalized?.length) {
    setAlert({ open: true, message: 'No se detectaron filas. Revisá el mapeo o el formato.', severity: 'warning' });
    return;
  }

  setFinalRows(normalized);
  setActiveStep(7); // Ir a revisión final
};

  const handleBulkDelete = () => {
    if (!selectionModel?.length) return;
    setFinalRows((rows) => rows.filter((r, idx) => !selectionModel.includes(String(r.id ?? `${idx}`))));
    setSelectionModel([]);
  };

  // Importar materiales desde Excel (reemplaza los actuales)
  const handleImportFromExcel = (materialesImportados) => {
    if (!materialesImportados?.length) {
      setAlert({ open: true, severity: 'warning', message: 'No se encontraron materiales en el archivo' });
      return;
    }
    
    // Reemplazar filas con los datos importados
    const nuevasFilas = materialesImportados.map((mat, idx) => ({
      id: mat.id || `excel-${idx}`,
      codigo: mat.codigo || '',
      descripcion: mat.descripcion || '',
      cantidad: mat.cantidad || 0,
      unidad: mat.unidad || '',
      valorUnitario: mat.valorUnitario || 0,
      valorTotal: mat.valorTotal || (mat.cantidad * mat.valorUnitario) || 0
    }));
    
    setFinalRows(nuevasFilas);
    setSelectionModel([]);
    setAlert({ 
      open: true, 
      severity: 'success', 
      message: `Se importaron ${nuevasFilas.length} materiales desde Excel` 
    });
  };

  const handleBulkPriceUpdate = () => {
    const mode = window.prompt('Escribí "%10" para aumentar 10%, o "=1500" para fijar a 1500. Cancelar para salir.');
    if (!mode) return;
    setFinalRows((rows) =>
      rows.map((r, i) => {
        const id = String(r.id ?? `${i}`);
        if (!selectionModel.includes(id)) return r;
        let nuevoVU = toNumber(r.valorUnitario);
        if (mode.startsWith('%')) { const pct = toNumber(mode.slice(1)) / 100; nuevoVU = nuevoVU * (1 + pct); }
        else if (mode.startsWith('=')) { nuevoVU = toNumber(mode.slice(1)); }
        const actualizado = { ...r, valorUnitario: nuevoVU };
        if (tipoLista === 'materiales') actualizado.valorTotal = toNumber(actualizado.cantidad) * nuevoVU;
        return actualizado;
      })
    );
  };

  const handleBulkRound = () => {
    setFinalRows((rows) =>
      rows.map((r, i) => {
        const id = String(r.id ?? `${i}`); if (!selectionModel.includes(id)) return r;
        const actualizado = { ...r };
        if (tipoLista === 'materiales') {
          actualizado.cantidad = Math.round(toNumber(actualizado.cantidad));
          actualizado.valorUnitario = Math.round(toNumber(actualizado.valorUnitario));
          actualizado.valorTotal = toNumber(actualizado.cantidad) * toNumber(actualizado.valorUnitario);
        } else {
          actualizado.valorUnitario = Math.round(toNumber(actualizado.valorUnitario));
        }
        return actualizado;
      })
    );
  };
const handleAddItem = (position = 'end', datosDefecto = null) => {
  setFinalRows((rows) => {
    const nuevo = datosDefecto ? {
      id: `nuevo-${Date.now()}`,
      ...datosDefecto
    } : {
      id: `nuevo-${Date.now()}`,
      codigo: '',
      descripcion: '',
      cantidad: tipoLista === 'materiales' ? 1 : undefined,
      valorUnitario: 0,
      valorTotal: tipoLista === 'materiales' ? 0 : undefined,
    };

    if (position === 'start') return [nuevo, ...rows];
    if (typeof position === 'number') {
      const copy = [...rows];
      copy.splice(position + 1, 0, nuevo);
      return copy;
    }
    return [...rows, nuevo];
  });
};
  const renderStep = () => {
    // Step 0: Tipo de acopio (lista_precios o materiales)
    if (activeStep === 0) {
      return (
        <StepTipoAcopio
          tipoLista={tipoLista}
          setTipoLista={setTipoLista}
          onNext={handleNext}
        />
      );
    }

    // Step 1: Proveedor
    if (activeStep === 1) {
      return (
        <StepProveedor
          proveedor={proveedor}
          setProveedor={setProveedor}
          proveedoresOptions={proveedoresOptions}
          onNext={handleNext}
        />
      );
    }

    // Step 2: Proyecto
    if (activeStep === 2) {
      return (
        <StepProyecto
          proyecto={proyecto}
          setProyecto={setProyecto}
          proyectosOptions={proyectosOptions}
          onNext={handleNext}
        />
      );
    }

    // Step 3: Identificación (código y valor total)
    if (activeStep === 3) {
      return (
        <StepIdentificacion
          codigo={codigo}
          setCodigo={setCodigo}
          valorTotal={valorTotal}
          setValorTotal={setValorTotal}
          proveedor={proveedor}
          tipoLista={tipoLista}
          onNext={handleNext}
        />
      );
    }

    // Step 4: Método de carga
    if (activeStep === 4) {
      return (
        <StepMetodoCarga
          tipoLista={tipoLista}
          metodoCarga={metodoCarga}
          onSelect={(metodo) => {
            setMetodoCarga(metodo);
            // Avanzar al siguiente step según el método elegido
            setActiveStep(5);
          }}
        />
      );
    }

    // Step 5: Subir archivo / Manual / Copiar acopio / Desde factura
    if (activeStep === 5) {
      // Según el método de carga, mostrar el componente adecuado
      if (metodoCarga === METODO_CARGA.COPIAR_ACOPIO) {
        return (
          <StepCopiarAcopio
            empresaId={empresaId}
            proveedor={proveedor}
            tipoLista={tipoLista}
            onSelectAcopio={(items) => {
              setFinalRows(items.map((item, i) => ({
                id: item.id || `copy-${i}`,
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                cantidad: item.cantidad || 1,
                valorUnitario: item.valorUnitario || 0,
                valorTotal: item.valorTotal || 0,
              })));
              // Calcular valorTotal si es materiales
              if (tipoLista === 'materiales') {
                const total = items.reduce((acc, p) => 
                  acc + (toNumberSafe(p.valorTotal) || (toNumberSafe(p.cantidad) * toNumberSafe(p.valorUnitario))), 0);
                setValorTotal(total);
              }
              // Ir directo a revisión final
              setActiveStep(7);
            }}
          />
        );
      }

      if (metodoCarga === METODO_CARGA.DESDE_FACTURA) {
        return (
          <StepDesdeFactura
            empresaId={empresaId}
            proveedor={proveedor}
            proyecto={proyecto}
            onSelectFacturas={(items, totalOriginal) => {
              setFinalRows(items.map((item, i) => ({
                id: item.id || `factura-${i}`,
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                cantidad: item.cantidad || 1,
                valorUnitario: item.valorUnitario || 0,
                valorTotal: item.valorTotal || 0,
              })));
              // Guardar el total original de la factura
              if (totalOriginal) {
                setTotalFacturaOriginal(totalOriginal);
                setValorTotal(totalOriginal);
              } else {
                // Calcular valorTotal si no hay total original
                const total = items.reduce((acc, p) => 
                  acc + (toNumberSafe(p.valorTotal) || (toNumberSafe(p.cantidad) * toNumberSafe(p.valorUnitario))), 0);
                setValorTotal(total);
              }
              // Ir directo a revisión final
              setActiveStep(7);
            }}
          />
        );
      }

      if (metodoCarga === METODO_CARGA.MANUAL) {
        // Para carga manual, agregar una fila vacía y pasar a revisión final
        setFinalRows([{
          id: `nuevo-${Date.now()}`,
          codigo: '',
          descripcion: '',
          cantidad: tipoLista === 'materiales' ? 1 : undefined,
          valorUnitario: 0,
          valorTotal: tipoLista === 'materiales' ? 0 : undefined,
        }]);
        setActiveStep(7);
        return null;
      }

      // METODO_CARGA.ARCHIVO - mostrar componente para subir archivo
      return (
        <Step1SubirAjustar
          archivo={archivo} setArchivo={setArchivo}
          rotation={rotation} setRotation={setRotation}
          guideY={guideY} setGuideY={setGuideY}
          showGuide={showGuide} setShowGuide={setShowGuide}
          containerRef={containerRef}
          draggingGuide={draggingGuide} setDraggingGuide={setDraggingGuide}
          onContainerKeyDown={onContainerKeyDown}
          onContainerMouseMove={onContainerMouseMove}
          onContainerMouseUp={onContainerMouseUp}
          onContainerLeave={onContainerLeave}
          onContainerTouchMove={onContainerTouchMove}
          onGuideMouseDown={onGuideMouseDown}
          onProcesar={onProcesar}
          modoExtraccion={modoExtraccion}
          setModoExtraccion={setModoExtraccion}
        />
      );
    }

    // Step 6: Ajustar columnas
    if (activeStep === 6) {
      return (
        <Step2AjustarColumnas
          tipoLista={tipoLista}
          previewCols={previewCols}
          previewRows={previewRows}
          columnMapping={columnMapping}
          setColumnMapping={setColumnMapping}
          onConfirm={onConfirmMapping} 
        />
      );
    }

    // Step 7: Revisión final
    // Contar materiales con discrepancias pendientes
    const discrepanciasPendientes = finalRows.filter(r => r._verificacion?.requiere_input).length;
    
    return (
     <Step3RevisionFinal
  // datos
  tipoLista={tipoLista}
  proveedor={proveedor}
  proyecto={proyecto}
  valorTotal={valorTotal}
  codigo={codigo}
  totalFacturaOriginal={totalFacturaOriginal}
  setTotalFacturaOriginal={setTotalFacturaOriginal}
  // setters para edición inline
  setProveedor={setProveedor}
  setProyecto={setProyecto}
  setValorTotal={setValorTotal}
  setCodigo={setCodigo}
  proveedoresOptions={proveedoresOptions}
  proyectosOptions={proyectosOptions}
  // grilla
  rows={finalRows}
  columns={columns}
  selectionModel={selectionModel}
  setSelectionModel={setSelectionModel}
  processRowUpdate={processRowUpdate}
  onProcessRowUpdateError={(err) => {
    console.error(err);
    setAlert({ open: true, severity: 'error', message: 'No se pudo aplicar el cambio' });
  }}
  // acciones
  onBulkDelete={handleBulkDelete}
  onBulkPriceUpdate={handleBulkPriceUpdate}
  onBulkRound={handleBulkRound}
  onApplyPriceFormula={onApplyPriceFormula}
  onGenerateMissingCodes={onGenerateMissingCodes}
  moveColumnValues={moveColumnValues}
  handleAddItem={handleAddItem}
  onGuardarAcopio={guardarAcopio}
  onImportFromExcel={handleImportFromExcel}
  // flags
  guardando={guardando}
  editando={editando}
  // discrepancias
  discrepanciasPendientes={discrepanciasPendientes}
  // imágenes del documento
  imageUrls={urls}
  archivoPreview={archivo}
/>
    );
  };




  const previewUrl = React.useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
React.useEffect(() => {
  return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
}, [previewUrl]);

return (
  <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h5" gutterBottom>
        Importar lista de precios o materiales
      </Typography>

      <Stack direction="row" spacing={2} alignItems="flex-start">
{/* Panel de vista previa - ocultar en revisión final (step 7) porque ya tiene su propio visor */}
{(archivo || (urls?.length > 0)) && activeStep > 5 && activeStep !== 7 && (
  <Paper
    sx={{
      width: { xs: '100%', md: '22%', lg: '18%' },
      minWidth: { md: 220 },
      maxWidth: { md: 320 },
      height: { xs: 280, md: 'calc(100vh - 140px)' },
      position: { md: 'sticky' },
      top: { md: 80 },
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#fafafa',
      border: '1px solid #ddd',
      flexShrink: 0,
      borderRadius: 2,
    }}
  >
    {archivo ? (
      // 📸 Vista previa desde archivo subido
      archivo.type?.startsWith('image') ? (
        <img
          src={URL.createObjectURL(archivo)}
          alt="Vista previa"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease',
          }}
        />
      ) : archivo.type === 'application/pdf' ? (
        <embed
          src={URL.createObjectURL(archivo)}
          type="application/pdf"
          width="100%"
          height="100%"
        />
      ) : (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          Vista previa no disponible
        </Typography>
      )
    ) : urls?.[0] ? (
      // 🌐 Vista previa desde URL almacenada
      urls[0].toLowerCase().endsWith('.pdf') ? (
        <embed
          src={urls[0]}
          type="application/pdf"
          width="100%"
          height="100%"
        />
      ) : (
        <img
          src={urls[0]}
          alt="Vista previa"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      )
    ) : (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        Vista previa no disponible
      </Typography>
    )}
  </Paper>
)}


        {/* Contenido principal (columna derecha) */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              mb: 3, 
              overflowX: 'auto',
              '& .MuiStepLabel-label': {
                fontSize: { xs: '0.75rem', md: '0.875rem' }
              }
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStep()}

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            {activeStep > 0 && <Button onClick={handleBack} disabled={cargando}>Atrás</Button>}
            {activeStep < steps.length - 1 && <Button onClick={handleNext} disabled={cargando}>Siguiente</Button>}
          </Stack>
        </Box>
      </Stack>
    </Container>
<Snackbar
  open={alert.open}
  autoHideDuration={4000}
  onClose={() => setAlert({ ...alert, open: false })}
>
  <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
    {alert.message}
  </Alert>
</Snackbar>

    <ProgressBackdrop open={cargando} progreso={progreso} />
    <Backdrop
  open={guardando}
  sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
>
  <CircularProgress color="inherit" />
</Backdrop>

    {/* Diálogo para confirmar discrepancias en cantidades y/o precios */}
    <Dialog 
      open={discrepanciasDialogOpen} 
      onClose={() => {}}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningAmberIcon color="warning" />
            <Typography variant="h6">Verificar datos con discrepancias</Typography>
            <Chip 
              label={`${materialesConDiscrepancia.filter(m => m._verificacion?.requiere_input).length} materiales`}
              color="warning"
              size="small"
            />
          </Stack>
          <Tooltip title="Ver documento original">
            <IconButton 
              onClick={() => setImagenVisorOpen(!imagenVisorOpen)}
              color={imagenVisorOpen ? 'primary' : 'default'}
            >
              <ImageIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Panel izquierdo: Lista de discrepancias */}
          <Grid item xs={imagenVisorOpen ? 6 : 12} sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Solo se muestran los materiales donde la IA detectó diferencias entre lecturas.
              Podés elegir uno de los valores detectados o ingresar el valor correcto manualmente.
            </Alert>

            <Stack spacing={2}>
              {materialesConDiscrepancia
                .filter(mat => mat._verificacion?.requiere_input)
                .map((mat, idx) => {
                  const nombreMat = mat.nombre || mat.Nombre || mat.descripcion || `Material ${idx + 1}`;
                  const requiereCodigoInput = mat._verificacion?.requiere_codigo_input;
                  const requiereCantidadInput = mat._verificacion?.requiere_cantidad_input;
                  const requierePrecioInput = mat._verificacion?.requiere_precio_input;
                  
                  // Códigos
                  const codigoOriginal = mat._verificacion?.codigo_original || mat.SKU || mat.codigo || '';
                  const codigoVerificado = mat._verificacion?.codigo_verificado;
                  const opcionesCodigo = [codigoOriginal, codigoVerificado].filter(c => c != null && c !== '');
                  const opcionesCodigoUnicas = [...new Set(opcionesCodigo)];
                  
                  // Cantidades
                  const cantOriginal = mat._verificacion?.cantidad_original;
                  const cantVerificada = mat._verificacion?.cantidad_verificada;
                  const opcionesCantidad = [cantOriginal, cantVerificada].filter(c => c != null && !isNaN(c));
                  const opcionesCantidadUnicas = [...new Set(opcionesCantidad)];
                  
                  // Precios
                  const precioOriginal = mat._verificacion?.precio_original;
                  const precioVerificado = mat._verificacion?.precio_verificado;
                  const opcionesPrecio = [precioOriginal, precioVerificado].filter(p => p != null && !isNaN(p));
                  const opcionesPrecioUnicas = [...new Set(opcionesPrecio)];
                  
                  return (
                    <Paper 
                      key={idx} 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'warning.50',
                        border: '2px solid',
                        borderColor: 'warning.main'
                      }}
                    >
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {nombreMat}
                        </Typography>
                        {(mat.codigo || mat.SKU) && !requiereCodigoInput && (
                          <Typography variant="caption" color="text.secondary">
                            SKU: {mat.codigo || mat.SKU}
                          </Typography>
                        )}
                      </Box>
                      
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} flexWrap="wrap">
                        {/* Sección de Código */}
                        {requiereCodigoInput && (
                          <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                              ⚠️ Seleccionar código/SKU correcto:
                            </Typography>
                            <RadioGroup
                              value={valoresManuales[`${nombreMat}_codigo`] !== undefined && valoresManuales[`${nombreMat}_codigo`] !== '' ? 'manual' : (confirmaciones[`${nombreMat}_codigo`] || '')}
                              onChange={(e) => {
                                if (e.target.value !== 'manual') {
                                  setConfirmaciones(prev => ({
                                    ...prev,
                                    [`${nombreMat}_codigo`]: e.target.value
                                  }));
                                  setValoresManuales(prev => ({
                                    ...prev,
                                    [`${nombreMat}_codigo`]: ''
                                  }));
                                }
                              }}
                            >
                              {opcionesCodigoUnicas.map((opcion, opIdx) => (
                                <FormControlLabel 
                                  key={opIdx}
                                  value={String(opcion)} 
                                  control={<Radio size="small" />} 
                                  label={
                                    <Typography variant="body2">
                                      <strong>{opcion}</strong>
                                      {opcion === codigoOriginal && ' (1ra lectura)'}
                                      {opcion === codigoVerificado && opcion !== codigoOriginal && ' (2da lectura)'}
                                    </Typography>
                                  }
                                />
                              ))}
                              <FormControlLabel 
                                value="manual"
                                control={<Radio size="small" />} 
                                label={
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <EditIcon fontSize="small" color="action" />
                                    <Typography variant="body2">Otro:</Typography>
                                    <TextField
                                      size="small"
                                      placeholder="Ingresar código"
                                      value={valoresManuales[`${nombreMat}_codigo`] || ''}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        setValoresManuales(prev => ({
                                          ...prev,
                                          [`${nombreMat}_codigo`]: e.target.value
                                        }));
                                        setConfirmaciones(prev => ({
                                          ...prev,
                                          [`${nombreMat}_codigo`]: ''
                                        }));
                                      }}
                                      sx={{ width: 150 }}
                                    />
                                  </Stack>
                                }
                              />
                            </RadioGroup>
                          </Box>
                        )}
                        
                        {/* Sección de Cantidad */}
                        {requiereCantidadInput && (
                          <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                              ⚠️ Seleccionar cantidad correcta:
                            </Typography>
                            <RadioGroup
                              value={valoresManuales[`${nombreMat}_cantidad`] !== undefined && valoresManuales[`${nombreMat}_cantidad`] !== '' ? 'manual' : (confirmaciones[`${nombreMat}_cantidad`] || '')}
                              onChange={(e) => {
                                if (e.target.value !== 'manual') {
                                  setConfirmaciones(prev => ({
                                    ...prev,
                                    [`${nombreMat}_cantidad`]: e.target.value
                                  }));
                                  setValoresManuales(prev => ({
                                    ...prev,
                                    [`${nombreMat}_cantidad`]: ''
                                  }));
                                }
                              }}
                            >
                              {opcionesCantidadUnicas.map((opcion, opIdx) => (
                                <FormControlLabel 
                                  key={opIdx}
                                  value={String(opcion)} 
                                  control={<Radio size="small" />} 
                                  label={
                                    <Typography variant="body2">
                                      <strong>{opcion}</strong> {mat.unidad || 'u'}
                                      {opcion === cantOriginal && ' (1ra lectura)'}
                                      {opcion === cantVerificada && opcion !== cantOriginal && ' (2da lectura)'}
                                    </Typography>
                                  }
                                />
                              ))}
                              <FormControlLabel 
                                value="manual"
                                control={<Radio size="small" />} 
                                label={
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <EditIcon fontSize="small" color="action" />
                                    <Typography variant="body2">Otro valor:</Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      placeholder="Ingresar"
                                      value={valoresManuales[`${nombreMat}_cantidad`] || ''}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        setValoresManuales(prev => ({
                                          ...prev,
                                          [`${nombreMat}_cantidad`]: e.target.value
                                        }));
                                        setConfirmaciones(prev => ({
                                          ...prev,
                                          [`${nombreMat}_cantidad`]: ''
                                        }));
                                      }}
                                      sx={{ width: 100 }}
                                      InputProps={{
                                        endAdornment: <Typography variant="caption" sx={{ ml: 0.5 }}>{mat.unidad || 'u'}</Typography>
                                      }}
                                    />
                                  </Stack>
                                }
                              />
                            </RadioGroup>
                          </Box>
                        )}
                        
                        {/* Sección de Precio */}
                        {requierePrecioInput && (
                          <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                              ⚠️ Seleccionar precio correcto:
                            </Typography>
                            <RadioGroup
                              value={valoresManuales[`${nombreMat}_precio`] !== undefined && valoresManuales[`${nombreMat}_precio`] !== '' ? 'manual' : (confirmaciones[`${nombreMat}_precio`] || '')}
                              onChange={(e) => {
                                if (e.target.value !== 'manual') {
                                  setConfirmaciones(prev => ({
                                    ...prev,
                                    [`${nombreMat}_precio`]: e.target.value
                                  }));
                                  setValoresManuales(prev => ({
                                    ...prev,
                                    [`${nombreMat}_precio`]: ''
                                  }));
                                }
                              }}
                            >
                              {opcionesPrecioUnicas.map((opcion, opIdx) => (
                                <FormControlLabel 
                                  key={opIdx}
                                  value={String(opcion)} 
                                  control={<Radio size="small" />} 
                                  label={
                                    <Typography variant="body2">
                                      <strong>${opcion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                                      {opcion === precioOriginal && ' (1ra lectura)'}
                                      {opcion === precioVerificado && opcion !== precioOriginal && ' (2da lectura)'}
                                    </Typography>
                                  }
                                />
                              ))}
                              <FormControlLabel 
                                value="manual"
                                control={<Radio size="small" />} 
                                label={
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <EditIcon fontSize="small" color="action" />
                                    <Typography variant="body2">Otro valor: $</Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      placeholder="Ingresar"
                                      value={valoresManuales[`${nombreMat}_precio`] || ''}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        setValoresManuales(prev => ({
                                          ...prev,
                                          [`${nombreMat}_precio`]: e.target.value
                                        }));
                                        setConfirmaciones(prev => ({
                                          ...prev,
                                          [`${nombreMat}_precio`]: ''
                                        }));
                                      }}
                                      sx={{ width: 120 }}
                                    />
                                  </Stack>
                                }
                              />
                            </RadioGroup>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
            </Stack>
          </Grid>
          
          {/* Panel derecho: Visor de imagen original */}
          {imagenVisorOpen && (
            <Grid item xs={6} sx={{ 
              borderLeft: '1px solid', 
              borderColor: 'divider',
              bgcolor: 'grey.100',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2">
                    Documento Original ({imagenVisorIndex + 1} de {pendingPreviewData?.urls?.length || 1})
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {(pendingPreviewData?.urls?.length || 0) > 1 && (
                      <>
                        <Button 
                          size="small" 
                          disabled={imagenVisorIndex === 0}
                          onClick={() => setImagenVisorIndex(prev => prev - 1)}
                        >
                          ← Anterior
                        </Button>
                        <Button 
                          size="small"
                          disabled={imagenVisorIndex >= (pendingPreviewData?.urls?.length || 1) - 1}
                          onClick={() => setImagenVisorIndex(prev => prev + 1)}
                        >
                          Siguiente →
                        </Button>
                      </>
                    )}
                    <IconButton size="small" onClick={() => setImagenVisorOpen(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', justifyContent: 'center' }}>
                {pendingPreviewData?.urls?.[imagenVisorIndex] ? (
                  <img 
                    src={pendingPreviewData.urls[imagenVisorIndex]}
                    alt={`Página ${imagenVisorIndex + 1}`}
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      borderRadius: 4
                    }}
                  />
                ) : (
                  <Typography color="text.secondary">No hay imagen disponible</Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button 
          onClick={() => {
            setDiscrepanciasDialogOpen(false);
            setMaterialesConDiscrepancia([]);
            setConfirmaciones({});
            setValoresManuales({});
            setMostrarManual({});
            setPendingPreviewData(null);
            setImagenVisorOpen(false);
          }}
          color="inherit"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirmarDiscrepancias}
          variant="contained"
          disabled={
            // Verificar que todas las discrepancias tengan confirmación (radio o manual)
            materialesConDiscrepancia
              .filter(m => m._verificacion?.requiere_input)
              .some(m => {
                const nombreMat = m.nombre || m.Nombre || m.descripcion;
                if (m._verificacion?.requiere_codigo_input) {
                  const tieneRadio = confirmaciones[`${nombreMat}_codigo`];
                  const tieneManual = valoresManuales[`${nombreMat}_codigo`] && valoresManuales[`${nombreMat}_codigo`] !== '';
                  if (!tieneRadio && !tieneManual) return true;
                }
                if (m._verificacion?.requiere_cantidad_input) {
                  const tieneRadio = confirmaciones[`${nombreMat}_cantidad`];
                  const tieneManual = valoresManuales[`${nombreMat}_cantidad`] && valoresManuales[`${nombreMat}_cantidad`] !== '';
                  if (!tieneRadio && !tieneManual) return true;
                }
                if (m._verificacion?.requiere_precio_input) {
                  const tieneRadio = confirmaciones[`${nombreMat}_precio`];
                  const tieneManual = valoresManuales[`${nombreMat}_precio`] && valoresManuales[`${nombreMat}_precio`] !== '';
                  if (!tieneRadio && !tieneManual) return true;
                }
                return false;
              })
          }
        >
          Confirmar y continuar
        </Button>
      </DialogActions>
    </Dialog>
  </Box>
);

};

ImportarPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default ImportarPage;
