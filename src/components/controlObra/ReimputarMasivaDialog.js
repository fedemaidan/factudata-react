import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—');

// Re-imputación masiva (T1b): planilla editable de egresos sin imputar. El matcher
// pre-carga la sugerencia de sub-rubro (los ambiguos quedan vacíos y resaltados);
// el usuario corrige de a uno o asigna en lote, y aplica todo junto.
export default function ReimputarMasivaDialog({ open, onClose, obra, empresaId, onDone }) {
  const [rows, setRows] = useState([]);
  const [selection, setSelection] = useState([]);
  const [bulkUid, setBulkUid] = useState('');
  const [copiado, setCopiado] = useState(null); // valor de sub-rubro copiado (Ctrl+C)
  const [error, setError] = useState(null);

  const subrubros = useMemo(
    () => (obra?.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ value: s.uid, label: `${r.nombre} › ${s.nombre}` }))),
    [obra]
  );

  const loteQ = useQuery({
    queryKey: ['control-obra', 'reimputar-lote', obra?._id, empresaId],
    queryFn: () => ControlObraService.reimputarLote(obra._id, empresaId),
    enabled: open && !!obra?._id && !!empresaId,
  });

  // Inicializa las filas: pre-carga la sugerencia salvo que sea ambigua.
  useEffect(() => {
    if (!loteQ.data) return;
    setRows(loteQ.data.map(({ movimiento: m, sugerencia: s }) => ({
      id: m._id,
      fecha: m.fecha_factura,
      proveedor: m.nombre_proveedor || '—',
      categoria: [m.categoria, m.subcategoria].filter(Boolean).join(' / ') || '—',
      concepto: m.observacion || m.detalle || '',
      total: m.total,
      asignado: (s && !s.ambiguo && s.subrubro_uid) ? s.subrubro_uid : '',
      _score: s?.score || 0,
      _matched: s?.matched_por || [],
      _ambiguo: !!s?.ambiguo,
      _sugerido: s?.subrubro_uid || null,
    })));
    setSelection([]);
  }, [loteQ.data]);

  const asignarLote = () => {
    if (!bulkUid) return;
    const sel = new Set(selection);
    setRows((prev) => prev.map((r) => (sel.has(r.id) ? { ...r, asignado: bulkUid } : r)));
  };

  const aplicar = useMutation({
    mutationFn: () => {
      const asignaciones = rows
        .filter((r) => r.asignado)
        .map((r) => ({ movimiento_id: r.id, imputaciones: [{ subrubro_uid: r.asignado, pct: 100 }] }));
      if (asignaciones.length === 0) throw new Error('No hay egresos con sub-rubro asignado');
      return ControlObraService.reimputarAplicar(obra._id, { empresa_id: empresaId, asignaciones });
    },
    onSuccess: (res) => { onDone?.(res); },
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const totalAsignados = rows.filter((r) => r.asignado).length;

  // Copiar/pegar tipo Excel en la columna sub-rubro (DataGrid community no lo trae).
  // El onCellKeyDown del grid es poco confiable con Ctrl+C/V, así que rastreamos la
  // celda clickeada (focusedId) y capturamos el teclado en el contenedor (capture phase).
  const [focusedId, setFocusedId] = useState(null);
  const onCellClick = (params) => { if (params.field === 'asignado') setFocusedId(params.id); };

  const handleKeyDown = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = (e.key || '').toLowerCase();
    if (key !== 'c' && key !== 'v') return;
    if (focusedId == null) return;
    if (key === 'c') {
      const row = rows.find((r) => r.id === focusedId);
      if (!row) return;
      setCopiado(row.asignado || '');
      e.preventDefault();
    } else if (key === 'v') {
      if (copiado === null) return;
      e.preventDefault();
      const sel = new Set(selection);
      const targets = sel.size > 0 ? sel : new Set([focusedId]);
      setRows((prev) => prev.map((r) => (targets.has(r.id) ? { ...r, asignado: copiado } : r)));
    }
  };

  const columns = [
    { field: 'fecha', headerName: 'Fecha', width: 90, valueFormatter: (p) => fmtFecha(p.value) },
    { field: 'proveedor', headerName: 'Proveedor', flex: 1, minWidth: 130 },
    { field: 'categoria', headerName: 'Categoría', flex: 1, minWidth: 120 },
    { field: 'concepto', headerName: 'Concepto', flex: 1, minWidth: 120 },
    { field: 'total', headerName: 'Total', width: 110, align: 'right', headerAlign: 'right', valueFormatter: (p) => fmt(p.value) },
    {
      field: 'asignado', headerName: 'Sub-rubro', width: 220, editable: true,
      type: 'singleSelect', valueOptions: [{ value: '', label: '— sin imputar —' }, ...subrubros],
      valueFormatter: (p) => (subrubros.find((s) => s.value === p.value)?.label || '—'),
    },
    {
      field: 'confianza', headerName: 'Sugerencia', width: 150, sortable: false,
      renderCell: (p) => {
        const r = p.row;
        if (r._ambiguo) return <Chip size="small" color="warning" variant="outlined" label="ambiguo" />;
        if (!r._sugerido) return <Typography variant="caption" color="text.disabled">sin sugerencia</Typography>;
        return <Chip size="small" color="success" variant="outlined" label={r._matched.join('+') || 'match'} />;
      },
    },
  ];

  return (
    <FormDrawer
      open={open} onClose={onClose} title="Re-imputar egresos a la obra" width={980}
      actions={(
        <>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" disabled={aplicar.isPending || totalAsignados === 0} onClick={() => { setError(null); aplicar.mutate(); }}>
            Imputar {totalAsignados > 0 ? `(${totalAsignados})` : ''}
          </Button>
        </>
      )}
    >
      <Typography variant="caption" color="text.secondary">
        El matcher pre-cargó el sub-rubro donde tuvo confianza. Corregí lo que haga falta (doble clic en la celda),
        seleccioná varias filas y asignalas juntas, o copiá/pegá una celda con <b>Ctrl/Cmd+C</b> y <b>Ctrl/Cmd+V</b>
        (si tenés varias filas seleccionadas, pega en todas). Los <b>ambiguos</b> quedan vacíos para que elijas.
        {copiado !== null && (
          <> · <b>Copiado:</b> {subrubros.find((s) => s.value === copiado)?.label || '(sin imputar)'}</>
        )}
      </Typography>

      {selection.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" mt={1.5} mb={0.5}>
          <Typography variant="body2">{selection.length} seleccionados →</Typography>
          <TextField
            select size="small" label="Asignar sub-rubro" value={bulkUid}
            onChange={(e) => setBulkUid(e.target.value)} sx={{ minWidth: 240 }}
          >
            {subrubros.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
          <Button size="small" variant="outlined" disabled={!bulkUid} onClick={asignarLote}>Aplicar a seleccionados</Button>
        </Stack>
      )}

      <Box sx={{ height: 460, mt: 1 }} onKeyDownCapture={handleKeyDown}>
        <DataGrid
          rows={rows} columns={columns} loading={loteQ.isLoading}
          density="compact" checkboxSelection disableRowSelectionOnClick
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          onCellClick={onCellClick}
          processRowUpdate={(nuevo) => { setRows((prev) => prev.map((r) => (r.id === nuevo.id ? nuevo : r))); return nuevo; }}
          onProcessRowUpdateError={(e) => setError(e.message)}
          getRowClassName={(p) => (p.row._ambiguo && !p.row.asignado ? 'fila-ambigua' : '')}
          sx={{ '& .fila-ambigua': { bgcolor: 'warning.lighter' } }}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Box>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
