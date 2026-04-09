import React, { useMemo, useRef, useState } from 'react';
import { ClickAwayListener, Paper, Popper } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const SelectOne = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar',
  disabled = false,
  allowClear = false,
}) => {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(
    () =>
      options
        .map((opt) => {
          if (typeof opt === 'string') return { value: opt, label: opt };
          if (opt?.value == null || opt?.label == null) return null;
          return { value: String(opt.value), label: String(opt.label) };
        })
        .filter(Boolean),
    [options]
  );

  const currentValue = value == null ? '' : String(value);
  const selectedOption = normalizedOptions.find((opt) => opt.value === currentValue) || null;

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleClose = () => setOpen(false);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
      return;
    }
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div className="w-full min-w-0">
      {label ? <label className="mb-0.5 block text-xs font-medium text-neutral-600">{label}</label> : null}
      <div className="flex items-center gap-2">
        <button
          ref={anchorRef}
          type="button"
          name={name}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-left text-sm text-neutral-900 shadow-sm focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main disabled:bg-neutral-100 disabled:text-neutral-500"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={selectedOption ? 'text-neutral-900' : 'text-neutral-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <KeyboardArrowDownIcon className={`h-4 w-4 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" style={{ zIndex: 1400 }}>
          <ClickAwayListener onClickAway={handleClose}>
            <Paper
              elevation={4}
              className="mt-1 max-h-64 min-w-[220px] overflow-auto rounded-lg border border-neutral-200"
              style={{ width: anchorRef.current?.clientWidth || undefined }}
            >
              <ul role="listbox" aria-label={label || name} className="py-1">
                {normalizedOptions.map((opt) => {
                  const selected = currentValue === opt.value;
                  return (
                    <li key={`${name}-${opt.value}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                          selected
                            ? 'bg-primary-lightest text-primary-dark'
                            : 'text-neutral-800 hover:bg-neutral-100'
                        }`}
                        role="option"
                        aria-selected={selected}
                      >
                        <span>{opt.label}</span>
                        {selected ? <span className="text-xs text-primary-main">✓</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Paper>
          </ClickAwayListener>
        </Popper>
        {allowClear && value ? (
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              setOpen(false);
            }}
            className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
            aria-label={`Limpiar ${label || name}`}
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SelectOne;
