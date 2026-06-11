import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { AgentMessage, AgentTypingIndicator } from 'src/components/agent/AgentMessage';
import AgentReportPreview from 'src/components/agent/AgentReportPreview';
import { useAgentChat, useAgentDebugTrace } from 'src/hooks/useAgentChat';
import { useAgenteSpecialists } from 'src/hooks/useAgenteSpecialists';
import { pickQuickActions, pickExamplePrompts } from 'src/components/agent/agentQuickActions';
import { useAuthContext } from 'src/contexts/auth-context';

const AgentChatPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const consumedQueryRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const {
    messages,
    isLoadingHistory,
    isSending,
    awaitingConfirm,
    reportDraft,
    suggestions,
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
  const { user, originalUser } = useAuthContext();
  const isAdmin = !!originalUser?.admin;
  const isDesktop = useMediaQuery((t) => t.breakpoints.up('md'));
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // reportDraft solo lo emite el agente de reportes; el hook ya lo limpia si el turno
  // pasó a otro specialist, así que basta con su presencia para mostrar la preview.
  const showPreview = !!reportDraft;
  const handleSaveReport = useCallback(
    (nombre) => {
      setMobilePreviewOpen(false);
      sendMessage(`Guardá este reporte con el nombre "${nombre}".`);
    },
    [sendMessage],
  );
  const { specialists } = useAgenteSpecialists();
  const quickActions = useMemo(() => pickQuickActions(specialists), [specialists]);
  const examplePrompts = useMemo(() => pickExamplePrompts(specialists), [specialists]);

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

  const canAttach = !!specialists?.corralon || !!specialists?.reportes;
  // reportes acepta Excel/CSV como referencia de formato; corralón solo foto/PDF.
  const ATTACH_ACCEPT = specialists?.reportes
    ? 'image/*,application/pdf,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'
    : 'image/*,application/pdf';
  const MAX_ATTACHMENTS = 10;

  const handleSend = useCallback(() => {
    const value = draft.trim();
    if ((!value && attachedFiles.length === 0) || isSending) return;
    setDraft('');
    const files = attachedFiles;
    setAttachedFiles([]);
    sendMessage(value, files);
  }, [draft, attachedFiles, isSending, sendMessage]);

  const handleFilesSelected = useCallback((e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) {
      setAttachedFiles((prev) => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
    }
    // Permite volver a elegir el mismo archivo si lo quitan y re-agregan.
    e.target.value = '';
  }, []);

  const handleRemoveFile = useCallback((idx) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

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

  // Chip de sugerencia: se envía como si el usuario lo hubiera escrito.
  const handleSuggestionClick = useCallback(
    (chip) => {
      if (isSending || !chip?.message) return;
      sendMessage(chip.message);
    },
    [isSending, sendMessage],
  );

  const handleQuickAction = useCallback(
    (action) => {
      const prefill = typeof action === 'string' ? action : action?.prefill || '';
      // autosend: la acción se envía sola (onboarding proactivo); el agente responde
      // sin que el usuario tenga que escribir.
      if (action && typeof action === 'object' && action.autosend) {
        if (!isSending) sendMessage(prefill);
        return;
      }
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
    },
    [isSending, sendMessage],
  );

  // Despacho de acciones declarativas que vienen en el message del asistente
  // (open_report → navega; suggest_create_report → manda mensaje al chat).
  const handleMessageAction = useCallback(
    (action) => {
      if (!action || !action.type) return;
      if (action.type === 'open_report' && action.url) {
        router.push(action.url);
        return;
      }
      if (action.type === 'open_presupuesto_profesional' && action.url) {
        router.push(action.url);
        return;
      }
      if (action.type === 'suggest_create_report') {
        sendMessage('guardar como reporte');
        return;
      }
      if (action.type === 'view_in_caja' && action.url) {
        window.open(action.url, '_blank', 'noopener,noreferrer');
      }
    },
    [router, sendMessage],
  );

  const showEmptyState = !isLoadingHistory && messages.length === 0 && !isSending;

  const headerActions = useMemo(() => {
    if (!isAdmin) return null;
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
  }, [isAdmin, confirmingReset, handleReset, messages.length, isSending, debugVisible, toggleDebugVisible]);

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
      title="Asistente Sorby (Beta)"
      titleIcon={titleIcon}
      headerActions={headerActions}
    >
      <Head>
        <title>Asistente Sorby (Beta)</title>
      </Head>
      <Box sx={{ display: 'flex', height: 'calc(100dvh - 64px)', overflow: 'hidden' }}>
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'background.default',
          borderRight: showPreview && isDesktop ? 1 : 0,
          borderColor: 'divider',
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
                quickActions={quickActions}
                examplePrompts={examplePrompts}
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
                    attachments={m.attachments}
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

        {suggestions.length > 0 && !awaitingConfirm && !isSending ? (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              pt: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <Container maxWidth="md" disableGutters>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  overflowX: 'auto',
                  pb: 0.5,
                  // Oculta la barra de scroll sin perder el desplazamiento táctil.
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}
              >
                {suggestions.map((chip, i) => (
                  <Chip
                    key={`${chip.label}-${i}`}
                    label={chip.label}
                    onClick={() => handleSuggestionClick(chip)}
                    variant="outlined"
                    sx={{
                      flexShrink: 0,
                      height: 34,
                      borderColor: (t) => `${t.palette.primary.main}55`,
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      backgroundColor: (t) => `${t.palette.primary.main}0a`,
                      '&:hover': {
                        backgroundColor: (t) => `${t.palette.primary.main}1a`,
                        borderColor: 'primary.main',
                      },
                    }}
                  />
                ))}
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
            {attachedFiles.length > 0 ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {attachedFiles.map((f, i) => (
                  <Chip
                    key={`${f.name}-${i}`}
                    size="small"
                    icon={<AttachFileRoundedIcon />}
                    label={f.name}
                    onDelete={() => handleRemoveFile(i)}
                    disabled={isSending}
                  />
                ))}
              </Stack>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACH_ACCEPT}
              multiple
              hidden
              onChange={handleFilesSelected}
            />
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
              {canAttach ? (
                <Tooltip title={'Adjuntar archivo'}>
                  <span>
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                      sx={{ alignSelf: 'flex-end', color: 'text.secondary', width: 36, height: 36 }}
                      aria-label="Adjuntar archivo"
                    >
                      <AttachFileRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
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
                disabled={isSending || (!draft.trim() && attachedFiles.length === 0)}
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
              Sorby (Beta) puede equivocarse. Revisá los movimientos antes de confirmarlos.
            </Typography>
          </Container>
        </Box>
      </Box>

        {showPreview && isDesktop ? (
          <Box sx={{ width: { md: '48%', lg: '54%' }, height: '100%', flexShrink: 0 }}>
            <AgentReportPreview draft={reportDraft} user={user} onSave={handleSaveReport} />
          </Box>
        ) : null}
      </Box>

      {showPreview && !isDesktop ? (
        <>
          <Tooltip title="Ver previsualización del reporte">
            <IconButton
              onClick={() => setMobilePreviewOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 88,
                right: 16,
                zIndex: 1200,
                width: 52,
                height: 52,
                color: 'primary.contrastText',
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
                boxShadow: (t) => `0 8px 24px -8px ${t.palette.primary.main}99`,
                '&:hover': { filter: 'brightness(1.05)' },
              }}
              aria-label="Ver previsualización"
            >
              <InsightsRoundedIcon />
            </IconButton>
          </Tooltip>
          <Dialog
            fullScreen
            open={mobilePreviewOpen}
            onClose={() => setMobilePreviewOpen(false)}
          >
            <AgentReportPreview
              draft={reportDraft}
              user={user}
              onSave={handleSaveReport}
              onClose={() => setMobilePreviewOpen(false)}
            />
          </Dialog>
        </>
      ) : null}
    </DashboardLayout>
  );
};

function EmptyState({ onQuickAction, onPromptClick, disabled, quickActions, examplePrompts }) {
  const hasQuickActions = quickActions.length > 0;
  const hasExamplePrompts = examplePrompts.length > 0;
  const gridColumns = quickActions.length === 1
    ? '1fr'
    : quickActions.length === 2
      ? { xs: '1fr', sm: 'repeat(2, 1fr)' }
      : { xs: '1fr', sm: 'repeat(3, 1fr)' };

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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            ¿En qué te puedo ayudar?
          </Typography>
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
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          Estoy en beta: todavía puedo equivocarme o no tener todas las funciones.
          Cargá movimientos, armá un presupuesto, generá un reporte o consultá el
          estado de tus proyectos. Lo que hacés en el dashboard, también acá.
        </Typography>
      </Stack>

      {hasQuickActions ? (
        <Box sx={{ width: '100%', maxWidth: 640 }}>
          <SectionLabel>Acciones rápidas</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 1.25, mt: 1 }}>
            {quickActions.map((action) => (
              <ActionCard
                key={action.id}
                icon={action.icon}
                tone={action.tone}
                title={action.label}
                description={action.description}
                disabled={disabled}
                onClick={() => onQuickAction(action)}
              />
            ))}
          </Box>
        </Box>
      ) : null}

      {hasExamplePrompts ? (
        <Box sx={{ width: '100%', maxWidth: 640 }}>
          <SectionLabel>Probá preguntar</SectionLabel>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {examplePrompts.map((prompt) => (
              <PromptRow
                key={prompt.id}
                text={prompt.text}
                disabled={disabled}
                onClick={() => onPromptClick(prompt.text)}
              />
            ))}
          </Stack>
        </Box>
      ) : null}
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
