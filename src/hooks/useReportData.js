import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoService from 'src/services/presupuestoService';
import ReportService from 'src/services/reportService';
import MonedasService from 'src/services/monedasService';
import {
  filterMovimientos,
  buildDefaultFilters,
  getUniqueValues,
} from 'src/tools/reportEngine';

/**
 * Hook que gestiona toda la carga de datos para el módulo de reportes.
 *
 * - Carga reportes (configs) desde MongoDB via API
 * - Carga movimientos desde Firestore (directo)
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
  });

  // ─── Error ───
  const [error, setError] = useState(null);

  // ─── Cotizaciones live (dolar + CAC) ───
  const [cotizaciones, setCotizaciones] = useState(null);

  // Cache para evitar re-fetches
  const movCacheRef = useRef(new Map()); // proyecto_id → movimientos[]

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

  // ═══════════════════════════════════════════
  //  3. Cargar movimientos de Firestore por proyecto(s)
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

    // Fetch en paralelo (máx 5 concurrentes para no saturar Firestore)
    const batchSize = 5;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (pid) => {
          try {
            // Traer ARS y USD
            const [arsSnap, usdSnap] = await Promise.all([
              getDocs(
                query(
                  collection(db, 'movimientos'),
                  where('proyecto_id', '==', pid),
                  where('moneda', '==', 'ARS'),
                  orderBy('fecha_factura', 'desc'),
                ),
              ),
              getDocs(
                query(
                  collection(db, 'movimientos'),
                  where('proyecto_id', '==', pid),
                  where('moneda', '==', 'USD'),
                  orderBy('fecha_factura', 'desc'),
                ),
              ),
            ]);

            const movs = [
              ...arsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
              ...usdSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            ];

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
      setPresupuestos(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error cargando presupuestos:', err);
    }
  }, [empresaId]);

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
      setFilters(defaultFilters);

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
        usuarios: getUniqueValues(movs, 'usuario'),
      }));

      // Aplicar filtros iniciales
      const filtered = filterMovimientos(movs, defaultFilters);
      setFilteredMovimientos(filtered);
    } catch (err) {
      console.error('Error cargando datos del reporte:', err);
      setError('Error al cargar los datos del reporte');
    } finally {
      setLoadingData(false);
    }
  }, [empresaId, proyectos, fetchMovimientosForProyectos, loadPresupuestos]);

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

      const filtered = filterMovimientos(movs, filters);
      setFilteredMovimientos(filtered);
    };

    handleFilterChange();
  }, [filters, allMovimientos, fetchMovimientosForProyectos]);

  // ═══════════════════════════════════════════
  //  Init
  // ═══════════════════════════════════════════
  useEffect(() => {
    loadReports();
    loadProyectos();
  }, [loadReports, loadProyectos]);
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
