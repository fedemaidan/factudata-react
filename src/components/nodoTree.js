import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  TextField,
  Collapse,
  Button,
  Chip
} from '@mui/material';
import { ExpandLess, ExpandMore, Delete } from '@mui/icons-material';
import { formatCurrency } from 'src/utils/formatters';

const getEstadoChipColor = (estado) => {
  switch (estado?.toLowerCase()) {
    case 'vendido': return 'success';
    case 'disponible': return 'info';
    case 'alquilado': return 'warning';
    default: return 'default';
  }
};

const NodoTree = ({ nodo, nivel = 0, onChange, onDelete }) => {
  const [expandido, setExpandido] = useState(false);
  const [nuevoHijo, setNuevoHijo] = useState({ nombre: '', valor: '', estado: '', meses: '' });

  const tieneHijos = nodo.nodos && nodo.nodos.length > 0;

  const handleAgregarHijo = () => {
    const nuevos = [...(nodo.nodos || []), { ...nuevoHijo, nodos: [] }];
    setNuevoHijo({ nombre: '', valor: '', estado: '', meses: '' });
    onChange({ ...nodo, nodos: nuevos });
    setExpandido(true);
  };

  const handleEliminarHijo = (index) => {
    const nuevos = nodo.nodos.filter((_, i) => i !== index);
    onChange({ ...nodo, nodos: nuevos });
  };

  const handleUpdateHijo = (index, hijoActualizado) => {
    const nuevos = [...(nodo.nodos || [])];
    nuevos[index] = hijoActualizado;
    onChange({ ...nodo, nodos: nuevos });
  };

  return (
    <Box sx={{ ml: nivel * 2, my: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body1">
            {nodo.nombre} - {formatCurrency(Number(nodo.valor))}
          </Typography>
          <Chip size="small" label={nodo.estado} color={getEstadoChipColor(nodo.estado)} />
          {nodo.estado === 'alquilado' && (
            <Typography variant="body2" color="text.secondary">({nodo.meses} meses)</Typography>
          )}
        </Box>
        <Box>
          {nivel < 3 && (
            <IconButton size="small" onClick={() => setExpandido(!expandido)}>
              {expandido ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
          {onDelete && (
            <IconButton size="small" onClick={onDelete}><Delete /></IconButton>
          )}
        </Box>
      </Box>

      {/* Hijos visibles */}
      {tieneHijos && (
        <Collapse in={expandido} timeout="auto" unmountOnExit>
          {nodo.nodos.map((hijo, i) => (
            <NodoTree
              key={i}
              nodo={hijo}
              nivel={nivel + 1}
              onChange={(actualizado) => handleUpdateHijo(i, actualizado)}
              onDelete={() => handleEliminarHijo(i)}
            />
          ))}
        </Collapse>
      )}

      {/* Agregar hijo */}
      {nivel < 3 && (
        <Collapse in={expandido} timeout="auto" unmountOnExit>
          <Box mt={1} pl={2}>
            <Typography variant="body2" gutterBottom>Agregar subnodo</Typography>
            <Grid container spacing={1}>
              <Grid item xs={3}>
                <TextField
                  label="Nombre"
                  size="small"
                  value={nuevoHijo.nombre}
                  onChange={(e) => setNuevoHijo({ ...nuevoHijo, nombre: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Valor"
                  size="small"
                  type="number"
                  value={nuevoHijo.valor}
                  onChange={(e) => setNuevoHijo({ ...nuevoHijo, valor: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Estado"
                  size="small"
                  value={nuevoHijo.estado}
                  onChange={(e) => setNuevoHijo({ ...nuevoHijo, estado: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Meses"
                  size="small"
                  type="number"
                  value={nuevoHijo.meses}
                  onChange={(e) => setNuevoHijo({ ...nuevoHijo, meses: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAgregarHijo}
                  fullWidth
                >
                  Agregar
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default NodoTree;
