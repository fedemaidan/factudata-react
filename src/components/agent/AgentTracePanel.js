import { useMemo, useState } from 'react';
import { Box, IconButton, Tooltip, Typography, Collapse, Stack } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';

const FONT_MONO = '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const EVENT_PALETTE = {
  meta:      { stripe: '#475569', label: '#94a3b8', tag: 'TURN'        },
  llm_meta:  { stripe: '#6366f1', label: '#a5b4fc', tag: 'LLM'         },
  llm_reply: { stripe: '#a78bfa', label: '#c4b5fd', tag: 'LLM ←'       },
  tool_in:   { stripe: '#06b6d4', label: '#67e8f9', tag: 'LLM → TOOL'  },
  tool_out:  { stripe: '#10b981', label: '#6ee7b7', tag: 'TOOL ← OK'   },
  mongo:     { stripe: '#f59e0b', label: '#fcd34d', tag: 'MONGO'       },
  error:     { stripe: '#f43f5e', label: '#fda4af', tag: 'ERROR'       },
};

function classifyEvent(event) {
  if (!event) return 'meta';
  if (event.startsWith('mongo.')) return 'mongo';
  if (event === 'turn.tool_in') return 'tool_in';
  if (event === 'turn.tool_out' || event === 'dispatch.ok') return 'tool_out';
  if (event.includes('error') || event.includes('exception') || event.includes('unknown')) return 'error';
  if (event === 'turn.llm_final_text') return 'llm_reply';
  if (event.startsWith('turn.llm_')) return 'llm_meta';
  return 'meta';
}

function eventTitle(entry, kind) {
  const palette = EVENT_PALETTE[kind] || EVENT_PALETTE.meta;
  if (kind === 'tool_in')  return `${palette.tag} · ${entry.tool || '?'}`;
  if (kind === 'tool_out') return `${palette.tag} · ${entry.tool || '?'} (${entry.ms != null ? `${entry.ms}ms` : 'ok'})`;
  if (kind === 'mongo') {
    const op = entry.op || 'query';
    const coll = entry.collection ? `@ ${entry.collection}` : '';
    return `${palette.tag} ${op.toUpperCase()} ${coll}`.trim();
  }
  if (kind === 'llm_reply') return `${palette.tag} respuesta final`;
  if (kind === 'llm_meta') {
    const tokens = entry.completion_tokens != null
      ? `· ${entry.prompt_tokens || 0}+${entry.completion_tokens || 0}t`
      : '';
    return `${palette.tag} ${entry.event.replace('turn.llm_', '').toUpperCase()} ${tokens}`.trim();
  }
  if (kind === 'error') return `${palette.tag} ${entry.event}`;
  return `${palette.tag} ${entry.event.replace('turn.', '').toUpperCase()}`;
}

function pickPayload(entry, kind) {
  // Devuelve el bloque JSON principal a mostrar para cada tipo de evento.
  if (kind === 'tool_in') {
    return entry.args_full || entry.args || null;
  }
  if (kind === 'tool_out') {
    return entry.result_full || entry.result || null;
  }
  if (kind === 'mongo') {
    if (entry.pipeline) return { pipeline: entry.pipeline, op: entry.op, called_from: entry.called_from };
    if (entry.filter) return { filter: entry.filter, options: entry.options, called_from: entry.called_from };
    if (entry.result_count != null) return { result_count: entry.result_count, total_count: entry.total_count };
    return null;
  }
  if (kind === 'llm_reply') {
    return entry.reply_full ? { reply: entry.reply_full } : { reply_preview: entry.reply_preview };
  }
  if (kind === 'llm_meta') {
    const { ts, event, agent, contextId, ...rest } = entry;
    return rest;
  }
  if (kind === 'error') {
    return entry.error || entry.err || entry.stack ? { error: entry.error || entry.err, stack: entry.stack } : entry;
  }
  // meta: skip ts/event/agent/contextId noise
  const { ts, event, agent, contextId, ...rest } = entry;
  return Object.keys(rest).length ? rest : null;
}

function formatRelTs(currentTs, t0) {
  if (!currentTs || !t0) return '+0ms';
  const ms = new Date(currentTs).getTime() - t0;
  if (ms < 1000) return `+${ms}ms`;
  return `+${(ms / 1000).toFixed(2)}s`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onClick = (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_) { /* noop */ }
  };
  return (
    <Tooltip title={copied ? 'Copiado' : 'Copiar'} arrow>
      <IconButton
        onClick={onClick}
        size="small"
        sx={{
          color: copied ? '#34d399' : '#64748b',
          '&:hover': { color: '#cbd5e1', backgroundColor: 'rgba(148, 163, 184, 0.08)' },
          width: 22,
          height: 22,
        }}
      >
        <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Tooltip>
  );
}

function TraceEvent({ entry, t0 }) {
  const kind = classifyEvent(entry.event);
  const palette = EVENT_PALETTE[kind] || EVENT_PALETTE.meta;
  const payload = pickPayload(entry, kind);
  const title = eventTitle(entry, kind);
  const json = payload ? JSON.stringify(payload, null, 2) : null;

  return (
    <Box
      sx={{
        position: 'relative',
        pl: 1.75,
        py: 0.75,
        '&:hover .trace-copy': { opacity: 1 },
        borderLeft: `2px solid ${palette.stripe}`,
        ml: 0.25,
      }}
    >
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: json ? 0.5 : 0 }}>
        <Box
          sx={{
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            color: '#475569',
            letterSpacing: 0,
            minWidth: 50,
            flexShrink: 0,
          }}
        >
          {formatRelTs(entry.ts, t0)}
        </Box>
        <Box
          sx={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 600,
            color: palette.label,
            letterSpacing: 0.4,
            textTransform: 'none',
            flex: 1,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Box>
        {json ? (
          <Box className="trace-copy" sx={{ opacity: 0, transition: 'opacity 120ms' }}>
            <CopyButton text={json} />
          </Box>
        ) : null}
      </Stack>
      {json ? (
        <Box
          component="pre"
          sx={{
            m: 0,
            mt: 0.25,
            fontFamily: FONT_MONO,
            fontSize: 11,
            lineHeight: 1.55,
            color: '#cbd5e1',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.08)',
            borderRadius: 0.75,
            padding: '6px 8px',
            maxHeight: 240,
            overflow: 'auto',
          }}
        >
          {json}
        </Box>
      ) : null}
    </Box>
  );
}

export function AgentTracePanel({ trace }) {
  const [open, setOpen] = useState(false);
  const events = Array.isArray(trace?.events) ? trace.events : [];

  const { t0, totalMs } = useMemo(() => {
    if (events.length === 0) return { t0: null, totalMs: 0 };
    const start = new Date(events[0].ts).getTime();
    const end = new Date(events[events.length - 1].ts).getTime();
    return { t0: start, totalMs: end - start };
  }, [events]);

  if (events.length === 0) return null;

  const toolCalls = events.filter((e) => e.event === 'turn.tool_in').length;
  const mongoCalls = events.filter((e) => e.event === 'mongo.query').length;
  const llmCalls = events.filter((e) => e.event === 'turn.llm_request').length;

  return (
    <Box
      sx={{
        mt: 1,
        borderRadius: 1.25,
        backgroundColor: '#0b1220',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        boxShadow: '0 6px 24px -12px rgba(15, 23, 42, 0.45)',
        overflow: 'hidden',
        maxWidth: 'min(560px, calc(100% - 48px))',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setOpen((v) => !v)}
        sx={{
          cursor: 'pointer',
          px: 1.25,
          py: 0.85,
          backgroundColor: 'rgba(99, 102, 241, 0.06)',
          borderBottom: open ? '1px solid rgba(148, 163, 184, 0.12)' : 'none',
          '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.10)' },
          userSelect: 'none',
        }}
      >
        <TerminalRoundedIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
        <Typography
          sx={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 600,
            color: '#e2e8f0',
            letterSpacing: 0.4,
            flex: 1,
          }}
        >
          trace · {events.length} eventos · {llmCalls} llm · {toolCalls} tools · {mongoCalls} mongo · {totalMs}ms
        </Typography>
        <KeyboardArrowDownRoundedIcon
          sx={{
            fontSize: 16,
            color: '#94a3b8',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 160ms',
          }}
        />
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ py: 0.5 }}>
          {events.map((entry, i) => (
            <TraceEvent key={i} entry={entry} t0={t0} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
