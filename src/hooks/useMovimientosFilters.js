import { useState, useMemo, useEffect } from 'react';
import { subDays, addDays } from 'date-fns';

const STORAGE_KEY = (empresaId, proyectoId) =>
  `cajaProyecto::${empresaId || 'empresa'}::${proyectoId || 'all'}`;

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
  cuentaInterna: [],
  tagsExtra: [],
  montoMin: '',
  montoMax: '',
  ordenarPor: 'fecha_factura',
  ordenarDir: 'desc',
  // si usás “cajasVirtuales”:
  caja: null, // { moneda, medio_pago }
};

export function useMovimientosFilters({ empresaId, proyectoId, movimientos, movimientosUSD, cajaSeleccionada }) {
  const storageKey = STORAGE_KEY(empresaId, proyectoId);
  const [filters, setFilters] = useState(defaultFilters);

  // cargar de localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        const savedDay = parsed._savedAt
          ? new Date(parsed._savedAt).toDateString()
          : today; // si no existe, asumimos hoy para no resetear la primera vez

 
        if (savedDay !== today) {
          localStorage.removeItem(storageKey);
          setFilters(defaultFilters);
          return;
        }
        if (parsed.fechaDesde) parsed.fechaDesde = new Date(parsed.fechaDesde);
        if (parsed.fechaHasta) parsed.fechaHasta = new Date(parsed.fechaHasta);

        const corregido = { ...defaultFilters, ...parsed };

        // Forzar que los campos multiple sean arrays
        [
          'tipo',
          'moneda',
          'proveedores',
          'categorias',
          'subcategorias',
          'medioPago',
          'estado',
          'etapa',
          'cuentaInterna',
          'tagsExtra'
        ].forEach((campo) => {
          if (!Array.isArray(corregido[campo])) {
            corregido[campo] = [];
          }
        });

        setFilters(corregido);

      } catch (e) {
        console.warn('No pude parsear filtros guardados', e);
      }
    }
  }, [storageKey]);

  // guardar en localStorage
  useEffect(() => {
    localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...filters,
          _savedAt: new Date().toISOString(),
        })
      );
      
  }, [storageKey, filters]);

  // opciones únicas (para los selects múltiples)
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
      tipos: ['ingreso', 'egreso'],
    };
  }, [movimientos, movimientosUSD]);

  // El filtrado propiamente dicho
  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    const base =
      (filters.caja?.moneda || cajaSeleccionada?.moneda) === 'USD'
        ? (movimientosUSD || [])
        : (movimientos || []);

    const {
      fechaDesde, fechaHasta, palabras, observacion, categorias, subcategorias,
      proveedores, medioPago, tipo, moneda, etapa, cuentaInterna, estado, tagsExtra,
      montoMin, montoMax, ordenarPor, ordenarDir
    } = filters;

    // helper para convertir lo que venga (Date, string, Firestore Timestamp) a Date nativo
const toJsDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate();              // Firestore Timestamp
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// mov = el movimiento completo (así elegís qué fecha usar adentro)
// fechaDesde / fechaHasta vienen de filters
const insideRange = (mov, fechaDesde, fechaHasta) => {
  const dt = toJsDate(mov.fecha_factura ?? mov.fecha ?? mov.fecha_creacion);
  if (!dt) return true; // si no hay fecha, no lo filtres

  // si no hay ninguna fecha seteada, no filtres por rango
  if (!fechaDesde && !fechaHasta) return true;

  if (fechaDesde && dt < fechaDesde) return false;

  if (fechaHasta) {
    // incluyo todo el día "hasta"
    const end = new Date(fechaHasta);
    end.setHours(23, 59, 59, 999);
    if (dt > end) return false;
  }

  return true;
};


    const match = (value, arr) =>
      arr.length === 0 || arr.includes(value);

    const matchText = (text, q) =>
      !q || (text || '').toLowerCase().includes(q.toLowerCase());

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
      return monedaOk && medioOk;
    };

    const matchEstado = (mov) => {
      if (!filters.estado || filters.estado.length === 0) return true;
      return filters.estado.includes(mov.estado);
    }
    
    const res = base.filter(mov => {
      return insideRange(mov, fechaDesde, fechaHasta)
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
        && matchCaja(mov);
    });

    // ordenar
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
    filters,
    setFilters,
    options,
    movimientosFiltrados,
    totales,
  };
}
