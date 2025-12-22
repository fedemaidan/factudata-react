import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Paper, Stack, Chip } from '@mui/material';


const FiltroTrabajoDiario = ({ stats = {}, onChange }) => {
  const router = useRouter();

  const selectedKey = useMemo(() => {
    const estadoQ = Array.isArray(router.query.estado) ? router.query.estado[0] : router.query.estado;
    const filtroQ = Array.isArray(router.query.filtro) ? router.query.filtro[0] : router.query.filtro;
    return filtroQ || estadoQ || 'todos';
  }, [router.query.estado, router.query.filtro]);

  const setFiltro = useCallback((nuevo) => {
    const nextQuery = { ...router.query };

    // Limpia ambos para que no queden combinaciones inválidas
    delete nextQuery.estado;
    delete nextQuery.filtro;
    delete nextQuery.page;

    if (nuevo && nuevo !== 'todos') {
      if (['sinParte', 'sinHoras', 'conLicencia'].includes(nuevo)) {
        nextQuery.filtro = nuevo;
      } else {
        nextQuery.estado = nuevo;
      }
    }

    router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    if (onChange) onChange(nuevo);
  }, [router, onChange]);

  const chips = useMemo(() => ([
    { key: 'todos', label: `Todos (${stats.total || 0})`, color: selectedKey === 'todos' ? 'primary' : undefined, variant: undefined },
    { key: 'ok', label: `Completos (${stats.ok || 0})`, color: 'success', variant: undefined },
    { key: 'incompleto', label: `Incompleto (${stats.incompleto || 0})`, color: 'warning', variant: undefined },
    { key: 'advertencia', label: `Advertencias (${stats.advertencia || 0})`, color: 'error', variant: undefined },
    { key: 'sinParte', label: `Sin parte (${stats.sinParte || 0})`, color: undefined, variant: 'outlined' },
    { key: 'sinHoras', label: `Sin horas (${stats.sinHoras || 0})`, color: undefined, variant: 'outlined' },
    { key: 'conLicencia', label: `Con licencia (${stats.conLicencia || 0})`, color: undefined, variant: 'outlined' },
  ]), [stats, selectedKey]);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {chips.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            onClick={() => setFiltro(c.key)}
            color={c.key === selectedKey ? 'primary' : c.color}
            variant={c.variant}
          />
        ))}
      </Stack>
    </Paper>
  );
};

export default FiltroTrabajoDiario;


