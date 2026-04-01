// src/components/MovementFields.js
import React, { useMemo } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Box,
  Button,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import { Alert } from '@mui/material';
import ImpuestosEditor from './impuestosEditor';
import {
  getCamposVisibles,
  GROUP_SECTIONS,
  getOptionsFromContext,
  isSubtotalFieldEnabled,
} from './movementFieldsConfig';

const MovementFields = ({
  formik,
  comprobante_info,
  ingreso_info,
  empresa,
  etapas,
  proveedores,
  categorias,
  categoriaSeleccionada,
  tagsExtra,
  mediosPago,
  isEditMode,
  isLoading,
  router,
  lastPageUrl,
  lastPageName,
  movimiento,
  group = 'general',
  obrasOptions = [],
  clientesOptions = []
}) => {

  // Efecto para calcular valores en dólares cuando cambian los campos relevantes
  React.useEffect(() => {
    const dolarRef = Number(formik.values.dolar_referencia) || 0;
    const subtotal = Number(formik.values.subtotal) || 0;
    const total = Number(formik.values.total) || 0;

    if (dolarRef > 0 && formik.values.moneda === 'ARS') {
      const subtotalDolar = Number((subtotal / dolarRef).toFixed(2));
      const totalDolar = Number((total / dolarRef).toFixed(2));

      // Solo actualizar si los valores son diferentes (evitar loops)
      if (Math.abs(Number(formik.values.subtotal_dolar) - subtotalDolar) > 0.01) {
        formik.setFieldValue('subtotal_dolar', subtotalDolar);
      }
      if (Math.abs(Number(formik.values.total_dolar) - totalDolar) > 0.01) {
        formik.setFieldValue('total_dolar', totalDolar);
      }
    } else if (formik.values.moneda === 'USD') {
      // Si la moneda es USD, los valores en dólares son iguales a los originales
      if (Number(formik.values.subtotal_dolar) !== subtotal) {
        formik.setFieldValue('subtotal_dolar', subtotal);
      }
      if (Number(formik.values.total_dolar) !== total) {
        formik.setFieldValue('total_dolar', total);
      }
    } else {
      // Si no hay dólar de referencia o la moneda no es ARS, limpiar valores USD
      if (formik.values.subtotal_dolar !== '' && formik.values.subtotal_dolar !== 0) {
        formik.setFieldValue('subtotal_dolar', '');
      }
      if (formik.values.total_dolar !== '' && formik.values.total_dolar !== 0) {
        formik.setFieldValue('total_dolar', '');
      }
    }
  }, [formik.values.dolar_referencia, formik.values.subtotal, formik.values.total, formik.values.moneda, formik.setFieldValue]);

  const tipoMovimiento = formik.values.type || 'egreso';
  const optionsContext = useMemo(() => ({
    proveedores,
    categorias,
    categoriaSeleccionada,
    tagsExtra,
    mediosPago,
    empresa,
    etapas,
    obrasOptions,
    clientesOptions,
  }), [
    proveedores,
    categorias,
    categoriaSeleccionada,
    tagsExtra,
    mediosPago,
    empresa,
    etapas,
    obrasOptions,
    clientesOptions,
  ]);

  const camposGrupo = useMemo(() => {
    const visibles = getCamposVisibles(comprobante_info, empresa, ingreso_info, tipoMovimiento);
    const permitidas = new Set(GROUP_SECTIONS[group] || GROUP_SECTIONS.general);
    return visibles.filter(c => permitidas.has(c.section));
  }, [group, comprobante_info, ingreso_info, empresa, tipoMovimiento]);

  const usaSubtotal = isSubtotalFieldEnabled(comprobante_info, ingreso_info, tipoMovimiento);

  const renderCampo = (campo) => {
    const value = formik.values[campo.name] ?? (campo.type === 'boolean' ? false : '');
    if (['text', 'number', 'date'].includes(campo.type)) {
      if (campo.name === 'dolar_referencia') {
        const isManual = Boolean(formik.values.dolar_referencia_manual);
        return (
          <Box key={campo.name} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              fullWidth
              type={campo.type}
              name={campo.name}
              label={campo.label}
              value={value}
              onChange={(e) => {
                const nextValue = e.target.value;
                formik.setFieldValue('dolar_referencia', nextValue);
                const initialValue = formik.initialValues?.dolar_referencia;
                const hasChanged = String(nextValue ?? '') !== String(initialValue ?? '');
                const manual = hasChanged ? Number(nextValue) > 0 : Boolean(formik.initialValues?.dolar_referencia_manual);
                formik.setFieldValue('dolar_referencia_manual', manual);
              }}
              InputProps={campo.readonly ? { readOnly: true } : undefined}
              disabled={campo.readonly}
              sx={isManual ? { backgroundColor: 'rgba(255, 193, 7, 0.08)' } : undefined}
            />
            {(isManual || Number(value) > 0) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  label={isManual ? 'Manual' : 'Automático'}
                  color={isManual ? 'warning' : 'default'}
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        );
      }
      return (
        <TextField
          key={campo.name}
          fullWidth
          type={campo.type}
          name={campo.name}
          label={campo.label}
          value={value}
          onChange={formik.handleChange}
          InputProps={campo.readonly ? { readOnly: true } : undefined}
          disabled={campo.readonly}
        />
      );
    }

    if (campo.type === 'textarea') {
      return (
        <TextField
          key={campo.name}
          fullWidth
          multiline
          rows={4}
          name={campo.name}
          label={campo.label}
          value={value}
          onChange={formik.handleChange}
        />
      );
    }

    if (campo.type === 'select') {
      const options = campo.options || getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <FormControl fullWidth key={campo.name}>
          <InputLabel>{campo.label}</InputLabel>
          <Select
            name={campo.name}
            label={campo.label}
            value={value}
            onChange={formik.handleChange}
          >
            <MenuItem value="">
              <em>Seleccionar</em>
            </MenuItem>
            {options.map((opt) => (
              <MenuItem key={`${campo.name}-${opt}`} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (campo.type === 'autocomplete') {
      const acOptions = getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <Autocomplete
          key={campo.name}
          freeSolo
          options={acOptions}
          value={value || ''}
          onChange={(_, val) => formik.setFieldValue(campo.name, val || '')}
          onInputChange={(_, val, reason) => {
            if (reason === 'input') {
              formik.setFieldValue(campo.name, val || '');
            }
          }}
          renderInput={(params) => (
            <TextField {...params} label={campo.label} fullWidth />
          )}
        />
      );
    }

    if (campo.type === 'tags') {
      const tagOptions = getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <Autocomplete
          key={campo.name}
          multiple
          freeSolo
          options={tagOptions}
          value={Array.isArray(value) ? value : []}
          onChange={(_, val) => formik.setFieldValue(campo.name, val)}
          renderInput={(params) => (
            <TextField {...params} label={campo.label} fullWidth />
          )}
        />
      );
    }

    if (campo.type === 'boolean') {
      return (
        <FormControl fullWidth key={campo.name}>
          <InputLabel>{campo.label}</InputLabel>
          <Select
            name={campo.name}
            label={campo.label}
            value={Boolean(value)}
            onChange={(e) => formik.setFieldValue(campo.name, e.target.value === 'true' ? true : e.target.value === true)}
          >
            <MenuItem value={true}>Sí</MenuItem>
            <MenuItem value={false}>No</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (campo.type === 'impuestos') {
      return (
        <Box key={campo.name} sx={{ width: '100%' }}>
          <ImpuestosEditor
            formik={formik}
            impuestosDisponibles={(empresa?.impuestos_data || []).filter(i => i.activo)}
            subtotal={formik.values.subtotal}
          />
          {(() => {
            const subtotal  = Number(formik.values.subtotal) || 0;
            const impTotal  = (formik.values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
            const total     = Number(formik.values.total) || 0;
            const diff = Math.abs((subtotal + impTotal) - total);
            if (usaSubtotal && (formik.values.impuestos?.length || subtotal > 0) && diff > 0.01) {
              return (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Subtotal ({subtotal.toFixed(2)}) + Impuestos ({impTotal.toFixed(2)}) ≠ Total ({total.toFixed(2)}).
                  Se permitirá guardar, pero se pedirá confirmación.
                </Alert>
              );
            }
            return null;
          })()}
        </Box>
      );
    }

    return null;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {camposGrupo.map((campo) => (
          <Grid
            item
            xs={12}
            sm={['textarea', 'impuestos'].includes(campo.type) ? 12 : 6}
            key={campo.name}
          >
            {renderCampo(campo)}
          </Grid>
        ))}
      </Grid>

      {/* Botones locales opcionales (si guardás arriba, podés quitarlos) */}
      <Box sx={{ pt: 2 }}>
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Agregar Movimiento'}
        </Button>
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 1 }}
          onClick={() => {
            const url = lastPageUrl || '/cajaProyecto?proyectoId=' + (movimiento ? movimiento.proyecto_id : '');
            router.push(url);
          }}
        >
          Volver a {lastPageName || (movimiento ? movimiento.proyecto_nombre : '')}
        </Button>
      </Box>
    </Paper>
  );
};

export default MovementFields;
