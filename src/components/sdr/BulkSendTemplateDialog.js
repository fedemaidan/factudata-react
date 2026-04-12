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
  LinearProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { fetchMetaTemplates, sendTemplateFromConversation } from 'src/services/metaTemplateService';

/**
 * Dialog para enviar un template de Meta WhatsApp a múltiples contactos (envío masivo).
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - contacts: Array<{ phone: string, name?: string }> — lista de contactos destinatarios
 * - onComplete: ({ enviados, errores }) => void — callback al finalizar
 * - empresaId: string (ID de empresa para registro de evento SDR)
 */
export default function BulkSendTemplateDialog({ open, onClose, contacts = [], onComplete, empresaId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [paramValues, setParamValues] = useState({});
  const [fechaEnvio, setFechaEnvio] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [results, setResults] = useState(null);

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
      setResults(null);
      setProgress({ sent: 0, failed: 0, total: 0 });
    }
  }, [open, loadTemplates]);

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t._id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Sin 'phone' que se auto-inyecta en backend con el teléfono del contacto
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
    )?.filter(p => p.name !== 'phone') || [];
  }, [selectedTemplate]);

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

  // Detectar si el template tiene un parámetro de nombre para auto-rellenar por contacto
  const nombreParamKey = useMemo(() => {
    if (!selectedTemplate) return null;
    for (const comp of (selectedTemplate.components || [])) {
      for (const param of (comp.parameters || [])) {
        const n = (param.name || '').toLowerCase();
        if (n === 'nombre' || n === 'nombre_cliente' || n === 'nombre_usuario') return param.name;
      }
    }
    return null;
  }, [selectedTemplate]);

  const [defaultNombre, setDefaultNombre] = useState('👋');

  const URL_DEFAULT = 'FbWSUoTVc82oDU6F9';

  const handleSelectTemplate = (e) => {
    const tplId = e.target.value;
    setSelectedTemplateId(tplId);
    setError('');
    setResults(null);

    // Pre-cargar URL por defecto para botones de tipo URL (excepto 'phone' que se inyecta por contacto)
    const tpl = templates.find(t => t._id === tplId);
    const prefilled = {};
    if (tpl) {
      tpl.components?.forEach(comp => {
        if (comp.sub_type === 'url') {
          (comp.parameters || []).forEach(param => {
            const n = (param.name || '').toLowerCase();
            if (n !== 'phone') {
              prefilled[param.name] = URL_DEFAULT;
            }
          });
        }
      });
    }
    setParamValues(prefilled);
  };

  const handleParamChange = (paramName) => (e) => {
    setParamValues(prev => ({ ...prev, [paramName]: e.target.value }));
  };

  const handleSendBulk = async () => {
    if (!selectedTemplateId) {
      setError('Seleccioná un template');
      return;
    }
    if (!contacts.length) {
      setError('No hay contactos seleccionados');
      return;
    }

    const missingParams = allParameters.filter(p => !paramValues[p.name]?.trim() && !p.example);
    if (missingParams.length > 0) {
      setError(`Completá los parámetros: ${missingParams.map(p => p.name).join(', ')}`);
      return;
    }

    setSending(true);
    setError('');
    const total = contacts.length;
    setProgress({ sent: 0, failed: 0, total });

    const enviados = [];
    const errores = [];

    for (const contact of contacts) {
      const phone = contact.phone || contact.telefono || contact.whatsapp || '';
      if (!phone) {
        errores.push({ name: contact.name || contact.nombre || '?', error: 'Sin teléfono' });
        setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        continue;
      }

      try {
        // Si hay parámetro de nombre, reemplazar con el nombre del contacto (o fallback)
        const contactParamValues = { ...paramValues };
        if (nombreParamKey) {
          const nombre = contact.name || contact.nombre || '';
          contactParamValues[nombreParamKey] = nombre || defaultNombre || '👋';
        }
        // Inyectar el phone del contacto para el parámetro 'phone' del botón URL
        const cleanPhone = phone.replace(/\D/g, '');
        if (!contactParamValues.phone) {
          contactParamValues.phone = cleanPhone;
        }
        const payload = {
          phone: cleanPhone,
          templateId: selectedTemplateId,
          parameterValues: contactParamValues,
        };
        if (fechaEnvio) payload.fechaEnvio = fechaEnvio.toISOString();
        if (empresaId) payload.empresaId = empresaId;
        await sendTemplateFromConversation(payload);
        enviados.push({ name: contact.name || contact.nombre || phone });
        setProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
      } catch (err) {
        errores.push({
          name: contact.name || contact.nombre || phone,
          error: err.response?.data?.error || err.message,
        });
        setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }

    const finalResults = { enviados: enviados.length, errores };
    setResults(finalResults);
    setSending(false);

    if (onComplete) onComplete(finalResults);
  };

  const progressPercent = progress.total > 0
    ? ((progress.sent + progress.failed) / progress.total) * 100
    : 0;

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Envío masivo de template
        <Typography variant="body2" color="text.secondary">
          {contacts.length} contacto{contacts.length !== 1 ? 's' : ''} seleccionado{contacts.length !== 1 ? 's' : ''}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : results ? (
          <Stack spacing={2}>
            <Alert severity={results.errores.length === 0 ? 'success' : 'warning'}>
              {results.enviados} template{results.enviados !== 1 ? 's' : ''} enviado{results.enviados !== 1 ? 's' : ''} correctamente.
              {results.errores.length > 0 && ` ${results.errores.length} error(es).`}
            </Alert>
            {results.errores.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="error" mb={0.5}>Errores:</Typography>
                {results.errores.map((e, i) => (
                  <Typography key={i} variant="body2" color="text.secondary">
                    • {e.name}: {e.error}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={2.5} mt={0.5}>
            <TextField
              select
              label="Seleccionar Template"
              value={selectedTemplateId}
              onChange={handleSelectTemplate}
              fullWidth
              size="small"
              disabled={sending}
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
                {allParameters.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" mb={1} fontWeight={600}>
                      Parámetros del template
                    </Typography>
                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                      Los mismos valores se usarán para todos los contactos.
                      {nombreParamKey && ' El campo "' + nombreParamKey + '" se completará automáticamente con el nombre de cada contacto.'}
                    </Typography>
                    <Stack spacing={1.5}>
                      {allParameters.map((param) => {
                        const isNombreAutoParam = nombreParamKey && param.name === nombreParamKey;
                        return (
                          <TextField
                            key={param.key}
                            label={param.name || `Parámetro ${param.paramIndex + 1}`}
                            value={isNombreAutoParam ? '' : (paramValues[param.name] || '')}
                            onChange={handleParamChange(param.name)}
                            size="small"
                            fullWidth
                            disabled={sending || isNombreAutoParam}
                            placeholder={isNombreAutoParam ? 'Se completa con el nombre de cada contacto' : (param.example || '')}
                            helperText={isNombreAutoParam ? '✨ Se usa el nombre de cada contacto automáticamente' : (param.example ? `Ejemplo: ${param.example}` : undefined)}
                          />
                        );
                      })}
                    </Stack>
                    {nombreParamKey && (
                      <TextField
                        label="Si no tiene nombre, usar:"
                        value={defaultNombre}
                        onChange={(e) => setDefaultNombre(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mt: 1.5 }}
                        placeholder="👋"
                        helperText="Se usa cuando el contacto no tiene nombre cargado"
                      />
                    )}
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
                      disabled={sending}
                      slotProps={{
                        textField: { size: 'small', fullWidth: true, helperText: fechaEnvio ? 'Se enviarán en la fecha indicada' : 'Dejar vacío para enviar ahora' },
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
                  <Box sx={{
                    bgcolor: '#e7f8e2', borderRadius: 2, p: 1.5,
                    fontFamily: 'system-ui', fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap', border: '1px solid', borderColor: 'divider',
                  }}>
                    {preview}
                  </Box>
                </Box>

                <Alert severity="info" variant="outlined">
                  Se enviará este template a <strong>{contacts.length}</strong> contacto{contacts.length !== 1 ? 's' : ''}.
                </Alert>
              </>
            )}

            {sending && (
              <Box>
                <LinearProgress variant="determinate" value={progressPercent} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Enviando... {progress.sent + progress.failed}/{progress.total}
                  {progress.failed > 0 && ` (${progress.failed} error${progress.failed !== 1 ? 'es' : ''})`}
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {results ? (
          <Button onClick={onClose} variant="contained">Cerrar</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={sending}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSendBulk}
              disabled={!selectedTemplateId || sending}
              startIcon={sending ? <CircularProgress size={16} /> : (fechaEnvio ? <ScheduleSendIcon /> : <SendIcon />)}
            >
              {sending ? 'Enviando...' : (fechaEnvio ? `Programar a ${contacts.length} contacto${contacts.length !== 1 ? 's' : ''}` : `Enviar a ${contacts.length} contacto${contacts.length !== 1 ? 's' : ''}`)}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
