import React, { useMemo } from 'react';
import { formatCurrency } from 'src/utils/formatters';
import ImpuestosEditor from './impuestosEditor';
import {
  getCamposVisibles,
  GROUP_SECTIONS,
  STITCH_GROUP_SECTIONS,
  getOptionsFromContext,
} from './movementFieldsConfig';

const inputCls =
  'w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main';
const inputReadonlyCls =
  'w-full rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-700';
const labelCls = 'mb-0.5 block text-xs font-medium text-neutral-600';

const parseAmountInput = (value) => {
  if (value == null) return '';
  const cleaned = String(value).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  if (!cleaned) return '';
  const [intPart, ...decParts] = cleaned.split('.');
  const intNormalized = String(Number(intPart || 0));
  const decimal = decParts.join('').slice(0, 2);
  if (!decimal) return intNormalized;
  return `${intNormalized}.${decimal}`;
};

const formatAmountInput = (value) => {
  if (value == null || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return numeric.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

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
  block,
  obrasOptions = [],
  clientesOptions = [],
  parcialMonto = '',
  onParcialMontoChange,
  hideFooterButtons = false,
}) => {
  const renderPagoParcialDetalle = () => {
    if (
      formik.values.type !== 'egreso' ||
      formik.values.estado !== 'Parcialmente Pagado' ||
      !empresa?.con_estados ||
      typeof onParcialMontoChange !== 'function'
    ) {
      return null;
    }

    if (block !== 'financial' && group !== 'montos') {
      return null;
    }

    const totalFactura = Number(formik.values.total) || 0;
    const pagado = Number(parcialMonto) || 0;
    const pendiente = Math.max(0, totalFactura - pagado);

    return (
      <div className="mt-2 space-y-2">
        <div>
          <label className={labelCls}>Monto pagado</label>
          <input
            className={inputCls}
            type="text"
            inputMode="decimal"
            value={formatAmountInput(parcialMonto)}
            onChange={(event) => {
              const parsed = parseAmountInput(event.target.value);
              onParcialMontoChange(parsed);
            }}
          />
        </div>
        {totalFactura > 0 && (
          <div className="flex flex-col items-start gap-1">
            <span className="rounded-full border border-success-main/40 bg-success-main/5 px-2 py-0.5 text-xs font-medium text-success-dark">
              Pagado: {formatCurrency(pagado, 2)}
            </span>
            <span className="rounded-full border border-warning-main/40 bg-warning-main/5 px-2 py-0.5 text-xs font-medium text-warning-dark">
              Saldo pendiente: {formatCurrency(pendiente, 2)}
            </span>
          </div>
        )}
      </div>
    );
  };

  React.useEffect(() => {
    const dolarRef = Number(formik.values.dolar_referencia) || 0;
    const subtotal = Number(formik.values.subtotal) || 0;
    const total = Number(formik.values.total) || 0;

    if (dolarRef > 0 && formik.values.moneda === 'ARS') {
      const subtotalDolar = Number((subtotal / dolarRef).toFixed(2));
      const totalDolar = Number((total / dolarRef).toFixed(2));

      if (Math.abs(Number(formik.values.subtotal_dolar) - subtotalDolar) > 0.01) {
        formik.setFieldValue('subtotal_dolar', subtotalDolar);
      }
      if (Math.abs(Number(formik.values.total_dolar) - totalDolar) > 0.01) {
        formik.setFieldValue('total_dolar', totalDolar);
      }
    } else if (formik.values.moneda === 'USD') {
      if (Number(formik.values.subtotal_dolar) !== subtotal) {
        formik.setFieldValue('subtotal_dolar', subtotal);
      }
      if (Number(formik.values.total_dolar) !== total) {
        formik.setFieldValue('total_dolar', total);
      }
    } else {
      if (formik.values.subtotal_dolar !== '' && formik.values.subtotal_dolar !== 0) {
        formik.setFieldValue('subtotal_dolar', '');
      }
      if (formik.values.total_dolar !== '' && formik.values.total_dolar !== 0) {
        formik.setFieldValue('total_dolar', '');
      }
    }
  }, [formik.values.dolar_referencia, formik.values.subtotal, formik.values.total, formik.values.moneda, formik.setFieldValue]);

  const tipoMovimiento = formik.values.type || 'egreso';
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
    ]
  );

  const camposGrupo = useMemo(() => {
    const visibles = getCamposVisibles(comprobante_info, empresa, ingreso_info, tipoMovimiento);
    const sections = block && STITCH_GROUP_SECTIONS[block]
      ? STITCH_GROUP_SECTIONS[block]
      : GROUP_SECTIONS[group] || GROUP_SECTIONS.general;
    const permitidas = new Set(sections);
    return visibles.filter((c) => permitidas.has(c.section));
  }, [block, group, comprobante_info, ingreso_info, empresa, tipoMovimiento]);

  const renderCampo = (campo) => {
    const value = formik.values[campo.name] ?? (campo.type === 'boolean' ? false : '');
    if (['text', 'number', 'date'].includes(campo.type)) {
      if (campo.name === 'dolar_referencia') {
        const isManual = Boolean(formik.values.dolar_referencia_manual);
        return (
          <div key={campo.name} className="flex flex-col gap-1">
            <label className={labelCls}>{campo.label}</label>
            <input
              className={isManual ? `${inputCls} bg-warning-main/10` : inputCls}
              type={campo.type}
              name={campo.name}
              value={value}
              readOnly={campo.readonly}
              disabled={campo.readonly}
              onChange={(e) => {
                const nextValue = e.target.value;
                formik.setFieldValue('dolar_referencia', nextValue);
                const initialValue = formik.initialValues?.dolar_referencia;
                const hasChanged = String(nextValue ?? '') !== String(initialValue ?? '');
                const manual = hasChanged ? Number(nextValue) > 0 : Boolean(formik.initialValues?.dolar_referencia_manual);
                formik.setFieldValue('dolar_referencia_manual', manual);
              }}
            />
            {(isManual || Number(value) > 0) && (
              <span
                className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs ${
                  isManual
                    ? 'border-warning-main text-warning-dark'
                    : 'border-neutral-200 text-neutral-600'
                }`}
              >
                {isManual ? 'Manual' : 'Automático'}
              </span>
            )}
          </div>
        );
      }

      const strVal = value === undefined || value === null ? '' : String(value);
      const commonInput = (
        <input
          key={campo.name}
          className={campo.readonly ? inputReadonlyCls : inputCls}
          type={campo.type}
          name={campo.name}
          value={strVal}
          readOnly={campo.readonly}
          disabled={campo.readonly}
          onChange={formik.handleChange}
        />
      );

      if (campo.name === 'total') {
        const handleTotalChange = (event) => {
          const parsed = parseAmountInput(event.target.value);
          formik.setFieldValue('total', parsed);
        };

        return (
          <div key={campo.name}>
            <label className={labelCls}>{campo.label}</label>
            <input
              className={campo.readonly ? inputReadonlyCls : inputCls}
              type="text"
              name={campo.name}
              inputMode="decimal"
              value={formatAmountInput(value)}
              readOnly={campo.readonly}
              disabled={campo.readonly}
              onChange={handleTotalChange}
            />
            {renderPagoParcialDetalle()}
          </div>
        );
      }

      return (
        <div key={campo.name}>
          <label className={labelCls}>{campo.label}</label>
          {commonInput}
        </div>
      );
    }

    if (campo.type === 'textarea') {
      return (
        <div key={campo.name}>
          <label className={labelCls}>{campo.label}</label>
          <textarea
            className={`${inputCls} min-h-[2.5rem] resize-none`}
            rows={2}
            name={campo.name}
            value={value}
            onChange={formik.handleChange}
          />
        </div>
      );
    }

    if (campo.type === 'select') {
      const options = campo.options || getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <div key={campo.name}>
          <label className={labelCls}>{campo.label}</label>
          <select
            className={inputCls}
            name={campo.name}
            value={value}
            onChange={formik.handleChange}
          >
            <option value="">Seleccionar</option>
            {options.map((opt) => (
              <option key={`${campo.name}-${opt}`} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (campo.type === 'autocomplete') {
      const acOptions = getOptionsFromContext(campo.optionsKey, optionsContext);
      const listId = `dl-${campo.name}`;
      return (
        <div key={campo.name}>
          <label className={labelCls} htmlFor={campo.name}>
            {campo.label}
          </label>
          <input
            id={campo.name}
            className={inputCls}
            list={listId}
            value={value || ''}
            onChange={(e) => formik.setFieldValue(campo.name, e.target.value)}
          />
          <datalist id={listId}>
            {acOptions.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    if (campo.type === 'tags') {
      const tagOptions = getOptionsFromContext(campo.optionsKey, optionsContext);
      const tags = Array.isArray(value) ? value : [];
      const listId = `dl-tags-${campo.name}`;
      return (
        <div key={campo.name} className="sm:col-span-2">
          <label className={labelCls}>{campo.label}</label>
          <div className="mb-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-800"
              >
                {t}
                <button
                  type="button"
                  className="text-neutral-500 hover:text-error-main"
                  onClick={() => formik.setFieldValue(
                    campo.name,
                    tags.filter((x) => x !== t)
                  )}
                  aria-label={`Quitar ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            className={inputCls}
            list={listId}
            placeholder="Agregar tag…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = e.target.value.trim();
                if (v && !tags.includes(v)) {
                  formik.setFieldValue(campo.name, [...tags, v]);
                }
                e.target.value = '';
              }
            }}
          />
          <datalist id={listId}>
            {tagOptions.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    if (campo.type === 'boolean') {
      const strVal = value === true || value === 'true' ? 'true' : 'false';
      return (
        <div key={campo.name}>
          <label className={labelCls}>{campo.label}</label>
          <select
            className={inputCls}
            name={campo.name}
            value={strVal}
            onChange={(e) => formik.setFieldValue(campo.name, e.target.value === 'true')}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
      );
    }

    if (campo.type === 'impuestos') {
      return (
        <div key={campo.name} className="sm:col-span-2">
          <ImpuestosEditor
            formik={formik}
            impuestosDisponibles={(empresa?.impuestos_data || []).filter((i) => i.activo)}
            subtotal={formik.values.subtotal}
          />
          {(() => {
            const subtotalN = Number(formik.values.subtotal) || 0;
            const impTotal = (formik.values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
            const totalN = Number(formik.values.total) || 0;
            const diff = Math.abs(subtotalN + impTotal - totalN);
            if ((formik.values.impuestos?.length || subtotalN > 0) && diff > 0.01) {
              return (
                <div
                  className="mt-2 rounded-lg border border-warning-main/40 bg-warning-main/10 px-2 py-1.5 text-xs text-warning-dark"
                  role="status"
                >
                  Subtotal ({subtotalN.toFixed(2)}) + Impuestos ({impTotal.toFixed(2)}) ≠ Total (
                  {totalN.toFixed(2)}). Se permitirá guardar con confirmación.
                </div>
              );
            }
            return null;
          })()}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-xl border border-transparent bg-white p-0">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {camposGrupo.map((campo) => (
          <div
            key={campo.name}
            className={['textarea', 'impuestos'].includes(campo.type) ? 'sm:col-span-2' : ''}
          >
            {renderCampo(campo)}
          </div>
        ))}
      </div>

      {!hideFooterButtons && (
        <div className="pt-3">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-main py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Agregar Movimiento'}
          </button>
          <button
            type="button"
            className="mt-2 w-full py-1.5 text-sm text-primary-dark hover:underline"
            onClick={() => {
              const url =
                lastPageUrl || '/cajaProyecto?proyectoId=' + (movimiento ? movimiento.proyecto_id : '');
              router.push(url);
            }}
          >
            Volver a {lastPageName || (movimiento ? movimiento.proyecto_nombre : '')}
          </button>
        </div>
      )}
    </div>
  );
};

export default MovementFields;
