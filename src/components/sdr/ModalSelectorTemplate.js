/**
 * Modal Selector de Templates de WhatsApp
 * Permite seleccionar un template por etapa de cadencia y abre WhatsApp con el mensaje
 */
import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, Chip, Stack, Paper, CircularProgress,
    TextField, Tabs, Tab, IconButton, Divider, Alert
} from '@mui/material';
import {
    WhatsApp as WhatsAppIcon,
    Close as CloseIcon,
    Send as SendIcon,
    Edit as EditIcon,
    ContentCopy as CopyIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';
import { getWhatsAppLink } from '../../utils/phoneUtils';

// Etapas de cadencia
const CADENCIA_STEPS = [
    { step: 1, label: 'Primer contacto', color: 'info' },
    { step: 2, label: 'Follow-up', color: 'warning' },
    { step: 3, label: 'Último intento', color: 'error' },
];

/**
 * Reemplaza variables en el template
 * Variables soportadas: {{first_name}}, {{company}}, {{assigned_to}}
 */
const replaceVariables = (template, contacto, user = {}) => {
    if (!template) return '';
    
    let result = template;
    
    // {{first_name}} - Primer nombre del contacto
    const firstName = contacto?.nombre?.split(' ')[0] || contacto?.nombre || '';
    result = result.replace(/\{\{first_name\}\}/gi, firstName);
    
    // {{company}} - Empresa del contacto
    const company = contacto?.empresa || '';
    result = result.replace(/\{\{company\}\}/gi, company);
    
    // {{assigned_to}} - Nombre del SDR asignado
    const assignedTo = user?.firstName || user?.nombre || 'tu asesor';
    result = result.replace(/\{\{assigned_to\}\}/gi, assignedTo);
    
    // Limpiar variables no reemplazadas (opcionales)
    result = result.replace(/\{\{company\}\}/gi, ''); // Si no hay empresa
    
    return result.trim();
};

const ModalSelectorTemplate = ({
    open,
    onClose,
    contacto,
    user,
    empresaId,
    onTemplateUsed, // Callback cuando se usa un template
}) => {
    console.log('ModalSelectorTemplate render - open:', open, 'empresaId:', empresaId, 'contacto:', contacto?.nombre);
    
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStep, setSelectedStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [mensajeEditado, setMensajeEditado] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [copied, setCopied] = useState(false);

    // Cargar templates al abrir
    useEffect(() => {
        if (open && empresaId) {
            cargarTemplates();
        }
    }, [open, empresaId]);

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
            
            // Seleccionar el primer template de la cadencia actual
            const templatesStep1 = (data.templates || []).filter(t => t.cadencia_step === 1);
            if (templatesStep1.length > 0) {
                setSelectedTemplate(templatesStep1[0]);
            }
        } catch (error) {
            console.error('Error cargando templates:', error);
            // Usar templates por defecto si falla
            setTemplates(getDefaultTemplates());
        } finally {
            setLoading(false);
        }
    };

    // Templates por defecto si no hay en la base
    const getDefaultTemplates = () => [
        {
            _id: 'default-1',
            cadencia_step: 1,
            label: 'Primer contacto',
            body: '¡Hola {{first_name}}! 👋\n\nSoy {{assigned_to}} de Sorby. Vi que podrías estar interesado en optimizar la gestión de tu negocio.\n\n¿Tenés 5 minutos para que te cuente cómo podemos ayudarte?',
            active: true
        },
        {
            _id: 'default-2',
            cadencia_step: 2,
            label: 'Follow-up',
            body: '¡Hola {{first_name}}! 👋\n\nTe escribo de nuevo porque no quería que te pierdas la oportunidad de conocer Sorby.\n\n¿Te gustaría agendar una llamada rápida esta semana?',
            active: true
        },
        {
            _id: 'default-3',
            cadencia_step: 3,
            label: 'Último intento',
            body: 'Hola {{first_name}},\n\nÚltimo mensaje 😊 No quiero ser insistente, pero realmente creo que Sorby podría ayudarte.\n\nSi en algún momento querés conocer más, acá estoy.\n\n¡Éxitos!',
            active: true
        }
    ];

    const templatesActuales = templates.filter(t => t.cadencia_step === selectedStep && t.active);

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
    };

    const handleOpenWhatsApp = () => {
        if (!contacto?.telefono || !mensajeEditado) return;
        
        const link = getWhatsAppLink(contacto.telefono, mensajeEditado);
        window.open(link, '_blank');
        
        // Notificar que se usó el template
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
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {/* Selector de etapa de cadencia */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Etapa de cadencia
                            </Typography>
                            <Tabs 
                                value={selectedStep} 
                                onChange={(_, v) => {
                                    setSelectedStep(v);
                                    const templatesNuevos = templates.filter(t => t.cadencia_step === v);
                                    if (templatesNuevos.length > 0) {
                                        setSelectedTemplate(templatesNuevos[0]);
                                    } else {
                                        setSelectedTemplate(null);
                                    }
                                }}
                                variant="fullWidth"
                                sx={{ mb: 2 }}
                            >
                                {CADENCIA_STEPS.map(step => (
                                    <Tab 
                                        key={step.step}
                                        value={step.step}
                                        label={step.label}
                                        sx={{ textTransform: 'none' }}
                                    />
                                ))}
                            </Tabs>
                        </Box>

                        {/* Lista de templates */}
                        {templatesActuales.length > 0 ? (
                            <Stack spacing={1}>
                                <Typography variant="subtitle2">
                                    Templates disponibles
                                </Typography>
                                {templatesActuales.map(template => (
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
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {template.label}
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary"
                                            sx={{ 
                                                mt: 0.5,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}
                                        >
                                            {template.body}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Alert severity="info">
                                No hay templates para esta etapa. Se usarán los templates por defecto.
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

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit">
                    Cancelar
                </Button>
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

export default ModalSelectorTemplate;
