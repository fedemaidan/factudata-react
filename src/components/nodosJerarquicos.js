import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Chip, Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getNodosByProyectoId, crearNodo, eliminarNodo } from 'src/services/nodosService';
import { formatCurrency } from 'src/utils/formatters';

const NodosJerarquicos = ({ proyectoId, empresa }) => {
  const [nodos, setNodos] = useState([]);
  const [nuevoNodo, setNuevoNodo] = useState({ nombre: '', tipo: '', valor: '', estado: '', meses: '' });

  const fetchNodos = async () => {
    const resultado = await getNodosByProyectoId(proyectoId);
    setNodos(resultado);
  };

  useEffect(() => {
    if (proyectoId) fetchNodos();
  }, [proyectoId]);

  const handleCrearNodo = async () => {
    await crearNodo({
      ...nuevoNodo,
      empresaId: empresa.id,
      proyectoId,
      tipo: nuevoNodo.tipo || 'Unidad',
      padreId: null,
      pathIds: [proyectoId],
      metadatos: {
        valor: parseFloat(nuevoNodo.valor),
        estado: nuevoNodo.estado,
        meses: parseInt(nuevoNodo.meses) || 0
      }
    });
    setNuevoNodo({ nombre: '', tipo: '', valor: '', estado: '', meses: '' });
    fetchNodos();
  };

  const handleEliminarNodo = async (id) => {
    await eliminarNodo(proyectoId, id);
    fetchNodos();
  };

  return (
    <Box>
      <Typography variant="subtitle1">Unidades cargadas:</Typography>
      {nodos.map((nodo) => (
        <Box key={nodo.id} display="flex" alignItems="center" justifyContent="space-between" my={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography>{nodo.nombre} - {formatCurrency(nodo.metadatos?.valor)}</Typography>
            <Chip label={nodo.metadatos?.estado} color="primary" size="small" />
            {nodo.metadatos?.estado === 'alquilado' && <Typography>({nodo.metadatos?.meses} meses)</Typography>}
          </Box>
          <IconButton onClick={() => handleEliminarNodo(nodo.id)}><DeleteIcon /></IconButton>
        </Box>
      ))}

      <Box mt={3}>
        <Typography variant="subtitle1">Agregar nueva unidad</Typography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={3}><TextField label="Nombre" value={nuevoNodo.nombre} onChange={(e) => setNuevoNodo({ ...nuevoNodo, nombre: e.target.value })} fullWidth /></Grid>
          <Grid item xs={2}><TextField label="Valor" type="number" value={nuevoNodo.valor} onChange={(e) => setNuevoNodo({ ...nuevoNodo, valor: e.target.value })} fullWidth /></Grid>
          <Grid item xs={3}><TextField label="Estado" value={nuevoNodo.estado} onChange={(e) => setNuevoNodo({ ...nuevoNodo, estado: e.target.value })} fullWidth /></Grid>
          <Grid item xs={2}><TextField label="Meses" type="number" value={nuevoNodo.meses} onChange={(e) => setNuevoNodo({ ...nuevoNodo, meses: e.target.value })} fullWidth /></Grid>
          <Grid item xs={2}><Button variant="contained" onClick={handleCrearNodo}>Agregar</Button></Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default NodosJerarquicos;
