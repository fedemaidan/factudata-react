// pages/material-movimientos/index.jsx
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  Box, Container, Stack, Typography, Paper, Button, IconButton, Snackbar, Alert,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, useMediaQuery, FormControlLabel, Checkbox
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PreviewIcon from '@mui/icons-material/Preview';

import MovimientoMaterialService from 'src/services/movimientoMaterialService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { formatTimestamp } from 'src/utils/formatters';
import AssignToPlanDialog from 'src/components/planobra/AssignToPlanDialog';

// helper fechas → yyyy-mm-dd
const toISO = (d) => d.toISOString().slice(0, 10);

// rango por defecto (últimos 7 días)
const _today = new Date(); _today.setHours(23, 59, 59, 59);
const _lastWeekStart = new Date(); _lastWeekStart.setDate(_today.getDate() - 6);

const MovimientoDialog = ({ open, onClose, initial, onSubmit, empresaId, proyectos }) => {
  const [form, setForm] = useState(() => initial || {
    empresa_id: empresaId || '',
    proyecto_id: '',
    descripcion: '',
    cantidad: '',
    tipo: 'entrada',
    fecha_movimiento: ''
  });

  useEffect(() => {
    setForm(initial || {
      empresa_id: empresaId || '',
      proyecto_id: '',
      descripcion: '',
      cantidad: '',
      tipo: 'entrada',
      fecha_movimiento: ''
    });
  }, [initial, empresaId]);

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial?.id ? 'Editar movimiento' : 'Crear movimiento'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Empresa ID" value={empresaId} disabled fullWidth />

          <FormControl fullWidth>
            <InputLabel>Proyecto (opcional)</InputLabel>
            <Select
              label="Proyecto (opcional)"
              value={form.proyecto_id || ''}
              onChange={(e) => handleChange('proyecto_id', e.target.value)}
            >
              <MenuItem value=""><em>Sin proyecto</em></MenuItem>
              {proyectos.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Descripcion *"
            value={form.descripcion || ''}
            onChange={e => handleChange('descripcion', e.target.value)}
            fullWidth
          />
          <TextField
            label="Cantidad *"
            type="number"
            value={form.cantidad}
            onChange={e => handleChange('cantidad', e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Tipo *</InputLabel>
            <Select
              label="Tipo *"
              value={form.tipo || 'entrada'}
              onChange={e => handleChange('tipo', e.target.value)}
            >
              <MenuItem value="entrada">Entrada</MenuItem>
              <MenuItem value="salida">Salida</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={form.validado || false}
                onChange={(e) => handleChange('validado', e.target.checked)}
              />
            }
            label="Validado"
          />

          <TextField
            label="Observación"
            value={form.observacion || ''}
            onChange={e => handleChange('observacion', e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSubmit({ ...form, empresa_id: empresaId })}>
          {initial?.id ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MaterialMovimientosPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const empresaId = router.query?.empresaId ? String(router.query.empresaId) : '';

  // Datos
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(undefined);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRow, setAssignRow] = useState(null);

  // Filtros (incluye asignación)
  const [filters, setFilters] = useState({
    empresa_id: empresaId,
    proyecto_id: '',
    tipo: '',
    descripcionPrefix: '',
    desde: toISO(_lastWeekStart),
    hasta: toISO(_today),
    limit: 50,
    sinAsignacion: '',     // '1' para activo
    asignadoEstado: ''     // '', 'ninguno', 'parcial', 'completo'
  });

  // UI
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Proyectos (select)
  const [proyectos, setProyectos] = useState([]);

  // Mapa id → nombre de proyecto
  const proyectoNombreById = useMemo(() => {
    const map = new Map();
    (proyectos || []).forEach(p => map.set(p.id, p.nombre));
    return (id) => (id ? map.get(id) : undefined);
  }, [proyectos]);

  // Sync empresaId de la URL → filtros
  useEffect(() => {
    if (empresaId) setFilters(f => ({ ...f, empresa_id: empresaId }));
  }, [empresaId]);

  // Cargar proyectos de la empresa
  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      let empresa;
      if (empresaId) {
        empresa = await getEmpresaById(empresaId);
      } else {
        empresa = await getEmpresaDetailsFromUser(user);
      }
      const proys = await getProyectosByEmpresa(empresa);
      setProyectos(proys || []);
    })();
  }, [empresaId]);

  const fetchList = async (append = false) => {
    if (!filters.empresa_id) return;
    setLoading(true);
    try {
      const params = { ...filters, cursor: append ? cursor : undefined };
      const res = await MovimientoMaterialService.listar(params);
      setRows(prev => (append ? [...prev, ...(res.items || [])] : (res.items || [])));
      setCursor(res.nextCursor);

      // Stock rápido si hay filtro de descripcion
      if (filters.descripcionPrefix && filters.descripcionPrefix.length > 1) {
        const st = await MovimientoMaterialService.stock({
          empresa_id: filters.empresa_id,
          proyecto_id: filters.proyecto_id || undefined,
          descripcion: filters.descripcionPrefix
        });
        setStock(st);
      } else {
        setStock(null);
      }
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'Error al listar movimientos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Refrescar cuando cambian filtros clave (incluye asignación)
  useEffect(() => {
    if (filters.empresa_id) fetchList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.empresa_id,
    filters.proyecto_id,
    filters.tipo,
    filters.desde,
    filters.hasta,
    filters.asignadoEstado,
    filters.sinAsignacion
  ]);

  const handleSearchByDescripcion = () => fetchList(false);

  const handleCreate = async (data) => {
    try {
      await MovimientoMaterialService.crear({ ...data, empresa_id: empresaId });
      setAlert({ open: true, message: 'Movimiento creado', severity: 'success' });
      setOpenDialog(false);
      setEditing(null);
      await fetchList(false);
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'Error al crear', severity: 'error' });
    }
  };

  const handleUpdate = async (id, patch) => {
    try {
      await MovimientoMaterialService.actualizar(id, patch);
      setAlert({ open: true, message: 'Movimiento actualizado', severity: 'success' });
      setOpenDialog(false);
      setEditing(null);
      await fetchList(false);
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'Error al actualizar', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await MovimientoMaterialService.eliminar(id);
      setAlert({ open: true, message: 'Movimiento eliminado', severity: 'success' });
      setDeleteId(null);
      await fetchList(false);
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'Error al eliminar', severity: 'error' });
    }
  };

  const titleSuffix = empresaId ? ` - Empresa ${empresaId}` : '';

  return (
    <>
      <Head>
        <title>Movimientos de Material{titleSuffix}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          <Stack spacing={2}>
            <Typography variant="h6">Movimientos de Material</Typography>

            {!empresaId ? (
              <Alert severity="warning">Falta el parámetro <b>empresaId</b> en la URL.</Alert>
            ) : (
              <>
                {/* Filtros */}
                <Paper sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Empresa ID" value={empresaId} disabled fullWidth />

                    <FormControl fullWidth>
                      <InputLabel>Proyecto (opcional)</InputLabel>
                      <Select
                        label="Proyecto (opcional)"
                        value={filters.proyecto_id}
                        onChange={(e) => setFilters(f => ({ ...f, proyecto_id: e.target.value }))}
                      >
                        <MenuItem value=""><em>Todos</em></MenuItem>
                        {proyectos.map(p => (
                          <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        label="Tipo"
                        value={filters.tipo}
                        onChange={(e) => setFilters(f => ({ ...f, tipo: e.target.value }))}
                      >
                        <MenuItem value=""><em>Todos</em></MenuItem>
                        <MenuItem value="entrada">Entrada</MenuItem>
                        <MenuItem value="salida">Salida</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Descripcion (prefijo)"
                      value={filters.descripcionPrefix}
                      onChange={e => setFilters(f => ({ ...f, descripcionPrefix: e.target.value }))}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handleSearchByDescripcion}><SearchIcon /></IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    {/* Estado de asignación */}
                    <FormControl fullWidth disabled={filters.sinAsignacion === '1'}>
                      <InputLabel>Estado asignación</InputLabel>
                      <Select
                        label="Estado asignación"
                        value={filters.asignadoEstado}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFilters(f => ({
                            ...f,
                            asignadoEstado: v,
                            // si elijo un estado específico, apago "solo no asignados"
                            sinAsignacion: v ? '' : f.sinAsignacion
                          }));
                        }}
                      >
                        <MenuItem value=""><em>Todos</em></MenuItem>
                        <MenuItem value="ninguno">No asignado</MenuItem>
                        <MenuItem value="parcial">Parcial</MenuItem>
                        <MenuItem value="completo">Completo</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filters.sinAsignacion === '1'}
                          onChange={(e) =>
                            setFilters(f => ({
                              ...f,
                              sinAsignacion: e.target.checked ? '1' : '',
                              // si activo "solo no asignados", limpio el estado elegido
                              asignadoEstado: e.target.checked ? '' : f.asignadoEstado
                            }))
                          }
                        />
                      }
                      label="Sólo no asignados"
                    />

                    <TextField
                      label="Desde"
                      type="date"
                      value={filters.desde}
                      onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Hasta"
                      type="date"
                      value={filters.hasta}
                      onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />

                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchList(false)}>
                      Refrescar
                    </Button>

                    <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => { setEditing(null); setOpenDialog(true); }}>
                      Nuevo
                    </Button>
                  </Stack>

                  {filters.descripcionPrefix && (
                    <Box sx={{ mt: 2 }}>
                      <TotalesStock data={stock} />
                    </Box>
                  )}
                </Paper>

                {/* Listado */}
                <Paper sx={{ p: 2 }}>
                  {isMobile ? (
                    <Stack spacing={2}>
                      {rows.map((m) => (
                        <Paper key={m.id} sx={{ p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">{m.descripcion}</Typography>
                            <Chip
                              label={m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                              color={m.tipo === 'entrada' ? 'success' : 'error'}
                              size="small"
                            />
                          </Stack>

                          {/* Asignación en mobile */}
                          {m.tipo === 'entrada' && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                              <Chip
                                size="small"
                                label={
                                  m.asignado_estado === 'completo'
                                    ? 'Completo'
                                    : m.asignado_estado === 'parcial'
                                    ? 'Parcial'
                                    : 'No asignado'
                                }
                                color={
                                  m.asignado_estado === 'completo'
                                    ? 'success'
                                    : m.asignado_estado === 'parcial'
                                    ? 'warning'
                                    : 'default'
                                }
                                variant={m.asignado_estado ? 'filled' : 'outlined'}
                              />
                              <Typography variant="body2">
                                {(Number(m.asignado_qty) || 0)} / {(Number(m.cantidad) || 0)}
                              </Typography>
                            </Stack>
                          )}

                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            Cantidad: <b>{m.cantidad}</b>
                          </Typography>
                          {m.proyecto_id && (
                            <Typography variant="body2">
                              Proyecto: {proyectoNombreById(m.proyecto_id) || '-'}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            Fecha: {m.fecha_movimiento ? formatTimestamp(m.fecha_movimiento) : '-'}
                          </Typography>
                          {m.observacion && <Typography variant="body2">Obs: {m.observacion}</Typography>}

                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" onClick={() => { setAssignRow(m); setAssignOpen(true); }}>
                              Asignar
                            </Button>
                            <Button size="small" startIcon={<PreviewIcon />} onClick={() => router.push("movementForm/?movimientoId="+(m.movimiento_compra_id || m.movimiento_venta_id))} />
                            <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditing(m); setOpenDialog(true); }} />
                            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteId(m.id)} />
                          </Stack>
                        </Paper>
                      ))}
                      {!!cursor && (
                        <Button variant="outlined" onClick={() => fetchList(true)}>
                          Cargar más
                        </Button>
                      )}
                    </Stack>
                  ) : (
                    <>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Descripcion</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Cantidad</TableCell>
                            <TableCell>Proyecto</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Obs.</TableCell>
                            <TableCell>Validado</TableCell>
                            <TableCell>Asignación</TableCell>
                            <TableCell>Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>{m.descripcion}</TableCell>
                              <TableCell>
                                <Chip
                                  label={m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                                  color={m.tipo === 'entrada' ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{m.cantidad}</TableCell>
                              <TableCell>{proyectoNombreById(m.proyecto_id) || '-'}</TableCell>
                              <TableCell>{m.fecha_movimiento ? formatTimestamp(m.fecha_movimiento) : '-'}</TableCell>
                              <TableCell>{m.observacion || '-'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={m.validado ? "Validado" : "Pendiente"}
                                  color={m.validado ? "success" : "warning"}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {m.tipo === 'entrada' ? (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                      size="small"
                                      label={
                                        m.asignado_estado === 'completo'
                                          ? 'Completo'
                                          : m.asignado_estado === 'parcial'
                                          ? 'Parcial'
                                          : 'No asignado'
                                      }
                                      color={
                                        m.asignado_estado === 'completo'
                                          ? 'success'
                                          : m.asignado_estado === 'parcial'
                                          ? 'warning'
                                          : 'default'
                                      }
                                      variant={m.asignado_estado ? 'filled' : 'outlined'}
                                    />
                                    <Typography variant="body2">
                                      {(Number(m.asignado_qty) || 0)} / {(Number(m.cantidad) || 0)}
                                    </Typography>
                                  </Stack>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">—</Typography>
                                )}
                              </TableCell>

                              <TableCell>
                                <Button size="small" onClick={() => { setAssignRow(m); setAssignOpen(true); }}>
                                  Asignar
                                </Button>
                                <Button size="small" startIcon={<PreviewIcon />} onClick={() => router.push("movementForm/?movimientoId="+(m.movimiento_compra_id || m.movimiento_venta_id))} />
                                <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditing(m); setOpenDialog(true); }} />
                                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteId(m.id)} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {!!cursor && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                          <Button variant="outlined" onClick={() => fetchList(true)}>
                            Cargar más
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </Paper>

                {/* Crear/Editar */}
                <MovimientoDialog
                  open={openDialog}
                  onClose={() => { setOpenDialog(false); setEditing(null); }}
                  initial={editing}
                  onSubmit={(data) => editing?.id ? handleUpdate(editing.id, data) : handleCreate(data)}
                  empresaId={empresaId}
                  proyectos={proyectos}
                />

                {/* Confirmación eliminar */}
                <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
                  <DialogTitle>Eliminar movimiento</DialogTitle>
                  <DialogContent>¿Querés eliminar este movimiento?</DialogContent>
                  <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
                    <Button color="error" onClick={() => handleDelete(deleteId)}>Eliminar</Button>
                  </DialogActions>
                </Dialog>

                {/* Asignar a plan/etapa/material */}
                <AssignToPlanDialog
                  open={assignOpen}
                  onClose={async (result) => {
                    setAssignOpen(false);
                    setAssignRow(null);
                    if (result?.ok) {
                      setAlert({ open: true, message: 'Asignación creada', severity: 'success' });
                      await fetchList(false);
                    } else if (result && result.error) {
                      setAlert({ open: true, message: result.error, severity: 'error' });
                    }
                  }}
                  movimiento={assignRow}
                  empresaId={empresaId}
                  proyectos={proyectos}
                />
              </>
            )}

            <Snackbar
              open={alert.open}
              autoHideDuration={4000}
              onClose={() => setAlert(a => ({ ...a, open: false }))}
            >
              <Alert severity={alert.severity} onClose={() => setAlert(a => ({ ...a, open: false }))}>
                {alert.message}
              </Alert>
            </Snackbar>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

const TotalesStock = ({ data }) => {
  if (!data) return null;
  return (
    <Stack direction="row" spacing={2}>
      <Chip label={`Entrada: ${data.entrada ?? 0}`} />
      <Chip label={`Salida: ${data.salida ?? 0}`} />
      <Chip label={`Neto: ${data.neto ?? 0}`} />
    </Stack>
  );
};

MaterialMovimientosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MaterialMovimientosPage;
