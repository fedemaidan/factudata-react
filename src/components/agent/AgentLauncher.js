import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { AgentLauncherDialog } from './AgentLauncherDialog';

function detectMacLike() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
}

export function AgentLauncher() {
  const theme = useTheme();
  const router = useRouter();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Detectar plataforma client-side para evitar hydration mismatch
  useEffect(() => {
    setIsMac(detectMacLike());
  }, []);

  // Listener global Cmd+K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key === 'k' || e.key === 'K';
      if (!k) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onAgentPage = useMemo(
    () => router?.pathname?.startsWith('/agente'),
    [router?.pathname],
  );

  if (onAgentPage) return null;

  if (isCompact) {
    return (
      <>
        <Tooltip title="Pregúntale a Sorby">
          <IconButton
            onClick={() => setOpen(true)}
            aria-label="Abrir asistente Sorby"
            size="small"
            sx={{
              color: 'primary.main',
              backgroundColor: (t) => t.palette.action.hover,
              '&:hover': { backgroundColor: (t) => t.palette.action.selected },
            }}
          >
            <AutoAwesomeRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <AgentLauncherDialog open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          height: 38,
          minWidth: 240,
          maxWidth: 420,
          width: '100%',
          mx: 'auto',
          borderRadius: 1.5,
          border: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          cursor: 'pointer',
          color: 'text.secondary',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
          '&:hover, &:focus-visible': {
            borderColor: 'primary.main',
            outline: 'none',
            boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}1f`,
          },
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography
          variant="body2"
          sx={{ flex: 1, color: 'inherit', fontWeight: 500 }}
        >
          Pregúntale a Sorby…
        </Typography>
        <Stack direction="row" spacing={0.25}>
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </Stack>
      </Box>
      <AgentLauncherDialog open={open} onClose={() => setOpen(false)} />
    </>
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
        minWidth: 20,
        height: 20,
        px: 0.5,
        fontSize: '0.6875rem',
        fontFamily: 'inherit',
        fontWeight: 600,
        color: 'text.secondary',
        backgroundColor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'neutral.100',
        border: 1,
        borderColor: 'divider',
        borderRadius: 0.5,
      }}
    >
      {children}
    </Box>
  );
}
