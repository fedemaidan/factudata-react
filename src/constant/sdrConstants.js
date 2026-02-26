/**
 * Constantes centralizadas del módulo SDR Comercial.
 * Todos los componentes frontend importan de aquí.
 * 
 * Ver SDR-COMERCIAL-TECNICO.md sección 1.9
 */

import FiberNewIcon from '@mui/icons-material/FiberNew';
import PhoneIcon from '@mui/icons-material/Phone';
import StarIcon from '@mui/icons-material/Star';
import HandshakeIcon from '@mui/icons-material/Handshake';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PhoneDisabledIcon from '@mui/icons-material/PhoneDisabled';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BlockIcon from '@mui/icons-material/Block';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';

// ─────────────────────────────────────────────
// Estados del contacto (10, sin meets)
// ─────────────────────────────────────────────
export const ESTADOS_CONTACTO = {
    nuevo:                { label: 'Nuevo',               color: 'info',    icon: FiberNewIcon,      emoji: 'ℹ️' },
    contactado:           { label: 'Contactado',          color: 'warning', icon: PhoneIcon,         emoji: '💬' },
    calificado:           { label: 'Calificado',          color: 'success', icon: StarIcon,          emoji: '⭐' },
    cierre:               { label: 'En cierre',           color: 'success', icon: HandshakeIcon,     emoji: '🤝' },
    ganado:               { label: 'Ganado',              color: 'success', icon: EmojiEventsIcon,   emoji: '🏆' },
    no_contacto:          { label: 'No contactado',       color: 'default', icon: PhoneDisabledIcon, emoji: '📵' },
    no_responde:          { label: 'No responde',         color: 'default', icon: DoNotDisturbIcon,  emoji: '👻' },
    revisar_mas_adelante: { label: 'Revisar más adelante', color: 'warning', icon: ScheduleIcon,     emoji: '⏰' },
    no_califica:          { label: 'No califica',         color: 'error',   icon: BlockIcon,         emoji: '🚫' },
    perdido:              { label: 'Perdido',             color: 'error',   icon: ThumbDownIcon,     emoji: '❌' },
};

// ─────────────────────────────────────────────
// Planes de Sorby
// ─────────────────────────────────────────────
export const PLANES_SORBY = {
    basico:   { label: 'Básico',   color: 'success',   precio: 250000, icon: '🟢' },
    avanzado: { label: 'Avanzado', color: 'primary',   precio: 375000, icon: '🔵' },
    premium:  { label: 'Premium',  color: 'secondary', precio: 625000, icon: '🟣' },
    a_medida: { label: 'A medida', color: 'warning',   precio: null,   icon: '🟡' },
};

// ─────────────────────────────────────────────
// Intención de compra
// ─────────────────────────────────────────────
export const INTENCIONES_COMPRA = {
    alta:  { label: 'Alta',  color: 'error',   icon: '🔴' },
    media: { label: 'Media', color: 'warning', icon: '🟠' },
    baja:  { label: 'Baja',  color: 'default', icon: '🟡' },
};

// ─────────────────────────────────────────────
// Pre-calificación del bot
// ─────────────────────────────────────────────
export const PRECALIFICACION_BOT = {
    sin_calificar: { label: 'Sin calificar', color: 'default', icon: '🤖' },
    no_llego:      { label: 'No llegó',      color: 'default', icon: '🤖' },
    calificado:    { label: 'Calificado',    color: 'info',    icon: '🤖' },
    quiere_meet:   { label: 'Quiere meet',   color: 'primary', icon: '🤖' },
};

// ─────────────────────────────────────────────
// Estados de reunión
// ─────────────────────────────────────────────
export const ESTADOS_REUNION = {
    agendada:  { label: 'Agendada',  color: 'primary', icon: '📅' },
    realizada: { label: 'Realizada', color: 'success', icon: '✅' },
    no_show:   { label: 'No show',   color: 'error',   icon: '❌' },
    cancelada: { label: 'Cancelada', color: 'default', icon: '🚫' },
};
