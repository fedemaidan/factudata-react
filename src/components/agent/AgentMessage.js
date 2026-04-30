import { useState, useEffect, useRef } from 'react';
import { Avatar, Box, Button, Stack, Typography, alpha, useTheme } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import ReactMarkdown from 'react-markdown';
import { whatsappToMarkdown } from './markdownPreprocess';
import { useAuthContext } from 'src/contexts/auth-context';
import { AgentTracePanel } from './AgentTracePanel';

const COLLAPSED_HEIGHT = 800; // ~15 lines

// Mapa de tipo de acción → recurso visual. Para sumar un tipo nuevo (ej. delete
// confirmation, share, etc.), agregar una entrada acá. Sin tocar el resto.
const ACTION_VISUAL_BY_TYPE = {
  open_report: {
    variant: 'contained',
    color: 'primary',
    Icon: LaunchRoundedIcon,
    primary: true,
  },
  suggest_create_report: {
    variant: 'outlined',
    color: 'inherit',
    Icon: BookmarkAddRoundedIcon,
    primary: false,
  },
  view_in_caja: {
    variant: 'outlined',
    color: 'inherit',
    Icon: AccountBalanceWalletOutlinedIcon,
    primary: false,
  },
};

function AgentActionsRow({ actions, onAction }) {
  if (!Array.isArray(actions) || actions.length === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      flexWrap="wrap"
      useFlexGap
      sx={{ mt: 1, alignSelf: 'flex-start', rowGap: 0.75 }}
    >
      {actions.map((action, idx) => {
        const visual = ACTION_VISUAL_BY_TYPE[action?.type];
        if (!visual) return null;
        const Icon = visual.Icon;
        const isPrimary = visual.primary;
        return (
          <Button
            key={`${action.type}-${idx}`}
            size="small"
            variant={visual.variant}
            color={visual.color}
            disableElevation
            startIcon={<Icon />}
            onClick={() => onAction?.(action)}
            sx={(theme) => ({
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              minHeight: 30,
              fontSize: '0.8125rem',
              fontWeight: 500,
              letterSpacing: '0.005em',
              textTransform: 'none',
              transition: theme.transitions.create(
                ['box-shadow', 'border-color', 'background-color'],
                { duration: 180 },
              ),
              '& .MuiButton-startIcon': {
                marginRight: 0.75,
                '& > *': { fontSize: '1rem' },
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
              ...(isPrimary
                ? {
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)'
                        : '0 1px 2px rgba(15,23,42,0.08), inset 0 0 0 1px rgba(255,255,255,0.12)',
                    '&:hover': {
                      boxShadow: `0 4px 10px -2px ${alpha(
                        theme.palette.primary.main,
                        0.35,
                      )}, inset 0 0 0 1px rgba(255,255,255,0.16)`,
                    },
                  }
                : {
                    borderColor: 'divider',
                    color: 'text.primary',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      backgroundColor: alpha(
                        theme.palette.primary.main,
                        theme.palette.mode === 'dark' ? 0.08 : 0.04,
                      ),
                    },
                  }),
            })}
          >
            {action.label}
          </Button>
        );
      })}
    </Stack>
  );
}

function formatTimestamp(value) {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

function getUserInitials(user) {
  const f = (user?.firstName || '').trim()[0] || '';
  const l = (user?.lastName || '').trim()[0] || '';
  const init = (f + l).toUpperCase();
  if (init) return init;
  const email = (user?.email || '').trim();
  return email ? email[0].toUpperCase() : 'Y';
}

export function BotAvatar({ size = 32 }) {
  return (
    <Avatar
      aria-hidden
      sx={{
        width: size,
        height: size,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: (t) => `0 0 0 4px ${t.palette.primary.main}14`,
        flexShrink: 0,
      }}
    >
      <AutoAwesomeRoundedIcon sx={{ fontSize: size * 0.55 }} />
    </Avatar>
  );
}

export function UserAvatar({ size = 32 }) {
  const { user } = useAuthContext();
  const src = user?.avatar || undefined;
  return (
    <Avatar
      src={src}
      sx={{
        width: size,
        height: size,
        bgcolor: 'neutral.200',
        color: 'text.primary',
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {getUserInitials(user)}
    </Avatar>
  );
}

export function AgentMessage({
  role,
  content,
  createdAt,
  debugTrace,
  debugVisible = false,
  actions,
  onAction,
}) {
  const theme = useTheme();
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const time = formatTimestamp(createdAt);
  const showTrace = isAssistant && debugVisible && debugTrace;
  const hasActions = isAssistant && Array.isArray(actions) && actions.length > 0;

  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isAssistant) return;
    const el = contentRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > COLLAPSED_HEIGHT + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isAssistant, content]);

  const bubbleBg = isUser
    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
    : theme.palette.mode === 'dark'
      ? theme.palette.neutral?.[800] ?? '#1f2229'
      : '#ffffff';

  const collapsing = isAssistant && overflows && !expanded;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1,
        alignItems: 'flex-end',
        mb: 1.75,
        animation: 'agentMsgIn 220ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        '@keyframes agentMsgIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {isUser ? <UserAvatar /> : <BotAvatar />}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          maxWidth: 'min(560px, calc(100% - 48px))',
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 1.25,
            borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
            background: bubbleBg,
            color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
            border: isAssistant ? 1 : 0,
            borderColor: 'divider',
            boxShadow: isAssistant
              ? '0 1px 2px rgba(15, 23, 42, 0.04)'
              : '0 4px 14px -6px rgba(99, 102, 241, 0.45)',
            position: 'relative',
            overflow: 'hidden',
            '& p': { m: 0 },
            '& p + p': { mt: 0.75 },
            '& ul, & ol': { my: 0.5, pl: 2.5 },
            '& li + li': { mt: 0.25 },
            '& code': {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.875em',
              px: 0.5,
              py: 0.125,
              borderRadius: 0.5,
              backgroundColor: isUser
                ? 'rgba(255,255,255,0.18)'
                : theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(15,23,42,0.06)',
            },
            '& strong': { fontWeight: 600 },
            '& a': { color: 'inherit', textDecoration: 'underline' },
          }}
        >
          <Box
            ref={contentRef}
            sx={{
              overflow: 'hidden',
              maxHeight: collapsing ? COLLAPSED_HEIGHT : 'none',
              transition: 'max-height 0.25s ease',
            }}
          >
            <Typography
              component="div"
              variant="body2"
              sx={{
                lineHeight: 1.55,
                fontSize: '0.9375rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <ReactMarkdown>{whatsappToMarkdown(content)}</ReactMarkdown>
            </Typography>
          </Box>
          {collapsing && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 72,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(to bottom, transparent, ${theme.palette.neutral?.[800] ?? '#1f2229'})`
                  : 'linear-gradient(to bottom, transparent, #ffffff)',
                pointerEvents: 'none',
              }}
            />
          )}
        </Box>

        {isAssistant && overflows && (
          <Button
            size="small"
            variant="text"
            endIcon={expanded ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
            onClick={() => setExpanded((v) => !v)}
            sx={{
              mt: 0.5,
              px: 1,
              py: 0.25,
              minHeight: 28,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'text.secondary',
              textTransform: 'none',
              letterSpacing: '0.01em',
              alignSelf: 'flex-start',
              borderRadius: 1.5,
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
              '& .MuiButton-endIcon': { ml: 0.4, '& > *': { fontSize: '1rem' } },
            }}
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </Button>
        )}

        {hasActions ? <AgentActionsRow actions={actions} onAction={onAction} /> : null}
        {time ? (
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              px: 0.5,
              color: 'text.secondary',
              fontSize: '0.6875rem',
              letterSpacing: '0.02em',
            }}
          >
            {time}
          </Typography>
        ) : null}
        {showTrace ? <AgentTracePanel trace={debugTrace} /> : null}
      </Box>
    </Box>
  );
}

export function AgentTypingIndicator() {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        alignItems: 'flex-end',
        mb: 1.75,
      }}
    >
      <BotAvatar />
      <Box
        sx={{
          px: 1.75,
          py: 1.25,
          borderRadius: '14px 14px 14px 2px',
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.neutral?.[800] ?? '#1f2229' : '#ffffff',
          border: 1,
          borderColor: 'divider',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minHeight: 36,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: theme.palette.text.secondary,
              opacity: 0.4,
              animation: 'agentTypingDot 1.2s infinite ease-in-out',
              animationDelay: `${i * 0.18}s`,
              '@keyframes agentTypingDot': {
                '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                '30%': { transform: 'translateY(-3px)', opacity: 0.9 },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
