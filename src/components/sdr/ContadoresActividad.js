import { Stack, Typography, Tooltip } from '@mui/material';
import { CONTADORES_CONFIG } from '../../constant/sdrConstants';

/**
 * Mini-badges compactos que muestran los contadores de actividad de un contacto.
 * Se usan en: tarjeta de lista, drawer de detalle, modo llamadas.
 *
 * Los contadores se calculan automáticamente desde el historial (backend $inc).
 * Nunca se editan manualmente.
 *
 * Ejemplo visual: 📵 2  📞 1  💬 3  📅 1
 *
 * Props:
 *   contadores: { llamadasNoAtendidas, llamadasAtendidas, mensajesEnviados, reunionesTotales }
 *   size: 'small' | 'medium' (default: 'small')
 */
export default function ContadoresActividad({ contadores = {}, size = 'small' }) {
    const fontSize = size === 'small' ? '0.75rem' : '0.85rem';
    const items = Object.entries(CONTADORES_CONFIG).map(([key, cfg]) => ({
        key,
        value: contadores[key] || 0,
        ...cfg
    }));

    // Si todos son 0, no mostrar nada (lead virgen)
    const hayActividad = items.some(i => i.value > 0);
    if (!hayActividad) return null;

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            {items.map(({ key, value, icon, label, color }) => (
                <Tooltip key={key} title={`${label}: ${value}`} arrow>
                    <Stack direction="row" spacing={0.3} alignItems="center" sx={{ cursor: 'default' }}>
                        <Typography sx={{ fontSize, lineHeight: 1 }}>{icon}</Typography>
                        <Typography sx={{ fontSize, fontWeight: 600, color, lineHeight: 1 }}>
                            {value}
                        </Typography>
                    </Stack>
                </Tooltip>
            ))}
        </Stack>
    );
}
