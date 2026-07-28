// Carga los datasets de la Vista única de obra (TAR-579) reusando los MISMOS
// servicios que el motor de reportes: movimientos por proyecto, presupuestos y
// planes de cobro. No pasa por el "report config" del hook useReportData porque
// esta pantalla no es un reporte configurable, es un dashboard fijo.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import api from 'src/services/axiosConfig';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoService from 'src/services/presupuestoService';
import planCobroService from 'src/services/planCobroService';
import MonedasService from 'src/services/monedasService';

async function fetchMovimientosDeProyectos(proyectoIds = []) {
  if (proyectoIds.length === 0) return [];
  const results = await Promise.all(
    proyectoIds.map((pid) =>
      api
        .get(`movimientos/proyecto/${pid}`, { params: { sort: 'fecha_factura', order: 'desc' } })
        .then((res) => res.data?.movimientos || res.data || [])
        .catch(() => []),
    ),
  );
  return results.flat();
}

export function useVistaObraData(user) {
  // 1. Empresa del usuario.
  const empresaQuery = useQuery({
    queryKey: ['vistaObra', 'empresa', user?.id],
    queryFn: () => getEmpresaDetailsFromUser(user),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const empresaId = empresaQuery.data?.id || null;

  // 2. Proyectos del usuario.
  const proyectosQuery = useQuery({
    queryKey: ['vistaObra', 'proyectos', user?.id],
    queryFn: () => getProyectosFromUser(user),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const proyectos = useMemo(
    () => (proyectosQuery.data || []).filter((p) => p?.activo !== false),
    [proyectosQuery.data],
  );
  const proyectoIds = useMemo(() => proyectos.map((p) => p.id), [proyectos]);

  // 3. Movimientos de todos los proyectos.
  const movimientosQuery = useQuery({
    queryKey: ['vistaObra', 'movimientos', proyectoIds],
    queryFn: () => fetchMovimientosDeProyectos(proyectoIds),
    enabled: proyectoIds.length > 0,
    staleTime: 60 * 1000,
  });

  // 4. Presupuestos de la empresa.
  const presupuestosQuery = useQuery({
    queryKey: ['vistaObra', 'presupuestos', empresaId],
    queryFn: () => PresupuestoService.listarPresupuestos(empresaId),
    enabled: !!empresaId,
    staleTime: 60 * 1000,
    select: (data) => data?.presupuestos || data || [],
  });

  // 5. Planes de cobro de la empresa.
  const planesQuery = useQuery({
    queryKey: ['vistaObra', 'planes', empresaId],
    queryFn: () => planCobroService.listarPlanes(empresaId),
    enabled: !!empresaId,
    staleTime: 60 * 1000,
    select: (res) => res?.data?.data || res?.data || [],
  });

  // 6. Cotización del dólar (fallback de conversión para lo que no trae equivalente).
  const dolarQuery = useQuery({
    queryKey: ['vistaObra', 'dolar'],
    queryFn: () => MonedasService.listarDolar({ limit: 1 }),
    staleTime: 30 * 60 * 1000,
    select: (arr) => {
      const d = Array.isArray(arr) ? arr[0] : arr;
      return Number(d?.blue?.venta || d?.blue?.promedio || 0) || 0;
    },
  });

  const loading =
    empresaQuery.isLoading ||
    proyectosQuery.isLoading ||
    movimientosQuery.isLoading ||
    presupuestosQuery.isLoading ||
    planesQuery.isLoading;

  const error =
    empresaQuery.error ||
    proyectosQuery.error ||
    movimientosQuery.error ||
    presupuestosQuery.error ||
    planesQuery.error ||
    null;

  return {
    empresaId,
    empresa: empresaQuery.data || null,
    proyectos,
    movimientos: movimientosQuery.data || [],
    presupuestos: presupuestosQuery.data || [],
    planes: planesQuery.data || [],
    dolar: dolarQuery.data || 0,
    loading,
    error,
  };
}
