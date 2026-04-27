import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { AgentMessage, AgentTypingIndicator } from './AgentMessage';
import { useAgentChat } from 'src/hooks/useAgentChat';

const EXAMPLE_PROMPTS = [
  'Cargá un egreso de $50.000 para materiales',
  '¿Cuánto gasté este mes?',
  'Mostrame los últimos 5 movimientos',
];

export function AgentChatDialog({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  const {
    messages,
    isLoadingHistory,
    isSending,
    awaitingConfirm,
    error,
    hasLoadedHistory,
    loadHistory,
    sendMessage,
    reset,
    confirmCurrent,
    cancelCurrent,
    dismissError,
  } = useAgentChat();

  useEffect(() => {
    if (open && !hasLoadedHistory) {
      loadHistory();
    }
  }, [open, hasLoadedHistory, loadHistory]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, isSending, open]);

  const handleSend = useCallback(() => {
    const value = draft.trim();
    if (!value || isSending) return;
    setDraft('');
    sendMessage(value);
  }, [draft, isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleReset = useCallback(async () => {
    await reset();
    setConfirmingReset(false);
    setDraft('');
    inputRef.current?.focus();
  }, [reset]);

  const handlePromptClick = useCallback(
    (prompt) => {
      if (isSending) return;
      sendMessage(prompt);
    },
    [isSending, sendMessage],
  );

  const showEmptyState = !isLoadingHistory && messages.length === 0;

  const headerSubtitle = useMemo(() => {
    if (isSending) return 'Pensando…';
    if (awaitingConfirm) return 'Esperando tu confirmación';
    return 'Asistente conversacional';
  }, [isSending, awaitingConfirm]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '78vh',
          maxHeight: isMobile ? '100%' : 720,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: isMobile ? 0 : 2.5,
          overflow: 'hidden',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '0.04em',
            }}
            aria-hidden
          >
            S
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              Sorby
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
              {headerSubtitle}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {confirmingReset ? (
            <>
              <Typography variant="caption" sx={{ mr: 1, color: 'text.secondary' }}>
                ¿Borrar conversación?
              </Typography>
              <Tooltip title="Confirmar">
                <IconButton size="small" onClick={handleReset} color="error">
                  <CheckCircleRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancelar">
                <IconButton size="small" onClick={() => setConfirmingReset(false)}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Nueva conversación">
              <span>
                <IconButton
                  size="small"
                  onClick={() => setConfirmingReset(true)}
                  disabled={messages.length === 0 || isSending}
                >
                  <RestartAltRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Cerrar">
            <IconButton size="small" onClick={onClose}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error ? (
        <Alert severity="warning" onClose={dismissError} sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 2.5 },
          py: 2,
          backgroundColor: theme.palette.mode === 'dark'
            ? theme.palette.background.default
            : '#fafafa',
        }}
      >
        {isLoadingHistory ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : showEmptyState ? (
          <EmptyState onPromptClick={handlePromptClick} disabled={isSending} />
        ) : (
          <>
            {messages.map((m, idx) => (
              <AgentMessage
                key={`${m.role}-${idx}-${m.createdAt ?? ''}`}
                role={m.role}
                content={m.content}
                createdAt={m.createdAt}
              />
            ))}
            {isSending ? <AgentTypingIndicator /> : null}
          </>
        )}
      </Box>

      {awaitingConfirm && !isSending ? (
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.25,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label="Confirmar"
              color="primary"
              onClick={confirmCurrent}
            />
            <Chip
              icon={<EditRoundedIcon />}
              label="Editar"
              variant="outlined"
              onClick={() => inputRef.current?.focus()}
            />
            <Chip
              icon={<CancelRoundedIcon />}
              label="Cancelar"
              variant="outlined"
              onClick={cancelCurrent}
            />
          </Stack>
        </Box>
      ) : null}

      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        <TextField
          inputRef={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cargá un movimiento, consultá tu saldo…"
          fullWidth
          multiline
          maxRows={4}
          size="small"
          disabled={isSending}
          autoFocus={!isMobile}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'background.default',
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={isSending || !draft.trim()}
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            width: 40,
            height: 40,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.action.disabledBackground,
              color: theme.palette.action.disabled,
            },
          }}
          aria-label="Enviar"
        >
          {isSending ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <SendRoundedIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Dialog>
  );
}

function EmptyState({ onPromptClick, disabled }) {
  return (
    <Stack spacing={2.5} sx={{ pt: 4, pb: 2, alignItems: 'center', textAlign: 'center' }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          fontWeight: 700,
          fontSize: '1.4rem',
          letterSpacing: '0.04em',
        }}
        aria-hidden
      >
        S
      </Box>
      <Stack spacing={0.75} sx={{ maxWidth: 320 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.015em' }}>
          ¿En qué te ayudo hoy?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cargá movimientos, consultá tu caja o pedime un resumen de gastos. Lo que
          ya hacés en WhatsApp, también acá.
        </Typography>
      </Stack>
      <Stack spacing={0.75} sx={{ width: '100%', maxWidth: 360, pt: 1 }}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Box
            key={prompt}
            role="button"
            tabIndex={0}
            onClick={() => !disabled && onPromptClick(prompt)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                e.preventDefault();
                onPromptClick(prompt);
              }
            }}
            sx={{
              px: 1.75,
              py: 1.25,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              textAlign: 'left',
              fontSize: '0.875rem',
              color: 'text.primary',
              backgroundColor: 'background.paper',
              transition: 'border-color 120ms ease, transform 120ms ease',
              '&:hover': disabled
                ? {}
                : { borderColor: 'primary.main', transform: 'translateY(-1px)' },
            }}
          >
            {prompt}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
