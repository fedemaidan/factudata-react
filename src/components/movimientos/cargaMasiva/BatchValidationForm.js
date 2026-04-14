import {
  Autocomplete,
  Box,
  Button,
  FormControl,
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
    const vis = getCamposVisibles(comprobanteInfo, empresa, ingresoInfo, tipoMov).filter(
      (campo) => campo.name !== 'type',
    );
    const priority = ['fecha_factura'];
    if (camposConfig.fecha_pago) priority.push('fecha_pago');
    const head = priority.map((n) => vis.find((c) => c.name === n)).filter(Boolean);
    const tail = vis.filter((c) => !priority.includes(c.name));
    return [...head, ...tail];
  }, [comprobanteInfo, empresa, ingresoInfo, tipoMov, camposConfig.fecha_pago]);

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

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={600}>
        Datos del comprobante
      </Typography>
      {shouldShowProyecto && (
        <FormControl fullWidth size="small">
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
        </FormControl>
      )}

      {camposVisibles.map((campo) => renderCampo(campo))}

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
