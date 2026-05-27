// app-web/src/components/clientes/ImportarClientes.js
//
// Vertical corralón: import masivo de clientes desde Excel (.xlsx) o CSV.
// Espejo estructural de ImportarCatalogo.js. Parser corre en el front
// (SheetJS / xlsx) y manda JSON a POST /api/empresa/:id/clientes/import
// (idempotente por nombre normalizado).
//
// Columnas esperadas (case-insensitive, con sinónimos):
//   nombre*, razon_social, cuit, direccion, telefono, email,
//   condicion_iva, alias, categorias, notas
import { useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Stack, Typography, Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';

import clienteService from '../../services/clienteService';

const COLUMN_ALIASES = {
  nombre:        ['nombre', 'cliente', 'nombre_cliente', 'nombre_fantasia'],
  razon_social:  ['razon_social', 'razonsocial', 'razon social', 'razón social', 'razon'],
  cuit:          ['cuit', 'cuil', 'cuit_cuil', 'identificacion', 'documento'],
  direccion:     ['direccion', 'dirección', 'domicilio'],
  telefono:      ['telefono', 'teléfono', 'tel', 'celular', 'whatsapp'],
  email:         ['email', 'mail', 'correo', 'e-mail'],
  condicion_iva: ['condicion_iva', 'condición_iva', 'condicion iva', 'iva', 'cond_iva'],
  alias:         ['alias', 'aliases', 'nombres_alternativos'],
  categorias:    ['categorias', 'categoría', 'categoria', 'rubros'],
  notas:         ['notas', 'observaciones', 'observacion', 'comentarios'],
  // Saldo inicial: positivo = el cliente nos debe; negativo = saldo a favor del cliente.
  saldo_inicial: ['saldo_inicial', 'saldo inicial', 'saldo', 'deuda_inicial', 'deuda'],
};

// Normaliza condicion_iva a uno de los enum values del ClienteModel
const COND_IVA_MAP = {
  'consumidor final':       'consumidor_final',
  'cf':                     'consumidor_final',
  'monotributo':            'monotributo',
  'monotributista':         'monotributo',
  'responsable inscripto':  'responsable_inscripto',
  'ri':                     'responsable_inscripto',
  'inscripto':              'responsable_inscripto',
  'exento':                 'exento',
};

const normKey = (k) => String(k || '').trim().toLowerCase().replace(/\s+/g, '_');

function mapRowToCliente(row) {
  const lookup = {};
  Object.keys(row || {}).forEach((k) => {
    lookup[normKey(k)] = row[k];
  });
  const out = {};
  for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) {
      const norm = normKey(a);
      if (lookup[norm] != null && lookup[norm] !== '') {
        out[target] = lookup[norm];
        break;
      }
    }
  }
  // Normalizaciones específicas
  if (out.condicion_iva) {
    const k = String(out.condicion_iva).trim().toLowerCase();
    out.condicion_iva = COND_IVA_MAP[k] || (k.includes('consumidor') ? 'consumidor_final' : null);
  }
  if (typeof out.alias === 'string') {
    out.alias = out.alias.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof out.categorias === 'string') {
    out.categorias = out.categorias.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
  }
  if (out.cuit) out.cuit = String(out.cuit).replace(/[^\d]/g, '');
  // Normalizar saldo_inicial a Number (acepta "1.234,56", "-500", "$ 2000", etc.)
  if (out.saldo_inicial != null && out.saldo_inicial !== '') {
    const raw = String(out.saldo_inicial).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    out.saldo_inicial = Number.isFinite(n) ? n : null;
  } else {
    delete out.saldo_inicial;
  }
  return out;
}

const ImportarClientes = ({ open, onClose, empresaId, onDone }) => {
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
      // CSV se lee como UTF-8 explícito para preservar tildes/eñes.
      // XLSX (binario) se lee como Uint8Array tradicional.
      const isCsv = /\.csv$/i.test(file.name || '');
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
      const clientes = rows
        .map(mapRowToCliente)
        .filter((c) => c.nombre && String(c.nombre).trim() !== '');
      setPreview(clientes);
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
      setError('No hay clientes para importar');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await clienteService.importar(empresaId, preview);
      setResult(resp);
      onDone?.(resp);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Error al importar');
    } finally {
      setBusy(false);
    }
  };

  const creados = result?.results?.filter((r) => r.wasCreated).length || 0;
  const yaExistian = result?.results?.filter((r) => !r.wasCreated).length || 0;

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>Importar clientes desde Excel</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Subí un .xlsx o .csv con columnas: <code>nombre</code> (obligatorio),
            {' '}<code>razon_social</code>, <code>cuit</code>, <code>direccion</code>,
            {' '}<code>telefono</code>, <code>email</code>, <code>condicion_iva</code>,
            {' '}<code>alias</code>, <code>categorias</code>, <code>notas</code>,
            {' '}<code>saldo_inicial</code>.
            <br />
            <strong>Saldo inicial:</strong> positivo = el cliente te debe; negativo = saldo a
            favor del cliente; 0 o vacío = sin saldo previo. Solo se aplica a clientes nuevos.
            <br />
            La importación es <strong>idempotente por nombre</strong>: si el cliente ya
            existe, no se duplica (ni se toca su saldo).
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
              Se detectaron <strong>{preview.length}</strong> clientes válidos en el archivo.
            </Alert>
          )}

          {result && (
            <Stack spacing={1}>
              <Alert severity="success">Importación finalizada.</Alert>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip color="success" label={`Creados: ${creados}`} />
                <Chip color="info" label={`Ya existían: ${yaExistian}`} />
              </Stack>
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

export default ImportarClientes;
