import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const OnboardingPreview = ({ formData, handleDelete }) => {
  return (
    <Box p={2}>
      <Typography variant="h6">Vista Previa de la Empresa</Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1">Empresa: {formData.nombre || 'Nombre de la Empresa'}</Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2">Proyectos:</Typography>
      <List>
        {formData.proyectos.length > 0 ? (
          formData.proyectos.map((proyecto, index) => (
            <ListItem key={index} secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete('proyecto', index)}>
                <DeleteIcon />
              </IconButton>
            }>
              <ListItemText primary={proyecto} />
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No se han añadido proyectos" />
          </ListItem>
        )}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2">Proveedores:</Typography>
      <List>
        {formData.proveedores.length > 0 ? (
          formData.proveedores.map((proveedor, index) => (
            <ListItem key={index} secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete('proveedor', index)}>
                <DeleteIcon />
              </IconButton>
            }>
              <ListItemText primary={proveedor} />
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No se han añadido proveedores" />
          </ListItem>
        )}
      </List>
    </Box>
  );
};

export default OnboardingPreview;
