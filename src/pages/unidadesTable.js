import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, Chip, Collapse
} from '@mui/material';
import { Edit, Add, ShoppingCart, Home } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { calcularTotalUF, calcularRentabilidad } from 'src/utils/unidadUtils';

import UnidadDialog from 'src/components/unidadDialog';
import VenderUnidadDialog from 'src/components/venderUnidadDialog';
import AlquilarUnidadDialog from 'src/components/alquilarUnidadDialog';
import { formatCurrency } from 'src/utils/formatters';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa, getProyectoById, updateProyecto } from 'src/services/proyectosService';
import ImportarUnidadesDesdeCSV from 'src/components/importarUnidadesDesdeCSV';
import { venderUnidad, alquilarUnidad } from 'src/services/unidadService';

function UnidadesTablePage() {
  const router = useRouter();
  const { empresaId } = router.query;

  const [empresa, setEmpresa] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [subproyectos, setSubproyectos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [unidadParaVender, setUnidadParaVender] = useState(null);
  const [unidadParaAlquilar, setUnidadParaAlquilar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cantidadMultiples, setCantidadMultiples] = useState(1);
  const [prefijoNombre, setPrefijoNombre] = useState('Unidad');
  const [numeroInicio, setNumeroInicio] = useState(1);
  const [dialogMultiplesOpen, setDialogMultiplesOpen] = useState(false);
  const [filtroProyecto, setFiltroProyecto] = useState('');
const [filtroLote, setFiltroLote] = useState('');
const [filtroEdificio, setFiltroEdificio] = useState('');
const [filtroEstado, setFiltroEstado] = useState('');
const [seleccionadas, setSeleccionadas] = useState([]);
const [mostrarAcciones, setMostrarAcciones] = useState(false);


const [unidadBaseMultiple, setUnidadBaseMultiple] = useState({
  nombre: '',
  lote: '',
  edificio: '',
  piso: '',
  tipificacion: '',
  m2_cubierta: '',
  m2_comunes: '',
  cocheras: '',
  camas: '',
  valor_uf: '',
  valor_cochera: '',
  alquiler_mensual: '',
  estado: 'disponible',
  proyectoId: '',
  proyecto: ''
});


  useEffect(() => {
    const fetchData = async () => {
      if (!empresaId) return;
      const empresaData = await getEmpresaById(empresaId);
      setEmpresa(empresaData);
      const proyectosData = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectosData);
      const todosSubproyectos = proyectosData.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
    };
    fetchData();
  }, [empresaId]);

  const unidadesFiltradas = subproyectos.filter(sp => {
    const matchesTexto = [sp.nombre, sp.tipificacion].some(v =>
      (v || '').toLowerCase().includes(filtro.toLowerCase())
    );
    const matchesProyecto = !filtroProyecto || sp.proyecto === filtroProyecto;
    const matchesLote = !filtroLote || (sp.lote || '').toLowerCase().includes(filtroLote.toLowerCase());
    const matchesEdificio = !filtroEdificio || (sp.edificio || '').toLowerCase().includes(filtroEdificio.toLowerCase());
    const matchesEstado = !filtroEstado || sp.estado === filtroEstado;
    return matchesTexto && matchesProyecto && matchesLote && matchesEdificio && matchesEstado;
  });
  
  
  const handleCambioEstado = async (e) => {
    const nuevoEstado = e.target.value;
    setLoading(true);
    const nuevosProyectos = await Promise.all(
      proyectos.map(async (proyecto) => {
        const nuevosSub = (proyecto.subproyectos || []).map(sp => {
          if (seleccionadas.includes(sp.nombre)) {
            return { ...sp, estado: nuevoEstado };
          }
          return sp;
        });
        await updateProyecto(proyecto.id, { ...proyecto, subproyectos: nuevosSub }, empresaId);
        return proyecto;
      })
    );
    const empresaData = await getEmpresaById(empresaId);
    const proyectosData = await getProyectosByEmpresa(empresaData);
    setProyectos(proyectosData);
    const todosSubproyectos = proyectosData.flatMap(p =>
      (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
    );
    setSubproyectos(todosSubproyectos);
    setSeleccionadas([]);
    setLoading(false);
  }
  
  const handleEliminarSeleccionadas = async () => {
    const confirm = window.confirm(`¿Eliminar ${seleccionadas.length} unidad(es)?`);
    if (!confirm) return;
    setLoading(true);
    const nuevosProyectos = await Promise.all(
      proyectos.map(async (proyecto) => {
        const nuevosSub = (proyecto.subproyectos || []).filter(sp => !seleccionadas.includes(sp.nombre));
        if (nuevosSub.length !== (proyecto.subproyectos || []).length) {
          await updateProyecto(proyecto.id, { ...proyecto, subproyectos: nuevosSub }, empresaId);
        }
        return proyecto;
      })
    );
    const empresaData = await getEmpresaById(empresaId);
    const proyectosData = await getProyectosByEmpresa(empresaData);
    setProyectos(proyectosData);
    const todosSubproyectos = proyectosData.flatMap(p =>
      (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
    );
    setSubproyectos(todosSubproyectos);
    setSeleccionadas([]);
    setLoading(false);
  }

  const handleGuardar = async () => {
    if (!unidadBaseMultiple?.proyectoId) return alert("Seleccioná un proyecto para continuar");
    setLoading(true);
    const proyecto = await getProyectoById(unidadBaseMultiple.proyectoId);

    const nuevosSubproyectos = [
      ...(proyecto.subproyectos || []),
      ...Array.from({ length: cantidadMultiples }, (_, i) => {
        const nombre = `${prefijoNombre} ${numeroInicio + i}`;
        return { ...unidadBaseMultiple, nombre };
      })      
    ];

    const actualizado = { ...proyecto, subproyectos: nuevosSubproyectos };
    const ok = await updateProyecto(proyecto.id, actualizado, empresaId);

    if (ok) {
      const empresaData = await getEmpresaById(empresaId);
      const proyectosData = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectosData);
      const todosSubproyectos = proyectosData.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
    }
    setUnidadSeleccionada(null);
    setLoading(false);
    setDialogMultiplesOpen(false);
    setCantidadMultiples(1);
    setPrefijoNombre('Unidad');
    setNumeroInicio(1);
  };

  const handleAgregar = () => {
    setUnidadSeleccionada({
      nombre: '', lote: '', edificio: '', piso: '', tipificacion: '',
      m2: '', precio_venta_tasacion: '', precio_alquiler_tasacion: '',
      precio_venta_acordado: '', precio_alquiler_acordado: '', estado: 'disponible',
      proyectoId: '', proyecto: '', nombreAntiguo: null
    });
  };

  const handleAgregarMultiples = () => {
    setDialogMultiplesOpen(true);
  };

  const handleVenderUnidad = (unidad) => {
    setUnidadParaVender(unidad);
  };

  const handleAlquilarUnidad = (unidad) => {
    setUnidadParaAlquilar(unidad);
  };

  const handleConfirmarVenta = async (ventaData) => {
    setLoading(true);
    try {
      // Obtener userId del localStorage o contexto de autenticación
      const userId = localStorage.getItem('userId') || 'admin';
      
      const resultado = await venderUnidad(ventaData, empresaId, userId);
      
      let mensaje = '✅ Venta registrada exitosamente\n\n';
      
      if (resultado.unidadActualizada) {
        mensaje += '✓ Unidad marcada como vendida\n';
      }
      
      if (resultado.cuentaPendienteCreada) {
        mensaje += '✓ Cuenta a cobrar generada\n';
      }
      
      if (resultado.ingresoCreado) {
        mensaje += `✓ Ingreso de caja generado (Código: ${resultado.codigoOperacion})\n`;
      }
      
      alert(mensaje);
      
      // Recargar datos
      const empresaData = await getEmpresaById(empresaId);
      const proyectosData = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectosData);
      const todosSubproyectos = proyectosData.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
      
      setUnidadParaVender(null);
    } catch (error) {
      console.error('Error al vender unidad:', error);
      alert('❌ Error al registrar la venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAlquiler = async (alquilerData) => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId') || 'admin';
      
      const resultado = await alquilarUnidad(alquilerData, empresaId, userId);
      
      let mensaje = '✅ Alquiler registrado exitosamente\n\n';
      
      if (resultado.unidadActualizada) {
        mensaje += '✓ Unidad marcada como alquilada\n';
      }
      
      if (resultado.cuentaPendienteCreada) {
        mensaje += '✓ Cuenta a cobrar generada\n';
      }
      
      alert(mensaje);
      
      // Recargar datos
      const empresaData = await getEmpresaById(empresaId);
      const proyectosData = await getProyectosByEmpresa(empresaData);
      setProyectos(proyectosData);
      const todosSubproyectos = proyectosData.flatMap(p =>
        (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
      );
      setSubproyectos(todosSubproyectos);
      
      setUnidadParaAlquilar(null);
    } catch (error) {
      console.error('Error al alquilar unidad:', error);
      alert('❌ Error al registrar el alquiler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderEstadoChip = (estado) => {
    let color = 'default';
    if (estado === 'disponible') color = 'success';
    if (estado === 'alquilado') color = 'primary';
    if (estado === 'vendido') color = 'error';
    return <Chip label={estado} color={color} variant="outlined" size="small" />;
  };

  if (loading) {
    return (
      <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>
    );
  }
  const totalUF = unidadesFiltradas.reduce((sum, u) => sum + calcularTotalUF(u), 0);
  const totalAlquiler = unidadesFiltradas.reduce((sum, u) => sum + (parseFloat(u.alquiler_mensual) || 0), 0);
  const promedioRentabilidad = unidadesFiltradas.length
    ? unidadesFiltradas.reduce((sum, u) => sum + calcularRentabilidad(u), 0) / unidadesFiltradas.length
    : 0;
  

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Unidades</Typography>
      <Button variant="outlined" onClick={() => setMostrarAcciones(prev => !prev)}>
  {mostrarAcciones ? 'Ocultar acciones' : 'Mostrar acciones'}
</Button>

<Typography variant="h6" gutterBottom>
    Filtros
  </Typography>
      <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
        <TextField label="Buscar por nombre/tipificación" value={filtro} onChange={e => setFiltro(e.target.value)} />
        <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Proyecto</InputLabel>
            <Select value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)} label="Proyecto">
            <MenuItem value=""><em>Todos</em></MenuItem>
            {[...new Set(subproyectos.map(sp => sp.proyecto))].map((nombre, idx) => (
                <MenuItem key={idx} value={nombre}>{nombre}</MenuItem>
            ))}
            </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }}>
        <InputLabel>Estado</InputLabel>
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} label="Estado">
                <MenuItem value=""><em>Todos</em></MenuItem>
                <MenuItem value="disponible">Disponible</MenuItem>
                <MenuItem value="alquilado">Alquilado</MenuItem>
                <MenuItem value="vendido">Vendido</MenuItem>
            </Select>
            </FormControl>

        <TextField label="Lote" value={filtroLote} onChange={e => setFiltroLote(e.target.value)} />
        <TextField label="Edificio" value={filtroEdificio} onChange={e => setFiltroEdificio(e.target.value)} />
        </Box>
        <Collapse in={mostrarAcciones}>
        <Box >
        <Box mt={3}>
  <Typography variant="h6" gutterBottom>
    Formas de agregar unidades
  </Typography>
  <Typography variant="body2" color="text.secondary" gutterBottom>
    Elegí cómo cargar nuevas unidades: una por una, varias iguales o desde un archivo CSV.
  </Typography>

  <Box display="flex" gap={3} mt={2} flexWrap="wrap">
  <Box
    onClick={handleAgregar}
    sx={{
      cursor: 'pointer',
      border: '2px solid #7C3AED',
      borderRadius: 2,
      p: 3,
      width: 240,
      bgcolor: '#7C3AED',
      color: 'white',
      '&:hover': { bgcolor: '#6D28D9' },
    }}
  >
    <Typography variant="subtitle1" fontWeight="bold">
      ➕ Agregar una unidad
    </Typography>
    <Typography variant="body2">
      Para cargar manualmente una sola unidad.
    </Typography>
  </Box>

  <Box
    onClick={handleAgregarMultiples}
    sx={{
      cursor: 'pointer',
      border: '1px solid #C4B5FD',
      borderRadius: 2,
      p: 3,
      width: 240,
      '&:hover': { bgcolor: '#F3F4F6' },
    }}
  >
    <Typography variant="subtitle1" fontWeight="bold" color="primary">
      📦 Agregar múltiples unidades
    </Typography>
    <Typography variant="body2">
      Ideal para unidades iguales con distintos nombres.
    </Typography>
  </Box>

  <Box
    sx={{
      border: '1px solid #C4B5FD',
      borderRadius: 2,
      p: 3,
      width: 320,
      '&:hover': { bgcolor: '#F3F4F6' },
    }}
  >
    <Typography variant="subtitle1" fontWeight="bold">
      📄 Importar desde archivo CSV
    </Typography>
    <Typography variant="body2" mb={1}>
      Usá un archivo Excel con varias unidades.
    </Typography>
    <ImportarUnidadesDesdeCSV
        proyectos={proyectos}
        onImport={async (nuevasUnidades) => {
          if (!nuevasUnidades.length) return;

          const { proyectoId } = nuevasUnidades[0];
          try {
            const proyecto = await getProyectoById(proyectoId);
            proyecto.subproyectos = proyecto.subproyectos || [];
            proyecto.subproyectos = proyecto.subproyectos.concat(nuevasUnidades);

            await updateProyecto(proyectoId, proyecto);
            alert('Unidades importadas con éxito');
            router.reload();
          } catch (error) {
            console.error(error);
            alert('Ocurrió un error al importar las unidades');
          }
        }}
      />
  </Box>
</Box>

</Box>

<Box mt={3} display="flex" gap={2} alignItems="center" flexWrap="wrap">
  <Typography variant="subtitle1" fontWeight="medium">
    Acciones sobre unidades seleccionadas:
  </Typography>

  <Button
    variant="outlined"
    color="error"
    disabled={seleccionadas.length === 0}
    onClick={handleEliminarSeleccionadas} // tu función actual
  >
    🗑️ Eliminar seleccionadas
  </Button>

  <FormControl sx={{ minWidth: 180 }} disabled={seleccionadas.length === 0}>
    <InputLabel>Cambiar estado</InputLabel>
    <Select
      value=""
      onChange={handleCambioEstado} // tu lógica actual
      label="Cambiar estado"
    >
      <MenuItem value="disponible">Disponible</MenuItem>
      <MenuItem value="vendido">Vendido</MenuItem>
      <MenuItem value="alquilado">Alquilado</MenuItem>
    </Select>
  </FormControl>

</Box>


        </Box>
        </Collapse>


      <Table>
      <TableHead>
      <TableRow>
  <TableCell colSpan={7}><strong>Totales</strong></TableCell>
  <TableCell colSpan={2}><strong>{formatCurrency(totalUF)}</strong></TableCell>
  <TableCell colSpan={2} />
</TableRow>

  <TableRow>
    <TableCell padding="checkbox">
      <input
        type="checkbox"
        checked={seleccionadas.length === unidadesFiltradas.length && unidadesFiltradas.length > 0}
        onChange={(e) => {
          if (e.target.checked) {
            setSeleccionadas(unidadesFiltradas.map((u) => u.nombre));
          } else {
            setSeleccionadas([]);
          }
        }}
      />
    </TableCell>
    <TableCell><strong>Unidad</strong></TableCell>
    <TableCell><strong>Proyecto</strong></TableCell>
    <TableCell><strong>Ubicación</strong></TableCell>
    <TableCell><strong>Tipificación</strong></TableCell>
    <TableCell><strong>Superficies (m²)</strong></TableCell>
    <TableCell><strong>Extras</strong></TableCell>
    <TableCell><strong>Valores UF</strong></TableCell>
    <TableCell><strong>Estado</strong></TableCell>
    <TableCell><strong>Acciones</strong></TableCell>
  </TableRow>
</TableHead>

<TableBody>
  {unidadesFiltradas.map((sp, idx) => (
    <TableRow key={idx}>
      <TableCell padding="checkbox">
        <input
          type="checkbox"
          checked={seleccionadas.includes(sp.nombre)}
          onChange={(e) => {
            if (e.target.checked) {
              setSeleccionadas((prev) => [...prev, sp.nombre]);
            } else {
              setSeleccionadas((prev) => prev.filter((n) => n !== sp.nombre));
            }
          }}
        />
      </TableCell>
      <TableCell><strong>{sp.nombre}</strong></TableCell>
      <TableCell>{sp.proyecto}</TableCell>
      <TableCell>
        <Typography variant="body2">
          {sp.lote && `Lote: ${sp.lote}`}
          {sp.lote && sp.edificio && ' - '}
          {sp.edificio && `Edif: ${sp.edificio}`}
        </Typography>
      </TableCell>
      <TableCell>{sp.tipificacion}</TableCell>
      <TableCell>
        <Typography variant="body2">
          Cub: {sp.m2_cubierta || 0} | Com: {sp.m2_comunes || 0}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total: {(parseFloat(sp.m2_cubierta || 0) + parseFloat(sp.m2_comunes || 0))} m²
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          🚗 {sp.cocheras || 0} | 🛏️ {sp.camas || 0}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">UF: {formatCurrency(sp.valor_uf)}</Typography>
        <Typography variant="body2">Coch: {formatCurrency(sp.valor_cochera)}</Typography>
        <Typography variant="caption" color="primary" fontWeight="bold">
          Total: {formatCurrency(sp.total_uf)}
        </Typography>
      </TableCell>
      <TableCell>{renderEstadoChip(sp.estado)}</TableCell>
      <TableCell>
        <Box display="flex" gap={0.5}>
          <Tooltip title="Editar">
            <IconButton 
              size="small"
              onClick={() => setUnidadSeleccionada({ ...sp, nombreAntiguo: sp.nombre })}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {sp.estado !== 'vendido' && (
            <Tooltip title="Vender">
              <IconButton 
                size="small"
                color="success"
                sx={{ 
                  bgcolor: 'success.lighter',
                  '&:hover': { bgcolor: 'success.light' }
                }}
                onClick={() => handleVenderUnidad(sp)}
              >
                <ShoppingCart fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {sp.estado === 'disponible' && (
            <Tooltip title="Alquilar">
              <IconButton 
                size="small"
                color="primary"
                sx={{ 
                  bgcolor: 'primary.lighter',
                  '&:hover': { bgcolor: 'primary.light' }
                }}
                onClick={() => handleAlquilarUnidad(sp)}
              >
                <Home fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  ))}
</TableBody>

      </Table>

      <UnidadDialog
        unidad={unidadSeleccionada}
        proyectos={proyectos}
        onClose={() => setUnidadSeleccionada(null)}
        onChange={(field, value) => setUnidadSeleccionada(prev => ({ ...prev, [field]: value }))}
        onSave={(unidadActualizada) => {
            // Acá actualizás solo una unidad individual
            const actualizarUnidad = async () => {
              setLoading(true);
              const proyecto = await getProyectoById(unidadActualizada.proyectoId);
              
              let nuevosSubproyectos;
              if (unidadActualizada.nombreAntiguo === null) {
                // Crear nueva unidad
                nuevosSubproyectos = [...(proyecto.subproyectos || []), unidadActualizada];
              } else {
                // Editar existente
                nuevosSubproyectos = (proyecto.subproyectos || []).map(sp =>
                  sp.nombre === unidadActualizada.nombreAntiguo ? unidadActualizada : sp
                );
              }
              
              const ok = await updateProyecto(proyecto.id, { ...proyecto, subproyectos: nuevosSubproyectos });
          
              if (ok) {
                const empresaData = await getEmpresaById(empresaId);
                const proyectosData = await getProyectosByEmpresa(empresaData);
                setProyectos(proyectosData);
                const todosSubproyectos = proyectosData.flatMap(p =>
                  (p.subproyectos || []).map(sp => ({ ...sp, proyecto: p.nombre, proyectoId: p.id }))
                );
                setSubproyectos(todosSubproyectos);
              }
          
              setUnidadSeleccionada(null);
              setLoading(false);
            };
          
            actualizarUnidad();
          }}          
      />

      <VenderUnidadDialog
        unidad={unidadParaVender}
        onClose={() => setUnidadParaVender(null)}
        onConfirm={handleConfirmarVenta}
      />

      <AlquilarUnidadDialog
        unidad={unidadParaAlquilar}
        onClose={() => setUnidadParaAlquilar(null)}
        onConfirm={handleConfirmarAlquiler}
      />

      <Dialog open={dialogMultiplesOpen} onClose={() => setDialogMultiplesOpen(false)}>
        <DialogTitle>Agregar múltiples unidades</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
  <FormControl fullWidth>
    <InputLabel>Proyecto</InputLabel>
    <Select
      value={unidadBaseMultiple.proyectoId}
      onChange={(e) => {
        const selected = proyectos.find(p => p.id === e.target.value);
        setUnidadBaseMultiple(prev => ({
          ...prev,
          proyectoId: selected.id,
          proyecto: selected.nombre
        }));
      }}
    >
      {proyectos.map(p => (
        <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
      ))}
    </Select>
  </FormControl>

  <TextField label="Lote" value={unidadBaseMultiple.lote} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, lote: e.target.value }))} fullWidth />
  <TextField label="Edificio" value={unidadBaseMultiple.edificio} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, edificio: e.target.value }))} fullWidth />
  <TextField label="Piso" value={unidadBaseMultiple.piso} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, piso: e.target.value }))} fullWidth />
  <TextField label="Tipificación" value={unidadBaseMultiple.tipificacion} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, tipificacion: e.target.value }))} fullWidth />
  <TextField label="m² Cubiertos" type="number" value={unidadBaseMultiple.m2_cubierta} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, m2_cubierta: e.target.value }))} fullWidth />
  <TextField label="m² Comunes" type="number" value={unidadBaseMultiple.m2_comunes} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, m2_comunes: e.target.value }))} fullWidth />
  <TextField label="Cocheras" type="number" value={unidadBaseMultiple.cocheras} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, cocheras: e.target.value }))} fullWidth />
  <TextField label="Camas" type="number" value={unidadBaseMultiple.camas} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, camas: e.target.value }))} fullWidth />
  <TextField label="Valor UF" type="number" value={unidadBaseMultiple.valor_uf} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, valor_uf: e.target.value }))} fullWidth />
  <TextField label="Valor cochera" type="number" value={unidadBaseMultiple.valor_cochera} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, valor_cochera: e.target.value }))} fullWidth />
  <TextField label="Alquiler mensual" type="number" value={unidadBaseMultiple.alquiler_mensual} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, alquiler_mensual: e.target.value }))} fullWidth />

  <TextField label="Cantidad de unidades" type="number" value={cantidadMultiples} onChange={e => setCantidadMultiples(Number(e.target.value))} fullWidth />
  <TextField label="Prefijo para el nombre" value={prefijoNombre} onChange={e => setPrefijoNombre(e.target.value)} fullWidth />
  <TextField label="Número de inicio" type="number" value={numeroInicio} onChange={e => setNumeroInicio(Number(e.target.value))} fullWidth />
</DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogMultiplesOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardar}>Crear</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

UnidadesTablePage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default UnidadesTablePage;
