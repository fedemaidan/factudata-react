import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const readQueryString = (value) => (Array.isArray(value) ? value[0] : value);

const ensureNonNegInt = (value, fallback = 0) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const ensureLimit = (value, fallback = 200, max = 500) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

const normalizeSort = (sortRaw, fallback = 'fecha:desc') => {
  const raw = typeof sortRaw === 'string' ? sortRaw.trim() : '';
  if (!raw) return fallback;
  if (!raw.includes(':')) return `${raw}:desc`;
  const [field, dir] = raw.split(':');
  const f = (field || '').trim() || 'fecha';
  const d = (dir || '').trim().toLowerCase();
  return `${f}:${d === 'asc' ? 'asc' : 'desc'}`;
};

const buildNextQuery = (currentQuery, patch = {}) => {
  const next = { ...currentQuery, ...patch };
  Object.keys(next).forEach((k) => {
    const v = next[k];
    if (v === undefined || v === null || v === '') delete next[k];
  });
  return next;
};

export default function useTrabajoDiarioFilters(options = {}) {
  const router = useRouter();
  const {
    defaultLimit = 200,
    defaultSort = 'fecha:desc',
    debounceMs = 350,
  } = options || {};

  const estado = (() => {
    const v = readQueryString(router.query.estado);
    return v ? String(v) : 'todos';
  })();

  const filtro = (() => {
    const v = readQueryString(router.query.filtro);
    return v ? String(v) : null;
  })();

  const q = (() => {
    const v = readQueryString(router.query.q);
    return v ? String(v) : '';
  })();

  const page = ensureNonNegInt(readQueryString(router.query.page), 0);
  const limit = ensureLimit(readQueryString(router.query.limit), defaultLimit, 500);
  const offset = page * limit;

  const sort = normalizeSort(readQueryString(router.query.sort), defaultSort);
  const sortField = sort.split(':')[0] || 'fecha';
  const sortDirection = sort.split(':')[1] === 'asc' ? 'asc' : 'desc';

  const replaceQuery = useCallback((patch, { resetPage = false } = {}) => {
    const nextQuery = buildNextQuery(router.query, patch);
    if (resetPage) {
      delete nextQuery.page;
    }
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const setEstado = (nextEstado) => {
    const nuevo = String(nextEstado || '').trim();
    if (!nuevo || nuevo === 'todos') {
      replaceQuery({ estado: undefined }, { resetPage: true });
      return;
    }
    replaceQuery({ estado: nuevo, filtro: undefined }, { resetPage: true });
  };

  const setFiltro = (nextFiltro) => {
    const nuevo = String(nextFiltro || '').trim();
    if (!nuevo || nuevo === 'todos') {
      replaceQuery({ filtro: undefined }, { resetPage: true });
      return;
    }
    replaceQuery({ filtro: nuevo, estado: undefined }, { resetPage: true });
  };

  const setPage = (nextPage) => {
    const p = ensureNonNegInt(nextPage, 0);
    replaceQuery({ page: p ? String(p) : undefined });
  };

  const setLimit = (nextLimit) => {
    const l = ensureLimit(nextLimit, defaultLimit, 500);
    replaceQuery({ limit: String(l) }, { resetPage: true });
  };

  const setSort = (field) => {
    const f = String(field || '').trim();
    if (!f) return;
    const nextDir = f === sortField ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
    replaceQuery({ sort: `${f}:${nextDir}` }, { resetPage: true });
  };

  const [qInput, setQInput] = useState(q);
  const debounceRef = useRef(null);
  const lastAppliedRef = useRef(q);

  useEffect(() => {
    setQInput(q);
    lastAppliedRef.current = q;
  }, [q]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const nextQ = String(qInput || '').trim();
      if (nextQ === lastAppliedRef.current) return;
      lastAppliedRef.current = nextQ;
      replaceQuery({ q: nextQ || undefined }, { resetPage: true });
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [qInput, debounceMs, replaceQuery]);

  return {
    estado,
    filtro,
    q,
    qInput,
    setQInput,
    page,
    limit,
    offset,
    sort,
    sortField,
    sortDirection,
    setEstado,
    setFiltro,
    setPage,
    setLimit,
    setSort,
  };
}


