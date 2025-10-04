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
  ok: Array.from({ length: 25 }).map((_, i) => ({ id: i + 1, persona: nombres[Math.floor(Math.random() * nombres.length)], fecha: '01/07/2025', tipo: 'Normal', horas: 8, origen: 'Parte' })),
  warn: [
    { id: 101, persona: 'GUTIERREZ JOAQUIN', fecha: '01/07/2025', tipo: 'Adicional 100%', horas: 14, origen: 'Parte PDF', nota: '>12h' },
    { id: 102, persona: 'VELAZQUEZ RUBEN', fecha: '01/07/2025', tipo: 'Normal', horas: 0, origen: 'Parte', nota: 'Sin detalle de motivo' },
  ],
  error: [
    { id: 201, persona: '—', fecha: '01/07/2025', tipo: 'Licencia', horas: 0, origen: 'Foto', nota: 'Trabajador no encontrado' },
    { id: 202, persona: 'TABORDA GASTON', fecha: '32/13/2025', tipo: 'Normal', horas: 8, origen: 'Parte', nota: 'Fecha inválida' },
  ]
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
                  <TableCell>Tipo</TableCell>
                  <TableCell>Horas</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Nota</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...MOCK_PARSE.ok.map(r => ({...r, estado: 'ok'})), ...MOCK_PARSE.warn.map(r => ({...r, estado: 'warn'})), ...MOCK_PARSE.error.map(r => ({...r, estado: 'error'}))].map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.estado === 'ok' ? <Chip size="small" label="OK" color="success" /> : r.estado === 'warn' ? <Chip size="small" label="⚠" color="warning" /> : <Chip size="small" label="Error" color="error" />}</TableCell>
                    <TableCell>{r.persona}</TableCell>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>{r.tipo}</TableCell>
                    <TableCell>{r.horas}</TableCell>
                    <TableCell>{r.origen}</TableCell>
                    <TableCell>
                        {r.estado != "ok" && <Button size="small" variant={r.estado === 'error' ? 'contained' : 'outlined'} color={r.estado === 'error' ? 'error' : 'warning'}>
                        Resolver
                        </Button>}
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