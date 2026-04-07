import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Grid, Stack, Typography, Alert } from '@mui/material';
import AssistedCorrectionNavigator from 'src/components/common/AssistedCorrectionNavigator';
import { getCamposConfig } from 'src/components/movementFieldsConfig';
import BatchValidationForm from '../BatchValidationForm';

const ValidacionLoteStep = ({
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
  canConfirm,
}) => {
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
      !f.fecha_factura ||
      (Boolean(camposConfig.fecha_pago) && !f.fecha_pago)
    );
  }, [current, comprobanteInfo, ingresoInfo]);

  const handleFormChange = (nextForm) => {
    if (!current) return;
    onUpdateItem(current.clientId, (it) => ({ ...it, form: nextForm }));
  };

  const handleOmitir = () => {
    if (!current) return;
    onUpdateItem(current.clientId, (it) => ({ ...it, omitido: true }));
  };

  const handleContinuar = () => {
    if (!current || continuarDisabled) return;
    onUpdateItem(current.clientId, (it) => ({ ...it, revisado: true }));
    if (idx < eligible.length - 1) {
      setIdx(idx + 1);
    } else {
      onRequestConfirm();
    }
  };

  const handlePrevNav = () => setIdx((i) => Math.max(0, i - 1));
  const handleNextNav = () => setIdx((i) => Math.min(eligible.length - 1, i + 1));

  const urlImagen = current?.form?.url_imagen;
  const isPdf = Boolean(urlImagen && String(urlImagen).toLowerCase().includes('.pdf'));

  if (eligible.length === 0) {
    return (
      <Alert severity="warning">
        No quedan comprobantes para revisar. Volvé atrás o cerrá el asistente.
      </Alert>
    );
  }

  return (
    <>
      <AssistedCorrectionNavigator
        visible
        textoProgreso={`Comprobante ${idx + 1} de ${eligible.length}`}
        hasPrev={idx > 0}
        hasNext={idx < eligible.length - 1}
        onPrev={handlePrevNav}
        onNext={handleNextNav}
        onConfirmarYContinuar={handleContinuar}
        onCloseFlow={() => {}}
        showConfirmButton
        confirmLabel={idx < eligible.length - 1 ? 'Revisado y siguiente' : 'Revisado y finalizar'}
        confirmDisabled={continuarDisabled}
        showRechazarButton
        onRechazar={handleOmitir}
        rechazarLabel="Omitir"
        position="top"
        topOffset={72}
      />

      <Stack spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {current?.originalname}
        </Typography>
        {current?.errorAnalisis && (
          <Alert severity="warning">
            No se pudieron extraer datos automáticamente: {current.errorAnalisis}. Completá el formulario manualmente.
          </Alert>
        )}
      </Stack>

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
          <Box sx={{ maxHeight: { xs: 'none', md: 'min(70vh, 640px)' }, overflowY: 'auto', pr: 0.5 }}>
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

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button variant="contained" color="success" onClick={onRequestConfirm} disabled={!canConfirm}>
          Crear movimientos del lote
        </Button>
      </Stack>
    </>
  );
};

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
  canConfirm: PropTypes.bool.isRequired,
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
};

export default ValidacionLoteStep;
