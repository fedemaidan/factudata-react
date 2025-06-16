import React, { useState, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  TextField,
  Button,
  Divider,
  Grid,
  Collapse,
  Chip
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import { getProyectosByEmpresa, updateProyecto } from 'src/services/proyectosService';
import { useRouter } from 'next/router';
import { getEmpresaById } from 'src/services/empresaService';
import { formatCurrency } from 'src/utils/formatters';

export const CajaProyectoManager = () => {
  const router = useRouter();
  const { empresaId } = router.query;

  const [empresa, setEmpresa] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [expandedProyectoId, setExpandedProyectoId] = useState(null);
  const [nuevoSubproyecto, setNuevoSubproyecto] = useState({ nombre: '', valor: '', estado: '', meses: '' });

  useEffect(() => {
    const fetchData = async () => {
      if (empresaId) {
        const empresaData = await getEmpresaById(empresaId);
        setEmpresa(empresaData);
        const proyectosData = await getProyectosByEmpresa(empresaData);
        setProyectos(proyectosData);
      }
    };

    fetchData();
  }, [empresaId]);

  const handleAgregarSubproyecto = async (proyectoId) => {
    const proyecto = proyectos.find(p => p.id === proyectoId);
    const nuevos = [...(proyecto.subproyectos || []), nuevoSubproyecto];
    console.log(nuevos, "nuevos subproyectos");
    await updateProyecto(proyectoId, { subproyectos: nuevos });
    
    // setNuevoSubproyecto({ nombre: '', valor: '', estado: '', meses: '' });
    const proyectosActualizados = await getProyectosByEmpresa(empresa);
    setProyectos(proyectosActualizados);
  };

  const handleEliminarSubproyecto = async (proyectoId, index) => {
    const proyecto = proyectos.find(p => p.id === proyectoId);
    const nuevos = proyecto.subproyectos.filter((_, i) => i !== index);
    await updateProyecto(proyectoId, { subproyectos: nuevos });
    const proyectosActualizados = await getProyectosByEmpresa(empresa);
    setProyectos(proyectosActualizados);
  };

  const calcularTotales = (proyecto) => {
    const acumuladoEstimado = proyecto.subproyectos?.reduce((acc, sp) => acc + (Number(sp.valor) || 0), 0) || 0;
    const acumuladoVenta = proyecto.subproyectos?.filter(sp => sp.estado === 'Vendido')
      .reduce((acc, sp) => acc + (Number(sp.valor) || 0), 0) || 0;
    return { acumuladoEstimado, acumuladoVenta };
  };

  const toggleExpand = (proyectoId) => {
    setExpandedProyectoId(prev => (prev === proyectoId ? null : proyectoId));
  };

  const getEstadoChipColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'vendido': return 'success';
      case 'disponible': return 'info';
      case 'alquilado': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gestión de venta y alquiler de obras
      </Typography>

      {proyectos.map((proyecto) => {
        const { acumuladoEstimado, acumuladoVenta } = calcularTotales(proyecto);
        const isExpanded = expandedProyectoId === proyecto.id;

        return (
          <Card key={proyecto.id} sx={{ mb: 3 }}>
            <CardHeader
              title={proyecto.nombre}
              subheader={`Estimado: ${formatCurrency(acumuladoEstimado)} | Vendido: ${formatCurrency(acumuladoVenta)}`}
              action={
                <IconButton onClick={() => toggleExpand(proyecto.id)}>
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              }
            />
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <CardContent>
                <Box mb={2}>
                  <Typography variant="subtitle1">Subproyectos:</Typography>
                  {proyecto.subproyectos?.map((sub, index) => (
                    <Box key={index} display="flex" alignItems="center" justifyContent="space-between" my={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>{sub.nombre} - {formatCurrency(parseFloat(sub.valor))}</Typography>
                        <Chip label={sub.estado} color={getEstadoChipColor(sub.estado)} size="small" />
                        {sub.estado === 'alquilado' && <Typography>({sub.meses} meses)</Typography>}
                      </Box>
                      <IconButton onClick={() => handleEliminarSubproyecto(proyecto.id, index)}><Delete /></IconButton>
                    </Box>
                  ))}
                </Box>
                <Divider />
                <Box mt={2}>
                  <Typography variant="subtitle1">Agregar Subproyecto</Typography>
                  <Grid container spacing={2} mt={1}>
                    <Grid item xs={3}><TextField label="Nombre" value={nuevoSubproyecto.nombre} onChange={(e) => setNuevoSubproyecto({ ...nuevoSubproyecto, nombre: e.target.value })} fullWidth /></Grid>
                    <Grid item xs={2}><TextField label="Valor" type="number" value={nuevoSubproyecto.valor} onChange={(e) => setNuevoSubproyecto({ ...nuevoSubproyecto, valor: e.target.value })} fullWidth /></Grid>
                    <Grid item xs={3}><TextField label="Estado" value={nuevoSubproyecto.estado} onChange={(e) => setNuevoSubproyecto({ ...nuevoSubproyecto, estado: e.target.value })} fullWidth /></Grid>
                    <Grid item xs={2}><TextField label="Meses" type="number" value={nuevoSubproyecto.meses} onChange={(e) => setNuevoSubproyecto({ ...nuevoSubproyecto, meses: e.target.value })} fullWidth /></Grid>
                    <Grid item xs={2}><Button variant="contained" onClick={() => handleAgregarSubproyecto(proyecto.id)}>Agregar</Button></Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Collapse>
          </Card>
        );
      })}
    </Box>
  );
};

CajaProyectoManager.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default CajaProyectoManager;
