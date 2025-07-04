// NodoItem.js
import React, { useState } from 'react';
import { Box, Typography, Button, TextField, IconButton, Chip } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { crearNodo, eliminarNodo } from 'src/services/nodosService';

const NodoItem = ({ nodo, nodos, nivelesJerarquia, empresaId, proyectoId, refreshNodos }) => {
  const [nuevo, setNuevo] = useState({ nombre: '', valor: '', estado: '', meses: '' });
  const hijos = nodos.filter(n => n.padreId === nodo.id);

  const nivelActual = nivelesJerarquia.indexOf(nodo.tipo);
  const siguienteNivel = nivelesJerarquia[nivelActual + 1];

  const handleCrear = async () => {
    await crearNodo({
      nombre: nuevo.nombre,
      tipo: siguienteNivel,
      padreId: nodo.id,
      empresaId,
      proyectoId,
      pathIds: [...(nodo.pathIds || []), nodo.id],
      metadatos: {
        valor: parseFloat(nuevo.valor),
        estado: nuevo.estado,
        meses: parseInt(nuevo.meses) || 0
      }
    });
    setNuevo({ nombre: '', valor: '', estado: '', meses: '' });
    refreshNodos();
  };

  const handleEliminar = async () => {
    await eliminarNodo(proyectoId, nodo.id);
    refreshNodos();
  };

  return (
    <Box ml={nivelActual * 2} mt={1} borderLeft={1} pl={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <Typography>{nodo.tipo}: {nodo.nombre} - ${nodo.metadatos?.valor}</Typography>
          <Chip label={nodo.metadatos?.estado} size="small" />
        </Box>
        <IconButton onClick={handleEliminar}><Delete /></IconButton>
      </Box>

      {siguienteNivel && (
        <Box mt={1} display="flex" gap={1}>
          <TextField size="small" label="Nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <TextField size="small" label="Valor" type="number" value={nuevo.valor} onChange={e => setNuevo({ ...nuevo, valor: e.target.value })} />
          <TextField size="small" label="Estado" value={nuevo.estado} onChange={e => setNuevo({ ...nuevo, estado: e.target.value })} />
          <TextField size="small" label="Meses" type="number" value={nuevo.meses} onChange={e => setNuevo({ ...nuevo, meses: e.target.value })} />
          <Button variant="outlined" onClick={handleCrear}>+ {siguienteNivel}</Button>
        </Box>
      )}

      {hijos.map(hijo => (
        <NodoItem
          key={hijo.id}
          nodo={hijo}
          nodos={nodos}
          nivelesJerarquia={nivelesJerarquia}
          empresaId={empresaId}
          proyectoId={proyectoId}
          refreshNodos={refreshNodos}
        />
      ))}
    </Box>
  );
};

export default NodoItem;
