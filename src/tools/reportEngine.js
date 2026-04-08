/**
 * =============================================
 *  REPORT ENGINE — Motor de cómputo para reportes
 * =============================================
 *
 * Módulo puro JS (sin dependencias de React).
 * Toda la lógica de filtrado, conversión de moneda,
 * métricas, agrupación y cruce presupuesto vs real.
 *
 * Se ejecuta 100% en el browser.
 */

// ─── Mapeo de display_currency → campo en equivalencias ───
const CURRENCY_FIELD = {
  ARS: 'ars',
  USD: 'usd_blue',
  CAC: 'cac',
};

// ─── Helpers ───

/**
 * Obtiene el monto de un movimiento en la moneda de visualización.
 * @param {Object} mov  - Movimiento con campo `equivalencias`
 * @param {string} displayCurrency - 'ARS' | 'USD' | 'CAC' | 'original'
 * @param {string} campo - 'total' | 'subtotal'
 * @returns {number}
 */
export function getAmount(mov, displayCurrency = 'ARS', campo = 'total') {
  if (displayCurrency === 'original') {
    return campo === 'total'
      ? (mov.total ?? mov.monto ?? 0)
      : (mov.subtotal ?? mov.total ?? mov.monto ?? 0);
  }

  const key = CURRENCY_FIELD[displayCurrency];
  if (!key) return mov.total ?? mov.monto ?? 0;

  const val = mov?.equivalencias?.[campo]?.[key];
  if (val != null && !isNaN(val)) return val;

  // Fallback: si no tiene equivalencia, devolver monto original
  return mov.total ?? mov.monto ?? 0;
}

/**
 * Extrae el mes en formato YYYY-MM de un movimiento
 */
export function getMes(mov) {
  const fecha = mov.fecha_factura || mov.fecha;
  if (!fecha) return 'sin-fecha';
  // Firestore Timestamp o Date string
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
  if (isNaN(d.getTime())) return 'sin-fecha';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Convierte fecha de movimiento a Date
 */
function toDate(mov) {
  const f = mov.fecha_factura || mov.fecha;
  if (!f) return null;
  if (f?.toDate) return f.toDate();
  if (f?.seconds) return new Date(f.seconds * 1000);
  const d = new Date(f);
  return isNaN(d.getTime()) ? null : d;
}

function parseFilterDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const date = new Date(y, mm - 1, dd);
    if (
      date.getFullYear() === y
      && date.getMonth() === mm - 1
      && date.getDate() === dd
    ) {
      return date;
    }
    return null;
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeFilterText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getMovimientoUserCandidates(m) {
  const values = [];

  const push = (v) => {
    if (v == null) return;
    if (typeof v === 'string') {
      values.push(v);
      return;
    }
    if (typeof v === 'object') {
      const composed = `${v.firstName || v.nombre || ''} ${v.lastName || v.apellido || ''}`.trim();
      if (composed) values.push(composed);
      if (v.name) values.push(v.name);
      if (v.nombre) values.push(v.nombre);
      if (v.usuario_nombre) values.push(v.usuario_nombre);
      if (v.usuario) values.push(v.usuario);
      if (v.userName) values.push(v.userName);
    }
  };

  push(m?.usuario_nombre);
  push(m?.usuario);
  push(m?.userName);
  push(m?.user_name);
  push(m?.user);
  push(m?.creador);

  return values.map((v) => String(v || '').trim()).filter(Boolean);
}

function getUserDisplayCandidates(user) {
  if (!user || typeof user !== 'object') return [];
  const values = [];
  const full = `${user.firstName || user.nombre || ''} ${user.lastName || user.apellido || ''}`.trim();
  if (full) values.push(full);
  if (user.nombre) values.push(user.nombre);
  if (user.name) values.push(user.name);
  if (user.usuario_nombre) values.push(user.usuario_nombre);
  if (user.usuario) values.push(user.usuario);
  return values.map((v) => String(v || '').trim()).filter(Boolean);
}

function getMovimientoUserIdCandidates(m) {
  const values = [
    m?.user_id,
    m?.userId,
    m?.usuario_id,
    m?.usuarioId,
    m?.creado_por_id,
    m?.creadoPorId,
    m?.created_by_id,
    m?.createdById,
    typeof m?.usuario === 'object' ? m.usuario?.id : null,
    typeof m?.user === 'object' ? m.user?.id : null,
    typeof m?.creador === 'object' ? m.creador?.id : null,
  ];
  return values.map((v) => String(v || '').trim()).filter(Boolean);
}

function buildCompanyUsersLookup(extraContext = {}) {
  const source = extraContext?.usuariosEmpresa || extraContext?.users || extraContext?.profiles || [];
  const users = Array.isArray(source) ? source : [];
  const byId = new Map();
  const byPhone = new Map();

  for (const u of users) {
    if (!u || typeof u !== 'object') continue;

    const uid = String(u.id || u._id || u.uid || u.user_id || '').trim();
    if (uid) byId.set(uid, u);

    const phoneValues = [u.phone, u.telefono, u.numero_telefono, u.whatsapp, u.user_phone];
    for (const phone of phoneValues) {
      const normalized = normalizePhone(phone);
      if (!normalized) continue;
      for (const candidate of getPhoneCandidates(normalized)) {
        if (!byPhone.has(candidate)) byPhone.set(candidate, u);
      }
    }
  }

  return { byId, byPhone };
}

function getMovimientoPhoneCandidates(m) {
  const fromUsuario = typeof m?.usuario === 'object' ? m.usuario : null;
  const fromUser = typeof m?.user === 'object' ? m.user : null;
  const fromCreador = typeof m?.creador === 'object' ? m.creador : null;

  const values = [
    m?.user_phone,
    m?.userPhone,
    m?.usuario_telefono,
    m?.usuarioTelefono,
    m?.numero_telefono,
    m?.numeroTelefono,
    m?.telefono,
    m?.phone,
    m?.whatsapp,
    m?.from,
    m?.creado_por_phone,
    m?.creadoPorPhone,
    m?.created_by_phone,
    m?.createdByPhone,
    fromUsuario?.telefono,
    fromUsuario?.phone,
    fromUsuario?.numero_telefono,
    fromUser?.telefono,
    fromUser?.phone,
    fromUser?.numero_telefono,
    fromCreador?.telefono,
    fromCreador?.phone,
    fromCreador?.numero_telefono,
  ];

  const set = new Set();
  for (const value of values) {
    const normalized = normalizePhone(value);
    if (!normalized) continue;
    for (const candidate of getPhoneCandidates(normalized)) {
      set.add(candidate);
    }
  }

  return [...set];
}

// ─── Filtrado ───

/**
 * Filtra movimientos según filtros runtime del usuario
 * @param {Array} movimientos
 * @param {Object} filters - { fecha_from, fecha_to, proyectos[], tipo, categorias[], proveedores[], etapas[], medio_pago[], moneda_movimiento[] }
 * @param {Object} extraContext - { usuariosEmpresa?: Array }
 * @returns {Array}
 */
export function filterMovimientos(movimientos, filters = {}, extraContext = {}) {
  let result = movimientos;

  // Fecha
  if (filters.fecha_from) {
    const from = parseFilterDate(filters.fecha_from);
    if (from) {
      from.setHours(0, 0, 0, 0);
      result = result.filter((m) => {
        const d = toDate(m);
        return d && d >= from;
      });
    }
  }
  if (filters.fecha_to) {
    const to = parseFilterDate(filters.fecha_to);
    if (to) {
      to.setHours(23, 59, 59, 999);
      result = result.filter((m) => {
        const d = toDate(m);
        return d && d <= to;
      });
    }
  }

  // Proyectos (multi-select)
  if (filters.proyectos?.length > 0) {
    const ids = new Set(filters.proyectos);
    result = result.filter((m) => ids.has(m.proyecto_id));
  }

  // Tipo (egreso/ingreso)
  if (filters.tipo) {
    result = result.filter((m) => m.type === filters.tipo);
  }

  // Categorías
  if (filters.categorias?.length > 0) {
    const set = new Set(filters.categorias.map((c) => c.toLowerCase()));
    result = result.filter((m) => m.categoria && set.has(m.categoria.toLowerCase()));
  }

  // Proveedores
  if (filters.proveedores?.length > 0) {
    const set = new Set(filters.proveedores.map((p) => p.toLowerCase()));
    result = result.filter(
      (m) => m.nombre_proveedor && set.has(m.nombre_proveedor.toLowerCase()),
    );
  }

  // Etapas
  if (filters.etapas?.length > 0) {
    const set = new Set(filters.etapas.map((e) => e.toLowerCase()));
    result = result.filter((m) => m.etapa && set.has(m.etapa.toLowerCase()));
  }

  // Medio de pago
  if (filters.medio_pago?.length > 0) {
    const set = new Set(filters.medio_pago.map((mp) => mp.toLowerCase()));
    result = result.filter((m) => m.medio_pago && set.has(m.medio_pago.toLowerCase()));
  }

  // Usuarios
  if (filters.usuarios?.length > 0) {
    const set = new Set(filters.usuarios.map((u) => normalizeFilterText(u)).filter(Boolean));
    const usersLookup = buildCompanyUsersLookup(extraContext);

    result = result.filter((m) => {
      const candidates = [...getMovimientoUserCandidates(m)];

      for (const uid of getMovimientoUserIdCandidates(m)) {
        const profile = usersLookup.byId.get(uid);
        if (profile) candidates.push(...getUserDisplayCandidates(profile));
      }

      for (const phone of getMovimientoPhoneCandidates(m)) {
        const profile = usersLookup.byPhone.get(phone);
        if (profile) candidates.push(...getUserDisplayCandidates(profile));
      }

      return candidates.some((candidate) => set.has(normalizeFilterText(candidate)));
    });
  }

  // Moneda original
  if (filters.moneda_movimiento?.length > 0) {
    const set = new Set(filters.moneda_movimiento.map((mon) => mon.toLowerCase()));
    result = result.filter(
      (m) => m.moneda && set.has(m.moneda.toLowerCase()),
    );
  }

  // Factura cliente (boolean)
  if (filters.factura_cliente === 'cliente') {
    result = result.filter((m) => m.factura_cliente === true);
  } else if (filters.factura_cliente === 'propia') {
    result = result.filter((m) => !m.factura_cliente);
  }

  return result;
}

/**
 * Aplica filtros extra de bloque a movimientos ya filtrados globalmente
 */
export function applyBlockFilters(movimientos, block) {
  let result = movimientos;

  if (block.filtro_tipo) {
    result = result.filter((m) => m.type === block.filtro_tipo);
  }

  const fe = block.filtros_extra;
  if (fe) {
    if (fe.categorias?.length > 0) {
      const set = new Set(fe.categorias.map((c) => c.toLowerCase()));
      result = result.filter((m) => m.categoria && set.has(m.categoria.toLowerCase()));
    }
    if (fe.proveedores?.length > 0) {
      const set = new Set(fe.proveedores.map((p) => p.toLowerCase()));
      result = result.filter(
        (m) => m.nombre_proveedor && set.has(m.nombre_proveedor.toLowerCase()),
      );
    }
    if (fe.etapas?.length > 0) {
      const set = new Set(fe.etapas.map((e) => e.toLowerCase()));
      result = result.filter((m) => m.etapa && set.has(m.etapa.toLowerCase()));
    }
  }

  // ─── Exclusiones: ocultar items específicos ───
  const ex = block.excluir;
  if (ex) {
    if (ex.categorias?.length > 0) {
      const set = new Set(ex.categorias.map((c) => c.toLowerCase()));
      result = result.filter((m) => !m.categoria || !set.has(m.categoria.toLowerCase()));
    }
    if (ex.proveedores?.length > 0) {
      const set = new Set(ex.proveedores.map((p) => p.toLowerCase()));
      result = result.filter((m) => !m.nombre_proveedor || !set.has(m.nombre_proveedor.toLowerCase()));
    }
    if (ex.etapas?.length > 0) {
      const set = new Set(ex.etapas.map((e) => e.toLowerCase()));
      result = result.filter((m) => !m.etapa || !set.has(m.etapa.toLowerCase()));
    }
    if (ex.usuarios?.length > 0) {
      const set = new Set(ex.usuarios.map((u) => normalizeFilterText(u)).filter(Boolean));
      result = result.filter((m) => {
        const candidates = getMovimientoUserCandidates(m);
        if (candidates.length === 0) return true;
        return !candidates.some((candidate) => set.has(normalizeFilterText(candidate)));
      });
    }
  }

  return result;
}

// ─── Operaciones de agregación ───

function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

function avg(values) {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

function min(values) {
  return values.length === 0 ? 0 : Math.min(...values);
}

function max(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}

const OPS = { sum, count: (v) => v.length, avg, min, max };

/**
 * Ejecuta una operación de agregación sobre una lista de valores
 */
export function aggregate(values, operacion) {
  const fn = OPS[operacion];
  if (!fn) return 0;
  return fn(values);
}

// ─── Agrupación ───

const GROUP_KEYS = {
  categoria: (m) => m.categoria || 'Sin categoría',
  proveedor: (m) => m.nombre_proveedor || 'Sin proveedor',
  etapa: (m) => m.etapa || 'Sin etapa',
  proyecto: (m) => m.proyecto || 'Sin proyecto',
  mes: (m) => getMes(m),
  moneda_original: (m) => m.moneda || 'ARS',
  medio_pago: (m) => m.medio_pago || 'Sin medio de pago',
  usuario: (m) => getMovimientoUserCandidates(m)[0] || 'Sin usuario',
};

/**
 * Agrupa movimientos por un campo
 * @returns {Map<string, Array>}
 */
export function groupBy(movimientos, campo) {
  const fn = GROUP_KEYS[campo];
  if (!fn) return new Map([['Todos', movimientos]]);

  const map = new Map();
  for (const m of movimientos) {
    const key = fn(m);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return map;
}

// ─── Procesadores de bloques ───

/**
 * Procesa un bloque metric_cards
 * @returns {Array<{ id, titulo, valor, formato, color }>}
 */
export function processMetricCards(block, movimientos, _presupuestos, currencies) {
  const metricas = block.metricas || [];

  return metricas.map((metrica) => {
    let data = movimientos;

    // Filtro de tipo del metric card individual
    if (metrica.filtro_tipo) {
      data = data.filter((m) => m.type === metrica.filtro_tipo);
    }

    // Filtros extra del metric card
    const fe = metrica.filtros_extra;
    if (fe) {
      if (fe.categorias?.length > 0) {
        const set = new Set(fe.categorias.map((c) => c.toLowerCase()));
        data = data.filter((m) => m.categoria && set.has(m.categoria.toLowerCase()));
      }
      if (fe.proveedores?.length > 0) {
        const set = new Set(fe.proveedores.map((p) => p.toLowerCase()));
        data = data.filter(
          (m) => m.nombre_proveedor && set.has(m.nombre_proveedor.toLowerCase()),
        );
      }
      if (fe.etapas?.length > 0) {
        const set = new Set(fe.etapas.map((e) => e.toLowerCase()));
        data = data.filter((m) => m.etapa && set.has(m.etapa.toLowerCase()));
      }
    }

    // Extraer valores — calcular para cada moneda seleccionada
    const campo = metrica.campo || 'total';
    const valores = {};
    for (const cur of currencies) {
      const vals = data.map((m) => getAmount(m, cur, campo));
      valores[cur] = aggregate(vals, metrica.operacion);
    }

    return {
      id: metrica.id,
      titulo: metrica.titulo,
      valor: valores[currencies[0]],
      valores,
      formato: metrica.formato || 'currency',
      color: metrica.color || 'default',
      _movimientos: data,
    };
  });
}

/**
 * Procesa un bloque summary_table
 * @returns {{ headers, rows, totals }}
 */
export function processSummaryTable(block, movimientos, _presupuestos, currencies) {
  const data = applyBlockFilters(movimientos, block);
  const grouped = groupBy(data, block.agrupar_por);
  const columnas = block.columnas || [{ id: 'total', titulo: 'Total', operacion: 'sum', campo: 'total', formato: 'currency' }];
  const primaryCurrency = currencies[0];
  const isMulti = currencies.length > 1;

  // Expandir columnas: si multi-moneda y formato currency, replicar por moneda
  const expandedCols = [];
  for (const col of columnas) {
    if (isMulti && (col.formato === 'currency' || !col.formato)) {
      for (const cur of currencies) {
        expandedCols.push({ ...col, currency: cur, _id: `${col.id}__${cur}` });
      }
    } else {
      expandedCols.push({ ...col, currency: primaryCurrency, _id: col.id });
    }
  }

  // Headers
  const headers = [
    { id: 'grupo', titulo: block.agrupar_por ? capitalizar(block.agrupar_por) : 'Grupo' },
    ...expandedCols.map((ec) => {
      const defaultFmt = ec.operacion === 'count' ? 'number' : 'currency';
      return {
        id: ec._id,
        titulo: isMulti && (ec.formato === 'currency' || !ec.formato) ? `${ec.titulo} (${ec.currency})` : ec.titulo,
        formato: ec.formato || defaultFmt,
        currency: ec.currency,
      };
    }),
    ...(block.mostrar_porcentaje ? [{ id: '_porcentaje', titulo: '%', formato: 'percentage' }] : []),
  ];

  // Total general para calcular porcentaje (usa moneda primaria)
  let totalGeneral = 0;
  if (block.mostrar_porcentaje) {
    const allValues = data.map((m) => getAmount(m, primaryCurrency, columnas[0]?.campo || 'total'));
    totalGeneral = sum(allValues.map(Math.abs));
  }

  // Rows
  let rows = [];
  for (const [grupo, items] of grouped) {
    const row = { grupo, _count: items.length, _movimientos: items };
    for (const ec of expandedCols) {
      const values = items.map((m) => getAmount(m, ec.currency, ec.campo || 'total'));
      row[ec._id] = aggregate(values, ec.operacion);
    }
    if (block.mostrar_porcentaje && totalGeneral > 0) {
      const firstEc = expandedCols[0];
      row._porcentaje = Math.abs(row[firstEc._id] || 0) / totalGeneral;
    }
    rows.push(row);
  }

  // Orden
  if (block.orden?.campo) {
    const dir = block.orden.direccion === 'asc' ? 1 : -1;
    const campo = block.orden.campo;
    // Si la columna fue expandida, usar la versión de moneda primaria
    const orderKey = isMulti && rows[0] && !(campo in rows[0]) ? `${campo}__${primaryCurrency}` : campo;
    rows.sort((a, b) => {
      const va = typeof a[orderKey] === 'number' ? a[orderKey] : 0;
      const vb = typeof b[orderKey] === 'number' ? b[orderKey] : 0;
      return (va - vb) * dir;
    });
  } else {
    const firstId = expandedCols[0]?._id;
    if (firstId) {
      rows.sort((a, b) => Math.abs(b[firstId] || 0) - Math.abs(a[firstId] || 0));
    }
  }

  // Top N
  if (block.top_n && block.top_n > 0) {
    rows = rows.slice(0, block.top_n);
  }

  // Totals
  const totals = { grupo: 'TOTAL' };
  if (block.mostrar_total !== false) {
    for (const ec of expandedCols) {
      totals[ec._id] = rows.reduce((acc, r) => acc + (r[ec._id] || 0), 0);
    }
    if (block.mostrar_porcentaje) {
      totals._porcentaje = 1;
    }
  }

  return { headers, rows, totals: block.mostrar_total !== false ? totals : null };
}

/**
 * Procesa un bloque movements_table
 * @returns {{ columnas, rows }}
 */
export function processMovementsTable(block, movimientos, _presupuestos, currencies) {
  const data = applyBlockFilters(movimientos, block);
  const primaryCurrency = currencies[0];
  const isMulti = currencies.length > 1;

  const defaultCols = [
    'fecha_factura', 'tipo', 'categoria', 'proveedor_nombre',
    'proyecto_nombre', 'monto_display', 'moneda', 'medioPago', 'notas',
  ];
  let columnasVisibles = block.columnas_visibles?.length > 0
    ? [...block.columnas_visibles]
    : [...defaultCols];

  // Si multi-moneda, expandir columna monto_display a una por moneda
  if (isMulti) {
    const expandableKeys = ['monto_display', 'subtotal_display', 'ingreso_display', 'egreso_display'];
    for (const ek of expandableKeys) {
      const idx = columnasVisibles.indexOf(ek);
      if (idx !== -1) {
        columnasVisibles.splice(idx, 1, ...currencies.map((c) => `${ek}__${c}`));
      }
    }
  }

  // Enriquecer cada movimiento
  const rows = data.map((m) => {
    const row = {
      ...m,
      monto_display: getAmount(m, primaryCurrency, 'total'),
      subtotal_display: getAmount(m, primaryCurrency, 'subtotal'),
      ingreso_display: m.type === 'ingreso' ? getAmount(m, primaryCurrency, 'total') : null,
      egreso_display: m.type === 'egreso' ? getAmount(m, primaryCurrency, 'total') : null,
      _fecha: toDate(m),
    };
    if (isMulti) {
      for (const cur of currencies) {
        row[`monto_display__${cur}`] = getAmount(m, cur, 'total');
        row[`subtotal_display__${cur}`] = getAmount(m, cur, 'subtotal');
        row[`ingreso_display__${cur}`] = m.type === 'ingreso' ? getAmount(m, cur, 'total') : null;
        row[`egreso_display__${cur}`] = m.type === 'egreso' ? getAmount(m, cur, 'total') : null;
      }
    }
    return row;
  });

  // Ordenar por fecha desc
  rows.sort((a, b) => (b._fecha?.getTime() || 0) - (a._fecha?.getTime() || 0));

  // Paginar
  const pageSize = block.page_size || 25;

  return {
    columnas: columnasVisibles,
    rows,
    pageSize,
    totalRows: rows.length,
    currencies,
  };
}

/**
 * Procesa un bloque budget_vs_actual
 * Cruza presupuestos de control con movimientos reales agrupados por categoría
 * @returns {{ headers, rows }}
 */
export function processBudgetVsActual(block, movimientos, presupuestos, currencies, cotizaciones) {
  const displayCurrency = currencies[0];
  const data = applyBlockFilters(movimientos, block);
  const agruparPor = block.agrupar_por || 'categoria';

  // Filtrar presupuestos por tipo si corresponde
  let presFiltered = presupuestos || [];
  if (block.mostrar_tipo && block.mostrar_tipo !== 'ambos') {
    presFiltered = presFiltered.filter((p) => p.tipo === block.mostrar_tipo);
  }
  // Filtrar presupuestos que tengan el campo seleccionado cargado
  if (block.presupuestos_con_campo) {
    const campoReq = block.presupuestos_con_campo; // 'categoria' | 'etapa' | 'proveedor'
    presFiltered = presFiltered.filter((p) => {
      if (campoReq === 'categoria') return !!(p.categoria || p.rubro);
      if (campoReq === 'etapa') return !!p.etapa;
      if (campoReq === 'proveedor') return !!(p.proveedor || p.nombre_proveedor);
      return true;
    });
  }

  // Excluir presupuestos específicos
  if (block.excluir?.presupuestos?.length > 0) {
    const exSet = new Set(block.excluir.presupuestos.map((n) => n.toLowerCase()));
    presFiltered = presFiltered.filter((p) => {
      const nombre = (p.nombre || p.categoria || p.rubro || '').toLowerCase();
      return !exSet.has(nombre);
    });
  }

  // Función para obtener clave de agrupación de un presupuesto
  const getPresKey = (p) => {
    switch (agruparPor) {
      case 'etapa': return (p.etapa || 'Sin etapa').toLowerCase();
      case 'proveedor': return (p.proveedor || p.nombre_proveedor || 'Sin proveedor').toLowerCase();
      case 'categoria':
      default: return (p.categoria || p.rubro || 'Sin categoría').toLowerCase();
    }
  };
  const getPresNombre = (p) => {
    switch (agruparPor) {
      case 'etapa': return p.etapa || 'Sin etapa';
      case 'proveedor': return p.proveedor || p.nombre_proveedor || 'Sin proveedor';
      case 'categoria':
      default: return p.categoria || p.rubro || 'Sin categoría';
    }
  };

  // Mapear presupuestos por campo de agrupación
  const presMap = new Map();
  for (const p of presFiltered) {
    const key = getPresKey(p);
    if (!presMap.has(key)) {
      presMap.set(key, {
        nombre: getPresNombre(p),
        presupuestado: 0,
      });
    }
    const entry = presMap.get(key);
    // Sumar monto presupuestado (convertido a display currency usando cotizaciones live)
    entry.presupuestado += getPresupuestoAmount(p, displayCurrency, cotizaciones);
  }

  // Agrupar movimientos por el campo seleccionado
  const movGrouped = groupBy(data, agruparPor);

  // Combinar
  const allKeys = new Set([...presMap.keys()]);
  for (const [key] of movGrouped) {
    allKeys.add(key.toLowerCase());
  }

  const rows = [];
  for (const key of allKeys) {
    const presData = presMap.get(key) || { nombre: key, presupuestado: 0 };

    const movs = movGrouped.get(
      [...movGrouped.keys()].find((k) => k.toLowerCase() === key),
    ) || [];

    const ejecutado = sum(movs.map((m) => Math.abs(getAmount(m, displayCurrency, 'total'))));
    const presupuestado = presData.presupuestado;
    const disponible = presupuestado - ejecutado;
    const porcentaje = presupuestado > 0 ? ejecutado / presupuestado : 0;
    const sobreejecucion = block.alerta_sobreejecucion && porcentaje > 1;

    rows.push({
      categoria: presData.nombre || capitalizar(key),
      presupuestado,
      ejecutado,
      disponible,
      porcentaje,
      sobreejecucion,
      _movimientos: movs,
    });
  }

  // Ordenar por presupuestado desc
  rows.sort((a, b) => b.presupuestado - a.presupuestado);

  const columnasConfig = block.columnas_budget || [
    'presupuestado', 'ejecutado', 'disponible', 'porcentaje', 'barra',
  ];

  return {
    columnas: columnasConfig,
    rows,
    totals: {
      categoria: 'TOTAL',
      presupuestado: sum(rows.map((r) => r.presupuestado)),
      ejecutado: sum(rows.map((r) => r.ejecutado)),
      disponible: sum(rows.map((r) => r.disponible)),
      porcentaje:
        sum(rows.map((r) => r.presupuestado)) > 0
          ? sum(rows.map((r) => r.ejecutado)) / sum(rows.map((r) => r.presupuestado))
          : 0,
    },
  };
}

/**
 * Procesa un bloque category_budget_matrix
 * Matriz por categoría con columnas de proyectos y filas:
 * - Presupuesto inicial
 * - Adicionales (una fila por concepto)
 * - Total presupuesto
 * - Recibido/Ejecutado
 * - Saldo
 */
export function processCategoryBudgetMatrix(block, movimientos, presupuestos, currencies, cotizaciones) {
  const displayCurrency = currencies[0];
  const list = Array.isArray(presupuestos) ? presupuestos : [];
  const movs = Array.isArray(movimientos) ? movimientos : [];

  // Mapa proyecto_id -> nombre para fallback en reportes públicos
  const projectNameById = new Map();
  for (const m of movs) {
    const pid = m?.proyecto_id != null ? String(m.proyecto_id) : null;
    if (!pid) continue;
    const pname = m?.proyecto || m?.proyecto_nombre || m?.nombre_proyecto || null;
    if (pname && !projectNameById.has(pid)) {
      projectNameById.set(pid, String(pname));
    }
  }

  const categoriaTarget = normalizeText(block.categoria_objetivo || '');
  const tipoTarget = block.tipo_presupuesto || 'egreso';
  const asumirMontoIncluyeAdicionales = block.asumir_monto_incluye_adicionales !== false;

  const projectsMap = new Map();
  const additionalRows = new Map();
  const projectAccum = new Map();
  const projectTiposCreacion = new Map(); // Guardar tipos de creación por proyecto

  for (const p of list) {
    // Filtrar por tipo de presupuesto
    if (tipoTarget !== 'ambos' && (p.tipo || 'egreso') !== tipoTarget) {
      continue;
    }

    // Filtrar por categoría específica (si fue indicada)
    if (categoriaTarget) {
      const categoriaPres = normalizeText(p.categoria || p.rubro || '');
      if (categoriaPres !== categoriaTarget) {
        continue;
      }
    }

    const { id: proyectoId, nombre: proyectoNombre } = getPresupuestoProjectInfo(p, projectNameById);
    if (!projectsMap.has(proyectoId)) {
      projectsMap.set(proyectoId, { id: proyectoId, nombre: proyectoNombre });
      projectTiposCreacion.set(proyectoId, []);
    }

    // Agregar tipo_creacion (persistido o inferido para presupuestos legacy)
    const tipoCreacion = p.tipo_creacion || inferTipoCreacionFromPresupuesto(p);
    if (tipoCreacion) {
      const tiposExistentes = projectTiposCreacion.get(proyectoId);
      if (!tiposExistentes.includes(tipoCreacion)) {
        tiposExistentes.push(tipoCreacion);
      }
    }

    const acc = projectAccum.get(proyectoId) || {
      inicial: 0,
      totalPresupuesto: 0,
      recibido: 0,
      saldo: 0,
    };

    const adicionales = Array.isArray(p.adicionales) ? p.adicionales : [];
    let totalAdicionales = 0;

    for (const adic of adicionales) {
      const montoAdicBase = Number(adic?.monto ?? adic?.valor ?? 0);
      if (!Number.isFinite(montoAdicBase)) continue;

      const montoAdic = convertPresupuestoValue(p, montoAdicBase, displayCurrency, cotizaciones);
      totalAdicionales += montoAdic;

      const label = (adic?.concepto || adic?.motivo || 'Adicional').trim() || 'Adicional';
      const adicKey = normalizeText(label);

      const row = additionalRows.get(adicKey) || {
        key: `adic_${adicKey}`,
        label,
        type: 'additional',
        values: {},
      };

      row.values[proyectoId] = (row.values[proyectoId] || 0) + montoAdic;
      additionalRows.set(adicKey, row);
    }

    const montoTotal = getPresupuestoAmount(p, displayCurrency, cotizaciones);
    const montoInicial = asumirMontoIncluyeAdicionales ? montoTotal - totalAdicionales : montoTotal;
    const recibido = convertPresupuestoValue(p, Number(p.ejecutado || 0), displayCurrency, cotizaciones);
    const totalPresupuesto = montoInicial + totalAdicionales;
    const saldo = totalPresupuesto - recibido;

    acc.inicial += montoInicial;
    acc.totalPresupuesto += totalPresupuesto;
    acc.recibido += recibido;
    acc.saldo += saldo;

    projectAccum.set(proyectoId, acc);
  }

  // Filtrar proyectos según proyectos_seleccionados si está configurado
  let projectColumns = [...projectsMap.values()];
  const proyectosSeleccionados = block.proyectos_seleccionados || [];
  
  if (Array.isArray(proyectosSeleccionados) && proyectosSeleccionados.length > 0) {
    // Normalizar los seleccionados: pueden ser IDs o nombres
    const selectedSet = new Set(
      proyectosSeleccionados.map((psel) => normalizeText(psel))
    );
    
    // Filtrar columnas comparando IDs de forma flexible
    projectColumns = projectColumns.filter((col) => (
      selectedSet.has(normalizeText(col.id)) || selectedSet.has(normalizeText(col.nombre))
    ));
  }

  // Agregar información de tipos de creación a cada proyecto
  projectColumns = projectColumns.map(col => ({
    ...col,
    tiposCreacion: projectTiposCreacion.get(col.id) || [],
  }));

  const initialRow = {
    key: 'presupuesto_inicial',
    label: block.label_presupuesto_inicial || 'Presupuesto inicial',
    type: 'initial',
    values: {},
  };
  const totalRow = {
    key: 'total_presupuesto',
    label: block.label_total_presupuesto || 'Total presupuesto',
    type: 'summary',
    values: {},
  };
  const recibidoRow = {
    key: 'recibido',
    label: block.label_recibido || 'Recibido',
    type: 'summary',
    values: {},
  };
  const saldoRow = {
    key: 'saldo',
    label: block.label_saldo || 'Saldo',
    type: 'summary',
    values: {},
  };

  for (const col of projectColumns) {
    const acc = projectAccum.get(col.id) || { inicial: 0, totalPresupuesto: 0, recibido: 0, saldo: 0 };
    initialRow.values[col.id] = acc.inicial;
    totalRow.values[col.id] = acc.totalPresupuesto;
    recibidoRow.values[col.id] = acc.recibido;
    saldoRow.values[col.id] = acc.saldo;
  }

  const rows = [
    initialRow,
    ...[...additionalRows.values()],
    totalRow,
    recibidoRow,
    saldoRow,
  ];

  const movimientosRecibidoByProject = {};
  for (const col of projectColumns) {
    movimientosRecibidoByProject[col.id] = [];
  }

  if (movs.length > 0 && projectColumns.length > 0) {
    for (const m of movs) {
      if (tipoTarget !== 'ambos' && m.type !== tipoTarget) continue;

      if (categoriaTarget) {
        const categoriaMov = normalizeText(m.categoria || m.rubro || '');
        if (categoriaMov !== categoriaTarget) continue;
      }

      const movProjectId = m.proyecto_id != null ? String(m.proyecto_id) : null;
      let targetProjectId = null;

      if (movProjectId && movimientosRecibidoByProject[movProjectId]) {
        targetProjectId = movProjectId;
      } else {
        const movProjectName = normalizeText(m.proyecto || m.proyecto_nombre || m.nombre_proyecto || '');
        if (movProjectName) {
          const byName = projectColumns.find((p) => normalizeText(p.nombre) === movProjectName);
          if (byName) targetProjectId = byName.id;
        }
      }

      if (targetProjectId) {
        movimientosRecibidoByProject[targetProjectId].push(m);
      }
    }
  }

  recibidoRow._movimientos_by_project = movimientosRecibidoByProject;

  return {
    categoria: block.categoria_objetivo || 'Todas',
    rowHeaderTitle: block.columna_concepto_titulo || 'Concepto',
    projectColumns,
    rows,
  };
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function inferTipoCreacionFromPresupuesto(presupuesto) {
  const moneda = String(presupuesto?.moneda || '').toUpperCase();
  const indexacion = String(presupuesto?.indexacion || '').toUpperCase();

  if (moneda === 'USD') return 'USD';
  if (moneda === 'CAC') return 'CAC';
  if (indexacion === 'USD') return 'Ajustado por dólar';
  if (indexacion === 'CAC') return 'Ajustado por CAC';
  if (moneda === 'ARS' || !moneda) return 'Pesos fijos';

  return null;
}

function getPresupuestoProjectInfo(presupuesto, projectNameById = new Map()) {
  const proyectoObj = (typeof presupuesto.proyecto === 'object' && presupuesto.proyecto)
    ? presupuesto.proyecto
    : null;
  const rawId =
    presupuesto.proyecto_id ||
    proyectoObj?.id ||
    proyectoObj?._id ||
    (typeof presupuesto.proyecto === 'string' ? presupuesto.proyecto : null) ||
    presupuesto.proyecto_nombre ||
    'sin-proyecto';
  const id = String(rawId);
  const nombre =
    presupuesto.proyecto_nombre ||
    presupuesto.nombre_proyecto ||
    (typeof presupuesto.proyecto === 'object' ? (presupuesto.proyecto?.nombre || presupuesto.proyecto?.label) : null) ||
    (typeof presupuesto.proyecto === 'string' ? presupuesto.proyecto : null) ||
    projectNameById.get(id) ||
    presupuesto.proyecto_nombre ||
    (presupuesto.proyecto_id ? String(presupuesto.proyecto_id) : 'Sin proyecto');

  return { id, nombre };
}

function convertPresupuestoValue(pres, value, displayCurrency, cotizaciones) {
  const fakePres = {
    ...pres,
    monto_presupuestado: value,
    monto: value,
  };
  return getPresupuestoAmount(fakePres, displayCurrency, cotizaciones);
}

/**
 * Obtiene el monto de un presupuesto en la moneda de visualización.
 *
 * Los presupuestos de control NO tienen equivalencias como los movimientos.
 * Almacenan:
 *  - monto_presupuestado  → valor en moneda_almacenamiento
 *  - moneda_almacenamiento → 'ARS' | 'USD' | 'CAC'
 *  - moneda_usuario        → moneda que eligió el usuario (informativa)
 *  - cotizacion_snapshot   → { dolar_blue, cac, ... } al momento de crear
 *
 * Si display coincide con almacenamiento → valor directo.
 * Si no → convierte usando cotizaciones live (MonedasService) o cotizacion_snapshot.
 */
function getPresupuestoAmount(pres, displayCurrency, cotizaciones) {
  const amount = pres.monto_presupuestado ?? pres.monto ?? 0;

  if (displayCurrency === 'original') return amount;

  const storage = (pres.moneda_almacenamiento || pres.moneda || 'ARS').toUpperCase();

  // Coincide → retornar directo
  if (storage === displayCurrency) return amount;

  // Usar cotizaciones live (del MonedasService) primero, fallback a snapshot del presupuesto
  const snap = pres.cotizacion_snapshot;
  const dolar = cotizaciones?.dolar_blue || snap?.dolar_blue || snap?.dolar || 0;
  const cac = cotizaciones?.cac || snap?.cac || 0;

  if (storage === 'ARS') {
    if (displayCurrency === 'USD' && dolar > 0) return amount / dolar;
    if (displayCurrency === 'CAC' && cac > 0) return amount / cac;
  }
  if (storage === 'USD') {
    if (displayCurrency === 'ARS' && dolar > 0) return amount * dolar;
    if (displayCurrency === 'CAC' && dolar > 0 && cac > 0) return (amount * dolar) / cac;
  }
  if (storage === 'CAC') {
    if (displayCurrency === 'ARS' && cac > 0) return amount * cac;
    if (displayCurrency === 'USD' && cac > 0 && dolar > 0) return (amount * cac) / dolar;
  }

  // Sin cotizaciones → devolver monto crudo (mejor que 0)
  return amount;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizePhone(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const withoutWhatsapp = raw.replace(/@s\.whatsapp\.net$/i, '');
  const digits = withoutWhatsapp.replace(/\D/g, '');
  return digits || withoutWhatsapp;
}

function getPhoneCandidates(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return [];

  const candidates = new Set([normalized]);

  // Normalizar variantes comunes AR (con/sin 9 despues de codigo pais 54).
  if (normalized.length >= 12 && normalized.startsWith('549')) {
    candidates.add(`54${normalized.slice(3)}`);
  }
  if (normalized.length >= 11 && normalized.startsWith('54') && normalized[2] !== '9') {
    candidates.add(`549${normalized.slice(2)}`);
  }

  return [...candidates];
}

function buildSociosLookup(extraContext = {}) {
  const source = extraContext?.usuariosEmpresa || extraContext?.users || extraContext?.profiles || [];
  const users = Array.isArray(source) ? source : [];

  const byPhone = new Map();
  const byId = new Map();

  for (const u of users) {
    if (!u || typeof u !== 'object') continue;

    const userId = String(u.id || u._id || u.uid || u.user_id || '').trim();
    if (userId) byId.set(userId, u);

    const phoneValues = [u.phone, u.telefono, u.user_phone, u.numero_telefono, u.whatsapp];
    for (const phoneValue of phoneValues) {
      for (const candidate of getPhoneCandidates(phoneValue)) {
        if (!byPhone.has(candidate)) byPhone.set(candidate, u);
      }
    }
  }

  return { byPhone, byId };
}

function getUserDisplayName(user) {
  if (!user || typeof user !== 'object') return '';

  const first = String(user.firstName || user.nombre || '').trim();
  const last = String(user.lastName || user.apellido || '').trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const fallback = [user.name, user.usuario_nombre, user.usuario, user.email]
    .map((v) => String(v || '').trim())
    .find(Boolean);
  return fallback || '';
}

function resolveSocioPhone(m) {
  const fromUsuario = typeof m?.usuario === 'object' ? m.usuario : null;
  const fromUser = typeof m?.user === 'object' ? m.user : null;
  const fromCreador = typeof m?.creador === 'object' ? m.creador : null;
  const candidates = [
    m?.user_phone,
    m?.userPhone,
    m?.user_phone_number,
    m?.userPhoneNumber,
    m?.usuario_phone,
    m?.usuarioPhone,
    m?.usuario_telefono,
    m?.usuarioTelefono,
    m?.numero_telefono,
    m?.numeroTelefono,
    m?.telefono,
    m?.celular,
    m?.movil,
    m?.phone,
    m?.whatsapp,
    m?.from,
    m?.creado_por_phone,
    m?.creadoPorPhone,
    m?.created_by_phone,
    m?.createdByPhone,
    m?.author_phone,
    m?.authorPhone,
    fromUsuario?.telefono,
    fromUsuario?.phone,
    fromUsuario?.numero_telefono,
    fromUser?.telefono,
    fromUser?.phone,
    fromUser?.numero_telefono,
    fromCreador?.telefono,
    fromCreador?.phone,
    fromCreador?.numero_telefono,
  ];

  for (const c of candidates) {
    const normalized = normalizePhone(c);
    if (normalized) return normalized;
  }

  return null;
}

function resolveSocioNombre(m, phone) {
  const fromUsuario = typeof m?.usuario === 'object' ? m.usuario : null;
  const fromUser = typeof m?.user === 'object' ? m.user : null;
  const fromCreador = typeof m?.creador === 'object' ? m.creador : null;
  const candidates = [
    m?.usuario_nombre,
    m?.usuarioName,
    typeof m?.usuario === 'string' ? m.usuario : null,
    m?.nombre_usuario,
    m?.user_name,
    m?.userName,
    m?.creado_por_nombre,
    m?.creadoPorNombre,
    fromUsuario?.nombre,
    fromUsuario?.name,
    fromUser?.nombre,
    fromUser?.name,
    fromCreador?.nombre,
    fromCreador?.name,
  ];

  for (const c of candidates) {
    const text = String(c || '').trim();
    if (text) return text;
  }

  return phone ? `Socio ${phone}` : 'Socio sin telefono';
}

function buildDebtTransfers(socios) {
  const epsilon = 0.01;
  const acreedores = socios
    .filter((s) => s.diferencia > epsilon)
    .map((s) => ({ ...s, restante: round2(s.diferencia) }))
    .sort((a, b) => b.restante - a.restante);
  const deudores = socios
    .filter((s) => s.diferencia < -epsilon)
    .map((s) => ({ ...s, restante: round2(-s.diferencia) }))
    .sort((a, b) => b.restante - a.restante);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const deudor = deudores[i];
    const acreedor = acreedores[j];
    const monto = round2(Math.min(deudor.restante, acreedor.restante));

    if (monto > epsilon) {
      transfers.push({
        fromPhone: deudor.telefono,
        fromName: deudor.socio,
        toPhone: acreedor.telefono,
        toName: acreedor.socio,
        amount: monto,
      });
    }

    deudor.restante = round2(deudor.restante - monto);
    acreedor.restante = round2(acreedor.restante - monto);

    if (deudor.restante <= epsilon) i += 1;
    if (acreedor.restante <= epsilon) j += 1;
  }

  return transfers;
}

// ─── Procesador principal ───

/**
 * Procesa un bloque grouped_detail — agrupa movimientos y prepara datos para
 * chips/mini-cards de selección + tabla filtrada por grupo.
 * @returns {{ groups, columnas, pageSize, currencies, chipsStyle }}
 */
export function processGroupedDetail(block, movimientos, _presupuestos, currencies) {
  const data = applyBlockFilters(movimientos, block);
  const primaryCurrency = currencies[0];
  const isMulti = currencies.length > 1;
  const agruparPor = block.agrupar_por || 'etapa';

  // Agrupar
  const grouped = groupBy(data, agruparPor);

  // Construir info de cada grupo con totales
  const groups = [];
  for (const [key, items] of grouped) {
    const total = items.reduce((acc, m) => acc + getAmount(m, primaryCurrency, 'total'), 0);
    groups.push({
      key,
      label: key,
      count: items.length,
      total,
      movimientos: items,
    });
  }

  // Ordenar por total absoluto desc
  groups.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  // Columnas visibles
  const defaultCols = [
    'fecha_factura', 'categoria', 'proveedor_nombre',
    'monto_display', 'moneda', 'notas',
  ];
  let columnasVisibles = block.columnas_visibles?.length > 0
    ? [...block.columnas_visibles]
    : [...defaultCols];

  // Si multi-moneda, expandir columnas monetarias
  if (isMulti) {
    const expandableKeys = ['monto_display', 'subtotal_display', 'ingreso_display', 'egreso_display'];
    for (const ek of expandableKeys) {
      const idx = columnasVisibles.indexOf(ek);
      if (idx !== -1) {
        columnasVisibles.splice(idx, 1, ...currencies.map((c) => `${ek}__${c}`));
      }
    }
  }

  return {
    groups,
    columnas: columnasVisibles,
    pageSize: block.page_size || 25,
    currencies,
    chipsStyle: block.chips_style || 'metric',
  };
}

/**
 * Procesa un bloque balance_between_partners
 * Balancea aportes entre socios usando movimientos de ingreso y egreso,
 * agrupados por numero de telefono.
 */
export function processBalanceBetweenPartners(block, movimientos, _presupuestos, currencies, _cotizaciones, extraContext = {}) {
  const displayCurrency = currencies?.[0] || 'ARS';

  let data = applyBlockFilters(movimientos, block);

  const selectedPhones = Array.isArray(block.socios_telefonos) ? block.socios_telefonos : [];
  const selectedPhonesCount = selectedPhones.filter(Boolean).length;
  if (selectedPhones.length > 0) {
    const selectedSet = new Set(selectedPhones.map((p) => normalizePhone(p)).filter(Boolean));
    data = data.filter((m) => selectedSet.has(resolveSocioPhone(m)));
  }

  const sociosMap = new Map();
  const sociosLookup = buildSociosLookup(extraContext);

  const resolveProfileByMovement = (m, phoneNormalized) => {
    for (const candidate of getPhoneCandidates(phoneNormalized)) {
      const byPhone = sociosLookup.byPhone.get(candidate);
      if (byPhone) return byPhone;
    }

    const idCandidates = [
      m?.user_id,
      m?.userId,
      m?.usuario_id,
      m?.usuarioId,
      m?.creado_por_id,
      m?.creadoPorId,
      m?.created_by_id,
      m?.createdById,
      typeof m?.usuario === 'object' ? m.usuario?.id : null,
      typeof m?.user === 'object' ? m.user?.id : null,
      typeof m?.creador === 'object' ? m.creador?.id : null,
    ];

    for (const idCandidate of idCandidates) {
      const uid = String(idCandidate || '').trim();
      if (!uid) continue;
      const byId = sociosLookup.byId.get(uid);
      if (byId) return byId;
    }

    return null;
  };

  for (const m of data) {
    let telefonoResolved = resolveSocioPhone(m);
    const profile = resolveProfileByMovement(m, telefonoResolved);

    if (!telefonoResolved && profile) {
      telefonoResolved = normalizePhone(profile.phone || profile.telefono || profile.numero_telefono);
    }

    const telefono = telefonoResolved || 'sin-telefono';
    const socioDefault = telefono === 'sin-telefono' ? 'Socio sin telefono' : `Socio ${telefono}`;
    const profileName = getUserDisplayName(profile);
    const socioMov = resolveSocioNombre(m, telefono === 'sin-telefono' ? null : telefono);
    const socio = profileName || socioMov || socioDefault;
    const amount = getAmount(m, displayCurrency, 'total');
    const signedAmount = m?.type === 'ingreso' ? Math.abs(amount) : -Math.abs(amount);

    const current = sociosMap.get(telefono) || {
      telefono,
      socio: socioDefault,
      saldo: 0,
      movimientos: [],
    };

    current.saldo += signedAmount;
    current.movimientos.push(m);
    if (current.socio === socioDefault && socio) {
      current.socio = socio;
    }

    sociosMap.set(telefono, current);
  }

  const sociosBase = [...sociosMap.values()].map((s) => ({
    ...s,
    saldo: round2(s.saldo),
  }));

  const sociosCount = sociosBase.length;
  const saldoNetoTotal = round2(sociosBase.reduce((acc, s) => acc + s.saldo, 0));
  const aporteIdeal = sociosCount > 0 ? round2(saldoNetoTotal / sociosCount) : 0;

  const socios = sociosBase
    .map((s) => {
      const diferencia = round2(s.saldo - aporteIdeal);
      return {
        socio: s.socio,
        telefono: s.telefono,
        saldo: s.saldo,
        aporteIdeal,
        diferencia,
        estado:
          Math.abs(diferencia) <= 0.01
            ? 'Balanceado'
            : diferencia > 0
              ? 'Puso de mas'
              : 'Debe aportar',
        movimientosCount: s.movimientos.length,
        _movimientos: s.movimientos,
      };
    })
    .sort((a, b) => b.saldo - a.saldo);

  const transfers = buildDebtTransfers(socios);
  const isBalanced = transfers.length === 0;

  return {
    socios,
    saldoNetoTotal,
    sociosCount,
    aporteIdeal,
    transfers,
    isBalanced,
    showSummaryCards: block.show_summary_cards !== false,
    selectedPhonesCount,
  };
}

/**
 * Procesa un bloque chart — reutiliza processSummaryTable para obtener datos
 * y los formatea para renderizar en gráficos (bar, pie, line, doughnut)
 */
export function processChart(block, movimientos, presupuestos, currencies, cotizaciones) {
  const tableData = processSummaryTable(block, movimientos, presupuestos, currencies);
  return {
    chartType: block.chart_type || 'bar',
    chartOptions: block.chart_options || {},
    ...tableData,
  };
}

const BLOCK_PROCESSORS = {
  metric_cards: processMetricCards,
  summary_table: processSummaryTable,
  movements_table: processMovementsTable,
  budget_vs_actual: processBudgetVsActual,
  category_budget_matrix: processCategoryBudgetMatrix,
  chart: processChart,
  grouped_detail: processGroupedDetail,
  balance_between_partners: processBalanceBetweenPartners,
};

/**
 * Ejecuta todos los bloques de un reporte contra datos ya filtrados
 *
 * @param {Object} reportConfig  - Configuración del reporte (de MongoDB)
 * @param {Array}  movimientos   - Movimientos de Firestore, ya filtrados por filtros globales
 * @param {Array}  presupuestos  - Presupuestos de control (si datasets.presupuestos=true)
 * @returns {Array<{ type, titulo, data }>}
 */
export function executeReport(reportConfig, movimientos, presupuestos = [], displayCurrencies, cotizaciones, extraContext = {}) {
  const currencies = displayCurrencies && displayCurrencies.length > 0
    ? displayCurrencies
    : [reportConfig.display_currency || 'ARS'];
  const layout = reportConfig.layout || [];

  return layout.map((block) => {
    const processor = BLOCK_PROCESSORS[block.type];
    if (!processor) {
      return { type: block.type, titulo: block.titulo, data: null, error: `Tipo desconocido: ${block.type}` };
    }

    try {
      const data = processor(block, movimientos, presupuestos, currencies, cotizaciones, extraContext);
      return { type: block.type, titulo: block.titulo || '', data };
    } catch (err) {
      console.error(`Error procesando bloque ${block.type}:`, err);
      return { type: block.type, titulo: block.titulo || '', data: null, error: err.message };
    }
  });
}

// ─── Utilidades ───

function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * Obtiene valores únicos de un campo en los movimientos (para poblar filtros)
 */
export function getUniqueValues(movimientos, campo) {
  const map = {
    categoria: (m) => m.categoria,
    proveedor: (m) => m.nombre_proveedor,
    etapa: (m) => m.etapa,
    proyecto: (m) => m.proyecto,
    medio_pago: (m) => m.medio_pago,
    moneda: (m) => m.moneda,
    usuario: (m) => getMovimientoUserCandidates(m)[0],
  };
  const fn = map[campo];
  if (!fn) return [];

  const set = new Set();
  for (const m of movimientos) {
    const v = fn(m);
    if (v) set.add(v);
  }
  return [...set].sort();
}

/**
 * Construye filtros por defecto a partir del filtros_schema del reporte
 */
export function buildDefaultFilters(filtrosSchema) {
  const defaults = {};

  if (filtrosSchema?.fecha?.enabled) {
    const range = filtrosSchema.fecha.default_range || 'current_month';
    const now = new Date();
    let from, to;

    switch (range) {
      case 'last_30_days':
        to = now;
        from = new Date(now);
        from.setDate(from.getDate() - 30);
        break;
      case 'current_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current_year':
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
        break;
      case 'custom':
        from = filtrosSchema.fecha.default_from ? new Date(filtrosSchema.fecha.default_from) : null;
        to = filtrosSchema.fecha.default_to ? new Date(filtrosSchema.fecha.default_to) : null;
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    defaults.fecha_from = from;
    defaults.fecha_to = to;
  }

  if (filtrosSchema?.proyectos?.enabled && filtrosSchema.proyectos.default_ids?.length > 0) {
    defaults.proyectos = filtrosSchema.proyectos.default_ids;
  }

  if (filtrosSchema?.tipo?.enabled && filtrosSchema.tipo.default_value) {
    defaults.tipo = filtrosSchema.tipo.default_value;
  }

  if (filtrosSchema?.categorias?.enabled && filtrosSchema.categorias.default_values?.length > 0) {
    defaults.categorias = filtrosSchema.categorias.default_values;
  }

  if (filtrosSchema?.proveedores?.enabled && filtrosSchema.proveedores.default_values?.length > 0) {
    defaults.proveedores = filtrosSchema.proveedores.default_values;
  }

  if (filtrosSchema?.etapas?.enabled && filtrosSchema.etapas.default_values?.length > 0) {
    defaults.etapas = filtrosSchema.etapas.default_values;
  }

  if (filtrosSchema?.moneda_equivalente?.enabled !== false && filtrosSchema.moneda_equivalente?.default_values?.length > 0) {
    defaults.moneda_equivalente = filtrosSchema.moneda_equivalente.default_values;
  }

  return defaults;
}

/**
 * Formatea un valor según su formato
 */
export function formatValue(value, formato, displayCurrency = 'ARS') {
  if (value == null || isNaN(value)) return '-';

  switch (formato) {
    case 'currency': {
      const prefix = displayCurrency === 'ARS' ? '$' : displayCurrency === 'USD' ? 'U$D ' : '';
      const suffix = displayCurrency === 'CAC' ? ' CAC' : '';
      return `${prefix}${Number(value).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}${suffix}`;
    }
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'number':
      return Number(value).toLocaleString('es-AR');
    default:
      return String(value);
  }
}
