import React, { useState, useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  Box, Container, Typography, Chip, Stack, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Divider, IconButton, Paper, Alert, Stepper, Step, StepLabel, Tooltip,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VerifiedIcon from '@mui/icons-material/Verified';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import DateRangeIcon from '@mui/icons-material/DateRange';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const fmtM = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

// Calcula fecha real a partir de mes relativo (1-10) y fecha de inicio del proyecto
const INICIO = new Date(2026, 2, 1); // Marzo 2026
const mesAFecha = (mes) => {
  const d = new Date(INICIO);
  d.setMonth(d.getMonth() + mes - 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const PROYECTO = {
  nombre: 'Anexo Fuero Penal',
  cliente: 'Ministerio de Justicia — Provincia',
  direccion: 'Av. Independencia 1850, San Miguel de Tucumán',
  fecha_inicio: 'Marzo 2026',
  duracion: '10 meses',
  total: 1_240_093_855,
};

/*
  Estructura de 3 niveles:
    rubro → sub_rubros → tareas (ítems)

  Campos de cronograma:
    mes_inicio / mes_fin : meses relativos al inicio del proyecto (1–10)
    dist_mensual         : distribución % por mes (del plan de trabajo Excel)
    dependencias         : IDs de rubros que deben completarse antes de este
*/
const RUBROS = [
  {
    id: 'r1', num: '1', nombre: 'Trabajos Preliminares',
    monto: 34_629_353, avance: 100,
    mes_inicio: 1, mes_fin: 1,
    dist_mensual: { 1: 1.0 },
    dependencias: [],
    sub_rubros: [
      {
        id: 'r1a', num: '1.1', nombre: 'Demolición', monto: 17_142_008, avance: 100,
        tareas: [
          { nombre: 'Demolición de cubierta existente', monto: 3_200_000, avance: 100 },
          { nombre: 'Demolición de vereda y pavimento', monto: 5_800_000, avance: 100 },
          { nombre: 'Demolición de mampostería', monto: 8_142_008, avance: 100 },
        ],
      },
      {
        id: 'r1b', num: '1.2', nombre: 'Acometidas', monto: 17_487_345, avance: 100,
        tareas: [
          { nombre: 'Acometida de energía eléctrica', monto: 8_864_439, avance: 100 },
          { nombre: 'Acometida de agua', monto: 1_259_433, avance: 100 },
          { nombre: 'Acometida de cloaca', monto: 2_778_934, avance: 100 },
          { nombre: 'Acometida de datos', monto: 3_614_487, avance: 100 },
          { nombre: 'Salida pluviales por vereda', monto: 970_052, avance: 100 },
        ],
      },
    ],
  },
  {
    id: 'r2', num: '2', nombre: 'Excavaciones y Mov. de Suelos',
    monto: 39_506_537, avance: 100,
    mes_inicio: 1, mes_fin: 2,
    dist_mensual: { 1: 0.5, 2: 0.5 },
    dependencias: ['r1'],
    sub_rubros: [
      {
        id: 'r2a', num: '2.1', nombre: 'Excavaciones', monto: 2_685_333, avance: 100,
        tareas: [
          { nombre: 'Excav. Fundaciones', monto: 2_575_275, avance: 100 },
          { nombre: 'Excav. Vigas encadenado', monto: 110_058, avance: 100 },
        ],
      },
      {
        id: 'r2b', num: '2.2', nombre: 'Rellenos y compactación', monto: 36_821_204, avance: 100,
        tareas: [
          { nombre: 'Relleno y compactación de terreno', monto: 13_830_229, avance: 100 },
          { nombre: 'Relleno con tierra negra', monto: 22_990_975, avance: 100 },
        ],
      },
    ],
  },
  {
    id: 'r3', num: '3', nombre: 'Estructuras',
    monto: 79_086_304, avance: 68,
    mes_inicio: 1, mes_fin: 3,
    dist_mensual: { 1: 0.3, 2: 0.5, 3: 0.2 },
    dependencias: ['r2'],
    sub_rubros: [
      {
        id: 'r3a', num: '3.1', nombre: 'Fundaciones', monto: 15_486_922, avance: 100,
        tareas: [
          { nombre: 'Bases H°A°', monto: 10_892_289, avance: 100 },
          { nombre: 'Vigas de Fundación', monto: 4_594_633, avance: 100 },
        ],
      },
      {
        id: 'r3b', num: '3.2', nombre: 'Estructura elevada', monto: 63_599_382, avance: 57,
        tareas: [
          { nombre: 'Encadenados H y V', monto: 8_999_169, avance: 100 },
          { nombre: 'Vigas H°A° visto', monto: 27_407_043, avance: 60 },
          { nombre: 'Losas H°A° visto', monto: 13_460_094, avance: 40 },
          { nombre: 'Columnas H°A° visto', monto: 13_733_073, avance: 20 },
        ],
      },
    ],
  },
  {
    id: 'r4', num: '4', nombre: 'Cubiertas Metálicas',
    monto: 104_235_283, avance: 20,
    mes_inicio: 2, mes_fin: 4,
    dist_mensual: { 2: 0.2, 3: 0.3, 4: 0.5 },
    dependencias: ['r3'],
    sub_rubros: [
      {
        id: 'r4a', num: '4.1', nombre: 'Cubierta existente a reciclar', monto: 58_912_651, avance: 40,
        tareas: [
          { nombre: 'Chapa galvanizada + aislación térmica', monto: 31_882_031, avance: 50 },
          { nombre: 'Bajadas y colectores', monto: 5_873_806, avance: 30 },
          { nombre: 'Cumbrera y canaletas', monto: 21_156_814, avance: 30 },
        ],
      },
      {
        id: 'r4b', num: '4.2', nombre: 'Cubierta galería', monto: 34_401_353, avance: 0,
        tareas: [
          { nombre: 'Chapa galvanizada con estructura', monto: 22_474_783, avance: 0 },
          { nombre: 'Canaletas y babetas', monto: 11_926_570, avance: 0 },
        ],
      },
      {
        id: 'r4c', num: '4.3', nombre: 'Cubierta nueva', monto: 10_921_279, avance: 0,
        tareas: [
          { nombre: 'Chapa galvanizada con estructura', monto: 8_518_757, avance: 0 },
          { nombre: 'Bajadas y canaletas', monto: 2_402_522, avance: 0 },
        ],
      },
    ],
  },
  {
    id: 'r5', num: '5', nombre: 'Mampostería y Tabiques',
    monto: 115_427_983, avance: 0,
    mes_inicio: 3, mes_fin: 5,
    dist_mensual: { 3: 0.3, 4: 0.5, 5: 0.2 },
    dependencias: ['r3'],
    sub_rubros: [
      {
        id: 'r5a', num: '5.1', nombre: 'Mampostería', monto: 40_269_211, avance: 0,
        tareas: [
          { nombre: 'Bloque H° visto', monto: 8_447_270, avance: 0 },
          { nombre: 'Ladrillo común 0.30m', monto: 13_797_672, avance: 0 },
          { nombre: 'Ladrillo común 0.15m', monto: 1_097_929, avance: 0 },
          { nombre: 'Ladrillo hueco del 18', monto: 16_926_340, avance: 0 },
        ],
      },
      {
        id: 'r5b', num: '5.2', nombre: 'Tabiques', monto: 75_158_772, avance: 0,
        tareas: [
          { nombre: 'Tabiques de durlock', monto: 75_158_772, avance: 0 },
        ],
      },
    ],
  },
  {
    id: 'r6', num: '6', nombre: 'Capa Aisladora',
    monto: 23_315_366, avance: 0,
    mes_inicio: 3, mes_fin: 5,
    dist_mensual: { 3: 0.3, 4: 0.5, 5: 0.2 },
    dependencias: ['r5'],
    sub_rubros: [],
  },
  {
    id: 'r7', num: '7', nombre: 'Revoques',
    monto: 84_531_326, avance: 0,
    mes_inicio: 3, mes_fin: 9,
    dist_mensual: { 3: 0.25, 4: 0.25, 5: 0.2, 6: 0.15, 9: 0.15 },
    dependencias: ['r5', 'r6'],
    sub_rubros: [],
  },
  {
    id: 'r8', num: '8', nombre: 'Contrapisos, Carpetas y Banquinas',
    monto: 88_802_582, avance: 0,
    mes_inicio: 5, mes_fin: 9,
    dist_mensual: { 5: 0.1, 6: 0.1, 7: 0.35, 9: 0.45 },
    dependencias: ['r5'],
    sub_rubros: [],
  },
  {
    id: 'r9', num: '9', nombre: 'Pisos, Zócalos y Revestimientos',
    monto: 115_567_041, avance: 0,
    mes_inicio: 6, mes_fin: 10,
    dist_mensual: { 6: 0.1, 7: 0.2, 8: 0.4, 9: 0.1, 10: 0.2 },
    dependencias: ['r8'],
    sub_rubros: [],
  },
  {
    id: 'r10', num: '10', nombre: 'Umbrales, Solías y Perfiles',
    monto: 1_938_057, avance: 0,
    mes_inicio: 8, mes_fin: 10,
    dist_mensual: { 8: 0.5, 10: 0.5 },
    dependencias: ['r5'],
    sub_rubros: [],
  },
  {
    id: 'r11', num: '11', nombre: 'Cielorrasos',
    monto: 56_050_463, avance: 0,
    mes_inicio: 6, mes_fin: 9,
    dist_mensual: { 6: 0.1, 7: 0.2, 9: 0.7 },
    dependencias: ['r7'],
    sub_rubros: [],
  },
  {
    id: 'r12', num: '12', nombre: 'Carpinterías',
    monto: 160_180_474, avance: 0,
    mes_inicio: 4, mes_fin: 10,
    dist_mensual: { 4: 0.1, 5: 0.3, 6: 0.3, 7: 0.1, 8: 0.1, 9: 0.1 },
    dependencias: ['r5'],
    sub_rubros: [],
  },
  {
    id: 'r13', num: '13', nombre: 'Herrería',
    monto: 16_032_162, avance: 0,
    mes_inicio: 6, mes_fin: 10,
    dist_mensual: { 6: 0.3, 7: 0.35, 8: 0.15, 9: 0.1, 10: 0.1 },
    dependencias: ['r5'],
    sub_rubros: [],
  },
  {
    id: 'r14', num: '14', nombre: 'Pinturas',
    monto: 65_296_828, avance: 0,
    mes_inicio: 6, mes_fin: 10,
    dist_mensual: { 6: 0.1, 7: 0.1, 8: 0.2, 9: 0.2, 10: 0.4 },
    dependencias: ['r7', 'r11'],
    sub_rubros: [],
  },
  {
    id: 'r15', num: '15', nombre: 'Muebles, Mesadas y Espejos',
    monto: 15_512_029, avance: 0,
    mes_inicio: 7, mes_fin: 10,
    dist_mensual: { 7: 0.5, 8: 0.1, 9: 0.2, 10: 0.2 },
    dependencias: ['r14'],
    sub_rubros: [],
  },
  {
    id: 'r16', num: '16', nombre: 'Instalación Sanitaria',
    monto: 55_227_275, avance: 0,
    mes_inicio: 1, mes_fin: 10,
    dist_mensual: { 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1, 6: 0.1, 7: 0.1, 8: 0.1, 9: 0.1, 10: 0.1 },
    dependencias: ['r3'],
    sub_rubros: [],
  },
  {
    id: 'r17', num: '17', nombre: 'Instalación Eléctrica',
    monto: 75_822_603, avance: 0,
    mes_inicio: 2, mes_fin: 10,
    dist_mensual: { 2: 0.1, 3: 0.2, 4: 0.2, 5: 0.1, 6: 0.1, 7: 0.1, 8: 0.1, 9: 0.1 },
    dependencias: ['r3'],
    sub_rubros: [],
  },
  {
    id: 'r18', num: '18', nombre: 'Climatización',
    monto: 51_123_916, avance: 0,
    mes_inicio: 3, mes_fin: 10,
    dist_mensual: { 3: 0.4, 7: 0.1, 8: 0.2, 9: 0.2, 10: 0.1 },
    dependencias: ['r5'],
    sub_rubros: [],
  },
  {
    id: 'r19', num: '19', nombre: 'Red de Datos, Audio y Video',
    monto: 39_013_797, avance: 0,
    mes_inicio: 4, mes_fin: 10,
    dist_mensual: { 4: 0.15, 5: 0.1, 6: 0.1, 7: 0.3, 8: 0.1, 10: 0.25 },
    dependencias: ['r17'],
    sub_rubros: [],
  },
  {
    id: 'r20', num: '20', nombre: 'Seguridad e Higiene',
    monto: 9_117_096, avance: 0,
    mes_inicio: 8, mes_fin: 10,
    dist_mensual: { 8: 0.5, 10: 0.5 },
    dependencias: ['r12'],
    sub_rubros: [],
  },
  {
    id: 'r21', num: '21', nombre: 'Señalética',
    monto: 6_884_637, avance: 0,
    mes_inicio: 8, mes_fin: 10,
    dist_mensual: { 8: 0.5, 10: 0.5 },
    dependencias: ['r14'],
    sub_rubros: [],
  },
  {
    id: 'r22', num: '22', nombre: 'Jardinería y Equipamiento Exterior',
    monto: 2_792_732, avance: 0,
    mes_inicio: 8, mes_fin: 10,
    dist_mensual: { 8: 0.5, 10: 0.5 },
    dependencias: ['r9'],
    sub_rubros: [],
  },
];

const RUBROS_MAP = Object.fromEntries(RUBROS.map((r) => [r.id, r]));

const CERTIFICADOS_INIT = [
  { id: 'c1', numero: '001', fecha: '10/02/2026', rubro: 'Trabajos Preliminares',         rubro_id: 'r1', avance_pct: 100, monto: 34_629_353, notas: 'Demolición y acometidas completadas.' },
  { id: 'c2', numero: '002', fecha: '28/02/2026', rubro: 'Excavaciones y Mov. de Suelos', rubro_id: 'r2', avance_pct: 100, monto: 39_506_537, notas: 'Relleno y compactación finalizados.' },
  { id: 'c3', numero: '003', fecha: '31/03/2026', rubro: 'Estructuras',                   rubro_id: 'r3', avance_pct: 50,  monto: 39_543_152, notas: 'Bases, vigas fundación y encadenados terminados.' },
  { id: 'c4', numero: '004', fecha: '15/04/2026', rubro: 'Cubiertas Metálicas',           rubro_id: 'r4', avance_pct: 20,  monto: 20_847_056, notas: 'Avance parcial cubierta existente.' },
  { id: 'c5', numero: '005', fecha: '05/05/2026', rubro: 'Estructuras',                   rubro_id: 'r3', avance_pct: 68,  monto: 14_235_534, notas: 'Avance adicional vigas y losas visto.' },
];

const CUOTAS_INIT = [
  { id: 'q1', numero: 1, tipo: 'fecha',       descripcion: 'Anticipo',               fecha: '01/03/2026', rubro_id: null, condicion: null,                              monto: 248_018_771, estado: 'cobrado'  },
  { id: 'q2', numero: 2, tipo: 'certificado', descripcion: 'Avance estructural',      fecha: null,         rubro_id: 'r3', condicion: 'Estructuras al 100%',             monto: 310_023_463, estado: 'esperando'},
  { id: 'q3', numero: 3, tipo: 'certificado', descripcion: 'Cerramiento de la obra',  fecha: null,         rubro_id: 'r5', condicion: 'Cubierta + Mampostería al 100%',  monto: 248_018_771, estado: 'bloqueada'},
  { id: 'q4', numero: 4, tipo: 'hito',        descripcion: 'Habilitación municipal',  fecha: null,         rubro_id: null, condicion: 'Obtención de habilitación final',  monto: 186_014_078, estado: 'bloqueada'},
  { id: 'q5', numero: 5, tipo: 'fecha',       descripcion: 'Final de obra',           fecha: '01/01/2027', rubro_id: null, condicion: null,                              monto: 248_018_772, estado: 'bloqueada'},
];

const ANEXOS_INIT = [
  {
    id: 'a1', numero: '001', fecha: '15/03/2026', tipo: 'adicion',
    motivo: 'Ampliación sanitarios planta alta',
    detalle: 'Cliente solicita 2 baños adicionales en planta alta según plano Rev.3.',
    monto_diferencia: 8_500_000,
    rubros_afectados: [{ rubro: 'Instalación Sanitaria', anterior: 55_227_275, nuevo: 63_727_275 }],
    cuota_vinculada: 'Cuota 3 — +$8.5M',
  },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text.primary', tooltip }) {
  const card = (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
  return tooltip ? <Tooltip title={tooltip} arrow>{card}</Tooltip> : card;
}

// ─── Chip helpers ─────────────────────────────────────────────────────────────

const ESTADO_CUOTA = {
  cobrado:   { label: 'Cobrado',   color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  esperando: { label: 'En espera', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  bloqueada: { label: 'Bloqueada', color: 'default', icon: <LockIcon fontSize="small" /> },
};

const TIPO_CUOTA_ICON = {
  fecha:       <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />,
  certificado: <VerifiedIcon fontSize="small" sx={{ mr: 0.5 }} />,
  hito:        <FlagIcon fontSize="small" sx={{ mr: 0.5 }} />,
};

const TIPO_CUOTA_LABEL = { fecha: 'Fecha', certificado: 'Certificado', hito: 'Hito' };

const avanceColor   = (p) => p === 100 ? 'success' : p > 0 ? 'warning' : 'default';
const avanceBarColor = (p) => p === 100 ? 'success' : p > 0 ? 'warning' : 'inherit';

// ─── Tab: Ejecución ───────────────────────────────────────────────────────────

function TabEjecucion({ rubros, certificados }) {
  const [expandedR, setExpandedR]   = useState({});
  const [expandedSR, setExpandedSR] = useState({});

  // Certificado = avance físico formalizado en documento. Son la misma cosa.
  // La distinción real es certificado vs. cobrado (plata efectivamente recibida).
  const totalPresupuestado = PROYECTO.total;
  const montoCertificado   = certificados.reduce((s, c) => s + c.monto, 0);
  const pctCertificado     = (montoCertificado / totalPresupuestado) * 100;
  const montoCobrado       = CUOTAS_INIT.filter((q) => q.estado === 'cobrado').reduce((s, q) => s + q.monto, 0);
  const porCobrar          = Math.max(montoCertificado - montoCobrado, 0);
  const saldoObra          = totalPresupuestado - montoCertificado;

  return (
    <Box>
      {/* KPIs */}
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard
          label="Presupuesto total"
          value={fmtM(totalPresupuestado)}
          sub="22 rubros · contrato original"
          tooltip="Suma de todos los rubros del presupuesto profesional aceptado."
        />
        <KpiCard
          label="Certificado"
          value={fmtM(montoCertificado)}
          sub={`${pctCertificado.toFixed(1)}% de avance físico`}
          color="warning.main"
          tooltip="Avance físico formalizado en certificados de obra. El % indica cuánto del contrato está hecho y documentado."
        />
        <KpiCard
          label="Cobrado"
          value={fmtM(montoCobrado)}
          sub={`${((montoCobrado / totalPresupuestado) * 100).toFixed(1)}% del contrato`}
          color="success.main"
          tooltip="Dinero efectivamente recibido del cliente (cuotas cobradas del plan de cobro)."
        />
        <KpiCard
          label="Saldo de obra"
          value={fmtM(saldoObra)}
          sub="pendiente de certificar"
          tooltip="Monto que falta ejecutar y certificar para completar la obra."
        />
        {porCobrar > 0 && (
          <KpiCard
            label="Por cobrar"
            value={fmtM(porCobrar)}
            sub="certificado no cobrado aún"
            color="warning.dark"
            tooltip="Trabajo ya certificado que el cliente todavía no pagó."
          />
        )}
      </Stack>

      {/* Tabla 3 niveles */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'neutral.50' }}>
              <TableCell width={40} />
              <TableCell>Rubro / Sub-rubro / Ítem</TableCell>
              <TableCell align="right">Presupuestado</TableCell>
              <TableCell>Cronograma</TableCell>
              <TableCell>Certificado</TableCell>
              <TableCell align="right">Saldo</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rubros.map((r) => {
              const saldo  = r.monto * (1 - r.avance / 100);
              const hasSub = r.sub_rubros?.length > 0;
              return (
                <React.Fragment key={r.id}>
                  {/* NIVEL 1 — Rubro */}
                  <TableRow
                    hover
                    sx={{ cursor: hasSub ? 'pointer' : 'default', bgcolor: 'neutral.50' }}
                    onClick={() => hasSub && setExpandedR((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  >
                    <TableCell sx={{ pl: 1 }}>
                      {hasSub && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpandedR((p) => ({ ...p, [r.id]: !p[r.id] })); }}>
                          {expandedR[r.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={700}>{r.num}. {r.nombre}</Typography>
                        {r.dependencias?.length > 0 && (
                          <Tooltip title={`Depende de: ${r.dependencias.map((d) => RUBROS_MAP[d]?.num).join(', ')}`} arrow>
                            <LinkIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{fmt(r.monto)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <DateRangeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {mesAFecha(r.mes_inicio)} → {mesAFecha(r.mes_fin)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress variant="determinate" value={r.avance} color={avanceBarColor(r.avance)} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'neutral.100' }} />
                        <Typography variant="caption" width={32} textAlign="right">{r.avance}%</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">{fmt(saldo)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={r.avance === 100 ? 'Completo' : r.avance > 0 ? 'En curso' : 'Pendiente'} color={avanceColor(r.avance)} />
                    </TableCell>
                  </TableRow>

                  {/* NIVEL 2 — Sub-rubros (solo cuando expandido, sin Collapse ni tabla anidada) */}
                  {hasSub && expandedR[r.id] && r.sub_rubros.map((sr) => {
                    const hasTareas = sr.tareas?.length > 0;
                    const srKey = `${r.id}_${sr.id}`;
                    return (
                      <React.Fragment key={sr.id}>
                        <TableRow
                          hover
                          sx={{ cursor: hasTareas ? 'pointer' : 'default', bgcolor: 'background.paper' }}
                          onClick={() => hasTareas && setExpandedSR((p) => ({ ...p, [srKey]: !p[srKey] }))}
                        >
                          <TableCell sx={{ pl: 3 }}>
                            {hasTareas && (
                              <IconButton size="small">
                                {expandedSR[srKey] ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell sx={{ pl: 4 }}>
                            <Typography variant="body2" color="text.secondary">{sr.num} {sr.nombre}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">{fmt(sr.monto)}</Typography>
                          </TableCell>
                          <TableCell />
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <LinearProgress variant="determinate" value={sr.avance} color={avanceBarColor(sr.avance)} sx={{ flex: 1, height: 4, borderRadius: 3, bgcolor: 'neutral.100' }} />
                              <Typography variant="caption" width={32} textAlign="right">{sr.avance}%</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" color="text.disabled">{fmt(sr.monto * (1 - sr.avance / 100))}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={sr.avance === 100 ? 'Completo' : sr.avance > 0 ? 'En curso' : 'Pendiente'} color={avanceColor(sr.avance)} />
                          </TableCell>
                        </TableRow>

                        {/* NIVEL 3 — Ítems (solo cuando expandido) */}
                        {hasTareas && expandedSR[srKey] && sr.tareas.map((t, i) => (
                          <TableRow key={i} sx={{ bgcolor: 'neutral.50' }}>
                            <TableCell />
                            <TableCell sx={{ pl: 7 }}>
                              <Typography variant="caption" color="text.disabled">↳ {t.nombre}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color="text.disabled">{fmt(t.monto)}</Typography>
                            </TableCell>
                            <TableCell />
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <LinearProgress variant="determinate" value={t.avance} color={avanceBarColor(t.avance)} sx={{ flex: 1, height: 3, borderRadius: 3, bgcolor: 'neutral.100' }} />
                                <Typography variant="caption" width={32} textAlign="right">{t.avance}%</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color="text.disabled">{fmt(t.monto * (1 - t.avance / 100))}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip size="small" label={t.avance === 100 ? 'Completo' : t.avance > 0 ? 'En curso' : 'Pend.'} color={avanceColor(t.avance)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Total */}
            <TableRow sx={{ bgcolor: 'neutral.100' }}>
              <TableCell />
              <TableCell><Typography variant="body2" fontWeight={700}>TOTAL</Typography></TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(PROYECTO.total)}</Typography></TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">{mesAFecha(1)} → {mesAFecha(10)}</Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress variant="determinate" value={pctCertificado} color="warning" sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'neutral.100' }} />
                  <Typography variant="caption" width={32} textAlign="right">{pctCertificado.toFixed(1)}%</Typography>
                </Stack>
              </TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(PROYECTO.total - montoCertificado)}</Typography></TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Tab: Plan de Cobro ────────────────────────────────────────────────────────

function TabPlanCobro({ cuotas, rubros, onAgregarCuota }) {
  const totalCobrado   = cuotas.filter((q) => q.estado === 'cobrado').reduce((s, q) => s + q.monto, 0);
  const totalPendiente = cuotas.filter((q) => q.estado !== 'cobrado').reduce((s, q) => s + q.monto, 0);
  const proximaCuota   = cuotas.find((q) => q.estado === 'esperando');

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Cobrado" value={fmtM(totalCobrado)} sub={`${((totalCobrado / PROYECTO.total) * 100).toFixed(1)}% del contrato`} color="success.main" />
        <KpiCard label="Por cobrar" value={fmtM(totalPendiente)} sub={`${cuotas.filter((q) => q.estado !== 'cobrado').length} cuotas pendientes`} />
        <KpiCard label="Próxima cuota" value={proximaCuota ? fmtM(proximaCuota.monto) : '—'} sub={proximaCuota ? 'En espera de certificado' : 'Sin cuotas pendientes'} color="warning.main" />
      </Stack>

      <Stack spacing={2}>
        {cuotas.map((q) => {
          const est      = ESTADO_CUOTA[q.estado];
          const rubroRef = rubros.find((r) => r.id === q.rubro_id);
          return (
            <Card key={q.id} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: q.estado === 'cobrado' ? 'success.main' : q.estado === 'esperando' ? 'warning.main' : 'divider' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>CUOTA {q.numero}</Typography>
                    <Chip size="small" label={TIPO_CUOTA_LABEL[q.tipo]} icon={TIPO_CUOTA_ICON[q.tipo]} variant="outlined" sx={{ fontSize: 11 }} />
                  </Stack>
                  <Chip size="small" label={est.label} color={est.color} icon={est.icon} />
                </Stack>

                <Typography variant="subtitle1" fontWeight={700} mt={1}>{q.descripcion}</Typography>

                {q.tipo === 'fecha' && q.fecha && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>Vencimiento: {q.fecha}</Typography>
                )}
                {q.tipo === 'certificado' && (
                  <Stack direction="row" alignItems="center" spacing={1} mt={0.5} flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary">Condición: {q.condicion}</Typography>
                    {rubroRef && (
                      <Chip size="small" label={`Avance actual: ${rubroRef.avance}%`} color={rubroRef.avance === 100 ? 'success' : 'warning'} />
                    )}
                  </Stack>
                )}
                {q.tipo === 'hito' && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>Hito: {q.condicion}</Typography>
                )}

                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight={700}>{fmt(q.monto)}</Typography>
                  {q.estado === 'esperando' && (
                    <Button size="small" variant="contained" color="warning" startIcon={<VerifiedIcon />}>Registrar cobro</Button>
                  )}
                  {q.estado === 'bloqueada' && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LockIcon fontSize="inherit" /> Bloqueada hasta cumplir condición
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Box mt={2} display="flex" justifyContent="flex-end">
        <Button variant="outlined" startIcon={<AddIcon />} onClick={onAgregarCuota}>Agregar cuota</Button>
      </Box>
    </Box>
  );
}

// ─── Dialog: Nuevo Certificado ────────────────────────────────────────────────

function DialogNuevoCertificado({ open, onClose, rubros, onGuardar }) {
  const [rubroId, setRubroId] = useState('');
  const [avance,  setAvance]  = useState('');
  const [notas,   setNotas]   = useState('');

  const rubroSel       = rubros.find((r) => r.id === rubroId);
  const avanceNum      = Number(avance);
  const montoEstimado  = rubroSel ? rubroSel.monto * (Math.max(avanceNum - rubroSel.avance, 0) / 100) : 0;
  const desbloquea     = avanceNum === 100 && rubroSel;

  const handleGuardar = () => {
    onGuardar({ rubroId, rubroNombre: rubroSel?.nombre, avance: avanceNum, monto: montoEstimado, notas });
    setRubroId(''); setAvance(''); setNotas('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo certificado de avance</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Rubro</InputLabel>
            <Select value={rubroId} onChange={(e) => setRubroId(e.target.value)} label="Rubro">
              {rubros.map((r) => (
                <MenuItem key={r.id} value={r.id} disabled={r.avance === 100}>
                  <Stack direction="row" justifyContent="space-between" width="100%">
                    <span>{r.num}. {r.nombre}</span>
                    <Typography variant="caption" color="text.secondary">Actual: {r.avance}%</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="% de avance certificado"
            size="small"
            type="number"
            value={avance}
            onChange={(e) => setAvance(e.target.value)}
            inputProps={{ min: rubroSel?.avance ?? 0, max: 100 }}
            helperText={rubroSel ? `Avance previo: ${rubroSel.avance}%. Monto a certificar: ${fmt(montoEstimado)}` : ''}
          />

          <TextField
            label="Notas"
            size="small"
            multiline
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Descripción del avance certificado..."
          />

          {desbloquea && (
            <Alert severity="success" icon={<VerifiedIcon />}>
              Al certificar al 100% se desbloqueará la <strong>Cuota 2 — Avance estructural</strong> ($310M).
            </Alert>
          )}
          {avanceNum > 0 && avanceNum < 100 && rubroSel && (
            <Alert severity="info">
              Avance adicional de <strong>{avanceNum - rubroSel.avance}%</strong> en <strong>{rubroSel.nombre}</strong>.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={!rubroId || !avanceNum}>Guardar certificado</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab: Certificados ────────────────────────────────────────────────────────

function TabCertificados({ certificados, rubros, onNuevoCert }) {
  const totalCert = certificados.reduce((s, c) => s + c.monto, 0);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap flex={1}>
          <KpiCard label="Certificados emitidos" value={certificados.length} sub={`Total: ${fmtM(totalCert)}`} />
          <KpiCard label="Último certificado" value={certificados.at(-1)?.fecha ?? '—'} sub={certificados.at(-1)?.rubro ?? ''} />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevoCert} sx={{ ml: 2, flexShrink: 0 }}>Nuevo certificado</Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'neutral.50' }}>
              <TableCell>#</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Rubro</TableCell>
              <TableCell align="center">% Avance</TableCell>
              <TableCell align="right">Monto certificado</TableCell>
              <TableCell>Notas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...certificados].reverse().map((c) => (
              <TableRow key={c.id} hover>
                <TableCell><Chip size="small" label={`#${c.numero}`} variant="outlined" /></TableCell>
                <TableCell><Typography variant="body2">{c.fecha}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={500}>{c.rubro}</Typography></TableCell>
                <TableCell align="center"><Chip size="small" label={`${c.avance_pct}%`} color={c.avance_pct === 100 ? 'success' : 'warning'} /></TableCell>
                <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmt(c.monto)}</Typography></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{c.notas}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Dialog: Nuevo Anexo ──────────────────────────────────────────────────────

function DialogNuevoAnexo({ open, onClose, onGuardar }) {
  const [step,         setStep]         = useState(0);
  const [tipo,         setTipo]         = useState('adicion');
  const [motivo,       setMotivo]       = useState('');
  const [monto,        setMonto]        = useState('');
  const [accionCuota,  setAccionCuota]  = useState('crear');

  const handleGuardar = () => {
    onGuardar({ tipo, motivo, monto: Number(monto), accionCuota });
    setStep(0); setTipo('adicion'); setMotivo(''); setMonto(''); setAccionCuota('crear');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo anexo</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
          <Step><StepLabel>Datos del anexo</StepLabel></Step>
          <Step><StepLabel>Plan de cobro</StepLabel></Step>
        </Stepper>

        {step === 0 && (
          <Stack spacing={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)} label="Tipo">
                <MenuItem value="adicion">Adición — suma monto</MenuItem>
                <MenuItem value="deduccion">Deducción — resta monto</MenuItem>
                <MenuItem value="modificacion">Modificación — reemplaza rubro</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Motivo" size="small" multiline rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descripción del cambio solicitado..." />
            <TextField label={tipo === 'deduccion' ? 'Monto a deducir ($)' : 'Monto del adicional ($)'} size="small" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
            {monto && (
              <Alert severity={tipo === 'deduccion' ? 'warning' : 'info'}>
                Nuevo total: <strong>{fmt(PROYECTO.total + (tipo === 'deduccion' ? -Number(monto) : Number(monto)))}</strong>
              </Alert>
            )}
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              El anexo modifica el contrato en <strong>{tipo === 'deduccion' ? '-' : '+'}{fmt(Number(monto))}</strong>. ¿Cómo impacta en el plan de cobro?
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Acción</InputLabel>
              <Select value={accionCuota} onChange={(e) => setAccionCuota(e.target.value)} label="Acción">
                <MenuItem value="crear">Crear cuota nueva para este monto</MenuItem>
                <MenuItem value="modificar">Modificar monto de cuota existente</MenuItem>
                <MenuItem value="ignorar">No modificar el plan de cobro ahora</MenuItem>
              </Select>
            </FormControl>
            {accionCuota === 'crear'    && <Alert severity="success"><AddIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Se creará una nueva cuota de <strong>{fmt(Number(monto))}</strong> vinculada a este anexo.</Alert>}
            {accionCuota === 'modificar' && <Alert severity="info"><ArrowForwardIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Podrás seleccionar qué cuota ajustar.</Alert>}
            {accionCuota === 'ignorar'   && <Alert severity="warning">El plan de cobro no se modificará. Podés hacerlo manualmente más tarde.</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {step === 0 ? (
          <><Button onClick={onClose}>Cancelar</Button><Button variant="contained" onClick={() => setStep(1)} disabled={!motivo || !monto}>Siguiente</Button></>
        ) : (
          <><Button onClick={() => setStep(0)}>Atrás</Button><Button variant="contained" onClick={handleGuardar}>Guardar anexo</Button></>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab: Anexos ──────────────────────────────────────────────────────────────

function TabAnexos({ anexos, onNuevoAnexo }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap flex={1}>
          <KpiCard
            label="Anexos registrados"
            value={anexos.length}
            sub={`Δ total: +${fmtM(anexos.reduce((s, a) => s + (a.tipo === 'deduccion' ? -a.monto_diferencia : a.monto_diferencia), 0))}`}
          />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevoAnexo} sx={{ ml: 2, flexShrink: 0 }}>Nuevo anexo</Button>
      </Stack>

      {anexos.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No hay anexos registrados en esta obra.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {anexos.map((a) => (
            <Card key={a.id} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: a.tipo === 'deduccion' ? 'error.main' : 'info.main' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={`Anexo #${a.numero}`} variant="outlined" />
                    <Chip size="small" label={a.tipo === 'adicion' ? 'Adición' : a.tipo === 'deduccion' ? 'Deducción' : 'Modificación'} color={a.tipo === 'deduccion' ? 'error' : 'info'} />
                    <Typography variant="caption" color="text.secondary">{a.fecha}</Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={700} color={a.tipo === 'deduccion' ? 'error.main' : 'info.main'}>
                    {a.tipo === 'deduccion' ? '-' : '+'}{fmt(a.monto_diferencia)}
                  </Typography>
                </Stack>

                <Typography variant="subtitle2" fontWeight={600} mt={1}>{a.motivo}</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>{a.detalle}</Typography>

                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Rubro afectado</Typography>
                    <Typography variant="body2">{a.rubros_afectados[0]?.rubro}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmt(a.rubros_afectados[0]?.anterior)} <ArrowForwardIcon sx={{ fontSize: 10, verticalAlign: 'middle' }} /> {fmt(a.rubros_afectados[0]?.nuevo)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vinculado al plan de cobro</Typography>
                    <Typography variant="body2">{a.cuota_vinculada}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ─── Tab: Cronograma (Gantt) ──────────────────────────────────────────────────

const TOTAL_MESES = 10;

function ganttColor(avance) {
  if (avance === 100) return '#4caf50';
  if (avance > 0) return '#ff9800';
  return '#bdbdbd';
}

function GanttBar({ mesInicio, mesFin, avance, height = 22 }) {
  const left  = `${((mesInicio - 1) / TOTAL_MESES) * 100}%`;
  const width = `${((mesFin - mesInicio + 1) / TOTAL_MESES) * 100}%`;
  return (
    <Box position="relative" flex={1} height={height} bgcolor="grey.100" borderRadius={1} minWidth={TOTAL_MESES * 52}>
      <Box sx={{ position: 'absolute', left, width, height: '100%', bgcolor: ganttColor(avance), borderRadius: 1, display: 'flex', alignItems: 'center', px: 0.5 }}>
        {avance > 0 && (
          <Typography variant="caption" sx={{ color: 'white', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {avance}%
          </Typography>
        )}
      </Box>
      {avance > 0 && avance < 100 && (
        <Box sx={{ position: 'absolute', left, width: `${((mesFin - mesInicio + 1) / TOTAL_MESES) * 100 * (avance / 100)}%`, height: '100%', bgcolor: '#e65100', borderRadius: '4px 0 0 4px', opacity: 0.45 }} />
      )}
    </Box>
  );
}

function TabCronograma({ rubros }) {
  const [expandedR,  setExpandedR]  = useState({});
  const [expandedSR, setExpandedSR] = useState({});

  const labels = useMemo(() => Array.from({ length: TOTAL_MESES }, (_, i) => mesAFecha(i + 1)), []);

  const toggleR  = (id) => setExpandedR((p)  => ({ ...p, [id]: !p[id] }));
  const toggleSR = (key) => setExpandedSR((p) => ({ ...p, [key]: !p[key] }));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Cronograma de obra</Typography>
        <Typography variant="caption" color="text.secondary">Hacé clic en un rubro para ver el detalle</Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
        {/* Cabecera meses */}
        <Box display="flex" mb={1} ml="240px">
          {labels.map((lbl, i) => (
            <Box key={i} flex={1} textAlign="center" minWidth={52}>
              <Typography variant="caption" color="text.secondary" fontSize={10}>{lbl}</Typography>
            </Box>
          ))}
        </Box>

        {rubros.map((r) => {
          const hasSub = r.sub_rubros?.length > 0;
          const isExpR = expandedR[r.id];
          return (
            <React.Fragment key={r.id}>
              {/* ── NIVEL 1 — Rubro ── */}
              <Box
                display="flex" alignItems="center" mb={0.5}
                sx={{ cursor: hasSub ? 'pointer' : 'default', '&:hover': hasSub ? { bgcolor: 'action.hover' } : {} }}
                onClick={() => hasSub && toggleR(r.id)}
              >
                <Box width={240} flexShrink={0} pr={1} display="flex" alignItems="center" gap={0.5}>
                  {hasSub
                    ? <IconButton size="small" sx={{ p: 0, mr: 0.25 }} onClick={(e) => { e.stopPropagation(); toggleR(r.id); }}>
                        {isExpR ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    : <Box width={20} />
                  }
                  <Typography variant="caption" noWrap fontWeight={700} sx={{ maxWidth: 200 }}>
                    {r.num}. {r.nombre}
                  </Typography>
                </Box>
                <GanttBar mesInicio={r.mes_inicio} mesFin={r.mes_fin} avance={r.avance} height={22} />
              </Box>

              {/* ── NIVEL 2 — Sub-rubros ── */}
              {hasSub && isExpR && r.sub_rubros.map((sr) => {
                const hasTareas = sr.tareas?.length > 0;
                const srKey     = `${r.id}_${sr.id}`;
                const isExpSR   = expandedSR[srKey];
                return (
                  <React.Fragment key={sr.id}>
                    <Box
                      display="flex" alignItems="center" mb={0.5} pl={1}
                      sx={{ cursor: hasTareas ? 'pointer' : 'default', '&:hover': hasTareas ? { bgcolor: 'action.hover' } : {} }}
                      onClick={() => hasTareas && toggleSR(srKey)}
                    >
                      <Box width={240} flexShrink={0} pr={1} display="flex" alignItems="center" gap={0.5}>
                        <Box width={16} />
                        {hasTareas
                          ? <IconButton size="small" sx={{ p: 0, mr: 0.25 }} onClick={(e) => { e.stopPropagation(); toggleSR(srKey); }}>
                              {isExpSR ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                            </IconButton>
                          : <Box width={18} />
                        }
                        <Typography variant="caption" noWrap color="text.secondary" sx={{ maxWidth: 175 }}>
                          {sr.num} {sr.nombre}
                        </Typography>
                      </Box>
                      {/* Sub-rubro hereda el rango del padre */}
                      <GanttBar mesInicio={r.mes_inicio} mesFin={r.mes_fin} avance={sr.avance} height={18} />
                    </Box>

                    {/* ── NIVEL 3 — Tareas ── */}
                    {hasTareas && isExpSR && sr.tareas.map((t, i) => (
                      <Box key={i} display="flex" alignItems="center" mb={0.5} pl={2}>
                        <Box width={240} flexShrink={0} pr={1} display="flex" alignItems="center" gap={0.5}>
                          <Box width={38} />
                          <Typography variant="caption" noWrap color="text.disabled" sx={{ maxWidth: 155 }}>
                            ↳ {t.nombre}
                          </Typography>
                        </Box>
                        <GanttBar mesInicio={r.mes_inicio} mesFin={r.mes_fin} avance={t.avance} height={14} />
                      </Box>
                    ))}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Leyenda */}
        <Stack direction="row" spacing={2.5} mt={3} justifyContent="center">
          {[['#4caf50', 'Completo'], ['#ff9800', 'En curso'], ['#bdbdbd', 'Pendiente']].map(([color, lbl]) => (
            <Stack key={lbl} direction="row" alignItems="center" spacing={0.5}>
              <Box width={12} height={12} bgcolor={color} borderRadius={0.5} />
              <Typography variant="caption" color="text.secondary">{lbl}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

// ─── Tab: Flujo de Caja ───────────────────────────────────────────────────────

function TabFlujoCaja({ rubros }) {
  const labels = useMemo(() => Array.from({ length: TOTAL_MESES }, (_, i) => mesAFecha(i + 1)), []);

  const monthlyTotals = useMemo(
    () =>
      Array.from({ length: TOTAL_MESES }, (_, i) => {
        const mes = i + 1;
        return Math.round(rubros.reduce((s, r) => s + r.monto * (r.dist_mensual[mes] || 0), 0) / 1_000_000);
      }),
    [rubros],
  );

  const cumulative = useMemo(
    () => monthlyTotals.reduce((acc, v, i) => { acc.push((i > 0 ? acc[i - 1] : 0) + v); return acc; }, []),
    [monthlyTotals],
  );

  const picoMes     = Math.max(...monthlyTotals);
  const picoLabel   = labels[monthlyTotals.indexOf(picoMes)];
  const totalAcum   = cumulative[cumulative.length - 1];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>Flujo de caja proyectado</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Distribución mensual del monto contratado según plan de trabajo. En millones de pesos.
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Pico de inversión mensual" value={`$${picoMes}M`} sub={picoLabel} color="warning.main" />
        <KpiCard label="Inversión total proyectada" value={`$${totalAcum}M`} sub="10 meses" />
        <KpiCard
          label="Mes con mayor actividad"
          value={picoLabel}
          sub={`$${picoMes}M — ${((picoMes / totalAcum) * 100).toFixed(1)}% del total`}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Inversión mensual ($M)</Typography>
        <BarChart
          series={[{ data: monthlyTotals, label: '$M por mes', color: '#1976d2' }]}
          xAxis={[{ data: labels, scaleType: 'band' }]}
          yAxis={[{ label: '$M' }]}
          height={300}
          margin={{ top: 10, bottom: 40, left: 55, right: 10 }}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Avance financiero acumulado ($M)</Typography>
        <LineChart
          series={[{ data: cumulative, label: 'Acumulado $M', color: '#388e3c', area: true }]}
          xAxis={[{ data: labels, scaleType: 'band' }]}
          yAxis={[{ label: '$M' }]}
          height={270}
          margin={{ top: 10, bottom: 40, left: 60, right: 10 }}
        />
      </Paper>
    </Box>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

function MockObraPage() {
  const [tab,          setTab]          = useState(0);
  const [rubros,       setRubros]       = useState(RUBROS);
  const [certificados, setCertificados] = useState(CERTIFICADOS_INIT);
  const [cuotas,       setCuotas]       = useState(CUOTAS_INIT);
  const [anexos,       setAnexos]       = useState(ANEXOS_INIT);
  const [dlgCert,      setDlgCert]      = useState(false);
  const [dlgAnexo,     setDlgAnexo]     = useState(false);

  const handleGuardarCert = ({ rubroId, rubroNombre, avance, monto, notas }) => {
    const nuevo = {
      id: `c${certificados.length + 1}`,
      numero: String(certificados.length + 1).padStart(3, '0'),
      fecha: new Date().toLocaleDateString('es-AR'),
      rubro: rubroNombre, rubro_id: rubroId, avance_pct: avance, monto, notas,
    };
    setCertificados((p) => [...p, nuevo]);
    setRubros((prev) => prev.map((r) => r.id === rubroId ? { ...r, avance } : r));
    if (avance === 100) {
      setCuotas((prev) => prev.map((q) => q.rubro_id === rubroId && q.estado === 'esperando' ? { ...q, estado: 'cobrado' } : q));
    }
  };

  const handleGuardarAnexo = ({ tipo, motivo, monto, accionCuota }) => {
    const numero = String(anexos.length + 1).padStart(3, '0');
    setAnexos((p) => [...p, {
      id: `a${p.length + 1}`, numero, fecha: new Date().toLocaleDateString('es-AR'),
      tipo, motivo, detalle: '', monto_diferencia: monto, rubros_afectados: [],
      cuota_vinculada: accionCuota === 'crear' ? 'Nueva cuota creada' : accionCuota === 'modificar' ? 'Cuota modificada' : 'Sin cambios',
    }]);
    if (accionCuota === 'crear') {
      setCuotas((p) => [...p, {
        id: `q${p.length + 1}`, numero: p.length + 1, tipo: 'hito',
        descripcion: motivo, fecha: null, rubro_id: null,
        condicion: `Según Anexo #${numero}`, monto, estado: 'bloqueada',
      }]);
    }
  };

  const montoCertificado = certificados.reduce((s, c) => s + c.monto, 0);

  return (
    <>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.darkest', color: 'white', px: 3, py: 2.5 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <Chip size="small" label="En ejecución" color="warning" sx={{ fontWeight: 700 }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Presupuesto Profesional · Actualizado a febrero 2026
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>{PROYECTO.nombre}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                {PROYECTO.cliente} · {PROYECTO.direccion}
              </Typography>
            </Box>
            <Stack alignItems="flex-end">
              <Typography variant="h4" fontWeight={700}>{fmt(PROYECTO.total)}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {PROYECTO.duracion} · {mesAFecha(1)} — {mesAFecha(10)}
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="xl">
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Ejecución" />
            <Tab label={`Plan de cobro (${cuotas.length})`} />
            <Tab label={`Certificados (${certificados.length})`} />
            <Tab label={`Anexos (${anexos.length})`} />
            <Tab label="Cronograma" />
            <Tab label="Flujo de caja" />
          </Tabs>
        </Container>
      </Box>

      {/* Contenido */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {tab === 0 && <TabEjecucion rubros={rubros} certificados={certificados} />}
        {tab === 1 && <TabPlanCobro cuotas={cuotas} rubros={rubros} onAgregarCuota={() => {}} />}
        {tab === 2 && <TabCertificados certificados={certificados} rubros={rubros} onNuevoCert={() => setDlgCert(true)} />}
        {tab === 3 && <TabAnexos anexos={anexos} onNuevoAnexo={() => setDlgAnexo(true)} />}
        {tab === 4 && <TabCronograma rubros={rubros} />}
        {tab === 5 && <TabFlujoCaja rubros={rubros} />}
      </Container>

      <DialogNuevoCertificado open={dlgCert} onClose={() => setDlgCert(false)} rubros={rubros} onGuardar={handleGuardarCert} />
      <DialogNuevoAnexo open={dlgAnexo} onClose={() => setDlgAnexo(false)} onGuardar={handleGuardarAnexo} />
    </>
  );
}

export default function Page() {
  return (
    <DashboardLayout title="Mock — Control de Obra">
      <MockObraPage />
    </DashboardLayout>
  );
}
