import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Tooltip,
  Popover,
  Button,
  IconButton,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  Divider,
  Chip,
  TextField,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import {
  TIPOS_HORA,
  TIPO_META,
  TIPOS_VALIDOS,
  DIAS,
  SPLIT_STEP_MIN,
  emptyHours,
  parseHHmm,
  normalizeHHmm,
  isTurnoValido,
  VENTANA_TURNO_MIN,
} from 'src/utils/dhn/tiposHora';

const ENTRADA_COLOR = '#10B981';
const SALIDA_COLOR = '#F04438';

const CELL_HEIGHT = 28;
const HOUR_COL_WIDTH = 56;
const DAY_COL_MIN = 96;

function getCellTipo(cell) {
  if (!cell) return TIPOS_HORA.NO_CUENTA;
  if (cell.split) return null;
  return cell.tipo || TIPOS_HORA.NO_CUENTA;
}

function cellFillSx(cell) {
  if (cell?.split) {
    const before = TIPO_META[cell.split.before] || TIPO_META[TIPOS_HORA.NO_CUENTA];
    const after = TIPO_META[cell.split.after] || TIPO_META[TIPOS_HORA.NO_CUENTA];
    const pct = (cell.split.atMin / 60) * 100;
    return {
      background: `linear-gradient(to bottom, ${alpha(before.color, 0.18)} 0%, ${alpha(before.color, 0.18)} ${pct}%, ${alpha(after.color, 0.18)} ${pct}%, ${alpha(after.color, 0.18)} 100%)`,
    };
  }
  const meta = TIPO_META[cell?.tipo || TIPOS_HORA.NO_CUENTA];
  return {
    backgroundColor: cell?.tipo === TIPOS_HORA.NO_CUENTA ? 'transparent' : alpha(meta.color, 0.16),
  };
}

function cellLabel(cell) {
  if (cell?.split) {
    return `${TIPO_META[cell.split.before].short}/${TIPO_META[cell.split.after].short}`;
  }
  const meta = TIPO_META[cell?.tipo || TIPOS_HORA.NO_CUENTA];
  return meta.short;
}

function formatHora(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

const HorariosGridEditor = ({ config, onChange }) => {
  const [brush, setBrush] = useState(null);
  const [popover, setPopover] = useState({ open: false, anchor: null, dia: null, hour: null });
  const [copyMenu, setCopyMenu] = useState({ open: false, anchor: null, sourceDia: null });
  const [turnoEditor, setTurnoEditor] = useState({ open: false, anchor: null, dia: null, idx: null });

  const updateHour = useCallback((dia, hour, nextCell) => {
    if (!config?.[dia]) return;
    const nextHours = [...config[dia].hours];
    nextHours[hour] = nextCell;
    onChange({
      ...config,
      [dia]: { ...config[dia], hours: nextHours },
    });
  }, [config, onChange]);

  const paintDia = useCallback((dia, tipo) => {
    if (!config?.[dia]) return;
    const nextHours = Array.from({ length: 24 }, () => ({ tipo }));
    onChange({
      ...config,
      [dia]: { ...config[dia], hours: nextHours },
    });
  }, [config, onChange]);

  const clearDia = useCallback((dia) => {
    if (!config?.[dia]) return;
    onChange({
      ...config,
      [dia]: { ...config[dia], hours: emptyHours() },
    });
  }, [config, onChange]);

  const copyDia = useCallback((sourceDia, targetDia) => {
    if (!config?.[sourceDia] || !config?.[targetDia]) return;
    const cloned = config[sourceDia].hours.map((c) => (c?.split ? { split: { ...c.split } } : { tipo: c?.tipo || TIPOS_HORA.NO_CUENTA }));
    const turnosCloned = (config[sourceDia].turnos || []).map((t) => ({ ...t }));
    onChange({
      ...config,
      [targetDia]: { ...config[targetDia], hours: cloned, turnos: turnosCloned },
    });
  }, [config, onChange]);

  const setTurnos = useCallback((dia, nextTurnos) => {
    if (!config?.[dia]) return;
    onChange({
      ...config,
      [dia]: { ...config[dia], turnos: nextTurnos },
    });
  }, [config, onChange]);

  const upsertTurno = useCallback((dia, idx, turno) => {
    const prev = config?.[dia]?.turnos || [];
    const next = idx == null ? [...prev, turno] : prev.map((t, i) => (i === idx ? turno : t));
    setTurnos(dia, next);
  }, [config, setTurnos]);

  const removeTurno = useCallback((dia, idx) => {
    const prev = config?.[dia]?.turnos || [];
    setTurnos(dia, prev.filter((_, i) => i !== idx));
  }, [config, setTurnos]);

  const handleCellClick = useCallback((e, dia, hour) => {
    const cell = config?.[dia]?.hours?.[hour];
    if (brush) {
      updateHour(dia, hour, { tipo: brush });
      return;
    }
    setPopover({ open: true, anchor: e.currentTarget, dia, hour });
  }, [brush, config, updateHour]);

  const closePopover = useCallback(() => {
    setPopover({ open: false, anchor: null, dia: null, hour: null });
  }, []);

  const activeCell = popover.open && popover.dia != null && popover.hour != null
    ? config?.[popover.dia]?.hours?.[popover.hour]
    : null;

  const totalsPorDia = useMemo(() => {
    const out = {};
    for (const d of DIAS) {
      const hours = config?.[d.key]?.hours || [];
      let pagasMin = 0;
      for (const cell of hours) {
        if (cell?.split) {
          if (cell.split.before !== TIPOS_HORA.NO_CUENTA) pagasMin += cell.split.atMin;
          if (cell.split.after !== TIPOS_HORA.NO_CUENTA) pagasMin += 60 - cell.split.atMin;
        } else if (cell?.tipo && cell.tipo !== TIPOS_HORA.NO_CUENTA) {
          pagasMin += 60;
        }
      }
      out[d.key] = pagasMin / 60;
    }
    return out;
  }, [config]);

  const cellOverlays = useMemo(() => {
    const overlapInCell = (hour, rangeStart, rangeEnd) => {
      const cs = hour * 60;
      const ce = cs + 60;
      const os = Math.max(cs, rangeStart);
      const oe = Math.min(ce, rangeEnd);
      if (oe <= os) return null;
      return {
        topPct: ((os - cs) / 60) * 100,
        heightPct: ((oe - os) / 60) * 100,
      };
    };
    const out = {};
    for (const d of DIAS) {
      const turnos = config?.[d.key]?.turnos || [];
      const byHour = {};
      for (let h = 0; h < 24; h++) byHour[h] = { markers: [], ventanas: [] };
      for (const t of turnos) {
        const e = parseHHmm(t.entrada);
        const s = parseHHmm(t.salida);
        if (e == null || s == null) continue;
        // Marker entrada
        const eHour = Math.floor(e / 60);
        if (byHour[eHour]) {
          byHour[eHour].markers.push({
            kind: 'entrada',
            topPct: ((e % 60) / 60) * 100,
            label: t.entrada,
          });
        }
        // Marker salida
        const sHour = Math.floor(s / 60);
        if (byHour[sHour]) {
          byHour[sHour].markers.push({
            kind: 'salida',
            topPct: ((s % 60) / 60) * 100,
            label: t.salida,
          });
        }
        // Ventana entrada: [e - VENTANA, e), pero clampada a [0, 1440)
        const ventEStart = Math.max(0, e - VENTANA_TURNO_MIN);
        const ventEEnd = e;
        // Ventana salida: [s, s + VENTANA), idem
        const ventSStart = s;
        const ventSEnd = Math.min(1440, s + VENTANA_TURNO_MIN);
        for (let h = 0; h < 24; h++) {
          const oE = overlapInCell(h, ventEStart, ventEEnd);
          if (oE) byHour[h].ventanas.push({ kind: 'entrada', ...oE });
          const oS = overlapInCell(h, ventSStart, ventSEnd);
          if (oS) byHour[h].ventanas.push({ kind: 'salida', ...oS });
        }
      }
      out[d.key] = byHour;
    }
    return out;
  }, [config]);

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.5 }}>
            Pincel
          </Typography>
          <ToggleButtonGroup
            value={brush}
            exclusive
            size="small"
            onChange={(_, v) => setBrush(v)}
            sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButton-root': { border: 0 } }}
          >
            {TIPOS_VALIDOS.map((t) => {
              const meta = TIPO_META[t];
              const active = brush === t;
              return (
                <ToggleButton
                  key={t}
                  value={t}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: active ? alpha(meta.color, 0.22) : alpha(meta.color, 0.08),
                    color: meta.color,
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    textTransform: 'none',
                    boxShadow: active ? `inset 0 0 0 1.5px ${meta.color}` : 'none',
                    '&:hover': { backgroundColor: alpha(meta.color, 0.18) },
                    '&.Mui-selected': {
                      backgroundColor: alpha(meta.color, 0.22),
                      color: meta.color,
                    },
                  }}
                >
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color, mr: 0.75 }} />
                  {meta.label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
          <Box flex={1} />
          <Typography variant="caption" color="text.secondary">
            {brush ? 'Click en una celda o en el día para pintar' : 'Click en una celda para editar'}
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `${HOUR_COL_WIDTH}px repeat(${DIAS.length}, minmax(${DAY_COL_MIN}px, 1fr))`,
            minWidth: HOUR_COL_WIDTH + DIAS.length * DAY_COL_MIN,
          }}
        >
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              p: 1,
              fontWeight: 600,
              fontSize: '0.7rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Hora
          </Box>

          {DIAS.map((d) => (
            <Box
              key={d.key}
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderLeft: 1,
                borderColor: 'divider',
                px: 1,
                py: 0.75,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
                <Box
                  onClick={(e) => {
                    if (brush) {
                      paintDia(d.key, brush);
                    } else {
                      setCopyMenu({ open: true, anchor: e.currentTarget, sourceDia: d.key });
                    }
                  }}
                  sx={{ cursor: 'pointer', flex: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {d.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totalsPorDia[d.key]?.toFixed(2)}h pagas
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0}>
                  <Tooltip title="Copiar día a...">
                    <IconButton
                      size="small"
                      onClick={(e) => setCopyMenu({ open: true, anchor: e.currentTarget, sourceDia: d.key })}
                    >
                      <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Limpiar día">
                    <IconButton size="small" onClick={() => clearDia(d.key)}>
                      <RestartAltRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          ))}

          {Array.from({ length: 24 }, (_, hour) => (
            <React.Fragment key={`row-${hour}`}>
              <Box
                sx={{
                  height: CELL_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  pr: 1,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                  borderBottom: hour === 23 ? 0 : 1,
                  borderColor: 'divider',
                  bgcolor: hour % 2 === 0 ? alpha('#000', 0.015) : 'transparent',
                }}
              >
                {formatHora(hour)}
              </Box>

              {DIAS.map((d) => {
                const cell = config?.[d.key]?.hours?.[hour];
                const tipo = getCellTipo(cell);
                const isActive = popover.open && popover.dia === d.key && popover.hour === hour;
                const overlay = cellOverlays?.[d.key]?.[hour];
                const tooltip = cell?.split
                  ? `${d.label} ${formatHora(hour)}–${formatHora(hour + 1)}\n${formatHora(hour)}:${String(cell.split.atMin).padStart(2, '0')} • ${TIPO_META[cell.split.before].label} → ${TIPO_META[cell.split.after].label}`
                  : `${d.label} ${formatHora(hour)}–${formatHora(hour + 1)} · ${TIPO_META[tipo || TIPOS_HORA.NO_CUENTA].label}`;

                return (
                  <Tooltip key={`${d.key}-${hour}`} title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} placement="top" arrow disableInteractive>
                    <Box
                      onClick={(e) => handleCellClick(e, d.key, hour)}
                      sx={{
                        height: CELL_HEIGHT,
                        borderLeft: 1,
                        borderBottom: hour === 23 ? 0 : 1,
                        borderColor: 'divider',
                        cursor: brush ? 'crosshair' : 'pointer',
                        position: 'relative',
                        outline: isActive ? `2px solid ${TIPO_META[tipo || TIPOS_HORA.NORMAL].color}` : 'none',
                        outlineOffset: -2,
                        ...cellFillSx(cell),
                        '&:hover': {
                          filter: 'brightness(0.94)',
                          zIndex: 1,
                          boxShadow: `inset 0 0 0 1.5px ${alpha('#000', 0.18)}`,
                        },
                      }}
                    >
                      {overlay?.ventanas?.map((v, i) => (
                        <Box
                          key={`v-${i}`}
                          sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${v.topPct}%`,
                            height: `${v.heightPct}%`,
                            background: v.kind === 'entrada'
                              ? `repeating-linear-gradient(45deg, ${alpha(ENTRADA_COLOR, 0.08)} 0 4px, ${alpha(ENTRADA_COLOR, 0.16)} 4px 8px)`
                              : `repeating-linear-gradient(45deg, ${alpha(SALIDA_COLOR, 0.08)} 0 4px, ${alpha(SALIDA_COLOR, 0.16)} 4px 8px)`,
                            pointerEvents: 'none',
                          }}
                        />
                      ))}
                      {overlay?.markers?.map((m, i) => (
                        <Box
                          key={`m-${i}`}
                          sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${m.topPct}%`,
                            height: 0,
                            zIndex: 2,
                            pointerEvents: 'none',
                            borderTop: `2px solid ${m.kind === 'entrada' ? ENTRADA_COLOR : SALIDA_COLOR}`,
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 4,
                              top: -5,
                              width: 0,
                              height: 0,
                              borderLeft: '4px solid transparent',
                              borderRight: '4px solid transparent',
                              borderTop: `5px solid ${m.kind === 'entrada' ? ENTRADA_COLOR : SALIDA_COLOR}`,
                              transform: m.kind === 'entrada' ? 'none' : 'rotate(180deg)',
                              transformOrigin: 'center 2.5px',
                            },
                          }}
                        />
                      ))}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color: tipo === TIPOS_HORA.NO_CUENTA ? alpha('#000', 0.28) : alpha('#000', 0.7),
                          letterSpacing: 0.2,
                          pointerEvents: 'none',
                        }}
                      >
                        {cell?.split ? (
                          <Stack direction="row" alignItems="center" spacing={0.25}>
                            <CallSplitRoundedIcon sx={{ fontSize: 11, opacity: 0.65 }} />
                            <span>{cellLabel(cell)}</span>
                          </Stack>
                        ) : (
                          cellLabel(cell)
                        )}
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}

          <Box
            sx={{
              borderTop: 2,
              borderColor: alpha('#000', 0.08),
              p: 1,
              fontSize: '0.65rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 700,
              bgcolor: alpha('#000', 0.02),
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              pr: 1,
            }}
          >
            Turnos
          </Box>
          {DIAS.map((d) => {
            const turnos = config?.[d.key]?.turnos || [];
            return (
              <Box
                key={`turnos-${d.key}`}
                sx={{
                  borderTop: 2,
                  borderLeft: 1,
                  borderColor: alpha('#000', 0.08),
                  bgcolor: alpha('#000', 0.02),
                  p: 0.75,
                  minHeight: 56,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  alignItems: 'flex-start',
                  alignContent: 'flex-start',
                }}
              >
                {turnos.map((t, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    onClick={(e) => setTurnoEditor({ open: true, anchor: e.currentTarget, dia: d.key, idx })}
                    onDelete={() => removeTurno(d.key, idx)}
                    deleteIcon={<CloseRoundedIcon sx={{ fontSize: 13 }} />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        <LoginRoundedIcon sx={{ fontSize: 11, color: ENTRADA_COLOR }} />
                        <span>{t.entrada}</span>
                        <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>→</Box>
                        <span>{t.salida}</span>
                        <LogoutRoundedIcon sx={{ fontSize: 11, color: SALIDA_COLOR }} />
                      </Stack>
                    }
                    sx={{
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      height: 24,
                      '& .MuiChip-label': { px: 0.75 },
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  />
                ))}
                <Tooltip title="Agregar turno" arrow disableInteractive>
                  <IconButton
                    size="small"
                    onClick={(e) => setTurnoEditor({ open: true, anchor: e.currentTarget, dia: d.key, idx: null })}
                    sx={{
                      width: 24,
                      height: 24,
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      color: 'text.secondary',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <CellEditPopover
        open={popover.open}
        anchorEl={popover.anchor}
        cell={activeCell}
        dia={popover.dia}
        hour={popover.hour}
        onClose={closePopover}
        onApply={(nextCell) => {
          updateHour(popover.dia, popover.hour, nextCell);
          closePopover();
        }}
      />

      <Menu
        anchorEl={copyMenu.anchor}
        open={copyMenu.open}
        onClose={() => setCopyMenu({ open: false, anchor: null, sourceDia: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ px: 2, py: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            Copiar {copyMenu.sourceDia ? DIAS.find((d) => d.key === copyMenu.sourceDia)?.label : ''} a…
          </Typography>
        </Box>
        <Divider />
        {DIAS.filter((d) => d.key !== copyMenu.sourceDia).map((d) => (
          <MenuItem
            key={d.key}
            onClick={() => {
              copyDia(copyMenu.sourceDia, d.key);
              setCopyMenu({ open: false, anchor: null, sourceDia: null });
            }}
          >
            {d.label}
          </MenuItem>
        ))}
      </Menu>

      <TurnoEditPopover
        open={turnoEditor.open}
        anchorEl={turnoEditor.anchor}
        dia={turnoEditor.dia}
        idx={turnoEditor.idx}
        initialTurno={turnoEditor.idx != null ? config?.[turnoEditor.dia]?.turnos?.[turnoEditor.idx] : null}
        onClose={() => setTurnoEditor({ open: false, anchor: null, dia: null, idx: null })}
        onApply={(turno) => {
          upsertTurno(turnoEditor.dia, turnoEditor.idx, turno);
          setTurnoEditor({ open: false, anchor: null, dia: null, idx: null });
        }}
        onDelete={turnoEditor.idx != null ? () => {
          removeTurno(turnoEditor.dia, turnoEditor.idx);
          setTurnoEditor({ open: false, anchor: null, dia: null, idx: null });
        } : null}
      />
    </Stack>
  );
};

const TurnoEditPopover = ({ open, anchorEl, dia, idx, initialTurno, onClose, onApply, onDelete }) => {
  const [entrada, setEntrada] = useState('08:00');
  const [salida, setSalida] = useState('17:00');

  React.useEffect(() => {
    if (open) {
      setEntrada(initialTurno?.entrada || '08:00');
      setSalida(initialTurno?.salida || '17:00');
    }
  }, [open, initialTurno]);

  if (!open) return null;

  const normalEntrada = normalizeHHmm(entrada);
  const normalSalida = normalizeHHmm(salida);
  const valido = isTurnoValido({ entrada: normalEntrada, salida: normalSalida });
  const cruzaMedianoche = valido && parseHHmm(normalSalida) < parseHHmm(normalEntrada);

  const handleApply = () => {
    if (!valido) return;
    onApply({ entrada: normalEntrada, salida: normalSalida });
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { p: 2, width: 280, borderRadius: 1.5 } } }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {idx != null ? 'Editar turno' : 'Nuevo turno'}
          {dia && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
              · {DIAS.find((d) => d.key === dia)?.label}
            </Typography>
          )}
        </Typography>

        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <LoginRoundedIcon sx={{ fontSize: 14, color: ENTRADA_COLOR }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Entrada
              </Typography>
            </Stack>
            <TextField
              type="time"
              size="small"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              inputProps={{ step: 600 }}
              fullWidth
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <LogoutRoundedIcon sx={{ fontSize: 14, color: SALIDA_COLOR }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Salida
              </Typography>
            </Stack>
            <TextField
              type="time"
              size="small"
              value={salida}
              onChange={(e) => setSalida(e.target.value)}
              inputProps={{ step: 600 }}
              fullWidth
            />
          </Box>
        </Stack>

        {cruzaMedianoche && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Este turno cruza medianoche. La salida se entiende del día siguiente.
          </Typography>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.5 }}>
          {onDelete ? (
            <Button size="small" color="error" onClick={onDelete} sx={{ textTransform: 'none' }}>
              Eliminar
            </Button>
          ) : <span />}
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button size="small" variant="contained" onClick={handleApply} disabled={!valido} sx={{ textTransform: 'none' }}>
              {idx != null ? 'Guardar' : 'Agregar'}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Popover>
  );
};

const CellEditPopover = ({ open, anchorEl, cell, dia, hour, onClose, onApply }) => {
  const initialMode = cell?.split ? 'split' : 'single';
  const [mode, setMode] = useState(initialMode);
  const [singleTipo, setSingleTipo] = useState(cell?.tipo || TIPOS_HORA.NORMAL);
  const [atMin, setAtMin] = useState(cell?.split?.atMin || 30);
  const [beforeTipo, setBeforeTipo] = useState(cell?.split?.before || TIPOS_HORA.NORMAL);
  const [afterTipo, setAfterTipo] = useState(cell?.split?.after || TIPOS_HORA.EXTRA_50);

  React.useEffect(() => {
    if (open) {
      setMode(cell?.split ? 'split' : 'single');
      setSingleTipo(cell?.tipo || TIPOS_HORA.NORMAL);
      setAtMin(cell?.split?.atMin || 30);
      setBeforeTipo(cell?.split?.before || TIPOS_HORA.NORMAL);
      setAfterTipo(cell?.split?.after || TIPOS_HORA.EXTRA_50);
    }
  }, [open, cell]);

  if (!open) return null;

  const hourLabel = hour != null ? `${String(hour).padStart(2, '0')}:00 – ${String(hour + 1).padStart(2, '0')}:00` : '';
  const splitPoints = Array.from({ length: 60 / SPLIT_STEP_MIN - 1 }, (_, i) => (i + 1) * SPLIT_STEP_MIN);

  const handleApply = () => {
    if (mode === 'single') {
      onApply({ tipo: singleTipo });
    } else {
      onApply({ split: { atMin, before: beforeTipo, after: afterTipo } });
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { p: 2, width: 340, borderRadius: 1.5 } } }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {dia ? DIAS.find((d) => d.key === dia)?.label : ''} · {hourLabel}
          </Typography>
        </Stack>

        <ToggleButtonGroup
          value={mode}
          exclusive
          size="small"
          onChange={(_, v) => v && setMode(v)}
          fullWidth
        >
          <ToggleButton value="single" sx={{ textTransform: 'none', py: 0.5 }}>Tipo único</ToggleButton>
          <ToggleButton value="split" sx={{ textTransform: 'none', py: 0.5 }}>Dividir hora</ToggleButton>
        </ToggleButtonGroup>

        {mode === 'single' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
            {TIPOS_VALIDOS.map((t) => {
              const meta = TIPO_META[t];
              const active = singleTipo === t;
              return (
                <Button
                  key={t}
                  onClick={() => setSingleTipo(t)}
                  variant={active ? 'contained' : 'outlined'}
                  size="small"
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    bgcolor: active ? meta.color : alpha(meta.color, 0.06),
                    color: active ? '#fff' : meta.color,
                    borderColor: alpha(meta.color, 0.4),
                    '&:hover': {
                      bgcolor: active ? meta.color : alpha(meta.color, 0.15),
                      borderColor: meta.color,
                    },
                  }}
                  startIcon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: active ? '#fff' : meta.color }} />}
                >
                  {meta.label}
                </Button>
              );
            })}
          </Box>
        ) : (
          <Stack spacing={1.25}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Punto de corte
              </Typography>
              <ButtonGroup size="small" fullWidth>
                {splitPoints.map((m) => (
                  <Button
                    key={m}
                    variant={atMin === m ? 'contained' : 'outlined'}
                    onClick={() => setAtMin(m)}
                    sx={{ minWidth: 0, fontVariantNumeric: 'tabular-nums', fontSize: '0.7rem' }}
                  >
                    {String(hour).padStart(2, '0')}:{String(m).padStart(2, '0')}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Antes de {String(hour).padStart(2, '0')}:{String(atMin).padStart(2, '0')}
              </Typography>
              <TipoSelector value={beforeTipo} onChange={setBeforeTipo} />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Desde {String(hour).padStart(2, '0')}:{String(atMin).padStart(2, '0')}
              </Typography>
              <TipoSelector value={afterTipo} onChange={setAfterTipo} />
            </Box>
          </Stack>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 0.5 }}>
          <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button size="small" variant="contained" onClick={handleApply} sx={{ textTransform: 'none' }}>
            Aplicar
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
};

const TipoSelector = ({ value, onChange }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
    {TIPOS_VALIDOS.map((t) => {
      const meta = TIPO_META[t];
      const active = value === t;
      return (
        <Chip
          key={t}
          label={meta.label}
          size="small"
          onClick={() => onChange(t)}
          sx={{
            bgcolor: active ? meta.color : alpha(meta.color, 0.1),
            color: active ? '#fff' : meta.color,
            fontWeight: 600,
            fontSize: '0.7rem',
            border: `1px solid ${active ? meta.color : alpha(meta.color, 0.3)}`,
            '&:hover': { bgcolor: active ? meta.color : alpha(meta.color, 0.2) },
          }}
        />
      );
    })}
  </Box>
);

export default HorariosGridEditor;
