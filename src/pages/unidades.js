import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Divider } from '@mui/material';
import { useRouter } from 'next/router';
// Agregamos esto arriba junto con otros imports
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Add } from '@mui/icons-material';


import UnidadDialog from 'src/components/unidadDialog';

import { groupByPath } from 'src/utils/groupByPath';
import { formatCurrency } from 'src/utils/formatters';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa, getProyectoById, updateProyecto } from 'src/services/proyectosService';
import ClonarUnidadDialog from 'src/components/clonarUnidadDialog';
import TreeNode from 'src/components/treeNode';

function UnidadesTreeViewPage() {
  const router = useRouter();
  const { empresaId } = router.query;

  const [empresa, setEmpresa] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [subproyectos, setSubproyectos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [agrupados, setAgrupados] = useState({});
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [popClonar, setPopClonar] = useState({ open: false, origen: '', items: [] });
  const [nuevoPath, setNuevoPath] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!empresaId) return;
      const empresaData = await getEmpresaById(empresaId);
      setEmpresa(empresaData);
      const proyectos = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectos);
      const todosSubproyectos = proyectos.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
    };
    fetchData();
  }, [empresaId]);

  useEffect(() => {
    const filtrados = subproyectos.filter(sp => {
      const pathString = (sp.path || []).join(' ').toLowerCase();
      return sp.nombre.toLowerCase().includes(filtro.toLowerCase()) || pathString.includes(filtro.toLowerCase());
    });
    setAgrupados(groupByPath(filtrados));
  }, [filtro, subproyectos]);

  const calcularTotalesProyecto = (paths) => {
    let total = 0;
    let vendido = 0;
    Object.values(paths).forEach(nodo => {
      total += nodo.__items.reduce((acc, sp) => acc + (parseFloat(sp.valor) || 0), 0);
      vendido += nodo.__items
        .filter(sp => sp.estado?.toLowerCase() === 'vendido')
        .reduce((acc, sp) => acc + (parseFloat(sp.valor) || 0), 0);
    });
    return { total, vendido };
  };

  const handleUnidadChange = (field, value) => {
    setUnidadSeleccionada(prev => ({ ...prev, [field]: value }));
  };

  const handleGuardarCambios = async () => {
    if (!unidadSeleccionada?.proyectoId) return;
    setLoading(true);
  
    const proyecto = await getProyectoById(unidadSeleccionada.proyectoId);
    let nuevosSubproyectos;
  
    if (unidadSeleccionada.nombreAntiguo === null) {
      // Crear nueva unidad
      nuevosSubproyectos = [...(proyecto.subproyectos || []), unidadSeleccionada];
    } else {
      // Editar existente
      nuevosSubproyectos = proyecto.subproyectos.map(sp =>
        sp.nombre === unidadSeleccionada.nombreAntiguo ? unidadSeleccionada : sp
      );
    }
  
    const actualizado = { ...proyecto, subproyectos: nuevosSubproyectos };
    const ok = await updateProyecto(proyecto.id, actualizado);
  
    if (ok) {
      const empresaData = await getEmpresaById(empresaId);
      setEmpresa(empresaData);
      const proyectos = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectos);
      const todosSubproyectos = proyectos.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
    }
  
    setUnidadSeleccionada(null);
    setLoading(false);
  };
  

  const handleClonarGrupo = (origen, items) => {
    setPopClonar({ open: true, origen, items });
    setNuevoPath(`${origen} copia`);
  };

  const confirmarClonado = async () => {
    if (!popClonar.items.length) return;
    setLoading(true);
    const proyectoId = popClonar.items[0].proyectoId;
    const proyecto = await getProyectoById(proyectoId);
  
    const clonados = popClonar.items.map(sp => ({
      ...sp,
      nombre: sp.nombre + ' (copia)',
      path: [...(sp.path || []).slice(0, -1), nuevoPath]
    }));
  
    const actualizado = {
      ...proyecto,
      subproyectos: [...(proyecto.subproyectos || []), ...clonados]
    };
  
    const ok = await updateProyecto(proyectoId, actualizado);
    if (ok) {
      const empresaData = await getEmpresaById(empresaId);
      const proyectos = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectos);
      const todosSubproyectos = proyectos.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
    }
  
    setPopClonar({ open: false, origen: '', items: [] });
    setLoading(false);
  };
  

  const handleAgregarUnidad = (grupo, proyectoId, path) => {
    setUnidadSeleccionada({
      nombre: '',
      valor: '',
      estado: 'disponible',
      proyectoId,
      proyecto: grupo,
      path,
      nombreAntiguo: null // indica creación
    });
  };
  

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Unidades por Proyecto</Typography>
      <TextField
        label="Buscar por nombre o path"
        variant="outlined"
        fullWidth
        margin="normal"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      <Divider sx={{ my: 2 }} />

      {/* {Object.entries(agrupados).map(([proyecto, paths]) => {
        const { total, vendido } = calcularTotalesProyecto(paths);
        return (
          <Box key={proyecto} mb={3}>
            <Typography variant="h6">
              {proyecto} – Estimado: {formatCurrency(total)} | Vendido: {formatCurrency(vendido)}
            </Typography>
            {Object.entries(paths).map(([key, node]) => {
  const primerUnidad = node.__items[0]; // puede ser undefined
  if (loading) {
    return (
      <Box p={5} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box key={key}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <TreeNode
          name={key}
          node={node}
          onEditUnidad={(sp) => setUnidadSeleccionada({ ...sp, nombreAntiguo: sp.nombre })}
          onClonarGrupo={handleClonarGrupo}
        />
        {primerUnidad && (
          <Tooltip title="Agregar unidad">
            <IconButton
              onClick={() =>
                handleAgregarUnidad(primerUnidad.proyecto, primerUnidad.proyectoId, primerUnidad.path || [key])
              }
            >
              <Add />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
})}

          </Box>
        );
      })} */}

      <UnidadDialog
        unidad={unidadSeleccionada}
        proyectos={proyectos}
        onClose={() => setUnidadSeleccionada(null)}
        onChange={handleUnidadChange}
        onSave={handleGuardarCambios}
      />

      <ClonarUnidadDialog
        open={popClonar.open}
        nuevoPath={nuevoPath}
        onChangePath={setNuevoPath}
        onClose={() => setPopClonar({ open: false, origen: '', items: [] })}
        onConfirm={confirmarClonado}
      />
    </Box>
  );
}

UnidadesTreeViewPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default UnidadesTreeViewPage;
