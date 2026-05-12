import React, { useMemo } from 'react';
import { formatCurrency } from 'src/utils/formatters';
import ImpuestosEditor from './impuestosEditor';
import InputWithSelect from 'src/components/ui/input-with-select';
import SelectOne from 'src/components/ui/select-1';
import PanelOutlineDateField from 'src/components/forms/PanelOutlineDateField';
import {
  getCamposVisibles,
  GROUP_SECTIONS,
  getOptionsFromContext,
  isSubtotalFieldEnabled,
  DEFINICION_CAMPOS,
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

const parsePercentageInput = (value) => {
  const parsed = parseAmountInput(value);
  if (parsed === '') return '';
  const numeric = Number(parsed);
  if (!Number.isFinite(numeric)) return '';
  return String(Math.min(100, Math.max(0, numeric)));
};

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
];

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
  requiredFieldNames = [],
  hideFooterButtons = false,
}) => {
  const requiredFieldSet = useMemo(() => new Set(requiredFieldNames), [requiredFieldNames]);

  const shouldShowFieldError = (fieldName) =>
    Boolean(formik.errors?.[fieldName]) && (formik.submitCount > 0 || formik.touched?.[fieldName]);

  const getFieldError = (fieldName) => (shouldShowFieldError(fieldName) ? formik.errors?.[fieldName] : '');

  const renderLabel = (campo, fallbackLabel = campo.label) => (
    requiredFieldSet.has(campo.name) ? `${fallbackLabel} *` : fallbackLabel
  );

  const renderErrorText = (fieldName) => {
    const errorText = getFieldError(fieldName);
    if (!errorText) return null;
    return <p className="mt-1 text-xs text-error-main">{errorText}</p>;
  };

  const setFieldValuePreservingScroll = (fieldName, nextValue, shouldValidate = true) => {
    const scrollContainer =
      typeof document !== 'undefined'
        ? document.querySelector('[data-movement-form-scroll="true"]')
        : null;
    const previousScrollTop = scrollContainer?.scrollTop ?? null;

    formik.setFieldValue(fieldName, nextValue, shouldValidate);

    if (previousScrollTop == null) return;
    requestAnimationFrame(() => {
      if (!scrollContainer) return;
      scrollContainer.scrollTop = previousScrollTop;
    });
  };

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
    const porcentajePagado = totalFactura > 0
      ? Number(((pagado / totalFactura) * 100).toFixed(2))
      : 0;

    return (
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Monto pagado</label>
            <input
              className={inputCls}
              type="text"
              inputMode="decimal"
              value={formatAmountInput(parcialMonto)}
              onChange={(event) => {
                const parsed = parseAmountInput(event.target.value);
                if (parsed === '') {
                  onParcialMontoChange('');
                  return;
                }
                const normalizedAmount = totalFactura > 0
                  ? Math.min(totalFactura, Math.max(0, Number(parsed)))
                  : Math.max(0, Number(parsed));
                onParcialMontoChange(String(normalizedAmount));
              }}
            />
          </div>
          <div>
            <label className={labelCls}>Porcentaje pagado</label>
            <div className="relative">
              <input
                className={`${inputCls} pr-8`}
                type="text"
                inputMode="decimal"
                value={totalFactura > 0 ? formatAmountInput(porcentajePagado) : ''}
                placeholder={totalFactura > 0 ? '0' : 'Cargá total'}
                disabled={totalFactura <= 0}
                onChange={(event) => {
                  const parsed = parsePercentageInput(event.target.value);
                  if (parsed === '') {
                    onParcialMontoChange('');
                    return;
                  }
                  const porcentaje = Number(parsed);
                  const montoCalculado = ((totalFactura * porcentaje) / 100).toFixed(2);
                  onParcialMontoChange(String(Number(montoCalculado)));
                }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-neutral-500">
                %
              </span>
            </div>
          </div>
        </div>
        {totalFactura > 0 && (
          <div className="flex flex-col items-start gap-1">
            <span className="rounded-full border border-success-main/40 bg-success-main/5 px-2 py-0.5 text-xs font-medium text-success-dark">
              Pagado: {formatCurrency(pagado, 2)} ({formatAmountInput(porcentajePagado)}%)
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
    const moneda = formik.values.moneda;

    let nextSubtotalDolar = formik.values.subtotal_dolar;
    let nextTotalDolar = formik.values.total_dolar;

    if (dolarRef > 0 && moneda === 'ARS') {
      nextSubtotalDolar = Number((subtotal / dolarRef).toFixed(2));
      nextTotalDolar = Number((total / dolarRef).toFixed(2));
    } else if (moneda === 'USD') {
      nextSubtotalDolar = subtotal;
      nextTotalDolar = total;
    } else {
      nextSubtotalDolar = '';
      nextTotalDolar = '';
    }

    if (String(formik.values.subtotal_dolar ?? '') !== String(nextSubtotalDolar ?? '')) {
      formik.setFieldValue('subtotal_dolar', nextSubtotalDolar, false);
    }
    if (String(formik.values.total_dolar ?? '') !== String(nextTotalDolar ?? '')) {
      formik.setFieldValue('total_dolar', nextTotalDolar, false);
    }
  }, [
    formik.values.dolar_referencia,
    formik.values.subtotal,
    formik.values.total,
    formik.values.moneda,
    formik.values.subtotal_dolar,
    formik.values.total_dolar,
    formik.setFieldValue,
  ]);

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

  const usaSubtotal = isSubtotalFieldEnabled(comprobante_info, ingreso_info, tipoMovimiento);

  const camposGrupo = useMemo(() => {
    const visibles = getCamposVisibles(comprobante_info, empresa, ingreso_info, tipoMovimiento);
    // Campos requeridos que la config oculta por defecto deben mostrarse siempre
    const visibleNames = new Set(visibles.map((c) => c.name));
    const requiredButHidden = DEFINICION_CAMPOS.filter(
      (c) => requiredFieldSet.has(c.name) && !visibleNames.has(c.name)
    );
    const allVisible = [...visibles, ...requiredButHidden];

    if (block) {
      const ordered = allVisible
        .filter((campo) => campo.stitchBlock === block)
        .sort((a, b) => (a.stitchOrder || 0) - (b.stitchOrder || 0));
      if (block === 'financial') {
        // Moneda se renderiza junto a Total con un control unificado.
        return ordered.filter((campo) => campo.name !== 'moneda');
      }
      return ordered;
    }

    const permitidas = new Set(GROUP_SECTIONS[group] || GROUP_SECTIONS.general);
    return allVisible.filter((campo) => permitidas.has(campo.section));
  }, [block, group, comprobante_info, ingreso_info, empresa, tipoMovimiento, requiredFieldSet]);

  const renderCampo = (campo) => {
    const value = formik.values[campo.name] ?? (campo.type === 'boolean' ? false : '');
    if (['text', 'number', 'date'].includes(campo.type)) {
      if (campo.type === 'date') {
        const isFechaPago = campo.name === 'fecha_pago' || campo.name === 'fecha_vencimiento';
        return (
          <div key={campo.name}>
            <PanelOutlineDateField
              label={renderLabel(campo, campo.label)}
              name={campo.name}
              value={value || ''}
              optional={isFechaPago && !requiredFieldSet.has(campo.name)}
              onChange={(event) => setFieldValuePreservingScroll(campo.name, event.target.value)}
              disabled={Boolean(campo.readonly)}
              readOnly={Boolean(campo.readonly)}
              aria-invalid={shouldShowFieldError(campo.name)}
            />
            {renderErrorText(campo.name)}
          </div>
        );
      }

      if (campo.name === 'dolar_referencia') {
        const hasError = shouldShowFieldError(campo.name);
        const isManual = Boolean(formik.values.dolar_referencia_manual);
        return (
          <div key={campo.name} className="flex flex-col gap-1">
            <label className={labelCls}>{renderLabel(campo, campo.label)}</label>
            <input
              className={`${isManual ? `${inputCls} bg-warning-main/10` : inputCls} ${hasError ? 'border-error-main focus:border-error-main focus:ring-error-main' : ''}`}
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
            {renderErrorText(campo.name)}
          </div>
        );
      }

      const strVal = value === undefined || value === null ? '' : String(value);
      const hasError = shouldShowFieldError(campo.name);
      const commonInput = (
        <input
          key={campo.name}
          className={`${campo.readonly ? inputReadonlyCls : inputCls} ${hasError ? 'border-error-main focus:border-error-main focus:ring-error-main' : ''}`}
          type={campo.type}
          name={campo.name}
          value={strVal}
          readOnly={campo.readonly}
          disabled={campo.readonly}
          onChange={formik.handleChange}
        />
      );

      if (campo.name === 'total') {
        if (block === 'financial') {
          const totalNumber = Number(formik.values.total) || 0;
          const handleIncrement = () => {
            formik.setFieldValue('total', String(Number((totalNumber + 1).toFixed(2))), false);
          };
          const handleDecrement = () => {
            formik.setFieldValue('total', String(Math.max(0, Number((totalNumber - 1).toFixed(2)))), false);
          };

          return (
            <div key={campo.name}>
              <InputWithSelect
                label={requiredFieldSet.has('total') || requiredFieldSet.has('moneda') ? 'Total y moneda *' : 'Total y moneda'}
                placeholder="0.00"
                value={value}
                formatDisplay={formatAmountInput}
                parseInput={parseAmountInput}
                onValueChange={(parsed) => formik.setFieldValue('total', parsed, false)}
                options={CURRENCY_OPTIONS}
                selectedOption={formik.values.moneda || ''}
                onOptionChange={(nextMoneda) => {
                  if (nextMoneda !== (formik.values.moneda || '')) {
                    setFieldValuePreservingScroll('moneda', nextMoneda);
                  }
                }}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
              />
              {renderErrorText('total')}
              {renderErrorText('moneda')}
              {renderPagoParcialDetalle()}
            </div>
          );
        }

        return (
          <div key={campo.name}>
            <label className={labelCls}>{renderLabel(campo, campo.label)}</label>
            <input
              className={`${campo.readonly ? inputReadonlyCls : inputCls} ${hasError ? 'border-error-main focus:border-error-main focus:ring-error-main' : ''}`}
              type="text"
              name={campo.name}
              inputMode="decimal"
              value={formatAmountInput(value)}
              readOnly={campo.readonly}
              disabled={campo.readonly}
              onChange={(event) => {
                formik.setFieldValue('total', parseAmountInput(event.target.value), false);
              }}
            />
            {renderErrorText(campo.name)}
            {renderPagoParcialDetalle()}
          </div>
        );
      }

      return (
        <div key={campo.name}>
          <label className={labelCls}>{renderLabel(campo, campo.label)}</label>
          {commonInput}
          {renderErrorText(campo.name)}
        </div>
      );
    }

    if (campo.type === 'textarea') {
      const hasError = shouldShowFieldError(campo.name);
      return (
        <div key={campo.name}>
          <label className={labelCls}>{renderLabel(campo, campo.label)}</label>
          <textarea
            className={`${inputCls} min-h-[2.5rem] resize-none ${hasError ? 'border-error-main focus:border-error-main focus:ring-error-main' : ''}`}
            rows={2}
            name={campo.name}
            value={value}
            onChange={formik.handleChange}
          />
          {renderErrorText(campo.name)}
        </div>
      );
    }

    if (campo.type === 'select') {
      const options = campo.options || getOptionsFromContext(campo.optionsKey, optionsContext);
      return (
        <div key={campo.name}>
          <SelectOne
            label={renderLabel(campo, campo.label)}
            name={campo.name}
            value={value}
            options={options.map((opt) => ({ value: opt, label: opt }))}
            onChange={(nextValue) => setFieldValuePreservingScroll(campo.name, nextValue)}
          />
          {renderErrorText(campo.name)}
        </div>
      );
    }

    if (campo.type === 'autocomplete') {
      const hasError = shouldShowFieldError(campo.name);
      const acOptions = getOptionsFromContext(campo.optionsKey, optionsContext);
      const listId = `dl-${campo.name}`;
      return (
        <div key={campo.name}>
          <label className={labelCls} htmlFor={campo.name}>
            {renderLabel(campo, campo.label)}
          </label>
          <input
            id={campo.name}
            className={`${inputCls} ${hasError ? 'border-error-main focus:border-error-main focus:ring-error-main' : ''}`}
            list={listId}
            value={value || ''}
            onChange={(e) => formik.setFieldValue(campo.name, e.target.value)}
          />
          <datalist id={listId}>
            {acOptions.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          {renderErrorText(campo.name)}
        </div>
      );
    }

    if (campo.type === 'tags') {
      const tagOptions = getOptionsFromContext(campo.optionsKey, optionsContext);
      const tags = Array.isArray(value) ? value : [];
      const listId = `dl-tags-${campo.name}`;
      return (
        <div key={campo.name} className="sm:col-span-2">
          <label className={labelCls}>{renderLabel(campo, campo.label)}</label>
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
          {renderErrorText(campo.name)}
        </div>
      );
    }

    if (campo.type === 'boolean') {
      const strVal = value === true || value === 'true' ? 'true' : 'false';
      return (
        <div key={campo.name}>
          <SelectOne
            label={renderLabel(campo, campo.label)}
            name={campo.name}
            value={strVal}
            options={[
              { value: 'true', label: 'Sí' },
              { value: 'false', label: 'No' },
            ]}
            onChange={(nextValue) =>
              setFieldValuePreservingScroll(campo.name, nextValue === 'true')
            }
          />
          {renderErrorText(campo.name)}
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
            const subtotal = Number(formik.values.subtotal) || 0;
            const impTotal = (formik.values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
            const total = Number(formik.values.total) || 0;
            const diff = Math.abs(subtotal + impTotal - total);
            if (usaSubtotal && (formik.values.impuestos?.length || subtotal > 0) && diff > 0.01) {
              return (
                <div
                  className="mt-2 rounded-lg border border-warning-main/40 bg-warning-main/10 px-2 py-1.5 text-xs text-warning-dark"
                  role="status"
                >
                  Subtotal ({subtotal.toFixed(2)}) + Impuestos ({impTotal.toFixed(2)}) ≠ Total (
                  {total.toFixed(2)}). Se permitirá guardar con confirmación.
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
