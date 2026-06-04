import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Dialog,
  IconButton,
  InputBase,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardReturnRoundedIcon from '@mui/icons-material/KeyboardReturnRounded';
import { useDashboardNavGroups } from 'src/hooks/useDashboardNavGroups';
import { useAgenteSpecialists } from 'src/hooks/useAgenteSpecialists';
import {
  pickQuickActions,
  pickExamplePrompts,
  EXAMPLE_PROMPT_ICON,
} from 'src/components/agent/agentQuickActions';

const normalize = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Algunos paths del side-nav vienen relativos (ej: "cobros", "empresa?empresaId=…").
// Para router.push los normalizamos a absolutos.
const normalizePath = (path) => {
  if (!path) return path;
  if (path.startsWith('/') || path.startsWith('http')) return path;
  return '/' + path;
};

const flattenModules = (groups) =>
  (groups || []).flatMap((group) =>
    (group.items || [])
      .filter((item) => item.path && item.path !== '/agente' && !item.disabled)
      .map((item) => ({
        title: item.title,
        path: normalizePath(item.path),
        icon: item.icon,
        group: group.label || '',
      })),
  );

export function AgentLauncherDialog({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const inputRef = useRef(null);
  const itemRefs = useRef([]);
  const [value, setValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const { groups, navType } = useDashboardNavGroups();
  const { specialists } = useAgenteSpecialists();

  const modules = useMemo(() => flattenModules(groups), [groups]);
  const quickActions = useMemo(() => pickQuickActions(specialists), [specialists]);
  const examplePrompts = useMemo(() => pickExamplePrompts(specialists), [specialists]);

  const query = value.trim();
  const isSearching = query.length > 0;
  const normalizedQuery = useMemo(() => normalize(query), [query]);

  const filteredQuickActions = useMemo(() => {
    if (!isSearching) return quickActions;
    return quickActions.filter((a) => normalize(a.label).includes(normalizedQuery));
  }, [quickActions, isSearching, normalizedQuery]);

  const filteredModules = useMemo(() => {
    if (!isSearching) return modules;
    return modules.filter((m) => normalize(m.title).includes(normalizedQuery));
  }, [modules, isSearching, normalizedQuery]);

  // Reset highlight cuando cambia el query o se reabre el dialog
  useEffect(() => {
    setHighlightIndex(-1);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setValue('');
      setHighlightIndex(-1);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Scrollea el módulo resaltado a la vista cuando se navega con teclado
  useEffect(() => {
    if (highlightIndex < 0) return;
    const node = itemRefs.current[highlightIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const submit = useCallback(
    (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      router.push({ pathname: '/agente', query: { q: trimmed } });
      onClose();
    },
    [router, onClose],
  );

  const navigateTo = useCallback(
    (path) => {
      router.push(path);
      onClose();
    },
    [router, onClose],
  );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (filteredModules.length === 0) return;
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % filteredModules.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      if (filteredModules.length === 0) return;
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? filteredModules.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = highlightIndex >= 0 ? filteredModules[highlightIndex] : null;
      if (target) {
        navigateTo(target.path);
        return;
      }
      submit(value);
    }
  };

  const handleQuickAction = (prefill) => {
    setValue(prefill);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(prefill.length, prefill.length);
      } catch (_) {
        /* noop */
      }
    });
  };

  const highlighted = highlightIndex >= 0 ? filteredModules[highlightIndex] : null;
  const showQuickActions = filteredQuickActions.length > 0;
  const showModules = filteredModules.length > 0;
  const showExamples = !isSearching;
  const noResults = isSearching && !showQuickActions && !showModules;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2.5,
          overflow: 'hidden',
          boxShadow: '0 24px 56px -16px rgba(15, 23, 42, 0.32)',
          backgroundImage: 'none',
        },
      }}
      sx={{
        '& .MuiDialog-container': { alignItems: { sm: 'flex-start' } },
        '& .MuiDialog-paper': { mt: { sm: 8 } },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        <InputBase
          inputRef={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregúntale a Sorby o buscá una página…"
          fullWidth
          autoFocus
          sx={{
            fontSize: '1.05rem',
            fontWeight: 500,
            '& input::placeholder': { color: 'text.secondary', opacity: 1 },
          }}
        />
        <Box
          component="span"
          sx={{
            px: 0.85,
            py: 0.25,
            borderRadius: 0.75,
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'primary.main',
            backgroundColor: (t) => `${t.palette.primary.main}1f`,
          }}
        >
          Beta
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          maxHeight: { sm: '60vh' },
          overflowY: 'auto',
        }}
      >
        {showQuickActions && (
          <>
            <SectionLabel>Acciones rápidas</SectionLabel>
            <Stack spacing={0.25} sx={{ mb: showModules || showExamples ? 1.75 : 0 }}>
              {filteredQuickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <SuggestionRow
                    key={action.id}
                    icon={<Icon fontSize="small" />}
                    text={action.label}
                    onClick={() => handleQuickAction(action.prefill)}
                  />
                );
              })}
            </Stack>
          </>
        )}

        {showModules && (
          <>
            <SectionLabel>Páginas</SectionLabel>
            <Stack spacing={0.25} sx={{ mb: showExamples ? 1.75 : 0 }}>
              {filteredModules.map((mod, idx) => (
                <SuggestionRow
                  key={`${mod.path}-${mod.title}`}
                  innerRef={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  icon={mod.icon}
                  text={mod.title}
                  caption={mod.group}
                  highlighted={idx === highlightIndex}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => navigateTo(mod.path)}
                />
              ))}
            </Stack>
          </>
        )}

        {showExamples && examplePrompts.length > 0 && (
          <>
            <SectionLabel>Probá preguntar</SectionLabel>
            <Stack spacing={0.25}>
              {examplePrompts.map((prompt) => (
                <SuggestionRow
                  key={prompt.id}
                  icon={<EXAMPLE_PROMPT_ICON fontSize="small" />}
                  text={prompt.text}
                  onClick={() => submit(prompt.text)}
                />
              ))}
            </Stack>
          </>
        )}

        {noResults && (
          <Box sx={{ px: 1, py: 2.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Sin coincidencias. Apretá <Kbd inline>↵</Kbd> para preguntarle a Sorby.
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 0.75,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          color: 'text.secondary',
          backgroundColor: (t) => t.palette.action.hover,
          minHeight: 36,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Kbd>↵</Kbd>
          <Typography
            variant="caption"
            sx={{
              color: 'inherit',
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {highlighted ? `Ir a ${highlighted.title}` : 'Enviar a Sorby'}
          </Typography>
        </Stack>
        {modules.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <Typography variant="caption" sx={{ color: 'inherit' }}>
              Navegar
            </Typography>
          </Stack>
        )}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Kbd>esc</Kbd>
          <Typography variant="caption" sx={{ color: 'inherit' }}>
            Cerrar
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'text.secondary',
        fontWeight: 700,
        fontSize: '0.6875rem',
        px: 1,
        pt: 0.5,
        pb: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

const SuggestionRow = function SuggestionRow({
  icon,
  text,
  caption,
  highlighted = false,
  onClick,
  onMouseEnter,
  innerRef,
}) {
  return (
    <Box
      ref={innerRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1,
        py: 1,
        borderRadius: 1,
        cursor: 'pointer',
        color: 'text.primary',
        transition: 'background-color 100ms ease',
        backgroundColor: highlighted
          ? (t) =>
              t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'neutral.100'
          : 'transparent',
        '&:hover, &:focus-visible': {
          backgroundColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'neutral.50',
          outline: 'none',
        },
      }}
    >
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {text}
        </Typography>
        {caption ? (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            · {caption}
          </Typography>
        ) : null}
      </Box>
      <KeyboardReturnRoundedIcon
        sx={{
          fontSize: 16,
          color: highlighted ? 'primary.main' : 'text.disabled',
          opacity: highlighted ? 1 : 0.7,
          transition: 'color 120ms ease, opacity 120ms ease',
        }}
      />
    </Box>
  );
};

function Kbd({ children, inline = false }) {
  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        px: 0.5,
        mx: inline ? 0.25 : 0,
        fontSize: '0.6875rem',
        fontFamily: 'inherit',
        fontWeight: 600,
        color: 'text.primary',
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 0.5,
        boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04)',
      }}
    >
      {children}
    </Box>
  );
}
