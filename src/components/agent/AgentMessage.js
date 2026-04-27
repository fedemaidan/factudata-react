import { Box, Typography, useTheme } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { whatsappToMarkdown } from './markdownPreprocess';

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

export function AgentMessage({ role, content, createdAt }) {
  const theme = useTheme();
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const time = formatTimestamp(createdAt);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        mb: 1.75,
      }}
    >
      <Box
        sx={{
          maxWidth: '88%',
          px: 1.75,
          py: 1.25,
          borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
          backgroundColor: isUser
            ? theme.palette.primary.main
            : theme.palette.mode === 'dark'
              ? theme.palette.neutral?.[800] ?? '#1f2229'
              : theme.palette.neutral?.[100] ?? '#f3f4f6',
          color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
          boxShadow: isAssistant ? '0 1px 0 rgba(15, 23, 42, 0.04)' : 'none',
          // Markdown reset within bubble
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
        <Typography
          component="div"
          variant="body2"
          sx={{ lineHeight: 1.55, fontSize: '0.9375rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          <ReactMarkdown>{whatsappToMarkdown(content)}</ReactMarkdown>
        </Typography>
      </Box>
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
    </Box>
  );
}

export function AgentTypingIndicator() {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 1, pl: 0.5 }}>
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
  );
}
