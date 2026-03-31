import { useCallback, useEffect, useRef, useState } from 'react';
import planCobroService from 'src/services/planCobroService';

const unwrap = (res) => {
  const d = res?.data;
  if (d?.ok) return d.data;
  throw new Error(d?.error || 'Error desconocido');
};

export function usePlanesCobroList(empresaId, filters = {}) {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cargarPlanes = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await planCobroService.listarPlanes(empresaId, filters);
      if (!mountedRef.current) return;
      setPlanes(unwrap(res) ?? []);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, JSON.stringify(filters)]);

  useEffect(() => { cargarPlanes(); }, [cargarPlanes]);

  return { planes, loading, error, refresh: cargarPlanes };
}

export function usePlanCobro(planId, empresaId) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cargarPlan = useCallback(async () => {
    if (!planId || !empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await planCobroService.getPlan(planId, empresaId);
      if (!mountedRef.current) return;
      setPlan(unwrap(res));
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [planId, empresaId]);

  useEffect(() => { cargarPlan(); }, [cargarPlan]);

  const confirmarPlan = useCallback(async (cuotas) => {
    const res = await planCobroService.confirmarPlan(planId, { empresa_id: empresaId, cuotas });
    const updated = unwrap(res);
    setPlan(updated);
    return updated;
  }, [planId, empresaId]);

  const marcarCobrada = useCallback(async (cuotaId, opciones = {}) => {
    const res = await planCobroService.marcarCuotaCobrada(planId, cuotaId, {
      empresa_id: empresaId,
      ...opciones,
    });
    const updated = unwrap(res);
    setPlan(updated);
    return updated;
  }, [planId, empresaId]);

  const revertirCobro = useCallback(async (cuotaId) => {
    const res = await planCobroService.revertirCobro(planId, cuotaId, {
      empresa_id: empresaId,
    });
    const updated = unwrap(res);
    setPlan(updated);
    return updated;
  }, [planId, empresaId]);

  return { plan, loading, error, refresh: cargarPlan, confirmarPlan, marcarCobrada, revertirCobro };
}
