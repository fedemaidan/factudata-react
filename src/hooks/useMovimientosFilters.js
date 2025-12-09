import { useState, useMemo, useEffect, useRef } from 'react';
import { subDays, addDays } from 'date-fns';
import filtersService from 'src/services/filtersService';
import { reviveFilterDates, serializeFilterDates, toJsDate } from 'src/utils/dateSerde';

const PERSIST_KEYS = [
  'fechaDesde','fechaHasta','palabras','observacion',
  'categorias','subcategorias','proveedores','medioPago',
  'tipo','moneda','etapa','estados','cuentaInterna','tagsExtra',
  'montoMin','montoMax','ordenarPor','ordenDir','caja', '_dayKey',
  'empresaFacturacion','fechaPagoDesde','fechaPagoHasta','codigoSync'
];

const pickPersistable = (f) => {
  const out = {};
  PERSIST_KEYS.forEach(k => { if (k in f) out[k] = f[k]; });
  return out;
};

const hash = (obj) => JSON.stringify(serializeFilterDates(obj));

const todayKey = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};


const defaultFilters = {
  fechaDesde: subDays(new Date(), 365*3),
  fechaHasta: addDays(new Date(), 365),
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
};

const arrayFields = [
  'tipo','moneda','proveedores','categorias','subcategorias',
  'medioPago','estados','estado','etapa','cuentaInterna','tagsExtra'
];

export function useMovimientosFilters({
  empresaId, proyectoId, userId, // <-- agrega userId
  movimientos, movimientosUSD, cajaSeleccionada
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const loadedRef = useRef(false);
  const unsubRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastSavedHashRef = useRef(null);
const lastSnapHashRef  = useRef(null);

useEffect(() => {
  let mounted = true;

  const boot = async () => {
    // 1) carga inicial
    const remote = await filtersService.getOnce(empresaId, proyectoId, userId);
    if (!mounted) return;

    const merged = reviveFilterDates({ ...defaultFilters, ...(remote || {}) });
    // fuerza arrays
    ['tipo','moneda','proveedores','categorias','subcategorias','medioPago','estados','estado','etapa','cuentaInterna','tagsExtra']
      .forEach(k => { if (!Array.isArray(merged[k])) merged[k] = []; });

    // Normalizar _dayKey y resetear fechas si es de otro día
    const remoteDay = remote?._dayKey;
    const today = todayKey();
    if (!remoteDay) {
      merged._dayKey = today; // primera vez o doc viejo
    } else if (remoteDay !== today) {
      merged.fechaDesde = defaultFilters.fechaDesde;
      merged.fechaHasta = defaultFilters.fechaHasta;
      merged._dayKey    = today; // ya queda con el día actual
    }

    if (remote && remote._dayKey && remote._dayKey !== todayKey()) {
        merged.fechaDesde = defaultFilters.fechaDesde;
        merged.fechaHasta = defaultFilters.fechaHasta;
        merged._dayKey    = todayKey(); // normalizo en memoria
     }

    setFilters(merged);

    // registra hashes
    const initialHash = hash(pickPersistable(merged));
    lastSnapHashRef.current  = initialHash;
    lastSavedHashRef.current = initialHash;

    loadedRef.current = true;

    // 2) suscripción realtime
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = filtersService.subscribe(empresaId, proyectoId, userId, (docData) => {
      if (!mounted || !docData) return;

      const incoming = reviveFilterDates({ ...defaultFilters, ...docData });
      ['tipo','moneda','proveedores','categorias','subcategorias','medioPago','estados','estado','etapa','cuentaInterna','tagsExtra']
        .forEach(k => { if (!Array.isArray(incoming[k])) incoming[k] = []; });
      
      // Ajuste por cambio de día
      const today = todayKey();
      if (incoming._dayKey && incoming._dayKey !== today) {
        incoming.fechaDesde = defaultFilters.fechaDesde;
        incoming.fechaHasta = defaultFilters.fechaHasta;
        incoming._dayKey    = today;
      }
      const incomingHash = hash(pickPersistable(incoming));
      lastSnapHashRef.current = incomingHash;

      // Evitá usar `filters` del cierre, compará contra el estado actual
      setFilters(prev => {
        if (incomingHash === lastSavedHashRef.current) return prev; // lo escribí yo
        const prevHash = hash(pickPersistable(prev));
        if (incomingHash === prevHash) return prev; // ya lo tengo
        return incoming;
      });
    });
  };

  boot();

  return () => {
    mounted = false;
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = null;
  };
}, [empresaId, proyectoId, userId]); // deps del efecto

useEffect(() => {
  if (!loadedRef.current) return;

  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(async () => {
    const payload = { ...pickPersistable(filters), _dayKey: todayKey() };
    const currentHash = hash(payload);

    // si es igual al snapshot más reciente → no escribas
    if (currentHash === lastSnapHashRef.current) return;

    // si es igual a lo último que guardé yo → no escribas
    if (currentHash === lastSavedHashRef.current) return;

    await filtersService.save(empresaId, proyectoId, userId, serializeFilterDates(payload));

    // marca lo que acabo de guardar
    lastSavedHashRef.current = currentHash;
  }, 350);

  return () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  };
}, [filters, empresaId, proyectoId, userId]);


  // opciones únicas (para selects múltiples)
  const options = useMemo(() => {
    const base = [...(movimientos || []), ...(movimientosUSD || [])];
    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    return {
      categorias: uniq(base.map(m => m.categoria)),
      subcategorias: uniq(base.map(m => m.subcategoria)),
      proveedores: uniq(base.map(m => m.nombre_proveedor)),
      monedas: uniq(base.map(m => m.moneda)),
      mediosPago: uniq(base.map(m => m.medio_pago)),
      etapas: uniq(base.map(m => m.etapa)),
      estados: uniq(base.map(m => m.estado)),
      cuentasInternas: uniq(base.map(m => m.cuenta_interna)),
      tags: uniq(base.flatMap(m => Array.isArray(m.tags_extra) ? m.tags_extra : [])),
      empresasFacturacion: uniq(base.map(m => m.empresa_facturacion)),
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
      codigoSync
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
