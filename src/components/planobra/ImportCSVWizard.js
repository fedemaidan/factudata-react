import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const guessMap = (headers, targets) => {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const hNorm = headers.map(h => ({ raw: h, n: norm(h) }));
  const map = {};
  targets.forEach(t => {
    const tn = norm(t);
    const found = hNorm.find(h => h.n === tn) || hNorm.find(h => h.n.includes(tn));
    map[t] = found ? found.raw : '';
  });
  return map;
};

const ImportCSVWizard = ({ open, mode, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapCols, setMapCols] = useState({});
  const [invalidCount, setInvalidCount] = useState(0);
  const fileRef = useRef(null);

  const targetsMaterials = ['etapa','nombre','unidad','cantidad_plan','cantidad_usada','precio_unit_plan','sku','aliases'];
  const targetsCerts = ['etapa','descripcion','contratista','fecha_inicio','fecha_fin','monto','porcentaje_certificado'];
  const targets = mode === 'materiales' ? targetsMaterials : targetsCerts;

  const handleFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const hdrs = meta.fields || Object.keys(data[0] || {});
        setHeaders(hdrs);
        setRows(data);
        setMapCols(guessMap(hdrs, targets));
        setStep(2);
      },
    });
  };

  const buildEtapas = () => {
    const agrupado = {};
    let invalid = 0;
    rows.forEach((row) => {
      const get = (k) => mapCols[k] ? row[mapCols[k]] : undefined;
      const etapa = String(get('etapa') || 'Sin etapa').trim();
      if (!agrupado[etapa]) agrupado[etapa] = { nombre: etapa, materiales: [], certificados: [] };

      if (mode === 'materiales') {
        const m = {
          nombre: String(get('nombre') || '').trim(),
          unidad: String(get('unidad') || '').trim(),
          cantidad_plan: Number(get('cantidad_plan') || 0),
          cantidad_usada: Number(get('cantidad_usada') || 0),
          precio_unit_plan: Number(get('precio_unit_plan') || 0),
          sku: String(get('sku') || '').trim() || undefined,
          aliases: String(get('aliases') || '').split('|').map(s => s.trim()).filter(Boolean),
        };
        if (isNaN(m.cantidad_plan) || isNaN(m.cantidad_usada) || isNaN(m.precio_unit_plan)) invalid++;
        agrupado[etapa].materiales.push(m);
      } else {
        const c = {
          descripcion: String(get('descripcion') || '').trim(),
          contratista: String(get('contratista') || '').trim() || undefined,
          fecha_inicio: get('fecha_inicio'),
          fecha_fin: get('fecha_fin'),
          monto: Number(get('monto') || 0),
          porcentaje_certificado: Number(get('porcentaje_certificado') || 0),
        };
        if (isNaN(c.monto) || isNaN(c.porcentaje_certificado)) invalid++;
        agrupado[etapa].certificados.push(c);
      }
    });
    setInvalidCount(invalid);
    return Object.values(agrupado);
  };

  const reset = () => {
    setStep(1); setHeaders([]); setRows([]); setMapCols({}); setInvalidCount(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleConfirm = () => {
    const etapas = buildEtapas();
    onConfirm(etapas);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="md" fullWidth>
      <DialogTitle>{mode === 'materiales' ? 'Importar materiales' : 'Importar certificados'} (CSV)</DialogTitle>
      <DialogContent dividers>
        {step === 1 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Seleccionar .csv
              <input ref={fileRef} type="file" hidden accept=".csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </Button>
            <Typography variant="body2" color="text.secondary">Paso 1 de 3 · Subí tu archivo</Typography>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Paso 2 de 3 · Mapeá columnas</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, mb: 2 }}>
              {targets.map((t) => (
                <React.Fragment key={t}>
                  <Box sx={{ alignSelf: 'center' }}><Typography variant="body2">{t}</Typography></Box>
                  <FormControl size="small">
                    <InputLabel>Columna</InputLabel>
                    <Select value={mapCols[t] || ''} label="Columna"
                      onChange={(e) => setMapCols((prev) => ({ ...prev, [t]: e.target.value }))}>
                      <MenuItem value=""><em>—</em></MenuItem>
                      {headers.map((h) => (<MenuItem key={h} value={h}>{h}</MenuItem>))}
                    </Select>
                  </FormControl>
                </React.Fragment>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">Tip: podés dejar vacía una columna si no existe en tu CSV.</Typography>
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography variant="subtitle2">Paso 3 de 3 · Preview</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Filas: {rows.length} · Invalidas (numéricas): {invalidCount}
            </Typography>
            <Box sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1, p: 1, maxHeight: 300, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (<TableCell key={h}>{h}</TableCell>))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (<TableCell key={h}>{String(r[h] ?? '')}</TableCell>))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancelar</Button>
        {step > 1 && <Button onClick={() => setStep(step - 1)}>Atrás</Button>}
        {step < 3 && rows.length > 0 && <Button variant="contained" onClick={() => { buildEtapas(); setStep(step + 1); }}>Siguiente</Button>}
        {step === 3 && <Button variant="contained" onClick={handleConfirm}>Confirmar importación</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default ImportCSVWizard;