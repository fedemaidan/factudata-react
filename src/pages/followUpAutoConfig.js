import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Alert, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography, Switch, MenuItem, Select, FormControl, InputLabel,
  FormControlLabel, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import FollowUpAutoService from 'src/services/followUpAutoService';

const ESTADOS_REUNION = ['agendada', 'realizada', 'no_show', 'cancelada'];
const CALIFICACIONES = ['frio', 'tibio', 'caliente', 'listo_para_cerrar'];
const FECHA_REF_OPTIONS = [
  { value: 'ultimo_mensaje', label: 'Último mensaje' },
  { value: 'fecha_reunion', label: 'Fecha reunión' },
  { value: 'previo_reunion', label: 'Previo reunión' },
  { value: 'link_agendar', label: 'Link agendar' },
];

const formatIntervalos = (arr) => {
  if (!arr?.length) return '—';
  return arr.map(n => {
    if (n < 60) return `${n}m`;
    if (n < 1440) return `${(n/60).toFixed(0)}h`;
    if (n < 10080) return `${(n/1440).toFixed(0)}d`;
    return `${(n/10080).toFixed(0)}sem`;
  }).join(', ');
};

const EMPTY_CONFIG = {
  nombre: '',
  orden: 1,
  activo: true,
  intervalosMin: '10, 60, 1440',
  fechaReferenciaBase: 'ultimo_mensaje',
  segmentoFiltro: 'todos',
  clienteFiltro: 'excluir_clientes',
  requiereReunion: '',
  estadoReunion: '',
  calificacionReunion: '',
  respetar_horario: true,
  prompt: '',
};

const Page = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [form, setForm] = useState(EMPTY_CONFIG);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const cargarConfigs = async () => {
    try {
      setLoading(true);
      const data = await FollowUpAutoService.listarConfigs();
      setConfigs(data);
    } catch (err) {
      setSnack({ open: true, message: 'Error cargando configs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarConfigs(); }, []);

  const handleOpen = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setForm({
        nombre: config.nombre || '',
        orden: config.orden ?? 1,
        activo: config.activo !== false,
        intervalosMin: (config.intervalosMin || []).join(', '),
        fechaReferenciaBase: config.fechaReferenciaBase || 'ultimo_mensaje',
        segmentoFiltro: config.segmentoFiltro || 'todos',
        clienteFiltro: config.clienteFiltro || 'excluir_clientes',
        requiereReunion: config.requiereReunion == null ? '' : String(config.requiereReunion),
        estadoReunion: config.estadoReunion || '',
        calificacionReunion: config.calificacionReunion || '',
        respetar_horario: config.respetar_horario !== false,
        prompt: config.prompt || '',
      });
    } else {
      setEditingConfig(null);
      setForm({ ...EMPTY_CONFIG, orden: configs.length + 1 });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingConfig(null);
  };

  const handleSave = async () => {
    try {
      const intervalosArr = form.intervalosMin
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0);

      if (!form.nombre || !form.prompt || !intervalosArr.length) {
        setSnack({ open: true, message: 'Completá nombre, intervalos y prompt', severity: 'warning' });
        return;
      }

      const data = {
        nombre: form.nombre,
        orden: Number(form.orden) || 1,
        activo: form.activo,
        intervalosMin: intervalosArr,
        fechaReferenciaBase: form.fechaReferenciaBase,
        segmentoFiltro: form.segmentoFiltro,
        clienteFiltro: form.clienteFiltro,
        requiereReunion: form.requiereReunion === '' ? null : form.requiereReunion === 'true',
        estadoReunion: form.estadoReunion || null,
        calificacionReunion: form.calificacionReunion || null,
        respetar_horario: form.respetar_horario,
        prompt: form.prompt,
      };

      if (editingConfig) {
        await FollowUpAutoService.actualizarConfig(editingConfig._id, data);
        setSnack({ open: true, message: 'Config actualizada', severity: 'success' });
      } else {
        await FollowUpAutoService.crearConfig(data);
        setSnack({ open: true, message: 'Config creada', severity: 'success' });
      }

      handleClose();
      cargarConfigs();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Error guardando', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta config?')) return;
    try {
      await FollowUpAutoService.eliminarConfig(id);
      setSnack({ open: true, message: 'Config eliminada', severity: 'success' });
      cargarConfigs();
    } catch (err) {
      setSnack({ open: true, message: 'Error eliminando', severity: 'error' });
    }
  };

  return (
    <>
      <Head><title>Follow-Up Automático | Config</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h4">Follow-Up Automático — Configuración</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Nueva config
            </Button>
          </Stack>

          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Intervalos</TableCell>
                  <TableCell>Ref. Base</TableCell>
                  <TableCell>Reunión</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((c) => (
                  <TableRow key={c._id} hover sx={{ cursor: 'pointer' }} onClick={() => handleOpen(c)}>
                    <TableCell>{c.orden}</TableCell>
                    <TableCell>{c.nombre}</TableCell>
                    <TableCell>{formatIntervalos(c.intervalosMin)}</TableCell>
                    <TableCell>
                      <Chip
                        label={FECHA_REF_OPTIONS.find(o => o.value === c.fechaReferenciaBase)?.label || c.fechaReferenciaBase}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {c.estadoReunion
                        ? `${c.estadoReunion}${c.calificacionReunion ? `/${c.calificacionReunion}` : ''}`
                        : c.requiereReunion === false ? 'Sin reunión' : '—'}
                    </TableCell>
                    <TableCell>{c.activo ? '✅' : '❌'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => handleOpen(c)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(c._id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && configs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Sin configs. Creá una nueva.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Container>
      </Box>

      {/* ── Dialog para crear/editar ── */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingConfig ? 'Editar config' : 'Nueva config'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="Nombre" fullWidth value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              <TextField label="Orden" type="number" sx={{ width: 100 }} value={form.orden} onChange={e => setForm({ ...form, orden: e.target.value })} />
            </Stack>

            <TextField
              label="Intervalos (minutos, separados por coma)"
              fullWidth
              value={form.intervalosMin}
              onChange={e => setForm({ ...form, intervalosMin: e.target.value })}
              helperText="Ej: 10, 60, 1440, 4320 → 10min, 1h, 24h, 72h"
            />

            <FormControl fullWidth>
              <InputLabel>Referencia de fecha</InputLabel>
              <Select
                label="Referencia de fecha"
                value={form.fechaReferenciaBase}
                onChange={e => setForm({ ...form, fechaReferenciaBase: e.target.value })}
              >
                {FECHA_REF_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Segmento</InputLabel>
                <Select
                  label="Segmento"
                  value={form.segmentoFiltro}
                  onChange={e => setForm({ ...form, segmentoFiltro: e.target.value })}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="inbound">Solo inbound</MenuItem>
                  <MenuItem value="outbound">Solo outbound</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel>Clientes</InputLabel>
                <Select
                  label="Clientes"
                  value={form.clienteFiltro}
                  onChange={e => setForm({ ...form, clienteFiltro: e.target.value })}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="excluir_clientes">Excluir clientes</MenuItem>
                  <MenuItem value="solo_clientes">Solo clientes</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />}
                label="Activo"
              />
              <FormControlLabel
                control={<Switch checked={form.respetar_horario} onChange={e => setForm({ ...form, respetar_horario: e.target.checked })} />}
                label="Respetar horario"
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Requiere reunión</InputLabel>
                <Select
                  label="Requiere reunión"
                  value={form.requiereReunion}
                  onChange={e => setForm({ ...form, requiereReunion: e.target.value })}
                >
                  <MenuItem value="">No importa</MenuItem>
                  <MenuItem value="true">Sí</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Estado reunión</InputLabel>
                <Select
                  label="Estado reunión"
                  value={form.estadoReunion}
                  onChange={e => setForm({ ...form, estadoReunion: e.target.value })}
                >
                  <MenuItem value="">No importa</MenuItem>
                  {ESTADOS_REUNION.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Calificación</InputLabel>
                <Select
                  label="Calificación"
                  value={form.calificacionReunion}
                  onChange={e => setForm({ ...form, calificacionReunion: e.target.value })}
                >
                  <MenuItem value="">No importa</MenuItem>
                  {CALIFICACIONES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Prompt (instrucción para la IA)"
              fullWidth
              multiline
              rows={5}
              value={form.prompt}
              onChange={e => setForm({ ...form, prompt: e.target.value })}
              helperText="Se combina con el prompt global de Sorby. Escribí la instrucción específica para este follow-up."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingConfig ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
