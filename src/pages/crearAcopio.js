import React, { useRef, useState } from 'react';
import { Box, Button, Container, Stack, Stepper, Step, StepLabel, Typography, Paper } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import ProgressBackdrop from 'src/components/importar/ProgressBackdrop';
import { Backdrop, CircularProgress } from '@mui/material';
import Step0DatosIniciales from 'src/components/importar/Step0DatosIniciales';
import Step1SubirAjustar from 'src/components/importar/Step1SubirAjustar';
import Step2AjustarColumnas from 'src/components/importar/Step2AjustarColumnas';
import Step3RevisionFinal from 'src/components/importar/Step3RevisionFinal';
import useExtractionProcess from 'src/hooks/importar/useExtractionProcess';
import useColumnMapping from 'src/hooks/importar/useColumnMapping';
import { fmtMoney } from 'src/utils/importar/money';
import { toNumber } from 'src/utils/importar/numbers';
import { steps } from 'src/constant/importarSteps';
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
  const containerRef = useRef(null);
  const [draggingGuide, setDraggingGuide] = useState(false);

  const [finalRows, setFinalRows] = useState([]);
  const [selectionModel, setSelectionModel] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const { cargando, progreso, procesar } = useExtractionProcess();
const {
  previewCols, setPreviewCols,
  previewRows, setPreviewRows,
  columnMapping, setColumnMapping,
  loadPreview, confirmMapping
} = useColumnMapping();


const [archivoTabla, setArchivoTabla] = useState(null);

const [includeHeaderAsRow, setIncludeHeaderAsRow] = useState(false);


  const handleNext = () => setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

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
    setActiveStep(2);
    return;
  }

  // Caso contrario, seguimos con el flujo OCR/imagen existente
  await procesar({
    archivo,
    rotation,
    guideY,
    meta: { tipoLista, proveedor, proyecto, valorTotal },
    onPreviewReady: ({ rawRows, cols, rows, mapping, urls }) => {
      loadPreview({ rawRows, cols, rows, mapping });
      setActiveStep(2);
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
      setActiveStep(3);

    } catch (error) {
      console.error('Error al cargar acopio:', error);
    } finally {
      setGuardando(false);
    }
  };

  cargarAcopio();
}, [acopioId]);

const columns = React.useMemo(() => {
  const common = [
    { field: 'codigo', headerName: 'Código', flex: 1, minWidth: 120, editable: true },
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

    if (editando) {
      await AcopioService.editarAcopio(acopioId, acopio);
      setAlert({ open: true, message: '✏️ Acopio actualizado con éxito.', severity: 'success' });
    } else {
      await AcopioService.crearAcopio(acopio);
      setAlert({ open: true, message: '✅ Acopio creado con éxito.', severity: 'success' });
    }

    setTimeout(() => router.push(`/acopios?empresaId=${empresaId}`), 1500);
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
  setActiveStep(3);
};

  const handleBulkDelete = () => {
    if (!selectionModel?.length) return;
    setFinalRows((rows) => rows.filter((r, idx) => !selectionModel.includes(String(r.id ?? `${idx}`))));
    setSelectionModel([]);
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
const handleAddItem = (position = 'end') => {
  setFinalRows((rows) => {
    const nuevo = {
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
    if (activeStep === 0) {
      return (
        <Step0DatosIniciales
          tipoLista={tipoLista} setTipoLista={setTipoLista}
          proveedor={proveedor} setProveedor={setProveedor}
          proyecto={proyecto} setProyecto={setProyecto}
          valorTotal={valorTotal} setValorTotal={setValorTotal}
          codigo={codigo} setCodigo={setCodigo}
          proveedoresOptions={proveedoresOptions}
          proyectosOptions={proyectosOptions}
        />
      );
    }
    if (activeStep === 1) {
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
        />
      );
    }
    if (activeStep === 2) {
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
    return (
     <Step3RevisionFinal
  // datos
  tipoLista={tipoLista}
  proveedor={proveedor}
  proyecto={proyecto}
  valorTotal={valorTotal}
  codigo={codigo}
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
  // flags
  guardando={guardando}
  editando={editando}
/>
    );
  };




  const previewUrl = React.useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
React.useEffect(() => {
  return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
}, [previewUrl]);

return (
  <Box component="main" sx={{ flexGrow: 1, py: 6 }}>
    <Container maxWidth="lg">
      <Typography variant="h5" gutterBottom>
        Importar lista de precios o materiales
      </Typography>

      <Stack direction="row" spacing={2} alignItems="flex-start">
{(archivo || (urls?.length > 0)) && activeStep >= 1 && (
  <Paper
    sx={{
      width: { xs: '100%', md: '35%' },
      height: { xs: 360, md: 'calc(100vh - 140px)' },
      position: { md: 'sticky' },
      top: { md: 80 },
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#fafafa',
      border: '1px solid #ddd',
      flexShrink: 0,
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
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
  </Box>
);

};

ImportarPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default ImportarPage;
