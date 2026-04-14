import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Container, Stack, Alert,
  ThemeProvider, CssBaseline, Paper, Button,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Head from 'next/head';
import axios from 'axios';
import config from 'src/config/config';
import ReportView from 'src/components/reportes/ReportView';
import ReportFiltersBar from 'src/components/reportes/ReportFiltersBar';
import { createTheme } from 'src/theme';
import {
  filterMovimientos,
  buildDefaultFilters,
  getUniqueValues,
  executeReport,
} from 'src/tools/reportEngine';

/**
 * Página pública de reporte — sin autenticación.
 * Ruta: /reportes/public/[token]
 *
 * Obtiene del backend: { report, movimientos, presupuestos }
 * y renderiza directamente con ReportView.
 */
/**
 * Parsea los query params de la URL y devuelve un objeto de filtros.
 * Arrays se asumen separados por coma.
 * Las keys conocidas como arrays se convierten siempre a array.
 */
function parseFiltersFromURL() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  if (params.toString() === '') return {};

  const ARRAY_KEYS = new Set([
    'proyectos', 'categorias', 'proveedores', 'etapas',
    'medio_pago', 'moneda_movimiento', 'moneda_equivalente', 'usuarios',
  ]);
  const filters = {};
  for (const [key, value] of params.entries()) {
    if (!value) continue;
    if (ARRAY_KEYS.has(key)) {
      filters[key] = value.split(',').filter(Boolean);
    } else {
      filters[key] = value;
    }
  }
  return filters;
}

function toMovimientoDate(mov) {
  const raw = mov?.fecha_factura || mov?.fecha;
  if (!raw) return null;
  if (raw?.toDate) {
    const d = raw.toDate();
    return isNaN(d?.getTime?.()) ? null : d;
  }
  if (raw?.seconds) {
    const d = new Date(raw.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function applyDateBoundsToFilters(defaultFilters, filtrosSchema, movimientos) {
  if (!filtrosSchema?.fecha?.enabled) return defaultFilters;

  const dates = (movimientos || []).map(toMovimientoDate).filter(Boolean);
  if (dates.length === 0) return defaultFilters;

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const today = new Date();

  return {
    ...defaultFilters,
    fecha_from: minDate,
    fecha_to: today,
  };
}

const PublicReportPage = () => {
  const [report, setReport] = useState(null);
  const [allMovimientos, setAllMovimientos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros runtime
  const [filters, setFilters] = useState({});
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Filtros fijos que vienen en la URL (no editables por el cliente)
  const [lockedFilters, setLockedFilters] = useState(null);

  // Obtener token y filtros de la URL
  const [token, setToken] = useState(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      // /reportes/public/TOKEN
      const idx = parts.indexOf('public');
      if (idx >= 0 && parts[idx + 1]) {
        setToken(parts[idx + 1]);
        const urlFilters = parseFiltersFromURL();
        if (Object.keys(urlFilters).length > 0) {
          setLockedFilters(urlFilters);
        }
      } else {
        setError('Token no válido');
        setLoading(false);
      }
    }
  }, []);

  // Fetch datos del reporte público
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchPublicReport = async () => {
      setLoading(true);
      setError(null);
      try {
        // Usar axios directo (sin interceptor de auth)
        const res = await axios.get(`${config.apiUrl}/reports/public/${token}`);
        const payload = res?.data ?? {};
        const data = payload && typeof payload === 'object' && 'data' in payload
          ? (payload.data ?? {})
          : payload;

        if (!cancelled) {
          const rpt = data.report || null;
          const movs = Array.isArray(data.movimientos) ? data.movimientos : [];
          setReport(rpt);
          setAllMovimientos(movs);
          setPresupuestos(Array.isArray(data.presupuestos) ? data.presupuestos : []);
          // Inicializar filtros: si hay filtros en la URL, usarlos; sino, defaults del reporte
          if (rpt?.filtros_schema) {
            const defaults = buildDefaultFilters(rpt.filtros_schema);
            if (rpt.filtros_schema?.proyectos?.fijos && rpt.filtros_schema?.proyectos?.proyecto_ids?.length > 0) {
              defaults.proyectos = rpt.filtros_schema.proyectos.proyecto_ids;
            }
            const boundedDefaults = applyDateBoundsToFilters(defaults, rpt.filtros_schema, movs);
            // Mergear filtros de URL sobre los defaults (URL tiene prioridad)
            const urlFilters = parseFiltersFromURL();
            if (Object.keys(urlFilters).length > 0) {
              setFilters({ ...boundedDefaults, ...urlFilters });
            } else {
              setFilters(boundedDefaults);
            }
          }
        }
      } catch (err) {
        console.error('Error cargando reporte público:', err);
        if (!cancelled) {
          const status = err?.response?.status;
          if (status === 404) {
            setError('Reporte no encontrado o el enlace ya no es público.');
          } else {
            setError('Error al cargar el reporte. Intentá de nuevo más tarde.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPublicReport();
    return () => { cancelled = true; };
  }, [token]);

  const displayCurrencies = useMemo(() => {
    if (!report) return ['ARS'];
    // Si los filtros runtime cambiaron la moneda equivalente, usar esos
    if (filters.moneda_equivalente?.length > 0) return filters.moneda_equivalente;
    const eq = report.filtros_schema?.moneda_equivalente;
    if (eq?.default_values?.length > 0) return eq.default_values;
    return [report.display_currency || 'ARS'];
  }, [report, filters.moneda_equivalente]);

  // Opciones disponibles para los filtros (extraídas de los datos)
  const availableOptions = useMemo(() => {
    if (allMovimientos.length === 0) return {};
    // Extraer proyectos únicos como { id, nombre }
    const proyMap = new Map();
    allMovimientos.forEach((m) => {
      if (m.proyecto_id && !proyMap.has(m.proyecto_id)) {
        proyMap.set(m.proyecto_id, { id: m.proyecto_id, nombre: m.proyecto || m.proyecto_id });
      }
    });
    return {
      proyectos: Array.from(proyMap.values()),
      categorias: getUniqueValues(allMovimientos, 'categoria'),
      proveedores: getUniqueValues(allMovimientos, 'proveedor'),
      etapas: getUniqueValues(allMovimientos, 'etapa'),
      mediosPago: getUniqueValues(allMovimientos, 'medio_pago'),
      monedas: getUniqueValues(allMovimientos, 'moneda'),
    };
  }, [allMovimientos]);

  // Movimientos filtrados
  const filteredMovimientos = useMemo(() => {
    if (allMovimientos.length === 0) return [];
    return filterMovimientos(allMovimientos, filters);
  }, [allMovimientos, filters]);

  const theme = createTheme();

  // Error state
  if (!loading && error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ mt: 10 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  // Loading state
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography color="text.secondary">Cargando reporte...</Typography>
          </Stack>
        </Box>
      </ThemeProvider>
    );
  }

  if (!report) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ mt: 10 }}>
          <Alert severity="warning">No se pudo cargar el reporte.</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <title>{report.nombre || 'Reporte'} | Sorbydata</title>
      </Head>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700}>
              {report.nombre}
            </Typography>
            {report.descripcion && (
              <Typography variant="body1" color="text.secondary">
                {report.descripcion}
              </Typography>
            )}
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            disabled={filteredMovimientos.length === 0}
            onClick={async () => {
              try {
                const results = executeReport(report, filteredMovimientos, presupuestos, displayCurrencies, null, { filters });
                const res = await axios.post(
                  `${config.apiUrl}/reports/export-pdf`,
                  {
                    reportConfig: report,
                    results,
                    displayCurrency: displayCurrencies[0] || 'ARS',
                    movimientosCount: filteredMovimientos.length,
                    filtrosTexto: '',
                  },
                  { responseType: 'blob' },
                );
                const url = window.URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(report.nombre || 'Reporte').replace(/[^\w\s-]/g, '')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Error exportando PDF:', err);
              }
            }}
          >
            PDF
          </Button>
        </Stack>

        {/* Filtros — solo si NO hay filtros fijados desde la URL */}
        {!lockedFilters && report.filtros_schema && Object.keys(report.filtros_schema).length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <ReportFiltersBar
              filtrosSchema={report.filtros_schema}
              filters={filters}
              onFiltersChange={setFilters}
              availableOptions={availableOptions}
              expanded={filtersExpanded}
              onToggle={() => setFiltersExpanded(!filtersExpanded)}
            />
          </Paper>
        )}

        {/* Report content */}
        <ReportView
          reportConfig={report}
          movimientos={filteredMovimientos}
          presupuestos={presupuestos}
          displayCurrencies={displayCurrencies}
          cotizaciones={null}
          reportContext={{ filters }}
        />

        {/* Footer */}
        <Box sx={{ mt: 6, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Generado con Sorbydata
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

// No layout, no auth guard
PublicReportPage.getLayout = (page) => page;

export default PublicReportPage;
