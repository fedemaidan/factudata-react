import { Box, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import MediaModal from './MediaModal';
import AudioPlayer from './AudioPlayer';

export default function MessageBubble({ message, isMine }) {
  const [open, setOpen] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const text = message?.type === 'text' || message?.type === 'text_extended' ? message?.message || '' : '';
  const date = message?.fecha ? new Date(message.fecha) : null;
  const pad = (n) => String(n).padStart(2, '0');

  const dateStr = date
    ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
    : '';
  const timeStr = date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '';

  const handleOpen = (type = 'image') => {
    setMediaType(type);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  return (
    <Box display="flex" justifyContent={isMine ? 'flex-end' : 'flex-start'} px={2} py={0.5}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: '75%',
          p: 1,
          bgcolor: isMine ? '#d1f4cc' : 'background.paper',
          borderRadius: 2,
        }}
      >
        {message.type === 'image' ? (
          <Box mb={text ? 1 : 0}>
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
              onClick={() => handleOpen('image')}
            />
            {message.caption ? (
              <Typography variant="body2" whiteSpace="pre-wrap" mt={1}>
                {message.caption}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {message.type === 'video' ? (
          <Box mb={text ? 1 : 0} position="relative">
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
              onClick={() => handleOpen('video')}
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
              onClick={() => handleOpen('video')}
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
        {message.type === 'image' || message.type === 'video' ? (
          <MediaModal open={open} src={message.message} type={mediaType} onClose={handleClose} />
        ) : null}
      </Paper>
    </Box>
  );
}
