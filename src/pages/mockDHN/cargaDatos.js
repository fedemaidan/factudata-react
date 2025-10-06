import React, { useState, useRef, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Paper,
  LinearProgress,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

/**
 * MOCKUP AMPLIADO – Pantalla de CARGA DE DATOS
 * - Simula una prueba real de cliente con muchos datos
 * - Incluye dropzone, cola de archivos, resumen visual y tabla de incidencias
 */

function extIcon(name = '') {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return <PictureAsPdfIcon color="error" />;
  if (lower.endsWith('.xlsx') || lower.endsWith('.csv')) return <DescriptionIcon color="primary" />;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return <ImageIcon color="action" />;
  return <UploadFileIcon />;
}

// array de nombres
const nombres = [
    'GUTIERREZ JOAQUIN', 'VELAZQUEZ RUBEN', 'TABORDA GASTON', 'PEREZ MARIA', 'LOPEZ JUAN', 'GOMEZ LAURA', 'RODRIGUEZ CARLOS', 'SANCHEZ ANA', 'MARTINEZ LUIS', 'FERNANDEZ SOFIA', 'GONZALEZ DIEGO', 'RAMIREZ ELENA', 'TORRES MIGUEL', 'RUIZ CARMEN', 'HERNANDEZ ALBERTO', 'DIAZ ISABEL', 'CASTILLO SERGIO', 'MORALES JULIA', 'CRUZ ANDRES', 'ORTIZ PATRICIA', 'MENDOZA LUCAS', 'AGUILAR SILVIA', 'VARGAS RICARDO', 'GUERRERO LAURA', 'ROMERO FERNANDO', 'SILVA MARTINA'
]

const MOCK_PARSE = {
  ok: [
    // Parte: detalle por tipo de hora
    { id: 1, persona: 'GUTIERREZ JOAQUIN', fecha: '01/07/2025', origen: 'Parte PDF', tipo: 'Parte', detalleHoras: { normal: 8, '50': 0, '100': 0, a: 0, h: 1, zm: 0, c: 0, noct: 0, n50: 0, n100: 0 } },
    // Excel horarios: hora inicio/fin + total horas
    { id: 2, persona: 'VELAZQUEZ RUBEN', fecha: '01/07/2025', origen: 'Excel Fichadas', tipo: 'Excel', horaInicio: '07:00', horaFin: '15:00', horas: 8 },
    // Licencia: fecha + observación
    { id: 3, persona: 'TABORDA GASTON', fecha: '01/07/2025', origen: 'Licencia', tipo: 'Licencia', licenciaObs: 'Enfermedad (sin adjunto)' },
  ],
  warn: [
    { id: 101, persona: 'GUTIERREZ JOAQUIN', fecha: '01/07/2025', origen: 'Parte PDF', tipo: 'Parte', detalleHoras: { normal: 2, '50': 0, '100': 8, a: 1, h: 0, zm: 0, c: 0, noct: 0, n50: 0, n100: 0 }, nota: '>12h' },
    { id: 102, persona: 'VELAZQUEZ RUBEN', fecha: '01/07/2025', origen: 'Excel Fichadas', tipo: 'Excel', horaInicio: '08:00', horaFin: '08:10', horas: 0.2, nota: 'Duración inusual' },
  ],
  error: [
    { id: 201, persona: '—', fecha: '01/07/2025', origen: 'Foto', tipo: 'Licencia', licenciaObs: 'Trabajador no encontrado', nota: 'DNI inexistente' },
    { id: 202, persona: 'TABORDA GASTON', fecha: '32/13/2025', origen: 'Parte', tipo: 'Parte', detalleHoras: { normal: 8 }, nota: 'Fecha inválida' },
  ]
};

const DetalleCell = ({ row }) => {
  if (row.tipo === 'Parte' && row.detalleHoras) {
    const etiquetas = [
      ['normal', 'Norm.'],
      ['50', '50%'],
      ['100', '100%'],
      ['a', 'Aº'],
      ['h', 'Hº'],
      ['zm', 'Zº/M°'],
      ['c', 'Cº'],
      ['noct', 'Noct'],
      ['n50', 'N.50%'],
      ['n100', 'N.100%'],
    ];
    const items = etiquetas
      .map(([k, label]) => ({ label, val: row.detalleHoras[k] || 0 }))
      .filter(x => x.val > 0);
    return items.length ? (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {items.map((x, i) => (
          <Chip key={i} size="small" label={`${x.label}: ${x.val}`} variant="outlined" />
        ))}
      </Stack>
    ) : <Typography variant="body2" color="text.secondary">Sin detalle</Typography>;
  }

  if (row.tipo === 'Excel') {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" label={`Inicio: ${row.horaInicio || '—'}`} />
        <Chip size="small" label={`Fin: ${row.horaFin || '—'}`} />
        <Chip size="small" color="primary" label={`Horas: ${row.horas ?? '—'}`} />
      </Stack>
    );
  }

  if (row.tipo === 'Licencia') {
    return (
      <Stack spacing={0.5}>
        <Typography variant="body2"><strong>Fecha:</strong> {row.fecha}</Typography>
        <Typography variant="body2" color="text.secondary"><strong>Obs.:</strong> {row.licenciaObs || row.nota || '—'}</Typography>
      </Stack>
    );
  }

  // fallback
  return <Typography variant="body2" color="text.secondary">—</Typography>;
};


const CargaDatosPage = () => {
  const inputRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [tab, setTab] = useState('preview');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const summary = useMemo(() => ({
    ok: MOCK_PARSE.ok.length,
    warn: MOCK_PARSE.warn.length,
    error: MOCK_PARSE.error.length
  }), []);

  const handleChoose = () => inputRef.current?.click();

  const onFiles = (files) => {
    const arr = Array.from(files || []);
    const mapped = arr.map((f) => ({
      name: f.name,
      size: f.size,
      status: 'procesado'
    }));
    setQueue((prev) => [...prev, ...mapped]);
    setAlert({ open: true, message: `${mapped.length} archivo(s) agregados a la cola`, severity: 'success' });
  };

  const onDrop = (e) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  const removeItem = (idx) => setQueue((prev) => prev.filter((_, i) => i !== idx));

  
  return (
    <Box component="main">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Carga de datos de partes, licencias y horas
        </Typography>

        {/* Resumen */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Chip label={`✔ ${summary.ok} correctos`} color="success" />
          <Chip label={`⚠ ${summary.warn} advertencias`} color="warning" />
          <Chip label={`✖ ${summary.error} errores`} color="error" />
        </Stack>

        {/* Dropzone */}
        <Paper
          variant="outlined"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          sx={{ p: 5, textAlign: 'center', borderStyle: 'dashed', mb: 3 }}
        >
          <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
            Arrastrá y soltá aquí los archivos o seleccioná manualmente
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={handleChoose} startIcon={<UploadFileIcon />}>
            Seleccionar archivos
          </Button>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </Paper>

        {/* Cola de archivos */}
        {queue.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Archivos en cola</Typography>
            {queue.map((f, idx) => (
              <Stack key={idx} direction="row" alignItems="center" spacing={2} sx={{ py: 1 }}>
                {extIcon(f.name)}
                <Typography sx={{ flex: 1 }}>{f.name}</Typography>
                <Chip label="Procesado" color="success" variant="outlined" />
                <IconButton onClick={() => removeItem(idx)}><DeleteOutlineIcon /></IconButton>
              </Stack>
            ))}
          </Paper>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Vista previa" value="preview" />
          <Tab label="Registros detectados" value="registros" />
        </Tabs>

        {tab === 'preview' && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6">Resumen visual</Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <CardBox title="Correctos" color="#e8f5e9" Icon={CheckCircleIcon} count={summary.ok} desc="Listos para importar" />
              <CardBox title="Advertencias" color="#fff8e1" Icon={WarningAmberIcon} count={summary.warn} desc="Datos raros a revisar" />
              <CardBox title="Errores" color="#ffebee" Icon={CancelIcon} count={summary.error} desc="Necesitan corrección" />
            </Stack>
          </Paper>
        )}

        {tab === 'registros' && (
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Estado</TableCell>
                <TableCell>Persona</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Nota</TableCell>
              </TableRow>
            </TableHead>

              <TableBody>
                {[...MOCK_PARSE.ok.map(r => ({...r, estado: 'ok'})), ...MOCK_PARSE.warn.map(r => ({...r, estado: 'warn'})), ...MOCK_PARSE.error.map(r => ({...r, estado: 'error'}))].map((r) => (
                  <TableRow key={r.id} hover>
                  <TableCell>
                    {r.estado === 'ok'
                      ? <Chip size="small" label="OK" color="success" />
                      : r.estado === 'warn'
                      ? <Chip size="small" label="⚠" color="warning" />
                      : <Chip size="small" label="Error" color="error" />}
                  </TableCell>
                
                  <TableCell>{r.persona}</TableCell>
                  <TableCell>{r.fecha}</TableCell>
                  <TableCell>{r.origen}</TableCell>
                
                  {/* Detalle dinámico según tipo */}
                  <TableCell><DetalleCell row={r} /></TableCell>
                
                  <TableCell>
                      <Button
                        size="small"
                        variant={r.estado === 'error' ? 'contained' : 'outlined'}
                        color={r.estado === 'error' ? 'error' : (r.estado === 'ok' ? 'success' : 'warning')}
                      >
                        Editar
                      </Button>
                  </TableCell>
                
                  <TableCell>{r.nota || ''}</TableCell>
                </TableRow>                
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Footer acciones */}
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />}>Reprocesar</Button>
          <Button variant="outlined">Guardar borrador</Button>
          <Button variant="contained">Importar registros</Button>
        </Stack>

        <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} variant="filled">
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

const CardBox = ({ title, color, Icon, count, desc }) => (
  <Paper sx={{ flex: 1, p: 3, background: color }}>
    <Stack direction="row" alignItems="center" spacing={2}>
      <Icon />
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        <Typography variant="h5" fontWeight={800}>{count}</Typography>
        <Typography variant="caption" color="text.secondary">{desc}</Typography>
      </Box>
    </Stack>
  </Paper>
);

CargaDatosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default CargaDatosPage;