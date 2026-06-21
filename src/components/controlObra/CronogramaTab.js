import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import ControlObraService from 'src/services/controlObra/controlObraService';
import SubrubroAccionesMenu from 'src/components/controlObra/SubrubroAccionesMenu';

const DAY = 86400000;
const LBL = 240; // ancho de la columna de etiquetas
const ROW_H = 36;
const RUBRO_H = 28;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—');
const mesLabel = (y, m) => new Date(Date.UTC(y, m, 1)).toLocaleDateString('es-AR', { month: 'short', year: '2-digit', timeZone: 'UTC' });

function mesesGrid(min, max) {
  const out = [];
  let y = min.getUTCFullYear(); let m = min.getUTCMonth();
  while (y < max.getUTCFullYear() || (y === max.getUTCFullYear() && m <= max.getUTCMonth())) {
    out.push({ y, m, date: new Date(Date.UTC(y, m, 1)) });
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

// Gantt read-first: barras por tarea (relleno = avance, rojo = atrasada), línea
// de hoy y flechas de dependencia. Click en una tarea abre "Editar tarea".
export default function CronogramaTab({ obra, empresaId }) {
  const [menu, setMenu] = useState({ anchorEl: null, sub: null });
  const q = useQuery({
    queryKey: ['control-obra', 'cronograma', obra._id, empresaId],
    queryFn: () => ControlObraService.cronograma(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const data = q.data;

  const { min, max, span } = useMemo(() => {
    const lo = data?.rango?.min ? new Date(data.rango.min) : null;
    const hi = data?.rango?.max ? new Date(data.rango.max) : null;
    if (!lo || !hi) return { min: null, max: null, span: 0 };
    const a = new Date(Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth(), 1));
    const b = new Date(Date.UTC(hi.getUTCFullYear(), hi.getUTCMonth() + 1, 0));
    return { min: a, max: b, span: Math.max(b - a, DAY) };
  }, [data]);

  // Geometría (y por tarea + x de inicio/fin) para dibujar las flechas.
  const { geo, totalH } = useMemo(() => {
    const g = {}; let y = 0;
    const hayRango = !!min;
    const px = (d) => (hayRango ? Math.min(100, Math.max(0, ((new Date(d) - min) / span) * 100)) : 0);
    for (const r of data?.rubros || []) {
      y += RUBRO_H;
      for (const s of r.subrubros || []) {
        g[s.uid] = { yc: y + ROW_H / 2, x0: s.fecha_inicio ? px(s.fecha_inicio) : null, x1: s.fecha_fin ? px(s.fecha_fin) : null };
        y += ROW_H;
      }
    }
    return { geo: g, totalH: y };
  }, [data, min, span]);

  if (q.isLoading) return <Card><CardContent><LinearProgress /></CardContent></Card>;

  const hayRango = !!min;
  const meses = hayRango ? mesesGrid(min, max) : [];
  const pos = (d) => `${Math.min(100, Math.max(0, ((new Date(d) - min) / span) * 100))}%`;
  const hoy = new Date();
  const hoyEnRango = hayRango && hoy >= min && hoy <= max;
  const rubros = data?.rubros || [];
  const sinTareas = rubros.every((r) => (r.subrubros || []).length === 0);

  // Flechas: por cada tarea con dependencias y fechas, una desde el fin de la predecesora.
  const flechas = [];
  if (hayRango) {
    for (const r of rubros) {
      for (const s of r.subrubros || []) {
        const dst = geo[s.uid];
        if (!dst || dst.x0 == null) continue;
        for (const d of s.dependencias || []) {
          const src = geo[d.uid];
          if (!src || src.x1 == null) continue;
          flechas.push({ key: `${d.uid}-${s.uid}`, x1: src.x1, y1: src.yc, x2: dst.x0, y2: dst.yc });
        }
      }
    }
  }

  // Sub-rubro completo (de la obra) normalizado como lo espera el menú de acciones
  // (campo `contrato` = monto de contrato con el cliente, como en Ejecución).
  const abrirMenu = (e, uid) => {
    const full = (obra.rubros || []).flatMap((r) => r.subrubros || []).find((s) => s.uid === uid);
    if (full) setMenu({ anchorEl: e.currentTarget, sub: { ...full, contrato: full.monto } });
  };

  return (
    <Card>
      <CardContent>
        <Stack mb={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>Cronograma</Typography>
          <Typography variant="caption" color="text.secondary">Tocá una tarea para registrar avance, certificar, imputar, editar fechas/dependencias… Relleno = avance físico · rojo = atrasada.</Typography>
        </Stack>

        {sinTareas && <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>La obra todavía no tiene tareas.</Typography>}

        {!sinTareas && (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 640 }}>
              {/* Header de meses */}
              <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', mb: 0.5 }}>
                <Box sx={{ width: LBL, flexShrink: 0 }} />
                <Box sx={{ flex: 1, display: 'flex' }}>
                  {hayRango
                    ? meses.map((mm) => (
                        <Box key={`${mm.y}-${mm.m}`} sx={{ flex: 1, px: 0.5, py: 0.5, borderLeft: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">{mesLabel(mm.y, mm.m)}</Typography>
                        </Box>
                      ))
                    : <Typography variant="caption" color="text.disabled" sx={{ py: 0.5 }}>Cargá fechas en una tarea para ver la línea de tiempo</Typography>}
                </Box>
              </Box>

              {/* Cuerpo: filas + capa de flechas + línea de hoy */}
              <Box sx={{ position: 'relative' }}>
                {/* Capa SVG de dependencias (sobre el track) */}
                {flechas.length > 0 && (
                  <svg
                    viewBox={`0 0 100 ${totalH}`} preserveAspectRatio="none"
                    style={{ position: 'absolute', left: LBL, top: 0, width: `calc(100% - ${LBL}px)`, height: totalH, pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}
                  >
                    {flechas.map((f) => {
                      const midX = (f.x1 + f.x2) / 2;
                      return (
                        <g key={f.key}>
                          <path d={`M ${f.x1} ${f.y1} L ${midX} ${f.y1} L ${midX} ${f.y2} L ${f.x2} ${f.y2}`}
                            fill="none" stroke="#9e9e9e" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                          <circle cx={f.x2} cy={f.y2} r={2.5} fill="#9e9e9e" vectorEffect="non-scaling-stroke" />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Línea de hoy */}
                {hoyEnRango && (
                  <Box sx={{ position: 'absolute', top: 0, height: totalH, left: `calc(${LBL}px + (100% - ${LBL}px) * ${(hoy - min) / span})`, width: '2px', bgcolor: 'warning.main', opacity: 0.7, zIndex: 2, pointerEvents: 'none' }} />
                )}

                {rubros.map((r) => (
                  <Box key={r.uid}>
                    <Box sx={{ height: RUBRO_H, display: 'flex', alignItems: 'center', bgcolor: 'action.hover', px: 1, borderRadius: 0.5 }}>
                      <Typography variant="caption" fontWeight={700}>{r.nombre}</Typography>
                    </Box>
                    {(r.subrubros || []).map((s) => (
                      <Box
                        key={s.uid} onClick={(e) => abrirMenu(e, s.uid)}
                        sx={{ display: 'flex', alignItems: 'center', height: ROW_H, cursor: 'pointer', borderRadius: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <Box sx={{ width: LBL, pr: 1, flexShrink: 0 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" noWrap title={s.nombre}>{s.nombre}</Typography>
                            {s.atrasada && <Chip size="small" color="error" variant="outlined" label="atrasada" sx={{ height: 16, '& .MuiChip-label': { px: 0.5, fontSize: 9 } }} />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: 10 }}>
                            {s.fecha_inicio ? `${fmt(s.fecha_inicio)} → ${fmt(s.fecha_fin)}` : 'sin fechas'}{s.responsable ? ` · 🙋 ${s.responsable}` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ position: 'relative', flex: 1, height: 22 }}>
                          {hayRango && meses.map((mm, i) => i > 0 && (
                            <Box key={i} sx={{ position: 'absolute', top: 0, bottom: 0, left: pos(mm.date), width: '1px', bgcolor: 'divider', opacity: 0.5 }} />
                          ))}
                          {hayRango && s.fecha_inicio && s.fecha_fin && (
                            <Tooltip arrow title={`${fmt(s.fecha_inicio)} → ${fmt(s.fecha_fin)} · avance ${s.avance_pct}%${s.atrasada ? ' · atrasada' : ''}`}>
                              <Box sx={{
                                position: 'absolute', top: 3, height: 16, left: pos(s.fecha_inicio),
                                width: `calc(${pos(s.fecha_fin)} - ${pos(s.fecha_inicio)})`, minWidth: 4,
                                borderRadius: 1, overflow: 'hidden', zIndex: 1,
                                bgcolor: s.atrasada ? 'error.light' : 'primary.light',
                                border: '1px solid', borderColor: s.atrasada ? 'error.main' : 'primary.main',
                              }}>
                                <Box sx={{ height: '100%', width: `${Math.min(100, s.avance_pct)}%`, bgcolor: s.atrasada ? 'error.main' : 'primary.main' }} />
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>

      <SubrubroAccionesMenu
        obra={obra} subrubro={menu.sub} empresaId={empresaId}
        anchorEl={menu.anchorEl} onClose={() => setMenu({ anchorEl: null, sub: null })}
      />
    </Card>
  );
}
