import { useState, useMemo, useEffect, useRef } from 'react';
import { subDays, addDays } from 'date-fns';
import { useRouter } from 'next/router';
import { toJsDate } from 'src/utils/dateSerde';

const DEBUG_CAJA_FILTERS = true;

const formatDebugValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(formatDebugValue);
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, current]) => {
      acc[key] = formatDebugValue(current);
      return acc;
    }, {});
  }
  return value;
};

const logCajaFilters = (label, payload) => {
  if (!DEBUG_CAJA_FILTERS) return;
  if (typeof payload === 'undefined') {
    console.log(`[CajaProyecto:filters] ${label}`);
    return;
  }
  console.log(`[CajaProyecto:filters] ${label}`, formatDebugValue(payload));
};

const PERSIST_KEYS = [
  'fechaDesde','fechaHasta','palabras','observacion',
  'categorias','subcategorias','proveedores','medioPago',
  'tipo','moneda','etapa','estados','cuentaInterna','tagsExtra',
  'montoMin','montoMax','ordenarPor','ordenarDir','caja', '_dayKey',
  'empresaFacturacion','fechaPagoDesde','fechaPagoHasta','codigoSync','facturaCliente'
];

const defaultFilters = {
  fechaDesde: null,
  fechaHasta: null,
  palabras: '',
  observacion: '',
  categorias: [],
  subcategorias: [],
  proveedores: [],
  medioPago: [],
  tipo: [],            // ['ingreso', 'egreso']
  moneda: [],          // ['ARS','USD']
  etapa: [],
  estados: [],
  cuentaInterna: [],
  tagsExtra: [],
  montoMin: '',
  montoMax: '',
  ordenarPor: 'fecha_factura',
  ordenarDir: 'desc',
  empresaFacturacion: [],   // select múltiple
  fechaPagoDesde: null,     // Date
  fechaPagoHasta: null,     // Date
  caja: null, // { moneda, medio_pago }
  codigoSync: '', // código de sincronización de importación masiva
  facturaCliente: '', // '' | 'cliente' | 'propia'
};

const arrayFields = [
  'tipo','moneda','proveedores','categorias','subcategorias',
  'medioPago','estados','estado','etapa','cuentaInterna','tagsExtra'
];

export function useMovimientosFilters({
  empresaId, proyectoId,
  movimientos, movimientosUSD, cajaSeleccionada
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(defaultFilters);
  const initializedRef = useRef(false);
  const lastQueryHashRef = useRef(null);

  const parseArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) v = v.join(',');
    return String(v)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const parseDate = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) v = v[0];
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const parseObject = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) v = v[0];
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const sameDay = (a, b) => {
    if (!(a instanceof Date) || !(b instanceof Date)) return false;
    return a.toDateString() === b.toDateString();
  };

  const parseFiltersFromQuery = (query) => {
    const out = {};
    PERSIST_KEYS.forEach((k) => {
      if (!(k in query)) return;
      if (arrayFields.includes(k)) {
        out[k] = parseArray(query[k]);
        return;
      }
      if (k === 'fechaDesde' || k === 'fechaHasta' || k === 'fechaPagoDesde' || k === 'fechaPagoHasta') {
        out[k] = parseDate(query[k]);
        return;
      }
      if (k === 'caja') {
        out[k] = parseObject(query[k]);
        return;
      }
      out[k] = Array.isArray(query[k]) ? query[k][0] : query[k];
    });
    return out;
  };

  const stableStringify = (obj) => {
    const sorted = Object.keys(obj || {})
      .sort()
      .reduce((acc, k) => {
        acc[k] = obj[k];
        return acc;
      }, {});
    return JSON.stringify(sorted);
  };

  const buildQueryFromFilters = (f, baseQuery = {}) => {
    const out = { ...baseQuery };
    PERSIST_KEYS.forEach((k) => {
      delete out[k];
    });

    const shouldInclude = (k, v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (v instanceof Date) {
        const dv = defaultFilters[k];
        if (!dv) return true;
        return !sameDay(v, dv);
      }
      if (typeof v === 'object' && v) return Object.keys(v).length > 0;
      if (typeof v === 'string') {
        const dv = defaultFilters[k];
        if (typeof dv === 'string' && v === dv) return false;
        return v !== '';
      }
      return v != null;
    };

    PERSIST_KEYS.forEach((k) => {
      const v = f[k];
      if (!shouldInclude(k, v)) return;
      if (Array.isArray(v)) {
        out[k] = v.join(',');
      } else if (v instanceof Date) {
        out[k] = v.toISOString().slice(0, 10);
      } else if (typeof v === 'object') {
        out[k] = JSON.stringify(v);
      } else {
        out[k] = String(v);
      }
    });
    return out;
  };

  useEffect(() => {
    if (!router.isReady) return;
    const incomingHash = stableStringify(router.query || {});
    if (incomingHash === lastQueryHashRef.current) return;
    const parsed = parseFiltersFromQuery(router.query);
    const merged = { ...defaultFilters, ...parsed };
    arrayFields.forEach((k) => {
      if (!Array.isArray(merged[k])) merged[k] = [];
    });
    setFilters(merged);
    logCajaFilters('Filtros rehidratados desde query', {
      empresaId,
      proyectoId,
      routerQuery: router.query,
      parsed,
      merged,
    });
    lastQueryHashRef.current = incomingHash;
    initializedRef.current = true;
  }, [empresaId, proyectoId, router.isReady, router.query]);

  useEffect(() => {
    if (!initializedRef.current || !router.isReady) return;
    const nextQuery = buildQueryFromFilters(filters, router.query || {});
    const qHash = stableStringify(nextQuery);
    if (qHash === lastQueryHashRef.current) return;
    logCajaFilters('Sincronizando filtros hacia query', {
      proyectoId,
      filters,
      previousQuery: router.query,
      nextQuery,
    });
    lastQueryHashRef.current = qHash;
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true, scroll: false });
  }, [filters, proyectoId, router]);


  // opciones únicas (para selects múltiples)
  const options = useMemo(() => {
    const base = [...(movimientos || []), ...(movimientosUSD || [])];
    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    const sort = (arr) => arr.slice().sort((a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base' }));
    const subcatMap = base.reduce((acc, m) => {
      const cat = m.categoria;
      const sub = m.subcategoria;
      if (!cat || !sub) return acc;
      if (!acc[cat]) acc[cat] = new Set();
      acc[cat].add(sub);
      return acc;
    }, {});
    const subcategoriasByCategoria = Object.fromEntries(
      Object.entries(subcatMap).map(([cat, set]) => [cat, sort([...set])])
    );
    return {
      categorias: sort(uniq(base.map(m => m.categoria))),
      subcategorias: sort(uniq(base.map(m => m.subcategoria))),
      subcategoriasByCategoria,
      proveedores: sort(uniq(base.map(m => m.nombre_proveedor))),
      monedas: sort(uniq(base.map(m => m.moneda))),
      mediosPago: sort(uniq(base.map(m => m.medio_pago))),
      etapas: sort(uniq(base.map(m => m.etapa))),
      estados: sort(uniq(base.map(m => m.estado))),
      cuentasInternas: sort(uniq(base.map(m => m.cuenta_interna))),
      tags: sort(uniq(base.flatMap(m => Array.isArray(m.tags_extra) ? m.tags_extra : []))),
      empresasFacturacion: sort(uniq(base.map(m => m.empresa_facturacion))),
      tipos: ['ingreso', 'egreso'],
    };
  }, [movimientos, movimientosUSD]);

  // helper local (usa tu util toJsDate)
  const insideRange = (mov, fechaDesde, fechaHasta) => {
    const dt = toJsDate(mov.fecha_factura ?? mov.fecha ?? mov.fecha_creacion);
    if (!dt) return true;
    if (!fechaDesde && !fechaHasta) return true;
    if (fechaDesde && dt < fechaDesde) return false;
    if (fechaHasta) {
      const end = new Date(fechaHasta);
      end.setHours(23, 59, 59, 999);
      if (dt > end) return false;
    }
    return true;
  };

  const insideRangePago = (mov, fechaDesde, fechaHasta) => {
    const dt = toJsDate(mov.fecha_pago);
    if (!fechaDesde && !fechaHasta) return true;
    if (!dt) return false; // si filtrás por pago y el mov no tiene fecha_pago, no matchea
    if (fechaDesde && dt < fechaDesde) return false;
    if (fechaHasta) {
      const end = new Date(fechaHasta);
      end.setHours(23, 59, 59, 999);
      if (dt > end) return false;
    }
    return true;
  };
  

  // Filtrado
  const movimientosFiltrados = useMemo(() => {
    const base =
      (filters.caja?.moneda || cajaSeleccionada?.moneda) === 'USD'
        ? (movimientosUSD || [])
        : (movimientos || []);

    const {
      fechaDesde, fechaHasta, palabras, observacion, categorias, subcategorias,
      proveedores, medioPago, tipo, moneda, etapa, cuentaInterna, estado, tagsExtra,
      montoMin, montoMax, ordenarPor, ordenarDir, empresaFacturacion, fechaPagoDesde, fechaPagoHasta,
      codigoSync, facturaCliente
    } = filters;

    const match = (value, arr) => arr.length === 0 || arr.includes(value);
    const matchText = (text, q) => !q || (text || '').toLowerCase().includes(q.toLowerCase());
    const matchTags = (tags, needed) =>
      needed.length === 0 || (Array.isArray(tags) && needed.every(t => tags.includes(t)));
    const matchMonto = (total) => {
      const minOk = montoMin ? total >= Number(montoMin) : true;
      const maxOk = montoMax ? total <= Number(montoMax) : true;
      return minOk && maxOk;
    };
    const matchCaja = (mov) => {
      const caja = filters.caja || cajaSeleccionada;
      if (!caja) return true;
      const monedaOk = !caja.moneda || mov.moneda === caja.moneda;
      const medioOk = !caja.medio_pago || mov.medio_pago === caja.medio_pago;
      const estadoOk = !caja.estado || mov.estado === caja.estado;
      return monedaOk && medioOk && estadoOk;
    };
    const matchEstado = (mov) => {
      if (!filters.estados || filters.estados.length === 0) return true;
      return filters.estados.includes(mov.estado);
    };
    const matchCodigoSync = (mov) => {
      if (!codigoSync || codigoSync.trim() === '') return true;
      return mov.codigo_sync === codigoSync.trim();
    };
    const matchFacturaCliente = (mov) => {
      if (!facturaCliente) return true;
      const isCliente = mov.factura_cliente === true;
      if (facturaCliente === 'cliente') return isCliente;
      if (facturaCliente === 'propia') return !isCliente;
      return true;
    };

    const res = base.filter(mov =>
      insideRange(mov, fechaDesde, fechaHasta)
      && insideRangePago(mov, fechaPagoDesde, fechaPagoHasta)               // 🔹 NUEVO
      && match(mov.categoria, categorias)
      && match(mov.subcategoria, subcategorias)
      && match(mov.nombre_proveedor, proveedores)
      && match(mov.medio_pago, medioPago)
      && match(mov.type, tipo)
      && match(mov.moneda, moneda)
      && match(mov.etapa, etapa)
      && match(mov.cuenta_interna, cuentaInterna)
      && matchTags(mov.tags_extra, tagsExtra)
      && matchMonto(mov.total)
      && matchText(mov.observacion, observacion)
      && matchText(Object.values(mov).join(' '), palabras)
      && matchEstado(mov)
      && matchCaja(mov)
      && matchCodigoSync(mov)
      && matchFacturaCliente(mov)
      && (empresaFacturacion.length === 0 || empresaFacturacion.includes(mov.empresa_facturacion)) // 🔹 NUEVO
    );
    

    if (!ordenarPor) return res;

    return res.sort((a, b) => {
      const av = a[ordenarPor];
      const bv = b[ordenarPor];
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === 'number') {
        return ordenarDir === 'asc' ? av - bv : bv - av;
      }
      const ad = new Date(av); const bd = new Date(bv);
      if (!isNaN(ad) && !isNaN(bd)) {
        return ordenarDir === 'asc' ? ad - bd : bd - ad;
      }
      return ordenarDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filters, movimientos, movimientosUSD, cajaSeleccionada]);

  useEffect(() => {
    const base = (filters.caja?.moneda || cajaSeleccionada?.moneda) === 'USD'
      ? (movimientosUSD || [])
      : (movimientos || []);

    const activeFilterKeys = Object.entries(filters).reduce((acc, [key, value]) => {
      if (Array.isArray(value) && value.length > 0) acc.push(key);
      else if (value instanceof Date) acc.push(key);
      else if (value && typeof value === 'object') acc.push(key);
      else if (typeof value === 'string' && value.trim() !== '') acc.push(key);
      return acc;
    }, []);

    const checks = {
      fecha: base.filter((mov) => insideRange(mov, filters.fechaDesde, filters.fechaHasta)).length,
      fechaPago: base.filter((mov) => insideRangePago(mov, filters.fechaPagoDesde, filters.fechaPagoHasta)).length,
      categoria: base.filter((mov) => filters.categorias.length === 0 || filters.categorias.includes(mov.categoria)).length,
      subcategoria: base.filter((mov) => filters.subcategorias.length === 0 || filters.subcategorias.includes(mov.subcategoria)).length,
      proveedor: base.filter((mov) => filters.proveedores.length === 0 || filters.proveedores.includes(mov.nombre_proveedor)).length,
      medioPago: base.filter((mov) => filters.medioPago.length === 0 || filters.medioPago.includes(mov.medio_pago)).length,
      tipo: base.filter((mov) => filters.tipo.length === 0 || filters.tipo.includes(mov.type)).length,
      moneda: base.filter((mov) => filters.moneda.length === 0 || filters.moneda.includes(mov.moneda)).length,
      estados: base.filter((mov) => filters.estados.length === 0 || filters.estados.includes(mov.estado)).length,
      empresaFacturacion: base.filter((mov) => filters.empresaFacturacion.length === 0 || filters.empresaFacturacion.includes(mov.empresa_facturacion)).length,
      codigoSync: base.filter((mov) => !filters.codigoSync || mov.codigo_sync === filters.codigoSync.trim()).length,
      facturaCliente: base.filter((mov) => {
        if (!filters.facturaCliente) return true;
        const isCliente = mov.factura_cliente === true;
        return filters.facturaCliente === 'cliente' ? isCliente : !isCliente;
      }).length,
      caja: base.filter((mov) => {
        const caja = filters.caja || cajaSeleccionada;
        if (!caja) return true;
        const monedaOk = !caja.moneda || mov.moneda === caja.moneda;
        const medioOk = !caja.medio_pago || mov.medio_pago === caja.medio_pago;
        const estadoOk = !caja.estado || mov.estado === caja.estado;
        return monedaOk && medioOk && estadoOk;
      }).length,
      monto: base.filter((mov) => {
        const minOk = filters.montoMin ? mov.total >= Number(filters.montoMin) : true;
        const maxOk = filters.montoMax ? mov.total <= Number(filters.montoMax) : true;
        return minOk && maxOk;
      }).length,
    };

    logCajaFilters('Resumen de filtrado', {
      empresaId,
      proyectoId,
      tablaBase: (filters.caja?.moneda || cajaSeleccionada?.moneda) === 'USD' ? 'USD' : 'ARS',
      baseCount: base.length,
      filteredCount: movimientosFiltrados.length,
      activeFilterKeys,
      cajaSeleccionada,
      filters,
      checks,
      primerasCoincidencias: movimientosFiltrados.slice(0, 5).map((mov) => ({
        id: mov.id,
        codigo: mov.codigo_operacion || mov.codigo || null,
        moneda: mov.moneda,
        total: mov.total,
        medioPago: mov.medio_pago,
        estado: mov.estado,
      })),
    });
  }, [empresaId, proyectoId, filters, cajaSeleccionada, movimientos, movimientosUSD, movimientosFiltrados]);

  const totales = useMemo(() => {
    return movimientosFiltrados.reduce((acc, m) => {
      const v = m.type === 'ingreso' ? m.total : -m.total;
      if (m.moneda === 'ARS') acc.ars += v;
      if (m.moneda === 'USD') acc.usd += v;
      return acc;
    }, { ars: 0, usd: 0 });
  }, [movimientosFiltrados]);

  return {
    filters, setFilters, options, movimientosFiltrados, totales,
  };
}
