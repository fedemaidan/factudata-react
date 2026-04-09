import React, { useId } from 'react';

const baseInputCls =
  'w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main';

const baseSelectCls =
  'h-full rounded-r-lg border-0 border-l border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main';

const InputWithSelect = ({
  label = 'Monto',
  placeholder = '0.00',
  value = '',
  onValueChange,
  options = [],
  selectedOption = '',
  onOptionChange,
  disabled = false,
  step = 1,
  onIncrement,
  onDecrement,
  inputName = 'amount',
  selectName = 'unit',
}) => {
  const id = useId();

  const increment = () => {
    if (typeof onIncrement === 'function') {
      onIncrement();
      return;
    }
    const num = parseFloat(String(value).replace(',', '.')) || 0;
    onValueChange?.(String(num + step));
  };

  const decrement = () => {
    if (typeof onDecrement === 'function') {
      onDecrement();
      return;
    }
    const num = parseFloat(String(value).replace(',', '.')) || 0;
    onValueChange?.(String(num - step));
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-0.5 block text-xs font-medium text-neutral-600">
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm focus-within:border-primary-main focus-within:ring-1 focus-within:ring-primary-main">
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            name={inputName}
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(e) => onValueChange?.(e.target.value)}
            className={`${baseInputCls} h-full rounded-none border-0 pr-8 shadow-none focus:ring-0`}
          />
          <div className="absolute inset-y-0 right-1 flex flex-col justify-center">
            <button
              type="button"
              disabled={disabled}
              onClick={increment}
              className="rounded p-0.5 text-[10px] leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
              aria-label="Incrementar monto"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={decrement}
              className="rounded p-0.5 text-[10px] leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
              aria-label="Disminuir monto"
            >
              ▼
            </button>
          </div>
        </div>
        <select
          name={selectName}
          value={selectedOption}
          disabled={disabled}
          onChange={(e) => onOptionChange?.(e.target.value)}
          className={`${baseSelectCls} min-w-[92px]`}
        >
          <option value="">Moneda</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default InputWithSelect;
