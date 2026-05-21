import React, { useMemo } from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { TIPOS_HORA, TIPO_META } from 'src/utils/dhn/tiposHora';
import { parseHHmm24 } from 'src/utils/dhn/configHorarios';

// Una barra horizontal 0:00–24:00 que pinta los `tramos` del día y superpone
// la `franjaNocturna` con un patrón sutil. Marcadores de entrada/salida para
// las variantes de turnoDiurno y turnoNoche.
//
// Solo lectura. Pura — re-renderiza con `configDia` del día activo.

const TOTAL_MIN = 1440;

function tramoBands(tramos) {
  if (!Array.isArray(tramos) || tramos.length === 0) {
    return [{ start: 0, end: TOTAL_MIN, tipo: TIPOS_HORA.NO_CUENTA }];
  }
  return tramos
    .map((t) => {
      const start = parseHHmm24(t.desde);
      const end = parseHHmm24(t.hasta);
      if (start == null || end == null || end <= start) return null;
      return { start, end, tipo: t.tipo };
    })
    .filter(Boolean);
}

function nocturnaBands(franja) {
  if (!Array.isArray(franja)) return [];
  return franja
    .map((f) => {
      const start = parseHHmm24(f.desde);
      const end = parseHHmm24(f.hasta);
      if (start == null || end == null || end <= start) return null;
      return { start, end, tipoPlus: f.tipoPlus };
    })
    .filter(Boolean);
}

const HOUR_TICKS = Array.from({ length: 25 }, (_, i) => i); // 0..24

const HorarioPreviewGrid = ({ configDia, label }) => {
  const tramos = useMemo(() => tramoBands(configDia?.tramos), [configDia]);
  const franjas = useMemo(() => nocturnaBands(configDia?.franjaNocturna), [configDia]);

  const turnoDiurno = Array.isArray(configDia?.turnoDiurno) ? configDia.turnoDiurno : [];
  const turnoNoche = Array.isArray(configDia?.turnoNoche) ? configDia.turnoNoche : [];

  const pctOf = (min) => `${(min / TOTAL_MIN) * 100}%`;

  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        {label ? (
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1 }}>
            Vista del día · {label}
          </Typography>
        ) : null}

        {/* Marcadores de entrada/salida de turnos */}
        <Box sx={{ position: 'relative', height: 24 }}>
          {turnoDiurno.map((v, idx) => {
            const e = parseHHmm24(v.entrada);
            const s = parseHHmm24(v.salida);
            return (
              <React.Fragment key={`d-${idx}`}>
                {e != null && (
                  <Marker pos={pctOf(e)} type="entrada" label={`Diurno ${idx + 1}: entrada ${v.entrada}`} variant={idx} />
                )}
                {s != null && (
                  <Marker pos={pctOf(s)} type="salida" label={`Diurno ${idx + 1}: salida ${v.salida}`} variant={idx} />
                )}
              </React.Fragment>
            );
          })}
          {turnoNoche.map((v, idx) => {
            const e = parseHHmm24(v.entrada);
            const s = parseHHmm24(v.salida);
            return (
              <React.Fragment key={`n-${idx}`}>
                {e != null && (
                  <Marker pos={pctOf(e)} type="entrada" night label={`Noche ${idx + 1}: entrada ${v.entrada}`} variant={idx} />
                )}
                {s != null && (
                  <Marker pos={pctOf(s)} type="salida" night label={`Noche ${idx + 1}: salida ${v.salida}`} variant={idx} />
                )}
              </React.Fragment>
            );
          })}
        </Box>

        {/* Barra de tramos */}
        <Box
          sx={{
            position: 'relative',
            height: 36,
            borderRadius: 1,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {tramos.map((t, idx) => (
            <Tooltip
              key={idx}
              title={`${minToHHmm(t.start)} → ${minToHHmm(t.end)} · ${TIPO_META[t.tipo]?.label || t.tipo}`}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: pctOf(t.start),
                  width: pctOf(t.end - t.start),
                  bgcolor: TIPO_META[t.tipo]?.color || '#cbd5e1',
                  borderRight: idx < tramos.length - 1 ? '1px solid rgba(255,255,255,0.5)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'common.white',
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {(t.end - t.start) / 60 >= 3 ? (TIPO_META[t.tipo]?.short || '') : ''}
              </Box>
            </Tooltip>
          ))}

          {/* Overlay franja nocturna: rayas diagonales sutiles */}
          {franjas.map((f, idx) => (
            <Tooltip
              key={`f-${idx}`}
              title={`Franja nocturna ${minToHHmm(f.start)} → ${minToHHmm(f.end)}${
                f.tipoPlus ? ` · ${TIPO_META[f.tipoPlus]?.label}` : ' (plus automático)'
              }`}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: pctOf(f.start),
                  width: pctOf(f.end - f.start),
                  pointerEvents: 'auto',
                  backgroundImage:
                    'repeating-linear-gradient(135deg, rgba(255,255,255,0) 0 4px, rgba(0,0,0,0.18) 4px 6px)',
                }}
              />
            </Tooltip>
          ))}
        </Box>

        {/* Eje de horas */}
        <Box sx={{ position: 'relative', height: 16 }}>
          {HOUR_TICKS.map((h) => (
            <Typography
              key={h}
              variant="caption"
              sx={{
                position: 'absolute',
                left: pctOf(h * 60),
                transform: h === 0 ? 'translateX(0)' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
                color: 'text.secondary',
                fontSize: 10,
                fontVariantNumeric: 'tabular-nums',
                display: { xs: h % 3 === 0 ? 'block' : 'none', sm: h % 2 === 0 ? 'block' : 'none', md: 'block' },
              }}
            >
              {String(h).padStart(2, '0')}
            </Typography>
          ))}
        </Box>

        {/* Leyenda */}
        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}
        >
          {dedup(tramos.map((t) => t.tipo)).map((tipo) => (
            <LegendItem key={tipo} color={TIPO_META[tipo]?.color} label={TIPO_META[tipo]?.label || tipo} />
          ))}
          {franjas.length > 0 ? <LegendItemNocturna /> : null}
        </Stack>
      </Stack>
    </Box>
  );
};

function dedup(arr) {
  return Array.from(new Set(arr));
}

function minToHHmm(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const Marker = ({ pos, type, label, night, variant = 0 }) => {
  const color = night ? '#312E81' : variant === 1 ? '#1e293b' : '#0f172a';
  const Icon = type === 'entrada' ? LoginIcon : LogoutIcon;
  return (
    <Tooltip title={label}>
      <Box
        sx={{
          position: 'absolute',
          left: pos,
          top: 0,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color,
        }}
      >
        <Icon sx={{ fontSize: 14 }} />
        <Box sx={{ width: 1, height: 6, bgcolor: color }} />
      </Box>
    </Tooltip>
  );
};

const LegendItem = ({ color, label }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Stack>
);

const LegendItemNocturna = () => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: 0.5,
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0) 0 3px, rgba(0,0,0,0.45) 3px 5px)',
        bgcolor: 'background.default',
      }}
    />
    <Typography variant="caption" color="text.secondary">
      Franja nocturna
    </Typography>
  </Stack>
);

export default HorarioPreviewGrid;
