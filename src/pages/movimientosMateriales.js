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

import MovimientoMaterialService from 'src/services/movimientoMaterialService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { dateToTimestamp, formatTimestamp } from 'src/utils/formatters';

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
          {/* empresa_id fijo, no editable */}
          <TextField label="Empresa ID" value={empresaId} disabled fullWidth />

          {/* proyecto opcional: select de proyectos de la empresa */}
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
          {/* <TextField
            label="Fecha de movimiento"
            type="datetime-local"
            value={form.fecha_movimiento ? form.fecha_movimiento : ''}
            onChange={e => handleChange('fecha_movimiento', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          /> */}
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
        <Button
          variant="contained"
          onClick={() => onSubmit({ ...form, empresa_id: empresaId })}
        >
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

  // Filtros: empresa_id viene de query y no se puede cambiar
  const [filters, setFilters] = useState({
    empresa_id: empresaId,
    proyecto_id: '',
    tipo: '',
    descripcionPrefix: '',
    desde: '',
    hasta: '',
    limit: 50
  });

  // UI
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null); // movimiento actual
  const [deleteId, setDeleteId] = useState(null);

  // Proyectos de la empresa (para el select)
  const [proyectos, setProyectos] = useState([]);

  // Mapa id → descripcion para lookup rápido
  const proyectoNombreById = useMemo(() => {
    const map = new Map();
    (proyectos || []).forEach(p => map.set(p.id, p.nombre));
    return (id) => (id ? map.get(id) : undefined);
  }, [proyectos]);

    
  // Sync empresaId desde query a filtros
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
      console.log
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

  useEffect(() => {
    // listar cuando cambian filtros clave (empresa, proyecto, tipo, fechas)
    if (filters.empresa_id) fetchList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.empresa_id, filters.proyecto_id, filters.tipo, filters.desde, filters.hasta]);

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
                    {/* empresa_id fijo, no editable */}
                    <TextField label="Empresa ID" value={empresaId} disabled fullWidth />

                    {/* proyecto opcional: select poblado por la empresa */}
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

                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => fetchList(false)}
                    >
                      Refrescar
                    </Button>

                    <Button
                      variant="contained"
                      startIcon={<AddCircleIcon />}
                      onClick={() => { setEditing(null); setOpenDialog(true); }}
                    >
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
                            <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditing(m); setOpenDialog(true); }}>
                              Editar
                            </Button>
                            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteId(m.id)}>
                              Eliminar
                            </Button>
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
                              <TableCell>
                                  {m.fecha_movimiento ? formatTimestamp(m.fecha_movimiento) : '-'}
                              </TableCell>
                              <TableCell>{m.observacion || '-'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={m.validado ? "Validado" : "Pendiente"}
                                  color={m.validado ? "success" : "warning"}
                                  size="small"
                                />
                              </TableCell>

                              <TableCell>
                                <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditing(m); setOpenDialog(true); }}>
                                  Editar
                                </Button>
                                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteId(m.id)}>
                                  Eliminar
                                </Button>
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
                  <DialogContent>
                    ¿Querés eliminar este movimiento?
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
                    <Button color="error" onClick={() => handleDelete(deleteId)}>Eliminar</Button>
                  </DialogActions>
                </Dialog>
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

MaterialMovimientosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MaterialMovimientosPage;
