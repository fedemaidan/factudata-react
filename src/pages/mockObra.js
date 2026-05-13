import React, { useState, useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  Box, Container, Typography, Chip, Stack, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Divider, IconButton, Paper, Alert, Stepper, Step, StepLabel, Tooltip,
  ToggleButtonGroup, ToggleButton, Fab,
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
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ForumIcon from '@mui/icons-material/Forum';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BusinessIcon from '@mui/icons-material/Business';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EditNoteIcon from '@mui/icons-material/EditNote';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const fmtM = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

const TOTAL_MESES = 10;

// Calcula fecha real a partir de mes relativo (1-10) y fecha de inicio del proyecto
const INICIO = new Date(2026, 2, 1); // Marzo 2026
const mesAFecha = (mes) => {
  const d = new Date(INICIO);
  d.setMonth(d.getMonth() + mes - 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
};

// Convierte "DD/MM/YYYY" a mes relativo al proyecto (1–10). Pre-inicio → 1.
const fechaToMes = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/').map(Number);
  const mes = (y - 2026) * 12 + (m - 3) + 1; // marzo 2026 = 1
  return Math.max(1, Math.min(TOTAL_MESES, mes));
};

const hoy = new Date(2026, 4, 13); // 13/05/2026 — fecha mock del demo
const diasDesde = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/').map(Number);
  return Math.round((hoy - new Date(y, m - 1, d)) / 86400000);
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const PROYECTO = {
  nombre: 'Edificio Corporativo — Bloque A',
  cliente: 'Desarrolladora Inmobiliaria SA',
  direccion: 'Av. del Libertador 2400, CABA',
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
  {
    id: 'c1', numero: '001', fecha: '10/02/2026', rubro: 'Trabajos Preliminares', rubro_id: 'r1',
    avance_pct: 100, monto: 34_629_353, notas: 'Demolición y acometidas completadas.',
    estado: 'aprobado', fecha_envio: '11/02/2026', fecha_aprobacion: '14/02/2026',
    adjuntos: ['foto_demolicion_final.jpg', 'foto_acometida_electrica.jpg'],
  },
  {
    id: 'c2', numero: '002', fecha: '28/02/2026', rubro: 'Excavaciones y Mov. de Suelos', rubro_id: 'r2',
    avance_pct: 100, monto: 39_506_537, notas: 'Relleno y compactación finalizados.',
    estado: 'aprobado', fecha_envio: '01/03/2026', fecha_aprobacion: '05/03/2026',
    adjuntos: ['foto_relleno_compactado.jpg', 'informe_densidad.pdf'],
  },
  {
    id: 'c3', numero: '003', fecha: '31/03/2026', rubro: 'Estructuras', rubro_id: 'r3',
    avance_pct: 50, monto: 39_543_152, notas: 'Bases, vigas fundación y encadenados terminados.',
    estado: 'aprobado', fecha_envio: '01/04/2026', fecha_aprobacion: '07/04/2026',
    adjuntos: ['foto_bases_ha.jpg', 'foto_encadenados.jpg', 'acta_inspeccion.pdf'],
  },
  {
    id: 'c4', numero: '004', fecha: '15/04/2026', rubro: 'Cubiertas Metálicas', rubro_id: 'r4',
    avance_pct: 20, monto: 20_847_056, notas: 'Avance parcial cubierta existente — chapa y aislación sector norte.',
    estado: 'enviado', fecha_envio: '16/04/2026', fecha_aprobacion: null,
    adjuntos: ['foto_cubierta_norte.jpg', 'foto_aislacion_termica.jpg'],
  },
  {
    id: 'c5', numero: '005', fecha: '05/05/2026', rubro: 'Estructuras', rubro_id: 'r3',
    avance_pct: 68, monto: 14_235_534, notas: 'Avance adicional vigas y losas visto.',
    estado: 'aprobado', fecha_envio: '06/05/2026', fecha_aprobacion: '09/05/2026',
    adjuntos: ['foto_vigas_hav.jpg', 'foto_losas_ha.jpg'],
  },
];

// monto_liberado: desbloqueado según % certificado aprobado acumulado por rubro
// q2 → r3 tiene 68% aprobado → 68% × $310M = $210.8M liberado
const CUOTAS_INIT = [
  { id: 'q1', numero: 1, tipo: 'fecha',       descripcion: 'Anticipo',              fecha: '01/03/2026', rubro_id: null, condicion: null,                             monto: 248_018_771, monto_liberado: 248_018_771, monto_cobrado: 248_018_771, fecha_cobro: '15/03/2026', estado: 'cobrado'  },
  { id: 'q2', numero: 2, tipo: 'certificado', descripcion: 'Avance estructural',     fecha: null,         rubro_id: 'r3', condicion: 'Estructuras certificadas',        monto: 310_023_463, monto_liberado: 210_815_955, monto_cobrado: 0,           fecha_cobro: null,         estado: 'esperando'},
  { id: 'q3', numero: 3, tipo: 'certificado', descripcion: 'Cerramiento de obra',    fecha: null,         rubro_id: 'r5', condicion: 'Cubiertas + Mampostería al 100%', monto: 248_018_771, monto_liberado: 0,           monto_cobrado: 0,           fecha_cobro: null,         estado: 'bloqueada'},
  { id: 'q4', numero: 4, tipo: 'hito',        descripcion: 'Habilitación municipal', fecha: null,         rubro_id: null, condicion: 'Obtención de habilitación final', monto: 186_014_078, monto_liberado: 0,           monto_cobrado: 0,           fecha_cobro: null,         estado: 'bloqueada'},
  { id: 'q5', numero: 5, tipo: 'fecha',       descripcion: 'Final de obra',          fecha: '01/01/2027', rubro_id: null, condicion: null,                             monto: 248_018_772, monto_liberado: 0,           monto_cobrado: 0,           fecha_cobro: null,         estado: 'bloqueada'},
];

// Gastos con imputación a rubros (para columna "Gastado real" en ejecución)
const GASTOS_INIT = [
  // r1 — certificado $34.6M · gastado $26.0M · margen +$8.6M
  { id: 'g1',  fecha: '05/02/2026', proveedor: 'Demoliciones Express SRL',  descripcion: 'Alquiler equipos demolición y retiro escombros',   categoria: 'contratista', monto: 12_500_000, imputaciones: [{ rubro_id: 'r1', monto_imputado: 12_500_000 }] },
  { id: 'g2',  fecha: '08/02/2026', proveedor: 'Varios',                       descripcion: 'Jornales febrero — cuadrilla demolición',          categoria: 'jornales',    monto:  7_800_000, imputaciones: [{ rubro_id: 'r1', monto_imputado: 7_800_000  }] },
  { id: 'g3',  fecha: '10/02/2026', proveedor: 'Empresa de Energía SA',                  descripcion: 'Acometida eléctrica + materiales',                 categoria: 'material',    monto:  5_700_000, imputaciones: [{ rubro_id: 'r1', monto_imputado: 5_700_000  }] },
  // r2 — certificado $39.5M · gastado $35.2M · margen +$4.3M
  { id: 'g4',  fecha: '18/02/2026', proveedor: 'Movimiento de Suelos SA',      descripcion: 'Excavaciones y relleno compactado',                categoria: 'contratista', monto: 28_000_000, imputaciones: [{ rubro_id: 'r2', monto_imputado: 28_000_000 }] },
  { id: 'g5',  fecha: '25/02/2026', proveedor: 'Distribuidora de Áridos SA',      descripcion: 'Tierra negra y base estabilizada',                 categoria: 'material',    monto:  7_200_000, imputaciones: [{ rubro_id: 'r2', monto_imputado: 7_200_000  }] },
  // r3 — certificado aprobado $53.8M · gastado $49.0M · margen +$4.8M
  { id: 'g6',  fecha: '10/03/2026', proveedor: 'Hormigones Premix SA',           descripcion: 'H°A° elaborado H-21 — bases y vigas fundación',    categoria: 'material',    monto: 18_500_000, imputaciones: [{ rubro_id: 'r3', monto_imputado: 18_500_000 }] },
  { id: 'g7',  fecha: '15/03/2026', proveedor: 'Aceromet SA',                     descripcion: 'Hierro Ø12 y Ø16 — armadura estructuras',          categoria: 'material',    monto: 14_000_000, imputaciones: [{ rubro_id: 'r3', monto_imputado: 14_000_000 }] },
  { id: 'g8',  fecha: '20/03/2026', proveedor: 'Varios',                       descripcion: 'Jornales marzo–abril — cuadrilla estructuras',     categoria: 'jornales',    monto:  9_800_000, imputaciones: [{ rubro_id: 'r3', monto_imputado: 9_800_000  }] },
  { id: 'g9',  fecha: '02/04/2026', proveedor: 'Hormigones Premix SA',           descripcion: 'H°A° H-21 — losas y vigas visto',                 categoria: 'material',    monto:  6_700_000, imputaciones: [{ rubro_id: 'r3', monto_imputado: 6_700_000  }] },
  // r4 — cert enviado $20.8M (pendiente aprobación) · gastado $23.9M · margen ⚠️
  { id: 'g10', fecha: '01/04/2026', proveedor: 'Chapas y Perfiles SA',               descripcion: 'Chapa galvanizada + aislación Thermolan',          categoria: 'material',    monto: 14_200_000, imputaciones: [{ rubro_id: 'r4', monto_imputado: 14_200_000 }] },
  { id: 'g11', fecha: '10/04/2026', proveedor: 'Herrería Industrial SRL',       descripcion: 'Estructura metálica cubierta sector norte',        categoria: 'contratista', monto:  5_800_000, imputaciones: [{ rubro_id: 'r4', monto_imputado: 5_800_000  }] },
  { id: 'g12', fecha: '12/04/2026', proveedor: 'Varios',                       descripcion: 'Jornales abril — cuadrilla cubierta',              categoria: 'jornales',    monto:  3_900_000, imputaciones: [{ rubro_id: 'r4', monto_imputado: 3_900_000  }] },
  // Gastos generales sin imputar
  { id: 'g13', fecha: '01/03/2026', proveedor: 'YPF',                          descripcion: 'Combustible maquinaria — marzo',                  categoria: 'combustible', monto:  1_200_000, imputaciones: [] },
  { id: 'g14', fecha: '01/04/2026', proveedor: 'YPF',                          descripcion: 'Combustible maquinaria — abril',                  categoria: 'combustible', monto:    980_000, imputaciones: [] },
  { id: 'g15', fecha: '15/03/2026', proveedor: 'ART Galeno',                   descripcion: 'ART + seguros de obra — Q1 2026',                 categoria: 'servicio',    monto:  2_400_000, imputaciones: [] },
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

// ─── Helpers de datos ─────────────────────────────────────────────────────────

const gastoRealPorRubro = (rubroId, gastos) =>
  gastos.reduce((sum, g) => sum + g.imputaciones.filter(i => i.rubro_id === rubroId).reduce((s, i) => s + i.monto_imputado, 0), 0);

const certMontoTotal = (rubroId, certs) =>
  certs.filter(c => c.rubro_id === rubroId).reduce((s, c) => s + c.monto, 0);

const certMontoAprobado = (rubroId, certs) =>
  certs.filter(c => c.rubro_id === rubroId && c.estado === 'aprobado').reduce((s, c) => s + c.monto, 0);

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
  cobrado:   { label: 'Cobrado',     color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  esperando: { label: 'Por cobrar',  color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  bloqueada: { label: 'Bloqueada',   color: 'default', icon: <LockIcon fontSize="small" /> },
};

const ESTADO_CERT = {
  borrador: { label: 'Borrador',    color: 'default', icon: <EditNoteIcon fontSize="small" /> },
  enviado:  { label: 'En revisión', color: 'warning', icon: <AccessTimeIcon fontSize="small" /> },
  aprobado: { label: 'Aprobado',    color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  rechazado:{ label: 'Rechazado',   color: 'error',   icon: <ThumbDownIcon fontSize="small" /> },
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

function TabEjecucion({ rubros, certificados, gastos }) {
  const [expandedR, setExpandedR]   = useState({});
  const [expandedSR, setExpandedSR] = useState({});

  const totalPresupuestado  = PROYECTO.total;
  const montoCertTot        = certificados.reduce((s, c) => s + c.monto, 0);
  const montoCertAprobado   = certificados.filter(c => c.estado === 'aprobado').reduce((s, c) => s + c.monto, 0);
  const montoEnviado        = montoCertTot - montoCertAprobado;
  const pctCertificado      = (montoCertTot / totalPresupuestado) * 100;
  const totalGastado        = gastos.reduce((s, g) => s + g.monto, 0);
  const margenEjecutado     = montoCertAprobado - gastos.filter(g => g.imputaciones.length > 0).reduce((s, g) => s + g.monto, 0);
  const certsPendientes     = certificados.filter(c => c.estado === 'enviado');

  return (
    <Box>
      {/* Banner: certs esperando aprobación del cliente */}
      {certsPendientes.length > 0 && (
        <Alert
          severity="warning"
          icon={<AccessTimeIcon />}
          sx={{ mb: 2 }}
          action={
            <Typography variant="caption" fontWeight={600} sx={{ alignSelf: 'center', mr: 1 }}>
              {fmtM(montoEnviado)} sin cobrar
            </Typography>
          }
        >
          <strong>{certsPendientes.length} certificado{certsPendientes.length > 1 ? 's' : ''} esperando aprobación del cliente</strong>
          {certsPendientes.map(c => {
            const dias = diasDesde(c.fecha_envio);
            return (
              <Typography key={c.id} variant="caption" display="block" mt={0.25}>
                Cert. #{c.numero} — {c.rubro} — enviado hace <strong>{dias} días</strong> ({fmtM(c.monto)})
              </Typography>
            );
          })}
        </Alert>
      )}

      {/* KPIs */}
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Presupuesto total" value={fmtM(totalPresupuestado)} sub="22 rubros · contrato original" tooltip="Suma de todos los rubros del PP aceptado." />
        <KpiCard label="Certificado" value={fmtM(montoCertTot)} sub={`${pctCertificado.toFixed(1)}% · ${montoCertAprobado < montoCertTot ? `${ fmtM(montoEnviado)} pend. aprobación` : 'todo aprobado'}`} color="warning.main" tooltip="Avance físico formalizado. Incluye enviados y aprobados." />
        <KpiCard label="Gastado real" value={fmtM(totalGastado)} sub={`${gastos.filter(g => g.imputaciones.length === 0).length} gastos sin imputar`} tooltip="Suma de todos los gastos registrados en caja, con o sin imputación." />
        <KpiCard
          label="Margen ejecutado"
          value={fmtM(Math.abs(margenEjecutado))}
          sub={margenEjecutado >= 0 ? `+${((margenEjecutado / montoCertAprobado) * 100).toFixed(1)}% sobre cert. aprobado` : 'Gastado > certificado aprobado'}
          color={margenEjecutado >= 0 ? 'success.main' : 'error.main'}
          tooltip="Certificado aprobado − gastos imputados. Margen bruto sobre la porción ya ejecutada."
        />
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
              <TableCell>Avance físico</TableCell>
              <TableCell align="right">Certificado $</TableCell>
              <TableCell align="right">Gastado real</TableCell>
              <TableCell align="right">Margen</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rubros.map((r) => {
              const hasSub      = r.sub_rubros?.length > 0;
              const certTotal   = certMontoTotal(r.id, certificados);
              const certAprov   = certMontoAprobado(r.id, certificados);
              const gastado     = gastoRealPorRubro(r.id, gastos);
              const margen      = certTotal > 0 ? certTotal - gastado : null;
              const hayEnviado  = certificados.some(c => c.rubro_id === r.id && c.estado === 'enviado');
              return (
                <React.Fragment key={r.id}>
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
                    <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmt(r.monto)}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <DateRangeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{mesAFecha(r.mes_inicio)} → {mesAFecha(r.mes_fin)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress variant="determinate" value={r.avance} color={avanceBarColor(r.avance)} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'neutral.100' }} />
                        <Typography variant="caption" width={32} textAlign="right">{r.avance}%</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {certTotal > 0 ? (
                        <Stack alignItems="flex-end">
                          <Typography variant="body2" fontWeight={600}>{fmt(certTotal)}</Typography>
                          {hayEnviado && <Typography variant="caption" color="warning.main" sx={{ fontSize: 10 }}>⏳ pend. aprob.</Typography>}
                        </Stack>
                      ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      {gastado > 0
                        ? <Typography variant="body2">{fmt(gastado)}</Typography>
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      {margen !== null && gastado > 0 ? (
                        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                          {margen >= 0
                            ? <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            : <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />}
                          <Typography variant="body2" fontWeight={600} color={margen >= 0 ? 'success.main' : 'error.main'}>
                            {margen >= 0 ? '+' : ''}{fmtM(margen)}
                          </Typography>
                        </Stack>
                      ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={r.avance === 100 ? 'Completo' : r.avance > 0 ? 'En curso' : 'Pendiente'} color={avanceColor(r.avance)} />
                    </TableCell>
                  </TableRow>

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
                          <TableCell sx={{ pl: 4 }}><Typography variant="body2" color="text.secondary">{sr.num} {sr.nombre}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" color="text.secondary">{fmt(sr.monto)}</Typography></TableCell>
                          <TableCell /><TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <LinearProgress variant="determinate" value={sr.avance} color={avanceBarColor(sr.avance)} sx={{ flex: 1, height: 4, borderRadius: 3, bgcolor: 'neutral.100' }} />
                              <Typography variant="caption" width={32} textAlign="right">{sr.avance}%</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell /><TableCell /><TableCell />
                          <TableCell align="center"><Chip size="small" label={sr.avance === 100 ? 'Completo' : sr.avance > 0 ? 'En curso' : 'Pendiente'} color={avanceColor(sr.avance)} /></TableCell>
                        </TableRow>

                        {hasTareas && expandedSR[srKey] && sr.tareas.map((t, i) => (
                          <TableRow key={i} sx={{ bgcolor: 'neutral.50' }}>
                            <TableCell />
                            <TableCell sx={{ pl: 7 }}><Typography variant="caption" color="text.disabled">↳ {t.nombre}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption" color="text.disabled">{fmt(t.monto)}</Typography></TableCell>
                            <TableCell /><TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <LinearProgress variant="determinate" value={t.avance} color={avanceBarColor(t.avance)} sx={{ flex: 1, height: 3, borderRadius: 3, bgcolor: 'neutral.100' }} />
                                <Typography variant="caption" width={32} textAlign="right">{t.avance}%</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell /><TableCell /><TableCell />
                            <TableCell align="center"><Chip size="small" label={t.avance === 100 ? 'Completo' : t.avance > 0 ? 'En curso' : 'Pend.'} color={avanceColor(t.avance)} /></TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}

            <TableRow sx={{ bgcolor: 'neutral.100' }}>
              <TableCell /><TableCell><Typography variant="body2" fontWeight={700}>TOTAL</Typography></TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(PROYECTO.total)}</Typography></TableCell>
              <TableCell><Typography variant="caption" color="text.secondary">{mesAFecha(1)} → {mesAFecha(10)}</Typography></TableCell>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress variant="determinate" value={pctCertificado} color="warning" sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'neutral.100' }} />
                  <Typography variant="caption" width={32} textAlign="right">{pctCertificado.toFixed(1)}%</Typography>
                </Stack>
              </TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(montoCertTot)}</Typography></TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(totalGastado)}</Typography></TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color={margenEjecutado >= 0 ? 'success.main' : 'error.main'}>
                  {margenEjecutado >= 0 ? '+' : ''}{fmtM(margenEjecutado)}
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Tab: Plan de Cobro ────────────────────────────────────────────────────────

function TabPlanCobro({ cuotas, rubros, onAgregarCuota, onCobrar }) {
  const totalCobrado    = cuotas.reduce((s, q) => s + q.monto_cobrado, 0);
  const totalLiberado   = cuotas.reduce((s, q) => s + q.monto_liberado, 0);
  const porCobrar       = totalLiberado - totalCobrado;
  const proximaCuota    = cuotas.find(q => q.estado === 'esperando');

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Cobrado" value={fmtM(totalCobrado)} sub={`${((totalCobrado / PROYECTO.total) * 100).toFixed(1)}% del contrato`} color="success.main" />
        <KpiCard label="Liberado por cobrar" value={fmtM(porCobrar)} sub="certificado aprobado, pendiente de cobro" color="warning.main" tooltip="Trabajo certificado y aprobado por el cliente que todavía no se cobró." />
        <KpiCard label="Próxima cuota" value={proximaCuota ? fmtM(proximaCuota.monto_liberado) : '—'} sub={proximaCuota ? `de ${fmtM(proximaCuota.monto)} total` : 'Sin cuotas disponibles'} color="warning.main" />
      </Stack>

      <Stack spacing={2}>
        {cuotas.map((q) => {
          const est      = ESTADO_CUOTA[q.estado];
          const rubroRef = rubros.find(r => r.id === q.rubro_id);
          const pctLib   = q.monto > 0 ? (q.monto_liberado / q.monto) * 100 : 0;
          const pctCob   = q.monto > 0 ? (q.monto_cobrado  / q.monto) * 100 : 0;

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
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {q.estado === 'cobrado' ? `Cobrado el ${q.fecha_cobro}` : `Vencimiento: ${q.fecha}`}
                  </Typography>
                )}

                {q.tipo === 'certificado' && (
                  <Box mt={1}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap">
                      <Typography variant="body2" color="text.secondary">Condición: {q.condicion}</Typography>
                      {rubroRef && <Chip size="small" label={`${rubroRef.nombre}: ${rubroRef.avance}% avanzado`} color={rubroRef.avance === 100 ? 'success' : 'warning'} />}
                    </Stack>
                    {/* Barra de liberado */}
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Liberado (cert. aprobado)</Typography>
                        <Typography variant="caption" fontWeight={600}>{fmtM(q.monto_liberado)} de {fmtM(q.monto)}</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={pctLib} color="warning" sx={{ height: 8, borderRadius: 4, bgcolor: 'neutral.100' }} />
                    </Stack>
                    {q.monto_cobrado > 0 && q.monto_cobrado < q.monto_liberado && (
                      <Stack spacing={0.5} mt={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Cobrado</Typography>
                          <Typography variant="caption" fontWeight={600}>{fmtM(q.monto_cobrado)}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pctCob} color="success" sx={{ height: 6, borderRadius: 4, bgcolor: 'neutral.100' }} />
                      </Stack>
                    )}
                  </Box>
                )}

                {q.tipo === 'hito' && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>Hito: {q.condicion}</Typography>
                )}

                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{fmt(q.monto)}</Typography>
                    {q.tipo === 'certificado' && q.monto_liberado > 0 && q.monto_cobrado === 0 && (
                      <Typography variant="caption" color="warning.main">Disponible para cobrar: {fmtM(q.monto_liberado)}</Typography>
                    )}
                    {q.estado === 'cobrado' && q.fecha_cobro && (
                      <Typography variant="caption" color="success.main">Cobrado el {q.fecha_cobro}</Typography>
                    )}
                  </Box>
                  {q.estado === 'esperando' && q.monto_liberado > 0 && (
                    <Button size="small" variant="contained" color="warning" startIcon={<CheckCircleIcon />} onClick={() => onCobrar(q.id)}>
                      Registrar cobro — {fmtM(q.monto_liberado)}
                    </Button>
                  )}
                  {q.estado === 'bloqueada' && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LockIcon fontSize="inherit" /> Bloqueada hasta cumplir condición
                    </Typography>
                  )}
                  {q.estado === 'cobrado' && (
                    <Chip size="small" label="Pagado" color="success" icon={<CheckCircleIcon />} />
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

// ─── Dialog: Nuevo Certificado (3 pasos) ──────────────────────────────────────

const ADJUNTOS_MOCK = ['foto_avance_1.jpg', 'foto_avance_2.jpg', 'medicion_parcial.pdf'];

function DialogNuevoCertificado({ open, onClose, rubros, cuotas, certificados, onGuardar }) {
  const [step,    setStep]    = useState(0);
  const [rubroId, setRubroId] = useState('');
  const [avance,  setAvance]  = useState('');
  const [notas,   setNotas]   = useState('');
  const [adjuntos,setAdjuntos]= useState([]);

  const rubroSel      = rubros.find(r => r.id === rubroId);
  const avanceNum     = Number(avance);
  const montoEstimado = rubroSel ? rubroSel.monto * (Math.max(avanceNum - rubroSel.avance, 0) / 100) : 0;

  // Cuotas que se desbloquearían (proporcional)
  const cuotasAfectadas = cuotas.filter(q => q.tipo === 'certificado' && q.rubro_id === rubroId && q.estado !== 'cobrado');

  const reset = () => { setStep(0); setRubroId(''); setAvance(''); setNotas(''); setAdjuntos([]); };

  const handleGuardar = () => {
    onGuardar({ rubroId, rubroNombre: rubroSel?.nombre, avance: avanceNum, monto: montoEstimado, notas, adjuntos, enviar: false });
    reset(); onClose();
  };

  const steps = ['Avance', 'Adjuntos', 'Envío'];

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo certificado de avance</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
          {steps.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Rubro</InputLabel>
              <Select value={rubroId} onChange={e => setRubroId(e.target.value)} label="Rubro">
                {rubros.map(r => (
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
              size="small" type="number" value={avance}
              onChange={e => setAvance(e.target.value)}
              inputProps={{ min: rubroSel?.avance ?? 0, max: 100 }}
              helperText={rubroSel ? `Avance previo: ${rubroSel.avance}%. Monto adicional: ${fmt(montoEstimado)}` : ''}
            />
            <TextField label="Descripción del avance" size="small" multiline rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Qué trabajo se completó..." />
            {cuotasAfectadas.length > 0 && avanceNum > 0 && (
              <Alert severity="info" icon={<VerifiedIcon />}>
                Al aprobarse este certificado se liberará <strong>{fmtM(Math.round(cuotasAfectadas[0].monto * avanceNum / 100))}</strong> de la {cuotasAfectadas[0].descripcion}.
              </Alert>
            )}
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Adjuntá fotos del avance y cualquier documentación relevante para incluir en el informe al cliente.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, border: '2px dashed', borderColor: 'divider', textAlign: 'center', cursor: 'pointer', bgcolor: 'action.hover' }}>
              <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Arrastrá fotos o hacé clic para seleccionar</Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setAdjuntos(ADJUNTOS_MOCK)}>Simular selección de archivos</Button>
            </Paper>
            {adjuntos.length > 0 && (
              <Stack spacing={0.5}>
                {adjuntos.map(a => (
                  <Stack key={a} direction="row" alignItems="center" spacing={1}>
                    <AttachFileIcon fontSize="small" color="action" />
                    <Typography variant="body2">{a}</Typography>
                    <Button size="small" color="error" onClick={() => setAdjuntos(p => p.filter(x => x !== a))}>Quitar</Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography variant="caption" color="text.secondary" display="block">Vista previa del informe</Typography>
                <Typography variant="subtitle2" fontWeight={700} mt={0.5}>{PROYECTO.nombre} — Cert. #{String(certificados.length + 1).padStart(3, '0')}</Typography>
                <Typography variant="body2" color="text.secondary">{rubroSel?.nombre} — {avance}% completado</Typography>
                <Typography variant="body2" color="text.secondary">Monto: {fmt(montoEstimado)}</Typography>
                {adjuntos.length > 0 && <Typography variant="caption" color="text.secondary">{adjuntos.length} adjunto{adjuntos.length > 1 ? 's' : ''}</Typography>}
              </CardContent>
            </Card>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} fullWidth size="large" color="error"
              onClick={() => alert('PDF generado: Certificado_' + (certificados.length + 1).toString().padStart(3,'0') + '_' + rubroSel?.nombre?.replace(/ /g,'_') + '.pdf\n\n(En producción esto descarga el archivo real)')}>
              Descargar informe PDF
            </Button>
            <Alert severity="info" icon={<SendIcon />}>
              Descargá el PDF y envialo vos desde tu mail a <strong>{PROYECTO.cliente}</strong>. Cuando el cliente apruebe, marcalo como aprobado desde la lista de certificados.
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {step > 0 && <Button onClick={() => setStep(p => p - 1)}>Atrás</Button>}
        <Button onClick={() => { reset(); onClose(); }}>Cancelar</Button>
        {step < 2
          ? <Button variant="contained" onClick={() => setStep(p => p + 1)} disabled={step === 0 && (!rubroId || !avanceNum)}>Siguiente</Button>
          : <Button variant="contained" startIcon={<EditNoteIcon />} onClick={handleGuardar}>Guardar borrador</Button>
        }
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Informe del Certificado (vista del cliente) ──────────────────────

function DialogInformeCertificado({ open, onClose, cert, onAprobar, onRechazar }) {
  if (!cert) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PictureAsPdfIcon color="error" />
        Informe de Certificado #{cert.numero}
      </DialogTitle>
      <DialogContent>
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          {/* Cabecera */}
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Obra</Typography>
              <Typography variant="subtitle1" fontWeight={700}>{PROYECTO.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">{PROYECTO.cliente}</Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="overline" color="text.secondary">Certificado</Typography>
              <Typography variant="h6" fontWeight={700}>#{cert.numero}</Typography>
              <Typography variant="body2" color="text.secondary">{cert.fecha}</Typography>
            </Box>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {/* Detalle */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rubro</TableCell>
                  <TableCell align="center">Avance</TableCell>
                  <TableCell align="right">Monto certificado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><Typography variant="body2" fontWeight={600}>{cert.rubro}</Typography></TableCell>
                  <TableCell align="center"><Chip size="small" label={`${cert.avance_pct}%`} color={cert.avance_pct === 100 ? 'success' : 'warning'} /></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(cert.monto)}</Typography></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          {cert.notas && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">Observaciones</Typography>
              <Typography variant="body2">{cert.notas}</Typography>
            </Box>
          )}
          {cert.adjuntos?.length > 0 && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">Adjuntos ({cert.adjuntos.length})</Typography>
              <Stack spacing={0.5} mt={0.5}>
                {cert.adjuntos.map(a => (
                  <Stack key={a} direction="row" alignItems="center" spacing={1}>
                    <AttachFileIcon fontSize="small" color="action" />
                    <Typography variant="body2">{a}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>

        {cert.estado === 'enviado' && (
          <Alert severity="warning" icon={<AccessTimeIcon />}>
            Enviado el {cert.fecha_envio} · esperando aprobación del cliente · {diasDesde(cert.fecha_envio)} días
          </Alert>
        )}
        {cert.estado === 'aprobado' && (
          <Alert severity="success" icon={<CheckCircleIcon />}>Aprobado por el cliente el {cert.fecha_aprobacion}.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {cert.estado === 'enviado' && (
          <>
            <Button color="error" startIcon={<ThumbDownIcon />} onClick={() => { onRechazar(cert.id); onClose(); }}>Rechazar (simular)</Button>
            <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => { onAprobar(cert.id); onClose(); }}>Aprobar (simular)</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Simulador WhatsApp ───────────────────────────────────────────────

const WA_STEPS = [
  { from: 'director', text: 'certifico el 80% de mampostería y tabiques, adjunto foto' },
  { from: 'director', img: true },
  { from: 'bot', text: '✅ Entendí el mensaje. Esto es lo que voy a registrar:' },
  { from: 'bot', preview: true },
  { from: 'bot', text: 'Confirmás? Respondé *sí* para guardar como borrador o *enviar* para mandar al cliente.' },
];

function DialogWASimulator({ open, onClose, rubros, onGuardar }) {
  const [paso, setPaso] = useState(0);

  const r5 = rubros.find(r => r.id === 'r5');
  const montoEst = r5 ? r5.monto * 0.80 : 0;

  const handleConfirmar = () => {
    onGuardar({ rubroId: 'r5', rubroNombre: r5?.nombre ?? 'Mampostería y Tabiques', avance: 80, monto: montoEst, notas: 'Cargado desde WhatsApp.', adjuntos: ['foto_wa_mamposteria.jpg'], enviar: false });
    setPaso(0); onClose();
  };

  return (
    <Dialog open={open} onClose={() => { setPaso(0); onClose(); }} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#075e54', color: 'white' }}>
        <ForumIcon /> Bot Sorbydata · WhatsApp
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#ece5dd', p: 1.5 }}>
        <Stack spacing={1} mt={1}>
          {WA_STEPS.slice(0, paso + 1).map((s, i) => (
            <Box key={i} display="flex" justifyContent={s.from === 'director' ? 'flex-end' : 'flex-start'}>
              <Paper elevation={1} sx={{
                maxWidth: '80%', px: 1.5, py: 1, borderRadius: 2,
                bgcolor: s.from === 'director' ? '#dcf8c6' : 'white',
                borderTopRightRadius: s.from === 'director' ? 0 : 2,
                borderTopLeftRadius:  s.from === 'bot'      ? 0 : 2,
              }}>
                {s.img && <Box sx={{ width: 140, height: 90, bgcolor: 'grey.300', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}><PhotoCameraIcon color="action" /></Box>}
                {s.preview && r5 && (
                  <Box sx={{ bgcolor: '#f0f0f0', p: 1, borderRadius: 1, mb: 0.5, borderLeft: 3, borderLeftColor: '#128c7e' }}>
                    <Typography variant="caption" fontWeight={700} display="block">📋 Certificado de avance</Typography>
                    <Typography variant="caption" display="block">Rubro: {r5.nombre}</Typography>
                    <Typography variant="caption" display="block">Avance: 80%</Typography>
                    <Typography variant="caption" display="block" fontWeight={600}>Monto: {fmtM(montoEst)}</Typography>
                  </Box>
                )}
                {s.text && <Typography variant="body2" sx={{ fontSize: 13 }}>{s.text}</Typography>}
                <Typography variant="caption" color="text.disabled" display="block" textAlign="right" sx={{ fontSize: 10, mt: 0.25 }}>13/05/26 10:4{i}</Typography>
              </Paper>
            </Box>
          ))}

          {paso === WA_STEPS.length - 1 && (
            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
              <Paper elevation={1} sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: '#dcf8c6', cursor: 'pointer' }} onClick={handleConfirmar}>
                <Typography variant="body2" sx={{ fontSize: 13 }}>sí</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>13/05/26 10:4{WA_STEPS.length}</Typography>
              </Paper>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#f0f0f0' }}>
        <Button onClick={() => { setPaso(0); onClose(); }}>Cerrar</Button>
        {paso < WA_STEPS.length - 1 && (
          <Button variant="contained" sx={{ bgcolor: '#128c7e', '&:hover': { bgcolor: '#075e54' } }} onClick={() => setPaso(p => p + 1)}>
            Siguiente mensaje
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab: Certificados ────────────────────────────────────────────────────────

function TabCertificados({ certificados, rubros, onNuevoCert, onEnviar, onAprobar, onRechazar, onWA, readOnly }) {
  const [certInforme, setCertInforme] = useState(null);
  const totalCert   = certificados.reduce((s, c) => s + c.monto, 0);
  const aprobados   = certificados.filter(c => c.estado === 'aprobado').length;
  const pendientes  = certificados.filter(c => c.estado === 'enviado').length;

  return (
    <Box position="relative">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap flex={1}>
          <KpiCard label="Emitidos" value={certificados.length} sub={`${aprobados} aprobados · ${pendientes} en revisión`} />
          <KpiCard label="Total certificado" value={fmtM(totalCert)} sub="aprobados + enviados" color="warning.main" />
        </Stack>
        {!readOnly && (
          <Stack direction="row" spacing={1} ml={2} flexShrink={0}>
            <Button variant="outlined" startIcon={<ForumIcon />} onClick={onWA} size="small">Simular bot WA</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevoCert}>Nuevo certificado</Button>
          </Stack>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'neutral.50' }}>
              <TableCell>#</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Rubro</TableCell>
              <TableCell align="center">Avance</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell>Enviado</TableCell>
              {!readOnly && <TableCell align="center">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...certificados].reverse().map(c => {
              const est = ESTADO_CERT[c.estado];
              const dias = c.fecha_envio ? diasDesde(c.fecha_envio) : null;
              return (
                <TableRow key={c.id} hover>
                  <TableCell><Chip size="small" label={`#${c.numero}`} variant="outlined" /></TableCell>
                  <TableCell><Typography variant="body2">{c.fecha}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{c.rubro}</Typography>
                    {c.adjuntos?.length > 0 && (
                      <Typography variant="caption" color="text.disabled"><AttachFileIcon sx={{ fontSize: 11, verticalAlign: 'middle' }} />{c.adjuntos.length}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center"><Chip size="small" label={`${c.avance_pct}%`} color={c.avance_pct === 100 ? 'success' : 'warning'} /></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmt(c.monto)}</Typography></TableCell>
                  <TableCell align="center"><Chip size="small" label={est.label} color={est.color} icon={est.icon} /></TableCell>
                  <TableCell>
                    {c.fecha_envio
                      ? <Typography variant="caption" color={c.estado === 'enviado' && dias > 14 ? 'error.main' : 'text.secondary'}>
                          {c.fecha_envio}{c.estado === 'enviado' ? ` · ${dias}d` : ''}
                        </Typography>
                      : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  {!readOnly && (
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Ver informe"><IconButton size="small" onClick={() => setCertInforme(c)}><PictureAsPdfIcon fontSize="small" /></IconButton></Tooltip>
                        {c.estado === 'borrador' && (
                          <Tooltip title="Enviar al cliente"><IconButton size="small" color="primary" onClick={() => onEnviar(c.id)}><SendIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                        {c.estado === 'enviado' && (
                          <Tooltip title="Marcar aprobado (simular cliente)"><IconButton size="small" color="success" onClick={() => onAprobar(c.id)}><ThumbUpIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                        {c.estado === 'enviado' && (
                          <Tooltip title="Marcar rechazado (simular cliente)"><IconButton size="small" color="error" onClick={() => onRechazar(c.id)}><ThumbDownIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogInformeCertificado
        open={!!certInforme} cert={certInforme}
        onClose={() => setCertInforme(null)}
        onAprobar={(id) => { onAprobar(id); setCertInforme(null); }}
        onRechazar={(id) => { onRechazar(id); setCertInforme(null); }}
      />
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

function TabFlujoCaja({ rubros, certificados, cuotas }) {
  const labels = useMemo(() => Array.from({ length: TOTAL_MESES }, (_, i) => mesAFecha(i + 1)), []);

  const planMensual = useMemo(
    () => Array.from({ length: TOTAL_MESES }, (_, i) => {
      const mes = i + 1;
      return Math.round(rubros.reduce((s, r) => s + r.monto * (r.dist_mensual[mes] || 0), 0) / 1_000_000);
    }),
    [rubros],
  );

  const planAcum = useMemo(
    () => planMensual.reduce((acc, v, i) => { acc.push((i > 0 ? acc[i - 1] : 0) + v); return acc; }, []),
    [planMensual],
  );

  // Certificado aprobado acumulado por mes (en $M)
  const certAcum = useMemo(() => {
    const porMes = Array(TOTAL_MESES).fill(0);
    certificados.filter(c => c.estado === 'aprobado').forEach(c => {
      const m = fechaToMes(c.fecha_aprobacion ?? c.fecha);
      if (m) porMes[m - 1] += c.monto;
    });
    return porMes.reduce((acc, v, i) => { acc.push(Math.round(((i > 0 ? acc[i - 1] * 1_000_000 : 0) + v) / 1_000_000)); return acc; }, []);
  }, [certificados]);

  // Cobrado acumulado por mes (en $M)
  const cobradoAcum = useMemo(() => {
    const porMes = Array(TOTAL_MESES).fill(0);
    cuotas.filter(q => q.monto_cobrado > 0).forEach(q => {
      const m = fechaToMes(q.fecha_cobro ?? q.fecha);
      if (m) porMes[m - 1] += q.monto_cobrado;
    });
    return porMes.reduce((acc, v, i) => { acc.push(Math.round(((i > 0 ? acc[i - 1] * 1_000_000 : 0) + v) / 1_000_000)); return acc; }, []);
  }, [cuotas]);

  const mesActual  = fechaToMes('13/05/2026') ?? 3;
  const atraso     = planAcum[mesActual - 1] - certAcum[mesActual - 1];
  const picoMes    = Math.max(...planMensual);
  const picoLabel  = labels[planMensual.indexOf(picoMes)];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>Curva S — Plan vs. Ejecución real</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Comparación entre lo planificado, lo certificado y lo cobrado. En millones de pesos acumulados.
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Planificado al mes actual" value={`$${planAcum[mesActual - 1]}M`} sub={labels[mesActual - 1]} />
        <KpiCard label="Certificado al mes actual" value={`$${certAcum[mesActual - 1]}M`} sub="solo certs aprobados" color="warning.main" />
        <KpiCard label="Atraso financiero" value={`$${atraso}M`} sub="plan − certificado" color={atraso > 50 ? 'error.main' : 'text.primary'} tooltip="Cuánto deberías haber certificado vs. lo que certificaste. Lluvia y burocracia explicada aquí." />
        <KpiCard label="Cobrado" value={`$${cobradoAcum[mesActual - 1]}M`} sub="cuotas efectivamente cobradas" color="success.main" />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Inversión mensual planificada ($M)</Typography>
        <BarChart
          series={[{ data: planMensual, label: 'Plan mensual $M', color: '#90caf9' }]}
          xAxis={[{ data: labels, scaleType: 'band' }]}
          yAxis={[{ label: '$M' }]}
          height={260}
          margin={{ top: 10, bottom: 40, left: 55, right: 10 }}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Acumulado ($M) — Plan vs. Certificado vs. Cobrado</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Azul = plan · Naranja = certificado aprobado · Verde = cobrado
        </Typography>
        <LineChart
          series={[
            { data: planAcum,    label: 'Plan acumulado',        color: '#1976d2' },
            { data: certAcum,    label: 'Certificado aprobado',  color: '#f57c00' },
            { data: cobradoAcum, label: 'Cobrado',               color: '#388e3c' },
          ]}
          xAxis={[{ data: labels, scaleType: 'band' }]}
          yAxis={[{ label: '$M' }]}
          height={300}
          margin={{ top: 10, bottom: 40, left: 60, right: 10 }}
        />
      </Paper>
    </Box>
  );
}

// ─── Config de tabs por rol ───────────────────────────────────────────────────

const TABS_CONFIG = [
  { key: 'ejecucion',  label: 'Ejecución',     roles: ['admin', 'director'] },
  { key: 'cobro',      label: 'Plan de cobro', roles: ['admin', 'comercial'] },
  { key: 'certs',      label: 'Certificados',  roles: ['admin', 'director', 'comercial'] },
  { key: 'anexos',     label: 'Anexos',        roles: ['admin', 'director'] },
  { key: 'cronograma', label: 'Cronograma',    roles: ['admin', 'director'] },
  { key: 'caja',       label: 'Flujo de caja', roles: ['admin', 'comercial'] },
];

const ROL_INFO = {
  director:  { label: 'Director de obra', icon: <EngineeringIcon fontSize="small" /> },
  comercial: { label: 'Comercial',        icon: <BusinessIcon fontSize="small" /> },
  admin:     { label: 'Administrativo',   icon: <ManageAccountsIcon fontSize="small" /> },
};

// ─── Página principal ──────────────────────────────────────────────────────────

function MockObraPage() {
  const [tab,          setTab]          = useState(0);
  const [rol,          setRol]          = useState('admin');
  const [rubros,       setRubros]       = useState(RUBROS);
  const [certificados, setCertificados] = useState(CERTIFICADOS_INIT);
  const [cuotas,       setCuotas]       = useState(CUOTAS_INIT);
  const [gastos]                        = useState(GASTOS_INIT);
  const [anexos,       setAnexos]       = useState(ANEXOS_INIT);
  const [dlgCert,      setDlgCert]      = useState(false);
  const [dlgAnexo,     setDlgAnexo]     = useState(false);
  const [dlgWA,        setDlgWA]        = useState(false);

  const visibleTabs = TABS_CONFIG.filter(t => t.roles.includes(rol));
  const activeKey   = visibleTabs[tab]?.key;

  const handleRolChange = (_, nuevoRol) => {
    if (!nuevoRol) return;
    setRol(nuevoRol);
    setTab(0);
  };

  // Crear cert como borrador (o enviado si el usuario eligió enviar)
  const handleGuardarCert = ({ rubroId, rubroNombre, avance, monto, notas, adjuntos, enviar }) => {
    const numero = String(certificados.length + 1).padStart(3, '0');
    const hoyStr = hoy.toLocaleDateString('es-AR');
    const nuevo = {
      id: `c${certificados.length + 1}`, numero,
      fecha: hoyStr, rubro: rubroNombre, rubro_id: rubroId,
      avance_pct: avance, monto, notas, adjuntos: adjuntos ?? [],
      estado: enviar ? 'enviado' : 'borrador',
      fecha_envio: enviar ? hoyStr : null,
      fecha_aprobacion: null,
    };
    setCertificados(p => [...p, nuevo]);
    setRubros(prev => prev.map(r => r.id === rubroId ? { ...r, avance } : r));
  };

  const handleEnviarCert = (certId) => {
    setCertificados(prev => prev.map(c =>
      c.id === certId ? { ...c, estado: 'enviado', fecha_envio: hoy.toLocaleDateString('es-AR') } : c
    ));
  };

  const handleAprobarCert = (certId) => {
    const cert = certificados.find(c => c.id === certId);
    if (!cert) return;
    const hoyStr = hoy.toLocaleDateString('es-AR');
    setCertificados(prev => prev.map(c => c.id === certId ? { ...c, estado: 'aprobado', fecha_aprobacion: hoyStr } : c));
    // Desbloqueo proporcional: mayor avance aprobado para ese rubro entre todos los certs
    const maxAvance = Math.max(
      cert.avance_pct,
      ...certificados.filter(c => c.rubro_id === cert.rubro_id && c.estado === 'aprobado').map(c => c.avance_pct)
    );
    setCuotas(prev => prev.map(q => {
      if (q.tipo !== 'certificado' || q.rubro_id !== cert.rubro_id) return q;
      const nuevoLiberado = Math.round(q.monto * maxAvance / 100);
      return {
        ...q,
        monto_liberado: nuevoLiberado,
        estado: nuevoLiberado > 0 && q.estado === 'bloqueada' ? 'esperando' : q.estado,
      };
    }));
  };

  const handleRechazarCert = (certId) => {
    setCertificados(prev => prev.map(c => c.id === certId ? { ...c, estado: 'rechazado' } : c));
  };

  const handleCobrarCuota = (cuotaId) => {
    setCuotas(prev => prev.map(q => {
      if (q.id !== cuotaId) return q;
      const montoCobrado = q.monto_liberado;
      return {
        ...q,
        monto_cobrado: montoCobrado,
        fecha_cobro: hoy.toLocaleDateString('es-AR'),
        estado: montoCobrado >= q.monto ? 'cobrado' : 'esperando',
      };
    }));
  };

  const handleGuardarAnexo = ({ tipo, motivo, monto, accionCuota }) => {
    const numero = String(anexos.length + 1).padStart(3, '0');
    setAnexos(p => [...p, {
      id: `a${p.length + 1}`, numero, fecha: hoy.toLocaleDateString('es-AR'),
      tipo, motivo, detalle: '', monto_diferencia: monto, rubros_afectados: [],
      cuota_vinculada: accionCuota === 'crear' ? 'Nueva cuota creada' : accionCuota === 'modificar' ? 'Cuota modificada' : 'Sin cambios',
    }]);
    if (accionCuota === 'crear') {
      setCuotas(p => [...p, {
        id: `q${p.length + 1}`, numero: p.length + 1, tipo: 'hito',
        descripcion: motivo, fecha: null, rubro_id: null,
        condicion: `Según Anexo #${numero}`, monto,
        monto_liberado: 0, monto_cobrado: 0, fecha_cobro: null, estado: 'bloqueada',
      }]);
    }
  };

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
                  Presupuesto Profesional · Actualizado mayo 2026
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>{PROYECTO.nombre}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                {PROYECTO.cliente} · {PROYECTO.direccion}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={1}>
              <Typography variant="h4" fontWeight={700}>{fmt(PROYECTO.total)}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {PROYECTO.duracion} · {mesAFecha(1)} — {mesAFecha(10)}
              </Typography>
              {/* Selector de rol */}
              <ToggleButtonGroup value={rol} exclusive onChange={handleRolChange} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                {Object.entries(ROL_INFO).map(([k, v]) => (
                  <ToggleButton key={k} value={k} sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.25)', color: 'white' }, px: 1.5, py: 0.5, fontSize: 11 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>{v.icon}<span>{v.label}</span></Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="xl">
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            {visibleTabs.map((t, i) => {
              const count = t.key === 'cobro' ? cuotas.length : t.key === 'certs' ? certificados.length : t.key === 'anexos' ? anexos.length : null;
              return <Tab key={t.key} label={count !== null ? `${t.label} (${count})` : t.label} />;
            })}
          </Tabs>
        </Container>
      </Box>

      {/* Contenido */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {activeKey === 'ejecucion'  && <TabEjecucion rubros={rubros} certificados={certificados} gastos={gastos} />}
        {activeKey === 'cobro'      && <TabPlanCobro cuotas={cuotas} rubros={rubros} onAgregarCuota={() => {}} onCobrar={handleCobrarCuota} />}
        {activeKey === 'certs'      && <TabCertificados certificados={certificados} rubros={rubros} onNuevoCert={() => setDlgCert(true)} onEnviar={handleEnviarCert} onAprobar={handleAprobarCert} onRechazar={handleRechazarCert} onWA={() => setDlgWA(true)} readOnly={rol === 'comercial'} />}
        {activeKey === 'anexos'     && <TabAnexos anexos={anexos} onNuevoAnexo={() => setDlgAnexo(true)} />}
        {activeKey === 'cronograma' && <TabCronograma rubros={rubros} />}
        {activeKey === 'caja'       && <TabFlujoCaja rubros={rubros} certificados={certificados} cuotas={cuotas} />}
      </Container>

      <DialogNuevoCertificado open={dlgCert} onClose={() => setDlgCert(false)} rubros={rubros} cuotas={cuotas} certificados={certificados} onGuardar={handleGuardarCert} />
      <DialogNuevoAnexo open={dlgAnexo} onClose={() => setDlgAnexo(false)} onGuardar={handleGuardarAnexo} />
      <DialogWASimulator open={dlgWA} onClose={() => setDlgWA(false)} rubros={rubros} onGuardar={handleGuardarCert} />
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
