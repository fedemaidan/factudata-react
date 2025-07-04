import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { getProyectoById } from 'src/services/proyectosService';

const NodoVisual = ({ nodo, nivel }) => {
  const [expanded, setExpanded] = useState(false);
  const tieneHijos = nodo.nodos && nodo.nodos.length > 0;

  return (
    <Box sx={{ ml: nivel * 2, mt: 1 }}>
      <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle2">{nodo.nombre}</Typography>
          <Typography variant="body2" color="text.secondary">
            Estado: {nodo.estado} | Valor: ${nodo.valor}
            {nodo.estado === 'alquilado' && ` | Meses: ${nodo.meses}`}
          </Typography>
        </Box>
        {tieneHijos && (
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Paper>

      {tieneHijos && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {nodo.nodos.map((hijo, idx) => (
            <NodoVisual key={idx} nodo={hijo} nivel={nivel + 1} />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

const NodosJerarquicosPorProyecto = ({ proyectoId }) => {
  const [proyecto, setProyecto] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getProyectoById(proyectoId);
      setProyecto(data);
    };
    fetchData();
  }, [proyectoId]);

  if (!proyecto) return <Typography>Cargando proyecto...</Typography>;
  if (!proyecto.nodos || proyecto.nodos.length === 0) {
    return <Typography>No hay nodos cargados.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Estructura del proyecto</Typography>
      {proyecto.nodos.map((nodo, i) => (
        <NodoVisual key={i} nodo={nodo} nivel={0} />
      ))}
    </Box>
  );
};

export default NodosJerarquicosPorProyecto;
