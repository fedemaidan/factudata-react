import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Alert, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography, MenuItem, Select, InputLabel, FormControl,
  Checkbox, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InputAdornment from '@mui/material/InputAdornment';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import FollowUpConfigService from 'src/services/followUpConfigService';
import { fetchMetaTemplates } from 'src/services/metaTemplateService';

const emptyForm = {
  id: '',
  mensaje: '',
  proxEvent: '',
  tiempo: 0,
  tipo: 'mensaje',
  promt_assistant: '',
  respetar_horario: false,
  templateId: '',
  parameterValues: {},
  buttons: [],
};

const FollowUpConfig = () => {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert(prev => ({ ...prev, open: false }));

  const [q, setQ] = useState('');

  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [metaTemplates, setMetaTemplates] = useState([]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await FollowUpConfigService.listar();
      data.sort((a, b) => a.id.localeCompare(b.id));
      setRows(data);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar mensajes', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMetaTemplates({ activo: true });
        setMetaTemplates(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter(r => {
      const tpl = metaTemplates.find(t => t._id === r.templateId);
      const tplName = tpl?.displayName || '';
      return (
        r.id.toLowerCase().includes(qq) ||
        (r.mensaje || '').toLowerCase().includes(qq) ||
        (r.proxEvent || '').toLowerCase().includes(qq) ||
        (r.tipo || '').toLowerCase().includes(qq) ||
        (r.promt_assistant || '').toLowerCase().includes(qq) ||
        tplName.toLowerCase().includes(qq)
      );
    });
  }, [rows, q, metaTemplates]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      id: row.id,
      mensaje: row.mensaje ?? '',
      proxEvent: row.proxEvent ?? '',
      tiempo: Number(row.tiempo ?? 0),
      tipo: row.tipo ?? 'mensaje',
      promt_assistant: row.promt_assistant ?? '',
      respetar_horario: Boolean(row.respetar_horario),
      templateId: row.templateId ?? '',
      parameterValues: (row.parameterValues && typeof row.parameterValues === 'object') ? { ...row.parameterValues } : {},
      buttons: Array.isArray(row.buttons) ? row.buttons.map(b => ({ body: b.body ?? '', id: b.id ?? '' })) : [],
    });
    setOpenForm(true);
  };

  const selectedTemplate = useMemo(
    () => metaTemplates.find(t => t._id === form.templateId) || null,
    [metaTemplates, form.templateId]
  );

  const allParameters = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.components?.flatMap((comp, ci) =>
      (comp.parameters || []).map((param, pi) => ({
        ...param,
        key: `${comp.type}_${pi}_${param.name}`,
      }))
    ) || [];
  }, [selectedTemplate]);

  const validate = () => {
    if (!form.id || !/^[a-z0-9_\-]+$/i.test(form.id)) {
      return 'El ID es requerido (usa letras/números/guiones/guion_bajo).';
    }
    if (form.tipo === 'mensaje' && !form.mensaje?.trim() && !form.templateId) {
      return 'Indicá un mensaje de texto o seleccioná un template de Meta.';
    }
    if (Number.isNaN(Number(form.tiempo))) return '"tiempo" debe ser numérico.';
    if (form.buttons?.length > 3) return 'Máximo 3 botones.';
    const invalidBtn = form.buttons?.find(b => !b.body?.trim() || !b.id?.trim());
    if (invalidBtn) return 'Cada botón debe tener texto e ID.';
    return null;
  };

  const addButton = () => {
    if ((form.buttons?.length ?? 0) >= 3) return;
    setForm({ ...form, buttons: [...(form.buttons || []), { body: '', id: '' }] });
  };

  const removeButton = (idx) => {
    setForm({ ...form, buttons: form.buttons.filter((_, i) => i !== idx) });
  };

  const updateButton = (idx, field, value) => {
    const next = [...(form.buttons || [])];
    next[idx] = { ...next[idx], [field]: value };
    setForm({ ...form, buttons: next });
  };

  const handleSelectTemplate = (e) => {
    const tplId = e.target.value;
    const tpl = metaTemplates.find(t => t._id === tplId);
    const prefilled = {};
    if (tpl) {
      tpl.components?.forEach(comp => {
        (comp.parameters || []).forEach(param => {
          prefilled[param.name] = param.example || '';
        });
      });
    }
    setForm({ ...form, templateId: tplId, parameterValues: prefilled });
  };

  const handleParamChange = (paramName) => (e) => {
    setForm(prev => ({ ...prev, parameterValues: { ...prev.parameterValues, [paramName]: e.target.value } }));
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setAlert({ open: true, message: err, severity: 'warning' });
      return;
    }
    try {
      const validButtons = (form.buttons || []).filter(b => b.body?.trim() && b.id?.trim()).slice(0, 3);
      const payload = {
        mensaje: form.mensaje || '',
        proxEvent: form.proxEvent || '',
        tiempo: Number(form.tiempo) || 0,
        tipo: form.tipo || 'mensaje',
        promt_assistant: form.promt_assistant || '',
        respetar_horario: Boolean(form.respetar_horario),
        templateId: form.templateId || '',
        parameterValues: form.templateId ? (form.parameterValues || {}) : {},
        buttons: validButtons.map(b => ({ body: b.body.trim().substring(0, 20), id: b.id.trim() })),
      };
      if (isEdit) {
        await FollowUpConfigService.actualizar(form.id, payload);
      } else {
        await FollowUpConfigService.crear({ id: form.id, ...payload });
      }
      setAlert({
        open: true,
        message: isEdit ? 'Mensaje actualizado' : 'Mensaje creado',
        severity: 'success'
      });
      setOpenForm(false);
      await fetchRows();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error guardando el mensaje', severity: 'error' });
    }
  };

  const confirmDelete = (id) => {
    setToDelete(id);
    setOpenDelete(true);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await FollowUpConfigService.eliminar(toDelete);
      setAlert({ open: true, message: 'Mensaje eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);
      await fetchRows();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando', severity: 'error' });
    }
  };

  const existingIds = useMemo(() => rows.map(r => r.id), [rows]);

  return (
    <>
      <Head><title>Mensajes (Plantillas)</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4">Mensajes (Firestore)</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Nuevo mensaje
              </Button>
            </Stack>

            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por ID / texto / tipo / proxEvent…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              }}
            />

            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID (doc)</TableCell>
                    <TableCell>Mensaje</TableCell>
                    <TableCell>proxEvent</TableCell>
                    <TableCell>tiempo (min)</TableCell>
                    <TableCell>tipo</TableCell>
                    <TableCell>IA Promt</TableCell>
                    <TableCell>Resp. horario</TableCell>
                    <TableCell>Template</TableCell>
                    <TableCell>Botones</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Tooltip title={row.mensaje || ''}>
                          <Typography variant="body2" noWrap>
                            {row.mensaje || <em>(vacío)</em>}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{row.proxEvent || <em>(—)</em>}</TableCell>
                      <TableCell>{typeof row.tiempo === 'number' ? row.tiempo : (row.tiempo ?? '')}</TableCell>
                      <TableCell>
                        <Chip size="small" label={row.tipo || 'mensaje'} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Tooltip title={row.promt_assistant || ''}>
                          <Typography variant="body2" noWrap>
                            {row.promt_assistant || <em>(—)</em>}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.respetar_horario ? 'Sí' : 'No'}
                          color={row.respetar_horario ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {row.templateId
                          ? (() => {
                              const tpl = metaTemplates.find(t => t._id === row.templateId);
                              return tpl ? <Chip size="small" label={tpl.displayName} variant="outlined" /> : row.templateId;
                            })()
                          : <em>—</em>}
                      </TableCell>
                      <TableCell>
                        {row.buttons?.length >= 1 && row.buttons?.length <= 3
                          ? <Chip size="small" label={`${row.buttons.length} botón${row.buttons.length > 1 ? 'es' : ''}`} variant="outlined" />
                          : <em>—</em>}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => handleOpenEdit(row)} aria-label="Editar">
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => confirmDelete(row.id)} aria-label="Eliminar">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <Typography variant="body2">Sin resultados.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>

        <Snackbar open={alert.open} autoHideDuration={3500} onClose={closeAlert}>
          <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Crear / Editar */}
        <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
          <DialogTitle>{isEdit ? 'Editar mensaje' : 'Nuevo mensaje'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="ID del documento"
                value={form.id}
                disabled={isEdit}
                onChange={(e) => setForm({ ...form, id: e.target.value.trim() })}
                helperText={isEdit ? 'No se puede cambiar el ID en edición' : 'Ejemplo: nuevo_contacto, recontacto'}
              />
              <TextField
                label="mensaje (texto libre)"
                multiline
                minRows={3}
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                helperText="Opcional si usás un template de Meta"
              />

              <FormControl fullWidth size="small">
                <InputLabel id="template-label">Template de Meta (opcional)</InputLabel>
                <Select
                  labelId="template-label"
                  label="Template de Meta (opcional)"
                  value={form.templateId}
                  onChange={handleSelectTemplate}
                  displayEmpty
                >
                  <MenuItem value=""><em>— Sin template —</em></MenuItem>
                  {metaTemplates.map(t => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.displayName}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Templates aprobados por Meta. Pueden incluir botones.
                </Typography>
              </FormControl>

              {!form.templateId && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Botones (opcional, máx. 3)</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Solo para mensaje de texto. Máx. 20 caracteres por botón.
                  </Typography>
                  {(form.buttons || []).map((btn, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField
                        size="small"
                        label="Texto"
                        value={btn.body}
                        onChange={(e) => updateButton(idx, 'body', e.target.value)}
                        placeholder="Ej: Agendar demo"
                        inputProps={{ maxLength: 20 }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="ID"
                        value={btn.id}
                        onChange={(e) => updateButton(idx, 'id', e.target.value)}
                        placeholder="Ej: agendar_demo"
                        sx={{ flex: 1 }}
                      />
                      <IconButton size="small" color="error" onClick={() => removeButton(idx)} aria-label="Quitar botón">
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={addButton} disabled={(form.buttons?.length ?? 0) >= 3}>
                    Agregar botón
                  </Button>
                </Box>
              )}

              {selectedTemplate && allParameters.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }} fontWeight={600}>
                    Parámetros del template
                  </Typography>
                  <Stack spacing={1.5}>
                    {allParameters.map((param) => (
                      <TextField
                        key={param.key}
                        label={param.name}
                        value={form.parameterValues?.[param.name] ?? ''}
                        onChange={handleParamChange(param.name)}
                        size="small"
                        fullWidth
                        placeholder={param.example}
                        helperText={param.example ? `Ej: ${param.example}` : null}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <FormControl>
                <InputLabel id="proxEvent-label">proxEvent (opcional)</InputLabel>
                <Select
                  labelId="proxEvent-label"
                  label="proxEvent (opcional)"
                  value={existingIds.includes(form.proxEvent) ? form.proxEvent : ''}
                  onChange={(e) => setForm({ ...form, proxEvent: e.target.value })}
                  displayEmpty
                >
                  <MenuItem value=""><em>(sin proxEvent)</em></MenuItem>
                  {existingIds.filter(id => id !== form.id).map(id => (
                    <MenuItem key={id} value={id}>{id}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="tiempo (minutos)"
                type="number"
                value={form.tiempo}
                onChange={(e) => setForm({ ...form, tiempo: e.target.value })}
              />

              <FormControl>
                <InputLabel id="tipo-label">tipo</InputLabel>
                <Select
                  labelId="tipo-label"
                  label="tipo"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <MenuItem value="mensaje">mensaje</MenuItem>
                  <MenuItem value="funcion">funcion</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="IA Promt"
                placeholder="p. ej.: Escribí como asesor cordial, retoma la conversación, pedí disponibilidad…"
                multiline
                minRows={2}
                value={form.promt_assistant}
                onChange={(e) => setForm({ ...form, promt_assistant: e.target.value })}
                helperText="Se guarda como promt_assistant y lo usará la función del asistente."
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(form.respetar_horario)}
                    onChange={(e) => setForm({ ...form, respetar_horario: e.target.checked })}
                  />
                }
                label="Respetar horario de trabajo"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="contained" onClick={save}>
              {isEdit ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Eliminar */}
        <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
          <DialogTitle>Eliminar mensaje</DialogTitle>
          <DialogContent>¿Seguro que querés eliminar <strong>{toDelete}</strong>?</DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={remove}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

FollowUpConfig.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default FollowUpConfig;
