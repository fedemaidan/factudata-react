import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, Chip, Collapse
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { calcularTotalUF, calcularRentabilidad } from 'src/utils/unidadUtils';

import UnidadDialog from 'src/components/unidadDialog';
import { formatCurrency } from 'src/utils/formatters';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa, getProyectoById, updateProyecto } from 'src/services/proyectosService';
import ImportarUnidadesDesdeCSV from 'src/components/importarUnidadesDesdeCSV';

function UnidadesTablePage() {
  const router = useRouter();
  const { empresaId } = router.query;

  const [empresa, setEmpresa] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [subproyectos, setSubproyectos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
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
  m2: '',
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
    const ok = await updateProyecto(proyecto.id, actualizado);

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
<Collapse in={mostrarAcciones}>
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
        <Button variant="contained" onClick={handleAgregar} startIcon={<Add />}>Agregar una unidad</Button>
        <Button variant="outlined" onClick={handleAgregarMultiples}>Agregar múltiples</Button>
        <ImportarUnidadesDesdeCSV
  proyectos={proyectos}
  onImport={async (nuevasUnidades) => {
    if (!nuevasUnidades.length) return;

    const { proyectoId } = nuevasUnidades[0];
    console.log(`Importando ${nuevasUnidades.length} unidades al proyecto ${proyectoId}`);
    try {
      const proyecto = await getProyectoById(proyectoId);
      proyecto.subproyectos = proyecto.subproyectos || [];
      proyecto.subproyectos = proyecto.subproyectos.concat(nuevasUnidades)
          
      await updateProyecto(proyectoId, proyecto);
      alert('Unidades importadas con éxito');
      router.reload(); // o volver a cargar los datos si usás useEffect
    } catch (error) {
      console.error(error);
      alert('Ocurrió un error al importar las unidades');
    }
  }}
/>

        <Button
  variant="outlined"
  color="error"
  disabled={seleccionadas.length === 0}
  onClick={async () => {
    const confirm = window.confirm(`¿Eliminar ${seleccionadas.length} unidad(es)?`);
    if (!confirm) return;
    setLoading(true);
    const nuevosProyectos = await Promise.all(
      proyectos.map(async (proyecto) => {
        const nuevosSub = (proyecto.subproyectos || []).filter(sp => !seleccionadas.includes(sp.nombre));
        if (nuevosSub.length !== (proyecto.subproyectos || []).length) {
          await updateProyecto(proyecto.id, { ...proyecto, subproyectos: nuevosSub });
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
  }}
>
  Eliminar seleccionadas
</Button>
<FormControl sx={{ minWidth: 160 }}>
  <InputLabel>Cambiar estado</InputLabel>
  <Select
    value=""
    disabled={seleccionadas.length === 0}
    onChange={async (e) => {
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
          await updateProyecto(proyecto.id, { ...proyecto, subproyectos: nuevosSub });
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
    }}
  >
    <MenuItem value="disponible">Disponible</MenuItem>
    <MenuItem value="vendido">Vendido</MenuItem>
    <MenuItem value="alquilado">Alquilado</MenuItem>
  </Select>
</FormControl>

        </Box>
        </Collapse>


      <Table>
      <TableHead>
      <TableRow>
  <TableCell colSpan={9}><strong>Totales</strong></TableCell>
  <TableCell><strong>{formatCurrency(totalUF)}</strong></TableCell>
  <TableCell><strong>{formatCurrency(totalAlquiler)}</strong></TableCell>
  <TableCell><strong>{promedioRentabilidad.toFixed(2)}%</strong></TableCell>
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
    <TableCell>Unidad</TableCell>
    <TableCell>Proyecto</TableCell>
    <TableCell>Lote</TableCell>
    <TableCell>Edificio</TableCell>
    <TableCell>Tipificación (m²)</TableCell>
    <TableCell>Cocheras / Camas</TableCell>
    <TableCell>Valor UF</TableCell>
    <TableCell>Valor cochera</TableCell>
    <TableCell>Total UF</TableCell>
    <TableCell>Alquiler</TableCell>
    <TableCell>Rentabilidad</TableCell>
    <TableCell>Estado</TableCell>
    <TableCell>Acciones</TableCell>
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
      <TableCell>{sp.nombre}</TableCell>
      <TableCell>{sp.proyecto}</TableCell>
      <TableCell>{sp.lote}</TableCell>
      <TableCell>{sp.edificio}</TableCell>
      <TableCell>{`${sp.tipificacion || ''} (${sp.m2 || 0} m²)`}</TableCell>
      <TableCell>{`${sp.cocheras || 0} / ${sp.camas || 0}`}</TableCell>
      <TableCell>{formatCurrency(sp.valor_uf)}</TableCell>
      <TableCell>{formatCurrency(sp.valor_cochera)}</TableCell>
      <TableCell>{formatCurrency(sp.total_uf)}</TableCell>
      <TableCell>{formatCurrency(sp.alquiler_mensual)}</TableCell>
      <TableCell>{`${calcularRentabilidad(sp).toFixed(2)}%`}</TableCell>
      <TableCell>{renderEstadoChip(sp.estado)}</TableCell>
      <TableCell>
        <Tooltip title="Editar">
          <IconButton onClick={() => setUnidadSeleccionada({ ...sp, nombreAntiguo: sp.nombre })}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
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
              const nuevosSubproyectos = (proyecto.subproyectos || []).map(sp =>
                sp.nombre === unidadActualizada.nombreAntiguo ? unidadActualizada : sp
              );
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
  <TextField label="m²" type="number" value={unidadBaseMultiple.m2} onChange={e => setUnidadBaseMultiple(prev => ({ ...prev, m2: e.target.value }))} fullWidth />
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
