import React from 'react';
import { 
  Box, Button, Stack, Typography, TextField, CircularProgress, 
  Autocomplete, MenuItem, Paper, Chip, Divider, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Alert, Fab, Badge, Zoom,
  Slider
} from '@mui/material';
import { DataGrid, GridToolbarContainer, GridToolbarQuickFilter, GridToolbarColumnsButton, GridToolbarFilterButton } from '@mui/x-data-grid';
import { toNumber } from 'src/utils/importar/numbers';
import { fmtMoney } from 'src/utils/importar/money';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PercentIcon from '@mui/icons-material/Percent';
import CalculateIcon from '@mui/icons-material/Calculate';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TableChartIcon from '@mui/icons-material/TableChart';
import SearchIcon from '@mui/icons-material/Search';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import * as XLSX from 'xlsx';
import PdfViewer from './PdfViewer';
import TooltipHelp from 'src/components/TooltipHelp';
import { TOOLTIP_REVISION_FINAL } from 'src/constant/tooltipTexts';

export default function Step3RevisionFinal({
  tipoLista, proveedor, proyecto, valorTotal, rows, columns, codigo,
  selectionModel, setSelectionModel,
  processRowUpdate, onGuardarAcopio, guardando, editando,
  proveedoresOptions, proyectosOptions, setCodigo, setProveedor, setValorTotal, setProyecto,
  onBulkDelete, onBulkPriceUpdate, onBulkRound, onApplyPriceFormula, onGenerateMissingCodes, moveColumnValues, handleAddItem,
  totalFacturaOriginal, setTotalFacturaOriginal,
  onImportFromExcel,
  discrepanciasPendientes = 0,
  onResolveDiscrepancia,
  imageUrls = [], // URLs de las imágenes del documento
  archivoPreview = null // Archivo local para preview
}) {
  const [porcentaje, setPorcentaje] = React.useState('');
  const [montoFijo, setMontoFijo] = React.useState('');
  const [prefix, setPrefix] = React.useState('');
  const fileInputRef = React.useRef(null);
  const discrepanciasRef = React.useRef(null);
  const [valoresEditando, setValoresEditando] = React.useState({});
  
  // Estados para modo revisión (visor de documento)
  const [modoRevision, setModoRevision] = React.useState(discrepanciasPendientes > 0); // Arranca en modo revisión si hay discrepancias
  const [zoom, setZoom] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [paginaActual, setPaginaActual] = React.useState(0);
  
  // Estado para rastrear selecciones de discrepancias (no confirmadas aún)
  const [seleccionesDiscrepancia, setSeleccionesDiscrepancia] = React.useState({});
  // Estado para discrepancias ya confirmadas
  const [discrepanciasConfirmadas, setDiscrepanciasConfirmadas] = React.useState(new Set());
  
  const pdfIframeRef = React.useRef(null);

  // Función para buscar texto en el PDF (abre Cmd+F con el texto)
  const buscarEnPdf = (texto) => {
    // Copiar al portapapeles y mostrar instrucciones
    navigator.clipboard.writeText(texto).then(() => {
      alert(`"${texto}" copiado al portapapeles.\n\nAhora hacé click en el PDF y presioná Cmd+F (o Ctrl+F) para buscarlo.`);
    }).catch(() => {
      alert(`Buscá manualmente: ${texto}\n\nHacé click en el PDF y presioná Cmd+F`);
    });
  };

  // Seleccionar un valor para una discrepancia (sin confirmar aún)
  const seleccionarValorDiscrepancia = (rowId, campo, valor) => {
    setSeleccionesDiscrepancia(prev => ({
      ...prev,
      [`${rowId}_${campo}`]: { rowId, campo, valor }
    }));
  };

  // Verificar si una discrepancia tiene valor seleccionado
  const tieneSeleccion = (rowId, campo) => {
    return seleccionesDiscrepancia[`${rowId}_${campo}`] !== undefined;
  };

  // Obtener URL de imagen actual
  const imagenActual = React.useMemo(() => {
    if (archivoPreview && archivoPreview.type?.startsWith('image')) {
      return URL.createObjectURL(archivoPreview);
    }
    if (imageUrls?.length > 0) {
      return imageUrls[paginaActual] || imageUrls[0];
    }
    return null;
  }, [archivoPreview, imageUrls, paginaActual]);

  const totalPaginas = imageUrls?.length || (archivoPreview ? 1 : 0);

  const withIds = React.useMemo(() => (rows || []).map((r, idx) => ({ id: r.id ?? `${idx}`, ...r })), [rows]);
  
  // Filtrar materiales con discrepancias
  const materialesConDiscrepancia = React.useMemo(() => 
    withIds.filter(r => r._verificacion?.requiere_input), 
    [withIds]
  );

  // Contar cuántas selecciones faltan (debe ir después de materialesConDiscrepancia)
  const seleccionesFaltantes = React.useMemo(() => {
    let total = 0;
    let seleccionadas = 0;
    
    materialesConDiscrepancia.forEach(mat => {
      const verif = mat._verificacion;
      if (verif?.requiere_codigo_input && !discrepanciasConfirmadas.has(`${mat.id}_codigo`)) {
        total++;
        if (tieneSeleccion(mat.id, 'codigo')) seleccionadas++;
      }
      if (verif?.requiere_cantidad_input && !discrepanciasConfirmadas.has(`${mat.id}_cantidad`)) {
        total++;
        if (tieneSeleccion(mat.id, 'cantidad')) seleccionadas++;
      }
      if (verif?.requiere_precio_input && !discrepanciasConfirmadas.has(`${mat.id}_valorUnitario`)) {
        total++;
        if (tieneSeleccion(mat.id, 'valorUnitario')) seleccionadas++;
      }
    });
    
    return { total, seleccionadas, todas: total > 0 && seleccionadas === total };
  }, [materialesConDiscrepancia, seleccionesDiscrepancia, discrepanciasConfirmadas]);

  // Confirmar todas las selecciones pendientes
  const confirmarTodasLasSelecciones = () => {
    Object.values(seleccionesDiscrepancia).forEach(({ rowId, campo, valor }) => {
      const row = withIds.find(r => r.id === rowId);
      if (!row) return;
      
      const newRow = { ...row };
      if (campo === 'codigo') newRow.codigo = valor;
      if (campo === 'cantidad') newRow.cantidad = toNumber(valor);
      if (campo === 'valorUnitario') newRow.valorUnitario = toNumber(valor);
      
      processRowUpdate(newRow, row);
      
      // Marcar como confirmada
      setDiscrepanciasConfirmadas(prev => new Set([...prev, `${rowId}_${campo}`]));
    });
    
    // Limpiar selecciones pendientes
    setSeleccionesDiscrepancia({});
    
    // Si no quedan más discrepancias, salir del modo revisión
    setTimeout(() => {
      if (materialesConDiscrepancia.length === 0) {
        setModoRevision(false);
      }
    }, 100);
  };

  // Scroll a la sección de discrepancias
  const scrollToDiscrepancias = () => {
    discrepanciasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Manejar cambio de valor en edición de discrepancia
  const handleDiscrepanciaChange = (rowId, campo, valor) => {
    setValoresEditando(prev => ({
      ...prev,
      [`${rowId}_${campo}`]: valor
    }));
  };

  // Confirmar valor editado
  const confirmarValorDiscrepancia = (row, campo) => {
    const key = `${row.id}_${campo}`;
    const valor = valoresEditando[key];
    if (valor === undefined) return;
    
    const newRow = { ...row };
    if (campo === 'codigo') newRow.codigo = valor;
    if (campo === 'cantidad') newRow.cantidad = toNumber(valor);
    if (campo === 'valorUnitario') newRow.valorUnitario = toNumber(valor);
    
    processRowUpdate(newRow, row);
    
    setValoresEditando(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Calcular totales
  const suma = React.useMemo(() => 
    withIds.reduce((acc, r) => acc + toNumber(r.valorTotal ?? (toNumber(r.cantidad) * toNumber(r.valorUnitario))), 0), 
    [withIds]
  );
  
  // Usar totalFacturaOriginal si existe, sino valorTotal
  const acopiado = totalFacturaOriginal || Number(valorTotal) || 0;
  const diff = suma - acopiado;
  const coincide = Math.abs(diff) < 0.01;
  const hayDiferenciaQueAjustar = tipoLista === 'materiales' && acopiado > 0 && !coincide;

  // Custom Toolbar con exportar/importar integrado
  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ justifyContent: 'space-between', p: 1, gap: 1, flexWrap: 'wrap' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <GridToolbarQuickFilter debounceMs={300} sx={{ width: 200 }} />
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <TooltipHelp {...TOOLTIP_REVISION_FINAL.agregar}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleAddItem('end')}
          >
            Agregar
          </Button>
        </TooltipHelp>
        <TooltipHelp {...TOOLTIP_REVISION_FINAL.eliminar}>
          <span>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={onBulkDelete}
              disabled={!cantidadSeleccionados}
            >
              Eliminar ({cantidadSeleccionados})
            </Button>
          </span>
        </TooltipHelp>
        <Divider orientation="vertical" flexItem />
        <TooltipHelp {...TOOLTIP_REVISION_FINAL.exportarExcel}>
          <Button
            size="small"
            color="secondary"
            startIcon={<FileDownloadIcon />}
            onClick={exportarAExcel}
          >
            Excel
          </Button>
        </TooltipHelp>
        <TooltipHelp {...TOOLTIP_REVISION_FINAL.importarExcel}>
          <Button
            size="small"
            color="secondary"
            startIcon={<FileUploadIcon />}
            onClick={triggerFileInput}
          >
            Importar
          </Button>
        </TooltipHelp>
      </Stack>
    </GridToolbarContainer>
  );

  // Agregar item de ajuste automático
  const agregarItemAjuste = () => {
    const ajuste = acopiado - suma; // Positivo si falta, negativo si sobra
    if (Math.abs(ajuste) < 0.01) return;
    
    handleAddItem('end', {
      codigo: 'AJUSTE',
      descripcion: ajuste > 0 ? 'Ajuste por diferencia (faltante)' : 'Ajuste por diferencia (sobrante)',
      cantidad: 1,
      valorUnitario: ajuste,
      valorTotal: ajuste
    });
  };

  // Actualizar el valor total al de los materiales
  const usarSumaComoTotal = () => {
    if (setValorTotal) {
      setValorTotal(suma.toString());
    }
    // Limpiar el total original para que use el nuevo valor
    if (setTotalFacturaOriginal) {
      setTotalFacturaOriginal(0);
    }
  };

  // ==========================================
  // EXPORTAR A EXCEL
  // ==========================================
  const exportarAExcel = () => {
    // Preparar datos para exportar (sin campos internos como id)
    const datosExportar = withIds.map((row, idx) => ({
      '#': idx + 1,
      'Código': row.codigo || row.SKU || '',
      'Descripción': row.descripcion || row.nombre || row.Nombre || '',
      'Cantidad': row.cantidad ?? '',
      'Unidad': row.unidad || row.unidadMedida || '',
      'Precio Unitario': row.valorUnitario ?? row.precio_unitario ?? '',
      'Total': row.valorTotal ?? ''
    }));

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 15 },  // Código
      { wch: 40 },  // Descripción
      { wch: 12 },  // Cantidad
      { wch: 10 },  // Unidad
      { wch: 15 },  // Precio Unitario
      { wch: 15 }   // Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiales');

    // Generar nombre del archivo
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `materiales_${proveedor || 'sin_proveedor'}_${fecha}.xlsx`;

    // Descargar
    XLSX.writeFile(wb, nombreArchivo);
  };

  // ==========================================
  // IMPORTAR DESDE EXCEL
  // ==========================================
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Mapear columnas del Excel a estructura interna
        const materialesImportados = jsonData.map((row, idx) => ({
          id: `imported-${idx}`,
          codigo: row['Código'] || row['codigo'] || row['SKU'] || row['sku'] || '',
          descripcion: row['Descripción'] || row['descripcion'] || row['Nombre'] || row['nombre'] || row['Material'] || '',
          cantidad: toNumber(row['Cantidad'] || row['cantidad'] || row['Cant'] || row['cant'] || 0),
          unidad: row['Unidad'] || row['unidad'] || row['UM'] || '',
          valorUnitario: toNumber(row['Precio Unitario'] || row['precio_unitario'] || row['Precio'] || row['precio'] || row['PU'] || 0),
          valorTotal: toNumber(row['Total'] || row['total'] || row['Valor Total'] || row['valorTotal'] || 0)
        }));

        // Recalcular totales si no vienen
        const materialesConTotales = materialesImportados.map(mat => ({
          ...mat,
          valorTotal: mat.valorTotal || (mat.cantidad * mat.valorUnitario)
        }));

        // Llamar callback para actualizar los materiales
        if (onImportFromExcel) {
          onImportFromExcel(materialesConTotales);
        }
      } catch (error) {
        console.error('Error al importar Excel:', error);
        alert('Error al leer el archivo Excel. Verificá que el formato sea correcto.');
      }
    };
    
    reader.readAsArrayBuffer(file);
    // Limpiar input para permitir reimportar el mismo archivo
    event.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Acciones rápidas de IVA y precios
  const aplicarIVA = (quitar = false) => {
    const formula = quitar ? '/1.21' : '*1.21';
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const aplicarPorcentaje = (aumentar = true) => {
    if (!porcentaje) return;
    const formula = aumentar ? `%${porcentaje}` : `%-${porcentaje}`;
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const aplicarMontoFijo = (sumar = true) => {
    if (!montoFijo) return;
    const formula = sumar ? `+${montoFijo}` : `-${montoFijo}`;
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const cantidadSeleccionados = selectionModel.length;
  const textoAplicar = cantidadSeleccionados > 0 
    ? `a ${cantidadSeleccionados} seleccionados` 
    : 'a todos';

  // Vista de edición de acopio existente
  if (editando) { 
    return (
      <Stack spacing={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Datos del acopio
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField size="small" label="Código" value={codigo} onChange={(e)=>setCodigo(e.target.value)} />
            <Autocomplete
              size="small"
              options={proveedoresOptions}
              freeSolo
              value={proveedor}
              onInputChange={(_, v)=>setProveedor(v)}
              renderInput={(p)=><TextField {...p} label="Proveedor" />}
              sx={{ minWidth: 200 }}
            />
            <TextField
              size="small"
              select
              label="Proyecto"
              value={proyecto}
              onChange={(e)=>setProyecto(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {proyectosOptions.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </TextField>
            {tipoLista === 'materiales' && (
              <TextField
                size="small"
                label="Valor acopiado"
                value={valorTotal}
                onChange={(e)=>setValorTotal(e.target.value)}
              />
            )}
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {/* ========== MODO REVISIÓN: Layout 50/50 con imagen y discrepancias ========== */}
      {modoRevision && materialesConDiscrepancia.length > 0 && imagenActual && (
        <Paper sx={{ p: 2, border: '2px solid #1976d2', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <VisibilityIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Modo Revisión
              </Typography>
              <Chip 
                label={`${materialesConDiscrepancia.length} pendientes`} 
                color="warning" 
                size="small"
              />
            </Stack>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TableChartIcon />}
              onClick={() => setModoRevision(false)}
            >
              Ver tabla completa
            </Button>
          </Stack>

          <Stack 
            direction={{ xs: 'column', md: 'row' }} 
            spacing={2}
            sx={{ minHeight: 500 }}
          >
            {/* Panel izquierdo: Visor de documento */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 500 }}>
              {archivoPreview?.type === 'application/pdf' ? (
                // Visor de PDF con búsqueda
                <PdfViewer file={archivoPreview} height={480} />
              ) : (
                // Visor de imagen
                <>
                  {/* Controles de zoom */}
                  <Paper sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Tooltip title="Alejar">
                      <IconButton size="small" onClick={() => setZoom(z => Math.max(25, z - 25))}>
                        <ZoomOutIcon />
                      </IconButton>
                    </Tooltip>
                    <Slider
                      value={zoom}
                      onChange={(_, v) => setZoom(v)}
                      min={25}
                      max={300}
                      step={25}
                      sx={{ width: 100 }}
                      valueLabelDisplay="auto"
                      valueLabelFormat={v => `${v}%`}
                    />
                    <Tooltip title="Acercar">
                      <IconButton size="small" onClick={() => setZoom(z => Math.min(300, z + 25))}>
                        <ZoomInIcon />
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem />
                    <Tooltip title="Rotar izquierda">
                      <IconButton size="small" onClick={() => setRotation(r => r - 90)}>
                        <RotateLeftIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rotar derecha">
                      <IconButton size="small" onClick={() => setRotation(r => r + 90)}>
                        <RotateRightIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Resetear vista">
                      <IconButton size="small" onClick={() => { setZoom(100); setRotation(0); }}>
                        <RestartAltIcon />
                      </IconButton>
                    </Tooltip>
                    {totalPaginas > 1 && (
                      <>
                        <Divider orientation="vertical" flexItem />
                        <Tooltip title="Página anterior">
                          <span>
                            <IconButton 
                              size="small" 
                              onClick={() => setPaginaActual(p => Math.max(0, p - 1))}
                              disabled={paginaActual === 0}
                            >
                              <NavigateBeforeIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Typography variant="body2">
                          {paginaActual + 1} / {totalPaginas}
                        </Typography>
                        <Tooltip title="Página siguiente">
                          <span>
                            <IconButton 
                              size="small" 
                              onClick={() => setPaginaActual(p => Math.min(totalPaginas - 1, p + 1))}
                              disabled={paginaActual >= totalPaginas - 1}
                            >
                              <NavigateNextIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Paper>

                  {/* Contenedor de imagen */}
                  <Box 
                    sx={{ 
                      flex: 1,
                      overflow: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      bgcolor: '#f5f5f5'
                    }}
                  >
                    <img
                      src={imagenActual}
                      alt="Documento"
                      style={{
                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                        transformOrigin: 'top left',
                        maxWidth: 'none',
                        display: 'block'
                      }}
                    />
                  </Box>
                </>
              )}
            </Box>

            {/* Panel derecho: Tarjetas de discrepancias */}
            <Box 
              sx={{ 
                flex: 1, 
                overflow: 'auto',
                maxHeight: 500
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#e65100' }}>
                    ⚠️ Validá estos materiales mirando el documento:
                  </Typography>
                  {seleccionesFaltantes.seleccionadas > 0 && (
                    <Chip 
                      label={`${seleccionesFaltantes.seleccionadas}/${seleccionesFaltantes.total} seleccionados`}
                      size="small"
                      color={seleccionesFaltantes.todas ? 'success' : 'warning'}
                    />
                  )}
                </Stack>
                
                {materialesConDiscrepancia.map((mat) => {
                  const verif = mat._verificacion;
                  const nombre = mat.descripcion || mat.nombre || mat.codigo || 'Material';
                  
                  // Verificar si todas las discrepancias de este material ya están confirmadas
                  const todasConfirmadas = (
                    (!verif?.requiere_codigo_input || discrepanciasConfirmadas.has(`${mat.id}_codigo`)) &&
                    (!verif?.requiere_cantidad_input || discrepanciasConfirmadas.has(`${mat.id}_cantidad`)) &&
                    (!verif?.requiere_precio_input || discrepanciasConfirmadas.has(`${mat.id}_valorUnitario`))
                  );
                  
                  // Si ya confirmó todo, mostrar versión compacta
                  if (todasConfirmadas) {
                    return (
                      <Paper 
                        key={mat.id} 
                        sx={{ 
                          p: 1, 
                          bgcolor: '#e8f5e9',
                          border: '1px solid #81c784',
                          borderRadius: 1
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CheckCircleIcon color="success" fontSize="small" />
                          <Typography variant="body2" color="success.dark">
                            {nombre} - ✓ Confirmado
                          </Typography>
                        </Stack>
                      </Paper>
                    );
                  }
                  
                  return (
                    <Paper 
                      key={mat.id} 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#fff8e1',
                        border: '1px solid #ffcc80',
                        borderRadius: 1
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                          {nombre}
                        </Typography>
                        <Tooltip title="Buscar en el PDF">
                          <IconButton 
                            size="small" 
                            onClick={() => buscarEnPdf(nombre.split(' ').slice(0, 3).join(' '))}
                            sx={{ bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }}
                          >
                            <SearchIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      
                      <Stack spacing={1}>
                        {/* Discrepancia de código */}
                        {verif?.requiere_codigo_input && !discrepanciasConfirmadas.has(`${mat.id}_codigo`) && (
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" color="text.secondary">Código</Typography>
                              {tieneSeleccion(mat.id, 'codigo') && (
                                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap">
                              <Chip 
                                label={verif.codigo_original || '(vacío)'} 
                                size="small" 
                                color={seleccionesDiscrepancia[`${mat.id}_codigo`]?.valor === verif.codigo_original ? 'success' : 'default'}
                                variant={seleccionesDiscrepancia[`${mat.id}_codigo`]?.valor === verif.codigo_original ? 'filled' : 'outlined'}
                                onClick={() => seleccionarValorDiscrepancia(mat.id, 'codigo', verif.codigo_original)}
                                sx={{ cursor: 'pointer' }}
                              />
                              <Typography variant="caption">ó</Typography>
                              <Chip 
                                label={verif.codigo_verificado || '(vacío)'} 
                                size="small"
                                color={seleccionesDiscrepancia[`${mat.id}_codigo`]?.valor === verif.codigo_verificado ? 'success' : 'default'}
                                variant={seleccionesDiscrepancia[`${mat.id}_codigo`]?.valor === verif.codigo_verificado ? 'filled' : 'outlined'}
                                onClick={() => seleccionarValorDiscrepancia(mat.id, 'codigo', verif.codigo_verificado)}
                                sx={{ cursor: 'pointer' }}
                              />
                              <TextField
                                size="small"
                                placeholder="Otro"
                                value={valoresEditando[`${mat.id}_codigo`] ?? ''}
                                onChange={(e) => {
                                  handleDiscrepanciaChange(mat.id, 'codigo', e.target.value);
                                  if (e.target.value) seleccionarValorDiscrepancia(mat.id, 'codigo', e.target.value);
                                }}
                                sx={{ width: 100 }}
                              />
                            </Stack>
                          </Box>
                        )}
                        
                        {/* Discrepancia de cantidad */}
                        {verif?.requiere_cantidad_input && !discrepanciasConfirmadas.has(`${mat.id}_cantidad`) && (
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" color="text.secondary">Cantidad</Typography>
                              {tieneSeleccion(mat.id, 'cantidad') && (
                                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap">
                              <Chip 
                                label={verif.cantidad_original} 
                                size="small"
                                color={seleccionesDiscrepancia[`${mat.id}_cantidad`]?.valor === verif.cantidad_original ? 'success' : 'default'}
                                variant={seleccionesDiscrepancia[`${mat.id}_cantidad`]?.valor === verif.cantidad_original ? 'filled' : 'outlined'}
                                onClick={() => seleccionarValorDiscrepancia(mat.id, 'cantidad', verif.cantidad_original)}
                                sx={{ cursor: 'pointer' }}
                              />
                              <Typography variant="caption">ó</Typography>
                              <Chip 
                                label={verif.cantidad_verificada} 
                                size="small"
                                color={seleccionesDiscrepancia[`${mat.id}_cantidad`]?.valor === verif.cantidad_verificada ? 'success' : 'default'}
                                variant={seleccionesDiscrepancia[`${mat.id}_cantidad`]?.valor === verif.cantidad_verificada ? 'filled' : 'outlined'}
                                onClick={() => seleccionarValorDiscrepancia(mat.id, 'cantidad', verif.cantidad_verificada)}
                                sx={{ cursor: 'pointer' }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                placeholder="Otro"
                                value={valoresEditando[`${mat.id}_cantidad`] ?? ''}
                                onChange={(e) => {
                                  handleDiscrepanciaChange(mat.id, 'cantidad', e.target.value);
                                  if (e.target.value) seleccionarValorDiscrepancia(mat.id, 'cantidad', toNumber(e.target.value));
                                }}
                                sx={{ width: 80 }}
                              />
                            </Stack>
                          </Box>
                        )}
                        
                        {/* Discrepancia de precio */}
                        {verif?.requiere_precio_input && !discrepanciasConfirmadas.has(`${mat.id}_valorUnitario`) && (
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" color="text.secondary">Precio unitario</Typography>
                              {tieneSeleccion(mat.id, 'valorUnitario') && (
                                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap">
                              <Chip 
                                label={`$${verif.precio_original}`} 
                                size="small"
                                color={seleccionesDiscrepancia[`${mat.id}_valorUnitario`]?.valor === verif.precio_original ? 'success' : 'default'}
                                variant={seleccionesDiscrepancia[`${mat.id}_valorUnitario`]?.valor === verif.precio_original ? 'filled' : 'outlined'}
                                onClick={() => seleccionarValorDiscrepancia(mat.id, 'valorUnitario', verif.precio_original)}
                                sx={{ cursor: 'pointer' }}
                              />
                              <Typography variant="caption">ó</Typography>
                              <Chip 
                                label={`$${verif.precio_verificado}`} 
                                size="small"
                                color={seleccionesDiscrepancia[`${mat.id}_valorUnitario`]?.valor === verif.precio_verificado ? 'success' : 'default'}
                                variant={seleccionesDiscrepancia[`${mat.id}_valorUnitario`]?.valor === verif.precio_verificado ? 'filled' : 'outlined'}
                                onClick={() => seleccionarValorDiscrepancia(mat.id, 'valorUnitario', verif.precio_verificado)}
                                sx={{ cursor: 'pointer' }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                placeholder="Otro"
                                value={valoresEditando[`${mat.id}_valorUnitario`] ?? ''}
                                onChange={(e) => {
                                  handleDiscrepanciaChange(mat.id, 'valorUnitario', e.target.value);
                                  if (e.target.value) seleccionarValorDiscrepancia(mat.id, 'valorUnitario', toNumber(e.target.value));
                                }}
                                sx={{ width: 100 }}
                              />
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}

                {/* Botón Confirmar cuando hay selecciones */}
                {seleccionesFaltantes.seleccionadas > 0 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<DoneAllIcon />}
                    onClick={confirmarTodasLasSelecciones}
                    disabled={!seleccionesFaltantes.todas}
                    sx={{ 
                      mt: 2,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    {seleccionesFaltantes.todas 
                      ? `✓ Confirmar ${seleccionesFaltantes.seleccionadas} selecciones`
                      : `Seleccioná ${seleccionesFaltantes.total - seleccionesFaltantes.seleccionadas} más para confirmar`
                    }
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* ========== VISOR DE DOCUMENTO (sin discrepancias) ========== */}
      {modoRevision && materialesConDiscrepancia.length === 0 && imagenActual && (
        <Paper sx={{ p: 2, border: '2px solid #1976d2', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <VisibilityIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Vista del documento
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TableChartIcon />}
              onClick={() => setModoRevision(false)}
            >
              Cerrar
            </Button>
          </Stack>

          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            {archivoPreview?.type === 'application/pdf' ? (
              <PdfViewer file={archivoPreview} height={480} />
            ) : (
              <>
                {/* Controles de zoom */}
                <Paper sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Tooltip title="Alejar">
                    <IconButton size="small" onClick={() => setZoom(z => Math.max(25, z - 25))}>
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <Slider
                    value={zoom}
                    onChange={(_, v) => setZoom(v)}
                    min={25}
                    max={300}
                    step={25}
                    sx={{ width: 100 }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={v => `${v}%`}
                  />
                  <Tooltip title="Acercar">
                    <IconButton size="small" onClick={() => setZoom(z => Math.min(300, z + 25))}>
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>
                  <Divider orientation="vertical" flexItem />
                  <Tooltip title="Rotar izquierda">
                    <IconButton size="small" onClick={() => setRotation(r => r - 90)}>
                      <RotateLeftIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rotar derecha">
                    <IconButton size="small" onClick={() => setRotation(r => r + 90)}>
                      <RotateRightIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Resetear vista">
                    <IconButton size="small" onClick={() => { setZoom(100); setRotation(0); }}>
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                  {totalPaginas > 1 && (
                    <>
                      <Divider orientation="vertical" flexItem />
                      <IconButton 
                        size="small" 
                        disabled={paginaActual === 0}
                        onClick={() => setPaginaActual(p => p - 1)}
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                      <Typography variant="body2">
                        {paginaActual + 1} / {totalPaginas}
                      </Typography>
                      <IconButton 
                        size="small" 
                        disabled={paginaActual >= totalPaginas - 1}
                        onClick={() => setPaginaActual(p => p + 1)}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </>
                  )}
                </Paper>

                {/* Imagen del documento */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    p: 2,
                    minHeight: 400
                  }}
                >
                  <img
                    src={imagenActual}
                    alt="Documento"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      maxWidth: zoom > 100 ? 'none' : '100%',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* ========== VISTA NORMAL (cuando no hay modo revisión o no hay discrepancias) ========== */}
      {(!modoRevision || materialesConDiscrepancia.length === 0) && (
        <>
          {/* Botón para volver a modo revisión si hay discrepancias */}
          {materialesConDiscrepancia.length > 0 && (
            <Alert 
              severity="warning" 
              action={
                <Button 
                  color="warning" 
                  size="small" 
                  startIcon={<VisibilityIcon />}
                  onClick={() => setModoRevision(true)}
                >
                  Abrir modo revisión
                </Button>
              }
            >
              Hay {materialesConDiscrepancia.length} materiales con discrepancias pendientes
            </Alert>
          )}

          {/* ========== SECCIÓN DE DISCREPANCIAS (vista compacta) ========== */}
          {materialesConDiscrepancia.length > 0 && (
            <Paper 
              ref={discrepanciasRef}
              sx={{ 
                p: 2, 
                bgcolor: '#fff8e1', 
                border: '2px solid #ffc107',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(255, 193, 7, 0.3)'
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <WarningAmberIcon sx={{ color: '#ff9800', fontSize: 28 }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#e65100' }}>
                    ⚠️ {materialesConDiscrepancia.length} {materialesConDiscrepancia.length === 1 ? 'material requiere' : 'materiales requieren'} validación
                  </Typography>
                </Stack>
                
                <Typography variant="body2" color="text.secondary">
                  La IA detectó diferencias entre lecturas. Elegí el valor correcto o editá manualmente:
                </Typography>

                <Stack spacing={1.5}>
              {materialesConDiscrepancia.map((mat) => {
                const verif = mat._verificacion;
                const nombre = mat.descripcion || mat.nombre || mat.codigo || 'Material';
                
                return (
                  <Paper 
                    key={mat.id} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'white',
                      border: '1px solid #ffcc80',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom noWrap>
                      {nombre}
                    </Typography>
                    
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                      {/* Discrepancia de código */}
                      {verif?.requiere_codigo_input && (
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                          <Typography variant="caption" color="text.secondary">Código</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            <Chip 
                              label={verif.codigo_original || '(vacío)'} 
                              size="small" 
                              onClick={() => confirmarValorDiscrepancia(mat, 'codigo') || handleDiscrepanciaChange(mat.id, 'codigo', verif.codigo_original)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                            />
                            <Typography variant="caption">ó</Typography>
                            <Chip 
                              label={verif.codigo_verificado || '(vacío)'} 
                              size="small"
                              onClick={() => {
                                handleDiscrepanciaChange(mat.id, 'codigo', verif.codigo_verificado);
                                setTimeout(() => confirmarValorDiscrepancia({ ...mat, codigo: verif.codigo_verificado }, 'codigo'), 0);
                              }}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                            />
                            <TextField
                              size="small"
                              placeholder="Otro valor"
                              value={valoresEditando[`${mat.id}_codigo`] ?? ''}
                              onChange={(e) => handleDiscrepanciaChange(mat.id, 'codigo', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && confirmarValorDiscrepancia(mat, 'codigo')}
                              sx={{ width: 120 }}
                              InputProps={{
                                endAdornment: valoresEditando[`${mat.id}_codigo`] && (
                                  <IconButton size="small" onClick={() => confirmarValorDiscrepancia(mat, 'codigo')}>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </IconButton>
                                )
                              }}
                            />
                          </Stack>
                        </Box>
                      )}
                      
                      {/* Discrepancia de cantidad */}
                      {verif?.requiere_cantidad_input && (
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                          <Typography variant="caption" color="text.secondary">Cantidad</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            <Chip 
                              label={verif.cantidad_original} 
                              size="small"
                              onClick={() => {
                                handleDiscrepanciaChange(mat.id, 'cantidad', verif.cantidad_original);
                                setTimeout(() => confirmarValorDiscrepancia({ ...mat, cantidad: verif.cantidad_original }, 'cantidad'), 0);
                              }}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                            />
                            <Typography variant="caption">ó</Typography>
                            <Chip 
                              label={verif.cantidad_verificada} 
                              size="small"
                              onClick={() => {
                                handleDiscrepanciaChange(mat.id, 'cantidad', verif.cantidad_verificada);
                                setTimeout(() => confirmarValorDiscrepancia({ ...mat, cantidad: verif.cantidad_verificada }, 'cantidad'), 0);
                              }}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                            />
                            <TextField
                              size="small"
                              type="number"
                              placeholder="Otro"
                              value={valoresEditando[`${mat.id}_cantidad`] ?? ''}
                              onChange={(e) => handleDiscrepanciaChange(mat.id, 'cantidad', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && confirmarValorDiscrepancia(mat, 'cantidad')}
                              sx={{ width: 100 }}
                              InputProps={{
                                endAdornment: valoresEditando[`${mat.id}_cantidad`] && (
                                  <IconButton size="small" onClick={() => confirmarValorDiscrepancia(mat, 'cantidad')}>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </IconButton>
                                )
                              }}
                            />
                          </Stack>
                        </Box>
                      )}
                      
                      {/* Discrepancia de precio */}
                      {verif?.requiere_precio_input && (
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                          <Typography variant="caption" color="text.secondary">Precio unitario</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            <Chip 
                              label={`$${verif.precio_original}`} 
                              size="small"
                              onClick={() => {
                                handleDiscrepanciaChange(mat.id, 'valorUnitario', verif.precio_original);
                                setTimeout(() => confirmarValorDiscrepancia({ ...mat, valorUnitario: verif.precio_original }, 'valorUnitario'), 0);
                              }}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                            />
                            <Typography variant="caption">ó</Typography>
                            <Chip 
                              label={`$${verif.precio_verificado}`} 
                              size="small"
                              onClick={() => {
                                handleDiscrepanciaChange(mat.id, 'valorUnitario', verif.precio_verificado);
                                setTimeout(() => confirmarValorDiscrepancia({ ...mat, valorUnitario: verif.precio_verificado }, 'valorUnitario'), 0);
                              }}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                            />
                            <TextField
                              size="small"
                              type="number"
                              placeholder="Otro"
                              value={valoresEditando[`${mat.id}_valorUnitario`] ?? ''}
                              onChange={(e) => handleDiscrepanciaChange(mat.id, 'valorUnitario', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && confirmarValorDiscrepancia(mat, 'valorUnitario')}
                              sx={{ width: 120 }}
                              InputProps={{
                                endAdornment: valoresEditando[`${mat.id}_valorUnitario`] && (
                                  <IconButton size="small" onClick={() => confirmarValorDiscrepancia(mat, 'valorUnitario')}>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </IconButton>
                                )
                              }}
                            />
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Badge flotante sticky para discrepancias */}
      <Zoom in={materialesConDiscrepancia.length > 0}>
        <Fab
          color="warning"
          variant="extended"
          onClick={scrollToDiscrepancias}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
            animation: 'bounce 1s infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-5px)' }
            }
          }}
        >
          <Badge 
            badgeContent={materialesConDiscrepancia.length} 
            color="error"
            sx={{ mr: 1 }}
          >
            <WarningAmberIcon />
          </Badge>
          Pendientes
        </Fab>
      </Zoom>
      
      {/* Header con resumen - Compacto con chip flotante */}
      <Paper sx={{ p: 1.5, bgcolor: 'primary.lighter' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={600}>{withIds.length} materiales</Typography>
            <Chip label={tipoLista === 'materiales' ? 'Compra' : 'Lista'} size="small" />
            <Chip label={proveedor || 'Sin proveedor'} size="small" variant="outlined" />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {tipoLista === 'lista_precios' ? (
              // Lista de precios: solo mostrar total ingresado
              <Chip 
                label={acopiado > 0 ? fmtMoney(acopiado) : 'Sin total'}
                color="primary"
                sx={{ fontWeight: 'bold', fontSize: '1rem', px: 1 }}
              />
            ) : (
              // Materiales: mostrar total y suma
              <>
                {acopiado > 0 && (
                  <Tooltip title="Valor factura">
                    <Chip 
                      label={`Factura: ${fmtMoney(acopiado)}`} 
                      size="small"
                      variant="outlined"
                      color={coincide ? 'success' : 'error'}
                    />
                  </Tooltip>
                )}
                <Tooltip title="Suma de materiales">
                  <Chip 
                    label={fmtMoney(suma)} 
                    color={acopiado > 0 ? (coincide ? 'success' : 'error') : 'default'}
                    sx={{ fontWeight: 'bold', fontSize: '1rem', px: 1 }}
                  />
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Fila con Acciones rápidas y Ver documento */}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        {/* Botón para ver documento */}
        {(archivoPreview || imageUrls?.length > 0) && (
          <TooltipHelp {...TOOLTIP_REVISION_FINAL.verDocumento}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => setModoRevision(true)}
              sx={{ height: 40, whiteSpace: 'nowrap' }}
            >
              Ver documento
            </Button>
          </TooltipHelp>
        )}

        {/* Acciones rápidas - Colapsable */}
        <Accordion defaultExpanded={false} sx={{ flex: 1, '&:before': { display: 'none' } }}>
          <TooltipHelp {...TOOLTIP_REVISION_FINAL.accionesRapidas} placement="top">
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ bgcolor: 'grey.50', minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={500}>
                  ⚡ Acciones rápidas
                </Typography>
                {cantidadSeleccionados > 0 && (
                  <Chip label={`${cantidadSeleccionados} selec.`} size="small" color="primary" />
                )}
              </Stack>
            </AccordionSummary>
          </TooltipHelp>
        <AccordionDetails sx={{ pt: 2 }}>
        
        {/* Fila 1: IVA */}
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <TooltipHelp {...TOOLTIP_REVISION_FINAL.ivaAgregar}>
            <Button 
              variant="contained" 
              size="small" 
              onClick={() => aplicarIVA(false)}
              startIcon={<PercentIcon />}
            >
              + IVA 21% {textoAplicar}
            </Button>
          </TooltipHelp>
          <TooltipHelp {...TOOLTIP_REVISION_FINAL.ivaQuitar}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => aplicarIVA(true)}
            >
              − Quitar IVA {textoAplicar}
            </Button>
          </TooltipHelp>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => onApplyPriceFormula('*1.105', selectionModel.length ? 'selected' : 'all')}
          >
            + IVA 10.5%
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onBulkRound}
            disabled={!cantidadSeleccionados}
          >
            Redondear
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Fila 2: Porcentaje */}
        <TooltipHelp {...TOOLTIP_REVISION_FINAL.porcentaje} placement="top">
          <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Porcentaje %"
              type="number"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              sx={{ width: 120 }}
              placeholder="10"
            />
            <Button 
              variant="contained" 
              size="small" 
              color="success"
              onClick={() => aplicarPorcentaje(true)}
              disabled={!porcentaje}
            >
              + Aumentar
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              color="error"
              onClick={() => aplicarPorcentaje(false)}
              disabled={!porcentaje}
            >
              − Reducir
            </Button>
          </Stack>
        </TooltipHelp>

        {/* Fila 3: Monto fijo */}
        <TooltipHelp {...TOOLTIP_REVISION_FINAL.montoFijo} placement="top">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Monto fijo $"
              type="number"
              value={montoFijo}
              onChange={(e) => setMontoFijo(e.target.value)}
              sx={{ width: 120 }}
              placeholder="100"
            />
            <Button 
              variant="contained" 
              size="small" 
              color="success"
              onClick={() => aplicarMontoFijo(true)}
              disabled={!montoFijo}
            >
              + Sumar
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              color="error"
              onClick={() => aplicarMontoFijo(false)}
              disabled={!montoFijo}
            >
              − Restar
            </Button>
          </Stack>
        </TooltipHelp>

        <Divider sx={{ my: 2 }} />

        {/* Opciones avanzadas (antes era accordion separado) */}
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Otras opciones:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Prefijo códigos"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            sx={{ width: 120 }}
            placeholder="MAT-"
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => onGenerateMissingCodes({ prefix, maxLen: 16 })}
          >
            Generar códigos faltantes
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Mover valores en columnas:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Button size="small" variant="outlined" disabled={!cantidadSeleccionados} onClick={() => moveColumnValues('valorUnitario', parseInt(selectionModel[0], 10), 'up')}>⬆️ Precios</Button>
          <Button size="small" variant="outlined" disabled={!cantidadSeleccionados} onClick={() => moveColumnValues('valorUnitario', parseInt(selectionModel[0], 10), 'down')}>⬇️ Precios</Button>
          <Button size="small" variant="outlined" disabled={!cantidadSeleccionados} onClick={() => moveColumnValues('codigo', parseInt(selectionModel[0], 10), 'up')}>⬆️ Códigos</Button>
          <Button size="small" variant="outlined" disabled={!cantidadSeleccionados} onClick={() => moveColumnValues('codigo', parseInt(selectionModel[0], 10), 'down')}>⬇️ Códigos</Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Agregar material en posición:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" onClick={() => handleAddItem('start')}>Al inicio</Button>
          <Button size="small" variant="outlined" disabled={!cantidadSeleccionados} onClick={() => handleAddItem(parseInt(selectionModel[0], 10))}>Debajo selección</Button>
          <Button size="small" variant="outlined" onClick={() => handleAddItem('end')}>Al final</Button>
        </Stack>
        </AccordionDetails>
        </Accordion>
      </Stack>

      {/* Grilla de datos - Altura expandida */}
      <Paper sx={{ height: 'calc(100vh - 380px)', minHeight: 350, width: '100%' }}>
        <DataGrid
          rows={withIds}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(m) => setSelectionModel(m.map(String))}
          rowSelectionModel={selectionModel}
          processRowUpdate={processRowUpdate}
          experimentalFeatures={{ newEditingApi: true }}
          slots={{ toolbar: CustomToolbar }}
          density="compact"
          initialState={{
            columns: {
              columnVisibilityModel: {
                // Ocultar columnas menos importantes por defecto
                SKU: false,
                _verificacion: false,
              },
            },
          }}
        />
        {/* Input oculto para importar Excel */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </Paper>



      {/* Validación de totales para materiales - BLOQUEA GUARDAR */}
      {tipoLista === 'materiales' && acopiado > 0 && !coincide && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 1,
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            ⚠️ Diferencia de {fmtMoney(Math.abs(diff))} - Elegí cómo resolverla:
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="body2">
                Suma materiales: <strong>{fmtMoney(suma)}</strong>
              </Typography>
              <Typography variant="body2">
                Total factura: <strong>{fmtMoney(acopiado)}</strong>
              </Typography>
            </Stack>
            
            <Divider />
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Opción 1: Agregar item de ajuste */}
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<AddIcon />}
                onClick={agregarItemAjuste}
                sx={{ flex: 1 }}
              >
                Agregar ítem de ajuste ({fmtMoney(acopiado - suma)})
              </Button>
              
              {/* Opción 2: Usar suma como total */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<CalculateIcon />}
                onClick={usarSumaComoTotal}
                sx={{ flex: 1 }}
              >
                Cambiar total a {fmtMoney(suma)}
              </Button>
            </Stack>
          </Stack>
        </Alert>
      )}

      {/* Botón guardar sticky */}
      <Paper 
        elevation={3}
        sx={{ 
          position: 'sticky', 
          bottom: 0, 
          p: 1.5, 
          mt: 2,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 10
        }}
      >
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={onGuardarAcopio}
          disabled={guardando || hayDiferenciaQueAjustar}
          startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        >
          {guardando ? 'Guardando...' : hayDiferenciaQueAjustar ? 'Ajustá la diferencia' : editando ? 'Guardar Cambios' : 'Guardar Acopio'}
        </Button>
      </Paper>
        </>
      )}
    </Stack>
  );
}
