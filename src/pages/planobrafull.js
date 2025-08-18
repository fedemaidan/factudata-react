import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Button,
  TextField,
  Stack,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Slider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

/**
 * IMPLEMENTACIÓN COMPLETA (1 archivo) — Desktop
 *
 * Incluye:
 * - KPIs por monto (obra)
 * - Toolbar sticky (importar materiales/certificados, deshacer, exportar, toggle de vista, búsqueda)
 * - Acordeones de Etapas con chips y barra de avance (ponderado por $)
 * - Tablas de Materiales y Certificados con edición inline
 * - Wizard de importación CSV (3 pasos: subir, mapear columnas, preview + confirmar)
 * - Export a Excel (xlsx)
 * - Undo (snapshot simple)
 *
 * Integra con datos reales si proveés `getProyectoById(proyectoId)` y `proyecto.etapas` con campos esperados.
 * Si no, usa mocks para previsualización.
 */

// ========================= Tipos base (JSDoc para autocompletado) =========================
/** @typedef {{
 *  nombre: string,
 *  unidad: string,
 *  cantidad_plan: number,
 *  cantidad_usada?: number,
 *  precio_unit_plan?: number,
 *  sku?: string,
 *  aliases?: string[]
 * }} Material
 */

/** @typedef {{
 *  descripcion: string,
 *  contratista?: string,
 *  fecha_inicio?: string,
 *  fecha_fin?: string,
 *  monto: number,
 *  porcentaje_certificado?: number
 * }} Certificado
 */

/** @typedef {{
 *  nombre: string,
 *  materiales?: Material[],
 *  certificados?: Certificado[]
 * }} Etapa
 */

// ========================= Utils de cálculo (ponderado por $) =========================
const numberFmt = (n) => (isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-');

const valorPlanMateriales = (materiales = []) =>
  materiales.reduce((acc, m) => acc + (Number(m.cantidad_plan || 0) * Number(m.precio_unit_plan || 0)), 0);

const valorUsadoMateriales = (materiales = []) =>
  materiales.reduce((acc, m) => {
    const cantUsada = Math.min(Number(m.cantidad_usada || 0), Number(m.cantidad_plan || 0));
    return acc + (cantUsada * Number(m.precio_unit_plan || 0));
  }, 0);

const avanceMaterialesPct = (materiales = []) => {
  const plan = valorPlanMateriales(materiales);
  if (plan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((valorUsadoMateriales(materiales) / plan) * 100)));
};

const valorPlanCertificados = (certificados = []) =>
  certificados.reduce((acc, c) => acc + Number(c.monto || 0), 0);

const valorCertificado = (certificados = []) =>
  certificados.reduce((acc, c) => acc + (Number(c.monto || 0) * Number(c.porcentaje_certificado || 0) / 100), 0);

const avanceCertificadosPct = (certificados = []) => {
  const plan = valorPlanCertificados(certificados);
  if (plan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((valorCertificado(certificados) / plan) * 100)));
};

const planTotalEtapa = (materiales = [], certificados = []) =>
  valorPlanMateriales(materiales) + valorPlanCertificados(certificados);

const ejecutadoEtapa = (materiales = [], certificados = []) =>
  valorUsadoMateriales(materiales) + valorCertificado(certificados);

const avanceEtapaPct = (materiales = [], certificados = []) => {
  const plan = planTotalEtapa(materiales, certificados);
  if (plan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((ejecutadoEtapa(materiales, certificados) / plan) * 100)));
};

const avanceObraPct = (etapas = []) => {
  const plan = etapas.reduce((acc, e) => acc + planTotalEtapa(e.materiales, e.certificados), 0);
  if (plan <= 0) return 0;
  const ejec = etapas.reduce((acc, e) => acc + ejecutadoEtapa(e.materiales, e.certificados), 0);
  return Math.max(0, Math.min(100, Math.round((ejec / plan) * 100)));
};

const tienePrecioFaltante = (materiales = []) =>
  materiales.some(m => (m.cantidad_plan || 0) > 0 && !m.precio_unit_plan);

// ========================= Helpers estado y merge =========================
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** Merge por nombre de etapa (case-insensitive, trim). Hace **append** de materiales/certificados. */
const mergeEtapasAppend = (prevEtapas, nuevasEtapas) => {
  const map = new Map();
  prevEtapas.forEach(e => map.set((e.nombre || '').trim().toLowerCase(), deepClone(e)));
  nuevasEtapas.forEach(ne => {
    const key = (ne.nombre || 'sin etapa').trim().toLowerCase();
    const ex = map.get(key);
    if (ex) {
      ex.materiales = [...(ex.materiales || []), ...(ne.materiales || [])];
      ex.certificados = [...(ex.certificados || []), ...(ne.certificados || [])];
      map.set(key, ex);
    } else {
      map.set(key, {
        nombre: ne.nombre || 'Sin etapa',
        materiales: ne.materiales || [],
        certificados: ne.certificados || [],
      });
    }
  });
  return Array.from(map.values());
};

// ========================= Export a Excel =========================
const exportPlanObraExcel = (etapas) => {
  const rowsM = [];
  const rowsC = [];
  etapas.forEach(e => {
    (e.materiales || []).forEach(m => rowsM.push({
      etapa: e.nombre,
      nombre: m.nombre,
      unidad: m.unidad,
      cantidad_plan: m.cantidad_plan,
      cantidad_usada: m.cantidad_usada,
      precio_unit_plan: m.precio_unit_plan,
      sku: m.sku,
      aliases: (m.aliases || []).join('|'),
    }));
    (e.certificados || []).forEach(c => rowsC.push({
      etapa: e.nombre,
      descripcion: c.descripcion,
      contratista: c.contratista,
      fecha_inicio: c.fecha_inicio,
      fecha_fin: c.fecha_fin,
      monto: c.monto,
      porcentaje_certificado: c.porcentaje_certificado,
    }));
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsM), 'Materiales');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsC), 'Certificados');
  XLSX.writeFile(wb, `plan_obra_${new Date().toISOString().slice(0,10)}.xlsx`);
};

// ========================= Wizard de importación (genérico) =========================
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

// ========================= Tablas =========================
const MaterialesTable = ({ materiales, onEditRow }) => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>📦 Materiales</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Unidad</TableCell>
            <TableCell>Plan (cant × $)</TableCell>
            <TableCell>Usado (cant × $)</TableCell>
            <TableCell>% Avance</TableCell>
            <TableCell>SKU / Aliases</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(materiales || []).map((m, i) => {
            const plan$ = (Number(m.cantidad_plan||0) * Number(m.precio_unit_plan||0));
            const usadoCapped = Math.min(Number(m.cantidad_usada||0), Number(m.cantidad_plan||0));
            const usado$ = (usadoCapped * Number(m.precio_unit_plan||0));
            const pct = plan$ > 0 ? Math.round((usado$ / plan$) * 100) : 0;
            return (
              <TableRow key={i}>
                <TableCell>{m.nombre}</TableCell>
                <TableCell>{m.unidad}</TableCell>
                <TableCell>{`${m.cantidad_plan || 0} × ${m.precio_unit_plan || 0} = ${numberFmt(plan$)}`}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1} alignItems="center">
                    <TextField size="small" type="number" value={m.cantidad_usada ?? 0}
                      onChange={(e) => onEditRow?.(i, { cantidad_usada: Number(e.target.value) })}
                      sx={{ width: 90 }} />
                    <Typography variant="body2">= {numberFmt(usado$)}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress variant="determinate" value={pct} sx={{ width: 100, height: 8, borderRadius: 5 }} />
                    <Typography variant="body2">{pct}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {m.sku || '-'} {m.aliases?.length ? `• ${m.aliases.join(', ')}` : ''}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

const CertificadosTable = ({ certificados, onActualizarCertificado }) => {
  const [editIdx, setEditIdx] = useState(null);
  const [temp, setTemp] = useState(0);

  const startEdit = (i, val) => { setEditIdx(i); setTemp(val ?? 0); };
  const cancel = () => { setEditIdx(null); setTemp(0); };
  const confirm = () => { const v = Math.max(0, Math.min(100, Number(temp))); onActualizarCertificado(editIdx, v); cancel(); };

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>📄 Certificados</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Descripción</TableCell>
            <TableCell>Contratista</TableCell>
            <TableCell>Inicio</TableCell>
            <TableCell>Fin</TableCell>
            <TableCell>% Certificado</TableCell>
            <TableCell>$ Certificado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(certificados || []).map((c, i) => {
            const val$ = Number(c.monto || 0) * Number(c.porcentaje_certificado || 0) / 100;
            return (
              <TableRow key={i}>
                <TableCell>{c.descripcion}</TableCell>
                <TableCell>{c.contratista || '-'}</TableCell>
                <TableCell>{c.fecha_inicio || '-'}</TableCell>
                <TableCell>{c.fecha_fin || '-'}</TableCell>
                <TableCell>
                  {editIdx === i ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Slider size="small" min={0} max={100} value={Number(temp)} onChange={(_, v) => setTemp(v)} sx={{ width: 120 }} />
                      <TextField size="small" type="number" value={temp} onChange={(e) => setTemp(e.target.value)} sx={{ width: 70 }} />
                      <IconButton size="small" onClick={confirm}><CheckIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={cancel}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{c.porcentaje_certificado ?? 0}%</Typography>
                      <IconButton size="small" onClick={() => startEdit(i, c.porcentaje_certificado)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <LinearProgress variant="determinate" value={c.porcentaje_certificado ?? 0} sx={{ mt: 1 }} />
                </TableCell>
                <TableCell>{numberFmt(val$)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

// ========================= Etapa (Acordeón) =========================
const EtapaAccordion = ({ etapa, vista, onChangeEtapa }) => {
  const pctM = avanceMaterialesPct(etapa.materiales || []);
  const pctC = avanceCertificadosPct(etapa.certificados || []);
  const pctT = avanceEtapaPct(etapa.materiales || [], etapa.certificados || []);
  const plan$ = planTotalEtapa(etapa.materiales || [], etapa.certificados || []);
  const ejec$ = ejecutadoEtapa(etapa.materiales || [], etapa.certificados || []);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack spacing={0.5} sx={{ width: '100%' }}>
          <Typography variant="subtitle1">{etapa.nombre}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip size="small" label={`Mtrl ${pctM}%`} />
            <Chip size="small" label={`Cert ${pctC}%`} />
            <Chip size="small" color="primary" label={`Total ${pctT}%`} />
            <Typography variant="caption" sx={{ ml: 1 }}>
              Plan {numberFmt(plan$)} • Ejec {numberFmt(ejec$)}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={pctT} sx={{ mt: 0.5 }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {vista !== 'certificados' && (
          <MaterialesTable
            materiales={etapa.materiales || []}
            onEditRow={(rowIndex, patch) => {
              onChangeEtapa((prev) => {
                const materiales = [...(prev.materiales || [])];
                materiales[rowIndex] = { ...materiales[rowIndex], ...patch };
                return { ...prev, materiales };
              });
            }}
          />
        )}
        {vista !== 'materiales' && (
          <CertificadosTable
            certificados={etapa.certificados || []}
            onActualizarCertificado={(index, nuevoPorcentaje) => {
              onChangeEtapa((prev) => {
                const certificados = [...(prev.certificados || [])];
                certificados[index] = { ...certificados[index], porcentaje_certificado: nuevoPorcentaje };
                return { ...prev, certificados };
              });
            }}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// ========================= KPIs + Toolbar =========================
const KPICards = ({ proyectoNombre, etapas, moneda = 'ARS' }) => {
  const { pctObra, planTotalObra, ejecutadoObra, desvioObra, faltanPrecios } = useMemo(() => {
    const plan = etapas.reduce((acc, e) => acc + planTotalEtapa(e.materiales, e.certificados), 0);
    const ejec = etapas.reduce((acc, e) => acc + ejecutadoEtapa(e.materiales, e.certificados), 0);
    const desvio = ejec - plan;
    const pct = avanceObraPct(etapas);
    const hasMissing = etapas.some(e => tienePrecioFaltante(e.materiales || []));
    return { pctObra: pct, planTotalObra: plan, ejecutadoObra: ejec, desvioObra: desvio, faltanPrecios: hasMissing };
  }, [etapas]);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Planificación de Obra {proyectoNombre || '—'}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2, mb: 2 }}>
        <Card><CardContent>
          <Typography variant="overline">Avance de obra</Typography>
          <Typography variant="h5">{pctObra}%</Typography>
          <LinearProgress variant="determinate" value={pctObra} sx={{ mt: 1 }} />
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="overline">Plan total ({moneda})</Typography>
          <Typography variant="h5">{numberFmt(planTotalObra)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="overline">Ejecutado ({moneda})</Typography>
          <Typography variant="h5">{numberFmt(ejecutadoObra)}</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="overline">Desvío ({moneda})</Typography>
          <Typography variant="h5" color={desvioObra > 0 ? 'error.main' : 'success.main'}>
            {numberFmt(desvioObra)}
          </Typography>
          {faltanPrecios && <Chip size="small" label="⚠ materiales sin precio" sx={{ mt: 1 }} />}
        </CardContent></Card>
      </Box>
    </>
  );
};

const Toolbar = ({
  vista, onChangeVista,
  onOpenImportMateriales, onOpenImportCertificados,
  onUndo, onExportExcel,
  search, setSearch,
}) => {
  return (
    <Box sx={{
      position: 'sticky', top: 8, zIndex: 10, backdropFilter: 'blur(6px)',
      display: 'flex', gap: 2, alignItems: 'center', py: 1.5, mb: 2,
      borderRadius: 2, px: 2, border: theme => `1px solid ${theme.palette.divider}`,
      backgroundColor: theme => theme.palette.background.paper,
    }}>
      <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={onOpenImportMateriales}>
        Importar materiales
      </Button>
      <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={onOpenImportCertificados}>
        Importar certificados
      </Button>
      <Button variant="text" size="small" startIcon={<UndoIcon />} onClick={onUndo}>Deshacer</Button>
      <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExportExcel}>Exportar Excel</Button>

      <ToggleButtonGroup size="small" exclusive value={vista} onChange={(_, v) => v && onChangeVista(v)} sx={{ ml: 'auto' }}>
        <ToggleButton value="todo">Todo</ToggleButton>
        <ToggleButton value="materiales">Materiales</ToggleButton>
        <ToggleButton value="certificados">Certificados</ToggleButton>
      </ToggleButtonGroup>

      <TextField size="small" placeholder="Buscar etapa o ítem" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }} />
    </Box>
  );
};

// ========================= Página principal =========================
const mockEtapas = [
  {
    nombre: 'Hormigón',
    materiales: [
      { nombre: 'Cemento', unidad: 'bolsa', cantidad_plan: 100, cantidad_usada: 55, precio_unit_plan: 12000 },
      { nombre: 'Arena', unidad: 'm3', cantidad_plan: 50, cantidad_usada: 20, precio_unit_plan: 8000 },
      { nombre: 'Hierro 8mm', unidad: 'kg', cantidad_plan: 2000, cantidad_usada: 900, precio_unit_plan: 3500 },
    ],
    certificados: [
      { descripcion: 'Estructura planta baja', monto: 3000000, porcentaje_certificado: 40 },
      { descripcion: 'Estructura primer piso', monto: 2500000, porcentaje_certificado: 0 },
    ],
  },
  {
    nombre: 'Instalaciones',
    materiales: [
      { nombre: 'Cañería Awaduct 40', unidad: 'm', cantidad_plan: 400, cantidad_usada: 120, precio_unit_plan: 3200 },
      { nombre: 'Codo 40', unidad: 'u', cantidad_plan: 60, cantidad_usada: 10 }, // sin precio
    ],
    certificados: [
      { descripcion: 'Sanitarios PB', monto: 1200000, porcentaje_certificado: 25 },
    ],
  },
];

const PlanObraPageFull = ({ proyectoId, proyectoNombre = 'Lote 5 y 6', moneda = 'ARS', getProyectoById }) => {
  const [etapas, setEtapas] = useState([]);
  const [vista, setVista] = useState('todo'); // 'todo' | 'materiales' | 'certificados'
  const [search, setSearch] = useState('');

  const [hist, setHist] = useState([]); // snapshots para undo
  const pushHist = (s) => setHist((h) => [...h, deepClone(s)]);
  const undo = () => setEtapas((prev) => { const h = deepClone(hist); const last = h.pop(); setHist(h); return last || prev; });

  // Snackbar para confirmaciones
  const [snack, setSnack] = useState({ open: false, msg: '' });
  const openSnack = (msg) => setSnack({ open: true, msg });

  // Carga inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (getProyectoById && proyectoId) {
        const p = await getProyectoById(proyectoId);
        const es = (p?.etapas || []).map(e => ({ nombre: e.nombre, materiales: e.materiales || [], certificados: e.certificados || [] }));
        if (mounted) setEtapas(es);
      } else {
        // mock si no hay servicio
        if (mounted) setEtapas(mockEtapas);
      }
    })();
    return () => { mounted = false; };
  }, [getProyectoById, proyectoId]);

  // Import Wizard control
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState('materiales');
  const openWizardM = () => { setWizardMode('materiales'); setWizardOpen(true); };
  const openWizardC = () => { setWizardMode('certificados'); setWizardOpen(true); };

  const handleConfirmImport = (nuevasEtapas) => {
    pushHist(etapas);
    const merged = mergeEtapasAppend(etapas, nuevasEtapas);
    setEtapas(merged);
    openSnack('Importación aplicada');
  };

  const filteredEtapas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return etapas;
    return etapas.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      (e.materiales || []).some(m => String(m.nombre || '').toLowerCase().includes(q)) ||
      (e.certificados || []).some(c => String(c.descripcion || '').toLowerCase().includes(q))
    );
  }, [etapas, search]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
      <Container maxWidth="xl">
        <KPICards proyectoNombre={proyectoNombre} etapas={etapas} moneda={moneda} />
        <Toolbar
          vista={vista}
          onChangeVista={setVista}
          onOpenImportMateriales={openWizardM}
          onOpenImportCertificados={openWizardC}
          onUndo={undo}
          onExportExcel={() => exportPlanObraExcel(etapas)}
          search={search}
          setSearch={setSearch}
        />

        <Stack spacing={2}>
          {filteredEtapas.map((e, idx) => (
            <EtapaAccordion
              key={`${e.nombre}-${idx}`}
              etapa={e}
              vista={vista}
              onChangeEtapa={(updater) => {
                setEtapas(prev => {
                  const nuevo = deepClone(prev);
                  nuevo[idx] = updater(nuevo[idx]);
                  return nuevo;
                });
              }}
            />
          ))}
          {!filteredEtapas.length && (
            <Card><CardContent>
              <Typography variant="subtitle1">Todavía no hay datos para mostrar</Typography>
              <Typography variant="body2" color="text.secondary">Usá los botones de importación para cargar materiales y certificados.</Typography>
            </CardContent></Card>
          )}
        </Stack>
      </Container>

      <ImportCSVWizard
        open={wizardOpen}
        mode={wizardMode}
        onClose={() => setWizardOpen(false)}
        onConfirm={handleConfirmImport}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ open: false, msg: '' })}>
        <Alert severity="success" variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PlanObraPageFull;
