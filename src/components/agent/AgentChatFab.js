import { useState } from 'react';
import { Fab, Tooltip, Zoom, useTheme } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useAuthContext } from 'src/contexts/auth-context';
import { AgentChatDialog } from './AgentChatDialog';

export function AgentChatFab() {
  const theme = useTheme();
  const { isAuthenticated, authReady } = useAuthContext();
  const [open, setOpen] = useState(false);

  if (!authReady || !isAuthenticated) return null;

  return (
    <>
      <Zoom in={!open} unmountOnExit appear>
        <Tooltip title="Hablar con el asistente" placement="left">
          <Fab
            color="primary"
            aria-label="Abrir asistente Sorby"
            onClick={() => setOpen(true)}
            sx={{
              position: 'fixed',
              bottom: { xs: 20, sm: 28 },
              right: { xs: 20, sm: 28 },
              zIndex: theme.zIndex.modal - 1,
              boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.35)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 16px 38px -8px rgba(15, 23, 42, 0.42)',
              },
              transition: 'transform 160ms ease, box-shadow 160ms ease',
            }}
          >
            <AutoAwesomeRoundedIcon />
          </Fab>
        </Tooltip>
      </Zoom>
      <AgentChatDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
