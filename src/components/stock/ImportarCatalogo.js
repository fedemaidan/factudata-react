// app-web/src/components/stock/ImportarCatalogo.js
//
// Vertical corralón (Fase 3C): import masivo del catálogo de materiales
// desde un archivo Excel (.xlsx) o CSV. El parser corre en el front
// (SheetJS / `xlsx`, que ya está como dep en app-web/package.json) y manda
// JSON al endpoint POST /api/materiales/import (idempotente por nombre).
//
// Columnas esperadas (case-insensitive, con sinónimos):
//   nombre*, sku, categoria, subcategoria, precio_unitario, stock_minimo, alias, desc_material
import { useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Stack, Typography, Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';

import StockMaterialesService from '../../services/stock/stockMaterialesService';

const COLUMN_ALIASES = {
  nombre: ['nombre', 'material', 'descripcion_corta', 'producto'],
  SKU: ['sku', 'codigo', 'cod', 'codigo_interno'],
  categoria: ['categoria', 'rubro'],
  subcategoria: ['subcategoria', 'sub_rubro'],
  precio_unitario: ['precio_unitario', 'precio', 'precio_unit', 'pu'],
  stock_minimo: ['stock_minimo', 'minimo', 'min'],
  alias: ['alias', 'aliases'],
  desc_material: ['desc_material', 'descripcion', 'detalle'],
};

const normKey = (k) => String(k || '').trim().toLowerCase().replace(/\s+/g, '_');

function mapRowToMaterial(row) {
  const lookup = {};
  Object.keys(row || {}).forEach((k) => {
    lookup[normKey(k)] = row[k];
  });
  const out = {};
  for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) {
      if (lookup[a] != null && lookup[a] !== '') {
        out[target] = lookup[a];
        break;
      }
    }
  }
  return out;
}

const ImportarCatalogo = ({ open, onClose, empresaId, empresaNombre, onDone }) => {
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState([]);

  const reset = () => {
    setBusy(false);
    setError(null);
    setResult(null);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // CSV como string UTF-8 explícito (preserva tildes/eñes). XLSX como binario.
      const isCsv = /\.csv$/i.test(file?.name || '');
      let wb;
      if (isCsv) {
        const text = await file.text();
        wb = XLSX.read(text, { type: 'string' });
      } else {
        const buf = await file.arrayBuffer();
        wb = XLSX.read(buf, { type: 'array' });
      }
      const firstSheet = wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: '' });
      const materiales = rows
        .map(mapRowToMaterial)
        .filter((m) => m.nombre && String(m.nombre).trim() !== '');
      setPreview(materiales);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'No se pudo parsear el archivo');
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!empresaId) {
      setError('empresa_id no disponible');
      return;
    }
    if (!preview.length) {
      setError('No hay materiales para importar');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await StockMaterialesService.importarCatalogo({
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        materiales: preview,
      });
      setResult(resp);
      onDone?.(resp);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error?.message || err?.message || 'Error al importar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>Importar catálogo desde Excel</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Subí un .xlsx o .csv con columnas: <code>nombre</code> (obligatorio), <code>SKU</code>,
            {' '}<code>categoria</code>, <code>subcategoria</code>, <code>precio_unitario</code>,
            {' '}<code>stock_minimo</code>, <code>alias</code>, <code>desc_material</code>.
            La importación es idempotente por <strong>nombre</strong>: si el material ya existe se
            actualiza precio y categoría; si no, se crea.
          </Typography>

          <Box>
            <Button
              startIcon={<UploadFileIcon />}
              variant="outlined"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              Seleccionar archivo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={onFile}
            />
          </Box>

          {busy && <LinearProgress />}

          {error && <Alert severity="error">{error}</Alert>}

          {preview.length > 0 && !result && (
            <Alert severity="info">
              Se detectaron <strong>{preview.length}</strong> materiales válidos en el archivo.
            </Alert>
          )}

          {result && (
            <Stack spacing={1}>
              <Alert severity={result.errores_count ? 'warning' : 'success'}>
                Importación finalizada.
              </Alert>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip color="success" label={`Creados: ${result.creados_count ?? 0}`} />
                <Chip color="info" label={`Actualizados: ${result.actualizados_count ?? 0}`} />
                {result.errores_count > 0 && (
                  <Chip color="error" label={`Errores: ${result.errores_count}`} />
                )}
              </Stack>
              {Array.isArray(result.errores) && result.errores.length > 0 && (
                <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                  {result.errores.slice(0, 20).map((e, i) => (
                    <Typography key={i} variant="caption" color="error" display="block">
                      • {e.nombre || `fila ${e.index}`}: {e.error}
                    </Typography>
                  ))}
                  {result.errores.length > 20 && (
                    <Typography variant="caption" color="text.secondary">
                      …y {result.errores.length - 20} más
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cerrar</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={busy || preview.length === 0 || !!result}
        >
          Importar {preview.length || ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportarCatalogo;
