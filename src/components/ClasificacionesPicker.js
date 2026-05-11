import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  Checkbox,
  IconButton,
  Popover,
  Collapse,
  ButtonBase,
  Chip,
  FormHelperText,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

/**
 * Tree-select tristate para el módulo legacy de presupuestos.
 * value: [{ categoria, subcategorias: [] }]  — subs=[] significa "todas (incluye futuras)"
 * onChange(next): se llama con el array reconstruido
 * categorias: [{ name, subcategorias: [string] }]
 */
export default function ClasificacionesPicker({ value, onChange, categorias }) {
  const triggerRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const catIndex = useMemo(() => {
    const m = new Map();
    for (const c of categorias || []) m.set(c.name, c.subcategorias || []);
    return m;
  }, [categorias]);

  const valueMap = useMemo(() => {
    const m = new Map();
    for (const c of value || []) m.set(c.categoria, c.subcategorias || []);
    return m;
  }, [value]);

  const [expanded, setExpanded] = useState(new Set());
  const initialExpandDone = useRef(false);

  // Auto-expandir categorías con selección parcial la primera vez que llegan datos (modo editar).
  useEffect(() => {
    if (initialExpandDone.current) return;
    if (!value || value.length === 0) return;
    initialExpandDone.current = true;
    const s = new Set();
    for (const c of value) {
      const total = (catIndex.get(c.categoria) || []).length;
      if (c.subcategorias.length > 0 && c.subcategorias.length < total) s.add(c.categoria);
    }
    if (s.size > 0) setExpanded(s);
  }, [value, catIndex]);

  function getCategoryState(catName) {
    const subs = valueMap.get(catName);
    if (subs === undefined) return 'none';
    const total = (catIndex.get(catName) || []).length;
    if (subs.length === 0) return 'all';
    if (total > 0 && subs.length >= total) return 'all';
    return 'partial';
  }

  function isSubChecked(catName, subName) {
    const subs = valueMap.get(catName);
    if (subs === undefined) return false;
    if (subs.length === 0) return true;
    return subs.includes(subName);
  }

  function toggleCategory(catName) {
    const state = getCategoryState(catName);
    const next = (value || []).filter((c) => c.categoria !== catName);
    if (state === 'none') next.push({ categoria: catName, subcategorias: [] });
    onChange(next);
  }

  function toggleSub(catName, subName) {
    const subs = valueMap.get(catName);
    const totalSubs = catIndex.get(catName) || [];
    const next = (value || []).filter((c) => c.categoria !== catName);

    let newSubs;
    if (subs === undefined) {
      newSubs = [subName];
    } else if (subs.length === 0) {
      newSubs = totalSubs.filter((s) => s !== subName);
    } else if (subs.includes(subName)) {
      newSubs = subs.filter((s) => s !== subName);
    } else {
      newSubs = [...subs, subName];
    }

    if (newSubs.length === 0) {
      onChange(next);
      return;
    }
    const todasMarcadas =
      totalSubs.length > 0 &&
      newSubs.length === totalSubs.length &&
      totalSubs.every((s) => newSubs.includes(s));
    next.push({
      categoria: catName,
      subcategorias: todasMarcadas ? [] : newSubs,
    });
    onChange(next);
  }

  function toggleExpanded(catName) {
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(catName)) s.delete(catName);
      else s.add(catName);
      return s;
    });
  }

  const triggerContent = (() => {
    if (!value || value.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: '24px' }}>
          Sin filtro (todo el proyecto)
        </Typography>
      );
    }
    const maxChips = 3;
    const visible = value.slice(0, maxChips);
    const restCount = value.length - visible.length;
    return (
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {visible.map((c) => {
          const total = (catIndex.get(c.categoria) || []).length;
          const isAll = c.subcategorias.length === 0 || (total > 0 && c.subcategorias.length === total);
          let label;
          if (isAll) label = `${c.categoria} (todas)`;
          else if (c.subcategorias.length === 1) label = `${c.categoria} › ${c.subcategorias[0]}`;
          else label = `${c.categoria} (${c.subcategorias.length})`;
          return (
            <Chip
              key={c.categoria}
              size="small"
              label={label}
              variant="outlined"
              sx={{ maxWidth: 220 }}
            />
          );
        })}
        {restCount > 0 && <Chip size="small" label={`+${restCount}`} variant="outlined" />}
      </Stack>
    );
  })();

  return (
    <>
      <ButtonBase
        ref={triggerRef}
        onClick={() => (open ? setAnchorEl(null) : setAnchorEl(triggerRef.current))}
        sx={{
          width: '100%',
          minHeight: 40,
          px: 1.5,
          py: 0.75,
          border: '1px solid',
          borderColor: open ? 'primary.main' : 'rgba(0,0,0,0.23)',
          borderRadius: 1,
          backgroundColor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          transition: 'border-color 120ms ease',
          '&:hover': { borderColor: open ? 'primary.main' : 'text.primary' },
        }}
      >
        <Box sx={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>{triggerContent}</Box>
        {open ? (
          <KeyboardArrowUpIcon fontSize="small" sx={{ color: 'text.secondary', ml: 1 }} />
        ) : (
          <KeyboardArrowDownIcon fontSize="small" sx={{ color: 'text.secondary', ml: 1 }} />
        )}
      </ButtonBase>
      <FormHelperText sx={{ ml: 0 }}>
        Vacío = todo el proyecto. Tildá una categoría para incluir todas sus subcategorías, o elegí subcategorías sueltas.
      </FormHelperText>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: triggerRef.current?.offsetWidth || 320,
              maxHeight: 400,
              mt: 0.5,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              borderRadius: 1,
              overflowY: 'auto',
            },
          },
        }}
      >
        {(!categorias || categorias.length === 0) ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No hay categorías disponibles.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ py: 0.5 }}>
            {categorias.map((cat) => {
              const state = getCategoryState(cat.name);
              const isExpanded = expanded.has(cat.name);
              const total = (cat.subcategorias || []).length;
              const subs = valueMap.get(cat.name);
              const subsMarcadas = subs === undefined ? 0 : subs.length === 0 ? total : subs.length;
              const hasSubcats = total > 0;
              return (
                <Box key={cat.name}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 1,
                      py: 0.25,
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => hasSubcats && toggleExpanded(cat.name)}
                      sx={{
                        mr: 0.25,
                        p: 0.25,
                        visibility: hasSubcats ? 'visible' : 'hidden',
                      }}
                      aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                      {isExpanded ? (
                        <KeyboardArrowDownIcon fontSize="small" />
                      ) : (
                        <KeyboardArrowRightIcon fontSize="small" />
                      )}
                    </IconButton>
                    <Checkbox
                      size="small"
                      checked={state === 'all'}
                      indeterminate={state === 'partial'}
                      onChange={() => toggleCategory(cat.name)}
                      sx={{ p: 0.5, mr: 1 }}
                    />
                    <Box
                      onClick={() => hasSubcats && toggleExpanded(cat.name)}
                      sx={{
                        flex: 1,
                        cursor: hasSubcats ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.name}
                      </Typography>
                      {hasSubcats && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontVariantNumeric: 'tabular-nums', ml: 1, flexShrink: 0 }}
                        >
                          {subsMarcadas} / {total}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {hasSubcats && (
                    <Collapse in={isExpanded} unmountOnExit>
                      <Box sx={{ pl: 5, pb: 0.25 }}>
                        {cat.subcategorias.map((sub) => (
                          <Box
                            key={sub}
                            onClick={() => toggleSub(cat.name, sub)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              px: 1,
                              py: 0.125,
                              cursor: 'pointer',
                              borderRadius: 0.5,
                              '&:hover': { backgroundColor: 'action.hover' },
                            }}
                          >
                            <Checkbox
                              size="small"
                              checked={isSubChecked(cat.name, sub)}
                              onChange={() => toggleSub(cat.name, sub)}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ p: 0.5, mr: 1 }}
                            />
                            <Typography variant="body2" color="text.primary">
                              {sub}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>
    </>
  );
}
