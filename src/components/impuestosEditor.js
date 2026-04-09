import React, { useCallback, useId } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const inputCls =
  'w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main';
const labelCls = 'mb-0.5 block text-xs font-medium text-neutral-600';

const ImpuestosEditor = ({ formik, impuestosDisponibles, subtotal }) => {
  const impuestos = formik.values.impuestos || [];
  const tplId = useId();

  const handleAddFromTemplate = useCallback(
    (tplName) => {
      if (!tplName) return;
      const tpl = impuestosDisponibles.find((i) => i.nombre === tplName);
      if (!tpl) return;
      formik.setFieldValue('impuestos', [
        ...impuestos,
        { nombre: tpl.nombre, monto: tpl.valor * subtotal / 100 },
      ]);
    },
    [formik, impuestos, impuestosDisponibles, subtotal]
  );

  const handleAddEmpty = useCallback(() => {
    formik.setFieldValue('impuestos', [...impuestos, { nombre: '', monto: 0 }]);
  }, [formik, impuestos]);

  const handleChange = useCallback(
    (idx, field, value) => {
      const next = [...impuestos];
      next[idx] = { ...next[idx], [field]: field === 'monto' ? Number(value) : value };
      formik.setFieldValue('impuestos', next);
    },
    [formik, impuestos]
  );

  const handleDelete = useCallback(
    (idx) => {
      formik.setFieldValue(
        'impuestos',
        impuestos.filter((_, i) => i !== idx)
      );
    },
    [formik, impuestos]
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-2">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-800">Impuestos</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44 min-w-[10rem]">
            <label className={labelCls} htmlFor={tplId}>
              Agregar desde lista
            </label>
            <select
              id={tplId}
              className={inputCls}
              defaultValue=""
              onChange={(e) => {
                handleAddFromTemplate(e.target.value);
                e.target.value = '';
              }}
            >
              <option value="">Seleccionar…</option>
              {impuestosDisponibles.map((o) => (
                <option key={o.nombre} value={o.nombre}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddEmpty}
            className="inline-flex items-center gap-1 rounded-lg border border-primary-main bg-white px-2.5 py-1.5 text-xs font-medium text-primary-dark shadow-sm hover:bg-primary-lightest"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
            Manual
          </button>
        </div>
      </div>

      {impuestos.length === 0 && (
        <p className="text-xs text-neutral-500">No hay impuestos cargados.</p>
      )}

      {impuestos.map((imp, idx) => (
        <div
          key={idx}
          className="mb-1.5 grid grid-cols-[1fr_6rem_2rem] items-end gap-1.5"
        >
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              className={inputCls}
              value={imp.nombre}
              onChange={(e) => handleChange(idx, 'nombre', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Monto</label>
            <input
              className={inputCls}
              type="number"
              value={imp.monto}
              onChange={(e) => handleChange(idx, 'monto', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => handleDelete(idx)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-error-main/10 hover:text-error-main"
            aria-label="Eliminar impuesto"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ImpuestosEditor;
