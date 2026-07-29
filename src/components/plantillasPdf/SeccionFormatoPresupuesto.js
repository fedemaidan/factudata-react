import { useCallback, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CircularProgress, Grid, Slider, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { updateEmpresaDetails, invalidateEmpresaCache } from 'src/services/empresaService';
import {
  PDF_HEADER_BG_DEFAULT,
  PDF_HEADER_TEXT_DEFAULT,
  clampLogoPdfEscala,
  normalizePresupuestoPdfConfig,
} from 'src/utils/presupuestos/presupuestoPdfConfig';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';
import { PLANTILLA_SORBYDATA, TEXTO_NOTAS_DEFAULT } from 'src/components/presupuestosProfesionales/constants';
import { hoyIso } from 'src/components/presupuestosProfesionales/monedaAjusteConfig';
import PresupuestoPdfFullPreviewDialog from 'src/components/presupuestosProfesionales/PresupuestoPdfFullPreviewDialog';

const isValidHex = (v) => /^#[0-9A-Fa-f]{6}$/.test(v);
const toHex = (v) => {
  if (!v || typeof v !== 'string') return null;
  const s = v.replace(/^#/, '').trim();
  return /^[0-9A-Fa-f]{6}$/.test(s) ? `#${s.toLowerCase()}` : null;
};

const ColorInput = ({ label, value, onChange, defaultColor }) => {
  const hex = value || defaultColor;
  const valid = isValidHex(hex);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        size="small"
        label={label}
        value={hex}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9A-Fa-f#]/g, '');
          if (v.startsWith('#')) {
            if (v.length <= 7) onChange(v || defaultColor);
          } else if (v.length <= 6) {
            onChange(v ? `#${v}` : defaultColor);
          }
        }}
        onBlur={(e) => {
          const result = toHex(e.target.value);
          if (result) onChange(result);
          else if (e.target.value.trim()) onChange(defaultColor);
        }}
        placeholder={defaultColor}
        inputProps={{ maxLength: 7 }}
        sx={{ minWidth: 120 }}
      />
      <Box
        component="input"
        type="color"
        value={valid ? hex : defaultColor}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: 40, height: 40, p: 0, border: '1px solid', borderColor: 'divider',
          borderRadius: 1, cursor: 'pointer', bgcolor: 'transparent',
        }}
      />
    </Stack>
  );
};

/** Presupuesto de ejemplo (rubros SorbyData sobre un total ficticio) para la vista previa real. */
const buildSamplePresupuesto = (config, empresaNombre) => {
  const SAMPLE_TOTAL = 10_000_000;
  const rubros = PLANTILLA_SORBYDATA.rubros.map((r, i) => ({
    nombre: r.nombre,
    monto: Math.round(SAMPLE_TOTAL * (Number(r.incidencia_pct_sugerida) || 0)) / 100,
    orden: i + 1,
    tareas: (r.tareas || []).map((t) => ({
      descripcion: t.descripcion, monto: 0, unidad: null, incidencia_pct: 0,
    })),
  }));
  const fecha = hoyIso();
  return {
    titulo: 'Presupuesto de muestra',
    fecha,
    fecha_presupuesto: fecha,
    obra_direccion: 'Av. Siempre Viva 742',
    moneda: 'ARS',
    base_calculo: 'total',
    rubros,
    total_neto: rubros.reduce((s, r) => s + r.monto, 0),
    notas_texto: TEXTO_NOTAS_DEFAULT,
    analisis_superficies: null,
    empresa_logo_url: config.logo_url,
    logo_pdf_escala: config.logo_pdf_escala,
    header_bg_color: config.header_bg_color,
    header_text_color: config.header_text_color,
    empresa_nombre: empresaNombre || null,
    anexos: [],
    version_actual: 0,
    versiones: [],
  };
};

/**
 * Sección de /plantillas-pdf donde se configura el formato del PDF de
 * presupuestos profesionales a nivel empresa (TAR-658): logo (de la biblioteca),
 * escala del logo y colores de la cabecera. Reemplaza la carga de logo/colores
 * que antes vivía en cada presupuesto.
 */
export default function SeccionFormatoPresupuesto({ empresa, logos = [], onNotify, onConfigSaved }) {
  const empresaId = empresa?.id || null;
  const empresaNombre = empresa?.nombre || '';
  const saved = useMemo(
    () => normalizePresupuestoPdfConfig(empresa?.presupuesto_pdf_config),
    [empresa?.presupuesto_pdf_config]
  );

  const [form, setForm] = useState(() => ({
    logo_id: saved?.logo_id || null,
    logo_url: saved?.logo_url || '',
    logo_pdf_escala: saved?.logo_pdf_escala ?? 1,
    header_bg_color: saved?.header_bg_color || PDF_HEADER_BG_DEFAULT,
    header_text_color: saved?.header_text_color || PDF_HEADER_TEXT_DEFAULT,
  }));
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewState, setPreviewState] = useState(null);

  // Sin config guardada, el botón queda habilitado aunque no toque nada:
  // guardar "por defecto" (sin logo, colores estándar) también es una elección.
  const isDirty =
    !saved ||
    (saved.logo_url || '') !== (form.logo_url || '') ||
    (saved.logo_pdf_escala ?? 1) !== clampLogoPdfEscala(form.logo_pdf_escala) ||
    (saved.header_bg_color || PDF_HEADER_BG_DEFAULT) !== form.header_bg_color ||
    (saved.header_text_color || PDF_HEADER_TEXT_DEFAULT) !== form.header_text_color;

  const tieneLogo = Boolean(form.logo_url);
  const escala = clampLogoPdfEscala(form.logo_pdf_escala);
  const headerBg = isValidHex(form.header_bg_color) ? form.header_bg_color : PDF_HEADER_BG_DEFAULT;
  const headerText = isValidHex(form.header_text_color) ? form.header_text_color : PDF_HEADER_TEXT_DEFAULT;

  const handlePickLogo = (logo) => {
    setForm((f) => ({ ...f, logo_id: logo._id, logo_url: logo.url }));
  };

  const handlePickSinLogo = () => {
    setForm((f) => ({ ...f, logo_id: null, logo_url: '' }));
  };

  const handleGuardar = async () => {
    if (!empresaId) return;
    setSaving(true);
    const config = {
      logo_id: tieneLogo ? form.logo_id : null,
      logo_url: tieneLogo ? form.logo_url : null,
      logo_pdf_escala: escala,
      header_bg_color: headerBg,
      header_text_color: headerText,
    };
    const ok = await updateEmpresaDetails(empresaId, { presupuesto_pdf_config: config });
    if (ok) await invalidateEmpresaCache(empresaId);
    setSaving(false);
    if (ok) {
      onNotify?.('Formato del PDF de presupuestos guardado');
      onConfigSaved?.(config);
    } else {
      onNotify?.('No se pudo guardar el formato', 'error');
    }
  };

  const handleOpenPreview = useCallback(async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewState(null);
    try {
      const config = {
        logo_url: tieneLogo ? form.logo_url : null,
        logo_pdf_escala: escala,
        header_bg_color: headerBg,
        header_text_color: headerText,
      };
      const presupuesto = buildSamplePresupuesto(config, empresaNombre);
      const logoDataUrl = config.logo_url ? await loadImageAsDataUrl(config.logo_url) : null;
      setPreviewState({ presupuesto, empresa: { nombre: empresaNombre }, logoDataUrl });
    } catch (err) {
      console.error('Vista previa formato presupuesto:', err);
      onNotify?.('No se pudo generar la vista previa', 'error');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, [tieneLogo, form.logo_url, escala, headerBg, headerText, empresaNombre, onNotify]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Plantilla de presupuestos profesionales</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleGuardar}
          disabled={saving || !isDirty}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
        >
          Guardar formato
        </Button>
      </Stack>
      {!saved && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          Todavía no guardaste el formato. Podés dejarlo como está (sin logo, colores estándar) y
          tocar «Guardar formato», o personalizarlo primero.
        </Alert>
      )}

      <Grid container spacing={3}>
          {/* ── Controles ── */}
          <Grid item xs={12} md={5}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Logo del presupuesto
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Tooltip title="El PDF muestra el nombre de la empresa" arrow>
                    <Card
                      variant="outlined"
                      onClick={handlePickSinLogo}
                      sx={{
                        position: 'relative',
                        width: 88,
                        height: 64,
                        p: 0.75,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: !tieneLogo ? 'primary.main' : 'divider',
                        borderWidth: !tieneLogo ? 2 : 1,
                        bgcolor: 'grey.50',
                        transition: 'border-color 0.15s',
                        '&:hover': { borderColor: 'primary.light' },
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ lineHeight: 1.2 }}>
                        Sin logo
                      </Typography>
                      {!tieneLogo && (
                        <CheckCircleIcon
                          color="primary"
                          sx={{ position: 'absolute', top: -8, right: -8, fontSize: 18, bgcolor: 'background.paper', borderRadius: '50%' }}
                        />
                      )}
                    </Card>
                  </Tooltip>
                  {logos.map((logo) => {
                    const selected = form.logo_url === logo.url;
                    return (
                      <Tooltip key={logo._id} title={logo.nombre} arrow>
                        <Card
                          variant="outlined"
                          onClick={() => handlePickLogo(logo)}
                          sx={{
                            position: 'relative',
                            width: 88,
                            height: 64,
                            p: 0.75,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderColor: selected ? 'primary.main' : 'divider',
                            borderWidth: selected ? 2 : 1,
                            bgcolor: 'grey.50',
                            transition: 'border-color 0.15s',
                            '&:hover': { borderColor: 'primary.light' },
                          }}
                        >
                          <Box
                            component="img"
                            src={logo.url}
                            alt={logo.nombre}
                            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                          {selected && (
                            <CheckCircleIcon
                              color="primary"
                              sx={{ position: 'absolute', top: -8, right: -8, fontSize: 18, bgcolor: 'background.paper', borderRadius: '50%' }}
                            />
                          )}
                        </Card>
                      </Tooltip>
                    );
                  })}
                </Stack>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, display: 'block' }}>
                  {logos.length === 0
                    ? 'Para usar un logo, agregalo primero en «Logos de la empresa», acá arriba.'
                    : 'Sin logo, el PDF muestra el nombre de la empresa en la cabecera.'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tamaño del logo en el PDF ({Math.round(escala * 100)}% del tamaño base)
                </Typography>
                <Slider
                  size="small"
                  value={escala}
                  min={0.5}
                  max={2}
                  step={0.05}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${Math.round(Number(v) * 100)}%`}
                  disabled={!tieneLogo}
                  onChange={(_, v) => setForm((f) => ({ ...f, logo_pdf_escala: v }))}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Colores de la cabecera
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
                  <ColorInput
                    label="Fondo"
                    value={form.header_bg_color}
                    onChange={(v) => setForm((f) => ({ ...f, header_bg_color: v }))}
                    defaultColor={PDF_HEADER_BG_DEFAULT}
                  />
                  <ColorInput
                    label="Texto"
                    value={form.header_text_color}
                    onChange={(v) => setForm((f) => ({ ...f, header_text_color: v }))}
                    defaultColor={PDF_HEADER_TEXT_DEFAULT}
                  />
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {/* ── Muestra en vivo de la cabecera ── */}
          <Grid item xs={12} md={7}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Así se ve la cabecera
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, bgcolor: 'background.paper' }}>
                {/* Cabecera del PDF (proporciones ~A4: header 58pt, logo base 85×47pt) */}
                <Box sx={{ position: 'relative', bgcolor: headerBg, borderRadius: 0.5, height: 76, px: 1.25, py: 0.75, overflow: 'hidden' }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ color: headerText, fontWeight: 600 }}>
                      Av. Siempre Viva 742
                    </Typography>
                    <Typography variant="caption" sx={{ color: headerText }}>
                      {new Date().toLocaleDateString('es-AR')}
                    </Typography>
                  </Stack>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    {tieneLogo ? (
                      <Box
                        component="img"
                        src={form.logo_url}
                        alt="Logo"
                        sx={{ width: 96 * escala, height: 53 * escala, maxHeight: 68, objectFit: 'contain' }}
                      />
                    ) : (
                      <Typography variant="subtitle2" sx={{ color: headerText, fontWeight: 700 }}>
                        {empresaNombre || 'Empresa'}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {/* Encabezado de la tabla de rubros */}
                <Stack direction="row" sx={{ mt: 1, bgcolor: headerBg, borderRadius: 0.5, px: 1.25, py: 0.5 }}>
                  <Typography variant="caption" sx={{ color: headerText, width: 44 }}>Item</Typography>
                  <Typography variant="caption" sx={{ color: headerText, flex: 1 }}>Descripción</Typography>
                  <Typography variant="caption" sx={{ color: headerText, width: 72, textAlign: 'right' }}>Total</Typography>
                  <Typography variant="caption" sx={{ color: headerText, width: 44, textAlign: 'right' }}>Inc.</Typography>
                </Stack>
                {[0, 1, 2].map((i) => (
                  <Stack key={i} direction="row" sx={{ px: 1.25, py: 0.6, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ width: 44 }}><Box sx={{ height: 8, width: 16, bgcolor: 'grey.200', borderRadius: 0.5 }} /></Box>
                    <Box sx={{ flex: 1 }}><Box sx={{ height: 8, width: `${70 - i * 15}%`, bgcolor: 'grey.200', borderRadius: 0.5 }} /></Box>
                    <Box sx={{ width: 72, display: 'flex', justifyContent: 'flex-end' }}><Box sx={{ height: 8, width: 48, bgcolor: 'grey.200', borderRadius: 0.5 }} /></Box>
                    <Box sx={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}><Box sx={{ height: 8, width: 24, bgcolor: 'grey.200', borderRadius: 0.5 }} /></Box>
                  </Stack>
                ))}
              </Box>
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleOpenPreview}
                  disabled={saving}
                >
                  Ver vista previa del PDF
                </Button>
              </Box>
            </Stack>
          </Grid>
      </Grid>

      <PresupuestoPdfFullPreviewDialog
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewState(null); }}
        loading={previewLoading}
        presupuesto={previewState?.presupuesto}
        empresa={previewState?.empresa}
        logoDataUrl={previewState?.logoDataUrl}
        costoM2Data={null}
        incluirTotalesM2={false}
      />
    </Box>
  );
}
