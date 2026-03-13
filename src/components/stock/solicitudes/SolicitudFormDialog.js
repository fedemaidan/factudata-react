import {
  Autocomplete,
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';
import { TIPO_OPCIONES, SUBTIPO_POR_TIPO, SUBTIPO_LABELS, getEstadoChip } from './constants';

/** Opciones de destino por línea */
const DESTINO_OPCIONES = [
  { value: 'deposito', label: '🏭 Depósito' },
  { value: 'obra', label: '🏗️ Obra' },
  { value: 'pendiente_asignar', label: '⏳ Pendiente de asignar' },
];

/**
 * Dialog para crear o editar una solicitud (ticket) con sus movimientos.
 *
 * Props:
 *  - open                  : boolean
 *  - onClose               : () => void
 *  - onGuardar             : () => Promise<void>
 *  - editMode              : boolean
 *  - modalMode             : 'ingreso' | 'egreso' | 'transferencia' | null
 *  - form                  : objeto formulario de cabecera
 *  - patchForm             : (key, value) => void
 *  - movs                  : array de movimientos
 *  - setMovs               : setState de movs
 *  - patchMov              : (idx, key, value) => void
 *  - handleQuitarMov       : (idx) => void
 *  - proyectos             : Array<{ id, nombre }>
 *  - transProyectoEgreso   : string
 *  - setTransProyectoEgreso: setState
 *  - transProyectoIngreso  : string
 *  - setTransProyectoIngreso: setState
 *  - user                  : objeto de autenticación
 */
export default function SolicitudFormDialog({
  open,
  onClose,
  onGuardar,
  editMode,
  modalMode,
  form,
  patchForm,
  movs,
  setMovs,
  patchMov,
  handleQuitarMov,
  proyectos = [],
  transProyectoEgreso,
  setTransProyectoEgreso,
  transProyectoIngreso,
  setTransProyectoIngreso,
  user,
  stockConfig = {},
  proveedores = [],
}) {
  const distribucionPorLinea = stockConfig.distribucion_por_linea || false;
  const acopioHabilitado = stockConfig.acopio_habilitado || false;

  // Opciones visibles según config
  const destinoOpciones = [
    ...DESTINO_OPCIONES,
    ...(acopioHabilitado ? [{ value: 'acopio', label: '📦 Acopio' }] : []),
  ];

  const agregarLineaVacia = () => {
    const newMov = {
      nombre_item: '',
      cantidad: 0,
      tipo: modalMode === 'transferencia' ? 'TRANSFERENCIA' : (form.tipo || 'INGRESO'),
      subtipo: form.subtipo || (modalMode === 'transferencia' ? 'ENTRE_OBRAS' : 'GENERAL'),
      fecha_movimiento: form.fecha || '',
      proyecto_id: '',
      proyecto_nombre: '',
      observacion: '',
      id_material: '',
    };
    setMovs((prev) => [...prev, newMov]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { width: '100%', maxWidth: 1200 } }}
    >
      <DialogTitle>
        {editMode ? 'Editar ticket' : ('Nuevo ticket - ' + (modalMode?.toUpperCase() || ''))}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* En modo edición o creación normal, mostrar tipo/subtipo/fecha */}
          {!editMode && (editMode || !modalMode) && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="ntipo">Tipo</InputLabel>
                <Select labelId="ntipo" label="Tipo" value={form.tipo} onChange={(e) => {
                  patchForm('tipo', e.target.value);
                  // Auto-seleccionar primer subtipo del nuevo tipo
                  const subtipos = SUBTIPO_POR_TIPO[e.target.value] || [];
                  patchForm('subtipo', subtipos[0] || '');
                }}>
                  {TIPO_OPCIONES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="nsubtipo">Subtipo</InputLabel>
                <Select labelId="nsubtipo" label="Subtipo" value={form.subtipo} onChange={(e) => patchForm('subtipo', e.target.value)}>
                  {(SUBTIPO_POR_TIPO[form.tipo] || []).map((s) => (
                    <MenuItem key={s} value={s}>{SUBTIPO_LABELS[s] || s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.fecha} onChange={(e) => patchForm('fecha', e.target.value)} sx={{ minWidth: 200 }} />
            </Stack>
          )}

          {/* En edición, solo mostrar fecha (tipo y subtipo readonly) */}
          {editMode && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Tipo" value={form.tipo} disabled sx={{ minWidth: 150 }} />
              <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.fecha} onChange={(e) => patchForm('fecha', e.target.value)} sx={{ minWidth: 200 }} />
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel id="proyecto-edit">Proyecto</InputLabel>
                <Select
                  labelId="proyecto-edit"
                  label="Proyecto"
                  value={form.proyecto_id || ''}
                  onChange={(e) => {
                    const proyId = e.target.value;
                    const proy = proyectos.find((p) => p.id === proyId);
                    patchForm('proyecto_id', proyId);
                    patchForm('proyecto_nombre', proy?.nombre || 'Sin asignar');
                    setMovs((prev) =>
                      prev.map((m) => ({
                        ...m,
                        proyecto_id: proyId || null,
                        proyecto_nombre: proy?.nombre || 'Sin asignar',
                      }))
                    );
                  }}
                >
                  <MenuItem value=""><em>Sin asignar</em></MenuItem>
                  {proyectos.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          )}

          {/* Documentos adjuntos en modo edición */}
          {editMode && form.documentos && form.documentos.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AttachFileIcon color="primary" />
                  <Typography variant="subtitle2" color="primary">
                    Documentos adjuntos ({form.documentos.length})
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {form.documentos.map((url, idx) => (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        p: 1, cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
                      }}
                      onClick={() => window.open(url, '_blank')}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          component="img"
                          src={url}
                          alt={`Remito ${idx + 1}`}
                          sx={{
                            width: 80, height: 80, objectFit: 'cover',
                            borderRadius: 1, border: '1px solid', borderColor: 'divider',
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <Box
                          sx={{
                            display: 'none', width: 80, height: 80,
                            alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'grey.200', borderRadius: 1,
                          }}
                        >
                          <ImageIcon color="disabled" />
                        </Box>
                        <Stack>
                          <Typography variant="caption" color="text.secondary">Página {idx + 1}</Typography>
                          <Tooltip title="Abrir en nueva pestaña">
                            <IconButton size="small" color="primary"><OpenInNewIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* En modo creación rápida, subtipo + fecha + observación */}
          {!editMode && modalMode && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="nsubtipo-rapido">Subtipo</InputLabel>
                <Select labelId="nsubtipo-rapido" label="Subtipo" value={form.subtipo} onChange={(e) => patchForm('subtipo', e.target.value)}>
                  {(SUBTIPO_POR_TIPO[form.tipo] || SUBTIPO_POR_TIPO[modalMode?.toUpperCase()] || []).map((s) => (
                    <MenuItem key={s} value={s}>{SUBTIPO_LABELS[s] || s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.fecha} onChange={(e) => patchForm('fecha', e.target.value)} sx={{ minWidth: 200 }} />
              <TextField label="Observación" value={form.observacion || ''} onChange={(e) => patchForm('observacion', e.target.value)} sx={{ minWidth: 300 }} />
            </Stack>
          )}

          {modalMode !== 'transferencia' && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Autocomplete
                options={proveedores}
                getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.nombre || ''}
                value={proveedores.find((p) => p.nombre === form.proveedor_nombre) || (form.proveedor_nombre ? { id: '', nombre: form.proveedor_nombre, cuit: form.proveedor_cuit || '' } : null)}
                onChange={(_, newVal) => {
                  if (newVal) {
                    patchForm('proveedor_nombre', newVal.nombre || '');
                    patchForm('proveedor_id', newVal.id || '');
                    patchForm('proveedor_cuit', newVal.cuit || '');
                  } else {
                    patchForm('proveedor_nombre', '');
                    patchForm('proveedor_id', '');
                    patchForm('proveedor_cuit', '');
                  }
                }}
                isOptionEqualToValue={(opt, val) => opt.nombre === val?.nombre}
                freeSolo
                onInputChange={(_, inputVal, reason) => {
                  if (reason === 'input') {
                    patchForm('proveedor_nombre', inputVal);
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Proveedor" />}
                sx={{ minWidth: 320 }}
              />
            </Stack>
          )}

          {!editMode && !modalMode && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="ID Compra" value={form.id_compra} onChange={(e) => patchForm('id_compra', e.target.value)} sx={{ minWidth: 220 }} />
              <TextField label="URL doc" value={form.url_doc} onChange={(e) => patchForm('url_doc', e.target.value)} sx={{ minWidth: 420 }} />
            </Stack>
          )}

          {/* Selector de proyecto (creación rápida ingreso/egreso) */}
          {!editMode && modalMode && modalMode !== 'transferencia' && (
            <FormControl fullWidth>
              <InputLabel id="proy-rapida">Proyecto (opcional - sin proyecto = "Sin asignar")</InputLabel>
              <Select
                labelId="proy-rapida"
                label='Proyecto (opcional - sin proyecto = "Sin asignar")'
                value={form.proyecto_id || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const p = proyectos.find((pp) => pp.id === id);
                  patchForm('proyecto_id', id);
                  patchForm('proyecto_nombre', p?.nombre || '');
                }}
              >
                <MenuItem value=""><em>(sin proyecto - se asigna a "Sin asignar")</em></MenuItem>
                {proyectos.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {/* Selectors para TRANSFERENCIA */}
          {!editMode && modalMode === 'transferencia' && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="trans-egreso-label">Proyecto EGRESO (desde)</InputLabel>
                <Select labelId="trans-egreso-label" label="Proyecto EGRESO (desde)" value={transProyectoEgreso} onChange={(e) => setTransProyectoEgreso(e.target.value)}>
                  <MenuItem value=""><em>(sin proyecto - "Sin asignar")</em></MenuItem>
                  {proyectos.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="trans-ingreso-label">Proyecto INGRESO (hacia)</InputLabel>
                <Select labelId="trans-ingreso-label" label="Proyecto INGRESO (hacia)" value={transProyectoIngreso} onChange={(e) => setTransProyectoIngreso(e.target.value)}>
                  <MenuItem value=""><em>(sin proyecto - "Sin asignar")</em></MenuItem>
                  {proyectos.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          )}

          <Divider sx={{ my: 1 }} />
          <Typography variant="h6">Movimientos</Typography>

          {/* Tabla de movimientos */}
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MATERIAL / NOMBRE</TableCell>
                  <TableCell align="right">CANTIDAD</TableCell>
                  {(modalMode === 'ingreso' || form.tipo === 'INGRESO') && editMode && (
                    <TableCell align="center">ESTADO</TableCell>
                  )}
                  {/* Fase 3 — Destino por línea (solo si distribucion_por_linea está activo) */}
                  {distribucionPorLinea && !editMode && (
                    <TableCell>DESTINO</TableCell>
                  )}
                  <TableCell>OBSERVACIÓN</TableCell>
                  <TableCell align="right">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movs.map((m, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell width={350}>
                      <MaterialAutocomplete
                        user={user}
                        value={m.id_material || ''}
                        fallbackText={m.nombre_item || ''}
                        onTextChange={(textLibre) => {
                          patchMov(idx, 'id_material', null);
                          patchMov(idx, 'nombre_item', textLibre || '');
                        }}
                        onMaterialSelect={(mat) => {
                          patchMov(idx, 'id_material', mat.id || null);
                          patchMov(idx, 'nombre_item', mat.label || mat.nombre || '');
                        }}
                        onMaterialCreated={(materialCreado) => {
                          patchMov(idx, 'id_material', materialCreado.id);
                          patchMov(idx, 'nombre_item', materialCreado.nombre);
                        }}
                        label="Material (elige o escribe)"
                        disabled={false}
                        fullWidth
                        showCreateOption
                      />
                    </TableCell>

                    <TableCell align="right" width={100}>
                      <TextField
                        type="number"
                        value={m.cantidad || 0}
                        onChange={(e) => patchMov(idx, 'cantidad', e.target.value)}
                        size="small"
                        sx={{ maxWidth: 80 }}
                      />
                    </TableCell>

                    {(modalMode === 'ingreso' || form.tipo === 'INGRESO') && editMode && (
                      <TableCell align="center" width={150}>
                        {(() => {
                          const estadoMov = m.estado || 'PENDIENTE';
                          const estadoInfo = getEstadoChip(estadoMov);
                          const cantidadOriginal = m.cantidad_original || Math.abs(m.cantidad || 0);
                          const cantidadEntregada = m.cantidad_entregada || 0;
                          return (
                            <Stack spacing={0.5} alignItems="center">
                              <Chip icon={estadoInfo.icon} label={estadoInfo.label} size="small" color={estadoInfo.color} variant="filled" />
                              {estadoMov === 'PARCIALMENTE_ENTREGADO' && (
                                <Typography variant="caption" color="text.secondary">
                                  {cantidadEntregada}/{cantidadOriginal}
                                </Typography>
                              )}
                            </Stack>
                          );
                        })()}
                      </TableCell>
                    )}

                    {/* Fase 3 — Selector de destino por línea */}
                    {distribucionPorLinea && !editMode && (
                      <TableCell width={220}>
                        <Stack spacing={1}>
                          <Select
                            value={m.destino || 'deposito'}
                            onChange={(e) => {
                              patchMov(idx, 'destino', e.target.value);
                              if (e.target.value !== 'obra') {
                                patchMov(idx, 'destino_proyecto_id', null);
                                patchMov(idx, 'destino_proyecto_nombre', null);
                              }
                            }}
                            size="small"
                            fullWidth
                          >
                            {destinoOpciones.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                          </Select>
                          {m.destino === 'obra' && (
                            <Autocomplete
                              options={proyectos}
                              getOptionLabel={(p) => p.nombre || ''}
                              value={proyectos.find((p) => p.id === m.destino_proyecto_id) || null}
                              onChange={(_, newVal) => {
                                patchMov(idx, 'destino_proyecto_id', newVal?.id || null);
                                patchMov(idx, 'destino_proyecto_nombre', newVal?.nombre || null);
                              }}
                              renderInput={(params) => (
                                <TextField {...params} label="Obra" size="small" placeholder="Buscar..." />
                              )}
                              size="small"
                              isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                              noOptionsText="Sin proyectos"
                            />
                          )}
                        </Stack>
                      </TableCell>
                    )}

                    <TableCell width={200}>
                      <TextField
                        value={m.observacion || ''}
                        onChange={(e) => patchMov(idx, 'observacion', e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        rows={1}
                      />
                    </TableCell>

                    <TableCell align="right" width={80}>
                      <Tooltip title="Eliminar">
                        <IconButton onClick={() => handleQuitarMov(idx)} size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {movs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={distribucionPorLinea ? 6 : 5}>
                      <em>Sin movimientos. Agregá al menos uno (opcional).</em>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Button onClick={agregarLineaVacia} startIcon={<AddIcon />} variant="outlined" fullWidth>
            Agregar línea
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onGuardar}>
          {editMode ? 'Guardar cambios' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
