import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, CircularProgress, Button, Stack, Chip, IconButton
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import MessageBubble from '../conversaciones/MessageBubble';
import { fetchLastMessages } from '../../services/conversacionService';

/**
 * Visor compacto de conversación de WhatsApp.
 * Muestra los últimos N mensajes de un número de teléfono usando MessageBubble.
 * Incluye link para abrir la conversación completa en /conversaciones.
 */
const MiniChatViewer = ({ telefono, maxMessages = 50 }) => {
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (telefono) loadMessages();
    }, [telefono]);

    const loadMessages = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLastMessages(telefono, maxMessages);
            setConversationId(data.id_conversacion);
            // API devuelve desc (más recientes primero) → revertir para mostrar cronológico
            setMessages((data.items || []).slice().reverse());
        } catch (err) {
            console.error('Error cargando conversación:', err);
            setError(err.response?.status === 404 ? 'not_found' : 'error');
        } finally {
            setLoading(false);
        }
    };

    // Scroll al fondo cuando cargan los mensajes
    useEffect(() => {
        if (scrollRef.current && messages.length > 0) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
            }, 100);
        }
    }, [messages]);

    const handleOpenFull = () => {
        if (conversationId) {
            window.open(`/conversaciones?conversationId=${conversationId}`, '_blank');
        }
    };

    // --- Estados vacíos / error / loading ---

    if (!telefono) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    Sin teléfono asociado
                </Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1 }}>
                <CircularProgress size={28} />
                <Typography variant="caption" color="text.secondary">
                    Cargando conversación...
                </Typography>
            </Box>
        );
    }

    if (error === 'not_found') {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    No se encontró conversación con este número
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="error" gutterBottom>
                    Error al cargar la conversación
                </Typography>
                <Button size="small" onClick={loadMessages}>Reintentar</Button>
            </Box>
        );
    }

    if (messages.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    Sin mensajes aún
                </Typography>
            </Box>
        );
    }

    // --- Vista principal ---

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header: contador + acciones */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
            >
                <Chip size="small" label={`${messages.length} mensajes`} variant="outlined" />
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={loadMessages} title="Refrescar">
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                    {conversationId && (
                        <Button
                            size="small"
                            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                            onClick={handleOpenFull}
                        >
                            Ver completa
                        </Button>
                    )}
                </Stack>
            </Stack>

            {/* Mensajes con fondo estilo WhatsApp */}
            <Box
                ref={scrollRef}
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 1,
                    bgcolor: '#efeae2',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                }}
            >
                {messages.map((msg, i) => (
                    <MessageBubble
                        key={msg._id || msg.id || i}
                        message={msg}
                        isMine={!!msg.fromMe}
                    />
                ))}
            </Box>
        </Box>
    );
};

export default MiniChatViewer;
