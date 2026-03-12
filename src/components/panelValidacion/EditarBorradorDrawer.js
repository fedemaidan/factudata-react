import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useMemo } from 'react';
import ImagenModal from 'src/components/ImagenModal';
import ImpuestosEditor from 'src/components/impuestosEditor';
import {
  getCamposConfig,
  getCamposVisibles,
  getOptionsFromContext,
} from 'src/components/movementFieldsConfig';
import { formatNumberWithThousands, parsearMonto } from 'src/utils/celulandia/separacionMiles';

const DRAWER_WIDTH = 720;

const MONEY_FIELDS = new Set(['total', 'subtotal', 'total_original', 'dolar_referencia', 'subtotal_dolar', 'total_dolar']);

function EditarBorradorFormContent({
  form,
  proyectos,
  empresa,
  comprobanteInfo,
  ingresoInfo,
  proveedores,
  categorias,
  tagsExtra,
  mediosPago,
  etapas,
  obrasOptions,
  clientesOptions,
  onFormChange,
  onSave,
  onClose,
  saving,
  formatFecha,
}) {
  const categoriaSeleccionada = useMemo(
    () => (categorias || []).find((c) => c.name === form.categoria),
    [categorias, form.categoria],
  );
  const camposConfig = useMemo(
    () => getCamposConfig(comprobanteInfo, ingresoInfo, 'egreso'),
    [comprobanteInfo, ingresoInfo],
  );
  const camposVisibles = useMemo(
    () => getCamposVisibles(comprobanteInfo, empresa, ingresoInfo, 'egreso').filter((campo) => campo.name !== 'type'),
    [comprobanteInfo, empresa, ingresoInfo],
  );
  const optionsContext = useMemo(
    () => ({
      proveedores,
      categorias,
      categoriaSeleccionada,
      tagsExtra,
      mediosPago,
      empresa,
      etapas,
      obrasOptions,
      clientesOptions,
    }),
    [proveedores, categorias, categoriaSeleccionada, tagsExtra, mediosPago, empresa, etapas, obrasOptions, clientesOptions],
  );
  const shouldShowProyecto = Boolean(camposConfig.proyecto);

  const handleFieldChange = (name, value) => onFormChange({ ...form, [name]: value });

  const renderCampo = (campo) => {
    const value = form[campo.name] ?? (campo.type === 'boolean' ? false : '');

    if (campo.type === 'text' || campo.type === 'date' || campo.type === 'number') {
      const isMoneyField = MONEY_FIELDS.has(campo.name);
      const displayValue = isMoneyField && value !== '' && value !== null && value !== undefined
        ? formatNumberWithThousands(value)
        : (campo.type === 'date' ? formatFecha(value) : value);
      return (
        <TextField
          key={campo.name}
          fullWidth
          size="small"
          label={campo.label}
          type={campo.type === 'date' ? 'date' : (isMoneyField ? 'text' : campo.type)}
          value={displayValue}
          onChange={(e) => {
            if (campo.type === 'date') {
              handleFieldChange(campo.name, e.target.value);
              return;
            }
            if (campo.type !== 'number') {
              handleFieldChange(campo.name, e.target.value);
              return;
            }
            if (!isMoneyField) {
              const next = e.target.value === '' ? '' : Number(e.target.value);
              handleFieldChange(campo.name, Number.isNaN(next) ? '' : next);
              return;
            }
            const raw = parsearMonto(e.target.value).replace(',', '.');
            if (raw === '') {
              handleFieldChange(campo.name, '');
              return;
            }
            const parsed = parseFloat(raw);
            if (!Number.isNaN(parsed)) {
              handleFieldChange(campo.name, parsed);
            }
          }}
          InputLabelProps={campo.type === 'date' ? { shrink: true } : undefined}
          InputProps={campo.readonly ? { readOnly: true } : undefined}
          disabled={Boolean(campo.readonly)}
        />
      );
    }

    if (campo.type === 'textarea') {
      return (
        <TextField
          key={campo.name}
          fullWidth
          size="small"
          multiline
          rows={3}
          label={campo.label}
          value={value}
          onChange={(e) => handleFieldChange(campo.name, e.target.value)}
        />
      );
    }

    if (campo.type === 'select') {
      const options = campo.options || getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <FormControl fullWidth size="small" key={campo.name}>
          <InputLabel>{campo.label}</InputLabel>
          <Select
            label={campo.label}
            value={value}
            onChange={(e) => handleFieldChange(campo.name, e.target.value)}
          >
            <MenuItem value="">
              <em>Seleccionar</em>
            </MenuItem>
            {options.map((opt) => (
              <MenuItem key={`${campo.name}-${opt}`} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (campo.type === 'autocomplete') {
      const options = getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <Autocomplete
          key={campo.name}
          freeSolo
          options={options}
          value={value || ''}
          onChange={(_, val) => handleFieldChange(campo.name, val || '')}
          onInputChange={(_, val, reason) => {
            if (reason === 'input') {
              handleFieldChange(campo.name, val || '');
            }
          }}
          renderInput={(params) => (
            <TextField {...params} size="small" label={campo.label} fullWidth />
          )}
        />
      );
    }

    if (campo.type === 'tags') {
      const options = getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <Autocomplete
          key={campo.name}
          multiple
          freeSolo
          options={options}
          value={Array.isArray(value) ? value : []}
          onChange={(_, val) => handleFieldChange(campo.name, val)}
          renderInput={(params) => (
            <TextField {...params} size="small" label={campo.label} fullWidth />
          )}
        />
      );
    }

    if (campo.type === 'boolean') {
      return (
        <FormControl fullWidth size="small" key={campo.name}>
          <InputLabel>{campo.label}</InputLabel>
          <Select
            label={campo.label}
            value={Boolean(value)}
            onChange={(e) => handleFieldChange(campo.name, e.target.value === 'true' ? true : Boolean(e.target.value))}
          >
            <MenuItem value={true}>Si</MenuItem>
            <MenuItem value={false}>No</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (campo.type === 'impuestos') {
      return (
        <Box key={campo.name} sx={{ width: '100%' }}>
          <ImpuestosEditor
            formik={{
              values: form,
              setFieldValue: (field, val) => handleFieldChange(field, val),
            }}
            impuestosDisponibles={(empresa?.impuestos_data || []).filter((i) => i.activo)}
            subtotal={form.subtotal}
          />
        </Box>
      );
    }

    return null;
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
        Editar borrador
      </Typography>
      {shouldShowProyecto && (
        <FormControl fullWidth size="small">
          <InputLabel id="edit-proyecto-label">Proyecto</InputLabel>
          <Select
            labelId="edit-proyecto-label"
            label="Proyecto"
            value={form.proyecto_id ?? ''}
            onChange={(e) => onFormChange({ ...form, proyecto_id: e.target.value || '' })}
          >
            <MenuItem value="">Sin proyecto</MenuItem>
            {proyectos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nombre || p.name || p.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {camposVisibles.map((campo) => renderCampo(campo))}

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={
            saving ||
            (shouldShowProyecto && !form.proyecto_id) ||
            form.total === '' ||
            form.total === undefined ||
            form.total === null ||
            !form.fecha_factura
          }
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Cancelar
        </Button>
      </Stack>
    </Stack>
  );
}

function EditarBorradorDrawer({
  open,
  mov,
  form,
  proyectos = [],
  empresa = null,
  comprobanteInfo = {},
  ingresoInfo = {},
  proveedores = [],
  categorias = [],
  tagsExtra = [],
  mediosPago = [],
  etapas = [],
  obrasOptions = [],
  clientesOptions = [],
  onClose,
  onSave,
  onFormChange,
  saving = false,
}) {
  const urlImagen = mov?.url_imagen || mov?.url_image;
  const isPdf = urlImagen && String(urlImagen).toLowerCase().includes('.pdf');
  const tieneImagen = Boolean(urlImagen) && !isPdf;

  const formatFecha = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (val?.toDate) return val.toDate().toISOString().split('T')[0];
    return '';
  };

  const formContent = (
    <EditarBorradorFormContent
      form={form}
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
      onFormChange={onFormChange}
      onSave={onSave}
      onClose={onClose}
      saving={saving}
      formatFecha={formatFecha}
    />
  );

  if (tieneImagen) {
    return (
      <ImagenModal
        open={open}
        onClose={onClose}
        imagenUrl={urlImagen}
        fileName={mov?.nombre_proveedor ? `Comprobante - ${mov.nombre_proveedor}` : 'Comprobante'}
        leftContent={formContent}
      />
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: DRAWER_WIDTH } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Imagen o PDF a la izquierda */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              bgcolor: 'grey.50',
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            {urlImagen ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                }}
              >
                {isPdf ? (
                  <embed src={urlImagen} width="100%" height="100%" style={{ minHeight: 400 }} />
                ) : (
                  <img
                    src={urlImagen}
                    alt="Comprobante"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin archivo adjunto
              </Typography>
            )}
          </Box>

          {/* Formulario al lado */}
          <Box sx={{ width: 360, p: 2, overflowY: 'auto' }}>
            {formContent}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

export default EditarBorradorDrawer;
