import React from 'react';
import { Box, Button, Stack, Typography, TextField, CircularProgress, Autocomplete, MenuItem } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { toNumber } from 'src/utils/importar/numbers';
import { fmtMoney } from 'src/utils/importar/money';


export default function Step3RevisionFinal({
  tipoLista, proveedor, proyecto, valorTotal, rows, columns, codigo,
  selectionModel, setSelectionModel,
  processRowUpdate, onGuardarAcopio, guardando, editando,
  proveedoresOptions, proyectosOptions, setCodigo, setProveedor, setValorTotal, setProyecto,
  onBulkDelete, onBulkPriceUpdate, onBulkRound, onApplyPriceFormula, onGenerateMissingCodes, moveColumnValues, handleAddItem

}) {
    const [formula, setFormula] = React.useState('');
  const [prefix, setPrefix] = React.useState('');
  const [maxLen, setMaxLen] = React.useState(16);

  const withIds = React.useMemo(() => (rows || []).map((r, idx) => ({ id: r.id ?? `${idx}`, ...r })), [rows]);

  if (editando) { 
    return (
  <Stack direction="row" spacing={2} flexWrap="wrap">
    <TextField size="small" label="Código" value={codigo} onChange={(e)=>setCodigo(e.target.value)} />
    <Autocomplete
      size="small"
      options={proveedoresOptions}
      freeSolo
      value={proveedor}
      onInputChange={(_, v)=>setProveedor(v)}
      renderInput={(p)=><TextField {...p} label="Proveedor" />}
    />
    <TextField
      size="small"
      select
      label="Proyecto"
      value={proyecto}
      onChange={(e)=>setProyecto(e.target.value)}
      sx={{ minWidth: 220 }}
    >
      {proyectosOptions.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
    </TextField>
    {tipoLista === 'materiales' && (
      <TextField
        size="small"
        label="Valor acopiado"
        value={valorTotal}
        onChange={(e)=>setValorTotal(e.target.value)}
      />
    )}
  </Stack>
)
     } else {   return (
    <Stack spacing={2}>
      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fafafa' }}>
        <Typography variant="subtitle1" gutterBottom>Resumen</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <Typography variant="body2"><strong>Tipo:</strong> {tipoLista || '-'}</Typography>
          <Typography variant="body2"><strong>Proveedor:</strong> {proveedor || '-'}</Typography>
          <Typography variant="body2"><strong>Proyecto:</strong> {proyecto || '-'}</Typography>
          {tipoLista === 'materiales' && (
            <Typography variant="body2"><strong>Valor acopiado:</strong> {fmtMoney(Number(valorTotal) || 0)}</Typography>
          )}
          <Typography variant="body2"><strong>Ítems:</strong> {withIds.length}</Typography>
        </Stack>
      </Box>
          <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Fórmula de precio"
            placeholder="%10 | -100 | *1.21 | x*1.2+30"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={() => onApplyPriceFormula(formula, 'selected')} disabled={!selectionModel.length}>
            Aplicar a seleccionados
          </Button>
          <Button variant="outlined" onClick={() => onApplyPriceFormula(formula, 'all')}>
            Aplicar a todos
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField label="Prefijo código" value={prefix} onChange={(e) => setPrefix(e.target.value)} sx={{ width: 200 }} />
          <TextField
            type="number" label="Largo máx" value={maxLen}
            onChange={(e) => setMaxLen(parseInt(e.target.value || '16', 10))}
            sx={{ width: 140 }}
          />
          <Button variant="outlined" onClick={() => onGenerateMissingCodes({ prefix, maxLen })}>
            Generar códigos faltantes
          </Button>
        </Stack>
      </Box>
      <div style={{ width: '100%', height: 520 }}>
        <DataGrid
          rows={withIds}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(m) => setSelectionModel(m.map(String))}
          rowSelectionModel={selectionModel}
          processRowUpdate={processRowUpdate}
          experimentalFeatures={{ newEditingApi: true }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
        />
      </div>

      {tipoLista === 'materiales' && (() => {
        const suma = withIds.reduce((acc, r) => acc + toNumber(r.valorTotal ?? (toNumber(r.cantidad) * toNumber(r.valorUnitario))), 0);
        const acopiado = Number(valorTotal) || 0;
        const diff = suma - acopiado;
        const coincide = Math.abs(diff) < 0.01;
        return (
          <Box sx={{ mt: 1, p: 2, border: '1px dashed #cfcfcf', borderRadius: 2, bgcolor: coincide ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.06)' }}>
            <Stack spacing={0.5}>
              <Typography variant="body2"><strong>Suma totales:</strong> {fmtMoney(suma)}</Typography>
              <Typography variant="body2"><strong>Valor acopiado:</strong> {fmtMoney(acopiado)}</Typography>
              <Typography variant="body2"><strong>Diferencia:</strong> {fmtMoney(diff)}</Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <input type="checkbox" checked={coincide} readOnly />
                <Typography variant="body2">
                  {coincide ? 'La suma COINCIDE con el valor acopiado.' : 'La suma NO coincide con el valor acopiado.'}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        );
      })()}

      <Stack direction="row" spacing={1}>
        <Stack direction="row" spacing={1}>
  <Button
    size="small"
    variant="outlined"
    disabled={!selectionModel?.length}
    onClick={() => {
      const firstIndex = parseInt(selectionModel[0], 10);
      moveColumnValues('valorUnitario', firstIndex, 'up');
    }}
  >
    ⬆️ Subir precios desde aquí
  </Button>

  <Button
    size="small"
    variant="outlined"
    disabled={!selectionModel?.length}
    onClick={() => {
      const firstIndex = parseInt(selectionModel[0], 10);
      moveColumnValues('valorUnitario', firstIndex, 'down');
    }}
  >
    ⬇️ Bajar precios desde aquí
  </Button>

  <Button
    size="small"
    variant="outlined"
    disabled={!selectionModel?.length}
    onClick={() => {
      const firstIndex = parseInt(selectionModel[0], 10);
      moveColumnValues('codigo', firstIndex, 'up');
    }}
  >
    ⬆️ Subir códigos desde aquí
  </Button>

  <Button
    size="small"
    variant="outlined"
    disabled={!selectionModel?.length}
    onClick={() => {
      const firstIndex = parseInt(selectionModel[0], 10);
      moveColumnValues('codigo', firstIndex, 'down');
    }}
  >
    ⬇️ Bajar códigos desde aquí
  </Button>
</Stack>
      </Stack>
<Stack direction="row" spacing={1} mt={1}>
    <Button variant="outlined" size="small" onClick={onBulkDelete} disabled={!selectionModel.length}>Eliminar seleccionados</Button>
        <Button variant="outlined" size="small" onClick={onBulkPriceUpdate} disabled={!selectionModel.length}>Actualizar precio…</Button>
  <Button
    variant="outlined"
    size="small"
    onClick={() => handleAddItem('start')}
  >
    ➕ Agregar al inicio
  </Button>

  <Button
    variant="outlined"
    size="small"
    disabled={!selectionModel.length}
    onClick={() => {
      const firstIndex = parseInt(selectionModel[0], 10);
      handleAddItem(firstIndex);
    }}
  >
    ➕ Agregar debajo del seleccionado
  </Button>

  <Button
    variant="outlined"
    size="small"
    onClick={() => handleAddItem('end')}
  >
    ➕ Agregar al final
  </Button>
</Stack>
<Button
  variant="contained"
  color="primary"
  onClick={onGuardarAcopio}
  disabled={guardando}
  startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : null}
>
  {guardando
    ? 'Guardando...'
    : editando
      ? 'Guardar Cambios'
      : 'Guardar Acopio'}
</Button>
    </Stack>
  );}
}
