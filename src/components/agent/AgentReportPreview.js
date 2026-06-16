import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ReportView from 'src/components/reportes/ReportView';
import { useReportDataSources } from 'src/hooks/useReportDataSources';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { buildSampleMovimientos } from 'src/utils/reportes/sampleMovimientos';

/**
 * Panel de previsualización en vivo del reporte que el agente va armando. Reutiliza
 * <ReportView/> con los datos REALES de la empresa, de modo que lo que ve el usuario en
 * la preview es exactamente el reporte que se guardará. Vive a la derecha del chat en /agente.
 *
 * @param {object}   props.draft     - borrador del reporte (layout, filtros_schema, display_currency, datasets, nombre)
 * @param {object}   props.user      - usuario autenticado (para resolver empresa + proyectos)
 * @param {Function} props.onSave    - (nombre) => void: dispara el guardado vía chat
 * @param {Function} [props.onClose] - cierra el panel (solo en el Dialog mobile)
 */
export default function AgentReportPreview({ draft, user, onSave, onClose }) {
  const [empresaId, setEmpresaId] = useState(null);
  const [name, setName] = useState(draft?.nombre || 'Reporte sin título');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        if (!cancelled) setEmpresaId(empresa?.id || null);
      } catch (err) {
        console.error('AgentReportPreview: error obteniendo empresa', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Sincroniza el nombre cuando el agente lo cambia, sin pisar lo que el usuario tipeó
  // (solo actualiza si el draft trae un nombre distinto al render anterior).
  const draftNombre = draft?.nombre || '';
  useEffect(() => {
    if (draftNombre) setName(draftNombre);
  }, [draftNombre]);

  const {
    loadDataForDraft,
    filteredMovimientos,
    totalMovimientos,
    presupuestos,
    proyectos,
    usuariosEmpresa,
    cotizaciones,
    filters,
    displayCurrencies,
    loading,
  } = useReportDataSources(user, empresaId);

  // Recargar movimientos solo cuando cambian filtros/datasets/moneda (no en cada reordenamiento
  // de bloques: ReportView re-ejecuta el engine al cambiar reportConfig por sí solo).
  const dataKey = useMemo(
    () => JSON.stringify({
      f: draft?.filtros_schema || {},
      d: draft?.datasets || {},
      c: draft?.display_currency || 'ARS',
    }),
    [draft],
  );

  useEffect(() => {
    if (draft && empresaId) loadDataForDraft(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, empresaId, loadDataForDraft]);

  const blockCount = Array.isArray(draft?.layout) ? draft.layout.length : 0;
  const hasData = filteredMovimientos.length > 0;
  // La empresa todavía no cargó NINGÚN movimiento → mostramos datos de ejemplo para que
  // el usuario vea cómo se verá. Distinto de "los filtros no devolvieron nada" (totalMov>0).
  const empresaSinDatos = !loading && totalMovimientos === 0;
  const usandoEjemplo = !hasData && empresaSinDatos && blockCount > 0;
  const sampleMovimientos = useMemo(
    () => (usandoEjemplo ? buildSampleMovimientos(draft) : null),
    [usandoEjemplo, draft],
  );
  const movimientosParaVista = usandoEjemplo ? sampleMovimientos : filteredMovimientos;
  const canSave = blockCount > 0 && !!name.trim();
  // Si el borrador edita un reporte existente, guardar lo sobrescribe (no crea una copia).
  const isEditingExisting = !!draft?.source_report_id;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* ── Header ── */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.contrastText',
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
          }}
          aria-hidden
        >
          <InsightsRoundedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <InputBase
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del reporte"
            sx={{
              fontWeight: 700,
              fontSize: '0.95rem',
              lineHeight: 1.2,
              width: '100%',
              '& input': { p: 0 },
            }}
          />
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: loading ? 'warning.main' : 'success.main',
                animation: loading ? 'agentPreviewPulse 1s ease-in-out infinite' : 'none',
                '@keyframes agentPreviewPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {loading ? 'Actualizando…' : 'Previsualización con tus datos reales'}
            </Typography>
          </Stack>
        </Box>
        {(displayCurrencies || []).slice(0, 2).map((c) => (
          <Chip key={c} label={c} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.68rem' }} />
        ))}
        {onClose ? (
          <IconButton size="small" onClick={onClose} aria-label="Cerrar preview">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>

      {/* ── Cuerpo: el reporte renderizado ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', position: 'relative', px: { xs: 1.5, md: 2.5 }, py: 2 }}>
        {loading && !hasData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={26} />
          </Box>
        ) : blockCount === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Typography variant="body2">
              Contale al asistente qué querés ver y la previsualización aparecerá acá.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              boxShadow: (t) => `0 1px 2px ${t.palette.mode === 'dark' ? '#0008' : '#0000000a'}`,
              p: { xs: 1.5, md: 2.5 },
            }}
          >
            {usandoEjemplo ? (
              <Alert severity="info" icon={false} sx={{ mb: 2 }}>
                📊 <strong>Datos de ejemplo</strong> — así se va a ver tu reporte cuando cargues tus
                movimientos reales.
              </Alert>
            ) : !hasData ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Los filtros de este reporte no devolvieron movimientos. Probá ampliar el período o
                sacar algún filtro y el reporte se va a poblar.
              </Alert>
            ) : null}
            <ReportView
              reportConfig={draft}
              movimientos={movimientosParaVista}
              presupuestos={presupuestos}
              displayCurrencies={displayCurrencies}
              cotizaciones={cotizaciones}
              reportContext={{ usuariosEmpresa, filters, proyectos }}
            />
          </Box>
        )}
      </Box>

      {/* ── Footer: guardar ── */}
      <Divider />
      <Box
        sx={{
          px: 2,
          py: 1.25,
          backgroundColor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
          {blockCount === 0
            ? 'Sin bloques todavía'
            : isEditingExisting
              ? `${blockCount} ${blockCount === 1 ? 'bloque' : 'bloques'} · guardar actualiza el reporte original`
              : `${blockCount} ${blockCount === 1 ? 'bloque' : 'bloques'} · seguí pidiéndole cambios al asistente`}
        </Typography>
        <Tooltip title={canSave ? '' : 'Falta un nombre o bloques para guardar'}>
          <span>
            <Button
              variant="contained"
              size="small"
              startIcon={<BookmarkAddRoundedIcon />}
              disabled={!canSave}
              onClick={() => onSave?.(name.trim())}
              sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}
            >
              {isEditingExisting ? 'Guardar cambios' : 'Guardar reporte'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
