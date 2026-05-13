import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { getCamposConfig } from 'src/components/movementFieldsConfig';
import BatchValidationForm from '../BatchValidationForm';

function isItemSplit(item) {
  return Boolean(item && item.page != null && item.total_pages != null && item.total_pages > 1);
}

/**
 * Agrupa items consecutivos del mismo PDF splitteado para la barra de chips.
 * Items no-split (imágenes, PDFs sin toggle) caen en grupos kind:'single' del mismo elemento.
 */
function groupItemsForChipBar(items) {
  const groups = [];
  items.forEach((item, idx) => {
    const split = isItemSplit(item);
    const last = groups[groups.length - 1];
    if (split && last && last.kind === 'split' && last.originalname === item.originalname) {
      last.entries.push({ item, idx });
    } else {
      groups.push({
        kind: split ? 'split' : 'single',
        originalname: item.originalname,
        totalPages: split ? item.total_pages : null,
        entries: [{ item, idx }],
      });
    }
  });
  return groups;
}

const ValidacionLoteStep = forwardRef(
  (
    {
      items,
      onUpdateItem,
      empresa,
      proyectos,
      comprobanteInfo,
      ingresoInfo,
      proveedores,
      categorias,
      tagsExtra,
      mediosPago,
      etapas,
      obrasOptions,
      clientesOptions,
      onRequestConfirm,
      onNavStateChange,
      onCopyToSiblings,
    },
    ref,
  ) => {
    const eligible = useMemo(() => items.filter((i) => !i.omitido), [items]);
    const [idx, setIdx] = useState(0);
    const [overwriteSiblings, setOverwriteSiblings] = useState(false);
    const [snackbar, setSnackbar] = useState(null);

    useEffect(() => {
      setIdx((i) => {
        if (eligible.length === 0) return 0;
        return Math.min(i, eligible.length - 1);
      });
    }, [eligible.length]);

    const current = eligible[idx] || null;
    const currentIsSplit = isItemSplit(current);

    const continuarDisabled = useMemo(() => {
      if (!current) return true;
      const f = current.form;
      const tipo = f.type || 'egreso';
      const camposConfig = getCamposConfig(comprobanteInfo, ingresoInfo, tipo);
      const shouldShowProyecto = Boolean(camposConfig?.proyecto);
      return (
        (shouldShowProyecto && !f.proyecto_id) ||
        f.total === '' ||
        f.total === undefined ||
        f.total === null ||
        !f.fecha_factura
      );
    }, [current, comprobanteInfo, ingresoInfo]);

    const handleFormChange = useCallback(
      (nextForm) => {
        if (!current) return;
        onUpdateItem(current.clientId, (it) => ({ ...it, form: nextForm }));
      },
      [current, onUpdateItem],
    );

    const handleOmitirCb = useCallback(() => {
      if (!current) return;
      onUpdateItem(current.clientId, (it) => ({ ...it, omitido: true }));
    }, [current, onUpdateItem]);

    const handleContinuarCb = useCallback(() => {
      if (!current || continuarDisabled) return;
      onUpdateItem(current.clientId, (it) => ({ ...it, revisado: true }));
      if (idx < eligible.length - 1) {
        setIdx(idx + 1);
      } else {
        onRequestConfirm();
      }
    }, [current, continuarDisabled, idx, eligible.length, onUpdateItem, onRequestConfirm]);

    const handlePrevNavCb = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const handleNextNavCb = useCallback(
      () => setIdx((i) => Math.min(eligible.length - 1, i + 1)),
      [eligible.length],
    );

    useImperativeHandle(
      ref,
      () => ({
        continuar: handleContinuarCb,
        omitir: handleOmitirCb,
        prevNav: handlePrevNavCb,
        nextNav: handleNextNavCb,
      }),
      [handleContinuarCb, handleOmitirCb, handlePrevNavCb, handleNextNavCb],
    );

    useEffect(() => {
      onNavStateChange?.({
        continuarDisabled,
        confirmLabel: idx < eligible.length - 1 ? 'Revisado y siguiente' : 'Revisado y finalizar',
        hasPrev: idx > 0,
        hasNext: idx < eligible.length - 1,
        textoProgreso: eligible.length > 0 ? `Comprobante ${idx + 1} de ${eligible.length}` : '',
        hasItems: eligible.length > 0,
      });
    }, [continuarDisabled, idx, eligible.length, onNavStateChange]);

    const handleChipClick = useCallback(
      (item) => {
        if (item.omitido) return;
        const ei = eligible.findIndex((e) => e.clientId === item.clientId);
        if (ei >= 0) setIdx(ei);
      },
      [eligible],
    );

    // Navegación intra-PDF: hermanos del mismo `originalname` en `eligible`.
    const siblings = useMemo(() => {
      if (!current || !currentIsSplit) return [];
      return eligible
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.originalname === current.originalname && e.page != null);
    }, [current, currentIsSplit, eligible]);

    const myPosInSiblings = useMemo(
      () => (current ? siblings.findIndex(({ e }) => e.clientId === current.clientId) : -1),
      [current, siblings],
    );
    const hasPrevSibling = myPosInSiblings > 0;
    const hasNextSibling = myPosInSiblings >= 0 && myPosInSiblings < siblings.length - 1;

    const goToSibling = (delta) => {
      const target = siblings[myPosInSiblings + delta];
      if (target) setIdx(target.i);
    };

    const handleCopyToSiblingsClick = () => {
      if (!current || !currentIsSplit || !onCopyToSiblings) return;
      const { copiedCount = 0 } = onCopyToSiblings(current.clientId, {
        overwrite: overwriteSiblings,
      }) || {};
      if (copiedCount === 0) {
        setSnackbar({
          message: 'No hay otras páginas de este PDF disponibles para copiar.',
          severity: 'info',
        });
      } else {
        setSnackbar({
          message: `Copiado a ${copiedCount} página${copiedCount === 1 ? '' : 's'} del mismo PDF.`,
          severity: 'success',
        });
      }
    };

    const urlImagen = current?.form?.url_imagen;
    const isPdf = Boolean(urlImagen && String(urlImagen).toLowerCase().includes('.pdf'));

    const usaChipBar = items.length <= 15;
    const chipGroups = useMemo(
      () => (usaChipBar ? groupItemsForChipBar(items) : []),
      [items, usaChipBar],
    );

    if (eligible.length === 0) {
      return (
        <Alert severity="warning">
          No quedan comprobantes para revisar. Volvé atrás o cerrá el asistente.
        </Alert>
      );
    }

    const revisados = items.filter((i) => i.revisado && !i.omitido).length;
    const omitidos = items.filter((i) => i.omitido).length;
    const pendientes = items.filter((i) => !i.revisado && !i.omitido).length;

    const renderChipForItem = (item, i) => {
      const isCurrent = item.clientId === current?.clientId;
      const label = String(i + 1);
      const tip = item.page != null ? `${item.originalname} · pág. ${item.page}` : item.originalname;
      if (item.omitido) {
        return (
          <Tooltip key={item.clientId} title={tip}>
            <Chip
              label={label}
              size="small"
              variant="outlined"
              sx={{ opacity: 0.4, textDecoration: 'line-through', cursor: 'default' }}
            />
          </Tooltip>
        );
      }
      if (isCurrent) {
        return (
          <Tooltip key={item.clientId} title={tip}>
            <Chip label={label} size="small" color="primary" />
          </Tooltip>
        );
      }
      if (item.revisado) {
        return (
          <Tooltip key={item.clientId} title={tip}>
            <Chip
              label={label}
              size="small"
              color="success"
              onClick={() => handleChipClick(item)}
              sx={{ cursor: 'pointer' }}
            />
          </Tooltip>
        );
      }
      return (
        <Tooltip key={item.clientId} title={tip}>
          <Chip
            label={label}
            size="small"
            variant="outlined"
            onClick={() => handleChipClick(item)}
            sx={{ cursor: 'pointer' }}
          />
        </Tooltip>
      );
    };

    return (
      <>
        {/* Item status strip */}
        {usaChipBar ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="flex-end" sx={{ mb: 1.5 }}>
            {chipGroups.map((group, gi) => {
              if (group.kind === 'single') {
                return group.entries.map(({ item, idx: gIdx }) => renderChipForItem(item, gIdx));
              }
              const containsCurrent = group.entries.some(({ item }) => item.clientId === current?.clientId);
              return (
                <Box
                  key={`grp-${gi}-${group.originalname}`}
                  sx={{
                    px: 0.75,
                    pt: 0.25,
                    pb: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: containsCurrent ? 'primary.light' : 'action.selected',
                    bgcolor: containsCurrent ? 'action.hover' : 'transparent',
                    transition: 'background-color 120ms ease, border-color 120ms ease',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', lineHeight: 1.2, mb: 0.25, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={group.originalname}
                  >
                    {group.originalname} · {group.totalPages} págs
                  </Typography>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {group.entries.map(({ item, idx: gIdx }) => renderChipForItem(item, gIdx))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ mb: 1.5 }}>
            <Stack
              direction="row"
              sx={{ height: 6, borderRadius: 1, overflow: 'hidden', mb: 0.5 }}
            >
              {revisados > 0 && <Box sx={{ flex: revisados, bgcolor: 'success.main' }} />}
              {omitidos > 0 && <Box sx={{ flex: omitidos, bgcolor: 'grey.400' }} />}
              {pendientes > 0 && <Box sx={{ flex: pendientes, bgcolor: 'grey.200' }} />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {`${revisados} revisados · ${omitidos} omitidos · ${pendientes} pendientes`}
            </Typography>
          </Box>
        )}

        {/* Cabecera del item: nombre + page badge + nav intra-PDF */}
        {current && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1, flexWrap: 'wrap' }}
          >
            {isPdf ? (
              <PictureAsPdfIcon fontSize="small" color="error" />
            ) : (
              <ImageOutlinedIcon fontSize="small" color="action" />
            )}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={current.originalname}
            >
              {current.originalname}
            </Typography>
            {currentIsSplit && (
              <>
                <Chip
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={`Página ${current.page} de ${current.total_pages}`}
                  sx={{ fontFeatureSettings: '"tnum"' }}
                />
                <Tooltip title="Página anterior del mismo PDF">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => goToSibling(-1)}
                      disabled={!hasPrevSibling}
                      aria-label="Página anterior del mismo PDF"
                    >
                      <KeyboardArrowLeftIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Página siguiente del mismo PDF">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => goToSibling(1)}
                      disabled={!hasNextSibling}
                      aria-label="Página siguiente del mismo PDF"
                    >
                      <KeyboardArrowRightIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </Stack>
        )}

        {current?.errorAnalisis && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            No se pudieron extraer datos automáticamente: {current.errorAnalisis}. Completá el
            formulario manualmente.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ minHeight: { xs: 360, md: 480 } }}>
          <Grid item xs={12} md={7}>
            <Box
              sx={{
                height: { xs: 320, md: 'min(70vh, 640px)' },
                bgcolor: 'grey.100',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {urlImagen ? (
                isPdf ? (
                  <Box
                    component="embed"
                    src={urlImagen}
                    type="application/pdf"
                    title="Comprobante PDF"
                    sx={{ width: '100%', height: '100%', border: 'none', minHeight: 300 }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={urlImagen}
                    alt="Comprobante"
                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                )
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sin vista previa
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box
              sx={{ maxHeight: { xs: 'none', md: 'min(70vh, 640px)' }, overflowY: 'auto', pr: 0.5 }}
            >
              {current && (
                <BatchValidationForm
                  form={current.form}
                  onFormChange={handleFormChange}
                  proyectos={proyectos}
                  empresa={empresa}
                  comprobanteInfo={comprobanteInfo}
                  ingresoInfo={ingresoInfo}
                  proveedores={proveedores}
                  categorias={categorias}
                  tagsExtra={tagsExtra}
                  mediosPago={mediosPago}
                  etapas={etapas}
                  obrasOptions={obrasOptions}
                  clientesOptions={clientesOptions}
                  tipoMov={current.form.type || 'egreso'}
                />
              )}
              {currentIsSplit && onCopyToSiblings && siblings.length > 1 && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyToSiblingsClick}
                    >
                      Copiar a las demás páginas de este PDF
                    </Button>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={overwriteSiblings}
                          onChange={(_e, v) => setOverwriteSiblings(v)}
                        />
                      }
                      label={<Typography variant="caption">Sobrescribir valores ya cargados</Typography>}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Copia proveedor, fecha, proyecto, categoría y medio de pago a las otras {siblings.length - 1} página(s) del mismo PDF.
                    No copia importes ni número de comprobante.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        <Snackbar
          open={!!snackbar}
          autoHideDuration={3500}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {snackbar ? (
            <Alert
              onClose={() => setSnackbar(null)}
              severity={snackbar.severity || 'success'}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          ) : undefined}
        </Snackbar>
      </>
    );
  },
);

ValidacionLoteStep.displayName = 'ValidacionLoteStep';

ValidacionLoteStep.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUpdateItem: PropTypes.func.isRequired,
  empresa: PropTypes.object,
  proyectos: PropTypes.arrayOf(PropTypes.object).isRequired,
  comprobanteInfo: PropTypes.object,
  ingresoInfo: PropTypes.object,
  proveedores: PropTypes.arrayOf(PropTypes.string),
  categorias: PropTypes.arrayOf(PropTypes.object),
  tagsExtra: PropTypes.arrayOf(PropTypes.string),
  mediosPago: PropTypes.arrayOf(PropTypes.string),
  etapas: PropTypes.array,
  obrasOptions: PropTypes.arrayOf(PropTypes.string),
  clientesOptions: PropTypes.arrayOf(PropTypes.string),
  onRequestConfirm: PropTypes.func.isRequired,
  onNavStateChange: PropTypes.func,
  onCopyToSiblings: PropTypes.func,
};

ValidacionLoteStep.defaultProps = {
  empresa: null,
  comprobanteInfo: {},
  ingresoInfo: {},
  proveedores: [],
  categorias: [],
  tagsExtra: [],
  mediosPago: [],
  etapas: [],
  obrasOptions: [],
  clientesOptions: [],
  onNavStateChange: undefined,
  onCopyToSiblings: undefined,
};

export default ValidacionLoteStep;
