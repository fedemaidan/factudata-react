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

  if (displayCurrency === 'USD') {
    const baseAmount = campo === 'subtotal'
      ? (mov.subtotal ?? mov.total ?? mov.monto ?? 0)
      : (mov.total ?? mov.monto ?? 0);
    if ((mov?.moneda || 'ARS') === 'ARS' && Number(mov?.dolar_referencia) > 0) {
      return Number(baseAmount || 0) / Number(mov.dolar_referencia);
    }
    const dolarField = campo === 'subtotal' ? mov?.subtotal_dolar : mov?.total_dolar;
    if (dolarField != null && !isNaN(dolarField)) return Number(dolarField);
  }

  if (displayCurrency === 'ARS' && (mov?.moneda || 'ARS') === 'USD' && Number(mov?.dolar_referencia) > 0) {
    const baseAmount = campo === 'subtotal'
      ? (mov.subtotal ?? mov.total ?? mov.monto ?? 0)
      : (mov.total ?? mov.monto ?? 0);
    return Number(baseAmount || 0) * Number(mov.dolar_referencia);
  }

  const key = CURRENCY_FIELD[displayCurrency];
  if (!key) return mov.total ?? mov.monto ?? 0;

  const val = mov?.equivalencias?.[campo]?.[key];
  if (val != null && !isNaN(val)) return val;

  // Fallback: si no tiene equivalencia, devolver monto original
  return mov.total ?? mov.monto ?? 0;
}

function getConvertedAmount(mov, displayCurrency = 'ARS', campo = 'total') {
  if (displayCurrency === 'original') return getAmount(mov, displayCurrency, campo);

  if (displayCurrency === 'USD') {
    const baseAmount = campo === 'subtotal'
      ? (mov.subtotal ?? mov.total ?? mov.monto ?? 0)
      : (mov.total ?? mov.monto ?? 0);
    if ((mov?.moneda || 'ARS') === 'ARS' && Number(mov?.dolar_referencia) > 0) {
      return Number(baseAmount || 0) / Number(mov.dolar_referencia);
    }
    const dolarField = campo === 'subtotal' ? mov?.subtotal_dolar : mov?.total_dolar;
    if (dolarField != null && !isNaN(dolarField)) return Number(dolarField);
  }

  if (displayCurrency === 'ARS' && mov?.moneda === 'USD' && Number(mov?.dolar_referencia) > 0) {
    const baseAmount = campo === 'subtotal'
      ? (mov.subtotal ?? mov.total ?? mov.monto ?? 0)
      : (mov.total ?? mov.monto ?? 0);
    return Number(baseAmount || 0) * Number(mov.dolar_referencia);
  }

  const key = CURRENCY_FIELD[displayCurrency];
  if (!key) return getAmount(mov, displayCurrency, campo);

  const val = mov?.equivalencias?.[campo]?.[key];
  if (val != null && !isNaN(val)) return val;

  if (mov?.moneda === displayCurrency) {
    return campo === 'total'
      ? (mov.total ?? mov.monto ?? 0)
      : (mov.subtotal ?? mov.total ?? mov.monto ?? 0);
  }

  return 0;
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

function getMonthKeyFromDate(date) {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthKey(key) {
  if (!key || key === 'sin-fecha') return 'Sin fecha';
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return key;
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
  return label.replace('.', '').replace(' ', '-');
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

function toPlainDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
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

function toNormalizedSet(values = []) {
  return new Set((values || []).map((v) => normalizeFilterText(v)).filter(Boolean));
}

function normalizeCategoryFilterValue(value) {
  return normalizeFilterText(value == null || value === '' ? 'Sin categoría' : value);
}

function getPresupuestoCategorias(presupuesto) {
  const cats = Array.isArray(presupuesto?.clasificaciones)
    ? presupuesto.clasificaciones.map((c) => c.categoria).filter(Boolean)
    : [];
  if (cats.length > 0) return cats;
  if (presupuesto?.rubro) return [presupuesto.rubro];
  return ['Sin categoría'];
}

function getPresupuestoProveedores(presupuesto) {
  const nombres = Array.isArray(presupuesto?.proveedores)
    ? presupuesto.proveedores.map((p) => p?.nombre).filter(Boolean)
    : [];
  return nombres;
}

function getPresupuestoSubcategorias(presupuesto) {
  const set = new Set();
  const clasificaciones = Array.isArray(presupuesto?.clasificaciones)
    ? presupuesto.clasificaciones
    : [];
  for (const clasificacion of clasificaciones) {
    const subs = Array.isArray(clasificacion?.subcategorias)
      ? clasificacion.subcategorias
      : [];
    for (const sub of subs) {
      const label = String(sub || '').trim();
      if (label) set.add(label);
    }
  }
  return [...set];
}

function getPresupuestoBreakdownLabel(presupuesto, agruparPor) {
  const parts = [];
  const categorias = getPresupuestoCategorias(presupuesto);
  const subcategorias = getPresupuestoSubcategorias(presupuesto);
  const proveedores = getPresupuestoProveedores(presupuesto);

  if (agruparPor !== 'categoria' && categorias.length > 0) {
    parts.push(categorias.join(' + '));
  }

  if (subcategorias.length > 0) {
    parts.push(subcategorias.join(' + '));
  } else if (agruparPor === 'categoria') {
    parts.push('General');
  }

  if (agruparPor !== 'etapa' && presupuesto?.etapa) {
    parts.push(presupuesto.etapa);
  }

  if (agruparPor !== 'proveedor' && proveedores.length > 0) {
    parts.push(proveedores.join(' + '));
  }

  return parts.filter(Boolean).join(' · ')
    || presupuesto?.nombre
    || presupuesto?.rubro
    || 'Presupuesto';
}

function presupuestoTieneProveedores(presupuesto) {
  return getPresupuestoProveedores(presupuesto).length > 0;
}

function getPresupuestoId(presupuesto) {
  return String(presupuesto?._id || presupuesto?.id || presupuesto?.presupuesto_id || '').trim();
}

function movimientoMatchesPresupuesto(mov, presupuesto) {
  if (!mov || !presupuesto) return false;
  const tipoPresupuesto = presupuesto.tipo === 'ingreso' ? 'ingreso' : 'egreso';
  if ((mov.type || mov.tipo) !== tipoPresupuesto) return false;

  const { id: presupuestoProyectoId } = getPresupuestoProjectInfo(presupuesto);
  if (presupuestoProyectoId && String(mov.proyecto_id || '') !== String(presupuestoProyectoId)) return false;

  if (presupuesto.etapa && mov.etapa !== presupuesto.etapa) return false;

  const proveedores = Array.isArray(presupuesto.proveedores) ? presupuesto.proveedores : [];
  if (proveedores.length > 0) {
    const movProveedor = mov.nombre_proveedor || mov.proveedor || '';
    const okProveedor = proveedores.some((p) => String(p?.nombre || '') === String(movProveedor));
    if (!okProveedor) return false;
  }

  const clasificaciones = Array.isArray(presupuesto.clasificaciones) ? presupuesto.clasificaciones : [];
  if (clasificaciones.length > 0) {
    return clasificaciones.some((c) => {
      if (String(c?.categoria || '') !== String(mov.categoria || '')) return false;
      const subs = Array.isArray(c?.subcategorias) ? c.subcategorias.filter(Boolean) : [];
      if (subs.length === 0) return true;
      return subs.includes(mov.subcategoria);
    });
  }

  return true;
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

function isPhoneLike(value) {
  const normalized = normalizePhone(value);
  return /^\d{8,}$/.test(normalized || '');
}

function getProfileDisplayName(profile) {
  return getUserDisplayCandidates(profile)[0] || '';
}

function resolveUserById(usersLookup, ids = []) {
  for (const id of ids) {
    const profile = usersLookup.byId.get(String(id || '').trim());
    const label = getProfileDisplayName(profile);
    if (label) return label;
  }
  return '';
}

function resolveUserByPhone(usersLookup, values = []) {
  for (const value of values) {
    const normalized = normalizePhone(value);
    if (!normalized) continue;
    for (const phone of getPhoneCandidates(normalized)) {
      const profile = usersLookup.byPhone.get(phone);
      const label = getProfileDisplayName(profile);
      if (label) return label;
    }
  }
  return '';
}

function resolveMovimientoUserLabel(mov, usersLookup) {
  const byId = resolveUserById(usersLookup, getMovimientoUserIdCandidates(mov));
  if (byId) return byId;

  const userCandidates = getMovimientoUserCandidates(mov);
  const phoneCandidates = new Set(getMovimientoPhoneCandidates(mov));
  for (const candidate of userCandidates) {
    if (isPhoneLike(candidate)) {
      phoneCandidates.add(candidate);
    }
  }

  const byPhone = resolveUserByPhone(usersLookup, [...phoneCandidates]);
  if (byPhone) return byPhone;

  return userCandidates.find((candidate) => !isPhoneLike(candidate))
    || userCandidates[0]
    || 'Sin usuario';
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
    const ids = new Set(filters.proyectos.map((id) => String(id)));
    result = result.filter((m) => ids.has(String(m.proyecto_id)));
  }

  // Tipo (egreso/ingreso)
  if (filters.tipo) {
    result = result.filter((m) => m.type === filters.tipo);
  }

  // Categorías
  if (filters.categorias?.length > 0) {
    const set = toNormalizedSet(filters.categorias);
    result = result.filter((m) => set.has(normalizeCategoryFilterValue(m.categoria)));
  }

  // Proveedores
  if (filters.proveedores?.length > 0) {
    const set = toNormalizedSet(filters.proveedores);
    result = result.filter(
      (m) => set.has(normalizeFilterText(m.nombre_proveedor)),
    );
  }

  // Etapas
  if (filters.etapas?.length > 0) {
    const set = toNormalizedSet(filters.etapas);
    result = result.filter((m) => set.has(normalizeFilterText(m.etapa)));
  }

  // Medio de pago
  if (filters.medio_pago?.length > 0) {
    const set = toNormalizedSet(filters.medio_pago);
    result = result.filter((m) => set.has(normalizeFilterText(m.medio_pago)));
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
    const set = toNormalizedSet(filters.moneda_movimiento);
    result = result.filter(
      (m) => set.has(normalizeFilterText(m.moneda)),
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
      const set = toNormalizedSet(fe.categorias);
      result = result.filter((m) => set.has(normalizeCategoryFilterValue(m.categoria)));
    }
    if (fe.proveedores?.length > 0) {
      const set = toNormalizedSet(fe.proveedores);
      result = result.filter(
        (m) => set.has(normalizeFilterText(m.nombre_proveedor)),
      );
    }
    if (fe.etapas?.length > 0) {
      const set = toNormalizedSet(fe.etapas);
      result = result.filter((m) => set.has(normalizeFilterText(m.etapa)));
    }
    if (fe.moneda_movimiento && (!Array.isArray(fe.moneda_movimiento) || fe.moneda_movimiento.length > 0)) {
      const monedas = Array.isArray(fe.moneda_movimiento)
        ? fe.moneda_movimiento
        : [fe.moneda_movimiento];
      const set = toNormalizedSet(monedas);
      result = result.filter((m) => set.has(normalizeFilterText(m.moneda)));
    }
  }

  // ─── Exclusiones: ocultar items específicos ───
  const ex = block.excluir;
  if (ex) {
    if (ex.categorias?.length > 0) {
      const set = toNormalizedSet(ex.categorias);
      result = result.filter((m) => !set.has(normalizeCategoryFilterValue(m.categoria)));
    }
    if (ex.proveedores?.length > 0) {
      const set = toNormalizedSet(ex.proveedores);
      result = result.filter((m) => !set.has(normalizeFilterText(m.nombre_proveedor)));
    }
    if (ex.etapas?.length > 0) {
      const set = toNormalizedSet(ex.etapas);
      result = result.filter((m) => !set.has(normalizeFilterText(m.etapa)));
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

function signedAmount(mov, currency, campo = 'total') {
  const amount = Math.abs(getConvertedAmount(mov, currency, campo));
  return mov?.type === 'ingreso' ? amount : -amount;
}

function filterMovimientosForColumn(items, column) {
  let result = items;
  if (column.filtro_tipo) {
    result = result.filter((m) => m.type === column.filtro_tipo);
  }
  if (column.moneda_movimiento) {
    const monedas = Array.isArray(column.moneda_movimiento)
      ? column.moneda_movimiento
      : [column.moneda_movimiento];
    const set = toNormalizedSet(monedas);
    result = result.filter((m) => set.has(normalizeFilterText(m.moneda)));
  }
  return result;
}

function calculateSummaryColumn(items, column, currency) {
  const campo = column.campo || 'total';
  if (column.operacion === 'saldo_neto') {
    return sum(items.map((m) => signedAmount(m, currency, campo)));
  }
  const values = items.map((m) => getAmount(m, currency, campo));
  return aggregate(values, column.operacion);
}

function findLinkedBudgetVsActualBlock(metricBlock, reportConfig) {
  const layout = reportConfig?.layout;
  if (!Array.isArray(layout) || layout.length === 0) return null;

  if (metricBlock?.linked_budget_block_id) {
    const byId = layout.find(
      (b) => b?.type === 'budget_vs_actual' && b?.id === metricBlock.linked_budget_block_id,
    );
    if (byId) return byId;
  }

  if (Number.isInteger(metricBlock?.linked_budget_block_index)) {
    const byIndex = layout[metricBlock.linked_budget_block_index];
    if (byIndex?.type === 'budget_vs_actual') return byIndex;
  }

  const title = normalizeFilterText(metricBlock?.titulo || '');
  const shouldAutoLink =
    metricBlock?.sync_with_budget_vs_actual === true
    || title.includes('resumen presupuest');

  if (!shouldAutoLink) return null;
  return layout.find((b) => b?.type === 'budget_vs_actual') || null;
}

function getBudgetVsActualCategorySet(block, presupuestos, extraContext = {}) {
  const agruparPor = block?.agrupar_por || 'categoria';
  const presupuestosConCampo = block?.presupuestos_con_campo || (agruparPor === 'categoria' ? 'categoria' : null);
  if (agruparPor !== 'categoria' || presupuestosConCampo !== 'categoria' || block?.incluir_sin_presupuesto === true) {
    return null;
  }

  const runtimeProjectIds = new Set((extraContext?.filters?.proyectos || []).map((id) => String(id)));
  const runtimeCategorySet = toNormalizedSet(extraContext?.filters?.categorias || []);
  let presFiltered = Array.isArray(presupuestos) ? [...presupuestos] : [];

  if (block?.mostrar_tipo && block.mostrar_tipo !== 'ambos') {
    presFiltered = presFiltered.filter((p) => p.tipo === block.mostrar_tipo);
  }

  presFiltered = presFiltered.filter((p) => !!(p.clasificaciones?.length || p.rubro));

  if (runtimeProjectIds.size > 0) {
    presFiltered = presFiltered.filter((p) => runtimeProjectIds.has(getPresupuestoProjectInfo(p).id));
  }

  if (runtimeCategorySet.size > 0) {
    presFiltered = presFiltered.filter((p) =>
      getPresupuestoCategorias(p).some((cat) =>
        runtimeCategorySet.has(normalizeCategoryFilterValue(cat))
      )
    );
  }

  if (block?.excluir?.presupuestos?.length > 0) {
    const exSet = new Set(block.excluir.presupuestos.map((n) => String(n || '').toLowerCase()));
    presFiltered = presFiltered.filter((p) => {
      const nombre = (p.nombre || p.rubro || '').toLowerCase();
      return !exSet.has(nombre);
    });
  }

  const categorySet = new Set();
  for (const p of presFiltered) {
    for (const cat of getPresupuestoCategorias(p)) {
      categorySet.add(normalizeCategoryFilterValue(cat));
    }
  }

  const excludedCategories = toNormalizedSet(block?.excluir?.categorias || []);
  for (const cat of excludedCategories) {
    categorySet.delete(cat);
  }

  return categorySet;
}

function shouldMetricUseLinkedBudgetExecuted(metrica, linkedBudgetBlock) {
  if (!linkedBudgetBlock) return false;
  const metricType = metrica?.filtro_tipo || linkedBudgetBlock.mostrar_tipo || 'egreso';
  return metrica?.operacion === 'sum'
    && (metrica?.campo || 'total') === 'total'
    && metricType === linkedBudgetBlock.mostrar_tipo;
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

function buildProjectNameMap(projects = []) {
  const map = new Map();
  for (const p of Array.isArray(projects) ? projects : []) {
    const id = p?.id || p?._id || p?.proyecto_id;
    const name = p?.nombre || p?.proyecto || p?.name || p?.label;
    if (id && name) map.set(String(id), name);
  }
  return map;
}

function getProjectLabelFromMovement(mov) {
  return mov?.proyecto_nombre || mov?.proyecto || mov?.nombre_proyecto || 'Sin proyecto';
}

function groupMovimientosByProject(movimientos, extraContext = {}) {
  const projectNameById = buildProjectNameMap(extraContext?.proyectos);
  const map = new Map();

  for (const mov of movimientos) {
    const projectId = mov?.proyecto_id ? String(mov.proyecto_id) : '';
    const fallbackName = getProjectLabelFromMovement(mov);
    const key = projectId || `nombre:${fallbackName}`;
    const current = map.get(key) || {
      key,
      label: projectNameById.get(projectId) || fallbackName,
      items: [],
    };

    const canonicalName = projectNameById.get(projectId);
    if (canonicalName) {
      current.label = canonicalName;
    } else if (fallbackName && fallbackName.length > String(current.label || '').length) {
      current.label = fallbackName;
    }

    current.items.push(mov);
    map.set(key, current);
  }

  return [...map.values()].map((group) => [group.label, group.items]);
}

function groupMovimientosByUsuario(movimientos, extraContext = {}) {
  const usersLookup = buildCompanyUsersLookup(extraContext);
  const map = new Map();

  for (const mov of movimientos) {
    const key = resolveMovimientoUserLabel(mov, usersLookup);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(mov);
  }

  return [...map.entries()];
}

function getCategoryLabel(mov) {
  return String(mov?.categoria || mov?.rubro || 'Sin categoría').trim() || 'Sin categoría';
}

function getSubcategoryLabel(mov) {
  return String(mov?.subcategoria || mov?.subrubro || 'Otros rubros').trim() || 'Otros rubros';
}

// ─── Procesadores de bloques ───

/**
 * Procesa un bloque metric_cards
 * @returns {Array<{ id, titulo, valor, formato, color }>}
 */
export function processMetricCards(block, movimientos, presupuestos, currencies, _cotizaciones, extraContext = {}) {
  const metricas = block.metricas || [];
  const linkedBudgetBlock = findLinkedBudgetVsActualBlock(block, extraContext?.reportConfig);
  const linkedBudgetCategories = linkedBudgetBlock
    ? getBudgetVsActualCategorySet(linkedBudgetBlock, presupuestos, extraContext)
    : null;

  return metricas.map((metrica) => {
    let data = movimientos;
    const useLinkedBudgetExecuted = shouldMetricUseLinkedBudgetExecuted(metrica, linkedBudgetBlock);

    if (useLinkedBudgetExecuted) {
      const budgetData = processBudgetVsActual(
        linkedBudgetBlock,
        movimientos,
        presupuestos,
        currencies,
        _cotizaciones,
        extraContext,
      );
      const value = Number(budgetData?.totals?.ejecutado || 0);
      return {
        id: metrica.id,
        titulo: metrica.titulo,
        valor: value,
        valores: { [currencies[0]]: value },
        display_currency: metrica.display_currency || null,
        formato: metrica.formato || 'currency',
        color: metrica.color || 'default',
        _movimientos: budgetData.rows?.flatMap((row) => row._movimientos || []) || [],
      };
    }

    // Si esta metrica está asociada al bloque Presupuesto vs Ejecución,
    // hereda sus filtros/exclusiones para que no sume categorías ocultas.
    if (linkedBudgetBlock) {
      data = applyBlockFilters(data, linkedBudgetBlock);
      if (linkedBudgetCategories) {
        data = data.filter((m) => linkedBudgetCategories.has(normalizeCategoryFilterValue(m.categoria)));
      }
      if (!metrica.filtro_tipo && linkedBudgetBlock.mostrar_tipo && linkedBudgetBlock.mostrar_tipo !== 'ambos') {
        data = data.filter((m) => m.type === linkedBudgetBlock.mostrar_tipo);
      }
    }

    // Filtro de tipo del metric card individual
    if (metrica.filtro_tipo) {
      data = data.filter((m) => m.type === metrica.filtro_tipo);
    }

    // Filtros extra del metric card
    const fe = metrica.filtros_extra;
    if (fe) {
      if (fe.categorias?.length > 0) {
        const set = toNormalizedSet(fe.categorias);
        data = data.filter((m) => set.has(normalizeCategoryFilterValue(m.categoria)));
      }
      if (fe.proveedores?.length > 0) {
        const set = toNormalizedSet(fe.proveedores);
        data = data.filter(
          (m) => set.has(normalizeFilterText(m.nombre_proveedor)),
        );
      }
      if (fe.etapas?.length > 0) {
        const set = toNormalizedSet(fe.etapas);
        data = data.filter((m) => set.has(normalizeFilterText(m.etapa)));
      }
      if (fe.moneda_movimiento && (!Array.isArray(fe.moneda_movimiento) || fe.moneda_movimiento.length > 0)) {
        const monedas = Array.isArray(fe.moneda_movimiento)
          ? fe.moneda_movimiento
          : [fe.moneda_movimiento];
        const set = toNormalizedSet(monedas);
        data = data.filter((m) => set.has(normalizeFilterText(m.moneda)));
      }
    }

    // Extraer valores — calcular para cada moneda seleccionada
    const campo = metrica.campo || 'total';
    const metricCurrency = metrica.display_currency || null;
    const metricCurrencies = metricCurrency ? [metricCurrency] : currencies;
    const valores = {};
    for (const cur of metricCurrencies) {
      if (metrica.operacion === 'saldo_neto') {
        valores[cur] = sum(data.map((m) => signedAmount(m, cur, campo)));
      } else {
        const vals = data.map((m) => getAmount(m, cur, campo));
        valores[cur] = aggregate(vals, metrica.operacion);
      }
    }

    return {
      id: metrica.id,
      titulo: metrica.titulo,
      valor: valores[metricCurrency || currencies[0]],
      valores,
      display_currency: metricCurrency,
      formato: metrica.formato || 'currency',
      color: metrica.color || 'default',
      _movimientos: data,
    };
  });
}

/**
 * Procesa un bloque category_subcategory_accordion
 * Agrupa movimientos por categoría y subcategoría, preservando movimientos para drill-down.
 */
export function processCategorySubcategoryAccordion(block, movimientos, _presupuestos, currencies) {
  const data = applyBlockFilters(movimientos, {
    ...block,
    filtro_tipo: block.filtro_tipo || 'egreso',
  });
  const displayCurrency = block.display_currency || currencies?.[0] || 'ARS';
  const campo = block.campo_monto || 'total';
  const categoriesMap = new Map();

  for (const mov of data) {
    const categoryLabel = getCategoryLabel(mov);
    const categoryKey = normalizeCategoryFilterValue(categoryLabel);
    const subcategoryLabel = getSubcategoryLabel(mov);
    const subcategoryKey = normalizeCategoryFilterValue(subcategoryLabel);
    const amount = Math.abs(getAmount(mov, displayCurrency, campo));

    const category = categoriesMap.get(categoryKey) || {
      key: categoryKey,
      label: categoryLabel,
      total: 0,
      count: 0,
      movimientos: [],
      subcategoriesMap: new Map(),
    };

    const subcategory = category.subcategoriesMap.get(subcategoryKey) || {
      key: subcategoryKey,
      label: subcategoryLabel,
      total: 0,
      count: 0,
      movimientos: [],
    };

    category.total += amount;
    category.count += 1;
    category.movimientos.push(mov);
    subcategory.total += amount;
    subcategory.count += 1;
    subcategory.movimientos.push(mov);

    category.subcategoriesMap.set(subcategoryKey, subcategory);
    categoriesMap.set(categoryKey, category);
  }

  const categories = [...categoriesMap.values()]
    .map((category) => ({
      key: category.key,
      label: category.label,
      total: round2(category.total),
      count: category.count,
      movimientos: category.movimientos,
      subcategories: [...category.subcategoriesMap.values()]
        .map((sub) => ({
          ...sub,
          total: round2(sub.total),
        }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  return {
    categories,
    total: round2(categories.reduce((acc, category) => acc + category.total, 0)),
    count: data.length,
    displayCurrency,
    campo,
    showCounts: block.mostrar_cantidad_movimientos !== false,
    showSubcategories: block.desglose_subcategorias !== false,
  };
}

/**
 * Procesa un bloque summary_table
 * @returns {{ headers, rows, totals }}
 */
export function processSummaryTable(block, movimientos, _presupuestos, currencies, _cotizaciones, extraContext = {}) {
  const data = applyBlockFilters(movimientos, block);
  const groupedEntries = block.agrupar_por === 'proyecto'
    ? groupMovimientosByProject(data, extraContext)
    : block.agrupar_por === 'usuario'
      ? groupMovimientosByUsuario(data, extraContext)
    : [...groupBy(data, block.agrupar_por).entries()];
  const columnas = block.columnas || [{ id: 'total', titulo: 'Total', operacion: 'sum', campo: 'total', formato: 'currency' }];
  const primaryCurrency = currencies[0];
  const isMulti = currencies.length > 1;

  // Expandir columnas: si multi-moneda y formato currency, replicar por moneda
  const expandedCols = [];
  for (const col of columnas) {
    if (col.display_currency) {
      expandedCols.push({ ...col, currency: col.display_currency, _id: col.id });
    } else if (isMulti && (col.formato === 'currency' || !col.formato)) {
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
        filtro_tipo: ec.filtro_tipo || null,
        operacion: ec.operacion || 'sum',
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
  for (const [grupo, items] of groupedEntries) {
    const row = { grupo, _count: items.length, _movimientos: items };
    for (const ec of expandedCols) {
      const columnItems = filterMovimientosForColumn(items, ec);
      row[ec._id] = calculateSummaryColumn(columnItems, ec, ec.currency);
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
      const va = a[orderKey];
      const vb = b[orderKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true }) * dir;
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
  const primaryCurrency = block.display_currency || currencies[0];
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
  const summaryLabel = block.resumen_titulo
    || (block.filtro_tipo === 'ingreso' ? 'Ingresos' : block.filtro_tipo === 'egreso' ? 'Egresos' : 'Movimientos');
  const summaryTotal = round2(rows.reduce((acc, row) => {
    if (block.filtro_tipo === 'egreso') return acc + Math.abs(row.egreso_display ?? row.monto_display ?? 0);
    if (block.filtro_tipo === 'ingreso') return acc + Math.abs(row.ingreso_display ?? row.monto_display ?? 0);
    return acc + Number(row.monto_display || 0);
  }, 0));

  return {
    columnas: columnasVisibles,
    rows,
    pageSize,
    totalRows: rows.length,
    currencies,
    displayCurrency: primaryCurrency,
    summaryAccordion: block.resumen_desplegable === true,
    summaryLabel,
    summaryTotal,
    showSummaryCount: block.mostrar_cantidad_resumen === true,
  };
}

/**
 * Procesa un bloque budget_vs_actual
 * Cruza presupuestos de control con movimientos reales agrupados por categoría
 * @returns {{ headers, rows }}
 */
export function processBudgetVsActual(block, movimientos, presupuestos, currencies, cotizaciones, extraContext = {}) {
  const displayCurrency = currencies[0];
  const data = applyBlockFilters(movimientos, block);
  const agruparPor = block.agrupar_por || 'categoria';
  const groupLabelByField = {
    categoria: 'Categoría',
    proveedor: 'Proveedor',
    etapa: 'Etapa',
  };
  const runtimeProjectIds = new Set((extraContext?.filters?.proyectos || []).map((id) => String(id)));
  const runtimeCategorySet = toNormalizedSet(extraContext?.filters?.categorias || []);

  // Filtrar presupuestos por tipo si corresponde
  let presFiltered = presupuestos || [];
  if (block.mostrar_tipo && block.mostrar_tipo !== 'ambos') {
    presFiltered = presFiltered.filter((p) => p.tipo === block.mostrar_tipo);
  }
  // Filtrar presupuestos que tengan el campo seleccionado cargado.
  // Para categoría, evitamos que presupuestos sin clasificación caigan en "Sin categoría".
  const presupuestosConCampo = block.presupuestos_con_campo || (agruparPor === 'categoria' ? 'categoria' : null);
  if (presupuestosConCampo) {
    const campoReq = presupuestosConCampo; // 'categoria' | 'etapa' | 'proveedor'
    presFiltered = presFiltered.filter((p) => {
      if (campoReq === 'categoria') return !!(p.clasificaciones?.length || p.rubro);
      if (campoReq === 'etapa') return !!p.etapa;
      if (campoReq === 'proveedor') return presupuestoTieneProveedores(p);
      return true;
    });
  }

  // Respetar filtro global de proyectos en bloques que usan presupuestos
  if (runtimeProjectIds.size > 0) {
    presFiltered = presFiltered.filter((p) => runtimeProjectIds.has(getPresupuestoProjectInfo(p).id));
  }

  // Respetar filtro global de categorías también en presupuestos (matchea si alguna clasificación coincide)
  if (runtimeCategorySet.size > 0) {
    presFiltered = presFiltered.filter((p) =>
      getPresupuestoCategorias(p).some((cat) =>
        runtimeCategorySet.has(normalizeCategoryFilterValue(cat))
      )
    );
  }

  // Excluir presupuestos específicos
  if (block.excluir?.presupuestos?.length > 0) {
    const exSet = new Set(block.excluir.presupuestos.map((n) => n.toLowerCase()));
    presFiltered = presFiltered.filter((p) => {
      const nombre = (p.nombre || p.rubro || '').toLowerCase();
      return !exSet.has(nombre);
    });
  }

  // Función para obtener clave(s) de agrupación de un presupuesto.
  // Para agrupar por categoría/proveedor: un presupuesto con N entradas genera N filas
  // (replicación — el monto se cuenta entero en cada categoría/proveedor que cubre).
  const getPresKeys = (p) => {
    switch (agruparPor) {
      case 'etapa': return [(p.etapa || 'Sin etapa')];
      case 'proveedor': {
        const provs = getPresupuestoProveedores(p);
        return provs.length > 0 ? provs : ['Sin proveedor'];
      }
      case 'categoria':
      default: return getPresupuestoCategorias(p);
    }
  };

  const exclusionFieldByGroup = {
    categoria: 'categorias',
    etapa: 'etapas',
    proveedor: 'proveedores',
  };
  const exclusionField = exclusionFieldByGroup[agruparPor];
  const exclusionSet = exclusionField ? toNormalizedSet(block.excluir?.[exclusionField] || []) : new Set();
  if (exclusionSet.size > 0) {
    presFiltered = presFiltered.filter((p) =>
      !getPresKeys(p).every((nombre) => exclusionSet.has(normalizeFilterText(nombre)))
    );
  }

  // Mapear presupuestos por campo de agrupación
  const presMap = new Map();
  for (const p of presFiltered) {
    const monto = getPresupuestoAmount(p, displayCurrency, cotizaciones);
    const ejecutado = convertPresupuestoValue(p, Number(p.ejecutado || 0), displayCurrency, cotizaciones);
    for (const nombre of getPresKeys(p)) {
      const key = String(nombre).toLowerCase();
      if (!presMap.has(key)) {
        presMap.set(key, { nombre, presupuestado: 0, ejecutado: 0, details: [] });
      }
      presMap.get(key).presupuestado += monto;
      presMap.get(key).ejecutado += ejecutado;
      const presupuestoMovs = data.filter((m) => movimientoMatchesPresupuesto(m, p));
      const detalleDisponible = monto - ejecutado;
      const detallePorcentaje = monto > 0 ? ejecutado / monto : 0;
      presMap.get(key).details.push({
        id: getPresupuestoId(p) || `${key}-${presMap.get(key).details.length}`,
        label: getPresupuestoBreakdownLabel(p, agruparPor),
        presupuestado: monto,
        ejecutado,
        disponible: detalleDisponible,
        porcentaje: detallePorcentaje,
        sobreejecucion: block.alerta_sobreejecucion && detallePorcentaje > 1,
        _movimientos: presupuestoMovs,
      });
    }
  }

  // Agrupar movimientos por el campo seleccionado
  const movGrouped = groupBy(data, agruparPor);

  // Combinar. Por defecto el bloque muestra solo lo que tiene presupuesto;
  // las categorías con movimientos pero sin presupuesto pueden activarse aparte.
  const allKeys = new Set([...presMap.keys()]);
  if (block.incluir_sin_presupuesto === true) {
    for (const [key] of movGrouped) {
      allKeys.add(key.toLowerCase());
    }
  }

  const rows = [];
  for (const key of allKeys) {
    const presData = presMap.get(key) || { nombre: key, presupuestado: 0, ejecutado: 0, details: [] };

    const movs = movGrouped.get(
      [...movGrouped.keys()].find((k) => k.toLowerCase() === key),
    ) || [];

    const ejecutado = presData.ejecutado;
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
      details: [...(presData.details || [])].sort((a, b) => b.presupuestado - a.presupuestado || a.label.localeCompare(b.label)),
      _movimientos: movs,
    });
  }

  // Ordenar por presupuestado desc
  rows.sort((a, b) => b.presupuestado - a.presupuestado);

  const columnasConfig = block.columnas_budget || [
    'presupuestado', 'ejecutado', 'disponible', 'porcentaje', 'barra',
  ];

  return {
    groupField: agruparPor,
    groupLabel: groupLabelByField[agruparPor] || capitalizar(agruparPor),
    showBudgetBreakdown: block.mostrar_desglose_presupuestos === true,
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
export function processCategoryBudgetMatrix(block, movimientos, presupuestos, currencies, cotizaciones, extraContext = {}) {
  const displayCurrency = currencies[0];
  const list = Array.isArray(presupuestos) ? presupuestos : [];
  const movs = Array.isArray(movimientos) ? movimientos : [];
  const runtimeProjectIds = new Set((extraContext?.filters?.proyectos || []).map((id) => String(id)));

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
  const projectHasIndexedBudget = new Map();

  for (const p of list) {
    if (runtimeProjectIds.size > 0) {
      const { id: runtimeProjectId } = getPresupuestoProjectInfo(p, projectNameById);
      if (!runtimeProjectIds.has(runtimeProjectId)) continue;
    }

    // Filtrar por tipo de presupuesto
    if (tipoTarget !== 'ambos' && (p.tipo || 'egreso') !== tipoTarget) {
      continue;
    }

    // Filtrar por categoría específica (matchea si alguna clasificación coincide).
    if (categoriaTarget) {
      const cats = getPresupuestoCategorias(p).map(normalizeText);
      if (!cats.includes(categoriaTarget)) {
        continue;
      }
    }

    const { id: proyectoId, nombre: proyectoNombre } = getPresupuestoProjectInfo(p, projectNameById);
    if (!projectsMap.has(proyectoId)) {
      projectsMap.set(proyectoId, { id: proyectoId, nombre: proyectoNombre });
      projectTiposCreacion.set(proyectoId, []);
    }

    const useNominalArs = shouldShowNominalArsForPresupuesto(p, displayCurrency);
    if (useNominalArs) {
      projectHasIndexedBudget.set(proyectoId, true);
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
      inicialHoy: 0,
      totalPresupuesto: 0,
      totalPresupuestoHoy: 0,
      recibido: 0,
      recibidoHoy: 0,
      saldo: 0,
      saldoHoy: 0,
    };

    const adicionales = Array.isArray(p.adicionales) ? p.adicionales : [];
    let totalAdicionales = 0;
    let totalAdicionalesHoy = 0;

    for (const adic of adicionales) {
      const montoAdicBase = Number(adic?.monto ?? adic?.valor ?? 0);
      if (!Number.isFinite(montoAdicBase)) continue;

      const montoAdicHoy = convertPresupuestoValue(p, montoAdicBase, displayCurrency, cotizaciones);
      const montoAdic = useNominalArs
        ? getAdicionalNominalArs(adic, p, cotizaciones)
        : montoAdicHoy;
      totalAdicionales += montoAdic;
      totalAdicionalesHoy += montoAdicHoy;

      const label = (adic?.concepto || adic?.motivo || 'Adicional').trim() || 'Adicional';
      const adicKey = normalizeText(label);

      const row = additionalRows.get(adicKey) || {
        key: `adic_${adicKey}`,
        label,
        type: 'additional',
        values: {},
        todayValues: {},
      };

      row.values[proyectoId] = (row.values[proyectoId] || 0) + montoAdic;
      if (useNominalArs) {
        row.todayValues[proyectoId] = (row.todayValues[proyectoId] || 0) + montoAdicHoy;
      }
      additionalRows.set(adicKey, row);
    }

    const montoTotalHoy = getPresupuestoAmount(p, displayCurrency, cotizaciones);
    const montoInicialHoy = asumirMontoIncluyeAdicionales ? montoTotalHoy - totalAdicionalesHoy : montoTotalHoy;
    const montoInicial = useNominalArs
      ? getPresupuestoNominalArs(p, cotizaciones)
      : montoInicialHoy;
    const recibidoHoy = convertPresupuestoValue(p, Number(p.ejecutado || 0), displayCurrency, cotizaciones);
    const totalPresupuesto = montoInicial + totalAdicionales;
    const totalPresupuestoHoy = montoInicialHoy + totalAdicionalesHoy;

    acc.inicial += montoInicial;
    acc.inicialHoy += montoInicialHoy;
    acc.totalPresupuesto += totalPresupuesto;
    acc.totalPresupuestoHoy += totalPresupuestoHoy;
    acc.recibidoHoy += recibidoHoy;
    acc.saldoHoy += totalPresupuestoHoy - recibidoHoy;

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

  const movimientosRecibidoByProject = {};
  const recibidoNominalByProject = {};
  for (const col of projectColumns) {
    movimientosRecibidoByProject[col.id] = [];
    recibidoNominalByProject[col.id] = 0;
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
        recibidoNominalByProject[targetProjectId] += Math.abs(getAmount(m, displayCurrency, 'total'));
      }
    }
  }

  const initialRow = {
    key: 'presupuesto_inicial',
    label: block.label_presupuesto_inicial || 'Presupuesto inicial',
    type: 'initial',
    values: {},
    todayValues: {},
  };
  const totalRow = {
    key: 'total_presupuesto',
    label: block.label_total_presupuesto || 'Total presupuesto',
    type: 'summary',
    values: {},
    todayValues: {},
  };
  const recibidoRow = {
    key: 'recibido',
    label: block.label_recibido || 'Recibido',
    type: 'summary',
    values: {},
    todayValues: {},
  };
  const saldoRow = {
    key: 'saldo',
    label: block.label_saldo || 'Saldo',
    type: 'summary',
    values: {},
    todayValues: {},
  };

  for (const col of projectColumns) {
    const acc = projectAccum.get(col.id) || {
      inicial: 0,
      inicialHoy: 0,
      totalPresupuesto: 0,
      totalPresupuestoHoy: 0,
      recibido: 0,
      recibidoHoy: 0,
      saldo: 0,
      saldoHoy: 0,
    };
    const hasIndexedBudget = projectHasIndexedBudget.get(col.id) === true;
    const hasMovimientoRecibido = movimientosRecibidoByProject[col.id]?.length > 0;
    const recibido = hasMovimientoRecibido ? recibidoNominalByProject[col.id] : acc.recibidoHoy;
    const saldo = acc.totalPresupuesto - recibido;

    initialRow.values[col.id] = acc.inicial;
    totalRow.values[col.id] = acc.totalPresupuesto;
    recibidoRow.values[col.id] = recibido;
    saldoRow.values[col.id] = saldo;

    if (hasIndexedBudget) {
      initialRow.todayValues[col.id] = acc.inicialHoy;
      totalRow.todayValues[col.id] = acc.totalPresupuestoHoy;
      recibidoRow.todayValues[col.id] = acc.recibidoHoy;
      saldoRow.todayValues[col.id] = acc.totalPresupuestoHoy - acc.recibidoHoy;
    }
  }

  const rows = [
    initialRow,
    ...[...additionalRows.values()],
    totalRow,
    recibidoRow,
    saldoRow,
  ];

  recibidoRow._movimientos_by_project = movimientosRecibidoByProject;

  return {
    categoria: block.categoria_objetivo || 'Todas',
    rowHeaderTitle: block.columna_concepto_titulo || 'Concepto',
    projectColumns,
    rows,
  };
}

function getSnapshotCac(snapshot = {}) {
  const candidates = [
    snapshot?.cac_indice,
    snapshot?.cac_general,
    snapshot?.cac_mano_obra,
    snapshot?.cac_materiales,
    snapshot?.cac,
  ];
  const value = candidates.find((v) => Number(v) > 0);
  return value != null ? Number(value) : 0;
}

function getSnapshotUsd(snapshot = {}) {
  const candidates = [
    snapshot?.dolar_blue,
    snapshot?.dolar,
  ];
  const value = candidates.find((v) => Number(v) > 0);
  return value != null ? Number(value) : 0;
}

function getPresupuestoNominalArs(presupuesto, cotizaciones) {
  const montoIngresado = Number(presupuesto?.monto_ingresado);
  if (Number.isFinite(montoIngresado) && montoIngresado !== 0) return Math.abs(montoIngresado);

  const indexacion = String(presupuesto?.indexacion || '').toUpperCase();
  const montoBase = Number(
    presupuesto?.monto_base
    ?? presupuesto?.monto_original
    ?? presupuesto?.monto_presupuestado
    ?? presupuesto?.monto
    ?? 0
  );

  if (!Number.isFinite(montoBase)) return 0;
  if (indexacion === 'CAC') {
    const cac = getSnapshotCac(presupuesto?.cotizacion_snapshot, cotizaciones);
    return cac > 0 ? Math.abs(montoBase * cac) : Math.abs(montoBase);
  }
  if (indexacion === 'USD') {
    const usd = getSnapshotUsd(presupuesto?.cotizacion_snapshot, cotizaciones);
    return usd > 0 ? Math.abs(montoBase * usd) : Math.abs(montoBase);
  }
  return Math.abs(montoBase);
}

function getAdicionalNominalArs(adicional, presupuesto, cotizaciones) {
  const monto = Number(adicional?.monto ?? adicional?.valor ?? 0);
  if (!Number.isFinite(monto)) return 0;

  const indexacion = String(presupuesto?.indexacion || '').toUpperCase();
  if (indexacion === 'CAC') {
    const cac = getSnapshotCac(adicional?.cotizacion_snapshot, cotizaciones);
    return cac > 0 ? Math.abs(monto * cac) : 0;
  }
  if (indexacion === 'USD') {
    const usd = getSnapshotUsd(adicional?.cotizacion_snapshot, cotizaciones);
    return usd > 0 ? Math.abs(monto * usd) : 0;
  }
  return Math.abs(monto);
}

function shouldShowNominalArsForPresupuesto(presupuesto, displayCurrency) {
  if (displayCurrency !== 'ARS') return false;
  const storage = String(presupuesto?.moneda_almacenamiento || presupuesto?.moneda || 'ARS').toUpperCase();
  const indexacion = String(presupuesto?.indexacion || '').toUpperCase();
  return storage === 'CAC' || storage === 'USD' || indexacion === 'CAC' || indexacion === 'USD';
}

function getPresupuestoNominalCac(presupuesto, subtotalNeto, cotizaciones) {
  const snapCac = getSnapshotCac(presupuesto?.cotizacion_snapshot, cotizaciones);
  if (snapCac > 0) return Math.abs(subtotalNeto) / snapCac;
  return Math.abs(getPresupuestoAmount(presupuesto, 'CAC', cotizaciones));
}

function getAdicionalNominalCac(adicional, presupuesto, subtotalNeto, cotizaciones) {
  const indexacion = String(presupuesto?.indexacion || '').toUpperCase();
  const monto = Number(adicional?.monto ?? adicional?.valor ?? 0);
  if (indexacion === 'CAC' && Number.isFinite(monto)) return Math.abs(monto);

  const snapCac = getSnapshotCac(adicional?.cotizacion_snapshot, cotizaciones);
  if (snapCac > 0) return Math.abs(subtotalNeto) / snapCac;
  return Math.abs(convertPresupuestoValue(presupuesto, Number.isFinite(monto) ? monto : 0, 'CAC', cotizaciones));
}

function resolvePresupuestoConcepto(presupuesto) {
  return (
    presupuesto?.nombre
    || presupuesto?.concepto
    || presupuesto?.descripcion
    || presupuesto?.rubro
    || (presupuesto?.codigo ? `Presupuesto ${presupuesto.codigo}` : 'Presupuesto inicial')
  );
}

function resolvePresupuestoDate(presupuesto) {
  return (
    presupuesto?.fecha_presupuesto
    || presupuesto?.fechaInicio
    || presupuesto?.creadoEn
    || presupuesto?.createdAt
    || presupuesto?.cotizacion_snapshot?.fecha_presupuesto
    || presupuesto?.cotizacion_snapshot?.fecha
    || null
  );
}

function resolveAdicionalDate(adicional, presupuesto) {
  return (
    adicional?.fecha_adicional
    || adicional?.fecha
    || adicional?.createdAt
    || presupuesto?.fecha_presupuesto
    || presupuesto?.fechaInicio
    || null
  );
}

function getIngresoMovimientoCacIndex(mov, subtotalArs, subtotalCac, cotizaciones) {
  const direct = [
    mov?.cac_referencia,
    mov?.cac,
    mov?.cotizacion_cac,
    mov?.cotizacion_snapshot?.cac_indice,
    mov?.cotizacion_snapshot?.cac_general,
    mov?.cotizacion_snapshot?.cac,
  ].find((v) => Number(v) > 0);
  if (direct != null) return Number(direct);
  if (Number(subtotalArs) > 0 && Number(subtotalCac) > 0) {
    return Number(subtotalArs) / Number(subtotalCac);
  }
  return Number(cotizaciones?.cac || 0);
}

function getMovimientoCacAmount(mov, campo, subtotalArs, icac) {
  const raw = mov?.equivalencias?.[campo]?.cac;
  if (raw != null && !isNaN(raw)) return Math.abs(Number(raw));

  if ((mov?.moneda || '').toUpperCase() === 'CAC') {
    const original = campo === 'subtotal'
      ? (mov?.subtotal ?? mov?.total ?? mov?.monto ?? 0)
      : (mov?.total ?? mov?.monto ?? 0);
    return Math.abs(Number(original || 0));
  }

  return Number(icac) > 0 ? Math.abs(Number(subtotalArs || 0)) / Number(icac) : 0;
}

/**
 * Procesa el control de presupuesto de ingresos por proyecto.
 *
 * Tabla 1: presupuestos de ingreso iniciales + adicionales.
 * Tabla 2: movimientos de ingreso recibidos en Sorby.
 * Saldo: CAC presupuestado - CAC recibido, valorizado a CAC de hoy.
 */
export function processIncomeBudgetControl(block, movimientos, presupuestos, currencies, cotizaciones, extraContext = {}) {
  const list = Array.isArray(presupuestos) ? presupuestos : [];
  const movs = Array.isArray(movimientos) ? movimientos : [];
  const runtimeProjectIds = new Set((extraContext?.filters?.proyectos || []).map((id) => String(id)));
  const amountField = block.campo_monto || 'subtotal';
  const cacHoy = Number(cotizaciones?.cac || 0);

  let presFiltered = list.filter((p) => (p?.tipo || 'egreso') === 'ingreso');
  if (runtimeProjectIds.size > 0) {
    presFiltered = presFiltered.filter((p) => runtimeProjectIds.has(getPresupuestoProjectInfo(p).id));
  }

  const presupuestoRows = [];
  let order = 1;
  for (const p of presFiltered) {
    const snapCac = getSnapshotCac(p?.cotizacion_snapshot, cotizaciones);
    const subtotalNeto = getPresupuestoNominalArs(p, cotizaciones);
    const cacEquivalente = getPresupuestoNominalCac(p, subtotalNeto, cotizaciones);

    presupuestoRows.push({
      nro: order,
      concepto: resolvePresupuestoConcepto(p),
      fecha: resolvePresupuestoDate(p),
      icac: snapCac,
      subtotal_neto: subtotalNeto,
      cac_equivalente: cacEquivalente,
      tipo: 'presupuesto',
      presupuesto_id: getPresupuestoId(p),
    });
    order += 1;

    const adicionales = Array.isArray(p?.adicionales) ? p.adicionales : [];
    for (const adic of adicionales) {
      const montoBase = Number(adic?.monto ?? adic?.valor ?? 0);
      if (!Number.isFinite(montoBase) || montoBase === 0) continue;
      const adicCac = getSnapshotCac(adic?.cotizacion_snapshot, cotizaciones);
      const subtotalAdic = getAdicionalNominalArs(adic, p, cotizaciones);
      const cacAdic = getAdicionalNominalCac(adic, p, subtotalAdic, cotizaciones);

      presupuestoRows.push({
        nro: order,
        concepto: adic?.concepto || adic?.motivo || 'Adicional',
        fecha: resolveAdicionalDate(adic, p),
        icac: adicCac,
        subtotal_neto: subtotalAdic,
        cac_equivalente: cacAdic,
        tipo: 'adicional',
        presupuesto_id: getPresupuestoId(p),
      });
      order += 1;
    }
  }

  const movimientosIngreso = applyBlockFilters(movs, {
    ...block,
    filtro_tipo: 'ingreso',
  });

  const movimientoRows = movimientosIngreso
    .map((m, idx) => {
      const subtotalArs = Math.abs(getAmount(m, 'ARS', amountField));
      const rawSubtotalCac = m?.equivalencias?.[amountField]?.cac;
      const subtotalCacForIndex = rawSubtotalCac != null && !isNaN(rawSubtotalCac)
        ? Math.abs(Number(rawSubtotalCac))
        : 0;
      const icac = getIngresoMovimientoCacIndex(m, subtotalArs, subtotalCacForIndex, cotizaciones);
      const subtotalCac = getMovimientoCacAmount(m, amountField, subtotalArs, icac);
      return {
        nro: idx + 1,
        fecha: m?.fecha_factura || m?.fecha,
        icac,
        pago_neto_ars: subtotalArs,
        cac_recibidos: subtotalCac || (icac > 0 ? subtotalArs / icac : 0),
        movimiento: m,
      };
    })
    .sort((a, b) => {
      const da = toPlainDate(a.fecha)?.getTime() || 0;
      const db = toPlainDate(b.fecha)?.getTime() || 0;
      return da - db;
    })
    .map((row, idx) => ({ ...row, nro: idx + 1 }));

  const totalPresupuestoArs = sum(presupuestoRows.map((r) => r.subtotal_neto));
  const totalPresupuestoCac = sum(presupuestoRows.map((r) => r.cac_equivalente));
  const totalRecibidoArs = sum(movimientoRows.map((r) => r.pago_neto_ars));
  const totalRecibidoCac = round2(sum(movimientoRows.map((r) => r.cac_recibidos)));
  const saldoCac = totalPresupuestoCac - totalRecibidoCac;
  const saldoArsHoy = cacHoy > 0 ? saldoCac * cacHoy : 0;

  return {
    amountField,
    cac_hoy: cacHoy,
    presupuesto: {
      rows: presupuestoRows,
      totals: {
        subtotal_neto: totalPresupuestoArs,
        cac_equivalente: totalPresupuestoCac,
      },
    },
    recibidos: {
      rows: movimientoRows,
      totals: {
        pago_neto_ars: totalRecibidoArs,
        cac_recibidos: totalRecibidoCac,
      },
    },
    saldo: {
      cac: saldoCac,
      ars_hoy: saldoArsHoy,
    },
  };
}

/**
 * Procesa un control presupuestario mensual.
 * Columnas = categorías seleccionadas, filas = meses, avance = acumulado / presupuesto objetivo.
 */
export function processMonthlyBudgetControl(block, movimientos, presupuestos, currencies, cotizaciones, extraContext = {}) {
  const displayCurrency = currencies[0];
  const tipoTarget = block.tipo_presupuesto || 'egreso';
  const baseMovimientos = Array.isArray(movimientos) ? movimientos : [];
  const runtimeFilteredMovimientos = extraContext?.filters
    ? filterMovimientos(baseMovimientos, extraContext.filters, extraContext)
    : baseMovimientos;
  const runtimeProjectIds = new Set((extraContext?.filters?.proyectos || []).map((id) => String(id)));
  const runtimeCategorySet = toNormalizedSet(extraContext?.filters?.categorias || []);
  const selectedPresupuestoIds = new Set(
    (Array.isArray(block.presupuesto_ids) ? block.presupuesto_ids : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );
  const hasPresupuestoScope = selectedPresupuestoIds.size > 0;

  let presFiltered = Array.isArray(presupuestos) ? [...presupuestos] : [];
  if (tipoTarget !== 'ambos') {
    presFiltered = presFiltered.filter((p) => (p.tipo || 'egreso') === tipoTarget);
  }
  if (hasPresupuestoScope) {
    presFiltered = presFiltered.filter((p) => selectedPresupuestoIds.has(getPresupuestoId(p)));
  }
  if (!hasPresupuestoScope && runtimeProjectIds.size > 0) {
    presFiltered = presFiltered.filter((p) => runtimeProjectIds.has(getPresupuestoProjectInfo(p).id));
  }
  if (!hasPresupuestoScope && runtimeCategorySet.size > 0) {
    presFiltered = presFiltered.filter((p) =>
      getPresupuestoCategorias(p).some((cat) =>
        runtimeCategorySet.has(normalizeCategoryFilterValue(cat))
      )
    );
  }

  const configuredCategories = sanitizeStringList(block.categorias_control);
  const hasCategorias = (p) => (Array.isArray(p?.clasificaciones) && p.clasificaciones.length > 0) || !!p?.rubro;
  const isGeneralPresupuesto = (p) => !hasCategorias(p) && !p?.etapa && !presupuestoTieneProveedores(p);
  const isCategoryOnlyPresupuesto = (p) => hasCategorias(p) && !p?.etapa && !presupuestoTieneProveedores(p);
  const categoryBudgetItems = hasPresupuestoScope ? presFiltered : presFiltered.filter(isCategoryOnlyPresupuesto);
  const generalBudgetItems = hasPresupuestoScope ? [] : presFiltered.filter(isGeneralPresupuesto);
  const presupuestoScopedMovimientos = hasPresupuestoScope
    ? runtimeFilteredMovimientos.filter((m) => presFiltered.some((p) => movimientoMatchesPresupuesto(m, p)))
    : runtimeFilteredMovimientos;

  const sumPresupuestos = (items) => items.reduce(
    (acc, p) => acc + Math.abs(getPresupuestoAmount(p, displayCurrency, cotizaciones)),
    0,
  );

  let categories = configuredCategories;
  if (!hasPresupuestoScope && categories.length === 0 && Array.isArray(extraContext?.filters?.categorias) && extraContext.filters.categorias.length > 0) {
    categories = sanitizeStringList(extraContext.filters.categorias);
  }
  if (categories.length === 0) {
    const byCategory = new Map();
    for (const p of categoryBudgetItems) {
      const monto = Math.abs(getPresupuestoAmount(p, displayCurrency, cotizaciones));
      const presupuestoCategorias = hasPresupuestoScope && !hasCategorias(p) ? [] : getPresupuestoCategorias(p);
      for (const label of presupuestoCategorias) {
        const key = normalizeCategoryFilterValue(label);
        const current = byCategory.get(key) || { label, total: 0 };
        current.total += monto;
        byCategory.set(key, current);
      }
    }
    categories = [...byCategory.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((c) => c.label);
  }

  if (categories.length === 0) {
    const byCategory = new Map();
    for (const m of presupuestoScopedMovimientos) {
      const label = m?.categoria || 'Sin categoría';
      const key = normalizeCategoryFilterValue(label);
      const current = byCategory.get(key) || { label, total: 0 };
      current.total += Math.abs(getAmount(m, displayCurrency, block.campo_monto || 'total'));
      byCategory.set(key, current);
    }
    categories = [...byCategory.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((c) => c.label);
  }

  if (categories.length === 0) categories = ['Sin categoría'];

  const categoryKeys = categories.map((c) => normalizeCategoryFilterValue(c));
  const categoryKeySet = new Set(categoryKeys);

  let presupuestoTotal = Number(block.presupuesto_total_manual || 0);
  if (!Number.isFinite(presupuestoTotal) || presupuestoTotal <= 0) {
    if (hasPresupuestoScope) {
      presupuestoTotal = sumPresupuestos(presFiltered);
    } else {
      const generalTotal = sumPresupuestos(generalBudgetItems);
      const selectedCategoryTotal = sumPresupuestos(
        categoryBudgetItems.filter((p) =>
          getPresupuestoCategorias(p).some((cat) =>
            categoryKeySet.has(normalizeCategoryFilterValue(cat))
          )
        ),
      );
      const allCategoryTotal = sumPresupuestos(categoryBudgetItems);
      const shouldScopeToVisibleCategories = categoryKeySet.size > 0;

      // Misma intención que Control de Presupuestos:
      // si hay presupuesto general de egresos, funciona como techo del proyectado;
      // si las categorías asignadas superan ese techo, se muestra la suma real asignada.
      if (shouldScopeToVisibleCategories && selectedCategoryTotal > 0) {
        presupuestoTotal = selectedCategoryTotal;
      } else {
        presupuestoTotal = generalTotal > 0
          ? Math.max(generalTotal, allCategoryTotal)
          : allCategoryTotal;
      }
    }
  }

  let data = applyBlockFilters(presupuestoScopedMovimientos, {
    ...block,
    filtro_tipo: tipoTarget === 'ambos' ? null : tipoTarget,
  });
  if (categoryKeySet.size > 0) {
    data = data.filter((m) => categoryKeySet.has(normalizeCategoryFilterValue(m.categoria)));
  }

  const dateCandidates = [
    toPlainDate(block.fecha_inicio),
    toPlainDate(block.fecha_fin),
    toPlainDate(extraContext?.filters?.fecha_from),
    toPlainDate(extraContext?.filters?.fecha_to),
    ...data.map(toDate),
  ].filter(Boolean);

  let startDate = toPlainDate(block.fecha_inicio) || toPlainDate(extraContext?.filters?.fecha_from);
  let endDate = toPlainDate(block.fecha_fin) || toPlainDate(extraContext?.filters?.fecha_to);

  if (!startDate && dateCandidates.length > 0) {
    startDate = new Date(Math.min(...dateCandidates.map((d) => d.getTime())));
  }
  if (!endDate && dateCandidates.length > 0) {
    endDate = new Date(Math.max(...dateCandidates.map((d) => d.getTime())));
  }
  if (!startDate || !endDate) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = startDate;
  }

  startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  if (startDate > endDate) {
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }

  const monthKeys = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    monthKeys.push(getMonthKeyFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const byMonth = new Map();
  for (const key of monthKeys) {
    byMonth.set(key, {
      mes: key,
      mesLabel: formatMonthKey(key),
      categorias: Object.fromEntries(categories.map((c) => [c, 0])),
      total: 0,
      total_cac: 0,
      acumulado: 0,
      acumulado_cac: 0,
      porcentaje_avance: 0,
      _movimientos: [],
      _movimientos_by_category: Object.fromEntries(categories.map((c) => [c, []])),
    });
  }

  for (const m of data) {
    const key = getMes(m);
    if (!byMonth.has(key)) continue;
    const categoryIndex = categoryKeys.indexOf(normalizeCategoryFilterValue(m.categoria));
    if (categoryIndex === -1) continue;
    const label = categories[categoryIndex];
    const amountField = block.campo_monto || 'total';
    const amount = Math.abs(getAmount(m, displayCurrency, amountField));
    const amountCac = Math.abs(getAmount(m, 'CAC', amountField));
    const row = byMonth.get(key);
    row.categorias[label] = (row.categorias[label] || 0) + amount;
    row.total += amount;
    row.total_cac += amountCac;
    row._movimientos.push(m);
    row._movimientos_by_category[label].push(m);
  }

  let acumulado = 0;
  let acumuladoCac = 0;
  const rows = [...byMonth.values()].map((row) => {
    acumulado += row.total;
    acumuladoCac += row.total_cac;
    return {
      ...row,
      acumulado,
      acumulado_cac: acumuladoCac,
      porcentaje_avance: presupuestoTotal > 0 ? acumulado / presupuestoTotal : 0,
    };
  });

  const totalsByCategory = Object.fromEntries(categories.map((c) => [c, 0]));
  for (const row of rows) {
    for (const c of categories) {
      totalsByCategory[c] += row.categorias[c] || 0;
    }
  }
  const totalEjecutado = rows.reduce((acc, row) => acc + row.total, 0);
  const totalEjecutadoCac = rows.reduce((acc, row) => acc + row.total_cac, 0);

  return {
    obra_nombre: block.obra_nombre || extraContext?.projectName || '',
    fecha_inicio: startDate.toISOString(),
    fecha_fin: endDate.toISOString(),
    presupuesto_label: block.presupuesto_label || 'Egresos proyectados',
    presupuesto_total: presupuestoTotal,
    categories,
    rows,
    campo_monto: block.campo_monto || 'total',
    totals: {
      label: 'Total',
      categorias: totalsByCategory,
      total: totalEjecutado,
      total_cac: totalEjecutadoCac,
      acumulado: totalEjecutado,
      acumulado_cac: totalEjecutadoCac,
      porcentaje_avance: presupuestoTotal > 0 ? totalEjecutado / presupuestoTotal : 0,
    },
  };
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeStringList(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const label = String(value || '').trim();
    if (!label) continue;
    const key = normalizeFilterText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
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
  // diferencia > 0: tiene saldo por encima del ideal, por lo tanto debe transferir
  const deudores = socios
    .filter((s) => s.diferencia > epsilon)
    .map((s) => ({ ...s, restante: round2(s.diferencia) }))
    .sort((a, b) => b.restante - a.restante);
  // diferencia < 0: esta por debajo del ideal, por lo tanto debe recibir
  const acreedores = socios
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
              ? 'Debe'
              : 'Le deben',
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
  monthly_budget_control: processMonthlyBudgetControl,
  category_budget_matrix: processCategoryBudgetMatrix,
  income_budget_control: processIncomeBudgetControl,
  chart: processChart,
  grouped_detail: processGroupedDetail,
  balance_between_partners: processBalanceBetweenPartners,
  category_subcategory_accordion: processCategorySubcategoryAccordion,
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
  const processorContext = { ...(extraContext || {}), reportConfig };

  return layout.map((block) => {
    const processor = BLOCK_PROCESSORS[block.type];
    if (!processor) {
      return { type: block.type, titulo: block.titulo, data: null, error: `Tipo desconocido: ${block.type}` };
    }

    try {
      const data = processor(block, movimientos, presupuestos, currencies, cotizaciones, processorContext);
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
    categoria: (m) => (m?.categoria == null || m?.categoria === '' ? 'Sin categoría' : m.categoria),
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
export function formatValue(value, formato, displayCurrency = 'ARS', options = {}) {
  if (value == null || isNaN(value)) return '-';

  switch (formato) {
    case 'currency': {
      const prefix = displayCurrency === 'ARS' ? '$' : displayCurrency === 'USD' ? 'U$D ' : '';
      const suffix = displayCurrency === 'CAC' ? ' CAC' : '';
      const defaultFractionDigits = displayCurrency === 'CAC' ? 2 : 0;
      const maxFrac = options.maximumFractionDigits != null ? options.maximumFractionDigits : defaultFractionDigits;
      const minFrac = options.minimumFractionDigits != null ? options.minimumFractionDigits : maxFrac;
      return `${prefix}${Number(value).toLocaleString('es-AR', {
        minimumFractionDigits: minFrac,
        maximumFractionDigits: maxFrac,
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
