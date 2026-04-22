import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Chip, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { getCamposConfig } from 'src/components/movementFieldsConfig';
import BatchValidationForm from '../BatchValidationForm';

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
    },
    ref,
  ) => {
    const eligible = useMemo(() => items.filter((i) => !i.omitido), [items]);
    const [idx, setIdx] = useState(0);

    useEffect(() => {
      setIdx((i) => {
        if (eligible.length === 0) return 0;
        return Math.min(i, eligible.length - 1);
      });
    }, [eligible.length]);

    const current = eligible[idx] || null;

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

    const urlImagen = current?.form?.url_imagen;
    const isPdf = Boolean(urlImagen && String(urlImagen).toLowerCase().includes('.pdf'));

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

    return (
      <>
        {/* Item status strip */}
        {items.length <= 15 ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {items.map((item, i) => {
              const isCurrent = item.clientId === current?.clientId;
              const label = String(i + 1);
              if (item.omitido) {
                return (
                  <Tooltip key={item.clientId} title={item.originalname}>
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
                  <Tooltip key={item.clientId} title={item.originalname}>
                    <Chip label={label} size="small" color="primary" />
                  </Tooltip>
                );
              }
              if (item.revisado) {
                return (
                  <Tooltip key={item.clientId} title={item.originalname}>
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
                <Tooltip key={item.clientId} title={item.originalname}>
                  <Chip
                    label={label}
                    size="small"
                    variant="outlined"
                    onClick={() => handleChipClick(item)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Tooltip>
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
            </Box>
          </Grid>
        </Grid>
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
};

export default ValidacionLoteStep;
