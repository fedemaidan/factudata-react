import { Badge, Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import AudioPlayer from './AudioPlayer';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import AddIcon from '@mui/icons-material/Add';

// Helper to check if src is a valid media URL (not an internal event identifier)
const isValidMediaUrl = (src) => {
  if (!src || typeof src !== 'string') return false;
  // Internal event identifiers start with _event_
  if (src.startsWith('_event_')) return false;
  // Check if it looks like a URL (http, https, data:, blob:, or /)
  return src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/');
};

export default function MessageBubble({
  message,
  isMine,
  messageId,
  isHighlighted,
  onMediaClick,
  onAddAnnotation,
  annotationsCount = 0,
}) {
  const text = message?.type === 'text' || message?.type === 'text_extended' ? message?.message || '' : '';
  const date = message?.fecha ? new Date(message.fecha) : null;
  const pad = (n) => String(n).padStart(2, '0');

  const dateStr = date
    ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
    : '';
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '';

  const handleMediaClick = (type = 'image') => {
    if (onMediaClick && message?.message && isValidMediaUrl(message.message)) {
      onMediaClick({ src: message.message, type });
    }
  };

  const resolvedMessageId = messageId || message?._id || message?.id;
  const anchorId = resolvedMessageId
    ? `message-${resolvedMessageId}`
    : undefined;
  const highlightSx = isHighlighted
    ? {
        border: 2,
        borderColor: 'primary.main',
        boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.35)',
      }
    : {};

  // Check if media URL is valid
  const hasValidMediaUrl = isValidMediaUrl(message?.message);

  const handleAddAnnotationClick = () => {
    if (!onAddAnnotation) return;
    if (!resolvedMessageId) return;
    onAddAnnotation({ messageId: resolvedMessageId, message });
  };

  const annotationButton = (
    <Tooltip title="Agregar anotación">
      <span>
        <IconButton
          size="small"
          onClick={handleAddAnnotationClick}
          aria-label="Agregar anotación"
          disabled={!resolvedMessageId}
          sx={{
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Badge
            color="primary"
            badgeContent={annotationsCount > 0 ? annotationsCount : 0}
            invisible={!annotationsCount}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                minWidth: 16,
                height: 16,
              },
            }}
          >
            <AddIcon fontSize="small" />
          </Badge>
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box
      display="flex"
      justifyContent={isMine ? 'flex-end' : 'flex-start'}
      px={2}
      py={0.5}
      id={anchorId}
    >
      <Box display="flex" alignItems="flex-start" gap={0.75} maxWidth="75%">
        {isMine ? annotationButton : null}
        <Paper
          elevation={0}
          sx={{
            p: 1,
            bgcolor: isMine ? '#d1f4cc' : 'background.paper',
            borderRadius: 2,
            ...highlightSx,
          }}
        >
          {message.type === 'image' ? (
            <Box mb={text ? 1 : 0}>
              {hasValidMediaUrl ? (
                <img
                  src={message.message}
                  alt="mensaje-imagen"
                  style={{
                    display: 'block',
                    width: 'min(420px, 100%)',
                    height: 'auto',
                    maxHeight: '220px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleMediaClick('image')}
                />
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  p={2}
                  sx={{
                    bgcolor: isMine ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 2,
                    minWidth: 150,
                  }}
                >
                  <ImageIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Imagen (no disponible)
                  </Typography>
                </Box>
              )}
              {message.caption ? (
                <Typography variant="body2" whiteSpace="pre-wrap" mt={1}>
                  {message.caption}
                </Typography>
              ) : null}
            </Box>
          ) : null}

        {message.type === 'video' ? (
          <Box mb={text ? 1 : 0} position="relative">
            {hasValidMediaUrl ? (
              <>
                <video
                  src={message.message}
                  style={{
                    display: 'block',
                    width: 'min(420px, 100%)',
                    height: 'auto',
                    maxHeight: '220px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleMediaClick('video')}
                  preload="metadata"
                />
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  sx={{
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleMediaClick('video')}
                >
                  <Box
                    sx={{
                      width: 0,
                      height: 0,
                      borderLeft: '12px solid white',
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      marginLeft: '4px',
                    }}
                  />
                </Box>
              </>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                p={2}
                sx={{
                  bgcolor: isMine ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 2,
                  minWidth: 150,
                }}
              >
                <VideocamIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Video (no disponible)
                </Typography>
              </Box>
            )}
            {message.caption ? (
              <Typography variant="body2" whiteSpace="pre-wrap" mt={1}>
                {message.caption}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {message.type === 'audio' ? (
          <Box mb={text ? 1 : 0}>
            <AudioPlayer src={message.message} duration={message.caption || 0} isMine={isMine} />
          </Box>
        ) : null}

        {message.type === 'document' ? (
          <Box mb={text ? 1 : 0} p={1} bgcolor="background.default" borderRadius={1}>
            <Typography variant="body2" fontWeight={600}>
              📄 Documento
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {message.caption || 'Archivo adjunto'}
            </Typography>
          </Box>
        ) : null}

        {text ? (
          <Typography variant="body2" whiteSpace="pre-wrap">
            {text}
          </Typography>
        ) : null}
          <Box mt={0.5} display="flex" justifyContent="flex-end" gap={1}>
            {dateStr ? (
              <Typography variant="caption" color="text.secondary">
                {dateStr}
              </Typography>
            ) : null}
            {timeStr ? (
              <Typography variant="caption" color="text.secondary">
                {timeStr}
              </Typography>
            ) : null}
          </Box>
          </Paper>
        {!isMine ? annotationButton : null}
      </Box>
    </Box>
  );
}
