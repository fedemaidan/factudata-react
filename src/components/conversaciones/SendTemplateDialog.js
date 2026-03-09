import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { fetchMetaTemplates, sendTemplateFromConversation } from 'src/services/metaTemplateService';

/**
 * Dialog para enviar un template de Meta WhatsApp desde la pantalla de conversaciones.
 * 
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - phone: string (teléfono del contacto, sin @s.whatsapp.net)
 * - contactName: string (nombre para mostrar)
 * - onSent: (result) => void (callback al enviar exitosamente)
 * - empresaId: string (ID de empresa para registro de evento SDR)
 */
export default function SendTemplateDialog({ open, onClose, phone, contactName, onSent, empresaId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [paramValues, setParamValues] = useState({});
  const [fechaEnvio, setFechaEnvio] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMetaTemplates({ activo: true });
      setTemplates(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSelectedTemplateId('');
      setParamValues({});
      setFechaEnvio(null);
      setError('');
      setSuccess('');
    }
  }, [open, loadTemplates]);

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t._id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Todos los parámetros del template seleccionado
  const allParameters = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.components?.flatMap((comp, ci) =>
      (comp.parameters || []).map((param, pi) => ({
        ...param,
        componentIndex: ci,
        paramIndex: pi,
        componentType: comp.type,
        componentSubType: comp.sub_type,
        key: `${comp.type}_${pi}_${param.name}`,
      }))
    ) || [];
  }, [selectedTemplate]);

  // Preview del texto del template con los valores ingresados
  const preview = useMemo(() => {
    if (!selectedTemplate) return '';
    const bodyComp = selectedTemplate.components?.find(c => c.type === 'BODY');
    if (!bodyComp?.text) return selectedTemplate.displayName;

    let text = bodyComp.text;
    (bodyComp.parameters || []).forEach((param, i) => {
      const val = paramValues[param.name] || param.example || `{{${i + 1}}}`;
      text = text.replace(`{{${i + 1}}}`, val);
    });
    return text;
  }, [selectedTemplate, paramValues]);

  const URL_DEFAULT = 'Fn6gVt3kqjsnymMs5';

  const handleSelectTemplate = (e) => {
    const tplId = e.target.value;
    setSelectedTemplateId(tplId);
    setError('');
    setSuccess('');

    // Pre-cargar parámetros de nombre y URL por defecto
    const tpl = templates.find(t => t._id === tplId);
    const prefilled = {};
    if (tpl) {
      tpl.components?.forEach(comp => {
        (comp.parameters || []).forEach(param => {
          const n = (param.name || '').toLowerCase();
          // Pre-cargar nombre del contacto si existe
          if (contactName && (n === 'nombre' || n === 'nombre_cliente' || n === 'nombre_usuario')) {
            prefilled[param.name] = contactName;
          }
          // Pre-cargar URL por defecto para botones de tipo URL
          if (comp.sub_type === 'url' && (n.includes('url') || param.type === 'text')) {
            prefilled[param.name] = URL_DEFAULT;
          }
        });
      });
    }
    setParamValues(prefilled);
  };

  const handleParamChange = (paramName) => (e) => {
    setParamValues(prev => ({ ...prev, [paramName]: e.target.value }));
  };

  const handleSend = async () => {
    if (!phone) {
      setError('No se puede enviar: teléfono no disponible');
      return;
    }
    if (!selectedTemplateId) {
      setError('Seleccioná un template');
      return;
    }

    // Verificar que todos los parámetros tienen valor
    const missingParams = allParameters.filter(p => !paramValues[p.name]?.trim() && !p.example);
    if (missingParams.length > 0) {
      setError(`Completá los parámetros: ${missingParams.map(p => p.name).join(', ')}`);
      return;
    }

    setSending(true);
    setError('');
    try {
      const payload = {
        phone,
        templateId: selectedTemplateId,
        parameterValues: paramValues,
      };
      if (fechaEnvio) payload.fechaEnvio = fechaEnvio.toISOString();
      if (empresaId) payload.empresaId = empresaId;
      const result = await sendTemplateFromConversation(payload);
      setSuccess(result.message || 'Template enviado correctamente');
      if (onSent) onSent(result);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al enviar template');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Enviar Template de WhatsApp
        {contactName && (
          <Typography variant="body2" color="text.secondary">
            A: {contactName} ({phone})
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5} mt={0.5}>
            <TextField
              select
              label="Seleccionar Template"
              value={selectedTemplateId}
              onChange={handleSelectTemplate}
              fullWidth
              size="small"
            >
              <MenuItem value="">
                <em>— Elegir template —</em>
              </MenuItem>
              {templates.map(t => (
                <MenuItem key={t._id} value={t._id}>
                  <Box display="flex" alignItems="center" gap={1} width="100%">
                    <Typography variant="body2">{t.displayName}</Typography>
                    <Chip label={t.category} size="small" variant="outlined" sx={{ ml: 'auto', height: 20, fontSize: '0.65rem' }} />
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {selectedTemplate && (
              <>
                {selectedTemplate.description && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedTemplate.description}
                  </Typography>
                )}

                {allParameters.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" mb={1} fontWeight={600}>
                      Parámetros del template
                    </Typography>
                    <Stack spacing={1.5}>
                      {allParameters.map((param) => (
                        <TextField
                          key={param.key}
                          label={param.name || `Parámetro ${param.paramIndex + 1}`}
                          value={paramValues[param.name] || ''}
                          onChange={handleParamChange(param.name)}
                          size="small"
                          fullWidth
                          placeholder={param.example || ''}
                          helperText={param.example ? `Ejemplo: ${param.example}` : `Componente: ${param.componentType}`}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography variant="subtitle2" mb={1} fontWeight={600}>
                    Programar envío (opcional)
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DateTimePicker
                      label="Fecha y hora de envío"
                      value={fechaEnvio}
                      onChange={setFechaEnvio}
                      slotProps={{
                        textField: { size: 'small', fullWidth: true, helperText: fechaEnvio ? 'Se enviará en la fecha indicada' : 'Dejar vacío para enviar ahora' },
                        actionBar: { actions: ['clear', 'accept'] },
                      }}
                      minDateTime={new Date()}
                      ampm={false}
                    />
                  </LocalizationProvider>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" mb={0.5} fontWeight={600} color="text.secondary">
                    Vista previa
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: '#e7f8e2',
                      borderRadius: 2,
                      p: 1.5,
                      fontFamily: 'system-ui',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {preview}
                  </Box>
                </Box>
              </>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!selectedTemplateId || sending}
          startIcon={sending ? <CircularProgress size={16} /> : (fechaEnvio ? <ScheduleSendIcon /> : <SendIcon />)}
        >
          {sending ? 'Enviando...' : (fechaEnvio ? 'Programar Template' : 'Enviar Template')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
