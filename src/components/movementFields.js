// src/components/MovementFields.js
import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Box,
  Button,
  Paper
} from '@mui/material';

const DEFINICION_CAMPOS = [
  { name: 'fecha_factura', label: 'Fecha de la Factura', type: 'date' },
  { name: 'type', label: 'Tipo', type: 'select', options: ['egreso', 'ingreso'] },
  { name: 'total', label: 'Total', type: 'number' },
  { name: 'subtotal', label: 'Subtotal', type: 'number' },
  { name: 'total_original', label: 'Total Original', type: 'number', visibleIf: (info) => info.total_original },
  { name: 'moneda', label: 'Moneda', type: 'select', options: ['ARS', 'USD'] },
  { name: 'nombre_proveedor', label: 'Proveedor', type: 'autocomplete', optionsKey: 'proveedores', visibleIf: (info) => info.proveedor },
  { name: 'categoria', label: 'Categoría', type: 'select', optionsKey: 'categorias', visibleIf: (info) => info.categoria },
  { name: 'subcategoria', label: 'Subcategoría', type: 'select', optionsKey: 'subcategorias', visibleIf: (info) => info.subcategoria },
  { name: 'tags_extra', label: 'Tags Extra', type: 'tags', optionsKey: 'tagsExtra', visibleIf: (info) => info.tags_extra },
  { name: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Pagado'], visibleIf: (_, empresa) => empresa?.con_estados },
  { name: 'medio_pago', label: 'Medio de Pago', type: 'select', optionsKey: 'mediosPago', visibleIf: (info) => info.medio_pago },
  { name: 'tipo_factura', label: 'Tipo de Factura', type: 'select', options: ['Factura A', 'Factura B', 'Factura C', 'No definido'], visibleIf: (info) => info.tipo_factura },
  { name: 'numero_factura', label: 'Número de Factura', type: 'text', visibleIf: (info) => info.numero_factura },
  { name: 'cuenta_interna', label: 'Cuenta Interna', type: 'select', optionsKey: 'cuentasInternas', visibleIf: (info) => info.cuenta_interna },
  { name: 'etapa', label: 'Etapa', type: 'autocomplete', optionsKey: 'etapas', visibleIf: (info) => info.etapa },
  { name: 'caja_chica', label: 'Caja Chica', type: 'boolean' },
  { name: 'observacion', label: 'Observación', type: 'textarea' },
];

function getCamposVisibles(comprobanteInfo, empresa) {
  return DEFINICION_CAMPOS.filter((campo) => {
    if (!campo.visibleIf) return true;
    return campo.visibleIf(comprobanteInfo, empresa);
  });
}

const MovementFields = ({ formik, comprobante_info, empresa, etapas, proveedores, categorias, categoriaSeleccionada, tagsExtra, mediosPago, isEditMode, isLoading, router, lastPageUrl, lastPageName, movimiento }) => {
  function getOptionsFromContext(key) {
    switch (key) {
      case 'proveedores': return proveedores;
      case 'categorias': return categorias.map(c => c.name);
      case 'subcategorias': return categoriaSeleccionada?.subcategorias || [];
      case 'tagsExtra': return tagsExtra;
      case 'mediosPago': return mediosPago;
      case 'etapas': return etapas.map(e => e.nombre);
      case 'cuentasInternas': return empresa?.cuentas_internas || [];
      default: return [];
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      {getCamposVisibles(comprobante_info, empresa).map((campo) => {
        const value = formik.values[campo.name] || '';

        if (['text', 'number', 'date'].includes(campo.type)) {
          return (
            <TextField
              key={campo.name}
              fullWidth
              type={campo.type}
              name={campo.name}
              label={campo.label}
              value={value}
              onChange={formik.handleChange}
              margin="normal"
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
              margin="normal"
            />
          );
        }

        if (campo.type === 'select') {
          const options = campo.options || getOptionsFromContext(campo.optionsKey);
          return (
            <FormControl fullWidth margin="normal" key={campo.name}>
              <InputLabel>{campo.label}</InputLabel>
              <Select name={campo.name} value={value} onChange={formik.handleChange}>
                <MenuItem value="">Seleccionar</MenuItem>
                {options.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        if (campo.type === 'autocomplete') {
          const acOptions = getOptionsFromContext(campo.optionsKey);
          return (
            <Autocomplete
              key={campo.name}
              freeSolo
              options={acOptions}
              value={value}
              onChange={(_, val) => formik.setFieldValue(campo.name, val || '')}
              renderInput={(params) => (
                <TextField {...params} label={campo.label} fullWidth margin="normal" />
              )}
            />
          );
        }

        if (campo.type === 'tags') {
          const tagOptions = getOptionsFromContext(campo.optionsKey);
          return (
            <Autocomplete
              key={campo.name}
              multiple
              freeSolo
              options={tagOptions}
              value={value}
              onChange={(_, val) => formik.setFieldValue(campo.name, val)}
              renderInput={(params) => (
                <TextField {...params} label={campo.label} fullWidth margin="normal" />
              )}
            />
          );
        }

        if (campo.type === 'boolean') {
          return (
            <FormControl fullWidth margin="normal" key={campo.name}>
              <InputLabel>{campo.label}</InputLabel>
              <Select name={campo.name} value={value} onChange={formik.handleChange}>
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
              </Select>
            </FormControl>
          );
        }

        return null;
      })}

      <Box sx={{ py: 2 }}>
        <Button color="primary" variant="contained" type="submit" disabled={isLoading} fullWidth>
          {isLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Agregar Movimiento'}
        </Button>
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 1 }}
          onClick={() => {
            router.push(lastPageUrl || '/cajaProyecto?proyectoId=' + (movimiento ? movimiento.proyecto_id : ''));
          }}
        >
          Volver a {lastPageName || (movimiento ? movimiento.proyecto_nombre : '')}
        </Button>
      </Box>
    </Paper>
  );
};

export default MovementFields;
