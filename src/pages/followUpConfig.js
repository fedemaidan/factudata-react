import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Alert, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TableSortLabel, TextField, Tooltip, Typography, MenuItem, Select, InputLabel, FormControl,
  Checkbox, FormControlLabel, Divider, FormHelperText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InputAdornment from '@mui/material/InputAdornment';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import FollowUpConfigService from 'src/services/followUpConfigService';
import { fetchMetaTemplates } from 'src/services/metaTemplateService';

const PLACEHOLDERS = [
  { key: 'nombre', label: 'Nombre completo', ejemplo: 'Juan Pérez' },
  { key: 'primer_nombre', label: 'Primer nombre', ejemplo: 'Juan' },
  { key: 'phone', label: 'Teléfono', ejemplo: '5491112345678' },
  { key: 'email', label: 'Email', ejemplo: 'juan@empresa.com' },
  { key: 'empresa', label: 'Empresa', ejemplo: 'Constructora ABC' },
  { key: 'cargo', label: 'Cargo', ejemplo: 'Jefe de obra' },
  { key: 'rubro', label: 'Rubro', ejemplo: 'Construcción' },
  { key: 'interes', label: 'Interés', ejemplo: 'probar' },
  { key: 'plan_estimado', label: 'Plan estimado', ejemplo: 'basico' },
  { key: 'sdr_nombre', label: 'SDR asignado', ejemplo: 'Martín' },
  { key: 'cantidad_obras', label: 'Cant. obras', ejemplo: '5' },
  { key: 'segmento', label: 'Segmento', ejemplo: 'inbound' },
];

const FLOWS_FRECUENTES = [
  'flowOnboardingConstructora',
  'flowOnboardingPymes',
  'flowInicioGeneral',
  'flowActivacionDirecta',
  'flowContratarServicio',
  'flowCargarObras',
  'flowOnboardingRol',
  'flowOnboardingInfo',
];

const formatTiempo = (min) => {
  const n = Number(min);
  if (!n || n <= 0) return '';
  if (n < 60) return `${n} min`;
  if (n < 1440) return `${(n / 60).toFixed(1).replace(/\.0$/, '')} hs`;
  return `${(n / 1440).toFixed(1).replace(/\.0$/, '')} días`;
};

const buildChain = (startId, allRows, maxDepth = 10) => {
  const chain = [];
  let currentId = startId;
  let depth = 0;
  while (currentId && depth < maxDepth) {
    const node = allRows.find(r => r.id === currentId);
    if (!node) { chain.push({ id: currentId, broken: true }); break; }
    chain.push({ id: node.id, tipo: node.tipo, tiempo: node.tiempo });
    if (node.proxEvent === currentId || !node.proxEvent) break;
    currentId = node.proxEvent;
    depth++;
  }
  return chain;
};

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
  flowDestino: '',
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

  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

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
    let result = rows;
    if (q) {
      const qq = q.toLowerCase();
      result = result.filter(r => {
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
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'tiempo':
          va = Number(a.tiempo) || 0;
          vb = Number(b.tiempo) || 0;
          return (va - vb) * dir;
        case 'buttons':
          va = a.buttons?.length || 0;
          vb = b.buttons?.length || 0;
          return (va - vb) * dir;
        default:
          va = String(a[sortBy] || '').toLowerCase();
          vb = String(b[sortBy] || '').toLowerCase();
          return va.localeCompare(vb) * dir;
      }
    });
    return result;
  }, [rows, q, metaTemplates, sortBy, sortDir]);

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
      buttons: Array.isArray(row.buttons) ? row.buttons.map(b => ({ body: b.body ?? '', id: b.id ?? '', followUpEvent: b.followUpEvent ?? '' })) : [],
      flowDestino: row.flowDestino ?? '',
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
    if (form.tipo === 'funcion' && !form.mensaje?.trim()) {
      return 'Seleccioná una función.';
    }
    if (Number.isNaN(Number(form.tiempo))) return '"tiempo" debe ser numérico.';
    if (form.buttons?.length > 3) return 'Máximo 3 botones.';
    const invalidBtn = form.buttons?.find(b => !b.body?.trim() || !b.id?.trim());
    if (invalidBtn) return 'Cada botón debe tener texto e ID.';
    return null;
  };

  const addButton = () => {
    if ((form.buttons?.length ?? 0) >= 3) return;
    setForm({ ...form, buttons: [...(form.buttons || []), { body: '', id: '', followUpEvent: '' }] });
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
        buttons: validButtons.map(b => ({
          body: b.body.trim().substring(0, 20),
          id: b.id.trim(),
          ...(b.followUpEvent ? { followUpEvent: b.followUpEvent } : {}),
        })),
        flowDestino: form.flowDestino || '',
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

            <Paper sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {[
                      { id: 'id', label: 'ID', sx: { minWidth: 140 } },
                      { id: 'mensaje', label: 'Mensaje', sx: { minWidth: 180, maxWidth: 260 } },
                      { id: 'proxEvent', label: 'proxEvent', sx: { minWidth: 120 } },
                      { id: 'tiempo', label: 'tiempo' },
                      { id: 'tipo', label: 'tipo' },
                      { id: 'templateId', label: 'Extras', sx: { minWidth: 80 } },
                    ].map(col => (
                      <TableCell key={col.id} sx={col.sx}>
                        <TableSortLabel
                          active={sortBy === col.id}
                          direction={sortBy === col.id ? sortDir : 'asc'}
                          onClick={() => handleSort(col.id)}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell sx={{ minWidth: 120 }}>Cadena</TableCell>
                    <TableCell align="right" sx={{ minWidth: 90 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => {
                    const chain = buildChain(row.id, rows);
                    const proxEventBroken = row.proxEvent && !rows.some(r => r.id === row.proxEvent);
                    const templateMissing = row.templateId && !metaTemplates.some(t => t._id === row.templateId);
                    const tpl = row.templateId ? metaTemplates.find(t => t._id === row.templateId) : null;
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap>{row.id}</Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          {row.tipo === 'funcion'
                            ? <Chip size="small" label={`fn: ${row.mensaje}`} color="secondary" variant="outlined" />
                            : (
                              <Tooltip title={row.mensaje || ''}>
                                <Typography variant="body2" noWrap>
                                  {row.mensaje || <em>(vacío)</em>}
                                </Typography>
                              </Tooltip>
                            )}
                        </TableCell>
                        <TableCell>
                          {row.proxEvent
                            ? proxEventBroken
                              ? <Chip size="small" icon={<WarningAmberIcon />} label={row.proxEvent} color="error" variant="outlined" />
                              : <Chip size="small" label={row.proxEvent} variant="outlined" />
                            : <em style={{ color: '#bbb' }}>—</em>}
                        </TableCell>
                        <TableCell>
                          {row.tiempo
                            ? <Tooltip title={`${row.tiempo} min`}><span>{formatTiempo(row.tiempo)}</span></Tooltip>
                            : <em style={{ color: '#bbb' }}>—</em>}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={row.tipo || 'mensaje'} color={row.tipo === 'funcion' ? 'secondary' : 'default'} />
                        </TableCell>
                        {/* Extras: íconos compactos para template, botones, flowDestino */}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {row.templateId && (
                              <Tooltip title={templateMissing ? `Template no encontrado: ${row.templateId}` : `Template: ${tpl?.displayName || row.templateId}`}>
                                <Chip
                                  size="small"
                                  label={templateMissing ? '⚠ tpl' : '📄 tpl'}
                                  color={templateMissing ? 'warning' : 'default'}
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 22 }}
                                />
                              </Tooltip>
                            )}
                            {row.buttons?.length >= 1 && (
                              <Tooltip title={row.buttons.map(b => b.body).join(', ')}>
                                <Chip size="small" label={`${row.buttons.length} btn`} variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                              </Tooltip>
                            )}
                            {row.flowDestino && (
                              <Tooltip title={`flowDestino: ${row.flowDestino}`}>
                                <Chip size="small" label={row.flowDestino === 'RESET' ? '🔄' : '🔀'} color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {chain.map((n, i) => (
                              <Box key={n.id} sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#bbb', fontSize: '0.65rem', minWidth: 10 }}
                                >
                                  {i === 0 ? '' : '↓'}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: n.id === row.id ? 700 : 400,
                                    color: n.broken ? '#d32f2f' : n.id === row.id ? 'primary.main' : 'text.secondary',
                                    fontSize: '0.7rem',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {n.id}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)} aria-label="Editar">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => confirmDelete(row.id)} aria-label="Eliminar">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
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
            <Stack spacing={2.5} sx={{ mt: 1 }}>

              {/* ── IDENTIDAD ── */}
              <Stack direction="row" spacing={2}>
                <TextField
                  label="ID del documento"
                  value={form.id}
                  disabled={isEdit}
                  onChange={(e) => setForm({ ...form, id: e.target.value.trim() })}
                  helperText={isEdit ? 'No editable' : 'Ej: nuevo_contacto'}
                  sx={{ flex: 2 }}
                  size="small"
                />
                <TextField
                  select
                  label="Tipo"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="mensaje">mensaje</MenuItem>
                  <MenuItem value="funcion">funcion</MenuItem>
                </TextField>
              </Stack>

              <Divider textAlign="left"><Chip label={form.tipo === 'funcion' ? 'Función' : 'Contenido'} size="small" /></Divider>

              {/* ── SECCIÓN CONDICIONAL POR TIPO ── */}
              {form.tipo === 'funcion' ? (
                <>
                  <TextField
                    select
                    label="Función"
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="fin">fin — terminar follow-up</MenuItem>
                    <MenuItem value="asistente">asistente — IA (Assistants API)</MenuItem>
                    <MenuItem value="asistente_ia">asistente_ia — IA con historial</MenuItem>
                  </TextField>
                  {(form.mensaje === 'asistente' || form.mensaje === 'asistente_ia') && (
                    <TextField
                      label="Prompt del asistente"
                      placeholder="Ej: Escribí como asesor, retomá la conversación…"
                      multiline
                      minRows={2}
                      value={form.promt_assistant}
                      onChange={(e) => setForm({ ...form, promt_assistant: e.target.value })}
                      size="small"
                    />
                  )}
                </>
              ) : (
                <>
                  {/* ─ Mensaje de texto ─ */}
                  <TextField
                    label="Mensaje (texto libre)"
                    multiline
                    minRows={3}
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    helperText="Opcional si usás un template. Soporta {{placeholders}}."
                    size="small"
                  />
                  {/* Placeholder chips — compactos */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Click para insertar placeholder:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                      {PLACEHOLDERS.map(p => (
                        <Tooltip key={p.key} title={`${p.label} — ej: ${p.ejemplo}`} arrow>
                          <Chip
                            size="small"
                            label={p.key}
                            variant="outlined"
                            onClick={() => setForm(prev => ({ ...prev, mensaje: (prev.mensaje || '') + `{{${p.key}}}` }))}
                            sx={{ cursor: 'pointer', fontSize: '0.7rem', height: 22 }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>

                  {/* ─ Template ─ */}
                  <TextField
                    select
                    label="Template de Meta"
                    value={form.templateId}
                    onChange={handleSelectTemplate}
                    size="small"
                    fullWidth
                    helperText="Opcional. Templates aprobados por Meta."
                  >
                    <MenuItem value="">— Sin template —</MenuItem>
                    {metaTemplates.map(t => (
                      <MenuItem key={t._id} value={t._id}>
                        {t.displayName}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Template preview */}
                  {selectedTemplate && (
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Vista previa del template
                      </Typography>
                      {selectedTemplate.components?.map((comp, ci) => (
                        <Typography key={ci} variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 0.5 }}>
                          {comp.text || comp.body_text || ''}
                        </Typography>
                      ))}
                    </Paper>
                  )}

                  {/* ─ Botones (solo texto, no template) ─ */}
                  {!form.templateId && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Botones (máx. 3)</Typography>
                      {(form.buttons || []).map((btn, idx) => (
                        <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <TextField
                            size="small"
                            label="Texto"
                            value={btn.body}
                            onChange={(e) => updateButton(idx, 'body', e.target.value)}
                            placeholder="Ej: Agendar reunión"
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
                          <TextField
                            select
                            size="small"
                            label="followUpEvent"
                            value={btn.followUpEvent || ''}
                            onChange={(e) => updateButton(idx, 'followUpEvent', e.target.value)}
                            sx={{ minWidth: 130 }}
                          >
                            <MenuItem value="">(ninguno)</MenuItem>
                            {existingIds.filter(id => id !== form.id).map(id => (
                              <MenuItem key={id} value={id}>{id}</MenuItem>
                            ))}
                          </TextField>
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

                  {/* ─ Parámetros del template ─ */}
                  {selectedTemplate && allParameters.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                        Parámetros del template
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Podés usar placeholders como valor (ej: {'{{primer_nombre}}'}).
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
                </>
              )}

              <Divider textAlign="left"><Chip label="Encadenamiento" size="small" /></Divider>

              {/* ── CAMPOS COMUNES ── */}
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="proxEvent"
                  value={existingIds.includes(form.proxEvent) ? form.proxEvent : ''}
                  onChange={(e) => setForm({ ...form, proxEvent: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                  helperText="Siguiente evento de la cadena"
                >
                  <MenuItem value="">(ninguno)</MenuItem>
                  {existingIds.filter(id => id !== form.id).map(id => (
                    <MenuItem key={id} value={id}>{id}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Tiempo (min)"
                  type="number"
                  value={form.tiempo}
                  onChange={(e) => setForm({ ...form, tiempo: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                  helperText={formatTiempo(form.tiempo) ? `≈ ${formatTiempo(form.tiempo)}` : 'Espera antes de enviar'}
                />
              </Stack>

              <TextField
                select
                label="flowDestino"
                value={form.flowDestino || ''}
                onChange={(e) => setForm({ ...form, flowDestino: e.target.value })}
                size="small"
                fullWidth
                helperText="Estado del bot post-envío. RESET limpia todo; un flow redirige al lead."
              >
                <MenuItem value="">(sin flowDestino)</MenuItem>
                <MenuItem value="RESET">RESET — Limpiar estado del bot</MenuItem>
                {FLOWS_FRECUENTES.map(f => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(form.respetar_horario)}
                    onChange={(e) => setForm({ ...form, respetar_horario: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Respetar horario de trabajo</Typography>}
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
          <DialogContent>
            <Typography>¿Seguro que querés eliminar <strong>{toDelete}</strong>?</Typography>
            {(() => {
              const dependents = rows.filter(r => r.proxEvent === toDelete && r.id !== toDelete);
              if (!dependents.length) return null;
              return (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    ¡Atención! Los siguientes mensajes apuntan a este como proxEvent:
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {dependents.map(d => <Chip key={d.id} size="small" label={d.id} color="warning" />)}
                  </Box>
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    Si lo eliminás, esos mensajes quedarán con un proxEvent roto.
                  </Typography>
                </Alert>
              );
            })()}
          </DialogContent>
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
