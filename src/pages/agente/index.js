import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { AgentMessage, AgentTypingIndicator } from 'src/components/agent/AgentMessage';
import { useAgentChat, useAgentDebugTrace } from 'src/hooks/useAgentChat';

const QUICK_ACTIONS = [
  {
    label: 'Cargar un movimiento',
    description: 'Registrá un ingreso o egreso por chat',
    prefill: 'Quiero cargar un egreso de ',
    icon: AddRoundedIcon,
    tone: 'primary',
  },
  {
    label: 'Buscar movimientos',
    description: 'Filtrá por fecha, proyecto o monto',
    prefill: 'Mostrame los últimos ',
    icon: SearchRoundedIcon,
    tone: 'success',
  },
  {
    label: 'Editar un movimiento',
    description: 'Corregí un dato cargado antes',
    prefill: 'Quiero editar el movimiento ',
    icon: EditRoundedIcon,
    tone: 'warning',
  },
];

const EXAMPLE_PROMPTS = [
  '¿Cuánto gasté este mes?',
  'Cargá un egreso de $50.000 para materiales',
  'Mostrame los últimos 5 movimientos',
];

const AgentChatPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const consumedQueryRef = useRef(null);
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
  const { enabled: debugVisible, toggle: toggleDebugVisible } = useAgentDebugTrace();

  useEffect(() => {
    if (!hasLoadedHistory) loadHistory();
  }, [hasLoadedHistory, loadHistory]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, isSending]);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.q;
    if (typeof q !== 'string' || !q.trim()) return;
    if (!hasLoadedHistory) return;
    if (consumedQueryRef.current === q) return;
    consumedQueryRef.current = q;
    sendMessage(q);
    router.replace('/agente', undefined, { shallow: true });
  }, [router, hasLoadedHistory, sendMessage]);

  const handleSend = useCallback(() => {
    const value = draft.trim();
    if (!value || isSending) return;
    setDraft('');
    sendMessage(value);
  }, [draft, isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
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

  const handleQuickAction = useCallback((prefill) => {
    setDraft(prefill);
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
  }, []);

  // Despacho de acciones declarativas que vienen en el message del asistente
  // (open_report → navega; suggest_create_report → manda mensaje al chat).
  const handleMessageAction = useCallback(
    (action) => {
      if (!action || !action.type) return;
      if (action.type === 'open_report' && action.url) {
        router.push(action.url);
        return;
      }
      if (action.type === 'suggest_create_report') {
        sendMessage('guardar como reporte');
      }
    },
    [router, sendMessage],
  );

  const showEmptyState = !isLoadingHistory && messages.length === 0 && !isSending;

  const headerActions = useMemo(() => {
    if (confirmingReset) {
      return (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>
            ¿Borrar conversación?
          </Typography>
          <Tooltip title="Confirmar">
            <IconButton size="small" onClick={handleReset} color="error">
              <CheckCircleRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancelar">
            <IconButton size="small" onClick={() => setConfirmingReset(false)}>
              <CancelRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    }
    return (
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Tooltip title={debugVisible ? 'Ocultar trace dev' : 'Mostrar trace dev (tools + Mongo)'}>
          <IconButton
            size="small"
            onClick={toggleDebugVisible}
            sx={{
              color: debugVisible ? 'primary.main' : 'text.secondary',
              backgroundColor: debugVisible ? (t) => `${t.palette.primary.main}14` : 'transparent',
              '&:hover': {
                backgroundColor: (t) => `${t.palette.primary.main}1f`,
              },
            }}
          >
            <TerminalRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
      </Stack>
    );
  }, [confirmingReset, handleReset, messages.length, isSending, debugVisible, toggleDebugVisible]);

  const titleIcon = useMemo(
    () => (
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: (t) => `0 0 0 4px ${t.palette.primary.main}14`,
        }}
        aria-hidden
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
    ),
    [],
  );

  return (
    <DashboardLayout
      title="Asistente Sorby"
      titleIcon={titleIcon}
      headerActions={headerActions}
    >
      <Head>
        <title>Asistente Sorby</title>
      </Head>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100dvh - 64px)',
          backgroundColor: 'background.default',
        }}
      >
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
            position: 'relative',
            backgroundColor:
              theme.palette.mode === 'dark' ? 'background.default' : '#fafbff',
            backgroundImage:
              theme.palette.mode === 'dark'
                ? 'none'
                : `radial-gradient(circle, ${theme.palette.primary.main}0d 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
          }}
        >
          <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
            {isLoadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={24} />
              </Box>
            ) : showEmptyState ? (
              <EmptyState
                onQuickAction={handleQuickAction}
                onPromptClick={handlePromptClick}
                disabled={isSending}
              />
            ) : (
              <>
                {messages.map((m, idx) => (
                  <AgentMessage
                    key={`${m.role}-${idx}-${m.createdAt ?? ''}`}
                    role={m.role}
                    content={m.content}
                    createdAt={m.createdAt}
                    debugTrace={m.debugTrace}
                    debugVisible={debugVisible}
                    actions={m.actions}
                    onAction={handleMessageAction}
                  />
                ))}
                {isSending ? <AgentTypingIndicator /> : null}
              </>
            )}
          </Container>
        </Box>

        {awaitingConfirm && !isSending ? (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1,
              borderTop: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <Container maxWidth="md" disableGutters>
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
            </Container>
          </Box>
        ) : null}

        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Container maxWidth="md" disableGutters>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-end',
                p: 0.75,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                backgroundColor: 'background.default',
                transition: 'border-color 120ms ease, box-shadow 120ms ease',
                '&:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}1f`,
                },
              }}
            >
              <TextField
                inputRef={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí lo que necesitás… (Enter para enviar)"
                fullWidth
                multiline
                maxRows={6}
                size="small"
                disabled={isSending}
                variant="standard"
                InputProps={{ disableUnderline: true, sx: { px: 1, py: 0.5, fontSize: '0.9375rem' } }}
              />
              <IconButton
                onClick={handleSend}
                disabled={isSending || !draft.trim()}
                sx={{
                  background: (t) =>
                    `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
                  color: 'primary.contrastText',
                  width: 36,
                  height: 36,
                  alignSelf: 'flex-end',
                  '&:hover': { filter: 'brightness(1.05)' },
                  '&.Mui-disabled': {
                    background: (t) => t.palette.action.disabledBackground,
                    color: (t) => t.palette.action.disabled,
                  },
                }}
                aria-label="Enviar"
              >
                {isSending ? (
                  <CircularProgress size={16} sx={{ color: 'inherit' }} />
                ) : (
                  <SendRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.75,
                color: 'text.secondary',
                fontSize: '0.6875rem',
                textAlign: 'center',
              }}
            >
              Sorby puede equivocarse. Revisá los movimientos antes de confirmarlos.
            </Typography>
          </Container>
        </Box>
      </Box>
    </DashboardLayout>
  );
};

function EmptyState({ onQuickAction, onPromptClick, disabled }) {
  return (
    <Stack spacing={4} sx={{ alignItems: 'center', py: { xs: 3, sm: 5 } }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: (t) =>
              `radial-gradient(circle at 30% 30%, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 70%, ${t.palette.primary.dark} 100%)`,
            color: 'primary.contrastText',
            boxShadow: (t) => `0 8px 24px -8px ${t.palette.primary.main}80, 0 0 0 6px ${t.palette.primary.main}14`,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: -16,
              borderRadius: '50%',
              border: '1px dashed',
              borderColor: (t) => `${t.palette.primary.main}40`,
              animation: 'agentHaloRotate 18s linear infinite',
            },
            '@keyframes agentHaloRotate': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' },
            },
          }}
          aria-hidden
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mt: 1 }}>
          ¿En qué te puedo ayudar?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          Cargá movimientos, consultá tu caja o pedime un resumen de gastos. Lo que ya
          hacés en WhatsApp, también acá.
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', maxWidth: 640 }}>
        <SectionLabel>Acciones rápidas</SectionLabel>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.25,
            mt: 1,
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <ActionCard
              key={action.label}
              icon={action.icon}
              tone={action.tone}
              title={action.label}
              description={action.description}
              disabled={disabled}
              onClick={() => onQuickAction(action.prefill)}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', maxWidth: 640 }}>
        <SectionLabel>Probá preguntar</SectionLabel>
        <Stack spacing={0.75} sx={{ mt: 1 }}>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <PromptRow
              key={prompt}
              text={prompt}
              disabled={disabled}
              onClick={() => onPromptClick(prompt)}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'text.secondary',
        fontWeight: 700,
        fontSize: '0.6875rem',
        px: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

const TONE_BG = {
  primary: { bg: 'primary.main', soft: (t) => `${t.palette.primary.main}14` },
  success: { bg: 'success.main', soft: (t) => `${t.palette.success.main}14` },
  warning: { bg: 'warning.main', soft: (t) => `${t.palette.warning.main}1f` },
};

function ActionCard({ icon: Icon, tone, title, description, onClick, disabled }) {
  const palette = TONE_BG[tone] || TONE_BG.primary;
  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease',
        '&:hover, &:focus-visible': disabled
          ? {}
          : {
              borderColor: 'primary.main',
              transform: 'translateY(-2px)',
              boxShadow: (t) => `0 8px 20px -10px ${t.palette.primary.main}50`,
              outline: 'none',
            },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: palette.bg,
          backgroundColor: palette.soft,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        {description}
      </Typography>
    </Box>
  );
}

function PromptRow({ text, onClick, disabled }) {
  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        color: 'text.primary',
        transition: 'background-color 120ms ease',
        '&:hover, &:focus-visible': disabled
          ? {}
          : {
              backgroundColor: (t) => `${t.palette.primary.main}0a`,
              outline: 'none',
            },
      }}
    >
      <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>
        “{text}”
      </Typography>
      <SendRoundedIcon sx={{ fontSize: 16, color: 'primary.main', opacity: 0.7 }} />
    </Box>
  );
}

AgentChatPage.getLayout = (page) => page;

export default AgentChatPage;
