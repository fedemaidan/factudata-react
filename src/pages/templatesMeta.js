import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Snackbar,
  Paper,
  Switch,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  fetchMetaTemplates,
  createMetaTemplate,
  updateMetaTemplate,
  deleteMetaTemplate,
} from 'src/services/metaTemplateService';

const CATEGORIES = [
  { value: 'UTILITY', label: 'Utilidad' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'AUTHENTICATION', label: 'Autenticación' },
];

const COMPONENT_TYPES = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];

const EMPTY_PARAMETER = { name: '', type: 'text', example: '' };
const EMPTY_COMPONENT = { type: 'BODY', format: '', text: '', parameters: [] };

const EMPTY_TEMPLATE = {
  name: '',
  displayName: '',
  language: 'es_AR',
  category: 'UTILITY',
  description: '',
  activo: true,
  components: [{ ...EMPTY_COMPONENT }],
};

export default function TemplatesMetaPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null); // null = crear, object = editar
  const [form, setForm] = useState({ ...EMPTY_TEMPLATE });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMetaTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al cargar templates', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      t => t.name.toLowerCase().includes(q) ||
           t.displayName.toLowerCase().includes(q) ||
           (t.description || '').toLowerCase().includes(q)
    );
  }, [templates, search]);

  // === Form handlers ===
  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_TEMPLATE, components: [{ ...EMPTY_COMPONENT }] });
    setDialogOpen(true);
  };

  const openEdit = (template) => {
    setEditing(template);
    setForm({
      name: template.name,
      displayName: template.displayName,
      language: template.language || 'es_AR',
      category: template.category || 'UTILITY',
      description: template.description || '',
      activo: template.activo !== false,
      components: template.components?.length
        ? template.components.map(c => ({
            type: c.type || 'BODY',
            format: c.format || '',
            text: c.text || '',
            parameters: c.parameters?.length
              ? c.parameters.map(p => ({ ...p }))
              : [],
          }))
        : [{ ...EMPTY_COMPONENT }],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleFieldChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Component management
  const addComponent = () => {
    setForm(prev => ({
      ...prev,
      components: [...prev.components, { ...EMPTY_COMPONENT }],
    }));
  };

  const removeComponent = (idx) => {
    setForm(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx),
    }));
  };

  const updateComponent = (idx, field, value) => {
    setForm(prev => {
      const updated = [...prev.components];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, components: updated };
    });
  };

  // Parameter management
  const addParameter = (compIdx) => {
    setForm(prev => {
      const updated = [...prev.components];
      updated[compIdx] = {
        ...updated[compIdx],
        parameters: [...updated[compIdx].parameters, { ...EMPTY_PARAMETER }],
      };
      return { ...prev, components: updated };
    });
  };

  const removeParameter = (compIdx, paramIdx) => {
    setForm(prev => {
      const updated = [...prev.components];
      updated[compIdx] = {
        ...updated[compIdx],
        parameters: updated[compIdx].parameters.filter((_, i) => i !== paramIdx),
      };
      return { ...prev, components: updated };
    });
  };

  const updateParameter = (compIdx, paramIdx, field, value) => {
    setForm(prev => {
      const updated = [...prev.components];
      const params = [...updated[compIdx].parameters];
      params[paramIdx] = { ...params[paramIdx], [field]: value };
      updated[compIdx] = { ...updated[compIdx], parameters: params };
      return { ...prev, components: updated };
    });
  };

  // Save
  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        setAlert({ open: true, message: 'El nombre del template es requerido', severity: 'warning' });
        return;
      }
      if (!form.displayName.trim()) {
        setAlert({ open: true, message: 'El nombre para mostrar es requerido', severity: 'warning' });
        return;
      }

      const payload = {
        ...form,
        components: form.components.filter(c => c.text || c.parameters.length > 0),
      };

      if (editing) {
        await updateMetaTemplate(editing._id, payload);
        setAlert({ open: true, message: 'Template actualizado correctamente', severity: 'success' });
      } else {
        await createMetaTemplate(payload);
        setAlert({ open: true, message: 'Template creado correctamente', severity: 'success' });
      }
      closeDialog();
      loadTemplates();
    } catch (err) {
      setAlert({ open: true, message: err.response?.data?.error || err.message, severity: 'error' });
    }
  };

  // Delete
  const confirmDelete = (template) => {
    setDeleteTarget(template);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteMetaTemplate(deleteTarget._id);
      setAlert({ open: true, message: 'Template eliminado', severity: 'success' });
      setConfirmOpen(false);
      setDeleteTarget(null);
      loadTemplates();
    } catch (err) {
      setAlert({ open: true, message: err.response?.data?.error || err.message, severity: 'error' });
    }
  };

  const categoryColor = (cat) => {
    switch (cat) {
      case 'MARKETING': return 'secondary';
      case 'UTILITY': return 'primary';
      case 'AUTHENTICATION': return 'warning';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout title="Templates de WhatsApp">
      <Head>
        <title>Templates Meta | ABM</title>
      </Head>

      <Box p={{ xs: 1, sm: 3 }} maxWidth={1200} mx="auto">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} gap={2}>
          <Typography variant="h5" fontWeight={700}>
            Templates aprobados por Meta
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nuevo Template
          </Button>
        </Stack>

        <TextField
          placeholder="Buscar por nombre o descripción..."
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Card>
          <TableContainer>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  {!isMobile && <TableCell>Nombre Meta</TableCell>}
                  <TableCell>Categoría</TableCell>
                  <TableCell>Idioma</TableCell>
                  <TableCell>Estado</TableCell>
                  {!isMobile && <TableCell>Parámetros</TableCell>}
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Cargando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={4}>
                        {search ? 'No se encontraron templates' : 'No hay templates registrados. Creá el primero.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tmpl) => {
                    const totalParams = tmpl.components?.reduce((acc, c) => acc + (c.parameters?.length || 0), 0) || 0;
                    return (
                      <TableRow key={tmpl._id} hover>
                        <TableCell>
                          <Typography fontWeight={600} variant="body2">{tmpl.displayName}</Typography>
                          {isMobile && (
                            <Typography variant="caption" color="text.secondary">{tmpl.name}</Typography>
                          )}
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="body2" fontFamily="monospace">{tmpl.name}</Typography>
                              <Tooltip title="Copiar nombre">
                                <IconButton size="small" onClick={() => {
                                  navigator.clipboard.writeText(tmpl.name);
                                  setAlert({ open: true, message: 'Nombre copiado', severity: 'info' });
                                }}>
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip label={tmpl.category} size="small" color={categoryColor(tmpl.category)} variant="outlined" />
                        </TableCell>
                        <TableCell>{tmpl.language}</TableCell>
                        <TableCell>
                          <Chip
                            label={tmpl.activo ? 'Activo' : 'Inactivo'}
                            size="small"
                            color={tmpl.activo ? 'success' : 'default'}
                            variant={tmpl.activo ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            {totalParams > 0 ? `${totalParams} param.` : '—'}
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(tmpl)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => confirmDelete(tmpl)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* === Dialog crear/editar template === */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editing ? 'Editar Template' : 'Nuevo Template'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField
                label="Nombre para mostrar"
                value={form.displayName}
                onChange={handleFieldChange('displayName')}
                fullWidth
                required
                helperText="Nombre amigable para la interfaz"
              />
              <TextField
                label="Nombre en Meta"
                value={form.name}
                onChange={handleFieldChange('name')}
                fullWidth
                required
                helperText="Exactamente como aparece en Meta Business"
                InputProps={{ style: { fontFamily: 'monospace' } }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField
                select
                label="Categoría"
                value={form.category}
                onChange={handleFieldChange('category')}
                sx={{ minWidth: 180 }}
              >
                {CATEGORIES.map(c => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Idioma"
                value={form.language}
                onChange={handleFieldChange('language')}
                sx={{ minWidth: 120 }}
                helperText="ej: es_AR, es, en_US"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.activo}
                    onChange={(e) => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                  />
                }
                label="Activo"
                sx={{ ml: 'auto' }}
              />
            </Stack>

            <TextField
              label="Descripción"
              value={form.description}
              onChange={handleFieldChange('description')}
              multiline
              rows={2}
              fullWidth
            />

            <Divider />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={600}>Componentes</Typography>
                <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={addComponent}>
                  Agregar componente
                </Button>
              </Stack>

              {form.components.map((comp, ci) => (
                <Paper key={ci} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Componente {ci + 1}
                    </Typography>
                    {form.components.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => removeComponent(ci)}>
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2}>
                    <TextField
                      select
                      label="Tipo"
                      value={comp.type}
                      onChange={(e) => updateComponent(ci, 'type', e.target.value)}
                      sx={{ minWidth: 140 }}
                      size="small"
                    >
                      {COMPONENT_TYPES.map(t => (
                        <MenuItem key={t} value={t}>{t}</MenuItem>
                      ))}
                    </TextField>
                    {comp.type === 'HEADER' && (
                      <TextField
                        select
                        label="Formato"
                        value={comp.format}
                        onChange={(e) => updateComponent(ci, 'format', e.target.value)}
                        sx={{ minWidth: 140 }}
                        size="small"
                      >
                        {['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map(f => (
                          <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Stack>

                  <TextField
                    label="Texto del template"
                    value={comp.text}
                    onChange={(e) => updateComponent(ci, 'text', e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                    helperText="Usá {{1}}, {{2}}, etc. para placeholders"
                    sx={{ mb: 2 }}
                  />

                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        Parámetros ({comp.parameters.length})
                      </Typography>
                      <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => addParameter(ci)}>
                        Parámetro
                      </Button>
                    </Stack>

                    {comp.parameters.map((param, pi) => (
                      <Stack key={pi} direction="row" gap={1} mb={1} alignItems="center">
                        <TextField
                          label="Nombre"
                          value={param.name}
                          onChange={(e) => updateParameter(ci, pi, 'name', e.target.value)}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Ejemplo"
                          value={param.example}
                          onChange={(e) => updateParameter(ci, pi, 'example', e.target.value)}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <IconButton size="small" color="error" onClick={() => removeParameter(ci, pi)}>
                          <RemoveCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editing ? 'Guardar Cambios' : 'Crear Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* === Dialog confirmar eliminación === */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Eliminar Template</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de eliminar el template <strong>{deleteTarget?.displayName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert(a => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert(a => ({ ...a, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
