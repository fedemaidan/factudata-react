import React, { useState, useMemo, useEffect } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  Box, Container, Typography, Chip, Stack, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Divider, IconButton, Paper, Alert, Stepper, Step, StepLabel, Tooltip,
  ToggleButtonGroup, ToggleButton, Fab, Checkbox, FormControlLabel,
} from '@mui/material';
import { Layout as PublicLayout } from 'src/layouts/public/layout';
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
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import GroupsIcon from '@mui/icons-material/Groups';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SummarizeIcon from '@mui/icons-material/Summarize';
import TimelineIcon from '@mui/icons-material/Timeline';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ConstructionIcon from '@mui/icons-material/Construction';
import CalculateIcon from '@mui/icons-material/Calculate';
import SpeedIcon from '@mui/icons-material/Speed';

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

// ─── Contrato: moneda + redeterminación + deducciones (ajustes #1 y #2) ─────────
// Unidad de cuenta separada de la política de captura del coeficiente.
const CONTRATO = {
  unidad_cuenta: 'CAC',                  // 'ARS' | 'USD' | 'CAC'
  fecha_base: '01/03/2026',              // fecha de los precios del contrato → coef base = 1
  politica_redeterminacion: 'continua',  // 'firme' | 'continua' | 'por_salto' | 'periodica'
  umbral_salto_pct: 5,                   // si por_salto
  periodo_meses: 3,                      // si periodica
  retencion_pct: 0.05,                   // fondo de reparo (5%)
  anticipo_pct: 0.20,                    // anticipo (20%)
  amortiza_anticipo: true,               // cada certificado amortiza una fracción del anticipo
};

// Serie del índice CAC (base mar-2026 = 100). Valor por mes.
const SERIE_CAC = {
  codigo: 'CAC',
  valores: [
    { fecha: '01/02/2026', valor: 100 },
    { fecha: '01/03/2026', valor: 100 },
    { fecha: '01/04/2026', valor: 105 },
    { fecha: '01/05/2026', valor: 110 },
    { fecha: '01/06/2026', valor: 116 },
    { fecha: '01/07/2026', valor: 122 },
    { fecha: '01/08/2026', valor: 128 },
    { fecha: '01/09/2026', valor: 134 },
    { fecha: '01/10/2026', valor: 141 },
    { fecha: '01/11/2026', valor: 148 },
    { fecha: '01/12/2026', valor: 155 },
  ],
};

const UNIDAD_LABEL = { ARS: 'ARS', USD: 'USD', CAC: 'índice CAC' };

const idxKey = (str) => { const [, m, y] = str.split('/').map(Number); return y * 12 + m; };

// Índice vigente a una fecha = último valor de la serie con mes ≤ fecha.
const indiceEnFecha = (str) => {
  const k = idxKey(str);
  let val = SERIE_CAC.valores[0].valor;
  SERIE_CAC.valores.forEach(v => { if (idxKey(v.fecha) <= k) val = v.valor; });
  return val;
};

// Coeficiente de redeterminación a aplicar sobre el monto_base, según la política del contrato.
const coefRedeterminacion = (fechaValorizacion) => {
  const c = CONTRATO;
  if (!fechaValorizacion || c.politica_redeterminacion === 'firme') return 1;
  const base = indiceEnFecha(c.fecha_base);
  if (c.politica_redeterminacion === 'periodica') {
    // Recalcula cada `periodo_meses`: se snapea la fecha al inicio del bloque vigente.
    const k0 = idxKey(c.fecha_base);
    const bloques = Math.max(0, Math.floor((idxKey(fechaValorizacion) - k0) / c.periodo_meses));
    const kSnap = k0 + bloques * c.periodo_meses;
    const fechaSnap = `01/${String(kSnap % 12 || 12).padStart(2, '0')}/${Math.floor((kSnap - 1) / 12)}`;
    return indiceEnFecha(fechaSnap) / base;
  }
  if (c.politica_redeterminacion === 'por_salto') {
    // El coef sólo salta cuando la variación acumulada supera el umbral; entre saltos, congelado.
    let coefCong = 1, baseCong = base;
    for (const v of SERIE_CAC.valores) {
      if (idxKey(v.fecha) < idxKey(c.fecha_base) || idxKey(v.fecha) > idxKey(fechaValorizacion)) continue;
      if ((v.valor / baseCong - 1) * 100 >= c.umbral_salto_pct) { coefCong = v.valor / base; baseCong = v.valor; }
    }
    return coefCong;
  }
  // continua (default)
  return indiceEnFecha(fechaValorizacion) / base;
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
    historial_avance: [
      { fecha: '20/03/2026', avance_acumulado_pct: 50, registrado_por: 'Jefe de obra', fotos: ['fundaciones_listas.jpg'], nota: 'Bases y vigas de fundación terminadas.' },
      { fecha: '02/05/2026', avance_acumulado_pct: 68, registrado_por: 'Jefe de obra', fotos: ['losas_colado.jpg'], nota: 'Colado de losas nivel 1. Demora por lluvia la semana del 22/04.' },
    ],
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
    historial_avance: [
      { fecha: '15/04/2026', avance_acumulado_pct: 20, registrado_por: 'Jefe de obra', fotos: ['cubierta_norte.jpg'], nota: 'Chapa y aislación sector norte. Inconveniente: filtración en cumbrera a revisar.' },
    ],
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

/*
  Certificado = PERÍODO con RENGLONES (ajuste #3). Cada renglón es una línea por rubro.
  - monto_base: monto en la unidad de cuenta del contrato (precios fecha_base).
  - coeficiente_aplicado / monto_ars: CONGELADOS al aprobar (ajuste #1). En certs no aprobados
    van en null y se calculan en vivo con coefRedeterminacion(fecha_valorizacion).
  Los certs históricos aprobados traen el coef ya congelado a su fecha de valorización.
*/
const CERTIFICADOS_INIT = [
  {
    id: 'c1', numero: '001', fecha: '10/02/2026', periodo: '2026-02', fecha_valorizacion: '10/02/2026',
    notas: 'Demolición y acometidas completadas.',
    estado: 'aprobado', fecha_envio: '11/02/2026', fecha_aprobacion: '14/02/2026',
    aprobacion: { fecha_aprobacion_cliente: '14/02/2026', fecha_registro: '14/02/2026', medio: 'mail', registrado_por: 'director' },
    adjuntos: ['foto_demolicion_final.jpg', 'foto_acometida_electrica.jpg'],
    renglones: [
      { rubro_id: 'r1', rubro: 'Trabajos Preliminares', avance_acumulado_pct: 100, avance_periodo_pct: 100, monto_base: 34_629_353, coeficiente_aplicado: 1.000, monto_ars: 34_629_353 },
    ],
  },
  {
    id: 'c2', numero: '002', fecha: '28/02/2026', periodo: '2026-02', fecha_valorizacion: '28/02/2026',
    notas: 'Relleno y compactación finalizados.',
    estado: 'aprobado', fecha_envio: '01/03/2026', fecha_aprobacion: '05/03/2026',
    aprobacion: { fecha_aprobacion_cliente: '05/03/2026', fecha_registro: '05/03/2026', medio: 'whatsapp', registrado_por: 'director' },
    adjuntos: ['foto_relleno_compactado.jpg', 'informe_densidad.pdf'],
    renglones: [
      { rubro_id: 'r2', rubro: 'Excavaciones y Mov. de Suelos', avance_acumulado_pct: 100, avance_periodo_pct: 100, monto_base: 39_506_537, coeficiente_aplicado: 1.000, monto_ars: 39_506_537 },
    ],
  },
  {
    id: 'c3', numero: '003', fecha: '31/03/2026', periodo: '2026-03', fecha_valorizacion: '31/03/2026',
    notas: 'Bases, vigas fundación y encadenados terminados.',
    estado: 'aprobado', fecha_envio: '01/04/2026', fecha_aprobacion: '07/04/2026',
    aprobacion: { fecha_aprobacion_cliente: '07/04/2026', fecha_registro: '07/04/2026', medio: 'presencial', registrado_por: 'director' },
    adjuntos: ['foto_bases_ha.jpg', 'foto_encadenados.jpg', 'acta_inspeccion.pdf'],
    renglones: [
      { rubro_id: 'r3', rubro: 'Estructuras', avance_acumulado_pct: 50, avance_periodo_pct: 50, monto_base: 39_543_152, coeficiente_aplicado: 1.000, monto_ars: 39_543_152 },
    ],
  },
  {
    id: 'c4', numero: '004', fecha: '15/04/2026', periodo: '2026-04', fecha_valorizacion: '15/04/2026',
    notas: 'Avance parcial cubierta existente — chapa y aislación sector norte.',
    estado: 'enviado', fecha_envio: '16/04/2026', fecha_aprobacion: null, aprobacion: null,
    adjuntos: ['foto_cubierta_norte.jpg', 'foto_aislacion_termica.jpg'],
    renglones: [
      // Sin aprobar → coef y monto_ars en null: se calculan en vivo (coef abr = 1.05).
      { rubro_id: 'r4', rubro: 'Cubiertas Metálicas', avance_acumulado_pct: 20, avance_periodo_pct: 20, monto_base: 20_847_056, coeficiente_aplicado: null, monto_ars: null },
    ],
  },
  {
    id: 'c5', numero: '005', fecha: '05/05/2026', periodo: '2026-05', fecha_valorizacion: '05/05/2026',
    notas: 'Avance adicional vigas y losas visto — redeterminado a CAC mayo.',
    estado: 'aprobado', fecha_envio: '06/05/2026', fecha_aprobacion: '09/05/2026',
    aprobacion: { fecha_aprobacion_cliente: '09/05/2026', fecha_registro: '09/05/2026', medio: 'mail', registrado_por: 'director' },
    adjuntos: ['foto_vigas_hav.jpg', 'foto_losas_ha.jpg'],
    renglones: [
      // Mismo rubro que c3 pero valorizado en mayo → coef 1.10 (demuestra #1: distinto ARS).
      { rubro_id: 'r3', rubro: 'Estructuras', avance_acumulado_pct: 68, avance_periodo_pct: 18, monto_base: 14_235_534, coeficiente_aplicado: 1.100, monto_ars: 15_659_087 },
    ],
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

// ─── Eje outbound: contratistas, certificación de MO y órdenes de pago ──────────
// Espejo del certificado al cliente: se certifica el avance del CONTRATISTA y eso
// dispara un PAGO (egreso), no un cobro. Mismo modelo (período → renglones por rubro →
// % de avance → deducciones), contraparte y signo invertidos.
const CONTRATISTAS_INIT = [
  {
    id: 'ct1', nombre: 'Estructuras del Sur SRL', cuit: '30-71234567-8', tipo: 'subcontratado',
    asignaciones: [{ rubro_id: 'r3', monto_contratado: 58_000_000 }],
    retencion_pct: 0.05, anticipo_pct: 0.10,
  },
  {
    id: 'ct2', nombre: 'Cubiertas y Herrería Mansilla', cuit: '20-28456789-3', tipo: 'subcontratado',
    asignaciones: [{ rubro_id: 'r4', monto_contratado: 72_000_000 }],
    retencion_pct: 0.05, anticipo_pct: 0.10,
  },
  {
    id: 'ct3', nombre: 'Cuadrilla propia — albañilería', cuit: '—', tipo: 'jornalizado',
    asignaciones: [{ rubro_id: 'r1', monto_contratado: 0 }, { rubro_id: 'r5', monto_contratado: 0 }],
    retencion_pct: 0, anticipo_pct: 0,
  },
];

const CONTRATISTAS_MAP = Object.fromEntries(CONTRATISTAS_INIT.map((c) => [c.id, c]));

// CertificacionMO: estado borrador | aprobada | pagada. Al aprobar se genera la orden de pago.
const CERTIFICACIONES_MO_INIT = [
  {
    id: 'cm1', numero: 'MO-001', fecha: '15/03/2026', periodo: '2026-03', contratista_id: 'ct1',
    estado: 'pagada', orden_pago_id: 'op1', adjuntos: ['parte_estructuras_marzo.jpg'],
    renglones: [{ rubro_id: 'r3', rubro: 'Estructuras', avance_acumulado_pct: 50, avance_periodo_pct: 50, monto_periodo: 29_000_000 }],
  },
  {
    id: 'cm2', numero: 'MO-002', fecha: '05/05/2026', periodo: '2026-05', contratista_id: 'ct1',
    estado: 'aprobada', orden_pago_id: 'op2', adjuntos: ['parte_estructuras_mayo.jpg'],
    renglones: [{ rubro_id: 'r3', rubro: 'Estructuras', avance_acumulado_pct: 68, avance_periodo_pct: 18, monto_periodo: 10_440_000 }],
  },
  {
    id: 'cm3', numero: 'MO-003', fecha: '12/04/2026', periodo: '2026-04', contratista_id: 'ct2',
    estado: 'borrador', orden_pago_id: null, adjuntos: [],
    renglones: [{ rubro_id: 'r4', rubro: 'Cubiertas Metálicas', avance_acumulado_pct: 20, avance_periodo_pct: 20, monto_periodo: 14_400_000 }],
  },
];

// OrdenPago: neto = bruto − retención − amortización (mismo desglose que el cobro al cliente).
const ORDENES_PAGO_INIT = [
  { id: 'op1', numero: 'OP-001', fecha: '18/03/2026', contratista_id: 'ct1', certificacion_id: 'cm1', bruto: 29_000_000, retencion: 1_450_000, amortizacion: 2_900_000, neto: 24_650_000, estado: 'pagada' },
  { id: 'op2', numero: 'OP-002', fecha: '09/05/2026', contratista_id: 'ct1', certificacion_id: 'cm2', bruto: 10_440_000, retencion: 522_000, amortizacion: 1_044_000, neto: 8_874_000, estado: 'pendiente' },
];

// Log de inconvenientes / observaciones de obra (alimenta el reporte interno).
const INCONVENIENTES_INIT = [
  { id: 'i1', fecha: '24/04/2026', rubro_id: 'r3', tipo: 'plazo', descripcion: 'Lluvias frenaron el colado de losas una semana.', fotos: [], estado: 'resuelto', registrado_por: 'Jefe de obra' },
  { id: 'i2', fecha: '15/04/2026', rubro_id: 'r4', tipo: 'calidad', descripcion: 'Filtración en cumbrera sector norte, falta sellado.', fotos: ['filtracion_cumbrera.jpg'], estado: 'abierto', registrado_por: 'Jefe de obra' },
];

// ─── Etapa 9/14: tabla salarial CCT, APU, cómputo métrico y partes diarios ──────
const CCT_SALARIAL = {
  convenio: 'UOCRA 76/75', vigencia: '04/2026',
  cargas_sociales_pct: 1.1115,   // 111,15% (caso ABBE)
  categorias: [
    { codigo: 'of_esp',   nombre: 'Oficial especializado', valor_hora: 3850 },
    { codigo: 'oficial',  nombre: 'Oficial',               valor_hora: 3300 },
    { codigo: 'medio_of', nombre: 'Medio oficial',         valor_hora: 2950 },
    { codigo: 'ayudante', nombre: 'Ayudante',              valor_hora: 2600 },
  ],
};
const CCT_MAP = Object.fromEntries(CCT_SALARIAL.categorias.map(c => [c.codigo, c]));
// Costo horario cargado = valor_hora × (1 + cargas sociales).
const costoHoraCargado = (cat) => Math.round((CCT_MAP[cat]?.valor_hora ?? 0) * (1 + CCT_SALARIAL.cargas_sociales_pct));

// APU por tarea (estructura ANALISIS DE PRECIOS). Rendimiento = HH por unidad por categoría.
const APUS = [
  {
    id: 'apu1', rubro_id: 'r1', tarea: 'Demolición de mampostería', unidad: 'm³',
    rendimiento: [{ categoria: 'oficial', hh: 0.8 }, { categoria: 'ayudante', hh: 1.6 }],
    materiales: [{ desc: 'Herramienta menor y consumibles', cant: 1, unidad: 'gl', precio: 4200 }],
    equipos_pct: 0.05, gg_pct: 0.15, beneficio_pct: 0.10, iva_pct: 0.21,
  },
  {
    id: 'apu2', rubro_id: 'r5', tarea: 'Ladrillo común 0.30m', unidad: 'm²',
    rendimiento: [{ categoria: 'oficial', hh: 1.2 }, { categoria: 'ayudante', hh: 1.2 }],
    materiales: [
      { desc: 'Ladrillo común',     cant: 65,   unidad: 'u',  precio: 95 },
      { desc: 'Mortero de asiento', cant: 0.04, unidad: 'm³', precio: 92_000 },
    ],
    equipos_pct: 0.03, gg_pct: 0.15, beneficio_pct: 0.10, iva_pct: 0.21,
  },
];

// Cómputo métrico por APU: mediciones largo×ancho×alto×rep → parcial → total.
// Para m² se carga ancho = 1 (parcial = largo × alto).
const COMPUTOS = {
  apu1: [
    { desc: 'Muros perimetrales PB', largo: 60, ancho: 0.30, alto: 3.2, rep: 1 },
    { desc: 'Tabiques internos',     largo: 50, ancho: 0.15, alto: 3.0, rep: 1 },
  ],
  apu2: [
    { desc: 'Muro perimetral PB', largo: 40, ancho: 1, alto: 3.2, rep: 1 },
  ],
};

// Partes diarios (jornalizado): HH por categoría, por cuadrilla y rubro.
const PARTES_DIARIOS_INIT = [
  { id: 'pd1', fecha: '21/02/2026', contratista_id: 'ct3', rubro_id: 'r1', renglones: [{ categoria: 'oficial', hh: 24 }, { categoria: 'ayudante', hh: 48 }] },
  { id: 'pd2', fecha: '28/02/2026', contratista_id: 'ct3', rubro_id: 'r1', renglones: [{ categoria: 'oficial', hh: 24 }, { categoria: 'ayudante', hh: 54 }] },
  { id: 'pd3', fecha: '05/03/2026', contratista_id: 'ct3', rubro_id: 'r1', renglones: [{ categoria: 'oficial', hh: 20 }, { categoria: 'ayudante', hh: 40 }] },
];

// Desglose del precio unitario de un APU (MO + materiales + equipos + GG + beneficio + IVA).
const apuPrecioUnitario = (apu) => {
  const mo  = apu.rendimiento.reduce((s, r) => s + r.hh * costoHoraCargado(r.categoria), 0);
  const mat = apu.materiales.reduce((s, m) => s + m.cant * m.precio, 0);
  const eq  = (mo + mat) * apu.equipos_pct;
  const subtotal = mo + mat + eq;
  const neto = subtotal * (1 + apu.gg_pct + apu.beneficio_pct);
  return { mo, mat, eq, subtotal, neto, total: Math.round(neto * (1 + apu.iva_pct)) };
};
// Precio unitario recalculado si el valor hora sube `aumentoPct` (paritarias / nuevo CCT).
// Un aumento uniforme del valor hora escala sólo la mano de obra; el resto se recalcula encima.
const apuPrecioConAumentoHora = (apu, aumentoPct) => {
  const mo  = apu.rendimiento.reduce((s, r) => s + r.hh * costoHoraCargado(r.categoria), 0) * (1 + aumentoPct);
  const mat = apu.materiales.reduce((s, m) => s + m.cant * m.precio, 0);
  const eq  = (mo + mat) * apu.equipos_pct;
  const neto = (mo + mat + eq) * (1 + apu.gg_pct + apu.beneficio_pct);
  return Math.round(neto * (1 + apu.iva_pct));
};
const apuHHporUnidad   = (apu) => apu.rendimiento.reduce((s, r) => s + r.hh, 0);
const computoParcial   = (m) => m.largo * m.ancho * m.alto * m.rep;
const computoTotal     = (apuId) => (COMPUTOS[apuId] || []).reduce((s, m) => s + computoParcial(m), 0);
const apusDeRubro      = (rubroId) => APUS.filter(a => a.rubro_id === rubroId);

// Jornalizado: costo de un parte y agregados por rubro (HH y $).
const jornalCostoParte = (parte) => parte.renglones.reduce((s, r) => s + r.hh * costoHoraCargado(r.categoria), 0);
const jornalPorRubro   = (rubroId, partes) => partes.filter(p => p.rubro_id === rubroId).reduce((s, p) => s + jornalCostoParte(p), 0);
const hhRealesPorRubro = (rubroId, partes) => partes.filter(p => p.rubro_id === rubroId).reduce((s, p) => s + p.renglones.reduce((a, r) => a + r.hh, 0), 0);
// HH presupuestadas para el avance logrado = Σ (HH/unidad × cantidad computada × avance%).
const hhPresupPorRubro = (rubroId, avancePct) => apusDeRubro(rubroId).reduce((s, a) => s + apuHHporUnidad(a) * computoTotal(a.id) * (avancePct / 100), 0);

// ─── Helpers de datos ─────────────────────────────────────────────────────────

const gastoRealPorRubro = (rubroId, gastos) =>
  gastos.reduce((sum, g) => sum + g.imputaciones.filter(i => i.rubro_id === rubroId).reduce((s, i) => s + i.monto_imputado, 0), 0);

// Monto ARS de un renglón: congelado si el cert está aprobado, en vivo si no (coef × base).
const renglonArs = (cert, ren) =>
  ren.monto_ars != null
    ? ren.monto_ars
    : Math.round(ren.monto_base * coefRedeterminacion(cert.fecha_valorizacion));

// Total ARS de un certificado = suma de sus renglones (ajuste #3).
const certTotalArs = (cert) => cert.renglones.reduce((s, r) => s + renglonArs(cert, r), 0);
const certTotalBase = (cert) => cert.renglones.reduce((s, r) => s + r.monto_base, 0);

// Suma ARS de los renglones de un rubro entre todos los certs.
const certMontoTotal = (rubroId, certs) =>
  certs.reduce((s, c) => s + c.renglones.filter(r => r.rubro_id === rubroId).reduce((a, r) => a + renglonArs(c, r), 0), 0);

const certMontoAprobado = (rubroId, certs) =>
  certs.filter(c => c.estado === 'aprobado')
    .reduce((s, c) => s + c.renglones.filter(r => r.rubro_id === rubroId).reduce((a, r) => a + renglonArs(c, r), 0), 0);

// Avance certificado de un rubro = DERIVADO del máximo acumulado entre renglones de certs APROBADOS.
// Un borrador o un cert rechazado no cuentan; al rechazarse, el avance vuelve solo.
const certAvanceAprobado = (rubroId, certs) =>
  certs.filter(c => c.estado === 'aprobado')
    .flatMap(c => c.renglones.filter(r => r.rubro_id === rubroId))
    .reduce((max, r) => Math.max(max, r.avance_acumulado_pct), 0);

// ─── Deducciones del contrato (ajuste #2): retención + amortización del anticipo ──
// Aplican sobre el monto BRUTO liberado de cada cuota tipo certificado, antes del cobro.
const desgloseCobro = (montoBruto) => {
  const retencion    = Math.round(montoBruto * CONTRATO.retencion_pct);
  const amortizacion = CONTRATO.amortiza_anticipo ? Math.round(montoBruto * CONTRATO.anticipo_pct) : 0;
  return { bruto: montoBruto, retencion, amortizacion, neto: montoBruto - retencion - amortizacion };
};

// ─── Eje outbound: desglose del PAGO al contratista (espejo de desgloseCobro) ────
// Las deducciones que VOS le aplicás al contratista (retención + amortización del anticipo).
const desglosePago = (montoBruto, contratista) => {
  const retencion    = Math.round(montoBruto * (contratista?.retencion_pct ?? 0));
  const amortizacion = Math.round(montoBruto * (contratista?.anticipo_pct ?? 0));
  return { bruto: montoBruto, retencion, amortizacion, neto: montoBruto - retencion - amortizacion };
};

// Monto certificado a contratistas por rubro (aprobada + pagada; el borrador no cuenta).
// Es el COSTO de mano de obra contratada — la otra mitad del margen de MO.
const moCertificadoPorRubro = (rubroId, certsMO) =>
  certsMO.filter(c => c.estado === 'aprobada' || c.estado === 'pagada')
    .reduce((s, c) => s + c.renglones.filter(r => r.rubro_id === rubroId).reduce((a, r) => a + r.monto_periodo, 0), 0);

// Avance acumulado certificado al contratista por rubro (máximo entre renglones no-borrador).
const moAvancePorRubro = (rubroId, certsMO) =>
  certsMO.filter(c => c.estado === 'aprobada' || c.estado === 'pagada')
    .flatMap(c => c.renglones.filter(r => r.rubro_id === rubroId))
    .reduce((max, r) => Math.max(max, r.avance_acumulado_pct), 0);

// Pagado a contratistas por rubro = bruto de las órdenes PAGADAS, vía su certificación.
// Es lo que cierra el loop: el pago de la orden entra como costo real del rubro.
const pagadoMOPorRubro = (rubroId, ordenesPago, certsMO) =>
  ordenesPago.filter(o => o.estado === 'pagada').reduce((s, o) => {
    const cert = certsMO.find(c => c.id === o.certificacion_id);
    if (!cert) return s;
    return s + cert.renglones.filter(r => r.rubro_id === rubroId).reduce((a, r) => a + r.monto_periodo, 0);
  }, 0);

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

const ESTADO_CERT_MO = {
  borrador: { label: 'Borrador',  color: 'default', icon: <EditNoteIcon fontSize="small" /> },
  aprobada: { label: 'Aprobada',  color: 'warning', icon: <CheckCircleIcon fontSize="small" /> },
  pagada:   { label: 'Pagada',    color: 'success', icon: <PaymentsIcon fontSize="small" /> },
};

const ESTADO_OP = {
  pendiente: { label: 'Pendiente de pago', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  pagada:    { label: 'Pagada',            color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
};

const ESTADO_INC = {
  abierto:  { label: 'Abierto',  color: 'error' },
  resuelto: { label: 'Resuelto', color: 'success' },
};

const TIPO_INC_LABEL = { calidad: 'Calidad', plazo: 'Plazo', seguridad: 'Seguridad', otro: 'Otro' };

const TIPO_CUOTA_ICON = {
  fecha:       <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />,
  certificado: <VerifiedIcon fontSize="small" sx={{ mr: 0.5 }} />,
  hito:        <FlagIcon fontSize="small" sx={{ mr: 0.5 }} />,
};

const TIPO_CUOTA_LABEL = { fecha: 'Fecha', certificado: 'Certificado', hito: 'Hito' };

const avanceColor   = (p) => p === 100 ? 'success' : p > 0 ? 'warning' : 'default';
const avanceBarColor = (p) => p === 100 ? 'success' : p > 0 ? 'warning' : 'inherit';

// ─── Tab: Ejecución ───────────────────────────────────────────────────────────

function TabEjecucion({ rubros, certificados, gastos, certificacionesMO = [], ordenesPago = [], partes = [], verMargen = true, onActualizarAvance }) {
  const [expandedR, setExpandedR]   = useState({});
  const [expandedSR, setExpandedSR] = useState({});

  const totalPresupuestado  = PROYECTO.total;
  const montoCertTot        = certificados.reduce((s, c) => s + certTotalArs(c), 0);
  const montoCertAprobado   = certificados.filter(c => c.estado === 'aprobado').reduce((s, c) => s + certTotalArs(c), 0);
  const montoEnviado        = montoCertTot - montoCertAprobado;
  // Avance certificado (económico) = aprobado / contrato. Distinto del avance físico declarado.
  const pctCertAprob        = (montoCertAprobado / totalPresupuestado) * 100;
  // Avance físico ponderado = Σ(avance físico del rubro × incidencia del rubro en el contrato).
  const avanceFisicoPond    = rubros.reduce((s, r) => s + r.avance * (r.monto / totalPresupuestado), 0);
  // Gastado real = gastos de caja + pagos a subcontratistas + partes de cuadrilla jornalizada.
  const totalPagadoMO       = ordenesPago.filter(o => o.estado === 'pagada').reduce((s, o) => s + o.bruto, 0);
  const totalJornal         = partes.reduce((s, p) => s + jornalCostoParte(p), 0);
  const totalManoObra       = totalPagadoMO + totalJornal;
  const totalGastado        = gastos.reduce((s, g) => s + g.monto, 0) + totalManoObra;
  const gastoImputado       = gastos.filter(g => g.imputaciones.length > 0).reduce((s, g) => s + g.monto, 0) + totalManoObra;
  const margenEjecutado     = montoCertAprobado - gastoImputado;
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
                Cert. #{c.numero} — {c.renglones.length === 1 ? c.renglones[0].rubro : `${c.renglones.length} rubros`} — enviado hace <strong>{dias} días</strong> ({fmtM(certTotalArs(c))})
              </Typography>
            );
          })}
        </Alert>
      )}

      {/* KPIs */}
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Presupuesto total" value={fmtM(totalPresupuestado)} sub="22 rubros · contrato original" tooltip="Suma de todos los rubros del PP aceptado." />
        <KpiCard label="Avance físico ponderado" value={`${avanceFisicoPond.toFixed(1)}%`} sub="ejecutado en obra · ponderado por incidencia" tooltip="Σ(avance físico del rubro × incidencia). Realidad de obra declarada por el director, independiente de la certificación." />
        <KpiCard label="Certificado aprobado" value={fmtM(montoCertAprobado)} sub={`${pctCertAprob.toFixed(1)}% del contrato${montoEnviado > 0 ? ` · +${fmtM(montoEnviado)} pend.` : ''}`} color="warning.main" tooltip="Avance económico formalizado y aprobado por el cliente. Lo enviado pero no aprobado se muestra aparte." />
        {verMargen && (
          <>
            <KpiCard label="Gastado real" value={fmtM(totalGastado)} sub={totalManoObra > 0 ? `incl. ${fmtM(totalManoObra)} mano de obra · ${gastos.filter(g => g.imputaciones.length === 0).length} sin imputar` : `${gastos.filter(g => g.imputaciones.length === 0).length} gastos sin imputar`} tooltip="Gastos de caja + pagos a subcontratistas (órdenes pagadas) + partes de cuadrilla jornalizada. Todo imputado al rubro." />
            <KpiCard
              label="Margen ejecutado"
              value={fmtM(Math.abs(margenEjecutado))}
              sub={margenEjecutado >= 0 ? `+${((margenEjecutado / montoCertAprobado) * 100).toFixed(1)}% sobre cert. aprobado` : 'Gastado > certificado aprobado'}
              color={margenEjecutado >= 0 ? 'success.main' : 'error.main'}
              tooltip="Certificado aprobado − gastos imputados. Margen bruto sobre la porción ya ejecutada."
            />
          </>
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
              <TableCell>Avance físico</TableCell>
              <TableCell align="right">Certificado $</TableCell>
              {verMargen && <TableCell align="right">Gastado real</TableCell>}
              {verMargen && <TableCell align="right">Margen</TableCell>}
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rubros.map((r) => {
              const hasSub      = r.sub_rubros?.length > 0;
              const certTotal   = certMontoTotal(r.id, certificados);
              const certAprov   = certMontoAprobado(r.id, certificados);
              const certEnviado = certTotal - certAprov;   // certificado pendiente de aprobación
              const gastoDirecto = gastoRealPorRubro(r.id, gastos);
              const moPagado     = pagadoMOPorRubro(r.id, ordenesPago, certificacionesMO) + jornalPorRubro(r.id, partes);
              const gastado      = gastoDirecto + moPagado;   // costo real = caja + pagos a contratistas + jornales
              // Margen económico = certificado APROBADO (cobrable) − gastado real. No cuenta lo enviado.
              const margen      = certAprov > 0 ? certAprov - gastado : null;
              const hayEnviado  = certEnviado > 0;
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
                        {onActualizarAvance && (
                          <Tooltip title="Actualizar avance físico" arrow>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onActualizarAvance(r); }}>
                              <EditNoteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {certTotal > 0 ? (
                        <Stack alignItems="flex-end">
                          <Typography variant="body2" fontWeight={600}>{certAprov > 0 ? fmt(certAprov) : '—'}</Typography>
                          {hayEnviado && <Typography variant="caption" color="warning.main" sx={{ fontSize: 10 }}>+{fmtM(certEnviado)} pend. aprob.</Typography>}
                        </Stack>
                      ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    {verMargen && (<>
                    <TableCell align="right">
                      {gastado > 0 ? (
                        <Stack alignItems="flex-end">
                          <Typography variant="body2">{fmt(gastado)}</Typography>
                          {moPagado > 0 && <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>incl. {fmtM(moPagado)} MO</Typography>}
                        </Stack>
                      ) : <Typography variant="body2" color="text.disabled">—</Typography>}
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
                    </>)}
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
                          <TableCell />{verMargen && (<><TableCell /><TableCell /></>)}
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
                            <TableCell />{verMargen && (<><TableCell /><TableCell /></>)}
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
                  <LinearProgress variant="determinate" value={avanceFisicoPond} color="warning" sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'neutral.100' }} />
                  <Typography variant="caption" width={32} textAlign="right">{avanceFisicoPond.toFixed(1)}%</Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Stack alignItems="flex-end">
                  <Typography variant="body2" fontWeight={700}>{fmt(montoCertAprobado)}</Typography>
                  {montoEnviado > 0 && <Typography variant="caption" color="warning.main" sx={{ fontSize: 10 }}>+{fmtM(montoEnviado)} pend. aprob.</Typography>}
                </Stack>
              </TableCell>
              {verMargen && <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(totalGastado)}</Typography></TableCell>}
              {verMargen && (
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color={margenEjecutado >= 0 ? 'success.main' : 'error.main'}>
                    {margenEjecutado >= 0 ? '+' : ''}{fmtM(margenEjecutado)}
                  </Typography>
                </TableCell>
              )}
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Tab: Plan de Cobro ────────────────────────────────────────────────────────

function TabPlanCobro({ cuotas, rubros, certificados, onAgregarCuota, onCobrar, retencionLiberada }) {
  // Deducciones (#2): sólo las cuotas tipo certificado descuentan retención + amortización del bruto liberado.
  const desgQ = (q) => q.tipo === 'certificado'
    ? desgloseCobro(q.monto_liberado)
    : { bruto: q.monto_liberado, retencion: 0, amortizacion: 0, neto: q.monto_liberado };

  const totalCobrado    = cuotas.reduce((s, q) => s + q.monto_cobrado, 0);
  const netoLiberado    = cuotas.reduce((s, q) => s + desgQ(q).neto, 0);
  const fondoReparo     = cuotas.reduce((s, q) => s + desgQ(q).retencion, 0);
  const amortizado      = cuotas.reduce((s, q) => s + desgQ(q).amortizacion, 0);
  const porCobrarNeto   = netoLiberado - totalCobrado;
  const proximaCuota    = cuotas.find(q => q.estado === 'esperando');

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Cobrado (neto)" value={fmtM(totalCobrado)} sub={`${((totalCobrado / PROYECTO.total) * 100).toFixed(1)}% del contrato`} color="success.main" />
        <KpiCard label="Liberado por cobrar (neto)" value={fmtM(porCobrarNeto)} sub="certificado aprobado, neto de deducciones" color="warning.main" tooltip={`Neto = bruto − retención (${Math.round(CONTRATO.retencion_pct * 100)}%) − amortización del anticipo (${Math.round(CONTRATO.anticipo_pct * 100)}%).`} />
        <KpiCard label={retencionLiberada ? 'Fondo de reparo liberado' : 'Fondo de reparo retenido'} value={fmtM(fondoReparo)} sub={retencionLiberada ? 'liberado en recepción definitiva ✓' : `retención ${Math.round(CONTRATO.retencion_pct * 100)}% · se libera en recepción definitiva`} color={retencionLiberada ? 'success.main' : 'text.primary'} tooltip="Retención acumulada que se libera recién en la recepción definitiva de la obra (evento liberacion_retenciones)." />
        <KpiCard label="Anticipo amortizado" value={fmtM(amortizado)} sub={`de ${fmtM(Math.round(PROYECTO.total * CONTRATO.anticipo_pct))} de anticipo`} tooltip="El anticipo se cobró una vez al inicio; cada certificado lo amortiza. No se cuenta dos veces." />
        <KpiCard label="Próxima cuota" value={proximaCuota ? fmtM(desgQ(proximaCuota).neto) : '—'} sub={proximaCuota ? `neto · de ${fmtM(proximaCuota.monto)} total` : 'Sin cuotas disponibles'} color="warning.main" />
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
                      {rubroRef && (() => {
                        const certPct = certAvanceAprobado(rubroRef.id, certificados);
                        return <Chip size="small" label={`${rubroRef.nombre}: ${certPct}% certificado`} color={certPct === 100 ? 'success' : 'warning'} />;
                      })()}
                    </Stack>
                    {/* Barra de liberado */}
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Liberado bruto (cert. aprobado)</Typography>
                        <Typography variant="caption" fontWeight={600}>{fmtM(q.monto_liberado)} de {fmtM(q.monto)}</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={pctLib} color="warning" sx={{ height: 8, borderRadius: 4, bgcolor: 'neutral.100' }} />
                    </Stack>
                    {/* Desglose de deducciones (#2) */}
                    {q.monto_liberado > 0 && (() => {
                      const d = desgQ(q);
                      return (
                        <Stack spacing={0.25} mt={1} sx={{ bgcolor: 'neutral.50', borderRadius: 1, p: 1 }}>
                          <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Bruto liberado</Typography><Typography variant="caption">{fmt(d.bruto)}</Typography></Stack>
                          <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">− Retención ({Math.round(CONTRATO.retencion_pct * 100)}%)</Typography><Typography variant="caption" color="error.main">−{fmt(d.retencion)}</Typography></Stack>
                          <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">− Amortización anticipo ({Math.round(CONTRATO.anticipo_pct * 100)}%)</Typography><Typography variant="caption" color="error.main">−{fmt(d.amortizacion)}</Typography></Stack>
                          <Divider sx={{ my: 0.25 }} />
                          <Stack direction="row" justifyContent="space-between"><Typography variant="caption" fontWeight={700}>Neto a cobrar</Typography><Typography variant="caption" fontWeight={700} color="warning.main">{fmt(d.neto)}</Typography></Stack>
                        </Stack>
                      );
                    })()}
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
                      <Typography variant="caption" color="warning.main">Disponible para cobrar (neto): {fmtM(desgQ(q).neto)}</Typography>
                    )}
                    {q.estado === 'cobrado' && q.fecha_cobro && (
                      <Typography variant="caption" color="success.main">Cobrado el {q.fecha_cobro}</Typography>
                    )}
                  </Box>
                  {q.estado === 'esperando' && q.monto_liberado > 0 && (
                    <Button size="small" variant="contained" color="warning" startIcon={<CheckCircleIcon />} onClick={() => onCobrar(q.id)}>
                      Registrar cobro — {fmtM(desgQ(q).neto)}
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

function DialogNuevoCertificado({ open, onClose, rubros, cuotas, certificados, onGuardar, prefill }) {
  const [step,      setStep]      = useState(0);
  const [renglones, setRenglones] = useState([{ rubroId: '', avance: '' }]);
  const [notas,     setNotas]     = useState('');
  const [adjuntos,  setAdjuntos]  = useState([]);

  // Puente desde la carga de avance físico: si llega un prefill, seedea el renglón al abrir.
  useEffect(() => {
    if (open && prefill?.rubroId) {
      setStep(0);
      setRenglones([{ rubroId: prefill.rubroId, avance: String(prefill.avance ?? '') }]);
    }
  }, [open, prefill]);

  const hoyStr  = hoy.toLocaleDateString('es-AR');
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const coefHoy = coefRedeterminacion(hoyStr);   // coeficiente vigente a la fecha de valorización

  // Renglones calculados: base (período) y ars (× coef vigente). El coef se congela recién al aprobar.
  const renglonesCalc = renglones.map(rl => {
    const rubro     = rubros.find(r => r.id === rl.rubroId);
    const avanceNum = Number(rl.avance);
    const certPrev  = rubro ? certAvanceAprobado(rl.rubroId, certificados) : 0;
    const periodoPct = Math.max(avanceNum - certPrev, 0);
    const montoBase = rubro ? Math.round(rubro.monto * periodoPct / 100) : 0;
    return { ...rl, rubro, avanceNum, certPrev, periodoPct, montoBase, montoArs: Math.round(montoBase * coefHoy) };
  });
  const valida    = renglonesCalc.filter(r => r.rubro && r.avanceNum > 0);
  const totalArs  = valida.reduce((s, r) => s + r.montoArs, 0);
  const totalBase = valida.reduce((s, r) => s + r.montoBase, 0);

  const setRow = (i, patch) => setRenglones(p => p.map((r, j) => j === i ? { ...r, ...patch } : r));
  const addRow = () => setRenglones(p => [...p, { rubroId: '', avance: '' }]);
  const delRow = (i) => setRenglones(p => p.filter((_, j) => j !== i));

  const reset = () => { setStep(0); setRenglones([{ rubroId: '', avance: '' }]); setNotas(''); setAdjuntos([]); };

  const handleGuardar = () => {
    onGuardar({
      periodo, fechaValorizacion: hoyStr, notas, adjuntos, enviar: false,
      renglones: valida.map(r => ({
        rubro_id: r.rubroId, rubro: r.rubro.nombre,
        avance_acumulado_pct: r.avanceNum, avance_periodo_pct: r.periodoPct, monto_base: r.montoBase,
      })),
    });
    reset(); onClose();
  };

  const steps = ['Renglones', 'Adjuntos', 'Envío'];

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo certificado de avance · período {periodo}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
          {steps.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Un certificado es un período con uno o varios renglones (una línea por rubro). Valorización {hoyStr} · coef CAC ×{coefHoy.toFixed(3)}.
            </Typography>
            {renglonesCalc.map((rl, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <FormControl fullWidth size="small">
                    <InputLabel>Rubro</InputLabel>
                    <Select value={rl.rubroId} onChange={e => setRow(i, { rubroId: e.target.value })} label="Rubro">
                      {rubros.map(r => {
                        const certPrev = certAvanceAprobado(r.id, certificados);
                        return (
                          <MenuItem key={r.id} value={r.id} disabled={certPrev === 100}>
                            <Stack direction="row" justifyContent="space-between" width="100%">
                              <span>{r.num}. {r.nombre}</span>
                              <Typography variant="caption" color="text.secondary">Cert: {certPrev}%</Typography>
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <TextField
                    label="% acum." size="small" type="number" value={rl.avance} sx={{ width: 110 }}
                    onChange={e => setRow(i, { avance: e.target.value })}
                    inputProps={{ min: rl.certPrev, max: 100 }}
                  />
                  {renglones.length > 1 && (
                    <IconButton size="small" color="error" onClick={() => delRow(i)} sx={{ mt: 0.5 }}><ThumbDownIcon fontSize="small" /></IconButton>
                  )}
                </Stack>
                {rl.rubro && rl.avanceNum > 0 && (
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    Período +{rl.periodoPct}% (cert. previo {rl.certPrev}%) · base {fmtM(rl.montoBase)} · ARS {fmt(rl.montoArs)}
                  </Typography>
                )}
              </Paper>
            ))}
            <Box><Button size="small" startIcon={<AddIcon />} onClick={addRow}>Agregar renglón</Button></Box>
            <TextField label="Descripción del avance" size="small" multiline rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Qué trabajo se completó..." />
            {valida.length > 0 && (
              <Alert severity="info" icon={<VerifiedIcon />}>
                Total del certificado: <strong>{fmt(totalArs)}</strong> ({CONTRATO.unidad_cuenta}, base {fmtM(totalBase)}). Al aprobarse se congela el coeficiente y se libera la parte proporcional de las cuotas vinculadas (neto de retención {Math.round(CONTRATO.retencion_pct * 100)}% y amortización {Math.round(CONTRATO.anticipo_pct * 100)}%).
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
                <Typography variant="caption" color="text.secondary" display="block">Vista previa del informe · período {periodo}</Typography>
                <Typography variant="subtitle2" fontWeight={700} mt={0.5}>{PROYECTO.nombre} — Cert. #{String(certificados.length + 1).padStart(3, '0')}</Typography>
                {valida.map((r, i) => (
                  <Typography key={i} variant="body2" color="text.secondary">{r.rubro.nombre} — {r.avanceNum}% acum. (+{r.periodoPct}%) · {fmt(r.montoArs)}</Typography>
                ))}
                <Typography variant="body2" fontWeight={700} mt={0.5}>Total: {fmt(totalArs)} ({CONTRATO.unidad_cuenta})</Typography>
                {adjuntos.length > 0 && <Typography variant="caption" color="text.secondary">{adjuntos.length} adjunto{adjuntos.length > 1 ? 's' : ''}</Typography>}
              </CardContent>
            </Card>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} fullWidth size="large" color="error"
              onClick={() => alert('PDF generado: Certificado_' + (certificados.length + 1).toString().padStart(3,'0') + '_' + periodo + '.pdf\n\n' + valida.length + ' renglón(es) · un solo PDF y una sola aprobación\n(En producción esto descarga el archivo real)')}>
              Descargar informe PDF
            </Button>
            <Alert severity="info" icon={<SendIcon />}>
              Descargá el PDF y envialo vos desde tu mail a <strong>{PROYECTO.cliente}</strong>. Cuando el cliente apruebe, registralo como aprobado desde la lista de certificados.
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {step > 0 && <Button onClick={() => setStep(p => p - 1)}>Atrás</Button>}
        <Button onClick={() => { reset(); onClose(); }}>Cancelar</Button>
        {step < 2
          ? <Button variant="contained" onClick={() => setStep(p => p + 1)} disabled={step === 0 && valida.length === 0}>Siguiente</Button>
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
              <Typography variant="overline" color="text.secondary">Certificado · Período {cert.periodo}</Typography>
              <Typography variant="h6" fontWeight={700}>#{cert.numero}</Typography>
              <Typography variant="body2" color="text.secondary">{cert.fecha}</Typography>
            </Box>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {/* Detalle — un renglón por rubro (#3) */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rubro</TableCell>
                  <TableCell align="center">Avance acum.</TableCell>
                  <TableCell align="center">Del período</TableCell>
                  <TableCell align="right">Base</TableCell>
                  <TableCell align="center">Coef.</TableCell>
                  <TableCell align="right">Monto ARS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cert.renglones.map((ren, i) => {
                  const coef = ren.coeficiente_aplicado ?? coefRedeterminacion(cert.fecha_valorizacion);
                  return (
                    <TableRow key={i}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{ren.rubro}</Typography></TableCell>
                      <TableCell align="center"><Chip size="small" label={`${ren.avance_acumulado_pct}%`} color={ren.avance_acumulado_pct === 100 ? 'success' : 'warning'} /></TableCell>
                      <TableCell align="center"><Typography variant="caption" color="text.secondary">+{ren.avance_periodo_pct}%</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" color="text.secondary">{fmtM(ren.monto_base)}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption" color={coef !== 1 ? 'warning.main' : 'text.secondary'}>×{coef.toFixed(3)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(renglonArs(cert, ren))}</Typography></TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={5} align="right"><Typography variant="body2" fontWeight={700}>Total {CONTRATO.unidad_cuenta}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={700}>{fmt(certTotalArs(cert))}</Typography></TableCell>
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
          <Alert severity="success" icon={<CheckCircleIcon />}>
            Aprobado por el cliente el {cert.aprobacion?.fecha_aprobacion_cliente ?? cert.fecha_aprobacion}
            {cert.aprobacion?.medio ? ` · registrado por el director (vía ${cert.aprobacion.medio})` : ''}. Coeficiente CAC congelado.
          </Alert>
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

const WA_STEPS_CERT = [
  { from: 'director', text: 'certifico el 80% de mampostería y tabiques, adjunto foto' },
  { from: 'director', img: true },
  { from: 'bot', text: '✅ Entendí el mensaje. Esto es lo que voy a registrar:' },
  { from: 'bot', preview: 'cert' },
  { from: 'bot', text: 'Confirmás? Respondé *sí* para guardar como borrador o *enviar* para mandar al cliente.' },
];
const WA_STEPS_AVANCE = [
  { from: 'director', text: 'avancé las cubiertas metálicas, vamos por el 35%, mando foto' },
  { from: 'director', img: true },
  { from: 'bot', text: '✅ Registré el avance físico de obra:' },
  { from: 'bot', preview: 'avance' },
  { from: 'bot', text: 'Confirmás? Respondé *sí* para actualizar el avance del rubro.' },
];

function DialogWASimulator({ open, onClose, rubros, onGuardar, onActualizarAvance }) {
  const [paso, setPaso] = useState(0);
  const [modo, setModo] = useState('certificado');

  const steps    = modo === 'certificado' ? WA_STEPS_CERT : WA_STEPS_AVANCE;
  const r5       = rubros.find(r => r.id === 'r5');
  const r4       = rubros.find(r => r.id === 'r4');
  const montoEst = r5 ? r5.monto * 0.80 : 0;

  const cambiarModo = (_, m) => { if (m) { setModo(m); setPaso(0); } };

  const handleConfirmar = () => {
    const hoyStr = hoy.toLocaleDateString('es-AR');
    if (modo === 'certificado') {
      onGuardar({
        periodo: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`,
        fechaValorizacion: hoyStr, notas: 'Cargado desde WhatsApp.', adjuntos: ['foto_wa_mamposteria.jpg'], enviar: false,
        renglones: [{
          rubro_id: 'r5', rubro: r5?.nombre ?? 'Mampostería y Tabiques',
          avance_acumulado_pct: 80, avance_periodo_pct: 80, monto_base: Math.round(montoEst),
        }],
      });
    } else {
      onActualizarAvance('r4', 35, 'Avance cargado desde WhatsApp.', ['foto_wa_cubiertas.jpg']);
    }
    setPaso(0); onClose();
  };

  return (
    <Dialog open={open} onClose={() => { setPaso(0); onClose(); }} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#075e54', color: 'white' }}>
        <ForumIcon /> Bot Sorbydata · WhatsApp
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#ece5dd', p: 1.5 }}>
        <ToggleButtonGroup value={modo} exclusive onChange={cambiarModo} size="small" fullWidth sx={{ bgcolor: 'white', mb: 1 }}>
          <ToggleButton value="certificado">Certificar al cliente</ToggleButton>
          <ToggleButton value="avance">Avance físico</ToggleButton>
        </ToggleButtonGroup>
        <Stack spacing={1} mt={1}>
          {steps.slice(0, paso + 1).map((s, i) => (
            <Box key={i} display="flex" justifyContent={s.from === 'director' ? 'flex-end' : 'flex-start'}>
              <Paper elevation={1} sx={{
                maxWidth: '80%', px: 1.5, py: 1, borderRadius: 2,
                bgcolor: s.from === 'director' ? '#dcf8c6' : 'white',
                borderTopRightRadius: s.from === 'director' ? 0 : 2,
                borderTopLeftRadius:  s.from === 'bot'      ? 0 : 2,
              }}>
                {s.img && <Box sx={{ width: 140, height: 90, bgcolor: 'grey.300', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}><PhotoCameraIcon color="action" /></Box>}
                {s.preview === 'cert' && r5 && (
                  <Box sx={{ bgcolor: '#f0f0f0', p: 1, borderRadius: 1, mb: 0.5, borderLeft: 3, borderLeftColor: '#128c7e' }}>
                    <Typography variant="caption" fontWeight={700} display="block">📋 Certificado de avance</Typography>
                    <Typography variant="caption" display="block">Rubro: {r5.nombre}</Typography>
                    <Typography variant="caption" display="block">Avance: 80%</Typography>
                    <Typography variant="caption" display="block" fontWeight={600}>Monto: {fmtM(montoEst)}</Typography>
                  </Box>
                )}
                {s.preview === 'avance' && r4 && (
                  <Box sx={{ bgcolor: '#f0f0f0', p: 1, borderRadius: 1, mb: 0.5, borderLeft: 3, borderLeftColor: '#128c7e' }}>
                    <Typography variant="caption" fontWeight={700} display="block">📐 Avance físico</Typography>
                    <Typography variant="caption" display="block">Rubro: {r4.nombre}</Typography>
                    <Typography variant="caption" display="block">Avance: {r4.avance}% → 35%</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">No genera certificado</Typography>
                  </Box>
                )}
                {s.text && <Typography variant="body2" sx={{ fontSize: 13 }}>{s.text}</Typography>}
                <Typography variant="caption" color="text.disabled" display="block" textAlign="right" sx={{ fontSize: 10, mt: 0.25 }}>13/05/26 10:4{i}</Typography>
              </Paper>
            </Box>
          ))}

          {paso === steps.length - 1 && (
            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
              <Paper elevation={1} sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: '#dcf8c6', cursor: 'pointer' }} onClick={handleConfirmar}>
                <Typography variant="body2" sx={{ fontSize: 13 }}>sí</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>13/05/26 10:4{steps.length}</Typography>
              </Paper>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#f0f0f0' }}>
        <Button onClick={() => { setPaso(0); onClose(); }}>Cerrar</Button>
        {paso < steps.length - 1 && (
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
  const totalCert   = certificados.reduce((s, c) => s + certTotalArs(c), 0);
  const aprobados   = certificados.filter(c => c.estado === 'aprobado').length;
  const pendientes  = certificados.filter(c => c.estado === 'enviado').length;

  return (
    <Box position="relative">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap flex={1}>
          <KpiCard label="Emitidos" value={certificados.length} sub={`${aprobados} aprobados · ${pendientes} en revisión`} />
          <KpiCard label="Total certificado" value={fmtM(totalCert)} sub="aprobados + enviados" color="warning.main" />
          <KpiCard label="Unidad de cuenta" value={CONTRATO.unidad_cuenta} sub={`redeterminación ${CONTRATO.politica_redeterminacion}`} tooltip={`Los montos se valorizan en ${UNIDAD_LABEL[CONTRATO.unidad_cuenta]} (base ${CONTRATO.fecha_base}). El coeficiente se congela al aprobar cada certificado.`} />
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
              <TableCell>Período</TableCell>
              <TableCell>Renglones</TableCell>
              <TableCell align="center">Avance</TableCell>
              <TableCell align="right">Monto ARS</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell>Enviado</TableCell>
              {!readOnly && <TableCell align="center">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...certificados].reverse().map(c => {
              const est = ESTADO_CERT[c.estado];
              const dias = c.fecha_envio ? diasDesde(c.fecha_envio) : null;
              const unRenglon = c.renglones.length === 1;
              const totalArs  = certTotalArs(c);
              const totalBase = certTotalBase(c);
              const redeterm  = totalArs !== totalBase;
              return (
                <TableRow key={c.id} hover>
                  <TableCell><Chip size="small" label={`#${c.numero}`} variant="outlined" /></TableCell>
                  <TableCell><Typography variant="body2">{c.periodo}</Typography><Typography variant="caption" color="text.disabled">{c.fecha}</Typography></TableCell>
                  <TableCell>
                    {unRenglon
                      ? <Typography variant="body2" fontWeight={500}>{c.renglones[0].rubro}</Typography>
                      : <Typography variant="body2" fontWeight={500}>{c.renglones.length} rubros (consolidado)</Typography>}
                    {c.adjuntos?.length > 0 && (
                      <Typography variant="caption" color="text.disabled"><AttachFileIcon sx={{ fontSize: 11, verticalAlign: 'middle' }} />{c.adjuntos.length}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {unRenglon
                      ? <Chip size="small" label={`${c.renglones[0].avance_acumulado_pct}%`} color={c.renglones[0].avance_acumulado_pct === 100 ? 'success' : 'warning'} />
                      : <Chip size="small" variant="outlined" label="varios" />}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{fmt(totalArs)}</Typography>
                    {redeterm && <Typography variant="caption" color="text.disabled">base {fmtM(totalBase)} · CAC</Typography>}
                  </TableCell>
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
      if (m) porMes[m - 1] += certTotalArs(c);
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

  // Ejecutado físico acumulado por mes (en $M) = Σ(avance físico estimado × monto). 4ª serie.
  // Usa el historial_avance cuando existe; si no, estima una rampa desde mes_inicio hasta hoy.
  const fisicoAcum = useMemo(() => {
    const estimar = (r, m) => {
      if (r.historial_avance?.length) {
        return r.historial_avance
          .filter(h => (fechaToMes(h.fecha) ?? 0) <= m)
          .reduce((mx, h) => Math.max(mx, h.avance_acumulado_pct), 0);
      }
      if (m < r.mes_inicio) return 0;
      if (m >= mesActual) return r.avance;
      const span = Math.max(1, mesActual - r.mes_inicio + 1);
      return Math.round(r.avance * Math.min(1, (m - r.mes_inicio + 1) / span));
    };
    return Array.from({ length: TOTAL_MESES }, (_, i) => {
      const m = i + 1;
      return Math.round(rubros.reduce((s, r) => s + (estimar(r, m) / 100) * r.monto, 0) / 1_000_000);
    });
  }, [rubros, mesActual]);

  const atraso     = planAcum[mesActual - 1] - certAcum[mesActual - 1];
  // Avance físico ponderado = Σ(avance físico del rubro × incidencia). Realidad de obra, no economía.
  const avanceFisicoPond = rubros.reduce((s, r) => s + r.avance * (r.monto / PROYECTO.total), 0);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>Curva S — Plan vs. Ejecución real</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Comparación entre lo planificado, lo certificado y lo cobrado. En millones de pesos acumulados.
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Planificado al mes actual" value={`$${planAcum[mesActual - 1]}M`} sub={labels[mesActual - 1]} />
        <KpiCard label="Certificado al mes actual" value={`$${certAcum[mesActual - 1]}M`} sub="solo certs aprobados" color="warning.main" />
        <KpiCard label="Avance físico ponderado" value={`${avanceFisicoPond.toFixed(1)}%`} sub="ejecutado en obra (≠ certificado)" tooltip="Σ(avance físico × incidencia). Trabajo realmente ejecutado, independiente de lo certificado. El gap físico − certificado es trabajo hecho sin certificar." />
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
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Acumulado ($M) — Plan vs. Físico vs. Certificado vs. Cobrado</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Azul = plan · Violeta = ejecutado físico · Naranja = certificado aprobado · Verde = cobrado. El gap físico − certificado es trabajo hecho sin certificar.
        </Typography>
        <LineChart
          series={[
            { data: planAcum,    label: 'Plan acumulado',        color: '#1976d2' },
            { data: fisicoAcum,  label: 'Ejecutado físico',      color: '#7e57c2' },
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

// ─── Dialog: Actualizar avance físico (carga + historial + puente a certificado) ─
function DialogActualizarAvance({ open, onClose, rubro, onGuardar, onCertificar }) {
  const [pct,        setPct]        = useState('');
  const [nota,       setNota]       = useState('');
  const [foto,       setFoto]       = useState(false);
  const [certificar, setCertificar] = useState(false);

  useEffect(() => {
    if (open && rubro) { setPct(String(rubro.avance)); setNota(''); setFoto(false); setCertificar(false); }
  }, [open, rubro]);

  if (!rubro) return null;
  const pctNum = Number(pct);
  const valido = pctNum >= rubro.avance && pctNum <= 100;   // el avance físico no retrocede

  const handleGuardar = () => {
    onGuardar(rubro.id, pctNum, nota, foto ? [`avance_${rubro.num}_${pctNum}pct.jpg`] : []);
    if (certificar) onCertificar(rubro.id, pctNum);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Actualizar avance físico · {rubro.num}. {rubro.nombre}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" icon={<EditNoteIcon />}>
            El avance físico es la realidad de obra declarada por el jefe de obra, <strong>independiente del certificado</strong>. Cargarlo no genera certificado salvo que lo pidas explícitamente.
          </Alert>
          <Box>
            <Typography variant="caption" color="text.secondary">Avance físico actual</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <LinearProgress variant="determinate" value={rubro.avance} color={avanceBarColor(rubro.avance)} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'neutral.100' }} />
              <Typography variant="body2" width={40} textAlign="right">{rubro.avance}%</Typography>
            </Stack>
          </Box>
          <TextField
            label="Nuevo % acumulado" size="small" type="number" value={pct}
            onChange={e => setPct(e.target.value)} inputProps={{ min: rubro.avance, max: 100 }}
            helperText={!valido ? `Debe estar entre ${rubro.avance}% (no retrocede) y 100%` : `+${(pctNum - rubro.avance).toFixed(0)}% sobre lo registrado`}
            error={pct !== '' && !valido}
          />
          <TextField label="Nota / observación" size="small" multiline rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Qué se ejecutó, demoras, inconvenientes..." />
          <Paper variant="outlined" sx={{ p: 1.5, border: '2px dashed', borderColor: 'divider', textAlign: 'center', cursor: 'pointer', bgcolor: foto ? 'success.50' : 'action.hover' }} onClick={() => setFoto(f => !f)}>
            <PhotoCameraIcon sx={{ fontSize: 28, color: foto ? 'success.main' : 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">{foto ? 'Foto adjunta ✓ (clic para quitar)' : 'Adjuntar foto del avance (simular)'}</Typography>
          </Paper>
          <FormControlLabel
            control={<Checkbox checked={certificar} onChange={e => setCertificar(e.target.checked)} />}
            label="Certificar este avance al cliente al guardar (abre el certificado pre-cargado)"
          />
          {rubro.historial_avance?.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Historial de avance</Typography>
              <Stack spacing={0.5} mt={0.5}>
                {[...rubro.historial_avance].reverse().map((h, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1}>
                    <Chip size="small" label={`${h.avance_acumulado_pct}%`} variant="outlined" />
                    <Typography variant="caption" color="text.secondary">{h.fecha} · {h.nota}</Typography>
                    {h.fotos?.length > 0 && <PhotoCameraIcon sx={{ fontSize: 13, color: 'text.disabled' }} />}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={!valido} startIcon={<CheckCircleIcon />}>
          Guardar avance{certificar ? ' y certificar' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Nueva certificación de mano de obra (espejo del cert al cliente) ────
function DialogNuevaCertificacionMO({ open, onClose, contratistas, certificacionesMO, onGuardar }) {
  const [ctId,   setCtId]   = useState('');
  const [rubroId, setRubroId] = useState('');
  const [avance, setAvance] = useState('');
  const [foto,   setFoto]   = useState(false);

  useEffect(() => { if (open) { setCtId(''); setRubroId(''); setAvance(''); setFoto(false); } }, [open]);

  const contratista = contratistas.find(c => c.id === ctId);
  const asignacion  = contratista?.asignaciones.find(a => a.rubro_id === rubroId);
  const avanceNum   = Number(avance);
  const prevPct     = rubroId ? moAvancePorRubro(rubroId, certificacionesMO) : 0;
  const periodoPct  = Math.max(avanceNum - prevPct, 0);
  const montoPeriodo = asignacion ? Math.round(asignacion.monto_contratado * periodoPct / 100) : 0;
  const desg        = desglosePago(montoPeriodo, contratista);
  const valido      = contratista && asignacion && avanceNum > prevPct && avanceNum <= 100;

  const rubroNombre = (rid) => RUBROS_MAP[rid]?.nombre ?? rid;

  const handleGuardar = () => {
    onGuardar({
      contratista_id: ctId,
      adjuntos: foto ? ['parte_contratista.jpg'] : [],
      renglones: [{ rubro_id: rubroId, rubro: rubroNombre(rubroId), avance_acumulado_pct: avanceNum, avance_periodo_pct: periodoPct, monto_periodo: montoPeriodo }],
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva certificación de mano de obra</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" icon={<PaymentsIcon />}>
            Certificás el avance del <strong>contratista</strong>. Al aprobarla se genera una orden de pago por el neto (bruto − retención − amortización del anticipo). Es el espejo del certificado al cliente.
          </Alert>
          <FormControl fullWidth size="small">
            <InputLabel>Contratista</InputLabel>
            <Select value={ctId} onChange={e => { setCtId(e.target.value); setRubroId(''); }} label="Contratista">
              {contratistas.filter(c => c.tipo === 'subcontratado').map(c => (
                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {contratista && (
            <FormControl fullWidth size="small">
              <InputLabel>Rubro asignado</InputLabel>
              <Select value={rubroId} onChange={e => setRubroId(e.target.value)} label="Rubro asignado">
                {contratista.asignaciones.map(a => (
                  <MenuItem key={a.rubro_id} value={a.rubro_id}>
                    <Stack direction="row" justifyContent="space-between" width="100%">
                      <span>{rubroNombre(a.rubro_id)}</span>
                      <Typography variant="caption" color="text.secondary">contrato {fmtM(a.monto_contratado)} · cert {moAvancePorRubro(a.rubro_id, certificacionesMO)}%</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {asignacion && (
            <TextField
              label="% acumulado certificado al contratista" size="small" type="number" value={avance}
              onChange={e => setAvance(e.target.value)} inputProps={{ min: prevPct, max: 100 }}
              helperText={`Certificado previo: ${prevPct}%`}
            />
          )}
          <Paper variant="outlined" sx={{ p: 1.5, border: '2px dashed', borderColor: 'divider', textAlign: 'center', cursor: 'pointer', bgcolor: foto ? 'success.50' : 'action.hover' }} onClick={() => setFoto(f => !f)}>
            <AttachFileIcon sx={{ fontSize: 24, color: foto ? 'success.main' : 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">{foto ? 'Parte adjunto ✓' : 'Adjuntar parte / foto (simular)'}</Typography>
          </Paper>
          {valido && (
            <Stack spacing={0.25} sx={{ bgcolor: 'neutral.50', borderRadius: 1, p: 1.5 }}>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Avance del período</Typography><Typography variant="caption">+{periodoPct}%</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Bruto a certificar</Typography><Typography variant="caption">{fmt(desg.bruto)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">− Retención ({Math.round((contratista.retencion_pct) * 100)}%)</Typography><Typography variant="caption" color="error.main">−{fmt(desg.retencion)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">− Amortización anticipo ({Math.round((contratista.anticipo_pct) * 100)}%)</Typography><Typography variant="caption" color="error.main">−{fmt(desg.amortizacion)}</Typography></Stack>
              <Divider sx={{ my: 0.25 }} />
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption" fontWeight={700}>Neto a pagar (al aprobar)</Typography><Typography variant="caption" fontWeight={700} color="warning.main">{fmt(desg.neto)}</Typography></Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<EditNoteIcon />} onClick={handleGuardar} disabled={!valido}>Guardar borrador</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab: Mano de obra (contratistas + certificación + órdenes de pago) ─────────
function TabManoObra({ contratistas, certificacionesMO, ordenesPago, rubros, certificados, onNuevaCert, onAprobarCert, onPagarOrden }) {
  const totalCertMO   = certificacionesMO.filter(c => c.estado !== 'borrador').reduce((s, c) => s + c.renglones.reduce((a, r) => a + r.monto_periodo, 0), 0);
  const ordPendientes = ordenesPago.filter(o => o.estado === 'pendiente');
  const netoPendiente = ordPendientes.reduce((s, o) => s + o.neto, 0);
  const netoPagado    = ordenesPago.filter(o => o.estado === 'pagada').reduce((s, o) => s + o.neto, 0);

  // Margen de MO por contratista = certificado al cliente (aprobado) − certificado al contratista, sobre sus rubros.
  const margenContratista = (ct) => ct.asignaciones.reduce((s, a) => {
    const alCliente    = certMontoAprobado(a.rubro_id, certificados);
    const alContratista = moCertificadoPorRubro(a.rubro_id, certificacionesMO);
    return s + (alCliente - alContratista);
  }, 0);

  return (
    <Box>
      {/* Pagos de la semana — la rutina del jueves */}
      {ordPendientes.length > 0 && (
        <Alert severity="warning" icon={<PaymentsIcon />} sx={{ mb: 2 }}
          action={<Typography variant="caption" fontWeight={700} sx={{ alignSelf: 'center', mr: 1 }}>{fmtM(netoPendiente)} a pagar</Typography>}>
          <strong>Pagos de la semana — {ordPendientes.length} orden{ordPendientes.length > 1 ? 'es' : ''} pendiente{ordPendientes.length > 1 ? 's' : ''}</strong>
          {ordPendientes.map(o => (
            <Typography key={o.id} variant="caption" display="block" mt={0.25}>
              {o.numero} — {CONTRATISTAS_MAP[o.contratista_id]?.nombre} — neto {fmt(o.neto)}
            </Typography>
          ))}
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap flex={1}>
          <KpiCard label="Contratistas" value={contratistas.length} sub={`${contratistas.filter(c => c.tipo === 'subcontratado').length} a ajuste · ${contratistas.filter(c => c.tipo === 'jornalizado').length} jornalizados`} />
          <KpiCard label="Certificado a contratistas" value={fmtM(totalCertMO)} sub="aprobado + pagado" color="warning.main" tooltip="Costo de mano de obra certificado a los contratistas. Es la otra mitad del margen por rubro." />
          <KpiCard label="Pendiente de pago" value={fmtM(netoPendiente)} sub={`${ordPendientes.length} orden(es) · neto`} color={netoPendiente > 0 ? 'warning.main' : 'text.primary'} />
          <KpiCard label="Pagado" value={fmtM(netoPagado)} sub="neto desembolsado" color="success.main" />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevaCert} sx={{ ml: 2, flexShrink: 0 }}>Nueva certificación MO</Button>
      </Stack>

      {/* Contratistas + margen de MO por rubro */}
      <Typography variant="subtitle2" fontWeight={600} mb={1}>Contratistas y margen de mano de obra</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'neutral.50' }}>
              <TableCell>Contratista</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Rubros</TableCell>
              <TableCell align="right">Contrato</TableCell>
              <TableCell align="right">Cert. a contratista</TableCell>
              <TableCell align="right">Margen MO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contratistas.map(ct => {
              const contrato   = ct.asignaciones.reduce((s, a) => s + a.monto_contratado, 0);
              const certMO     = ct.asignaciones.reduce((s, a) => s + moCertificadoPorRubro(a.rubro_id, certificacionesMO), 0);
              const margen     = ct.tipo === 'subcontratado' ? margenContratista(ct) : null;
              return (
                <TableRow key={ct.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{ct.nombre}</Typography><Typography variant="caption" color="text.disabled">{ct.cuit}</Typography></TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={ct.tipo === 'subcontratado' ? 'A ajuste' : 'Jornalizado'} color={ct.tipo === 'subcontratado' ? 'primary' : 'default'} /></TableCell>
                  <TableCell><Typography variant="caption">{ct.asignaciones.map(a => RUBROS_MAP[a.rubro_id]?.num).join(', ')}</Typography></TableCell>
                  <TableCell align="right">{contrato > 0 ? <Typography variant="body2">{fmt(contrato)}</Typography> : <Typography variant="caption" color="text.disabled">por jornal</Typography>}</TableCell>
                  <TableCell align="right">{certMO > 0 ? <Typography variant="body2">{fmt(certMO)}</Typography> : <Typography variant="body2" color="text.disabled">—</Typography>}</TableCell>
                  <TableCell align="right">
                    {margen !== null && certMO > 0 ? (
                      <Typography variant="body2" fontWeight={600} color={margen >= 0 ? 'success.main' : 'error.main'}>{margen >= 0 ? '+' : ''}{fmtM(margen)}</Typography>
                    ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Certificaciones de MO */}
      <Typography variant="subtitle2" fontWeight={600} mb={1}>Certificaciones de mano de obra</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'neutral.50' }}>
              <TableCell>#</TableCell>
              <TableCell>Contratista</TableCell>
              <TableCell>Rubro · período</TableCell>
              <TableCell align="center">Avance</TableCell>
              <TableCell align="right">Bruto</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...certificacionesMO].reverse().map(c => {
              const est   = ESTADO_CERT_MO[c.estado];
              const bruto = c.renglones.reduce((a, r) => a + r.monto_periodo, 0);
              const ren   = c.renglones[0];
              return (
                <TableRow key={c.id} hover>
                  <TableCell><Chip size="small" label={c.numero} variant="outlined" /></TableCell>
                  <TableCell><Typography variant="body2">{CONTRATISTAS_MAP[c.contratista_id]?.nombre}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{ren.rubro}</Typography><Typography variant="caption" color="text.disabled">{c.periodo} · {c.fecha}</Typography></TableCell>
                  <TableCell align="center"><Chip size="small" label={`${ren.avance_acumulado_pct}%`} color={ren.avance_acumulado_pct === 100 ? 'success' : 'warning'} /></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmt(bruto)}</Typography></TableCell>
                  <TableCell align="center"><Chip size="small" label={est.label} color={est.color} icon={est.icon} /></TableCell>
                  <TableCell align="center">
                    {c.estado === 'borrador' && (
                      <Button size="small" variant="outlined" startIcon={<CheckCircleIcon />} onClick={() => onAprobarCert(c.id)}>Aprobar → orden de pago</Button>
                    )}
                    {c.estado === 'aprobada' && <Typography variant="caption" color="warning.main">orden generada</Typography>}
                    {c.estado === 'pagada' && <Typography variant="caption" color="success.main">pagada</Typography>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Órdenes de pago */}
      <Typography variant="subtitle2" fontWeight={600} mb={1}>Órdenes de pago</Typography>
      {ordenesPago.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">No hay órdenes de pago. Se generan al aprobar una certificación.</Typography></Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'neutral.50' }}>
                <TableCell>#</TableCell>
                <TableCell>Contratista</TableCell>
                <TableCell align="right">Bruto</TableCell>
                <TableCell align="right">Retención</TableCell>
                <TableCell align="right">Amortización</TableCell>
                <TableCell align="right">Neto</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...ordenesPago].reverse().map(o => {
                const est = ESTADO_OP[o.estado];
                return (
                  <TableRow key={o.id} hover>
                    <TableCell><Chip size="small" label={o.numero} variant="outlined" icon={<ReceiptLongIcon fontSize="small" />} /></TableCell>
                    <TableCell><Typography variant="body2">{CONTRATISTAS_MAP[o.contratista_id]?.nombre}</Typography><Typography variant="caption" color="text.disabled">{o.fecha}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2">{fmt(o.bruto)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption" color="error.main">−{fmt(o.retencion)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption" color="error.main">−{fmt(o.amortizacion)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="warning.main">{fmt(o.neto)}</Typography></TableCell>
                    <TableCell align="center"><Chip size="small" label={est.label} color={est.color} icon={est.icon} /></TableCell>
                    <TableCell align="center">
                      {o.estado === 'pendiente'
                        ? <Button size="small" variant="contained" color="warning" startIcon={<PaymentsIcon />} onClick={() => onPagarOrden(o.id)}>Registrar pago — {fmtM(o.neto)}</Button>
                        : <Chip size="small" label="Pagada" color="success" icon={<CheckCircleIcon />} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Alert severity="info" sx={{ mt: 2 }} icon={<TimelineIcon />}>
        Al registrar el pago, el egreso se imputa automáticamente al rubro certificado y alimenta la columna «Gastado real» de la vista de ejecución. El caso <strong>jornalizado</strong> (horas-hombre + rendimiento vs. presupuesto) requiere el APU y queda para una etapa posterior.
      </Alert>
    </Box>
  );
}

// ─── Dialog: Registrar inconveniente ──────────────────────────────────────────
function DialogInconveniente({ open, onClose, rubros, onGuardar }) {
  const [rubroId,     setRubroId]     = useState('');
  const [tipo,        setTipo]        = useState('calidad');
  const [descripcion, setDescripcion] = useState('');
  const [foto,        setFoto]        = useState(false);

  useEffect(() => { if (open) { setRubroId(''); setTipo('calidad'); setDescripcion(''); setFoto(false); } }, [open]);

  const handleGuardar = () => {
    onGuardar({ rubro_id: rubroId || null, tipo, descripcion, fotos: foto ? ['inconveniente.jpg'] : [] });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar inconveniente</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Rubro (opcional)</InputLabel>
            <Select value={rubroId} onChange={e => setRubroId(e.target.value)} label="Rubro (opcional)">
              <MenuItem value="">— General de obra —</MenuItem>
              {rubros.map(r => <MenuItem key={r.id} value={r.id}>{r.num}. {r.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo</InputLabel>
            <Select value={tipo} onChange={e => setTipo(e.target.value)} label="Tipo">
              {Object.entries(TIPO_INC_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Descripción" size="small" multiline rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <Paper variant="outlined" sx={{ p: 1.5, border: '2px dashed', borderColor: 'divider', textAlign: 'center', cursor: 'pointer', bgcolor: foto ? 'success.50' : 'action.hover' }} onClick={() => setFoto(f => !f)}>
            <PhotoCameraIcon sx={{ fontSize: 24, color: foto ? 'success.main' : 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">{foto ? 'Foto adjunta ✓' : 'Adjuntar foto (simular)'}</Typography>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={!descripcion}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab: Reportes (ejecutivo / interno / conforme de obra) ─────────────────────
function TabReportes({ rubros, certificados, cuotas, inconvenientes, onNuevoInconveniente, onResolverInconveniente, onCompletarObra, onEmitirConforme, ppFinalizado, retencionLiberada }) {
  const [vista, setVista] = useState('ejecutivo');

  const totalPresup      = PROYECTO.total;
  const avanceFisicoPond = rubros.reduce((s, r) => s + r.avance * (r.monto / totalPresup), 0);
  const montoCertAprob   = certificados.filter(c => c.estado === 'aprobado').reduce((s, c) => s + certTotalArs(c), 0);
  const cobrado          = cuotas.reduce((s, q) => s + q.monto_cobrado, 0);
  const fondoReparo      = cuotas.filter(q => q.tipo === 'certificado').reduce((s, q) => s + desgloseCobro(q.monto_liberado).retencion, 0);
  const completo         = avanceFisicoPond >= 99.5;

  // Galería: todas las fotos del sistema agrupadas (cert + avance físico + inconvenientes).
  const galeria = [
    ...certificados.flatMap(c => (c.adjuntos || []).map(f => ({ src: f, origen: `Cert #${c.numero}`, fecha: c.fecha }))),
    ...rubros.flatMap(r => (r.historial_avance || []).flatMap(h => (h.fotos || []).map(f => ({ src: f, origen: `${r.num}. ${r.nombre}`, fecha: h.fecha })))),
    ...inconvenientes.flatMap(i => (i.fotos || []).map(f => ({ src: f, origen: `Inconv. ${TIPO_INC_LABEL[i.tipo]}`, fecha: i.fecha }))),
  ];
  const fotosCert  = certificados.reduce((s, c) => s + (c.adjuntos?.length || 0), 0);
  const fotosAv    = rubros.reduce((s, r) => s + (r.historial_avance || []).reduce((a, h) => a + (h.fotos?.length || 0), 0), 0);
  const fotosInc   = inconvenientes.reduce((s, i) => s + (i.fotos?.length || 0), 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <ToggleButtonGroup value={vista} exclusive onChange={(_, v) => v && setVista(v)} size="small">
          <ToggleButton value="ejecutivo"><SummarizeIcon fontSize="small" sx={{ mr: 0.5 }} />Ejecutivo</ToggleButton>
          <ToggleButton value="interno"><ReportProblemIcon fontSize="small" sx={{ mr: 0.5 }} />Interno</ToggleButton>
          <ToggleButton value="conforme"><AssignmentTurnedInIcon fontSize="small" sx={{ mr: 0.5 }} />Conforme de obra</ToggleButton>
          <ToggleButton value="galeria"><PhotoLibraryIcon fontSize="small" sx={{ mr: 0.5 }} />Galería</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <PhotoLibraryIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">{galeria.length} fotos ({fotosCert} cert · {fotosAv} avance · {fotosInc} inconv.)</Typography>
        </Stack>
      </Stack>

      {vista === 'ejecutivo' && (
        <Box>
          <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
            <KpiCard label="Avance físico ponderado" value={`${avanceFisicoPond.toFixed(1)}%`} sub="realidad de obra" />
            <KpiCard label="Certificado aprobado" value={fmtM(montoCertAprob)} sub={`${((montoCertAprob / totalPresup) * 100).toFixed(1)}% del contrato`} color="warning.main" />
            <KpiCard label="Cobrado" value={fmtM(cobrado)} sub={`${((cobrado / totalPresup) * 100).toFixed(1)}% del contrato`} color="success.main" />
            <KpiCard label="Contrato" value={fmtM(totalPresup)} sub={`${PROYECTO.duracion}`} />
          </Stack>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>{PROYECTO.nombre}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>{PROYECTO.cliente} · reporte ejecutivo a {mesAFecha(3)}</Typography>
            <Typography variant="body2">La obra ejecutó un <strong>{avanceFisicoPond.toFixed(1)}%</strong> físico ponderado por incidencia. Se certificó y aprobó {fmtM(montoCertAprob)} y se cobró {fmtM(cobrado)}. El reporte ejecutivo se arma con los KPIs que ya calcula la vista de ejecución y la curva S — es ensamblaje, no dato nuevo.</Typography>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} color="error" sx={{ mt: 2 }}
              onClick={() => alert('Reporte ejecutivo generado (PDF).\nUna página para el comitente con avance, curva S y estado financiero.')}>
              Descargar reporte ejecutivo (PDF)
            </Button>
          </Paper>
        </Box>
      )}

      {vista === 'interno' && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" fontWeight={600}>Avance físico por rubro + inconvenientes</Typography>
            <Button variant="outlined" size="small" startIcon={<ReportProblemIcon />} onClick={onNuevoInconveniente}>Registrar inconveniente</Button>
          </Stack>
          <Stack spacing={1.5} mb={3}>
            {rubros.filter(r => r.avance > 0).map(r => (
              <Paper key={r.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{r.num}. {r.nombre}</Typography>
                  <Chip size="small" label={`${r.avance}% físico`} color={avanceColor(r.avance)} />
                </Stack>
                {(r.historial_avance || []).map((h, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1} mt={0.5}>
                    <Typography variant="caption" color="text.secondary" width={70}>{h.fecha}</Typography>
                    <Typography variant="caption">{h.avance_acumulado_pct}% — {h.nota}</Typography>
                    {h.fotos?.length > 0 && <PhotoCameraIcon sx={{ fontSize: 13, color: 'text.disabled' }} />}
                  </Stack>
                ))}
              </Paper>
            ))}
          </Stack>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>Inconvenientes ({inconvenientes.length})</Typography>
          <Stack spacing={1}>
            {inconvenientes.map(inc => (
              <Paper key={inc.id} variant="outlined" sx={{ p: 1.5, borderLeft: 4, borderLeftColor: inc.estado === 'abierto' ? 'error.main' : 'success.main' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={TIPO_INC_LABEL[inc.tipo]} variant="outlined" />
                    {inc.rubro_id && <Typography variant="caption" color="text.secondary">{RUBROS_MAP[inc.rubro_id]?.num}. {RUBROS_MAP[inc.rubro_id]?.nombre}</Typography>}
                    <Typography variant="caption" color="text.disabled">{inc.fecha}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={ESTADO_INC[inc.estado].label} color={ESTADO_INC[inc.estado].color} />
                    {inc.estado === 'abierto' && onResolverInconveniente && (
                      <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => onResolverInconveniente(inc.id)}>Resolver</Button>
                    )}
                  </Stack>
                </Stack>
                <Typography variant="body2" mt={0.5}>{inc.descripcion}</Typography>
                {inc.fotos?.length > 0 && (
                  <Stack direction="row" spacing={0.5} mt={0.5} alignItems="center">
                    <PhotoCameraIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.disabled">{inc.fotos.join(', ')}</Typography>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {vista === 'conforme' && (
        <Box>
          <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
            <KpiCard label="Avance físico ponderado" value={`${avanceFisicoPond.toFixed(1)}%`} sub={completo ? 'obra terminada' : 'falta para el 100%'} color={completo ? 'success.main' : 'warning.main'} />
            <KpiCard label="Fondo de reparo" value={fmtM(fondoReparo)} sub={retencionLiberada ? 'liberado ✓' : 'se libera con el conforme'} color={retencionLiberada ? 'success.main' : 'text.primary'} tooltip="La retención acumulada se libera recién al emitir el conforme de obra (evento liberacion_retenciones)." />
            <KpiCard label="Inconvenientes abiertos" value={inconvenientes.filter(i => i.estado === 'abierto').length} sub="deberían resolverse antes del cierre" color={inconvenientes.some(i => i.estado === 'abierto') ? 'error.main' : 'success.main'} />
          </Stack>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 40, color: (completo || ppFinalizado) ? 'success.main' : 'text.disabled', mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>Conforme de obra / acta de recepción</Typography>
            {ppFinalizado ? (
              <>
                <Typography variant="body2" color="success.main" mt={1} mb={2}>
                  Conforme emitido · PP <strong>Finalizado</strong> · fondo de reparo liberado.
                </Typography>
                <Chip color="success" icon={<CheckCircleIcon />} label="Obra recepcionada" />
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" mt={1} mb={2}>
                  {completo
                    ? 'La obra alcanzó el 100% físico. Al emitir el conforme se libera el fondo de reparo y el PP pasa a Finalizado.'
                    : `Se habilita al 100% de avance físico ponderado (hoy ${avanceFisicoPond.toFixed(1)}%). Reúne el dossier de fotos + checklist + firma, libera el fondo de reparo y cierra el ciclo de vida del PP.`}
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                  {!completo && onCompletarObra && (
                    <Button variant="outlined" onClick={onCompletarObra}>Marcar obra al 100% (demo)</Button>
                  )}
                  <Button variant="contained" color="success" startIcon={<AssignmentTurnedInIcon />} disabled={!completo}
                    onClick={onEmitirConforme}>
                    {completo ? 'Emitir conforme de obra' : 'Bloqueado hasta el 100% físico'}
                  </Button>
                </Stack>
              </>
            )}
          </Paper>
        </Box>
      )}

      {vista === 'galeria' && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>Galería de obra · {galeria.length} fotos</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>Consolidado de adjuntos de certificados, registros de avance físico e inconvenientes.</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5 }}>
            {galeria.map((g, i) => (
              <Paper key={i} variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ height: 100, bgcolor: 'neutral.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                </Box>
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block" noWrap title={g.src}>{g.src}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>{g.origen} · {g.fecha}</Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Dialog: Registrar parte diario (jornalizado) ─────────────────────────────
function DialogParteDiario({ open, onClose, contratistas, onGuardar }) {
  const [ctId,    setCtId]    = useState('');
  const [rubroId, setRubroId] = useState('');
  const [hh,      setHh]      = useState({});

  useEffect(() => { if (open) { setCtId(''); setRubroId(''); setHh({}); } }, [open]);

  const contratista = contratistas.find(c => c.id === ctId);
  const rubrosDisp  = contratista ? contratista.asignaciones.map(a => RUBROS_MAP[a.rubro_id]).filter(Boolean) : [];
  const renglones   = CCT_SALARIAL.categorias.map(c => ({ categoria: c.codigo, hh: Number(hh[c.codigo]) || 0 })).filter(r => r.hh > 0);
  const costo       = renglones.reduce((s, r) => s + r.hh * costoHoraCargado(r.categoria), 0);
  const valido      = ctId && rubroId && renglones.length > 0;

  const handleGuardar = () => { onGuardar({ contratista_id: ctId, rubro_id: rubroId, renglones }); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar parte diario</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" icon={<SpeedIcon />}>
            Partes de cuadrilla <strong>jornalizada</strong>: las HH se valorizan con el CCT y el costo se imputa al rubro (entra a «Gastado real»).
          </Alert>
          <FormControl fullWidth size="small">
            <InputLabel>Cuadrilla (jornalizada)</InputLabel>
            <Select value={ctId} onChange={e => { setCtId(e.target.value); setRubroId(''); }} label="Cuadrilla (jornalizada)">
              {contratistas.filter(c => c.tipo === 'jornalizado').map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          {contratista && (
            <FormControl fullWidth size="small">
              <InputLabel>Rubro</InputLabel>
              <Select value={rubroId} onChange={e => setRubroId(e.target.value)} label="Rubro">
                {rubrosDisp.map(r => <MenuItem key={r.id} value={r.id}>{r.num}. {r.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <Typography variant="caption" color="text.secondary">Horas-hombre por categoría</Typography>
          {CCT_SALARIAL.categorias.map(c => (
            <Stack key={c.codigo} direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" sx={{ flex: 1 }}>{c.nombre}</Typography>
              <Typography variant="caption" color="text.disabled">{fmt(costoHoraCargado(c.codigo))}/h</Typography>
              <TextField size="small" type="number" value={hh[c.codigo] ?? ''} onChange={e => setHh(p => ({ ...p, [c.codigo]: e.target.value }))} sx={{ width: 90 }} inputProps={{ min: 0 }} label="HH" />
            </Stack>
          ))}
          {costo > 0 && (
            <Alert severity="success" icon={<PaymentsIcon />}>Costo del parte: <strong>{fmt(costo)}</strong> ({renglones.reduce((s, r) => s + r.hh, 0)} HH)</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={!valido} startIcon={<EditNoteIcon />}>Guardar parte</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog: Actualizar tabla salarial CCT (redeterminación masiva de APU) ─────
function DialogActualizarCCT({ open, onClose, onAplicar }) {
  const [aumento, setAumento] = useState('');
  useEffect(() => { if (open) setAumento(''); }, [open]);

  const f = (Number(aumento) || 0) / 100;
  const filas = APUS.map(a => {
    const base  = apuPrecioUnitario(a).total;
    const nuevo = apuPrecioConAumentoHora(a, f);
    const cant  = computoTotal(a.id);
    return { a, base, nuevo, cant, delta: (nuevo - base) * cant };
  });
  const deltaTotal = filas.reduce((s, r) => s + r.delta, 0);
  const valido = f > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Actualizar tabla salarial (paritarias)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" icon={<CalculateIcon />}>
            Un aumento del valor hora recalcula el <strong>precio unitario de todos los APU</strong>. El delta sobre lo ya computado se puede volcar como <strong>anexo de redeterminación</strong>.
          </Alert>
          <TextField label="% de aumento del valor hora" size="small" type="number" value={aumento} onChange={e => setAumento(e.target.value)} inputProps={{ min: 0 }} placeholder="ej. 15" />
          {valido && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: 'neutral.50' }}>
                  <TableCell>APU</TableCell><TableCell align="right">P. unit. base</TableCell><TableCell align="right">Nuevo</TableCell><TableCell align="right">Δ tarea</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filas.map(({ a, base, nuevo, delta }) => (
                    <TableRow key={a.id}>
                      <TableCell><Typography variant="caption">{RUBROS_MAP[a.rubro_id]?.num}. {a.tarea}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption">{fmt(base)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={600}>{fmt(nuevo)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" color="warning.main">+{fmtM(delta)}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {valido && (
            <Alert severity="warning">Delta total a redeterminar: <strong>{fmt(Math.round(deltaTotal))}</strong> — se generará un anexo de adición por ese monto.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<CalculateIcon />} disabled={!valido} onClick={() => onAplicar({ aumentoPct: Number(aumento), delta: Math.round(deltaTotal) })}>
          Aplicar y generar anexo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab: APU y rendimiento (Etapa 9 + 14) ────────────────────────────────────
function TabApuRendimiento({ rubros, partes, onNuevoParte, onGenerarAnexoCCT }) {
  const [dlgCCT, setDlgCCT] = useState(false);
  const [apuSel, setApuSel] = useState(APUS[0].id);
  const apu      = APUS.find(a => a.id === apuSel);
  const desg     = apuPrecioUnitario(apu);
  const cant     = computoTotal(apu.id);
  const hhUnidad = apuHHporUnidad(apu);
  const rubroApu = RUBROS_MAP[apu.rubro_id];

  const rubrosConApu = rubros.filter(r => apusDeRubro(r.id).length > 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap flex={1}>
          <KpiCard label="Convenio" value={CCT_SALARIAL.convenio} sub={`vigencia ${CCT_SALARIAL.vigencia}`} />
          <KpiCard label="Cargas sociales" value={`${(CCT_SALARIAL.cargas_sociales_pct * 100).toFixed(2)}%`} sub="sobre el valor hora" />
          <KpiCard label="APU cargados" value={APUS.length} sub="análisis de precios" />
          <KpiCard label="Partes diarios" value={partes.length} sub="cuadrilla jornalizada" />
        </Stack>
        <Stack direction="row" spacing={1} ml={2} flexShrink={0}>
          <Button variant="outlined" startIcon={<CalculateIcon />} onClick={() => setDlgCCT(true)}>Actualizar CCT</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevoParte}>Registrar parte</Button>
        </Stack>
      </Stack>

      <Typography variant="subtitle2" fontWeight={600} mb={1}>Tabla salarial CCT</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'neutral.50' }}>
            <TableCell>Categoría</TableCell><TableCell align="right">Valor hora</TableCell><TableCell align="right">+ cargas</TableCell><TableCell align="right">Costo horario cargado</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {CCT_SALARIAL.categorias.map(c => (
              <TableRow key={c.codigo} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{c.nombre}</Typography></TableCell>
                <TableCell align="right">{fmt(c.valor_hora)}</TableCell>
                <TableCell align="right"><Typography variant="caption" color="text.disabled">×{(1 + CCT_SALARIAL.cargas_sociales_pct).toFixed(4)}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmt(costoHoraCargado(c.codigo))}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" fontWeight={600}>Análisis de precio unitario (APU)</Typography>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Tarea</InputLabel>
          <Select value={apuSel} onChange={e => setApuSel(e.target.value)} label="Tarea">
            {APUS.map(a => <MenuItem key={a.id} value={a.id}>{RUBROS_MAP[a.rubro_id]?.num}. {a.tarea}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
          <KpiCard label="Precio unitario" value={`${fmt(desg.total)} /${apu.unidad}`} sub={`incl. IVA ${Math.round(apu.iva_pct * 100)}%`} color="primary.main" />
          <KpiCard label="Rendimiento" value={`${(Math.round(hhUnidad * 100) / 100)} HH/${apu.unidad}`} sub="mano de obra por unidad" />
          <KpiCard label="Cómputo total" value={`${cant.toFixed(2)} ${apu.unidad}`} sub={`rubro ${rubroApu?.num}. ${rubroApu?.nombre}`} />
          <KpiCard label="Costo de la tarea" value={fmtM(Math.round(desg.total * cant))} sub="precio unitario × cómputo" color="warning.main" />
        </Stack>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="caption" color="text.secondary">Desglose por {apu.unidad}</Typography>
            <Table size="small">
              <TableBody>
                <TableRow><TableCell>Mano de obra</TableCell><TableCell align="right">{fmt(Math.round(desg.mo))}</TableCell></TableRow>
                <TableRow><TableCell>Materiales</TableCell><TableCell align="right">{fmt(Math.round(desg.mat))}</TableCell></TableRow>
                <TableRow><TableCell>Equipos ({Math.round(apu.equipos_pct * 100)}%)</TableCell><TableCell align="right">{fmt(Math.round(desg.eq))}</TableCell></TableRow>
                <TableRow><TableCell>G.G. + beneficio ({Math.round((apu.gg_pct + apu.beneficio_pct) * 100)}%)</TableCell><TableCell align="right">{fmt(Math.round(desg.neto - desg.subtotal))}</TableCell></TableRow>
                <TableRow><TableCell>IVA ({Math.round(apu.iva_pct * 100)}%)</TableCell><TableCell align="right">{fmt(Math.round(desg.total - desg.neto))}</TableCell></TableRow>
                <TableRow sx={{ bgcolor: 'neutral.100' }}><TableCell><strong>Precio unitario</strong></TableCell><TableCell align="right"><strong>{fmt(desg.total)}</strong></TableCell></TableRow>
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="caption" color="text.secondary">Cómputo métrico</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>Medición</TableCell><TableCell align="center">L×A×H×n</TableCell><TableCell align="right">Parcial</TableCell></TableRow></TableHead>
              <TableBody>
                {(COMPUTOS[apu.id] || []).map((m, i) => (
                  <TableRow key={i}>
                    <TableCell><Typography variant="caption">{m.desc}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="caption" color="text.disabled">{m.largo}×{m.ancho}×{m.alto}×{m.rep}</Typography></TableCell>
                    <TableCell align="right">{computoParcial(m).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'neutral.100' }}><TableCell colSpan={2}><strong>Total {apu.unidad}</strong></TableCell><TableCell align="right"><strong>{cant.toFixed(2)}</strong></TableCell></TableRow>
              </TableBody>
            </Table>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" fontWeight={600} mb={1}>Rendimiento de mano de obra (HH reales vs. presupuestadas)</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'neutral.50' }}>
            <TableCell>Rubro</TableCell><TableCell align="center">Avance físico</TableCell><TableCell align="right">HH presup.</TableCell><TableCell align="right">HH reales</TableCell><TableCell align="right">$ jornal</TableCell><TableCell align="center">Rendimiento</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rubrosConApu.map(r => {
              const hhPresup = hhPresupPorRubro(r.id, r.avance);
              const hhReal   = hhRealesPorRubro(r.id, partes);
              const costoJ   = jornalPorRubro(r.id, partes);
              const ratio    = hhPresup > 0 ? hhReal / hhPresup : null;
              return (
                <TableRow key={r.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={500}>{r.num}. {r.nombre}</Typography></TableCell>
                  <TableCell align="center"><Chip size="small" label={`${r.avance}%`} color={avanceColor(r.avance)} /></TableCell>
                  <TableCell align="right">{hhPresup > 0 ? `${Math.round(hhPresup)} HH` : <Typography variant="caption" color="text.disabled">sin ejecución</Typography>}</TableCell>
                  <TableCell align="right">{hhReal > 0 ? `${hhReal} HH` : '—'}</TableCell>
                  <TableCell align="right">{costoJ > 0 ? fmt(costoJ) : '—'}</TableCell>
                  <TableCell align="center">
                    {ratio !== null && hhReal > 0
                      ? <Chip size="small" label={`${ratio.toFixed(2)} · ${ratio > 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}% HH`} color={ratio <= 1 ? 'success' : ratio <= 1.1 ? 'warning' : 'error'} />
                      : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Alert severity="info" sx={{ mb: 3 }} icon={<SpeedIcon />}>
        Rendimiento = HH reales (partes diarios) ÷ HH presupuestadas (APU × cómputo × avance). Mayor a 1 = sobrecosto de mano de obra. Compara la cuadrilla jornalizada contra lo que el presupuesto preveía.
      </Alert>

      <Typography variant="subtitle2" fontWeight={600} mb={1}>Partes diarios</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'neutral.50' }}>
            <TableCell>Fecha</TableCell><TableCell>Cuadrilla</TableCell><TableCell>Rubro</TableCell><TableCell>HH</TableCell><TableCell align="right">Costo</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {[...partes].reverse().map(p => (
              <TableRow key={p.id} hover>
                <TableCell>{p.fecha}</TableCell>
                <TableCell>{CONTRATISTAS_MAP[p.contratista_id]?.nombre}</TableCell>
                <TableCell>{RUBROS_MAP[p.rubro_id]?.num}. {RUBROS_MAP[p.rubro_id]?.nombre}</TableCell>
                <TableCell><Typography variant="caption">{p.renglones.map(r => `${r.hh} ${CCT_MAP[r.categoria]?.nombre.split(' ')[0]}`).join(' · ')}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmt(jornalCostoParte(p))}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogActualizarCCT open={dlgCCT} onClose={() => setDlgCCT(false)} onAplicar={(p) => { onGenerarAnexoCCT(p); setDlgCCT(false); }} />
    </Box>
  );
}

// ─── Config de tabs por rol ───────────────────────────────────────────────────

// Etapa 8: los tabs se DERIVAN de las capacidades del rol, no de listas cableadas.
// Cada tab requiere la capacidad 'ver' de su módulo.
const TABS_CONFIG = [
  { key: 'ejecucion',  label: 'Ejecución',     cap: 'ejecucion' },
  { key: 'cobro',      label: 'Plan de cobro', cap: 'plan_cobro' },
  { key: 'certs',      label: 'Certificados',  cap: 'certificados' },
  { key: 'manoobra',   label: 'Mano de obra',  cap: 'mano_obra' },
  { key: 'anexos',     label: 'Anexos',        cap: 'anexos' },
  { key: 'cronograma', label: 'Cronograma',    cap: 'cronograma' },
  { key: 'apu',        label: 'APU y rendimiento', cap: 'apu' },
  { key: 'caja',       label: 'Flujo de caja', cap: 'caja' },
  { key: 'reportes',   label: 'Reportes',      cap: 'reportes' },
];

// Matriz de capacidades por rol (plantilla editable por empresa). `ejecucion_margen.ver`
// es el toggle que decide si el rol ve la columna de costo/margen (dato sensible).
const ROLES_CAPS = {
  admin: {
    ejecucion: ['ver'], plan_cobro: ['ver', 'registrar_cobro'], certificados: ['ver', 'cargar', 'aprobar'],
    mano_obra: ['ver', 'certificar', 'aprobar_pago'], anexos: ['ver', 'cargar'], cronograma: ['ver', 'editar'],
    apu: ['ver'], caja: ['ver'], reportes: ['ver', 'emitir_conforme'], ejecucion_margen: ['ver'],
  },
  director: {
    ejecucion: ['ver'], certificados: ['ver', 'cargar'], mano_obra: ['ver', 'certificar'],
    anexos: ['ver', 'cargar'], cronograma: ['ver', 'editar'], apu: ['ver'], reportes: ['ver', 'emitir_conforme'],
    ejecucion_margen: ['ver'],   // sacarle esta capacidad le oculta margen/gastado real
  },
  comercial: {
    plan_cobro: ['ver', 'registrar_cobro'], certificados: ['ver'], mano_obra: ['ver', 'aprobar_pago'],
    caja: ['ver'], reportes: ['ver'],
  },
  jefe: {
    // Jefe de obra: carga avance, certifica y carga partes; NO ve costo/margen (sin ejecucion_margen).
    ejecucion: ['ver'], certificados: ['ver', 'cargar'], mano_obra: ['ver', 'certificar'],
    cronograma: ['ver'], apu: ['ver'], reportes: ['ver'],
  },
};

const can = (rol, cap, accion = 'ver') => (ROLES_CAPS[rol]?.[cap] || []).includes(accion);

const ROL_INFO = {
  director:  { label: 'Director de obra', icon: <EngineeringIcon fontSize="small" /> },
  jefe:      { label: 'Jefe de obra',     icon: <ConstructionIcon fontSize="small" /> },
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
  const [contratistas]                  = useState(CONTRATISTAS_INIT);
  const [certsMO,      setCertsMO]      = useState(CERTIFICACIONES_MO_INIT);
  const [ordenesPago,  setOrdenesPago]  = useState(ORDENES_PAGO_INIT);
  const [inconvenientes, setInconvenientes] = useState(INCONVENIENTES_INIT);
  const [partes,       setPartes]       = useState(PARTES_DIARIOS_INIT);
  const [dlgParte,     setDlgParte]     = useState(false);
  const [dlgCert,      setDlgCert]      = useState(false);
  const [dlgAnexo,     setDlgAnexo]     = useState(false);
  const [dlgWA,        setDlgWA]        = useState(false);
  const [dlgCertMO,    setDlgCertMO]    = useState(false);
  const [dlgInconv,    setDlgInconv]    = useState(false);
  const [avanceRubro,  setAvanceRubro]  = useState(null);   // rubro en edición de avance físico
  const [certPrefill,  setCertPrefill]  = useState(null);   // puente avance → certificado
  const [ppFinalizado, setPpFinalizado] = useState(false);  // ciclo de vida del PP
  const [retencionLiberada, setRetencionLiberada] = useState(false);

  const visibleTabs = TABS_CONFIG.filter(t => can(rol, t.cap, 'ver'));
  const activeKey   = visibleTabs[tab]?.key;
  const verMargen   = can(rol, 'ejecucion_margen', 'ver');

  const handleRolChange = (_, nuevoRol) => {
    if (!nuevoRol) return;
    setRol(nuevoRol);
    setTab(0);
  };

  // Crear cert (período con renglones) como borrador. coef/monto_ars quedan en null hasta aprobar.
  const handleGuardarCert = ({ periodo, fechaValorizacion, renglones, notas, adjuntos, enviar }) => {
    const numero = String(certificados.length + 1).padStart(3, '0');
    const hoyStr = hoy.toLocaleDateString('es-AR');
    const nuevo = {
      id: `c${certificados.length + 1}`, numero,
      fecha: hoyStr, periodo, fecha_valorizacion: fechaValorizacion ?? hoyStr,
      notas, adjuntos: adjuntos ?? [],
      estado: enviar ? 'enviado' : 'borrador',
      fecha_envio: enviar ? hoyStr : null,
      fecha_aprobacion: null, aprobacion: null,
      renglones: (renglones ?? []).map(r => ({
        rubro_id: r.rubro_id, rubro: r.rubro,
        avance_acumulado_pct: r.avance_acumulado_pct, avance_periodo_pct: r.avance_periodo_pct,
        monto_base: r.monto_base, coeficiente_aplicado: null, monto_ars: null,
      })),
    };
    setCertificados(p => [...p, nuevo]);
    // El avance certificado NO se toca al crear: es derivado de los certs aprobados (certAvanceAprobado).
    // r.avance queda como avance FÍSICO declarado, independiente del certificado.
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
    // 1) Aprobar y CONGELAR coeficiente + monto_ars de cada renglón a la fecha de valorización (#1).
    const coef = coefRedeterminacion(cert.fecha_valorizacion);
    const certAprobado = {
      ...cert, estado: 'aprobado', fecha_aprobacion: hoyStr,
      aprobacion: { fecha_aprobacion_cliente: hoyStr, fecha_registro: hoyStr, medio: 'mail', registrado_por: 'director' },
      renglones: cert.renglones.map(r => ({ ...r, coeficiente_aplicado: coef, monto_ars: Math.round(r.monto_base * coef) })),
    };
    const certsAfter = certificados.map(c => c.id === certId ? certAprobado : c);
    setCertificados(certsAfter);
    // 2) Desbloqueo proporcional por rubro de cada renglón (avance certificado acumulado aprobado).
    setCuotas(prev => prev.map(q => {
      if (q.tipo !== 'certificado') return q;
      const avance = certAvanceAprobado(q.rubro_id, certsAfter);
      if (avance === 0) return q;
      const nuevoLiberado = Math.round(q.monto * avance / 100);
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
      // El cobro es el NETO (bruto − retención − amortización) para cuotas tipo certificado (#2).
      const montoCobrado = q.tipo === 'certificado' ? desgloseCobro(q.monto_liberado).neto : q.monto_liberado;
      return {
        ...q,
        monto_cobrado: montoCobrado,
        fecha_cobro: hoy.toLocaleDateString('es-AR'),
        estado: q.monto_liberado >= q.monto ? 'cobrado' : 'esperando',
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

  // ── Avance físico: carga + historial, desacoplado del certificado ──
  const handleActualizarAvance = (rubroId, pct, nota, fotos) => {
    const hoyStr = hoy.toLocaleDateString('es-AR');
    setRubros(prev => prev.map(r => r.id !== rubroId ? r : {
      ...r,
      avance: pct,
      historial_avance: [
        ...(r.historial_avance || []),
        { fecha: hoyStr, avance_acumulado_pct: pct, registrado_por: 'Jefe de obra', fotos: fotos ?? [], nota: nota || 'Avance cargado.' },
      ],
    }));
  };

  // Puente: abrir el certificado al cliente pre-cargado con el avance recién declarado.
  const handleCertificarDesdeAvance = (rubroId, pct) => {
    setCertPrefill({ rubroId, avance: pct });
    setDlgCert(true);
  };

  const handleCerrarCert = () => { setDlgCert(false); setCertPrefill(null); };

  // ── Mano de obra (outbound) ──
  const handleNuevaCertMO = ({ contratista_id, adjuntos, renglones }) => {
    const numero = `MO-${String(certsMO.length + 1).padStart(3, '0')}`;
    setCertsMO(p => [...p, {
      id: `cm${p.length + 1}`, numero, fecha: hoy.toLocaleDateString('es-AR'),
      periodo: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`,
      contratista_id, estado: 'borrador', orden_pago_id: null, adjuntos: adjuntos ?? [], renglones,
    }]);
  };

  // Aprobar certificación → generar orden de pago por el neto (bruto − retención − amortización).
  const handleAprobarCertMO = (certId) => {
    const cert = certsMO.find(c => c.id === certId);
    if (!cert) return;
    const contratista = CONTRATISTAS_MAP[cert.contratista_id];
    const bruto = cert.renglones.reduce((s, r) => s + r.monto_periodo, 0);
    const d = desglosePago(bruto, contratista);
    const opId = `op${ordenesPago.length + 1}`;
    setOrdenesPago(p => [...p, {
      id: opId, numero: `OP-${String(p.length + 1).padStart(3, '0')}`,
      fecha: hoy.toLocaleDateString('es-AR'), contratista_id: cert.contratista_id, certificacion_id: certId,
      bruto: d.bruto, retencion: d.retencion, amortizacion: d.amortizacion, neto: d.neto, estado: 'pendiente',
    }]);
    setCertsMO(p => p.map(c => c.id === certId ? { ...c, estado: 'aprobada', orden_pago_id: opId } : c));
  };

  // Pagar orden → marca pagada la orden y su certificación (el egreso se imputa al rubro).
  const handlePagarOrden = (opId) => {
    const op = ordenesPago.find(o => o.id === opId);
    setOrdenesPago(p => p.map(o => o.id === opId ? { ...o, estado: 'pagada' } : o));
    if (op) setCertsMO(p => p.map(c => c.id === op.certificacion_id ? { ...c, estado: 'pagada' } : c));
  };

  const handleNuevoInconveniente = ({ rubro_id, tipo, descripcion, fotos }) => {
    setInconvenientes(p => [...p, {
      id: `i${p.length + 1}`, fecha: hoy.toLocaleDateString('es-AR'),
      rubro_id, tipo, descripcion, fotos: fotos ?? [], estado: 'abierto', registrado_por: 'Jefe de obra',
    }]);
  };

  const handleResolverInconveniente = (incId) =>
    setInconvenientes(p => p.map(i => i.id === incId ? { ...i, estado: 'resuelto' } : i));

  // ── Conforme de obra: cierra el ciclo de vida y libera el fondo de reparo ──
  const handleCompletarObra = () => {
    const hoyStr = hoy.toLocaleDateString('es-AR');
    setRubros(prev => prev.map(r => r.avance === 100 ? r : {
      ...r, avance: 100,
      historial_avance: [...(r.historial_avance || []), { fecha: hoyStr, avance_acumulado_pct: 100, registrado_por: 'Jefe de obra', fotos: [], nota: 'Cierre de obra al 100%.' }],
    }));
  };

  const handleEmitirConforme = () => {
    setPpFinalizado(true);
    setRetencionLiberada(true);
  };

  const handleNuevoParte = ({ contratista_id, rubro_id, renglones }) => {
    setPartes(p => [...p, {
      id: `pd${p.length + 1}`, fecha: hoy.toLocaleDateString('es-AR'),
      contratista_id, rubro_id, renglones,
    }]);
  };

  // Actualización masiva del CCT → genera un anexo de adición por el delta redeterminado.
  const handleGenerarAnexoCCT = ({ aumentoPct, delta }) => {
    handleGuardarAnexo({ tipo: 'adicion', motivo: `Redeterminación por actualización salarial CCT +${aumentoPct}%`, monto: delta, accionCuota: 'ignorar' });
  };

  return (
    <>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.darkest', color: 'white', px: 3, py: 2.5 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <Chip size="small" label={ppFinalizado ? 'Finalizada' : 'En ejecución'} color={ppFinalizado ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
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
              const count = t.key === 'cobro' ? cuotas.length : t.key === 'certs' ? certificados.length : t.key === 'manoobra' ? certsMO.length : t.key === 'anexos' ? anexos.length : null;
              return <Tab key={t.key} label={count !== null ? `${t.label} (${count})` : t.label} />;
            })}
          </Tabs>
        </Container>
      </Box>

      {/* Contenido */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {activeKey === 'ejecucion'  && <TabEjecucion rubros={rubros} certificados={certificados} gastos={gastos} certificacionesMO={certsMO} ordenesPago={ordenesPago} partes={partes} verMargen={verMargen} onActualizarAvance={setAvanceRubro} />}
        {activeKey === 'cobro'      && <TabPlanCobro cuotas={cuotas} rubros={rubros} certificados={certificados} onAgregarCuota={() => {}} onCobrar={handleCobrarCuota} retencionLiberada={retencionLiberada} />}
        {activeKey === 'certs'      && <TabCertificados certificados={certificados} rubros={rubros} onNuevoCert={() => setDlgCert(true)} onEnviar={handleEnviarCert} onAprobar={handleAprobarCert} onRechazar={handleRechazarCert} onWA={() => setDlgWA(true)} readOnly={rol === 'comercial'} />}
        {activeKey === 'manoobra'   && <TabManoObra contratistas={contratistas} certificacionesMO={certsMO} ordenesPago={ordenesPago} rubros={rubros} certificados={certificados} onNuevaCert={() => setDlgCertMO(true)} onAprobarCert={handleAprobarCertMO} onPagarOrden={handlePagarOrden} />}
        {activeKey === 'anexos'     && <TabAnexos anexos={anexos} onNuevoAnexo={() => setDlgAnexo(true)} />}
        {activeKey === 'cronograma' && <TabCronograma rubros={rubros} />}
        {activeKey === 'apu'        && <TabApuRendimiento rubros={rubros} partes={partes} onNuevoParte={() => setDlgParte(true)} onGenerarAnexoCCT={handleGenerarAnexoCCT} />}
        {activeKey === 'caja'       && <TabFlujoCaja rubros={rubros} certificados={certificados} cuotas={cuotas} />}
        {activeKey === 'reportes'   && <TabReportes rubros={rubros} certificados={certificados} cuotas={cuotas} inconvenientes={inconvenientes} onNuevoInconveniente={() => setDlgInconv(true)} onResolverInconveniente={handleResolverInconveniente} onCompletarObra={handleCompletarObra} onEmitirConforme={handleEmitirConforme} ppFinalizado={ppFinalizado} retencionLiberada={retencionLiberada} />}
      </Container>

      <DialogNuevoCertificado open={dlgCert} onClose={handleCerrarCert} rubros={rubros} cuotas={cuotas} certificados={certificados} onGuardar={handleGuardarCert} prefill={certPrefill} />
      <DialogNuevoAnexo open={dlgAnexo} onClose={() => setDlgAnexo(false)} onGuardar={handleGuardarAnexo} />
      <DialogWASimulator open={dlgWA} onClose={() => setDlgWA(false)} rubros={rubros} onGuardar={handleGuardarCert} onActualizarAvance={handleActualizarAvance} />
      <DialogActualizarAvance open={!!avanceRubro} rubro={avanceRubro} onClose={() => setAvanceRubro(null)} onGuardar={handleActualizarAvance} onCertificar={handleCertificarDesdeAvance} />
      <DialogNuevaCertificacionMO open={dlgCertMO} onClose={() => setDlgCertMO(false)} contratistas={contratistas} certificacionesMO={certsMO} onGuardar={handleNuevaCertMO} />
      <DialogInconveniente open={dlgInconv} onClose={() => setDlgInconv(false)} rubros={rubros} onGuardar={handleNuevoInconveniente} />
      <DialogParteDiario open={dlgParte} onClose={() => setDlgParte(false)} contratistas={contratistas} onGuardar={handleNuevoParte} />
    </>
  );
}

export default function Page() {
  return (
    <PublicLayout title="Mock — Control de Obra">
      <MockObraPage />
    </PublicLayout>
  );
}
