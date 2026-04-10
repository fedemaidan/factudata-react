import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import proveedorService from 'src/services/proveedorService';
import movimientosService from 'src/services/movimientosService';
import { getCamposConfig } from 'src/components/movementFieldsConfig';
import CargaArchivosStep from './steps/CargaArchivosStep';
import PreguntasContextoStep from './steps/PreguntasContextoStep';
import ValidacionLoteStep from './steps/ValidacionLoteStep';
import { mapExtractedToForm, emptyForm } from './cargaMasivaMap';
import { buildMovimientoPayloadFromBatchItem } from './buildBatchMovimientoPayload';
import {
  pickRandomFiles,
  buildContextoCuestionarioTexto,
  preguntasEstanCompletas,
} from './cargaMasivaPreguntasUtils';
import ImportPlanillaStep from 'src/components/importMovimientos/ImportPlanillaStep';
import PasoRevisarCategorias from 'src/sections/importMovimientos/PasoRevisarCategorias';
import PasoRevisarProveedores from 'src/sections/importMovimientos/PasoRevisarProveedores';
import PasoAclaracionesMovimientos from 'src/sections/importMovimientos/PasoAclaracionesMovimientos';
import PasoResumen from 'src/sections/importMovimientos/PasoResumen';
import PasoValidarMovimientosImport from 'src/sections/importMovimientos/PasoValidarMovimientosImport';

const STEPS_OCR = ['Archivos', 'Contexto', 'Validación'];
const STEPS_TABULAR = ['Planilla', 'Categorías', 'Proveedores', 'Aclaraciones', 'Validación', 'Resumen'];

const initialContexto = () => ({
  proyecto_id: '',
  proyecto_nombre: '',
  default_type: 'egreso',
  default_moneda: 'ARS',
  default_categorias: [],
  default_medios_pago: [],
  default_etapa: '',
  notas_lote: '',
});

const initialImportWizardData = () => ({
  archivos: [],
  analisisCsv: null,
  hojasDetectadas: {},
  hojasSeleccionadas: {},
  proyectoSeleccionado: null,
  tipoImportacion: 'general',
  mapeosCategorias: [],
  mapeosSubcategorias: [],
  mapeosProveedores: [],
  aclaracionesUsuario: '',
  entidadesResueltas: null,
  resultadoFinal: null,
  codigoPrevisualizacion: null,
  previewRowsForValidation: null,
  movimientosPreviewBruto: null,
  movimientosValidadosParaCrear: null,
});

function itemFormIsValid(form, comprobanteInfo, ingresoInfo) {
  const tipo = form.type || 'egreso';
  const camposConfig = getCamposConfig(comprobanteInfo, ingresoInfo, tipo);
  if (camposConfig.proyecto && !form.proyecto_id) return false;
  if (form.total === '' || form.total === undefined || form.total === null) return false;
  if (!form.fecha_factura) return false;
  return true;
}

const CargaMasivaDialog = ({ open, onClose, empresa, proyectos, user, onSuccess }) => {
  const [cargaModo, setCargaModo] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [contexto, setContexto] = useState(initialContexto);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [drawerCatalogos, setDrawerCatalogos] = useState({
    comprobanteInfo: {},
    ingresoInfo: {},
    proveedores: [],
    categorias: [],
    tagsExtra: [],
    mediosPago: ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'],
    etapas: [],
    obrasOptions: [],
    clientesOptions: [],
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');
  const [preguntasGpt, setPreguntasGpt] = useState([]);
  const [respuestasGpt, setRespuestasGpt] = useState({});
  const [preguntasLoading, setPreguntasLoading] = useState(false);
  const [preguntasError, setPreguntasError] = useState('');
  const [importWizardData, setImportWizardData] = useState(initialImportWizardData);
  const [tabularLoading, setTabularLoading] = useState(false);
  const [tabularError, setTabularError] = useState('');

  const categoriasRef = useRef(null);
  const proveedoresRef = useRef(null);
  const aclaracionesRef = useRef(null);
  const validacionRef = useRef(null);

  const updateImportWizardData = useCallback((patch) => {
    setImportWizardData((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetWizard = useCallback(() => {
    setCargaModo(null);
    setActiveStep(0);
    setFiles([]);
    setContexto(initialContexto());
    setBatchItems([]);
    setAnalyzeError('');
    setConfirmError('');
    setConfirmOpen(false);
    setPreguntasGpt([]);
    setRespuestasGpt({});
    setPreguntasError('');
    setPreguntasLoading(false);
    setImportWizardData(initialImportWizardData());
    setTabularError('');
    setTabularLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open, resetWizard]);

  useEffect(() => {
    if (!open || !empresa?.id) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const obras = Array.isArray(empresa.obras) ? empresa.obras : [];
        const provNombres = await proveedorService.getNombres(empresa.id);
        if (cancelled) return;
        setDrawerCatalogos({
          comprobanteInfo: empresa.comprobante_info || {},
          ingresoInfo: empresa.ingreso_info || {},
          proveedores: [...provNombres, 'Ajuste'],
          categorias: [
            ...(empresa.categorias || []),
            { name: 'Ingreso dinero', subcategorias: [] },
            { name: 'Ajuste', subcategorias: ['Ajuste'] },
          ],
          tagsExtra: empresa.tags_extra || [],
          mediosPago: empresa.medios_pago?.length
            ? empresa.medios_pago
            : ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'],
          etapas: empresa.etapas || [],
          obrasOptions: obras.map((o) => o.nombre).filter(Boolean),
          clientesOptions: [...new Set(obras.map((o) => o.cliente).filter(Boolean))],
        });
      } catch (e) {
        console.warn('CargaMasiva: catálogos', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, empresa]);

  const empresaConProyectos = useMemo(
    () => (empresa ? { ...empresa, proyectos: proyectos || [] } : null),
    [empresa, proyectos],
  );

  const steps = useMemo(() => {
    if (cargaModo === 'tabular') return STEPS_TABULAR;
    if (cargaModo === 'ocr') return STEPS_OCR;
    return [];
  }, [cargaModo]);

  const proyectoNombreById = useMemo(() => {
    const m = {};
    (proyectos || []).forEach((p) => {
      m[p.id] = p.nombre || p.name;
    });
    return m;
  }, [proyectos]);

  const contextoForMap = useMemo(
    () => ({
      proyecto_id: contexto.proyecto_id,
      proyecto_nombre: contexto.proyecto_nombre,
      default_type: contexto.default_type,
      default_moneda: contexto.default_moneda,
      default_categorias: contexto.default_categorias,
      default_medios_pago: contexto.default_medios_pago,
      default_subcategoria: contexto.default_subcategoria,
      default_etapa: contexto.default_etapa,
    }),
    [contexto],
  );

  const textoCuestionario = useMemo(
    () => buildContextoCuestionarioTexto(preguntasGpt, respuestasGpt),
    [preguntasGpt, respuestasGpt],
  );

  const payloadContextoLote = useMemo(
    () => ({
      proyecto_id: contexto.proyecto_id || undefined,
      proyecto_nombre: contexto.proyecto_nombre || undefined,
      default_type: contexto.default_type,
      default_moneda: contexto.default_moneda,
      ...(Array.isArray(contexto.default_categorias) && contexto.default_categorias.length > 0
        ? { default_categorias: contexto.default_categorias }
        : {}),
      ...(Array.isArray(contexto.default_medios_pago) && contexto.default_medios_pago.length > 0
        ? { default_medios_pago: contexto.default_medios_pago }
        : {}),
      default_etapa: contexto.default_etapa || undefined,
      notas_lote: contexto.notas_lote || undefined,
      ...(textoCuestionario.trim()
        ? { contexto_cuestionario_texto: textoCuestionario.trim() }
        : {}),
    }),
    [contexto, textoCuestionario],
  );

  const canConfirm = useMemo(() => {
    const pendientes = batchItems.filter((i) => !i.omitido);
    if (pendientes.length === 0) return false;
    return pendientes.every((i) =>
      itemFormIsValid(i.form, drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo),
    );
  }, [batchItems, drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo]);

  const handleClose = () => {
    if (confirmLoading || analyzeLoading || tabularLoading) return;
    onClose();
  };

  const handleModoChange = (_e, value) => {
    if (value === null) return;
    setActiveStep(0);
    setTabularError('');
    if (value === 'ocr') {
      setImportWizardData(initialImportWizardData());
    } else {
      setFiles([]);
      setPreguntasGpt([]);
      setRespuestasGpt({});
      setPreguntasError('');
      setBatchItems([]);
    }
    setCargaModo(value);
  };

  const fetchPreguntasYAvanzar = useCallback(async () => {
    if (files.length === 0) return;
    setPreguntasError('');
    setPreguntasLoading(true);
    try {
      const muestra = pickRandomFiles(files, 5);
      const metadata_lote = {
        total: files.length,
        archivos: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      };
      const res = await movimientosService.sugerirPreguntasCargaMasiva(muestra, metadata_lote);
      if (res.error) {
        throw new Error(res.message || 'Error al generar preguntas');
      }
      const preguntas = Array.isArray(res.data?.preguntas) ? res.data.preguntas : [];
      setPreguntasGpt(preguntas);
      setRespuestasGpt({});
      setActiveStep(1);
    } catch (e) {
      setPreguntasError(e.message || 'Error al generar preguntas');
    } finally {
      setPreguntasLoading(false);
    }
  }, [files]);

  const handleRespuestasGptPatch = useCallback((qid, patch) => {
    setRespuestasGpt((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], ...patch },
    }));
  }, []);

  const handleRunAnalyze = async () => {
    setAnalyzeError('');
    setAnalyzeLoading(true);
    try {
      const res = await movimientosService.analizarCargaMasiva(files, payloadContextoLote);
      if (res.error) {
        throw new Error(res.message || 'Error al analizar');
      }
      const rawItems = res.data?.items || [];
      const mapped = rawItems.map((it, i) => ({
        clientId: `cm-${i}-${(it.originalname || 'file').replace(/\s/g, '_')}`,
        originalname: it.originalname || `archivo-${i}`,
        url_imagen: it.url_imagen,
        errorAnalisis: it.error || null,
        omitido: false,
        revisado: false,
        form: it.extracted
          ? mapExtractedToForm(it.extracted, contextoForMap)
          : emptyForm(contextoForMap),
      }));
      setBatchItems(mapped);
      setActiveStep(2);
    } catch (e) {
      setAnalyzeError(e.message || 'Error al analizar el lote');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleOcrNext = async () => {
    if (activeStep === 0) {
      await fetchPreguntasYAvanzar();
      return;
    }
    if (activeStep === 1) {
      if (!contexto.proyecto_id) return;
      if (!preguntasEstanCompletas(preguntasGpt, respuestasGpt)) return;
      await handleRunAnalyze();
    }
  };

  const handleTabularNext = async () => {
    setTabularError('');
    if (activeStep === 0) {
      if (!importWizardData.analisisCsv) return;
      if (
        importWizardData.tipoImportacion === 'proyecto_especifico' &&
        !importWizardData.proyectoSeleccionado
      ) {
        return;
      }
      setActiveStep(1);
      return;
    }
    try {
      if (activeStep === 1) {
        await categoriasRef.current?.submitStep();
        setActiveStep(2);
        return;
      }
      if (activeStep === 2) {
        await proveedoresRef.current?.submitStep();
        setActiveStep(3);
        return;
      }
      if (activeStep === 3) {
        await aclaracionesRef.current?.submitStep();
        updateImportWizardData({
          previewRowsForValidation: null,
          codigoPrevisualizacion: null,
          movimientosValidadosParaCrear: null,
        });
        setActiveStep(4);
        return;
      }
      if (activeStep === 4) {
        await validacionRef.current?.submitStep();
        setActiveStep(5);
      }
    } catch {
      /* error ya en setTabularError vía Pasos */
    }
  };

  const handleNext = async () => {
    if (cargaModo === 'ocr') {
      await handleOcrNext();
    } else if (cargaModo === 'tabular') {
      await handleTabularNext();
    }
  };

  const handleBack = () => {
    if (cargaModo === 'ocr') {
      if (activeStep === 2) return;
      if (activeStep === 1) {
        setPreguntasGpt([]);
        setRespuestasGpt({});
        setPreguntasError('');
      }
      if (activeStep === 0) {
        setCargaModo(null);
        setFiles([]);
        return;
      }
      setActiveStep((s) => Math.max(0, s - 1));
      return;
    }
    if (cargaModo === 'tabular') {
      if (activeStep === 0) {
        setCargaModo(null);
        setImportWizardData(initialImportWizardData());
        return;
      }
      if (activeStep === 4) {
        updateImportWizardData({
          previewRowsForValidation: null,
          codigoPrevisualizacion: null,
          movimientosValidadosParaCrear: null,
        });
      }
      setActiveStep((s) => Math.max(0, s - 1));
    }
  };

  const updateItem = useCallback((clientId, updater) => {
    setBatchItems((prev) => prev.map((it) => (it.clientId === clientId ? updater(it) : it)));
  }, []);

  const handleApplyProyectoToAll = useCallback(() => {
    if (!contexto.proyecto_id) return;
    setBatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        form: {
          ...it.form,
          proyecto_id: contexto.proyecto_id,
          proyecto_nombre: contexto.proyecto_nombre,
        },
      })),
    );
  }, [contexto.proyecto_id, contexto.proyecto_nombre]);

  const handleOpenConfirm = () => {
    setConfirmError('');
    setConfirmOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!user?.phone) {
      setConfirmError('No se encontró el teléfono del usuario. Volvé a iniciar sesión.');
      return;
    }
    setConfirmLoading(true);
    setConfirmError('');
    try {
      const toCreate = batchItems.filter((i) => !i.omitido);
      const movimientos = toCreate.map((it) =>
        buildMovimientoPayloadFromBatchItem(it.form, {
          comprobante_info: drawerCatalogos.comprobanteInfo,
          ingreso_info: drawerCatalogos.ingresoInfo,
          proyectoNombreById,
          userPhone: user.phone,
        }),
      );
      const res = await movimientosService.confirmarCargaMasiva(movimientos);
      if (res.error) {
        throw new Error(res.message || 'Error al crear movimientos');
      }
      const { ok = [], errores = [] } = res.data || {};
      setConfirmOpen(false);
      onSuccess?.({ ok, errores });
      onClose();
    } catch (e) {
      setConfirmError(e.message || 'Error al confirmar');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleImportFinish = (resultadoImport) => {
    onSuccess?.({
      tabularImport: true,
      resultado: resultadoImport,
      wizardSnapshot: importWizardData,
    });
    onClose();
  };

  const stepProgress = cargaModo
    ? ((activeStep + 1) / steps.length) * 100
    : 0;

  const nextDisabledOcr =
    (activeStep === 0 && (files.length === 0 || preguntasLoading)) ||
    (activeStep === 1 &&
      (!contexto.proyecto_id || !preguntasEstanCompletas(preguntasGpt, respuestasGpt))) ||
    analyzeLoading;

  const nextDisabledTabular =
    (activeStep === 0 &&
      (!importWizardData.analisisCsv ||
        (importWizardData.tipoImportacion === 'proyecto_especifico' &&
          !importWizardData.proyectoSeleccionado))) ||
    (activeStep === 4 && !importWizardData.previewRowsForValidation?.length) ||
    tabularLoading;

  const showPrimaryNext =
    cargaModo === 'ocr'
      ? activeStep < 2
      : cargaModo === 'tabular'
        ? activeStep < 5
        : false;

  const primaryNextDisabled =
    cargaModo === 'ocr' ? nextDisabledOcr : cargaModo === 'tabular' ? nextDisabledTabular : true;

  const primaryNextLabel =
    cargaModo === 'ocr' && activeStep === 1
      ? analyzeLoading
        ? 'Analizando…'
        : 'Analizar y continuar'
      : 'Siguiente';

  const backDisabled =
    cargaModo === 'ocr'
      ? activeStep === 2 || analyzeLoading
      : cargaModo === 'tabular'
        ? tabularLoading
        : false;

  const renderTabularStep = () => {
    if (!empresaConProyectos) return null;
    const common = {
      empresa: empresaConProyectos,
      wizardData: importWizardData,
      updateWizardData: updateImportWizardData,
      setLoading: setTabularLoading,
      setError: setTabularError,
    };
    switch (activeStep) {
      case 0:
        return (
          <ImportPlanillaStep
            {...common}
            hideNavigation
            title="Planilla CSV o Excel"
            subtitle="Subí los archivos y elegí cómo se asignan los proyectos. Luego usá «Siguiente»."
          />
        );
      case 1:
        return (
          <PasoRevisarCategorias
            ref={categoriasRef}
            {...common}
            onNext={() => {}}
            onBack={() => {}}
            hideNavigation
          />
        );
      case 2:
        return (
          <PasoRevisarProveedores
            ref={proveedoresRef}
            {...common}
            onNext={() => {}}
            onBack={() => {}}
            hideNavigation
          />
        );
      case 3:
        return (
          <PasoAclaracionesMovimientos
            ref={aclaracionesRef}
            wizardData={importWizardData}
            updateWizardData={updateImportWizardData}
            onNext={() => {}}
            onBack={() => {}}
            hideNavigation
          />
        );
      case 4:
        return (
          <PasoValidarMovimientosImport
            key={`val-${importWizardData.analisisCsv?.timestamp || 0}-${(importWizardData.aclaracionesUsuario || '').length}`}
            ref={validacionRef}
            {...common}
            hideNavigation
          />
        );
      case 5:
        return (
          <PasoResumen
            {...common}
            updateWizardData={updateImportWizardData}
            onFinish={handleImportFinish}
            onBack={() => {}}
            hideNavigation
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth scroll="paper">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <UploadFileIcon color="primary" />
            <Typography variant="h6" component="span">
              Carga masiva de movimientos
            </Typography>
          </Stack>
        </DialogTitle>
        <Box sx={{ px: 3, pt: 0 }}>
          {cargaModo && (
            <>
              <LinearProgress variant="determinate" value={stepProgress} sx={{ height: 4, borderRadius: 1, mb: 2 }} />
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </>
          )}
        </Box>
        <DialogContent dividers sx={{ minHeight: 420 }}>
          {tabularError && cargaModo === 'tabular' && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTabularError('')}>
              {tabularError}
            </Alert>
          )}
          {!cargaModo && (
            <Stack spacing={2} alignItems="stretch">
              <Typography variant="body2" color="text.secondary">
                Elegí un tipo de carga. No se pueden mezclar comprobantes y planillas en la misma sesión.
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={cargaModo}
                onChange={handleModoChange}
                fullWidth
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="ocr" sx={{ py: 1.5, flex: 1, minWidth: 160 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ImageIcon fontSize="small" />
                    <Typography variant="body2">Comprobantes (imagen / PDF)</Typography>
                  </Stack>
                </ToggleButton>
                <ToggleButton value="tabular" sx={{ py: 1.5, flex: 1, minWidth: 160 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TableChartIcon fontSize="small" />
                    <Typography variant="body2">Planilla (CSV / Excel)</Typography>
                  </Stack>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}

          {cargaModo === 'ocr' && (
            <>
              {analyzeError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAnalyzeError('')}>
                  {analyzeError}
                </Alert>
              )}
              {activeStep === 0 && (
                <Box sx={{ position: 'relative' }}>
                  {preguntasError && (
                    <Alert
                      severity="error"
                      sx={{ mb: 2 }}
                      action={
                        <Button color="inherit" size="small" onClick={fetchPreguntasYAvanzar} disabled={preguntasLoading}>
                          Reintentar
                        </Button>
                      }
                    >
                      {preguntasError}
                    </Alert>
                  )}
                  {preguntasLoading && (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={2}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2,
                        minHeight: 240,
                        bgcolor: (theme) => theme.palette.background.paper,
                        opacity: 0.96,
                      }}
                    >
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" textAlign="center" px={2}>
                        Analizando la muestra del lote (preguntas extra solo si hace falta)…
                      </Typography>
                    </Stack>
                  )}
                  <CargaArchivosStep files={files} onFilesChange={setFiles} />
                </Box>
              )}
              {activeStep === 1 && (
                <PreguntasContextoStep
                  contexto={contexto}
                  onChange={setContexto}
                  proyectos={proyectos}
                  files={files}
                  categorias={drawerCatalogos.categorias}
                  mediosPago={drawerCatalogos.mediosPago}
                  preguntasGpt={preguntasGpt}
                  respuestasGpt={respuestasGpt}
                  onRespuestasChange={handleRespuestasGptPatch}
                />
              )}
              {activeStep === 2 && !analyzeLoading && (
                <Stack spacing={2}>
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center">
                    <Button size="small" variant="outlined" onClick={handleApplyProyectoToAll}>
                      Aplicar proyecto por defecto a todos
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {batchItems.filter((i) => i.omitido).length} omitidos ·{' '}
                      {batchItems.filter((i) => !i.omitido).length} a confirmar
                    </Typography>
                  </Stack>
                  <ValidacionLoteStep
                    items={batchItems}
                    onUpdateItem={updateItem}
                    empresa={empresa}
                    proyectos={proyectos}
                    comprobanteInfo={drawerCatalogos.comprobanteInfo}
                    ingresoInfo={drawerCatalogos.ingresoInfo}
                    proveedores={drawerCatalogos.proveedores}
                    categorias={drawerCatalogos.categorias}
                    tagsExtra={drawerCatalogos.tagsExtra}
                    mediosPago={drawerCatalogos.mediosPago}
                    etapas={drawerCatalogos.etapas}
                    obrasOptions={drawerCatalogos.obrasOptions}
                    clientesOptions={drawerCatalogos.clientesOptions}
                    onRequestConfirm={handleOpenConfirm}
                    canConfirm={canConfirm}
                  />
                </Stack>
              )}
              {analyzeLoading && (
                <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
                  <CircularProgress />
                  <Typography>Analizando comprobantes…</Typography>
                </Stack>
              )}
            </>
          )}

          {cargaModo === 'tabular' && empresaConProyectos && (
            <Box sx={{ position: 'relative' }}>
              {tabularLoading && (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    bgcolor: (t) => t.palette.background.paper,
                    opacity: 0.85,
                  }}
                >
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary">
                    Procesando…
                  </Typography>
                </Stack>
              )}
              {renderTabularStep()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={analyzeLoading || confirmLoading || tabularLoading}>
            Cancelar
          </Button>
          {cargaModo && (
            <Button onClick={handleBack} disabled={backDisabled}>
              Atrás
            </Button>
          )}
          {showPrimaryNext && (
            <Button variant="contained" onClick={handleNext} disabled={primaryNextDisabled}>
              {primaryNextLabel}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => !confirmLoading && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar creación</DialogTitle>
        <DialogContent>
          {confirmError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {confirmError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 1 }}>
            Se crearán {batchItems.filter((i) => !i.omitido).length} movimiento(s). Los omitidos no se registran.
          </Typography>
          {!canConfirm && (
            <Alert severity="warning">
              Revisá que cada comprobante tenga proyecto (si aplica), fecha y total válidos.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={confirmLoading}>
            Volver
          </Button>
          <Button variant="contained" onClick={handleConfirmCreate} disabled={confirmLoading || !canConfirm}>
            {confirmLoading ? <CircularProgress size={22} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

CargaMasivaDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  empresa: PropTypes.object,
  proyectos: PropTypes.arrayOf(PropTypes.object),
  user: PropTypes.object,
  onSuccess: PropTypes.func,
};

CargaMasivaDialog.defaultProps = {
  empresa: null,
  proyectos: [],
  user: null,
  onSuccess: undefined,
};

export default CargaMasivaDialog;
