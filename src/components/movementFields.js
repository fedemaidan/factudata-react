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
  Grid
} from '@mui/material';
import { Alert } from '@mui/material';
import ImpuestosEditor from './impuestosEditor';

// ==== Definición de campos con sección (igual que tenías) ====
const DEFINICION_CAMPOS = [
  // BÁSICOS
  { section: 'extras', name: 'tipo_factura', label: 'Tipo de Factura', type: 'select', options: ['FACTURA A', 'FACTURA B', 'FACTURA C', 'No definido'], visibleIf: (info) => info.tipo_factura },
  { section: 'basicos', name: 'numero_factura', label: 'Número de Factura', type: 'text', visibleIf: (info) => info.numero_factura },
  { section: 'basicos', name: 'fecha_factura', label: 'Fecha de la Factura', type: 'date' },
  { section: 'basicos', name: 'fecha_pago', label: 'Fecha de pago', type: 'date' },
  { section: 'basicos', name: 'type', label: 'Tipo', type: 'select', options: ['egreso', 'ingreso'] },
  { section: 'basicos', name: 'nombre_proveedor', label: 'Proveedor', type: 'autocomplete', optionsKey: 'proveedores', visibleIf: (info) => info.proveedor },
  { section: 'basicos', name: 'categoria', label: 'Categoría', type: 'select', optionsKey: 'categorias', visibleIf: (info) => info.categoria },
  { section: 'basicos', name: 'subcategoria', label: 'Subcategoría', type: 'select', optionsKey: 'subcategorias', visibleIf: (info) => info.subcategoria },
  { section: 'basicos', name: 'obra',    label: 'Obra',    type: 'autocomplete', optionsKey: 'obras', visibleIf: (info) => info.obra },
  { section: 'basicos', name: 'cliente', label: 'Cliente', type: 'autocomplete', optionsKey: 'clientes', visibleIf: (info) => info.cliente },

  { section: 'extras', name: 'cuenta_interna', label: 'Cuenta Interna', type: 'select', optionsKey: 'cuentasInternas', visibleIf: (info) => info.cuenta_interna },
  { section: 'extras', name: 'etapa', label: 'Etapa', type: 'autocomplete', optionsKey: 'etapas', visibleIf: (info) => info.etapa },
  
  // IMPORTES
  { section: 'importes', name: 'moneda', label: 'Moneda', type: 'select', options: ['ARS', 'USD'] },
  { section: 'importes', name: 'subtotal', label: 'Subtotal', type: 'number' },
  { section: 'importes', name: 'total', label: 'Total', type: 'number' },
  { section: 'importes', name: 'total_original', label: 'Total Original', type: 'number', visibleIf: (info) => info.total_original },

  // PAGO
  { section: 'pago', name: 'medio_pago', label: 'Medio de Pago', type: 'select', optionsKey: 'mediosPago', visibleIf: (info) => info.medio_pago },
  { section: 'pago', name: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Pagado'], visibleIf: (_, empresa) => empresa?.con_estados },
  { section: 'pago', name: 'caja_chica', label: 'Caja Chica', type: 'boolean' },
  { section: 'pago', name: 'empresa_facturacion', label: 'Empresa de facturación', type: 'select', optionsKey: 'subempresas' },

  // IMPUESTOS
  { section: 'impuestos', name: 'impuestos', label: 'Impuestos', type: 'impuestos' },

  // EXTRAS
  { section: 'extras', name: 'tags_extra', label: 'Tags Extra', type: 'tags', optionsKey: 'tagsExtra', visibleIf: (info) => info.tags_extra },
  { section: 'basicos', name: 'observacion', label: 'Observación', type: 'textarea' },
];

function getCamposVisibles(comprobanteInfo, empresa) {
  return DEFINICION_CAMPOS.filter((campo) => {
    if (!campo.visibleIf) return true;
    return campo.visibleIf(comprobanteInfo, empresa);
  });
}

// Grupos pedidos
// general = Básicos + Pago + Extras
// montos  = Importes + Impuestos
const GROUP_SECTIONS = {
  general: ['basicos', 'pago', 'extras'],
  montos: ['importes', 'impuestos']
};

const MovementFields = ({
  formik,
  comprobante_info,
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

  
  function getOptionsFromContext(key) {
    switch (key) {
      case 'proveedores': return proveedores || [];
      case 'categorias': return (categorias || []).map(c => c.name);
      case 'subcategorias': return categoriaSeleccionada?.subcategorias || [];
      case 'tagsExtra': return tagsExtra || [];
      case 'mediosPago': return mediosPago || [];
      case 'subempresas': {
        const list = empresa?.subempresas || empresa?.sub_empresas || [];
        // Acepta array de strings o de objetos (usa nombre / razon_social)
        return list.map((s) => {
          if (typeof s === 'string') return s;
          return s?.nombre || s?.razon_social || s?.name || '';
        }).filter(Boolean);
      }
      case 'etapas': return (etapas || []).map(e => e.nombre);
      case 'cuentasInternas': return empresa.cuentas || ['Cuenta A', 'Cuenta B', 'Cuenta C'];
      case 'obras': return obrasOptions || [];
      case 'clientes': return clientesOptions || [];
      default: return [];
    }
  }

  const camposGrupo = useMemo(() => {
    const visibles = getCamposVisibles(comprobante_info, empresa);
    const permitidas = new Set(GROUP_SECTIONS[group] || GROUP_SECTIONS.general);
    return visibles.filter(c => permitidas.has(c.section));
  }, [group, comprobante_info, empresa]);

  const renderCampo = (campo) => {
    const value = formik.values[campo.name] ?? (campo.type === 'boolean' ? false : '');
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
      const options = campo.options || getOptionsFromContext(campo.optionsKey);
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
      const acOptions = getOptionsFromContext(campo.optionsKey);
      return (
        <Autocomplete
          key={campo.name}
          freeSolo
          options={acOptions}
          value={value || ''}
          onChange={(_, val) => formik.setFieldValue(campo.name, val || '')}
          renderInput={(params) => (
            <TextField {...params} label={campo.label} fullWidth />
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
            if ((formik.values.impuestos?.length || subtotal > 0) && diff > 0.01) {
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
