// pages/material-movimientos/no-asignados.jsx
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  Box, Container, Stack, Typography, Paper, Button, IconButton, Snackbar, Alert,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Chip, Divider, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import AssignToPlanDialog from 'src/components/planobra/AssignToPlanDialog';
import MovimientoMaterialService from 'src/services/movimientoMaterialService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import movimientosService from 'src/services/movimientosService';
import { formatTimestamp } from 'src/utils/formatters';

const toISO = (d) => d.toISOString().slice(0, 10);
const _today = new Date(); _today.setHours(23, 59, 59, 59);
const _lastWeekStart = new Date(); _lastWeekStart.setDate(_today.getDate() - 6);

function GroupCard({ group, selected, onSelect }) {
  const pendingLines = group.items.filter(i => (i.asignado_pendiente ?? Math.max(0, (Number(i.cantidad)||0) - (Number(i.asignado_qty)||0))) > 0).length;
  return (
    <Paper
      onClick={() => onSelect?.(group)}
      sx={{
        p: 1.5, mb: 1, cursor: 'pointer',
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'background.paper'
      }}
    >
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="subtitle2">
            {group.meta?.proveedor || '—'} • {group.meta?.numero || group.compraId || '—'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`Ítems: ${group.items.length}`} />
            <Chip size="small" color={pendingLines ? 'warning' : 'success'} label={`Pendientes: ${pendingLines}`} />
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {group.meta?.fecha ? formatTimestamp(group.meta.fecha) : '—'} {group.meta?.total ? `• Total: ${Number(group.meta.total).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}` : ''}
        </Typography>
      </Stack>
    </Paper>
  );
}

function ComprobanteViewer({ url, heightVh = 48, onFullscreen }) {
  if (!url) return (
    <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center', color: 'text.secondary' }}>
      Sin comprobante
    </Box>
  );

  const isPdf = String(url).toLowerCase().includes('.pdf');

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        size="small"
        onClick={onFullscreen}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, bgcolor: 'background.paper' }}
        title="Ver grande"
      >
        <OpenInFullIcon fontSize="small" />
      </IconButton>
      {isPdf ? (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: `${heightVh}vh` }}>
          <embed src={url} width="100%" height="100%" />
        </Box>
      ) : (
        <Box
          sx={{
            height: `${heightVh}vh`,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundImage: `url('${url}')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
      )}
    </Box>
  );
}

const NoAsignadosPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const empresaId = router.query?.empresaId ? String(router.query.empresaId) : '';

  const [filters, setFilters] = useState({
    empresa_id: empresaId,
    proyecto_id: '',
    desde: toISO(_lastWeekStart),
    hasta: toISO(_today),
    includeParciales: false,
    q: ''
  });

  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  // grupos
  const [groups, setGroups] = useState([]); // [{ compraId, items:[movs], meta:{} }]
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState({ items: [], meta: {} }); // detalle del grupo seleccionado

  // asignación
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRow, setAssignRow] = useState(null);

  // ====== Cargar proyectos ======
  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      let empresa;
      try {
        empresa = await getEmpresaById(empresaId);
      } catch {
        empresa = await getEmpresaDetailsFromUser();
      }
      const proys = await getProyectosByEmpresa(empresa);
      setProyectos(proys || []);
    })();
  }, [empresaId]);

  // ====== Buscar no asignados y agrupar ======
  const fetchGroups = async () => {
    if (!filters.empresa_id) return;
    setLoading(true);
    try {
      // Traemos entradas no asignadas; si se tilda incluir parciales, filtramos a mano
      const res = await MovimientoMaterialService.listar({
        empresa_id: filters.empresa_id,
        proyecto_id: filters.proyecto_id || undefined,
        tipo: 'entrada',
        desde: filters.desde,
        hasta: filters.hasta,
        limit: 500,
        sinAsignacion: filters.includeParciales ? '' : '1',
        asignadoEstado: filters.includeParciales ? '' : 'ninguno',
        orderBy: [{ field: 'fecha_movimiento', direction: 'desc' }]
      });

      let items = res.items || [];
      if (filters.includeParciales) {
        items = items.filter(i => (i.asignado_estado === 'ninguno' || i.asignado_estado === 'parcial'));
      } else {
        items = items.filter(i => i.asignado_estado === 'ninguno');
      }

      if (filters.q) {
        const q = filters.q.toLowerCase();
        items = items.filter(i =>
          String(i.descripcion || '').toLowerCase().includes(q)
          || String(i.movimiento_compra_id || '').toLowerCase().includes(q)
        );
      }

      // Agrupar por movimiento_compra_id (o 'sin-comprobante')
      const map = new Map();
      for (const m of items) {
        const key = m.movimiento_compra_id || 'sin-comprobante';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(m);
      }

      // Armar grupos con metadata del comprobante
      const arr = [];
      for (const [compraId, list] of map.entries()) {
        let meta = {};
        // Intentamos levantar el comprobante si hay id "real"
        if (compraId !== 'sin-comprobante') {
          try {
            const mov = await movimientosService.getMovimientoById(compraId);
            meta = {
              proveedor: mov?.nombre_proveedor || mov?.proveedor || '',
              numero: mov?.numero_factura || mov?.codigo_operacion || '',
              fecha: mov?.fecha_factura,
              total: mov?.total,
              url_imagen: mov?.url_imagen || null
            };
          } catch (e) {
            // ignorar
          }
        }
        arr.push({ compraId, items: list, meta });
      }

      // Orden: primero los que tienen comprobante, luego sin-comprobante, por fecha desc
      arr.sort((a, b) => {
        const af = a.meta?.fecha ? new Date(a.meta.fecha).getTime() : 0;
        const bf = b.meta?.fecha ? new Date(b.meta.fecha).getTime() : 0;
        return bf - af;
      });

      setGroups(arr);
      // seleccionar primero por conveniencia
      setSelected((prev) => {
        if (!prev && arr.length) return arr[0];
        // si el seleccionado sigue existiendo, mantenerlo
        const still = arr.find(g => g.compraId === prev?.compraId);
        return still || arr[0] || null;
      });
    } catch (e) {
      setAlert({ open: true, severity: 'error', message: e?.message || 'Error al listar no asignados' });
    } finally {
      setLoading(false);
    }
  };

  // ====== Cargar detalle del grupo seleccionado ======
  const fetchDetail = async (group) => {
    if (!group) { setDetail({ items: [], meta: {} }); return; }
    try {
      const res = await MovimientoMaterialService.listarPorCompra(group.compraId, { limit: 500 });
      let items = res.items || [];
      // Mantener sólo entradas y (según toggle) no asignados o parciales
      items = items.filter(i => i.tipo === 'entrada');
      if (filters.includeParciales) {
        items = items.filter(i => i.asignado_estado === 'ninguno' || i.asignado_estado === 'parcial');
      } else {
        items = items.filter(i => i.asignado_estado === 'ninguno');
      }
      setDetail({ items, meta: group.meta || {} });
    } catch (e) {
      setDetail({ items: [], meta: group.meta || {} });
    }
  };

  // efectos
  useEffect(() => { if (filters.empresa_id) fetchGroups(); }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    filters.empresa_id, filters.proyecto_id, filters.desde, filters.hasta, filters.includeParciales, filters.q
  ]);

  useEffect(() => { fetchDetail(selected); }, [selected, filters.includeParciales]);

  const proyectoNombreById = useMemo(() => {
    const map = new Map();
    (proyectos || []).forEach(p => map.set(String(p.id), p.nombre));
    return (id) => (id ? map.get(String(id)) : undefined);
  }, [proyectos]);

  const handleAssign = (row, assignAll = false) => {
    const pendiente = Math.max(0, (Number(row.cantidad) || 0) - (Number(row.asignado_qty) || 0));
    setAssignRow({
      ...row,
      cantidad: assignAll ? pendiente : row.cantidad
    });
    setAssignOpen(true);
  };

  const refreshSelected = async () => {
    await fetchGroups();
    if (selected) {
      // re-seleccionar por id para mantener foco
      const again = (groups.find(g => g.compraId === selected.compraId) || selected);
      await fetchDetail(again);
      setSelected(again);
    }
  };

  return (
    <>
      <Head><title>No asignados • Materiales</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          <Stack spacing={2}>
            <Typography variant="h6">Materiales no asignados por comprobante</Typography>

            {/* Filtros */}
            <Paper sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                <TextField label="Empresa ID" value={empresaId} disabled sx={{ minWidth: 220 }} />

                <FormControl sx={{ minWidth: 240 }}>
                  <InputLabel>Proyecto</InputLabel>
                  <Select
                    label="Proyecto"
                    value={filters.proyecto_id}
                    onChange={(e) => setFilters(f => ({ ...f, proyecto_id: e.target.value }))}
                  >
                    <MenuItem value=""><em>Todos</em></MenuItem>
                    {proyectos.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Desde"
                  type="date"
                  value={filters.desde}
                  onChange={(e) => setFilters(f => ({ ...f, desde: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  value={filters.hasta}
                  onChange={(e) => setFilters(f => ({ ...f, hasta: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Buscar proveedor / nro / desc."
                  value={filters.q}
                  onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={fetchGroups}><SearchIcon /></IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ flex: 1, minWidth: 260 }}
                />

                <FormControl sx={{ minWidth: 220 }}>
                  <InputLabel>Incluir parciales</InputLabel>
                  <Select
                    label="Incluir parciales"
                    value={filters.includeParciales ? '1' : ''}
                    onChange={(e) => setFilters(f => ({ ...f, includeParciales: e.target.value === '1' }))}
                  >
                    <MenuItem value=""><em>No</em></MenuItem>
                    <MenuItem value="1">Sí</MenuItem>
                  </Select>
                </FormControl>

                <Button startIcon={<RefreshIcon />} onClick={fetchGroups} variant="outlined">
                  Refrescar
                </Button>
              </Stack>
            </Paper>

            {/* Layout de 2 paneles */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
              {/* Panel izquierdo: grupos */}
              <Box sx={{ width: { xs: '100%', md: 360 } }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Comprobantes ({groups.length})
                </Typography>
                <Box sx={{ maxHeight: '70vh', overflow: 'auto', pr: 0.5 }}>
                  {groups.length === 0 ? (
                    <Paper sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      No hay materiales para asignar con los filtros actuales.
                    </Paper>
                  ) : groups.map(g => (
                    <GroupCard
                      key={g.compraId}
                      group={g}
                      selected={selected?.compraId === g.compraId}
                      onSelect={setSelected}
                    />
                  ))}
                </Box>
              </Box>

              {/* Panel derecho: detalle */}
              <Box sx={{ flex: 1 }}>
                <Paper sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    {/* Encabezado detalle */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                      <Stack spacing={0.25}>
                        <Typography variant="subtitle1">
                          {selected?.meta?.proveedor || '—'} • {selected?.meta?.numero || selected?.compraId || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selected?.meta?.fecha ? formatTimestamp(selected.meta.fecha) : '—'}
                          {selected?.meta?.total != null ? ` • Total: ${Number(selected.meta.total).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}` : ''}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => selected && fetchDetail(selected)}>
                          Recargar líneas
                        </Button>
                        {selected?.compraId && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => router.push(`/movementForm/?movimientoId=${selected.compraId}`)}
                          >
                            Abrir comprobante
                          </Button>
                        )}
                      </Stack>
                    </Stack>

                    {/* Visor */}
                    <ComprobanteViewer
                      url={selected?.meta?.url_imagen}
                      heightVh={isMobile ? 35 : 48}
                      onFullscreen={() => selected?.compraId && router.push(`/movementForm/?movimientoId=${selected.compraId}`)}
                    />

                    <Divider />

                    {/* Tabla simple de líneas (responsive) */}
                    <Stack spacing={1}>
                      {(detail.items || []).map((row) => {
                        const asignado = Number(row.asignado_qty) || 0;
                        const total = Number(row.cantidad) || 0;
                        const pendiente = Math.max(0, total - asignado);
                        return (
                          <Paper key={row.id} sx={{ p: 1.5 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                              <Stack spacing={0.25}>
                                <Typography variant="subtitle2">{row.descripcion}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Cant: {total} • Asignado: {asignado} • Pendiente: {pendiente} {row.proyecto_id ? `• Proy: ${proyectoNombreById(row.proyecto_id) || '-'}` : ''}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Button size="small" variant="outlined" onClick={() => handleAssign(row, false)}>
                                  Asignar
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={pendiente <= 0}
                                  onClick={() => handleAssign({ ...row, cantidad: total }, true)}
                                >
                                  Asignar todo
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                      {detail.items?.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No hay líneas para asignar en este comprobante con los filtros actuales.
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Box>
            </Stack>

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

      {/* Diálogo de asignación */}
      <AssignToPlanDialog
        open={assignOpen}
        onClose={async (result) => {
          setAssignOpen(false);
          setAssignRow(null);
          if (result?.ok) {
            setAlert({ open: true, message: 'Asignación creada', severity: 'success' });
            await refreshSelected();
          } else if (result && result.error) {
            setAlert({ open: true, message: result.error, severity: 'error' });
          }
        }}
        movimiento={assignRow}
        empresaId={empresaId}
        proyectos={proyectos}
        // Preselección de proyecto: fila → filtro → vacío
        presetProyectoId={
          assignRow?.proyecto_id
            ? String(assignRow.proyecto_id)
            : (filters.proyecto_id ? String(filters.proyecto_id) : '')
        }
        // Para "Asignar todo", sugerimos el pendiente (si vino por ese flujo)
        presetCantidad={
          assignRow
            ? Math.max(0, (Number(assignRow.cantidad)||0) - (Number(assignRow.asignado_qty)||0))
            : undefined
        }
      />
    </>
  );
};

NoAsignadosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default NoAsignadosPage;
