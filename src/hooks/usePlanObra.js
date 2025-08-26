// src/hooks/usePlanObra.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlanObra, upsertPlanObra } from 'src/services/planObraService';
import { getEmpresaById } from 'src/services/empresaService';
import { getProyectoById } from 'src/services/proyectosService';

export function usePlanObra(
  proyectoIdInput,
  {
    // defaults si el proyecto no provee algo
    defaultMoneda = 'ARS',
    bootstrapFromEmpresa = false // si querés autoinicializar desde empresa apenas no exista
  } = {}
) {
  const proyectoId = Array.isArray(proyectoIdInput) ? proyectoIdInput[0] : proyectoIdInput;

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');   // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Datos del proyecto (para bootstrap)
  const [proyectoInfo, setProyectoInfo] = useState(null); // { nombre, moneda, empresaId, ... }

  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // reset al cambiar proyecto
  useEffect(() => {
    setData(null);
    setError(null);
    setNotFound(false);
    setProyectoInfo(null);
    setStatus(proyectoId ? 'loading' : 'idle');
  }, [proyectoId]);

  const fetchProyectoInfo = useCallback(async () => {
    if (!proyectoId) return null;
    try {
      const p = await getProyectoById(proyectoId);
      // Ajustá los nombres de campos según tu servicio real
      // Ejemplo asume: { id, nombre, moneda, empresaId }
      const info = {
        nombre: p?.nombre || 'Proyecto',
        moneda: p?.moneda || defaultMoneda,
        empresaId: p?.empresaId || p?.empresa?.id || p?.empresa?._id || null
      };
      setProyectoInfo(info);
      return info;
    } catch (e) {
      // si el servicio falla, seguimos con defaults
      const info = { nombre: 'Proyecto', moneda: defaultMoneda, empresaId: null };
      setProyectoInfo(info);
      return info;
    }
  }, [proyectoId, defaultMoneda]);

  const fetchPlan = useCallback(async () => {
    if (!proyectoId) return;
    const myReq = ++reqIdRef.current;
    setStatus('loading');
    setError(null);

    try {
      const plan = await getPlanObra(proyectoId); // devuelve null si 404 (ver service)
      if (!mountedRef.current || myReq !== reqIdRef.current) return;

      if (!plan) {
        setNotFound(true);
        setStatus('success'); // mostramos CTA
        // precargamos info del proyecto para el CTA
        await fetchProyectoInfo();

        // Si querés bootstrap automático (opcional):
        if (bootstrapFromEmpresa) {
          await createFromEmpresaInternal();
        }
        return;
      }

      setData(plan);
      setStatus('success');
    } catch (err) {
      if (!mountedRef.current || myReq !== reqIdRef.current) return;
      setError(err);
      setStatus('error');
    }
  }, [proyectoId, bootstrapFromEmpresa, fetchProyectoInfo]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const savePlan = useCallback(async (payload) => {
    if (!proyectoId) throw new Error('proyectoId requerido');
    setStatus('loading');
    setError(null);
    try {
      const res = await upsertPlanObra(proyectoId, payload);
      if (!mountedRef.current) return res;
      setData(res);
      setNotFound(false);
      setStatus('success');
      return res;
    } catch (err) {
      if (!mountedRef.current) throw err;
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [proyectoId]);

  // Crear plan vacío usando datos del proyecto
  const createEmptyPlan = useCallback(async () => {
    const info = proyectoInfo || (await fetchProyectoInfo());
    const payload = {
      proyectoId: String(proyectoId),
      nombreProyecto: info?.nombre || 'Proyecto',
      moneda: info?.moneda || defaultMoneda,
      etapas: []
    };
    return savePlan(payload);
  }, [proyectoId, proyectoInfo, fetchProyectoInfo, defaultMoneda, savePlan]);

  // Crear plan copiando etapas de la empresa del proyecto
  const createFromEmpresaInternal = useCallback(async () => {
    const info = proyectoInfo || (await fetchProyectoInfo());
    if (!info?.empresaId) {
      // si no hay empresa en el proyecto, creamos vacío
      return createEmptyPlan();
    }
    const empresa = await getEmpresaById(info.empresaId);
    const etapasEmpresa = (empresa?.etapas || []).map(e => ({
      nombre: e.nombre,
      materiales: e.materiales || [],
      certificados: e.certificados || []
    }));
    const payload = {
      proyectoId: String(proyectoId),
      nombreProyecto: info?.nombre || 'Proyecto',
      moneda: info?.moneda || defaultMoneda,
      etapas: etapasEmpresa
    };
    return savePlan(payload);
  }, [proyectoId, proyectoInfo, fetchProyectoInfo, defaultMoneda, savePlan, createEmptyPlan]);

  const createFromEmpresa = useCallback(async () => {
    return createFromEmpresaInternal();
  }, [createFromEmpresaInternal]);

  return {
    data,
    status,
    error,
    notFound,
    proyectoInfo,          // nombre/moneda/empresaId del proyecto
    refresh: fetchPlan,
    savePlan,
    createEmptyPlan,
    createFromEmpresa
  };
}
