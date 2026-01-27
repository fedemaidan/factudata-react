import React from 'react';
import { 
  Box, Button, Stack, Typography, TextField, CircularProgress, 
  Autocomplete, MenuItem, Paper, Chip, Divider, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Alert
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { toNumber } from 'src/utils/importar/numbers';
import { fmtMoney } from 'src/utils/importar/money';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PercentIcon from '@mui/icons-material/Percent';
import CalculateIcon from '@mui/icons-material/Calculate';

export default function Step3RevisionFinal({
  tipoLista, proveedor, proyecto, valorTotal, rows, columns, codigo,
  selectionModel, setSelectionModel,
  processRowUpdate, onGuardarAcopio, guardando, editando,
  proveedoresOptions, proyectosOptions, setCodigo, setProveedor, setValorTotal, setProyecto,
  onBulkDelete, onBulkPriceUpdate, onBulkRound, onApplyPriceFormula, onGenerateMissingCodes, moveColumnValues, handleAddItem,
  totalFacturaOriginal, setTotalFacturaOriginal // Total original de la factura importada
}) {
  const [porcentaje, setPorcentaje] = React.useState('');
  const [montoFijo, setMontoFijo] = React.useState('');
  const [prefix, setPrefix] = React.useState('');

  const withIds = React.useMemo(() => (rows || []).map((r, idx) => ({ id: r.id ?? `${idx}`, ...r })), [rows]);

  // Calcular totales
  const suma = React.useMemo(() => 
    withIds.reduce((acc, r) => acc + toNumber(r.valorTotal ?? (toNumber(r.cantidad) * toNumber(r.valorUnitario))), 0), 
    [withIds]
  );
  
  // Usar totalFacturaOriginal si existe, sino valorTotal
  const acopiado = totalFacturaOriginal || Number(valorTotal) || 0;
  const diff = suma - acopiado;
  const coincide = Math.abs(diff) < 0.01;
  const hayDiferenciaQueAjustar = tipoLista === 'materiales' && acopiado > 0 && !coincide;

  // Agregar item de ajuste automático
  const agregarItemAjuste = () => {
    const ajuste = acopiado - suma; // Positivo si falta, negativo si sobra
    if (Math.abs(ajuste) < 0.01) return;
    
    handleAddItem('end', {
      codigo: 'AJUSTE',
      descripcion: ajuste > 0 ? 'Ajuste por diferencia (faltante)' : 'Ajuste por diferencia (sobrante)',
      cantidad: 1,
      valorUnitario: ajuste,
      valorTotal: ajuste
    });
  };

  // Actualizar el valor total al de los materiales
  const usarSumaComoTotal = () => {
    if (setValorTotal) {
      setValorTotal(suma.toString());
    }
    // Limpiar el total original para que use el nuevo valor
    if (setTotalFacturaOriginal) {
      setTotalFacturaOriginal(0);
    }
  };

  // Acciones rápidas de IVA y precios
  const aplicarIVA = (quitar = false) => {
    const formula = quitar ? '/1.21' : '*1.21';
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const aplicarPorcentaje = (aumentar = true) => {
    if (!porcentaje) return;
    const formula = aumentar ? `%${porcentaje}` : `%-${porcentaje}`;
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const aplicarMontoFijo = (sumar = true) => {
    if (!montoFijo) return;
    const formula = sumar ? `+${montoFijo}` : `-${montoFijo}`;
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const cantidadSeleccionados = selectionModel.length;
  const textoAplicar = cantidadSeleccionados > 0 
    ? `a ${cantidadSeleccionados} seleccionados` 
    : 'a todos';

  // Vista de edición de acopio existente
  if (editando) { 
    return (
      <Stack spacing={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Datos del acopio
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField size="small" label="Código" value={codigo} onChange={(e)=>setCodigo(e.target.value)} />
            <Autocomplete
              size="small"
              options={proveedoresOptions}
              freeSolo
              value={proveedor}
              onInputChange={(_, v)=>setProveedor(v)}
              renderInput={(p)=><TextField {...p} label="Proveedor" />}
              sx={{ minWidth: 200 }}
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
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Header con resumen */}
      <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h6">{withIds.length} materiales</Typography>
            <Stack direction="row" spacing={1} mt={0.5}>
              <Chip label={tipoLista === 'materiales' ? 'Compra' : 'Lista de precios'} size="small" />
              <Chip label={proveedor || 'Sin proveedor'} size="small" variant="outlined" />
            </Stack>
          </Box>
          <Box textAlign="right">
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {fmtMoney(suma)}
            </Typography>
            {tipoLista === 'materiales' && !coincide && (
              <Typography variant="caption" color="error">
                Diferencia: {fmtMoney(diff)}
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Acciones rápidas */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          ⚡ Acciones rápidas {cantidadSeleccionados > 0 && `(${cantidadSeleccionados} seleccionados)`}
        </Typography>
        
        {/* Fila 1: IVA */}
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <Button 
            variant="contained" 
            size="small" 
            onClick={() => aplicarIVA(false)}
            startIcon={<PercentIcon />}
          >
            + IVA 21% {textoAplicar}
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => aplicarIVA(true)}
          >
            − Quitar IVA {textoAplicar}
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => onApplyPriceFormula('*1.105', selectionModel.length ? 'selected' : 'all')}
          >
            + IVA 10.5%
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onBulkRound}
            disabled={!cantidadSeleccionados}
          >
            Redondear
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Fila 2: Porcentaje */}
        <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="Porcentaje %"
            type="number"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            sx={{ width: 120 }}
            placeholder="10"
          />
          <Button 
            variant="contained" 
            size="small" 
            color="success"
            onClick={() => aplicarPorcentaje(true)}
            disabled={!porcentaje}
          >
            + Aumentar
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            color="error"
            onClick={() => aplicarPorcentaje(false)}
            disabled={!porcentaje}
          >
            − Reducir
          </Button>
        </Stack>

        {/* Fila 3: Monto fijo */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="Monto fijo $"
            type="number"
            value={montoFijo}
            onChange={(e) => setMontoFijo(e.target.value)}
            sx={{ width: 120 }}
            placeholder="100"
          />
          <Button 
            variant="contained" 
            size="small" 
            color="success"
            onClick={() => aplicarMontoFijo(true)}
            disabled={!montoFijo}
          >
            + Sumar
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            color="error"
            onClick={() => aplicarMontoFijo(false)}
            disabled={!montoFijo}
          >
            − Restar
          </Button>
        </Stack>
      </Paper>

      {/* Grilla de datos */}
      <Paper sx={{ height: 450, width: '100%' }}>
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
          slotProps={{ 
            toolbar: { 
              showQuickFilter: true, 
              quickFilterProps: { debounceMs: 300 } 
            } 
          }}
          density="compact"
        />
      </Paper>

      {/* Barra de acciones sobre selección */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button 
          variant="outlined" 
          size="small" 
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onBulkDelete} 
          disabled={!cantidadSeleccionados}
        >
          Eliminar ({cantidadSeleccionados})
        </Button>
        <Button 
          variant="outlined" 
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleAddItem('end')}
        >
          Agregar material
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onGenerateMissingCodes({ prefix, maxLen: 16 })}
        >
          Generar códigos faltantes
        </Button>
      </Stack>

      {/* Opciones avanzadas colapsables */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" color="text.secondary">
            Más opciones (mover columnas, agregar en posición específica)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                label="Prefijo para códigos"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                sx={{ width: 150 }}
                placeholder="MAT-"
              />
            </Stack>
            
            <Typography variant="caption" color="text.secondary">
              Mover valores en columnas (requiere selección):
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={!cantidadSeleccionados}
                onClick={() => moveColumnValues('valorUnitario', parseInt(selectionModel[0], 10), 'up')}
              >
                ⬆️ Subir precios
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!cantidadSeleccionados}
                onClick={() => moveColumnValues('valorUnitario', parseInt(selectionModel[0], 10), 'down')}
              >
                ⬇️ Bajar precios
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!cantidadSeleccionados}
                onClick={() => moveColumnValues('codigo', parseInt(selectionModel[0], 10), 'up')}
              >
                ⬆️ Subir códigos
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!cantidadSeleccionados}
                onClick={() => moveColumnValues('codigo', parseInt(selectionModel[0], 10), 'down')}
              >
                ⬇️ Bajar códigos
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Agregar material en posición:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={() => handleAddItem('start')}>
                Al inicio
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                disabled={!cantidadSeleccionados}
                onClick={() => handleAddItem(parseInt(selectionModel[0], 10))}
              >
                Debajo del seleccionado
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleAddItem('end')}>
                Al final
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Validación de totales para materiales */}
      {tipoLista === 'materiales' && acopiado > 0 && (
        <Alert severity={coincide ? 'success' : 'error'} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <span><strong>Suma materiales:</strong> {fmtMoney(suma)}</span>
            <span><strong>Total factura:</strong> {fmtMoney(acopiado)}</span>
            <span><strong>Diferencia:</strong> {fmtMoney(diff)}</span>
          </Stack>
          {!coincide && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" color="error" gutterBottom>
                ⚠️ Debés ajustar la diferencia antes de guardar
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  onClick={agregarItemAjuste}
                >
                  Agregar ítem de ajuste ({fmtMoney(acopiado - suma)})
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={usarSumaComoTotal}
                >
                  Usar suma como total ({fmtMoney(suma)})
                </Button>
              </Stack>
              <Typography variant="caption" display="block" mt={1} color="text.secondary">
                O modificá las cantidades/precios de los materiales
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {/* Botón guardar */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        onClick={onGuardarAcopio}
        disabled={guardando || hayDiferenciaQueAjustar}
        startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        sx={{ mt: 2 }}
      >
        {guardando ? 'Guardando...' : hayDiferenciaQueAjustar ? 'Ajustá la diferencia primero' : editando ? 'Guardar Cambios' : 'Guardar Acopio'}
      </Button>
    </Stack>
  );
}
