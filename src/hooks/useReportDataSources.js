import { useState, useEffect, useCallback, useRef } from 'react';
import api from 'src/services/axiosConfig';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoService from 'src/services/presupuestoService';
import planCobroService from 'src/services/planCobroService';
import MonedasService from 'src/services/monedasService';
import profileService from 'src/services/profileService';
import {
  filterMovimientos,
  buildDefaultFilters,
  getUniqueValues,
} from 'src/tools/reportEngine';
import {
  buildUserOptions,
  normalizeFilterOptionText,
  normalizeCategoryLabel,
  getExcludedCategorySetFromLayout,
  applyDateBoundsToFilters,
} from 'src/utils/reportes/reportDataHelpers';

const EMPTY_OPTIONS = {
  proyectos: [],
  categorias: [],
  proveedores: [],
  etapas: [],
  mediosPago: [],
  monedas: [],
  usuarios: [],
};

/**
 * Deriva en qué monedas se muestran los valores, a partir del borrador (no hay edición
 * de filtros en runtime en la preview, así que se toman los defaults del draft). Misma
 * lógica que useReportData para que la preview coincida con el reporte guardado.
 */
function deriveDisplayCurrencies(draft) {
  const layout = Array.isArray(draft?.layout) ? draft.layout : [];
  const hasIncomeBudgetControl = layout.some((b) => b?.type === 'income_budget_control');
  if (hasIncomeBudgetControl) return ['ARS'];
  const eq = draft?.filtros_schema?.moneda_equivalente;
  const fromSchema = eq?.default_values;
  if (eq?.enabled === true && Array.isArray(fromSchema) && fromSchema.length > 0) return fromSchema;
  return [draft?.display_currency || 'ARS'];
}

function getPresupuestoProviderOptions(presupuestos = []) {
  const seen = new Set();
  const values = [];
  for (const presupuesto of presupuestos || []) {
    const proveedores = Array.isArray(presupuesto?.proveedores) ? presupuesto.proveedores : [];
    for (const proveedor of proveedores) {
      const nombre = String(proveedor?.nombre || '').trim();
      const key = normalizeFilterOptionText(nombre);
      if (!nombre || seen.has(key)) continue;
      seen.add(key);
      values.push(nombre);
    }
  }
  return values.sort((a, b) => a.localeCompare(b));
}

/**
 * Carga los datos crudos (proyectos, movimientos, presupuestos, cotizaciones) necesarios
 * para previsualizar un BORRADOR de reporte que todavía no existe en la base. Pensado para
 * la preview en vivo del agente: `loadDataForDraft(draft)` resuelve proyectos→movimientos,
 * arma los filtros por defecto del draft y deja todo listo para alimentar <ReportView/>.
 */
export function useReportDataSources(user, empresaId) {
  const [proyectos, setProyectos] = useState([]);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [planesCobro, setPlanesCobro] = useState([]);
  const [cotizaciones, setCotizaciones] = useState(null);

  const [filteredMovimientos, setFilteredMovimientos] = useState([]);
  // Total de movimientos traídos antes de filtrar: distingue "empresa sin datos" (0)
  // de "los filtros del reporte no devolvieron nada" (>0 pero filtrados a 0).
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [filters, setFilters] = useState({});
  const [availableOptions, setAvailableOptions] = useState(EMPTY_OPTIONS);
  const [displayCurrencies, setDisplayCurrencies] = useState(['ARS']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache de movimientos por proyecto (igual que useReportData) para no re-fetchear.
  const movCacheRef = useRef(new Map());
  // Refs para leer el último valor dentro de loadDataForDraft sin recrear el callback.
  const proyectosRef = useRef([]);
  const usuariosRef = useRef([]);
  proyectosRef.current = proyectos;
  usuariosRef.current = usuariosEmpresa;

  // ─── Carga inicial de catálogos ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const proys = await getProyectosFromUser(user);
        if (!cancelled) setProyectos(Array.isArray(proys) ? proys : []);
      } catch (err) {
        console.error('useReportDataSources: error cargando proyectos', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      try {
        const users = await profileService.getProfileByEmpresa(empresaId);
        if (!cancelled) setUsuariosEmpresa(Array.isArray(users) ? users : []);
      } catch (err) {
        console.error('useReportDataSources: error cargando usuarios', err);
      }
    })();
    return () => { cancelled = true; };
  }, [empresaId]);

  // Cotizaciones live (dólar + CAC), una vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dolarArr, cacArr] = await Promise.all([
          MonedasService.listarDolar({ limit: 1 }).catch(() => []),
          MonedasService.listarCAC({ limit: 1 }).catch(() => []),
        ]);
        const dolarData = Array.isArray(dolarArr) ? dolarArr[0] : dolarArr;
        const cacData = Array.isArray(cacArr) ? cacArr[0] : cacArr;
        if (cancelled) return;
        setCotizaciones({
          dolar_blue: dolarData?.blue?.venta || dolarData?.blue?.promedio || 0,
          cac: cacData?.cac_indice || cacData?.general || cacData?.valor || 0,
          cac_general: cacData?.cac_indice || cacData?.general || cacData?.valor || 0,
          cac_mano_obra: cacData?.cac_mano_obra || cacData?.mano_obra || 0,
          cac_materiales: cacData?.cac_materiales || cacData?.materiales || 0,
        });
      } catch (err) {
        console.warn('useReportDataSources: no se pudieron obtener cotizaciones', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchMovimientosForProyectos = useCallback(async (proyectoIds) => {
    if (!proyectoIds?.length) return [];
    const results = [];
    const toFetch = [];
    for (const pid of proyectoIds) {
      const cached = movCacheRef.current.get(pid);
      if (cached) results.push(...cached);
      else toFetch.push(pid);
    }
    const batchSize = 5;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (pid) => {
          try {
            const response = await api.get(`movimientos/proyecto/${pid}`, {
              params: { sort: 'fecha_factura', order: 'desc' },
            });
            const movs = (response.data?.movimientos || []).map((m) => ({ ...m, id: m._id || m.id }));
            movCacheRef.current.set(pid, movs);
            return movs;
          } catch (err) {
            console.error(`useReportDataSources: error movimientos proyecto ${pid}`, err);
            return [];
          }
        }),
      );
      for (const movs of batchResults) results.push(...movs);
    }
    return results;
  }, []);

  const loadPresupuestos = useCallback(async () => {
    if (!empresaId) return [];
    try {
      const response = await PresupuestoService.listarPresupuestos(empresaId);
      return response?.presupuestos || response || [];
    } catch (err) {
      console.error('useReportDataSources: error cargando presupuestos', err);
      return [];
    }
  }, [empresaId]);

  const loadPlanesCobro = useCallback(async () => {
    if (!empresaId) return [];
    try {
      const response = await planCobroService.listarPlanes(empresaId);
      const body = response?.data;
      const list = (body?.ok ? body.data : body) || [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('useReportDataSources: error cargando planes de cobro', err);
      return [];
    }
  }, [empresaId]);

  // ─── Carga los datos para un borrador concreto ───────────────────────────
  const loadDataForDraft = useCallback(async (draft) => {
    if (!draft || !empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const schema = draft.filtros_schema || {};
      const defaultFilters = buildDefaultFilters(schema);

      // Resolver qué proyectos cargar (proyectos fijos > defaults > todos los del usuario).
      const allProyectos = proyectosRef.current;
      let proyectoIds;
      const proyFijos = schema.proyectos;
      if (proyFijos?.fijos && proyFijos?.proyecto_ids?.length > 0) {
        proyectoIds = proyFijos.proyecto_ids;
        defaultFilters.proyectos = proyectoIds;
      } else if (defaultFilters.proyectos?.length > 0) {
        proyectoIds = defaultFilters.proyectos;
      } else {
        proyectoIds = allProyectos.map((p) => p.id);
      }

      const movs = await fetchMovimientosForProyectos(proyectoIds);
      const boundedFilters = applyDateBoundsToFilters(defaultFilters, schema, movs);

      let presus = [];
      if (draft.datasets?.presupuestos) {
        presus = await loadPresupuestos();
      }

      let planes = [];
      if (draft.datasets?.planes_cobro) {
        planes = await loadPlanesCobro();
      }

      const excludedCategorySet = getExcludedCategorySetFromLayout(draft.layout || []);
      const visibleCategories = getUniqueValues(movs, 'categoria').filter((category) => {
        const key = normalizeFilterOptionText(normalizeCategoryLabel(category));
        return !excludedCategorySet.has(key);
      });

      const usuarios = usuariosRef.current;
      const proveedoresSet = new Set();
      const proveedores = [
        ...getUniqueValues(movs, 'proveedor'),
        ...getPresupuestoProviderOptions(presus),
      ].filter((value) => {
        const key = normalizeFilterOptionText(value);
        if (!key || proveedoresSet.has(key)) return false;
        proveedoresSet.add(key);
        return true;
      });
      const options = {
        proyectos: allProyectos.map((p) => ({ id: p.id, nombre: p.nombre || p.proyecto || p.id })),
        categorias: visibleCategories,
        proveedores,
        etapas: getUniqueValues(movs, 'etapa'),
        asignados: getUniqueValues(movs, 'asignado'),
        mediosPago: getUniqueValues(movs, 'medio_pago'),
        monedas: getUniqueValues(movs, 'moneda'),
        usuarios: buildUserOptions(usuarios, movs),
      };

      const filtered = filterMovimientos(movs, boundedFilters, { usuariosEmpresa: usuarios });

      setPresupuestos(presus);
      setPlanesCobro(planes);
      setFilters(boundedFilters);
      setAvailableOptions(options);
      setDisplayCurrencies(deriveDisplayCurrencies(draft));
      setFilteredMovimientos(filtered);
      setTotalMovimientos(movs.length);
    } catch (err) {
      console.error('useReportDataSources: error cargando datos del borrador', err);
      setError('No se pudieron cargar los datos para la previsualización.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, fetchMovimientosForProyectos, loadPresupuestos, loadPlanesCobro]);

  return {
    loadDataForDraft,
    filteredMovimientos,
    totalMovimientos,
    presupuestos,
    planesCobro,
    proyectos,
    usuariosEmpresa,
    cotizaciones,
    filters,
    availableOptions,
    displayCurrencies,
    loading,
    error,
  };
}
