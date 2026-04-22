import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useMemo } from 'react';
import ImpuestosEditor from 'src/components/impuestosEditor';
import {
  getCamposConfig,
  getCamposVisibles,
  getOptionsFromContext,
} from 'src/components/movementFieldsConfig';
import { formatNumberWithThousands, parsearMonto } from 'src/utils/celulandia/separacionMiles';
import { formatTimestamp } from 'src/utils/formatters';

const MONEY_FIELDS = new Set([
  'total',
  'subtotal',
  'total_original',
  'dolar_referencia',
  'subtotal_dolar',
  'total_dolar',
  'monto_pagado',
]);

const REQUIRED_FIELDS = new Set(['total', 'fecha_factura']);

// Fields rendered before proyecto, then after, then rest
const PRIORITY_BEFORE_PROYECTO = ['total', 'moneda'];
const PRIORITY_AFTER_PROYECTO = ['fecha_factura', 'fecha_pago'];
const PRIORITY_ALL = new Set([...PRIORITY_BEFORE_PROYECTO, ...PRIORITY_AFTER_PROYECTO]);

/**
 * Formulario de validación por ítem (misma lógica de campos que EditarBorradorDrawer).
 */
const BatchValidationForm = ({
  form,
  onFormChange,
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
  showFooterActions = false,
  onFooterContinue,
  footerContinueDisabled = false,
  footerContinueLabel = 'Marcar revisado y continuar',
  saving = false,
  tipoMov = 'egreso',
}) => {
  const categoriaSeleccionada = useMemo(
    () => (categorias || []).find((c) => c.name === form.categoria),
    [categorias, form.categoria],
  );

  const camposConfig = useMemo(
    () => getCamposConfig(comprobanteInfo, ingresoInfo, tipoMov),
    [comprobanteInfo, ingresoInfo, tipoMov],
  );

  const camposVisibles = useMemo(() => {
    return getCamposVisibles(comprobanteInfo, empresa, ingresoInfo, tipoMov).filter(
      (campo) => campo.name !== 'type',
    );
  }, [comprobanteInfo, empresa, ingresoInfo, tipoMov]);

  // Group fields into rendering order: [total, moneda] → proyecto → [fecha_factura, fecha_pago?] → rest
  const headBeforeProyecto = useMemo(
    () =>
      PRIORITY_BEFORE_PROYECTO.map((n) => camposVisibles.find((c) => c.name === n)).filter(Boolean),
    [camposVisibles],
  );

  const headAfterProyecto = useMemo(() => {
    const names = ['fecha_factura'];
    if (camposConfig.fecha_pago) names.push('fecha_pago');
    return names.map((n) => camposVisibles.find((c) => c.name === n)).filter(Boolean);
  }, [camposVisibles, camposConfig.fecha_pago]);

  const tailFields = useMemo(
    () => camposVisibles.filter((c) => !PRIORITY_ALL.has(c.name)),
    [camposVisibles],
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
    [
      proveedores,
      categorias,
      categoriaSeleccionada,
      tagsExtra,
      mediosPago,
      empresa,
      etapas,
      obrasOptions,
      clientesOptions,
    ],
  );

  const shouldShowProyecto = Boolean(camposConfig.proyecto);
  const formatFecha = (val) => formatTimestamp(val) || '';

  const handleFieldChange = (name, value) => onFormChange({ ...form, [name]: value });

  const renderCampo = (campo) => {
    const value = form[campo.name] ?? (campo.type === 'boolean' ? false : '');
    const isRequired = REQUIRED_FIELDS.has(campo.name);
    const isEmpty = value === '' || value === null || value === undefined;
    const showFieldError = isRequired && isEmpty;

    if (campo.type === 'text' || campo.type === 'date' || campo.type === 'number') {
      const isMoneyField = MONEY_FIELDS.has(campo.name);
      const displayValue =
        isMoneyField && value !== '' && value !== null && value !== undefined
          ? formatNumberWithThousands(value)
          : campo.type === 'date'
            ? formatFecha(value)
            : value;
      return (
        <TextField
          key={campo.name}
          fullWidth
          size="small"
          label={campo.label}
          type={campo.type === 'date' ? 'date' : isMoneyField ? 'text' : campo.type}
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
          error={showFieldError}
          helperText={showFieldError ? 'Requerido' : undefined}
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
      const boolStr = value === true || value === 'true' ? 'true' : 'false';
      return (
        <FormControl fullWidth size="small" key={campo.name}>
          <InputLabel>{campo.label}</InputLabel>
          <Select
            label={campo.label}
            value={boolStr}
            onChange={(e) => handleFieldChange(campo.name, e.target.value === 'true')}
          >
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
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

  const continuarDisabled =
    saving ||
    (shouldShowProyecto && !form.proyecto_id) ||
    form.total === '' ||
    form.total === undefined ||
    form.total === null ||
    !form.fecha_factura;

  const proyectoError = shouldShowProyecto && !form.proyecto_id;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={600}>
        Datos del comprobante
      </Typography>

      {/* Priority: monto y moneda primero */}
      {headBeforeProyecto.map((campo) => renderCampo(campo))}

      {/* Proyecto */}
      {shouldShowProyecto && (
        <FormControl fullWidth size="small" error={proyectoError}>
          <InputLabel id="batch-proyecto-label">Proyecto</InputLabel>
          <Select
            labelId="batch-proyecto-label"
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
          {proyectoError && <FormHelperText>Requerido</FormHelperText>}
        </FormControl>
      )}

      {/* Fecha de factura (y fecha de pago si aplica) */}
      {headAfterProyecto.map((campo) => renderCampo(campo))}

      {/* Resto de campos en orden original */}
      {tailFields.map((campo) => renderCampo(campo))}

      {showFooterActions && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }} alignItems="center">
          <Button
            variant="contained"
            onClick={onFooterContinue}
            disabled={footerContinueDisabled || continuarDisabled}
          >
            {footerContinueLabel}
          </Button>
        </Stack>
      )}
    </Stack>
  );
};

export default BatchValidationForm;
