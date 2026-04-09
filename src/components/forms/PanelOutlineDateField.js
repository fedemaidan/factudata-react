import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { format, isValid, parse } from 'date-fns';
import React, { useCallback, useMemo, useState } from 'react';

function parseYmdToDate(ymd) {
  if (ymd == null || ymd === '') return null;
  const s = String(ymd).trim();
  if (!s) return null;
  const d = parse(s, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

/**
 * Fecha solo por calendario (sin tipeo en el campo). Valor externo: `yyyy-MM-dd` o vacío.
 * Usa MUI X DatePicker + TextField readOnly; "Limpiar" en el popover si es opcional.
 */
function PanelOutlineDateField({
  label,
  value,
  onChange,
  disabled,
  optional = false,
  readOnly = false,
  name,
  id: idProp,
  'aria-invalid': ariaInvalid,
  inputProps,
}) {
  const reactId = React.useId();
  const id = idProp || reactId;
  const labelId = `${id}-label`;
  const [pickerOpen, setPickerOpen] = useState(false);

  const dateValue = useMemo(() => parseYmdToDate(value), [value]);

  const handlePickerOpen = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const handlePickerClose = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const handleTextFieldClick = useCallback(
    (e) => {
      if (disabled || readOnly) return;
      if (e.target.closest('button')) return;
      setPickerOpen(true);
    },
    [disabled, readOnly],
  );

  const handleLabelClick = useCallback(() => {
    if (disabled || readOnly) return;
    setPickerOpen(true);
  }, [disabled, readOnly]);

  const handleChange = useCallback(
    (newDate) => {
      if (newDate == null) {
        onChange({ target: { value: '', name } });
        return;
      }
      if (isValid(newDate)) {
        onChange({ target: { value: format(newDate, 'yyyy-MM-dd'), name } });
      }
    },
    [onChange, name],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled || readOnly) return;
      const k = e.key;
      if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    },
    [disabled, readOnly],
  );

  const handlePaste = useCallback((e) => {
    e.preventDefault();
  }, []);

  const slotProps = useMemo(
    () => ({
      textField: {
        id,
        name,
        size: 'small',
        fullWidth: true,
        error: Boolean(ariaInvalid),
        hiddenLabel: true,
        placeholder: 'Tocá el campo o el calendario',
        readOnly: true,
        onClick: handleTextFieldClick,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        InputProps: { readOnly: true },
        inputProps: {
          readOnly: true,
          'aria-readonly': true,
          'aria-labelledby': labelId,
          ...inputProps,
        },
        sx: (theme) => ({
          '& .MuiOutlinedInput-root': {
            height: 36,
            borderRadius: 2,
            fontSize: 14,
            fontFamily: theme.typography.fontFamily,
            cursor: disabled || readOnly ? 'default' : 'pointer',
            bgcolor: theme.palette.background.paper,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 1px 2px rgba(0,0,0,0.35)'
                : '0 1px 2px rgba(0,0,0,0.05)',
            transition: theme.transitions.create(['border-color', 'box-shadow'], {
              duration: 150,
            }),
            '& fieldset': {
              borderColor: ariaInvalid
                ? theme.palette.error.main
                : theme.palette.divider,
            },
            '&:hover:not(.Mui-disabled):not(.Mui-readOnly) fieldset': {
              borderColor: theme.palette.action.active,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
              borderWidth: 1,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.28 : 0.2,
              )}`,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            },
            '&.Mui-readOnly': {
              opacity: 0.85,
            },
          },
        }),
      },
      openPickerButton: {
        disabled: Boolean(readOnly) || Boolean(disabled),
        sx: {
          p: 0.5,
          mr: 0.25,
          '& .MuiSvgIcon-root': { fontSize: '1.15rem', opacity: 0.65 },
        },
      },
      ...(optional
        ? {
            actionBar: { actions: ['clear', 'cancel', 'accept'] },
          }
        : {}),
    }),
    [
      id,
      name,
      ariaInvalid,
      labelId,
      inputProps,
      handleTextFieldClick,
      handleKeyDown,
      handlePaste,
      readOnly,
      disabled,
      optional,
    ],
  );

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography
        id={labelId}
        component="label"
        htmlFor={id}
        variant="body2"
        onClick={handleLabelClick}
        sx={{
          fontWeight: 500,
          color: 'text.primary',
          fontSize: 13,
          lineHeight: 1.4,
          cursor: disabled || readOnly ? 'default' : 'pointer',
        }}
      >
        {label}
        {optional ? (
          <Typography
            component="span"
            variant="caption"
            sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 400 }}
          >
            (opcional)
          </Typography>
        ) : null}
      </Typography>
      <DatePicker
        open={pickerOpen}
        onOpen={handlePickerOpen}
        onClose={handlePickerClose}
        value={dateValue}
        onChange={handleChange}
        format="dd/MM/yyyy"
        disabled={Boolean(disabled)}
        readOnly={Boolean(readOnly)}
        slotProps={slotProps}
      />
    </Box>
  );
}

export default PanelOutlineDateField;
