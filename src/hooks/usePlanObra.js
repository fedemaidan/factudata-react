// src/hooks/usePlanObra.js
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPlanObra,
  upsertPlanObra,
  addEtapa as svcAddEtapa,
  updateEtapa as svcUpdateEtapa,
  deleteEtapa as svcDeleteEtapa,
  addMaterial as svcAddMaterial,
  updateMaterial as svcUpdateMaterial,
  deleteMaterial as svcDeleteMaterial,
  addCertificado as svcAddCertificado,
  updateCertificado as svcUpdateCertificado,
  deleteCertificado as svcDeleteCertificado,
  recalcularPlan as svcRecalcular,
} from 'src/services/planObraService';
import { getEmpresaById } from 'src/services/empresaService';
import { getProyectoById } from 'src/services/proyectosService';


 const toPlain = (maybeWrapper) =>
   maybeWrapper && maybeWrapper.ok === undefined && maybeWrapper.data === undefined
     ? maybeWrapper                              // ya es plan
     : (maybeWrapper?.data ?? maybeWrapper); 

export function usePlanObra(
  proyectoIdInput,
  { defaultMoneda = 'ARS', bootstrapFromEmpresa = false } = {}
) {
  const proyectoId = Array.isArray(proyectoIdInput) ? proyectoIdInput[0] : proyectoIdInput;

  const [data, setData] = useState(null); // acá guardamos el plan completo
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [proyectoInfo, setProyectoInfo] = useState(null);

  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);      
  const mutReqIdRef = useRef(0); 
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
      const info = {
        nombre: p?.nombre || 'Proyecto',
        moneda: p?.moneda || defaultMoneda,
        empresaId: p?.empresaId || p?.empresa?.id || p?.empresa?._id || null,
      };
      setProyectoInfo(info);
      return info;
    } catch {
      const info = { nombre: 'Proyecto', moneda: defaultMoneda, empresaId: null };
      setProyectoInfo(info);
      return info;
    }
  }, [proyectoId, defaultMoneda]);



  const savePlan = useCallback(async (payload) => {
    if (!proyectoId) throw new Error('proyectoId requerido');
  
    const myMut = ++mutReqIdRef.current;   // invalida respuestas viejas
    setStatus('loading');
    setError(null);
  
    try {
      // 👉 upsertPlanObra ahora retorna directamente el plan (objeto)
      const plan = toPlain(await upsertPlanObra(proyectoId, payload));
  
      // si desmontó o llegó una mutación más nueva, no pises estado
      if (!mountedRef.current || myMut !== mutReqIdRef.current) return plan;
  
      // invalido fetches en vuelo más viejos para evitar carreras
      reqIdRef.current = mutReqIdRef.current;
  
      setData(plan);        // 🔑 guardamos el plan, NO un wrapper
      setNotFound(false);
      setStatus('success');
      return plan;
    } catch (err) {
      if (!mountedRef.current) throw err;
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [proyectoId]);
  

  const createEmptyPlan = useCallback(async () => {
    const info = proyectoInfo || (await fetchProyectoInfo());
    const payload = {
      proyectoId: String(proyectoId),
      nombreProyecto: info?.nombre || 'Proyecto',
      moneda: info?.moneda || defaultMoneda,
      etapas: [],
    };
    return savePlan(payload);
  }, [proyectoId, proyectoInfo, fetchProyectoInfo, defaultMoneda, savePlan]);

  const createFromEmpresaInternal = useCallback(async () => {
    const info = proyectoInfo || (await fetchProyectoInfo());
    if (!info?.empresaId) return createEmptyPlan();
    const empresa = await getEmpresaById(info.empresaId);
    const etapasEmpresa = (empresa?.etapas || []).map(e => ({
      nombre: e.nombre,
      materiales: e.materiales || [],
      certificados: e.certificados || [],
    }));
    const payload = {
      proyectoId: String(proyectoId),
      nombreProyecto: info?.nombre || 'Proyecto',
      moneda: info?.moneda || defaultMoneda,
      etapas: etapasEmpresa,
    };
    return savePlan(payload);
  }, [proyectoId, proyectoInfo, fetchProyectoInfo, defaultMoneda, savePlan, createEmptyPlan]);

  const createFromEmpresa = useCallback(async () => createFromEmpresaInternal(), [createFromEmpresaInternal]);

  const fetchPlan = useCallback(async () => {
    if (!proyectoId) return;
    const myReq = ++reqIdRef.current;
    setStatus('loading');
    setError(null);

    try {
      const planResp = await getPlanObra(proyectoId);
      if (!mountedRef.current || myReq !== reqIdRef.current) return;

      if (!planResp) {
        setNotFound(true);
        setStatus('success');
        await fetchProyectoInfo();
        if (bootstrapFromEmpresa) await createFromEmpresaInternal();
        return;
      }

      setData(toPlain(planResp));                
      setStatus('success');
    } catch (err) {
      if (!mountedRef.current || myReq !== reqIdRef.current) return;
      setError(err);
      setStatus('error');
    }
  }, [proyectoId, bootstrapFromEmpresa, fetchProyectoInfo, createFromEmpresaInternal]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);
  // =========================
  // Métodos granulares (usan planId del plan cargado)
  // =========================
  const getPlanId = () => data?._id || data?.id;

  const mutateSetData = (updated) => {
    setData(updated);
  };

  const addEtapa = useCallback(async (etapa) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcAddEtapa(planId, etapa);
    setData(updated);
    return updated;
  }, [data]);
  
  const updateEtapa = useCallback(async (etapaId, parcial) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcUpdateEtapa(planId, etapaId, parcial);
    setData(updated);
    return updated;
  }, [data]);
  
  const deleteEtapa = useCallback(async (etapaId) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcDeleteEtapa(planId, etapaId);
    setData(updated);
    return updated;
  }, [data]);
  

  const addMaterialToEtapa = useCallback(async (etapaId, material) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcAddMaterial(planId, etapaId, material);
    setData(updated);
    return updated;
  }, [data]);
  
  const updateMaterialInEtapa = useCallback(async (etapaId, materialId, parcial) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcUpdateMaterial(planId, etapaId, materialId, parcial);
    setData(updated);
    return updated;
  }, [data]);
  
  const deleteMaterialInEtapa = useCallback(async (etapaId, materialId) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcDeleteMaterial(planId, etapaId, materialId);
    setData(updated);
    return updated;
  }, [data]);

  const addCertificadoToEtapa = useCallback(async (etapaId, cert) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcAddCertificado(planId, etapaId, cert);
    setData(updated);
    return updated;
  }, [data]);
  
  const updateCertificadoInEtapa = useCallback(async (etapaId, certId, parcial) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcUpdateCertificado(planId, etapaId, certId, parcial);
    setData(updated);
    return updated;
  }, [data]);
  
  const deleteCertificadoInEtapa = useCallback(async (etapaId, certId) => {
    const planId = getPlanId(); if (!planId) throw new Error('planId no disponible');
    const updated = await svcDeleteCertificado(planId, etapaId, certId);
    setData(updated);
    return updated;
  }, [data]);
  

  const recalcular = useCallback(async () => {
    if (!proyectoId) throw new Error('proyectoId requerido');
    const r = await svcRecalcular(proyectoId);
    // si tu backend devuelve plan/caches, podés opcionalmente refrescar
    return r;
  }, [proyectoId]);

  return {
    data, status, error, notFound, proyectoInfo, refresh: fetchPlan,
    savePlan, createEmptyPlan, createFromEmpresa,
    addEtapa, updateEtapa, deleteEtapa,
    addMaterialToEtapa, updateMaterialInEtapa, deleteMaterialInEtapa,
    addCertificadoToEtapa, updateCertificadoInEtapa, deleteCertificadoInEtapa,
    recalcular,
  };
  
}
