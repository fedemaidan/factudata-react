// app-web/src/components/stock/ImportarCatalogo.js
//
// Vertical corralón (Fase 3C): import masivo del catálogo de materiales
// desde un archivo Excel (.xlsx) o CSV. El parser corre en el front
// (SheetJS / `xlsx`, que ya está como dep en app-web/package.json) y manda
// JSON al endpoint POST /api/materiales/import (idempotente por nombre).
//
// Columnas esperadas (case-insensitive, con sinónimos):
//   nombre*, sku, categoria, subcategoria, precio_unitario, stock_minimo, alias, desc_material
//
// También acepta el export de catálogo de **Tango** (FAMILIA, NOM_FAM,
// COD_ARTIC, DESCRIP, UNIDADMED, DESC_ADIC): DESCRIP→nombre, COD_ARTIC→SKU,
// FAMILIA→categoría (traducida a nombre legible), UNIDADMED+DESC_ADIC→detalle.
// El export de Tango no trae precio: el material se crea sin precio (se completa
// luego en stock o al venderlo).
import { useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Stack, Typography, Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';

import StockMaterialesService from '../../services/stock/stockMaterialesService';

const COLUMN_ALIASES = {
  nombre: ['nombre', 'material', 'descripcion_corta', 'producto', 'descrip', 'descripcion_articulo'],
  SKU: ['sku', 'codigo', 'cod', 'codigo_interno', 'cod_artic', 'codigo_articulo'],
  categoria: ['categoria', 'rubro', 'familia', 'nom_fam'],
  subcategoria: ['subcategoria', 'sub_rubro'],
  precio_unitario: ['precio_unitario', 'precio', 'precio_unit', 'pu'],
  stock_minimo: ['stock_minimo', 'minimo', 'min'],
  alias: ['alias', 'aliases'],
  desc_material: ['desc_material', 'descripcion', 'detalle', 'desc_adic'],
};

// Familias de Tango (código → nombre legible). Si llega un código no mapeado,
// se usa "Familia <código>" como fallback.
const TANGO_FAMILIAS = {
  '0101': 'Yeso',
  '0102': 'Maderas',
  '0103': 'Metal desplegado',
  '0104': 'Guardacantos y chapas',
  '0105': 'Alambres',
  '0106': 'Clavos y fijaciones',
  '0201': 'Cemento y cal',
  '0203': 'Hierros y mallas',
  '0204': 'Ladrillos y bloques',
  '0205': 'Áridos',
  '0206': 'Aditivos',
  '0207': 'Adhesivos y pastinas',
  '0208': 'Membranas e impermeabilizantes',
  '0209': 'Revestimientos',
  '0301': 'Durlock — placas y perfiles',
  '0302': 'Durlock — accesorios',
  '0303': 'Superboard y fibrocemento',
  '0304': 'Adhesivos para molduras',
  '0305': 'Molduras',
  '0307': 'Aislantes',
  '0308': 'Herramientas eléctricas y de corte',
  '0401': 'Herramientas de albañil',
  '0402': 'Herramientas y accesorios',
  '0403': 'Reglas',
  '0404': 'Embalaje',
  '0501': 'Pinturas',
  '0606': 'Tejuelas',
  '0700': 'Selladores',
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
      const v = lookup[normKey(a)];
      if (v != null && String(v).trim() !== '') {
        out[target] = v;
        break;
      }
    }
  }

  // Tango: la categoría llega como código de familia (ej. "0101") → nombre legible.
  if (out.categoria != null) {
    const code = String(out.categoria).trim();
    if (TANGO_FAMILIAS[code]) out.categoria = TANGO_FAMILIAS[code];
    else if (/^\d{3,4}$/.test(code)) out.categoria = `Familia ${code}`;
  }

  // Unidad de medida (Tango UNIDADMED) + detalle adicional → se guardan juntos
  // en desc_material (el modelo no tiene campo de unidad). "***" = sin unidad.
  const unidad = lookup.unidadmed != null ? String(lookup.unidadmed).trim() : '';
  const extras = [];
  if (unidad && unidad !== '***') extras.push(unidad);
  if (out.desc_material) extras.push(String(out.desc_material).trim());
  if (extras.length) out.desc_material = extras.join(' · ');
  else delete out.desc_material;

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
      // CSV: bytes + UTF-8 con fallback a Windows-1252 (preserva tildes/eñes).
      // XLSX como binario.
      const isCsv = /\.csv$/i.test(file?.name || '');
      let wb;
      if (isCsv) {
        const buf = await file.arrayBuffer();
        let text = new TextDecoder('utf-8').decode(buf);
        if (text.includes('�')) {
          try { text = new TextDecoder('windows-1252').decode(buf); } catch (_) { /* noop */ }
        }
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
            <br />
            También se acepta el <strong>export de Tango</strong> (<code>FAMILIA</code>,
            {' '}<code>COD_ARTIC</code>, <code>DESCRIP</code>, <code>UNIDADMED</code>,
            {' '}<code>DESC_ADIC</code>): la familia se traduce a una categoría legible y, como
            Tango no trae precio, los materiales se crean sin precio (lo completás después).
            <br />
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
