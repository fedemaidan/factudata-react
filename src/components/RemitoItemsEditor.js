import React, { useMemo, useState, useRef } from 'react';
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody, TextField,
  IconButton, Button, Stack, Menu, MenuItem, Tooltip, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone';
import AcopioService from 'src/services/acopioService';


const currency = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export default function RemitoItemsEditor({
  acopioId,
  items,               // [{codigo?, descripcion, cantidad, valorUnitario}]
  setItems,
  onTotalChange,       // (number)=>void
  autoSuggest = true,  // activa la búsqueda automática por descripción
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [rowIdxForMenu, setRowIdxForMenu] = useState(null);
  const openMenu = Boolean(anchorEl);
  const pasteRef = useRef();

  const total = useMemo(
    () => (items || []).reduce((s, it) => s + (Number(it.cantidad)||0)*(Number(it.valorUnitario)||0), 0),
    [items]
  );

  React.useEffect(() => { onTotalChange?.(total); }, [total, onTotalChange]);

  const update = (i, patch) => {
    setItems(prev => prev.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  };

  const addRow = () => setItems(prev => [...prev, { codigo:'', descripcion:'', cantidad:0, valorUnitario:0 }]);
  const deleteRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const duplicateRow = (i) => setItems(prev => {
    const r = prev[i] || { codigo:'', descripcion:'', cantidad:0, valorUnitario:0 };
    const clone = { ...r };
    const next = [...prev];
    next.splice(i+1, 0, clone);
    return next;
  });

  // --- Sugerencias de precios
  const [suggestions, setSuggestions] = useState([]); // [{codigo, descripcion, valorUnitario}]
  const [loadingIndex, setLoadingIndex] = useState(null);
  const debouncers = useRef({});

  const suggest = async (i, texto) => {
    if (!texto?.trim()) return;
    try {
      setLoadingIndex(i);
      const res = await AcopioService.buscarMaterialesListaPrecios(acopioId, texto);
      setSuggestions(res || []);
      setRowIdxForMenu(i);
      setAnchorEl(pasteRef.current); // anclamos a un ref invisible para que no “salte”
    } finally {
      setLoadingIndex(null);
    }
  };

  const onDescChange = (i, v) => {
    update(i, { descripcion: v });
    if (!autoSuggest) return;
    clearTimeout(debouncers.current[i]);
    debouncers.current[i] = setTimeout(() => suggest(i, v), 400);
  };

  const pickSuggestion = (sug) => {
    if (rowIdxForMenu == null) return;
    update(rowIdxForMenu, {
      codigo: sug.codigo || '',
      descripcion: sug.descripcion || items[rowIdxForMenu]?.descripcion || '',
      valorUnitario: Number(sug.valorUnitario) || 0
    });
    setAnchorEl(null);
    setRowIdxForMenu(null);
  };

  // --- Buscar precio (botón por fila)
  const handleBuscarPrecioFila = async (i) => {
    const texto = items[i]?.descripcion || '';
    await suggest(i, texto);
  };

  // --- Proponer precios masivo
  const handleProponerPrecios = async () => {
    const nuevos = [...items];
    for (let i = 0; i < nuevos.length; i++) {
      const it = nuevos[i];
      if (Number(it.valorUnitario) > 0 || !it.descripcion?.trim()) continue;
      try {
        const res = await AcopioService.buscarPosiblesMaterialesListaPrecios(acopioId, it.descripcion);
        if (res?.length) {
          // Tomo el primer candidato (podés cambiar por: el de mayor similitud)
          const best = res[0];
          nuevos[i] = {
            ...it,
            codigo: it.codigo || best.codigo || '',
            valorUnitario: Number(best.valorUnitario) || 0
          };
        }
      } catch {}
    }
    setItems(nuevos);
  };

  // --- Pegado masivo
  // Formatos esperados (auto-detección): 
  // 1) "descripcion \t cantidad \t valorUnitario"
  // 2) "codigo \t descripcion \t cantidad \t valorUnitario"
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
      const parsed = [];
      for (const r of rows) {
        const t = r.split('\t').map(s => s.trim());
        if (t.length === 3) {
          const [desc, cant, vu] = t;
          parsed.push({ codigo:'', descripcion:desc, cantidad:Number(cant)||0, valorUnitario:Number(vu)||0 });
        } else if (t.length >= 4) {
          const [cod, desc, cant, vu] = t;
          parsed.push({ codigo:cod, descripcion:desc, cantidad:Number(cant)||0, valorUnitario:Number(vu)||0 });
        } else if (t.length === 1 && t[0]) {
          // solo descripción
          parsed.push({ codigo:'', descripcion:t[0], cantidad:0, valorUnitario:0 });
        }
      }
      if (parsed.length) setItems(prev => [...prev, ...parsed]);
    } catch {}
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
        <Button startIcon={<AddIcon />} variant="outlined" onClick={addRow}>Agregar ítem</Button>
        <Button startIcon={<ContentPasteIcon />} variant="outlined" onClick={handlePaste}>Pegar filas (Excel)</Button>
        <Tooltip title="Completar precios automáticamente cuando falten">
          <span>
            <Button startIcon={<FileDownloadDoneIcon />} variant="contained" onClick={handleProponerPrecios} disabled={!items?.length}>
              Proponer precios
            </Button>
          </span>
        </Tooltip>
        {/* ancla invisible para Menu */}
        <Box ref={pasteRef} sx={{ width: 0, height: 0 }} />
        <Typography sx={{ ml: 'auto', fontWeight: 600 }}>Total: {currency(total)}</Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell style={{width:120}}>Código</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell style={{width:110}}>Cantidad</TableCell>
            <TableCell style={{width:140}}>Valor unitario</TableCell>
            <TableCell style={{width:120}}>Total</TableCell>
            <TableCell align="center" style={{width:120}}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(items||[]).map((it, i) => {
            const totalRow = (Number(it.cantidad)||0) * (Number(it.valorUnitario)||0);
            return (
              <TableRow key={i}>
                <TableCell>
                  <TextField
                    size="small"
                    value={it.codigo||''}
                    onChange={(e)=>update(i,{codigo:e.target.value})}
                    placeholder="Opcional"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={it.descripcion||''}
                    onChange={(e)=>onDescChange(i, e.target.value)}
                    placeholder="Descripción libre"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={it.cantidad ?? 0}
                    onChange={(e)=>update(i,{cantidad:Number(e.target.value)})}
                    inputProps={{ step: 'any', min: 0 }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      type="number"
                      value={it.valorUnitario ?? 0}
                      onChange={(e)=>update(i,{valorUnitario:Number(e.target.value)})}
                      inputProps={{ step: 'any', min: 0 }}
                    />
                    <Tooltip title="Buscar precio en lista">
                      <span>
                        <IconButton size="small" onClick={()=>handleBuscarPrecioFila(i)}>
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
                <TableCell>{currency(totalRow)}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Duplicar fila (Ctrl+D)">
                      <IconButton size="small" onClick={()=>duplicateRow(i)}><AddIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={()=>deleteRow(i)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Menu anchorEl={anchorEl} open={openMenu} onClose={()=>{setAnchorEl(null);setRowIdxForMenu(null);}}>
        {!suggestions?.length ? (
          <MenuItem disabled>Sin sugerencias {loadingIndex!=null ? '...' : ''}</MenuItem>
        ) : suggestions.map((s, idx) => (
          <MenuItem key={idx} onClick={()=>pickSuggestion(s)}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.descripcion}</Typography>
              <Typography variant="caption">Código: {s.codigo || '—'} · Precio: {s.valorUnitario ?? '—'}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
