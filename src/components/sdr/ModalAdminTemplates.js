import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Stack,
    Typography,
    Button,
    IconButton,
    TextField,
    Chip,
    Paper,
    Tabs,
    Tab,
    Switch,
    FormControlLabel,
    Divider,
    CircularProgress,
    Alert,
    Tooltip,
    useTheme,
    useMediaQuery,
    Slide,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    WhatsApp as WhatsAppIcon,
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon,
    ContentCopy as ContentCopyIcon,
    Info as InfoIcon,
    Settings as SettingsIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Tipos de templates por defecto (se usan si no se cargan de la API)
const DEFAULT_TIPOS_TEMPLATE = [
    { id: 'prospecto', label: 'Prospecto', descripcion: 'Templates para contacto inicial con prospectos', isDefault: true },
    { id: 'seguimiento', label: 'Seguimiento', descripcion: 'Templates para seguimiento de contactos', isDefault: true },
    { id: 'post_llamada', label: 'Post llamada', descripcion: 'Templates para enviar después de una llamada', isDefault: true },
];

// Variables disponibles
const VARIABLES_DISPONIBLES = [
    { variable: '{{first_name}}', descripcion: 'Primer nombre del contacto' },
    { variable: '{{company}}', descripcion: 'Empresa del contacto' },
    { variable: '{{assigned_to}}', descripcion: 'Nombre del SDR asignado' },
];

// Templates por defecto para inicializar
const getDefaultTemplates = () => [
    // Prospecto
    {
        _id: 'default-prospecto-1',
        tipo: 'prospecto',
        label: 'Primer contacto',
        body: '¡Hola {{first_name}}! 👋\n\nSoy {{assigned_to}} de Sorby. Vi que podrías estar interesado en optimizar la gestión de tu negocio.\n\n¿Tenés 5 minutos para que te cuente cómo podemos ayudarte?',
        active: true,
        isDefault: true
    },
    {
        _id: 'default-prospecto-2',
        tipo: 'prospecto',
        label: 'Presentación corta',
        body: '¡Hola {{first_name}}! Soy de Sorby. ¿Tenés un momento para conocer cómo podemos ayudarte con tu negocio?',
        active: true,
        isDefault: true
    },
    // Seguimiento
    {
        _id: 'default-seguimiento-1',
        tipo: 'seguimiento',
        label: 'Recordatorio amigable',
        body: '¡Hola {{first_name}}! 👋\n\nTe escribo de nuevo porque no quería que te pierdas la oportunidad de conocer Sorby.\n\n¿Te gustaría agendar una llamada rápida esta semana?',
        active: true,
        isDefault: true
    },
    {
        _id: 'default-seguimiento-2',
        tipo: 'seguimiento',
        label: 'Último intento',
        body: 'Hola {{first_name}},\n\nÚltimo mensaje 😊 No quiero ser insistente, pero realmente creo que Sorby podría ayudarte.\n\nSi en algún momento querés conocer más, acá estoy.\n\n¡Éxitos!',
        active: true,
        isDefault: true
    },
    // Post llamada
    {
        _id: 'default-post-1',
        tipo: 'post_llamada',
        label: 'Llamada no atendida',
        body: 'Hola {{first_name}}! 👋 Te estuvimos llamando pero no pudimos comunicarnos. ¿Tenés un momento para conversar?',
        active: true,
        isDefault: true
    },
    {
        _id: 'default-post-2',
        tipo: 'post_llamada',
        label: 'Proponer horario',
        body: 'Hola {{first_name}}! Intenté llamarte sin éxito. ¿Te parece si coordinamos un horario que te quede cómodo?',
        active: true,
        isDefault: true
    }
];

const ModalAdminTemplates = ({
    open,
    onClose,
    empresaId,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [templates, setTemplates] = useState([]);
    const [tiposTemplate, setTiposTemplate] = useState(DEFAULT_TIPOS_TEMPLATE);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tipoSeleccionado, setTipoSeleccionado] = useState('prospecto');
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Estado para gestión de tipos
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [showTipoForm, setShowTipoForm] = useState(false);
    const [editingTipo, setEditingTipo] = useState(null);
    const [tipoFormData, setTipoFormData] = useState({ label: '' });
    
    // Obtener el tipo actual seleccionado
    const tipoActual = tiposTemplate.find(t => t.id === tipoSeleccionado) || tiposTemplate[0];
    
    // Formulario
    const [formData, setFormData] = useState({
        label: '',
        body: '',
        tipo: 'cadencia',
        cadencia_step: 1,
        active: true,
    });
    
    // Obtener templates filtrados por tipo
    const templatesFiltrados = templates.filter(t => t.tipo === tipoSeleccionado);

    // Cargar templates y tipos al abrir
    useEffect(() => {
        if (open && empresaId) {
            cargarTipos();
            cargarTemplates();
        }
    }, [open, empresaId]);

    // Limpiar al cerrar
    useEffect(() => {
        if (!open) {
            setEditingTemplate(null);
            setIsCreating(false);
            setError(null);
            setSuccess(null);
            setShowTipoForm(false);
            setEditingTipo(null);
        }
    }, [open]);

    const cargarTipos = async () => {
        try {
            const data = await SDRService.listarTiposTemplate(empresaId);
            const tipos = data.tipos || data || [];
            if (tipos.length > 0) {
                // Asegurar que cada tipo tenga 'tabs' para compatibilidad
                const tiposConTabs = tipos.map(t => ({
                    ...t,
                    tabs: t.tabs || t.steps || []
                }));
                setTiposTemplate(tiposConTabs);
                
                // Verificar que el tipo seleccionado existe, si no, seleccionar el primero
                if (!tiposConTabs.find(t => t.id === tipoSeleccionado)) {
                    setTipoSeleccionado(tiposConTabs[0]?.id || 'cadencia');
                }
            } else {
                setTiposTemplate(DEFAULT_TIPOS_TEMPLATE);
            }
        } catch (err) {
            console.error('Error cargando tipos:', err);
            setTiposTemplate(DEFAULT_TIPOS_TEMPLATE);
        }
    };

    const cargarTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await SDRService.listarTemplatesWhatsApp(empresaId);
            const serverTemplates = data.templates || [];
            
            // Si no hay templates en servidor, usar defaults
            if (serverTemplates.length === 0) {
                setTemplates(getDefaultTemplates());
            } else {
                setTemplates(serverTemplates);
            }
        } catch (err) {
            console.error('Error cargando templates:', err);
            // Usar defaults si falla
            setTemplates(getDefaultTemplates());
        } finally {
            setLoading(false);
        }
    };

    const handleTipoChange = (nuevoTipo) => {
        setTipoSeleccionado(nuevoTipo);
        handleCancelarEdicion();
    };

    const handleNuevoTemplate = () => {
        setIsCreating(true);
        setEditingTemplate(null);
        setFormData({
            label: '',
            body: '',
            tipo: tipoSeleccionado,
            active: true,
        });
    };

    const handleEditarTemplate = (template) => {
        setEditingTemplate(template);
        setIsCreating(false);
        setFormData({
            label: template.label || '',
            body: template.body || '',
            tipo: template.tipo || tipoSeleccionado,
            active: template.active !== false,
        });
    };

    const handleCancelarEdicion = () => {
        setEditingTemplate(null);
        setIsCreating(false);
        setFormData({
            label: '',
            body: '',
            tipo: tipoSeleccionado,
            active: true,
        });
    };

    const handleGuardar = async () => {
        if (!formData.label.trim() || !formData.body.trim()) {
            setError('El nombre y el mensaje son requeridos');
            return;
        }

        setSaving(true);
        setError(null);
        
        try {
            const templateData = {
                ...formData,
                tipo: tipoSeleccionado,
            };
            
            if (isCreating) {
                // Crear nuevo
                await SDRService.crearTemplateWhatsApp(empresaId, templateData);
                setSuccess('Template creado correctamente');
            } else if (editingTemplate) {
                // Si es un template default, crear uno nuevo en su lugar
                if (editingTemplate.isDefault || editingTemplate._id?.startsWith('default-')) {
                    await SDRService.crearTemplateWhatsApp(empresaId, templateData);
                    setSuccess('Template guardado correctamente');
                } else {
                    // Actualizar existente
                    await SDRService.actualizarTemplateWhatsApp(editingTemplate._id, templateData);
                    setSuccess('Template actualizado correctamente');
                }
            }
            
            await cargarTemplates();
            handleCancelarEdicion();
            
            // Limpiar mensaje de éxito después de 3 segundos
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error guardando template:', err);
            setError('Error al guardar el template. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleEliminar = async (template) => {
        if (template.isDefault || template._id?.startsWith('default-')) {
            setError('No se pueden eliminar los templates por defecto');
            return;
        }

        if (!confirm(`¿Eliminar el template "${template.label}"?`)) {
            return;
        }

        setSaving(true);
        try {
            await SDRService.eliminarTemplateWhatsApp(template._id);
            setSuccess('Template eliminado');
            await cargarTemplates();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error eliminando template:', err);
            setError('Error al eliminar el template');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (template) => {
        if (template.isDefault || template._id?.startsWith('default-')) {
            setError('Los templates por defecto no se pueden desactivar');
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            await SDRService.actualizarTemplateWhatsApp(template._id, {
                active: !template.active
            });
            await cargarTemplates();
        } catch (err) {
            console.error('Error actualizando template:', err);
        }
    };

    const insertarVariable = (variable) => {
        setFormData(prev => ({
            ...prev,
            body: prev.body + variable
        }));
    };

    // Funciones para gestión de tipos
    const handleMenuOpen = (event) => setMenuAnchor(event.currentTarget);
    const handleMenuClose = () => setMenuAnchor(null);
    
    const handleNuevoTipo = () => {
        handleMenuClose();
        setEditingTipo(null);
        setTipoFormData({ label: '' });
        setShowTipoForm(true);
    };
    
    const handleEditarTipo = (tipo) => {
        handleMenuClose();
        setEditingTipo(tipo);
        setTipoFormData({ label: tipo.label });
        setShowTipoForm(true);
    };
    
    const handleGuardarTipo = async () => {
        if (!tipoFormData.label.trim()) {
            setError('El nombre del tipo es requerido');
            return;
        }
        
        setSaving(true);
        try {
            if (editingTipo) {
                await SDRService.actualizarTipoTemplate(editingTipo._id, tipoFormData);
                setSuccess('Tipo actualizado');
            } else {
                await SDRService.crearTipoTemplate(empresaId, tipoFormData);
                setSuccess('Tipo creado');
            }
            await cargarTipos();
            setShowTipoForm(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error guardando tipo:', err);
            setError('Error al guardar el tipo');
        } finally {
            setSaving(false);
        }
    };
    
    const handleEliminarTipo = async (tipo) => {
        if (tipo.isDefault) {
            setError('No se pueden eliminar tipos por defecto');
            setTimeout(() => setError(null), 3000);
            return;
        }
        
        if (!confirm(`¿Eliminar el tipo "${tipo.label}"? Se eliminarán también los templates asociados.`)) {
            return;
        }
        
        setSaving(true);
        try {
            await SDRService.eliminarTipoTemplate(tipo._id);
            setSuccess('Tipo eliminado');
            await cargarTipos();
            // Si el tipo eliminado era el seleccionado, volver a cadencia
            if (tipoSeleccionado === tipo.id) {
                setTipoSeleccionado('cadencia');
            }
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error eliminando tipo:', err);
            setError('Error al eliminar el tipo');
        } finally {
            setSaving(false);
        }
        handleMenuClose();
    };

    // Vista del formulario de edición
    const renderFormulario = () => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header del formulario */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton onClick={handleCancelarEdicion} size="small">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">
                        {isCreating ? 'Nuevo Template' : 'Editar Template'}
                    </Typography>
                </Stack>
            </Box>

            {/* Contenido del formulario */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <Stack spacing={3}>
                    {/* Nombre del template */}
                    <TextField
                        label="Nombre del template"
                        fullWidth
                        value={formData.label}
                        onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Ej: Primer contacto, Seguimiento, etc."
                        helperText="Un nombre descriptivo para identificar este template"
                    />

                    {/* Tipo de template (solo lectura) */}
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Tipo de template
                        </Typography>
                        <Chip 
                            label={tipoActual?.label || tipoSeleccionado}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    {/* Variables disponibles */}
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Variables disponibles (click para insertar)
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {VARIABLES_DISPONIBLES.map((v) => (
                                <Tooltip key={v.variable} title={v.descripcion} arrow>
                                    <Chip
                                        label={v.variable}
                                        size="small"
                                        variant="outlined"
                                        onClick={() => insertarVariable(v.variable)}
                                        sx={{ cursor: 'pointer', mb: 1 }}
                                    />
                                </Tooltip>
                            ))}
                        </Stack>
                    </Box>

                    {/* Mensaje */}
                    <TextField
                        label="Mensaje"
                        fullWidth
                        multiline
                        rows={8}
                        value={formData.body}
                        onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="Escribe el mensaje del template..."
                        helperText={`${formData.body.length} caracteres`}
                    />

                    {/* Switch activo */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.active}
                                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                            />
                        }
                        label="Template activo"
                    />

                    {/* Preview */}
                    {formData.body && (
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#DCF8C6', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                Vista previa (con datos de ejemplo)
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {formData.body
                                    .replace(/\{\{first_name\}\}/gi, 'Juan')
                                    .replace(/\{\{company\}\}/gi, 'Empresa SA')
                                    .replace(/\{\{assigned_to\}\}/gi, 'María')
                                }
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>

            {/* Footer con botones */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                <Stack direction="row" spacing={2}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleCancelarEdicion}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleGuardar}
                        disabled={saving || !formData.label.trim() || !formData.body.trim()}
                        startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                    >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </Stack>
            </Box>
        </Box>
    );

    // Vista de lista de templates
    const renderLista = () => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <WhatsAppIcon sx={{ color: '#25D366' }} />
                        <Typography variant="h6">Templates WhatsApp</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <IconButton onClick={handleMenuOpen} size="small">
                            <SettingsIcon />
                        </IconButton>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </Box>
            
            {/* Menú de configuración */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleNuevoTipo}>
                    <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Nuevo tipo de template</ListItemText>
                </MenuItem>
                <Divider />
                {tiposTemplate.filter(t => !t.isDefault).map(tipo => (
                    <MenuItem key={tipo._id || tipo.id} onClick={() => handleEditarTipo(tipo)}>
                        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>{tipo.label}</ListItemText>
                        <IconButton 
                            size="small" 
                            onClick={(e) => { e.stopPropagation(); handleEliminarTipo(tipo); }}
                            sx={{ ml: 1 }}
                        >
                            <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                    </MenuItem>
                ))}
                {tiposTemplate.filter(t => !t.isDefault).length === 0 && (
                    <MenuItem disabled>
                        <Typography variant="body2" color="text.secondary">
                            No hay tipos personalizados
                        </Typography>
                    </MenuItem>
                )}
            </Menu>

            {/* Tabs de tipo de template - dinámicos */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={tiposTemplate.findIndex(t => t.id === tipoSeleccionado) || 0}
                    onChange={(e, v) => handleTipoChange(tiposTemplate[v]?.id || 'prospecto')}
                    variant={tiposTemplate.length > 3 ? "scrollable" : "fullWidth"}
                    scrollButtons="auto"
                >
                    {tiposTemplate.map((tipo) => (
                        <Tab key={tipo.id || tipo._id} label={tipo.label} />
                    ))}
                </Tabs>
            </Box>

            {/* Info del tipo */}
            <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                        {tipoActual?.descripcion || `Templates de ${tipoActual?.label || 'este tipo'}`}
                    </Typography>
                </Stack>
            </Box>
            
            {/* Formulario para crear/editar tipo */}
            {showTipoForm && (
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
                    <Stack spacing={2}>
                        <Typography variant="subtitle2">
                            {editingTipo ? 'Editar tipo de template' : 'Nuevo tipo de template'}
                        </Typography>
                        <TextField
                            label="Nombre del tipo"
                            fullWidth
                            size="small"
                            value={tipoFormData.label}
                            onChange={(e) => setTipoFormData(prev => ({ ...prev, label: e.target.value }))}
                            placeholder="Ej: Seguimiento, Promociones, etc."
                        />
                        <Stack direction="row" spacing={1}>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={() => setShowTipoForm(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                variant="contained" 
                                size="small"
                                onClick={handleGuardarTipo}
                                disabled={saving || !tipoFormData.label.trim()}
                            >
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}

            {/* Contenido */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {/* Mensajes de estado */}
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert severity="success" onClose={() => setSuccess(null)}>
                                {success}
                            </Alert>
                        )}

                        {/* Lista de templates */}
                        {templatesFiltrados.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary" mb={2}>
                                    No hay templates de {tipoActual?.label || 'este tipo'}
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleNuevoTemplate}
                                >
                                    Crear template
                                </Button>
                            </Paper>
                        ) : (
                            templatesFiltrados.map((template) => (
                                <Paper 
                                    key={template._id} 
                                    variant="outlined" 
                                    sx={{ 
                                        p: 2, 
                                        borderRadius: 2,
                                        opacity: template.active === false ? 0.6 : 1,
                                        borderColor: template.active === false ? 'grey.300' : 'divider',
                                    }}
                                >
                                    <Stack spacing={1}>
                                        {/* Header del template */}
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {template.label}
                                                </Typography>
                                                {template.isDefault && (
                                                    <Chip label="Default" size="small" variant="outlined" />
                                                )}
                                                {template.active === false && (
                                                    <Chip label="Inactivo" size="small" color="default" />
                                                )}
                                            </Stack>
                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title="Editar">
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleEditarTemplate(template)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {!template.isDefault && !template._id?.startsWith('default-') && (
                                                    <Tooltip title="Eliminar">
                                                        <IconButton 
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleEliminar(template)}
                                                            disabled={saving}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </Stack>

                                        {/* Preview del mensaje */}
                                        <Paper 
                                            sx={{ 
                                                p: 1.5, 
                                                bgcolor: '#DCF8C6', 
                                                borderRadius: 2,
                                                maxHeight: 120,
                                                overflow: 'auto'
                                            }}
                                        >
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    whiteSpace: 'pre-wrap',
                                                    fontSize: '0.85rem',
                                                    lineHeight: 1.4
                                                }}
                                            >
                                                {template.body?.substring(0, 200)}
                                                {template.body?.length > 200 && '...'}
                                            </Typography>
                                        </Paper>

                                        {/* Switch activo/inactivo */}
                                        {!template.isDefault && !template._id?.startsWith('default-') && (
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        size="small"
                                                        checked={template.active !== false}
                                                        onChange={() => handleToggleActive(template)}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2" color="text.secondary">
                                                        {template.active !== false ? 'Activo' : 'Inactivo'}
                                                    </Typography>
                                                }
                                            />
                                        )}
                                    </Stack>
                                </Paper>
                            ))
                        )}
                    </Stack>
                )}
            </Box>

            {/* Footer con botón agregar */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleNuevoTemplate}
                    sx={{ borderRadius: 2, py: 1.5 }}
                >
                    Nuevo template de {tipoActual?.label || 'este tipo'}
                </Button>
            </Box>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isMobile}
            fullWidth
            maxWidth="sm"
            TransitionComponent={isMobile ? Transition : undefined}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    height: isMobile ? '100%' : '80vh',
                    maxHeight: isMobile ? '100%' : '80vh',
                }
            }}
        >
            {editingTemplate || isCreating ? renderFormulario() : renderLista()}
        </Dialog>
    );
};

export default ModalAdminTemplates;
