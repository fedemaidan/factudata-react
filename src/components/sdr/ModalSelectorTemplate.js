/**
 * Modal Selector de Templates de WhatsApp — Fase 2: Templates Contextuales
 * 
 * Filtra y ordena templates automáticamente según el contexto del contacto.
 * Usa tags en vez de cadencia_step. Recibe el contacto como prop para detectar contexto.
 */
import { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, Chip, Stack, Paper, CircularProgress,
    TextField, IconButton, Divider, Alert, Tabs, Tab, Tooltip
} from '@mui/material';
import {
    WhatsApp as WhatsAppIcon,
    Close as CloseIcon,
    Send as SendIcon,
    Edit as EditIcon,
    ContentCopy as CopyIcon,
    AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';
import { getWhatsAppLink } from '../../utils/phoneUtils';
import {
    detectarContextoTemplate,
    filtrarTemplatesPorContexto,
    TAG_MAP,
} from '../../utils/templateContexto';

/**
 * Reemplaza variables en el template
 * Variables soportadas: {{first_name}}, {{company}}, {{assigned_to}}
 */
const replaceVariables = (template, contacto, user = {}) => {
    if (!template) return '';
    
    let result = template;
    const firstName = contacto?.nombre?.split(' ')[0] || contacto?.nombre || '';
    result = result.replace(/\{\{first_name\}\}/gi, firstName);
    const company = contacto?.empresa || '';
    result = result.replace(/\{\{company\}\}/gi, company);
    const assignedTo = user?.firstName || user?.nombre || 'tu asesor';
    result = result.replace(/\{\{assigned_to\}\}/gi, assignedTo);
    result = result.replace(/\{\{company\}\}/gi, '');
    return result.trim();
};

// Tabs de visualización
const VIEW_TABS = [
    { key: 'contexto', label: '✨ Sugeridos' },
    { key: 'todos', label: '📋 Todos' },
];

const ModalSelectorTemplate = ({
    open,
    onClose,
    contacto,
    user,
    empresaId,
    onTemplateUsed,
    onTemplateSelected, // Nuevo callback: inserta template en wizard sin abrir WA
}) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [mensajeEditado, setMensajeEditado] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewTab, setViewTab] = useState(0);

    // Detectar contexto del contacto
    const contextoTags = useMemo(() => {
        return detectarContextoTemplate(contacto);
    }, [contacto?.estado, contacto?.contadores, contacto?.segmento, contacto?.reuniones]);

    // Templates filtrados y ordenados por contexto
    const templatesSugeridos = useMemo(() => {
        return filtrarTemplatesPorContexto(templates, contextoTags);
    }, [templates, contextoTags]);

    const templatesVisibles = viewTab === 0 ? templatesSugeridos : templates.filter(t => t.active !== false);

    // Cargar templates al abrir
    useEffect(() => {
        if (open && empresaId) {
            cargarTemplates();
            setViewTab(0);
            setSelectedTemplate(null);
        }
    }, [open, empresaId]);

    // Auto-seleccionar mejor template cuando los sugeridos cambian
    useEffect(() => {
        if (templatesSugeridos.length > 0 && !selectedTemplate && open) {
            setSelectedTemplate(templatesSugeridos[0]);
        }
    }, [templatesSugeridos, open]);

    // Actualizar mensaje cuando cambia el template seleccionado
    useEffect(() => {
        if (selectedTemplate) {
            const mensaje = replaceVariables(selectedTemplate.body, contacto, user);
            setMensajeEditado(mensaje);
            setEditMode(false);
        }
    }, [selectedTemplate, contacto, user]);

    const cargarTemplates = async () => {
        setLoading(true);
        try {
            const data = await SDRService.listarTemplatesWhatsApp(empresaId);
            setTemplates(data.templates || []);
        } catch (error) {
            console.error('Error cargando templates:', error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
    };

    const handleOpenWhatsApp = () => {
        if (!contacto?.telefono || !mensajeEditado) return;
        
        const link = getWhatsAppLink(contacto.telefono, mensajeEditado);
        window.open(link, '_blank');
        
        onTemplateUsed?.(selectedTemplate, mensajeEditado);
        onClose();
    };

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(mensajeEditado);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Error copiando:', error);
        }
    };

    const handleUseTemplate = () => {
        if (mensajeEditado && onTemplateSelected) {
            onTemplateSelected(mensajeEditado, selectedTemplate);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedTemplate(null);
        setMensajeEditado('');
        setEditMode(false);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
            sx={{ zIndex: 1400 }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <WhatsAppIcon sx={{ color: '#25D366' }} />
                        <Typography variant="h6">Enviar WhatsApp</Typography>
                    </Stack>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {contacto?.nombre} • {contacto?.telefono}
                </Typography>
                {/* Chips de contexto detectado */}
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    {contextoTags.filter(t => t !== 'generico').map(tag => {
                        const meta = TAG_MAP[tag];
                        return meta ? (
                            <Chip
                                key={tag}
                                label={meta.label}
                                size="small"
                                sx={{
                                    bgcolor: meta.color + '15',
                                    color: meta.color,
                                    borderColor: meta.color + '40',
                                    fontSize: '0.7rem',
                                    height: 22,
                                }}
                                variant="outlined"
                            />
                        ) : null;
                    })}
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {/* Tabs: Sugeridos / Todos */}
                        <Tabs
                            value={viewTab}
                            onChange={(_, v) => setViewTab(v)}
                            variant="fullWidth"
                            sx={{ minHeight: 36 }}
                        >
                            {VIEW_TABS.map((tab, idx) => (
                                <Tab 
                                    key={tab.key}
                                    label={
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <span>{tab.label}</span>
                                            {idx === 0 && templatesSugeridos.length > 0 && (
                                                <Chip label={templatesSugeridos.length} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem', minWidth: 20 }} />
                                            )}
                                        </Stack>
                                    }
                                    sx={{ textTransform: 'none', minHeight: 36, py: 0.5 }}
                                />
                            ))}
                        </Tabs>

                        {/* Lista de templates */}
                        {templatesVisibles.length > 0 ? (
                            <Stack spacing={1}>
                                {templatesVisibles.map(template => (
                                    <Paper
                                        key={template._id}
                                        elevation={0}
                                        onClick={() => handleSelectTemplate(template)}
                                        sx={{
                                            p: 2,
                                            cursor: 'pointer',
                                            border: 2,
                                            borderColor: selectedTemplate?._id === template._id ? 'primary.main' : 'divider',
                                            borderRadius: 2,
                                            bgcolor: selectedTemplate?._id === template._id ? 'primary.50' : 'white',
                                            '&:hover': {
                                                borderColor: 'primary.light'
                                            }
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Box sx={{ flex: 1 }}>
                                                <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {template.label}
                                                    </Typography>
                                                    {template._score > 0 && viewTab === 0 && (
                                                        <Tooltip title={`Relevancia: ${Math.round(template._score * 10) / 10}`}>
                                                            <AutoFixHighIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                                <Typography 
                                                    variant="body2" 
                                                    color="text.secondary"
                                                    sx={{ 
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical'
                                                    }}
                                                >
                                                    {template.body}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        {/* Tags del template */}
                                        {template.tags?.length > 0 && (
                                            <Stack direction="row" spacing={0.3} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.3 }}>
                                                {template.tags.map(tag => {
                                                    const meta = TAG_MAP[tag];
                                                    const isMatch = contextoTags.includes(tag);
                                                    return (
                                                        <Chip
                                                            key={tag}
                                                            label={meta?.icon || '📝'} 
                                                            size="small"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.6rem',
                                                                bgcolor: isMatch ? (meta?.color || '#607d8b') + '20' : 'grey.100',
                                                                color: isMatch ? meta?.color : 'text.disabled',
                                                                border: isMatch ? `1px solid ${meta?.color}40` : '1px solid transparent',
                                                                '& .MuiChip-label': { px: 0.5 }
                                                            }}
                                                            title={meta?.label || tag}
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Alert severity="info">
                                {viewTab === 0 
                                    ? 'No hay templates sugeridos para este contexto. Probá la pestaña "Todos".'
                                    : 'No hay templates disponibles.'}
                            </Alert>
                        )}

                        <Divider />

                        {/* Preview del mensaje */}
                        {selectedTemplate && (
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2">
                                        Mensaje a enviar
                                    </Typography>
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => setEditMode(!editMode)}
                                            color={editMode ? 'primary' : 'default'}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            onClick={handleCopyMessage}
                                            color={copied ? 'success' : 'default'}
                                        >
                                            <CopyIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                                
                                {editMode ? (
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={5}
                                        value={mensajeEditado}
                                        onChange={(e) => setMensajeEditado(e.target.value)}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                bgcolor: '#e7ffdb' // Color WhatsApp message
                                            }
                                        }}
                                    />
                                ) : (
                                    <Paper 
                                        elevation={0}
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: '#e7ffdb', // Color WhatsApp message
                                            borderRadius: 2,
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {mensajeEditado}
                                        </Typography>
                                    </Paper>
                                )}
                                
                                {copied && (
                                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                                        ✓ Copiado al portapapeles
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={handleClose} color="inherit">
                    Cancelar
                </Button>
                {onTemplateSelected && (
                    <Button
                        variant="outlined"
                        onClick={handleUseTemplate}
                        disabled={!mensajeEditado}
                        sx={{ borderRadius: 2 }}
                    >
                        Usar en wizard
                    </Button>
                )}
                <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleOpenWhatsApp}
                    disabled={!mensajeEditado || !contacto?.telefono}
                    sx={{ 
                        bgcolor: '#25D366', 
                        '&:hover': { bgcolor: '#128C7E' },
                        borderRadius: 2,
                        px: 3
                    }}
                >
                    Abrir WhatsApp
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export { replaceVariables };
export default ModalSelectorTemplate;
