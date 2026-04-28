import { useCallback, useEffect, useRef, useState } from 'react';
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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardReturnRoundedIcon from '@mui/icons-material/KeyboardReturnRounded';

const QUICK_ACTIONS = [
  { label: 'Cargar un movimiento', prefill: 'Quiero cargar un egreso de ', icon: AddRoundedIcon },
  { label: 'Buscar últimos movimientos', prefill: 'Mostrame los últimos ', icon: SearchRoundedIcon },
  { label: 'Editar un movimiento', prefill: 'Quiero editar el movimiento ', icon: EditRoundedIcon },
];

const EXAMPLE_PROMPTS = [
  '¿Cuánto gasté este mes?',
  'Cargá un egreso de $50.000 para materiales',
  'Mostrame los últimos 5 movimientos',
];

export function AgentLauncherDialog({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) {
      setValue('');
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const submit = useCallback(
    (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      router.push({ pathname: '/agente', query: { q: trimmed } });
      onClose();
    },
    [router, onClose],
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
          placeholder="Pregúntale a Sorby…"
          fullWidth
          autoFocus
          sx={{
            fontSize: '1.05rem',
            fontWeight: 500,
            '& input::placeholder': { color: 'text.secondary', opacity: 1 },
          }}
        />
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
        <SectionLabel>Acciones rápidas</SectionLabel>
        <Stack spacing={0.25} sx={{ mb: 1.75 }}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <SuggestionRow
                key={action.label}
                icon={<Icon fontSize="small" />}
                text={action.label}
                onClick={() => handleQuickAction(action.prefill)}
              />
            );
          })}
        </Stack>

        <SectionLabel>Probá preguntar</SectionLabel>
        <Stack spacing={0.25}>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <SuggestionRow
              key={prompt}
              icon={<ChatBubbleOutlineRoundedIcon fontSize="small" />}
              text={prompt}
              onClick={() => submit(prompt)}
            />
          ))}
        </Stack>
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
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Kbd>↵</Kbd>
          <Typography variant="caption" sx={{ color: 'inherit' }}>
            Enviar
          </Typography>
        </Stack>
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

function SuggestionRow({ icon, text, onClick }) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
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
        '&:hover, &:focus-visible': {
          backgroundColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'neutral.50',
          outline: 'none',
        },
      }}
    >
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
        {text}
      </Typography>
      <KeyboardReturnRoundedIcon
        sx={{ fontSize: 16, color: 'text.disabled', opacity: 0.7 }}
      />
    </Box>
  );
}

function Kbd({ children }) {
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
