import { useState, useEffect, useCallback, useRef } from 'react';
import api from 'src/services/axiosConfig';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoService from 'src/services/presupuestoService';
import ReportService from 'src/services/reportService';
import MonedasService from 'src/services/monedasService';
import profileService from 'src/services/profileService';
import {
  filterMovimientos,
  buildDefaultFilters,
  getUniqueValues,
} from 'src/tools/reportEngine';

function buildUserOptions(usuariosEmpresa = [], movimientos = []) {
  const normalize = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  const labelsByKey = new Map();
  const add = (value) => {
    const label = String(value || '').trim();
    if (!label) return;
    const key = normalize(label);
    if (!key) return;
    if (!labelsByKey.has(key)) labelsByKey.set(key, label);
  };

  for (const u of usuariosEmpresa || []) {
    const nombre = `${u.firstName || u.nombre || ''} ${u.lastName || u.apellido || ''}`.trim();
    add(nombre);
    add(u.nombre);
  }

  for (const m of movimientos || []) {
    const nombre = m.usuario_nombre || m.usuario || m.userName;
    if (typeof nombre === 'object') {
      add(`${nombre.firstName || nombre.nombre || ''} ${nombre.lastName || nombre.apellido || ''}`);
      add(nombre.name || nombre.nombre || nombre.usuario_nombre || nombre.usuario || nombre.userName);
    } else {
      add(nombre);
    }
  }

  return [...labelsByKey.values()].sort((a, b) => a.localeCompare(b, 'es'));
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

/**
 * Hook que gestiona toda la carga de datos para el módulo de reportes.
 *
 * - Carga reportes (configs) desde MongoDB via API
 * - Carga movimientos via API (MongoDB)
 * - Carga presupuestos de control via API (si el reporte lo requiere)
 * - Gestiona filtros runtime
 */
export function useReportData(user, empresaId) {
  // ─── Configs de reportes ───
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // ─── Datos crudos ───
  const [allMovimientos, setAllMovimientos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // ─── Filtros ───
  const [filters, setFilters] = useState({});
  const [filteredMovimientos, setFilteredMovimientos] = useState([]);

  // ─── Opciones disponibles para filtros ───
  const [availableOptions, setAvailableOptions] = useState({
    proyectos: [],
    categorias: [],
    proveedores: [],
    etapas: [],
    mediosPago: [],
    monedas: [],
    usuarios: [],
  });

  // ─── Error ───
  const [error, setError] = useState(null);

  // ─── Cotizaciones live (dolar + CAC) ───
  const [cotizaciones, setCotizaciones] = useState(null);

  // Cache para evitar re-fetches
  const movCacheRef = useRef(new Map()); // proyecto_id → movimientos[]

  const enrichPresupuestosWithProjectName = useCallback((items) => {
    const list = Array.isArray(items) ? items : [];
    const byId = new Map((proyectos || []).map((p) => [String(p.id), p.nombre || p.proyecto || p.id]));

    return list.map((p) => {
      const pid = p?.proyecto_id != null ? String(p.proyecto_id) : null;
      const nombreProyecto =
        p?.proyecto_nombre ||
        p?.nombre_proyecto ||
        (pid ? byId.get(pid) : null) ||
        p?.proyecto ||
        null;

      return {
        ...p,
        proyecto_nombre: nombreProyecto,
        nombre_proyecto: nombreProyecto,
      };
    });
  }, [proyectos]);

  // ═══════════════════════════════════════════
  //  1. Cargar lista de reportes
  // ═══════════════════════════════════════════
  const loadReports = useCallback(async () => {
    if (!empresaId) return;
    setLoadingReports(true);
    try {
      const data = await ReportService.list(empresaId);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setError('Error al cargar reportes');
    } finally {
      setLoadingReports(false);
    }
  }, [empresaId]);

  // ═══════════════════════════════════════════
  //  2. Cargar proyectos de la empresa
  // ═══════════════════════════════════════════
  const loadProyectos = useCallback(async () => {
    if (!user) return;
    try {
      const proys = await getProyectosFromUser(user);
      const list = Array.isArray(proys) ? proys : [];
      setProyectos(list);
      setAvailableOptions((prev) => ({
        ...prev,
        proyectos: list.map((p) => ({ id: p.id, nombre: p.nombre || p.proyecto || p.id })),
      }));
    } catch (err) {
      console.error('Error cargando proyectos:', err);
    }
  }, [user]);

  const loadUsuariosEmpresa = useCallback(async () => {
    if (!empresaId) return;
    try {
      const users = await profileService.getProfileByEmpresa(empresaId);
      setUsuariosEmpresa(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error('Error cargando usuarios de la empresa:', err);
      setUsuariosEmpresa([]);
    }
  }, [empresaId]);

  // ═══════════════════════════════════════════
  //  3. Cargar movimientos por proyecto(s) via API
  // ═══════════════════════════════════════════
  const fetchMovimientosForProyectos = useCallback(async (proyectoIds) => {
    if (!proyectoIds?.length) return [];

    const results = [];
    const toFetch = [];

    // Usar cache
    for (const pid of proyectoIds) {
      const cached = movCacheRef.current.get(pid);
      if (cached) {
        results.push(...cached);
      } else {
        toFetch.push(pid);
      }
    }

    // Fetch en paralelo (máx 5 concurrentes)
    const batchSize = 5;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (pid) => {
          try {
            const response = await api.get(`movimientos/proyecto/${pid}`, {
              params: { sort: 'fecha_factura', order: 'desc' },
            });
            const movs = (response.data?.movimientos || []).map(m => ({ ...m, id: m._id || m.id }));
            movCacheRef.current.set(pid, movs);
            return movs;
          } catch (err) {
            console.error(`Error fetch movimientos proyecto ${pid}:`, err);
            return [];
          }
        }),
      );
      for (const movs of batchResults) {
        results.push(...movs);
      }
    }

    return results;
  }, []);

  // ═══════════════════════════════════════════
  //  4. Cargar presupuestos de control
  // ═══════════════════════════════════════════
  const loadPresupuestos = useCallback(async () => {
    if (!empresaId) return;
    try {
      const response = await PresupuestoService.listarPresupuestos(empresaId);
      // listarPresupuestos retorna { presupuestos: [...], success: bool }
      const list = response?.presupuestos || response || [];
      setPresupuestos(enrichPresupuestosWithProjectName(list));
    } catch (err) {
      console.error('Error cargando presupuestos:', err);
    }
  }, [empresaId, enrichPresupuestosWithProjectName]);

  // Si cambia el catálogo de proyectos, refrescar nombres en presupuestos ya cargados
  useEffect(() => {
    setPresupuestos((prev) => enrichPresupuestosWithProjectName(prev));
  }, [proyectos, enrichPresupuestosWithProjectName]);

  // ═══════════════════════════════════════════
  //  5. Cargar datos completos cuando se selecciona un reporte
  // ═══════════════════════════════════════════
  const loadReportData = useCallback(async (report) => {
    if (!report || !empresaId) return;

    setLoadingData(true);
    setError(null);

    try {
      // Cargar reporte completo si solo tenemos el resumen
      let fullReport = report;
      if (!report.layout) {
        fullReport = await ReportService.getById(report._id, empresaId);
      }
      setSelectedReport(fullReport);

      // Construir filtros por defecto del reporte
      const defaultFilters = buildDefaultFilters(fullReport.filtros_schema);

      // Determinar qué proyectos cargar
      let proyectoIds;
      const proyFijos = fullReport.filtros_schema?.proyectos;
      if (proyFijos?.fijos && proyFijos?.proyecto_ids?.length > 0) {
        // Proyectos forzados desde la config — no se pueden cambiar en runtime
        proyectoIds = proyFijos.proyecto_ids;
        defaultFilters.proyectos = proyectoIds;
      } else if (defaultFilters.proyectos?.length > 0) {
        proyectoIds = defaultFilters.proyectos;
      } else {
        // Cargar de todos los proyectos del usuario
        proyectoIds = proyectos.map((p) => p.id);
      }

      // Cargar movimientos
      const movs = await fetchMovimientosForProyectos(proyectoIds);
      setAllMovimientos(movs);

      const boundedFilters = applyDateBoundsToFilters(defaultFilters, fullReport.filtros_schema, movs);
      setFilters(boundedFilters);

      // Cargar presupuestos si el reporte los usa
      if (fullReport.datasets?.presupuestos) {
        await loadPresupuestos();
      }

      // Poblar opciones de filtros
      setAvailableOptions((prev) => ({
        ...prev,
        categorias: getUniqueValues(movs, 'categoria'),
        proveedores: getUniqueValues(movs, 'proveedor'),
        etapas: getUniqueValues(movs, 'etapa'),
        mediosPago: getUniqueValues(movs, 'medio_pago'),
        monedas: getUniqueValues(movs, 'moneda'),
        usuarios: buildUserOptions(usuariosEmpresa, movs),
      }));

      // Aplicar filtros iniciales
      const filtered = filterMovimientos(movs, boundedFilters, { usuariosEmpresa });
      setFilteredMovimientos(filtered);
    } catch (err) {
      console.error('Error cargando datos del reporte:', err);
      setError('Error al cargar los datos del reporte');
    } finally {
      setLoadingData(false);
    }
  }, [empresaId, proyectos, usuariosEmpresa, fetchMovimientosForProyectos, loadPresupuestos]);

  // ═══════════════════════════════════════════
  //  6. Cuando cambian los filtros, re-filtrar movimientos
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (allMovimientos.length === 0) {
      setFilteredMovimientos([]);
      return;
    }

    // Si cambiaron los proyectos, tal vez necesitamos cargar más movimientos
    const handleFilterChange = async () => {
      let movs = allMovimientos;

      // Si se seleccionaron proyectos distintos, refetch
      if (filters.proyectos?.length > 0) {
        const needed = filters.proyectos.filter((pid) => !movCacheRef.current.has(pid));
        if (needed.length > 0) {
          const extra = await fetchMovimientosForProyectos(needed);
          movs = [...allMovimientos, ...extra];
          setAllMovimientos(movs);
        }
      }

      const filtered = filterMovimientos(movs, filters, { usuariosEmpresa });
      setFilteredMovimientos(filtered);
    };

    handleFilterChange();
  }, [filters, allMovimientos, usuariosEmpresa, fetchMovimientosForProyectos]);

  // ═══════════════════════════════════════════
  //  Init
  // ═══════════════════════════════════════════
  useEffect(() => {
    loadReports();
    loadProyectos();
    loadUsuariosEmpresa();
  }, [loadReports, loadProyectos, loadUsuariosEmpresa]);
  // Fetch cotizaciones live (dólar + CAC) una vez al montar
  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        const [dolarArr, cacArr] = await Promise.all([
          MonedasService.listarDolar({ limit: 1 }).catch(() => []),
          MonedasService.listarCAC({ limit: 1 }).catch(() => []),
        ]);
        const dolarData = Array.isArray(dolarArr) ? dolarArr[0] : dolarArr;
        const cacData = Array.isArray(cacArr) ? cacArr[0] : cacArr;
        setCotizaciones({
          dolar_blue: dolarData?.blue?.venta || dolarData?.blue?.promedio || 0,
          cac: cacData?.general || cacData?.valor || 0,
        });
      } catch (err) {
        console.warn('No se pudieron obtener cotizaciones live:', err);
      }
    };
    fetchCotizaciones();
  }, []);

  // ═════════════════════════════════════════════
  //  Cargar reporte por ID (para la página /reportes/[id])
  // ═════════════════════════════════════════════
  const loadReportById = useCallback(async (id) => {
    if (!empresaId) return null;
    try {
      const fullReport = await ReportService.getById(id, empresaId);
      if (fullReport) {
        await loadReportData(fullReport);
        return fullReport;
      }
    } catch (err) {
      console.error('Error cargando reporte por ID:', err);
      setError('Reporte no encontrado');
    }
    return null;
  }, [empresaId, loadReportData]);
  // ═══════════════════════════════════════════
  //  Actions
  // ═══════════════════════════════════════════

  const createReport = useCallback(async (data) => {
    const created = await ReportService.create({ ...data, empresa_id: empresaId });
    await loadReports();
    return created;
  }, [empresaId, loadReports]);

  const updateReport = useCallback(async (id, data) => {
    const updated = await ReportService.update(id, { ...data, empresa_id: empresaId });
    if (selectedReport?._id === id) {
      setSelectedReport(updated);
    }
    await loadReports();
    return updated;
  }, [empresaId, selectedReport, loadReports]);

  const deleteReport = useCallback(async (id) => {
    await ReportService.delete(id, empresaId);
    if (selectedReport?._id === id) {
      setSelectedReport(null);
      setFilteredMovimientos([]);
    }
    await loadReports();
  }, [empresaId, selectedReport, loadReports]);

  const duplicateReport = useCallback(async (id, nombre) => {
    const dup = await ReportService.duplicate(id, empresaId, nombre);
    await loadReports();
    return dup;
  }, [empresaId, loadReports]);

  const createFromTemplate = useCallback(async (templateId, overrides) => {
    const created = await ReportService.createFromTemplate(templateId, empresaId, overrides);
    await loadReports();
    return created;
  }, [empresaId, loadReports]);

  const refreshData = useCallback(() => {
    movCacheRef.current.clear();
    if (selectedReport) {
      loadReportData(selectedReport);
    }
  }, [selectedReport, loadReportData]);

  // ═══════════════════════════════════════════
  //  Moneda equivalente: derivar displayCurrencies del estado de filtros
  // ═══════════════════════════════════════════
  const displayCurrencies = filters.moneda_equivalente?.length > 0
    ? filters.moneda_equivalente
    : selectedReport?.filtros_schema?.moneda_equivalente?.default_values?.length > 0
      ? selectedReport.filtros_schema.moneda_equivalente.default_values
      : [selectedReport?.display_currency || 'ARS'];

  return {
    // State
    reports,
    selectedReport,
    filteredMovimientos,
    presupuestos,
    proyectos,
    usuariosEmpresa,
    filters,
    availableOptions,
    loadingReports,
    loadingData,
    error,
    displayCurrencies,
    cotizaciones,

    // Actions
    setFilters,
    loadReportData,
    loadReportById,
    createReport,
    updateReport,
    deleteReport,
    duplicateReport,
    createFromTemplate,
    refreshData,
    loadReports,
  };
}
