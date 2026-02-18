import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Paper, Divider, Switch, FormControlLabel,
  Tooltip, Chip, Alert, Autocomplete, Grid, Accordion, AccordionSummary,
  AccordionDetails, useMediaQuery, useTheme, Avatar,
} from '@mui/material';
import profileService from 'src/services/profileService';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import BlockEditorDialog from './BlockEditorDialog';
import ReportView from './ReportView';

const BLOCK_TYPE_LABELS = {
  metric_cards: 'Tarjetas de Metricas',
  summary_table: 'Tabla Resumen',
  movements_table: 'Tabla de Movimientos',
  budget_vs_actual: 'Presupuesto vs Real',
  chart: 'Gráfico',
};

const FILTRO_FIELDS = [
  { key: 'fecha', label: 'Rango de fechas' },
  { key: 'proyectos', label: 'Proyectos' },
  { key: 'tipo', label: 'Tipo (egreso/ingreso)' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'etapas', label: 'Etapas' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'medio_pago', label: 'Medio de pago' },
  { key: 'moneda_movimiento', label: 'Moneda del movimiento' },
  { key: 'moneda_equivalente', label: 'Selector de moneda equivalente' },
];

/**
 * Editor de reporte estilo DataStudio:
 * Panel izquierdo = configuracion, panel derecho = preview en vivo
 */
const ReportEditor = ({
  report,
  onSave,
  onCancel,
  saving = false,
  movimientos = [],
  presupuestos = [],
  displayCurrencies = ['ARS'],
  cotizaciones = null,
  empresaId = null,
  proyectos = [],
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [config, setConfig] = useState(() => ({
    nombre: report.nombre || '',
    descripcion: report.descripcion || '',
    display_currency: report.display_currency || 'ARS',
    datasets: report.datasets || { movimientos: true, presupuestos: false },
    filtros_schema: report.filtros_schema || {},
    layout: report.layout || [],
    status: report.status || 'draft',
    permisos: report.permisos || { usuarios: [], publico: false, link_token: null },
  }));

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingBlockIdx, setEditingBlockIdx] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Usuarios de la empresa para autocomplete de permisos
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  useEffect(() => {
    if (!empresaId) return;
    profileService.getProfileByEmpresa(empresaId)
      .then((data) => setUsuariosEmpresa(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error cargando usuarios:', err));
  }, [empresaId]);

  // Live preview config
  const liveConfig = useMemo(() => ({
    ...report,
    ...config,
  }), [report, config]);

  const liveCurrencies = useMemo(() => {
    const eq = config.filtros_schema?.moneda_equivalente;
    if (eq?.default_values?.length > 0) return eq.default_values;
    return [config.display_currency || 'ARS'];
  }, [config]);

  // Config general
  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Permisos
  const updatePermisos = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      permisos: { ...prev.permisos, [field]: value },
    }));
  };

  const handleTogglePublico = (checked) => {
    setConfig((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        publico: checked,
        link_token: checked && !prev.permisos?.link_token
          ? Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 6)
          : prev.permisos?.link_token,
      },
    }));
  };

  const handleCopyLink = () => {
    const token = config.permisos?.link_token;
    if (token && typeof window !== 'undefined') {
      const url = window.location.origin + '/reportes/public/' + token;
      navigator.clipboard.writeText(url).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  };

  // Filtros
  const toggleFiltro = (key, enabled) => {
    setConfig((prev) => {
      const fs = { ...prev.filtros_schema };
      if (key === 'fecha' || key === 'proyectos' || key === 'tipo') {
        fs[key] = { ...fs[key], enabled };
      } else {
        fs[key] = { ...(fs[key] || {}), enabled };
      }
      return { ...prev, filtros_schema: fs };
    });
  };

  const isFiltroEnabled = (key) => {
    return config.filtros_schema?.[key]?.enabled !== false;
  };

  // Layout / Bloques
  const addBlock = (block) => {
    setConfig((prev) => ({ ...prev, layout: [...prev.layout, block] }));
  };

  const updateBlock = (idx, block) => {
    setConfig((prev) => {
      const layout = [...prev.layout];
      layout[idx] = block;
      return { ...prev, layout };
    });
  };

  const removeBlock = (idx) => {
    setConfig((prev) => ({
      ...prev,
      layout: prev.layout.filter((_, i) => i !== idx),
    }));
  };

  const moveBlock = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= config.layout.length) return;
    setConfig((prev) => {
      const layout = [...prev.layout];
      [layout[idx], layout[newIdx]] = [layout[newIdx], layout[idx]];
      return { ...prev, layout };
    });
  };

  const duplicateBlock = (idx) => {
    const original = config.layout[idx];
    const copy = JSON.parse(JSON.stringify(original));
    copy.titulo = (copy.titulo || 'Bloque') + ' (copia)';
    setConfig((prev) => {
      const layout = [...prev.layout];
      layout.splice(idx + 1, 0, copy);
      return { ...prev, layout };
    });
  };

  const handleOpenAdd = () => {
    setEditingBlockIdx(null);
    setBlockDialogOpen(true);
  };

  const handleOpenEdit = (idx) => {
    setEditingBlockIdx(idx);
    setBlockDialogOpen(true);
  };

  const handleBlockSave = (block) => {
    if (editingBlockIdx !== null) {
      updateBlock(editingBlockIdx, block);
    } else {
      addBlock(block);
    }
  };

  const handleSave = () => {
    onSave({ ...report, ...config });
  };

  const blockSummary = (block) => {
    const spanLabel = block.col_span && block.col_span !== 12
      ? ` · ${Math.round(block.col_span / 12 * 100)}% ancho`
      : '';
    let detail;
    switch (block.type) {
      case 'metric_cards':
        detail = (block.metricas?.length || 0) + ' metricas';
        break;
      case 'summary_table':
        detail = 'Agrupado por ' + (block.agrupar_por || '?') + ' - ' + (block.columnas?.length || 0) + ' col';
        break;
      case 'movements_table':
        detail = (block.columnas_visibles?.length || 7) + ' col - ' + (block.page_size || 25) + '/pag';
        break;
      case 'budget_vs_actual':
        detail = 'Tipo: ' + (block.mostrar_tipo || 'egreso') + ' · Por: ' + (block.agrupar_por || 'categoria');
        break;
      case 'chart':
        detail = (block.chart_type || 'bar') + ' · Por ' + (block.agrupar_por || 'categoria');
        break;
      default:
        detail = '';
    }
    return detail + spanLabel;
  };

  // Config Panel
  const configPanel = (
    <Stack spacing={1.5} sx={{ height: '100%', overflow: 'auto', pr: 0.5 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Configuracion
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!config.nombre.trim() || saving}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Stack>

      {/* General */}
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={600}>General</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={config.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              fullWidth
              size="small"
              required
            />
            <Stack direction="row" spacing={1}>
              <Autocomplete
                multiple
                size="small"
                options={['ARS', 'USD', 'CAC']}
                value={
                  config.filtros_schema?.moneda_equivalente?.default_values?.length > 0
                    ? config.filtros_schema.moneda_equivalente.default_values
                    : [config.display_currency || 'ARS']
                }
                onChange={(_, val) => {
                  if (!val || val.length === 0) return;
                  updateField('display_currency', val[0]);
                  setConfig((prev) => ({
                    ...prev,
                    display_currency: val[0],
                    filtros_schema: {
                      ...prev.filtros_schema,
                      moneda_equivalente: {
                        ...(prev.filtros_schema?.moneda_equivalente || {}),
                        enabled: true,
                        default_values: val,
                      },
                    },
                  }));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="Monedas" />}
                sx={{ flex: 1 }}
                disableClearable
              />
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={config.status}
                  label="Estado"
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  <MenuItem value="draft">Borrador</MenuItem>
                  <MenuItem value="published">Publicado</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Descripcion"
              value={config.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.datasets?.presupuestos || false}
                  onChange={(e) =>
                    updateField('datasets', { ...config.datasets, presupuestos: e.target.checked })
                  }
                />
              }
              label={<Typography variant="body2">Incluir Presupuestos de Control</Typography>}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Filtros */}
      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={600}>Filtros disponibles</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {FILTRO_FIELDS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                size="small"
                color={isFiltroEnabled(f.key) ? 'primary' : 'default'}
                variant={isFiltroEnabled(f.key) ? 'filled' : 'outlined'}
                onClick={() => toggleFiltro(f.key, !isFiltroEnabled(f.key))}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>

          {/* Proyectos fijos */}
          <Divider sx={{ my: 1.5 }} />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.filtros_schema?.proyectos?.fijos || false}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    filtros_schema: {
                      ...prev.filtros_schema,
                      proyectos: {
                        ...(prev.filtros_schema?.proyectos || {}),
                        fijos: e.target.checked,
                        enabled: e.target.checked ? false : (prev.filtros_schema?.proyectos?.enabled ?? true),
                      },
                    },
                  }));
                }}
              />
            }
            label={
              <Stack>
                <Typography variant="body2">Fijar proyectos</Typography>
                <Typography variant="caption" color="text.secondary">
                  El usuario no podr\u00e1 cambiar los proyectos del reporte
                </Typography>
              </Stack>
            }
          />
          {config.filtros_schema?.proyectos?.fijos && (
            <Autocomplete
              multiple
              size="small"
              options={proyectos}
              getOptionLabel={(opt) => {
                if (typeof opt === 'string') {
                  const found = proyectos.find((p) => p.id === opt);
                  return found ? (found.nombre || found.proyecto || found.id) : opt;
                }
                return opt.nombre || opt.proyecto || opt.id;
              }}
              value={
                (config.filtros_schema?.proyectos?.proyecto_ids || []).map((id) =>
                  proyectos.find((p) => p.id === id) || id
                )
              }
              onChange={(_, val) => {
                const ids = val.map((v) => (typeof v === 'string' ? v : v.id));
                setConfig((prev) => ({
                  ...prev,
                  filtros_schema: {
                    ...prev.filtros_schema,
                    proyectos: {
                      ...(prev.filtros_schema?.proyectos || {}),
                      fijos: true,
                      proyecto_ids: ids,
                    },
                  },
                }));
              }}
              isOptionEqualToValue={(opt, val) => (opt?.id || opt) === (val?.id || val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option?.id || option}
                    label={typeof option === 'string' ? option : (option.nombre || option.proyecto || option.id)}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proyectos del reporte"
                  placeholder="Buscar proyecto..."
                />
              )}
              sx={{ mt: 1 }}
            />
          )}
        </AccordionDetails>
      </Accordion>

      {/* Permisos */}
      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={600}>Permisos de acceso</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Autocomplete
              multiple
              size="small"
              options={usuariosEmpresa}
              getOptionLabel={(opt) => {
                if (typeof opt === 'string') return opt;
                const nombre = `${opt.firstName || opt.nombre || ''} ${opt.lastName || opt.apellido || ''}`.trim();
                return nombre ? `${nombre} (${opt.email || ''})` : (opt.email || opt.id || '');
              }}
              value={usuariosEmpresa.filter((u) =>
                (config.permisos?.usuarios || []).includes(u.id)
              )}
              onChange={(_, val) => {
                const ids = val.map((v) => (typeof v === 'string' ? v : v.id));
                updatePermisos('usuarios', ids);
              }}
              isOptionEqualToValue={(opt, val) => opt.id === (val?.id || val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const nombre = typeof option === 'string'
                    ? option
                    : `${option.firstName || option.nombre || ''} ${option.lastName || option.apellido || ''}`.trim() || option.email;
                  return (
                    <Chip
                      key={option.id || option}
                      label={nombre}
                      size="small"
                      avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>{(nombre[0] || '?').toUpperCase()}</Avatar>}
                      {...getTagProps({ index })}
                    />
                  );
                })
              }
              renderOption={(props, option) => {
                const nombre = `${option.firstName || option.nombre || ''} ${option.lastName || option.apellido || ''}`.trim();
                return (
                  <li {...props} key={option.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {(nombre[0] || option.email?.[0] || '?').toUpperCase()}
                      </Avatar>
                      <Stack spacing={-0.5}>
                        <Typography variant="body2">{nombre || 'Sin nombre'}</Typography>
                        <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                      </Stack>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Usuarios con acceso"
                  placeholder="Buscar usuario..."
                  helperText="Vacío = todos los de la empresa"
                />
              )}
            />
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.permisos?.publico || false}
                  onChange={(e) => handleTogglePublico(e.target.checked)}
                />
              }
              label={
                <Stack>
                  <Typography variant="body2">Acceso publico</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Compartir con clientes/terceros sin login
                  </Typography>
                </Stack>
              }
            />
            {config.permisos?.publico && config.permisos?.link_token && (
              <Alert
                severity="info"
                icon={<LinkIcon fontSize="small" />}
                action={
                  <Tooltip title={linkCopied ? 'Copiado!' : 'Copiar link'}>
                    <IconButton size="small" onClick={handleCopyLink}>
                      <ContentCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/reportes/public/{config.permisos.link_token}
                </Typography>
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bloques */}
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%', pr: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
              Bloques ({config.layout.length})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={(e) => { e.stopPropagation(); handleOpenAdd(); }}
              sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
            >
              Agregar
            </Button>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1 }}>
          {config.layout.length === 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Sin bloques. Agrega uno para empezar.
            </Alert>
          )}
          <Stack spacing={1}>
            {config.layout.map((block, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                }}
              >
                <Stack spacing={-0.5}>
                  <IconButton size="small" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>
                    <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveBlock(idx, 1)} disabled={idx === config.layout.length - 1}>
                    <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                    <Typography variant="caption" fontWeight={600} noWrap>
                      {block.titulo || BLOCK_TYPE_LABELS[block.type] || block.type}
                    </Typography>
                    <Chip
                      label={BLOCK_TYPE_LABELS[block.type] || block.type}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                    {blockSummary(block)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={-0.5}>
                  <IconButton size="small" onClick={() => handleOpenEdit(idx)}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => duplicateBlock(idx)}>
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => removeBlock(idx)}>
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );

  // Preview Panel
  const previewPanel = (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Paper
        variant="outlined"
        sx={{ p: 2, minHeight: 300, bgcolor: 'background.default', borderStyle: 'dashed' }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Vista previa en vivo
          </Typography>
          <Chip label={liveCurrencies.join(' / ')} size="small" variant="outlined" color="primary" />
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {movimientos.length === 0 ? (
          <Alert severity="info">
            No hay datos cargados para la preview. Guarda y volve al reporte para ver con datos reales.
          </Alert>
        ) : (
          <ReportView
            reportConfig={liveConfig}
            movimientos={movimientos}
            presupuestos={presupuestos}
            displayCurrencies={liveCurrencies}
            cotizaciones={cotizaciones}
          />
        )}
      </Paper>
    </Box>
  );

  // Render
  return (
    <Box>
      {isMdUp ? (
        <Grid container spacing={2} sx={{ minHeight: 'calc(100vh - 130px)' }}>
          <Grid item md={5} lg={4} sx={{ maxHeight: 'calc(100vh - 130px)', overflow: 'auto' }}>
            {configPanel}
          </Grid>
          <Grid item md={7} lg={8} sx={{ maxHeight: 'calc(100vh - 130px)', overflow: 'auto' }}>
            {previewPanel}
          </Grid>
        </Grid>
      ) : (
        <Stack spacing={2}>
          {configPanel}
          {previewPanel}
        </Stack>
      )}

      <BlockEditorDialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        onSave={handleBlockSave}
        initialBlock={editingBlockIdx !== null ? config.layout[editingBlockIdx] : null}
      />
    </Box>
  );
};

export default ReportEditor;
