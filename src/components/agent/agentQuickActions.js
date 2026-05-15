import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';

// Catálogo único de acciones rápidas (cards con prefill que abre el chat con texto
// arrancado) y prompts de ejemplo (frases listas para enviar). Lo consumen
// pages/agente/index.js (EmptyState) y components/agent/AgentLauncherDialog.js.
//
// Cada item declara a qué specialist pertenece. El filtrado por permisos del
// usuario se hace con `pickQuickActions`/`pickExamplePrompts`, que aplican un
// round-robin para priorizar variedad entre specialists (1 por specialist
// habilitado antes de tomar un segundo del mismo).
//
// El orden dentro de cada specialist define la prioridad: el primer item es el
// "headliner" del módulo y el que aparece cuando hay 3+ specialists permitidos.

export const QUICK_ACTIONS_CATALOG = [
  {
    id: 'cargar_movimiento',
    specialist: 'movimiento',
    label: 'Cargar un movimiento',
    description: 'Registrá un ingreso o egreso por chat',
    prefill: 'Quiero cargar un egreso de ',
    icon: AddRoundedIcon,
    tone: 'primary',
  },
  {
    id: 'crear_reporte',
    specialist: 'reportes',
    label: 'Crear un reporte',
    description: 'Guardá una búsqueda como reporte',
    prefill: 'Quiero un reporte de ',
    icon: AssessmentRoundedIcon,
    tone: 'success',
  },
  {
    id: 'crear_presupuesto_profesional',
    specialist: 'presupuestos_profesionales',
    label: 'Armar presupuesto profesional',
    description: 'Cotización con plantilla SorbyData',
    prefill: 'Armame un presupuesto profesional para ',
    icon: RequestQuoteRoundedIcon,
    tone: 'primary',
  },
  {
    id: 'estado_presupuesto',
    specialist: 'presupuestos',
    label: 'Cómo va un presupuesto',
    description: 'Ejecutado vs presupuestado',
    prefill: 'Cómo va el presupuesto de ',
    icon: InsightsRoundedIcon,
    tone: 'success',
  },
  {
    id: 'buscar_movimientos',
    specialist: 'movimiento',
    label: 'Buscar movimientos',
    description: 'Filtrá por fecha, proyecto o monto',
    prefill: 'Mostrame los últimos ',
    icon: SearchRoundedIcon,
    tone: 'success',
  },
  {
    id: 'editar_movimiento',
    specialist: 'movimiento',
    label: 'Editar un movimiento',
    description: 'Corregí un dato cargado antes',
    prefill: 'Quiero editar el movimiento ',
    icon: EditRoundedIcon,
    tone: 'warning',
  },
  {
    id: 'ver_reportes',
    specialist: 'reportes',
    label: 'Ver mis reportes',
    description: 'Lista de reportes guardados',
    prefill: 'Qué reportes tengo',
    icon: FormatListBulletedRoundedIcon,
    tone: 'primary',
  },
  {
    id: 'presupuestos_sobreejecutados',
    specialist: 'presupuestos',
    label: 'Presupuestos sobreejecutados',
    description: 'Alertas de partidas excedidas',
    prefill: 'Qué presupuestos están sobreejecutados',
    icon: WarningAmberRoundedIcon,
    tone: 'warning',
  },
];

export const EXAMPLE_PROMPTS_CATALOG = [
  { id: 'cuanto_gaste', specialist: 'movimiento', text: '¿Cuánto gasté este mes?' },
  { id: 'que_reportes', specialist: 'reportes', text: '¿Qué reportes tengo?' },
  {
    id: 'presup_prof_vivienda',
    specialist: 'presupuestos_profesionales',
    text: 'Armame un presupuesto profesional para una vivienda',
  },
  {
    id: 'estado_obra',
    specialist: 'presupuestos',
    text: '¿Cómo va el presupuesto de mi último proyecto?',
  },
  {
    id: 'cargar_egreso',
    specialist: 'movimiento',
    text: 'Cargá un egreso de $50.000 para materiales',
  },
  {
    id: 'ultimos_movimientos',
    specialist: 'movimiento',
    text: 'Mostrame los últimos 5 movimientos',
  },
];

// Default cuando todavía no se cargaron permisos: nada para no parpadear.
const EMPTY_SPECIALISTS = Object.freeze({});

// Round-robin: toma el 1ro de cada specialist habilitado, después los 2dos, etc.
// Garantiza variedad entre módulos antes de repetir uno.
function pickDiverseTopN(items, specialists, n) {
  const enabled = items.filter((i) => specialists[i.specialist] === true);
  if (enabled.length <= n) return enabled;

  const queues = new Map();
  for (const item of enabled) {
    if (!queues.has(item.specialist)) queues.set(item.specialist, []);
    queues.get(item.specialist).push(item);
  }
  const queueList = Array.from(queues.values());

  const out = [];
  for (let round = 0; out.length < n; round += 1) {
    let added = false;
    for (const q of queueList) {
      if (out.length >= n) break;
      if (q[round]) {
        out.push(q[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

export function pickQuickActions(specialists = EMPTY_SPECIALISTS, n = 3) {
  return pickDiverseTopN(QUICK_ACTIONS_CATALOG, specialists, n);
}

export function pickExamplePrompts(specialists = EMPTY_SPECIALISTS, n = 3) {
  return pickDiverseTopN(EXAMPLE_PROMPTS_CATALOG, specialists, n);
}

export const EXAMPLE_PROMPT_ICON = ChatBubbleOutlineRoundedIcon;
