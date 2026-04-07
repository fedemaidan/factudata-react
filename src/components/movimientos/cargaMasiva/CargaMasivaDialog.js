import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import proveedorService from 'src/services/proveedorService';
import movimientosService from 'src/services/movimientosService';
import { getCamposConfig } from 'src/components/movementFieldsConfig';
import CargaArchivosStep from './steps/CargaArchivosStep';
import PreguntasContextoStep from './steps/PreguntasContextoStep';
import ValidacionLoteStep from './steps/ValidacionLoteStep';
import { mapExtractedToForm, emptyForm } from './cargaMasivaMap';
import { buildMovimientoPayloadFromBatchItem } from './buildBatchMovimientoPayload';

const STEPS = ['Archivos', 'Contexto', 'Validación'];

const initialContexto = () => ({
  proyecto_id: '',
  proyecto_nombre: '',
  default_type: 'egreso',
  default_moneda: 'ARS',
  default_categoria: '',
  default_medio_pago: '',
  default_etapa: '',
  notas_lote: '',
});

function itemFormIsValid(form, comprobanteInfo, ingresoInfo) {
  const tipo = form.type || 'egreso';
  const camposConfig = getCamposConfig(comprobanteInfo, ingresoInfo, tipo);
  if (camposConfig.proyecto && !form.proyecto_id) return false;
  if (form.total === '' || form.total === undefined || form.total === null) return false;
  if (!form.fecha_factura) return false;
  if (camposConfig.fecha_pago && !form.fecha_pago) return false;
  return true;
}

const CargaMasivaDialog = ({ open, onClose, empresa, proyectos, user, onSuccess }) => {
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

  const resetWizard = useCallback(() => {
    setActiveStep(0);
    setFiles([]);
    setContexto(initialContexto());
    setBatchItems([]);
    setAnalyzeError('');
    setConfirmError('');
    setConfirmOpen(false);
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
      default_categoria: contexto.default_categoria,
      default_medio_pago: contexto.default_medio_pago,
      default_subcategoria: contexto.default_subcategoria,
      default_etapa: contexto.default_etapa,
    }),
    [contexto],
  );

  const payloadContextoLote = useMemo(
    () => ({
      proyecto_id: contexto.proyecto_id || undefined,
      proyecto_nombre: contexto.proyecto_nombre || undefined,
      default_type: contexto.default_type,
      default_moneda: contexto.default_moneda,
      default_categoria: contexto.default_categoria || undefined,
      default_medio_pago: contexto.default_medio_pago || undefined,
      default_etapa: contexto.default_etapa || undefined,
      notas_lote: contexto.notas_lote || undefined,
    }),
    [contexto],
  );

  const canConfirm = useMemo(() => {
    const pendientes = batchItems.filter((i) => !i.omitido);
    if (pendientes.length === 0) return false;
    return pendientes.every((i) =>
      itemFormIsValid(i.form, drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo),
    );
  }, [batchItems, drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo]);

  const handleClose = () => {
    if (confirmLoading || analyzeLoading) return;
    onClose();
  };

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

  const handleNext = async () => {
    if (activeStep === 0) {
      if (files.length === 0) return;
      setActiveStep(1);
      return;
    }
    if (activeStep === 1) {
      if (!contexto.proyecto_id) return;
      await handleRunAnalyze();
    }
  };

  const handleBack = () => {
    if (activeStep === 2) return;
    setActiveStep((s) => Math.max(0, s - 1));
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

  const stepProgress = ((activeStep + 1) / STEPS.length) * 100;

  const nextDisabled =
    (activeStep === 0 && files.length === 0) ||
    (activeStep === 1 && !contexto.proyecto_id) ||
    analyzeLoading;

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
          <LinearProgress variant="determinate" value={stepProgress} sx={{ height: 4, borderRadius: 1, mb: 2 }} />
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        <DialogContent dividers sx={{ minHeight: 420 }}>
          {analyzeError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAnalyzeError('')}>
              {analyzeError}
            </Alert>
          )}
          {activeStep === 0 && <CargaArchivosStep files={files} onFilesChange={setFiles} />}
          {activeStep === 1 && (
            <PreguntasContextoStep
              contexto={contexto}
              onChange={setContexto}
              proyectos={proyectos}
              files={files}
            />
          )}
          {activeStep === 2 && !analyzeLoading && (
            <Stack spacing={2}>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center">
                <Button size="small" variant="outlined" onClick={handleApplyProyectoToAll}>
                  Aplicar proyecto por defecto a todos
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {batchItems.filter((i) => i.omitido).length} omitidos · {batchItems.filter((i) => !i.omitido).length}{' '}
                  a confirmar
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
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={analyzeLoading || confirmLoading}>
            Cancelar
          </Button>
          {activeStep < 2 && (
            <Button onClick={handleBack} disabled={activeStep === 0 || analyzeLoading}>
              Atrás
            </Button>
          )}
          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext} disabled={nextDisabled}>
              {activeStep === 1 ? (analyzeLoading ? 'Analizando…' : 'Analizar y continuar') : 'Siguiente'}
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
