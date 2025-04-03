import React, { useEffect, useState } from 'react';
import {
  Card, CardHeader, Divider, CardContent, Typography,
  FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Button, LinearProgress
} from '@mui/material';
import profileService from 'src/services/profileService';

export const PermisosUsuarios = ({ empresa }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const accionesEmpresa = empresa.acciones || [];
  
  useEffect(() => {
    const fetchUsuarios = async () => {
      setIsLoading(true);
      const perfiles = await profileService.getProfileByEmpresa(empresa.id);
      setUsuarios(perfiles);
      setIsLoading(false);
    };
    fetchUsuarios();
  }, [empresa]);

  const handlePermisosChange = (userId, nuevasAccionesOcultas) => {
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, permisosOcultos: nuevasAccionesOcultas } : u
      )
    );
  };

  const guardarPermisos = async (usuario) => {
    console.log('Guardando permisos', usuario);
    setIsLoading(true);
    try {
      await profileService.updateProfile(usuario.id, {
        permisosOcultos: usuario.permisosOcultos || [],
      });
    } catch (e) {
      console.error("Error al guardar permisos", e);
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader title="Permisos por Usuario" />
      <Divider />
      <CardContent>
        {isLoading && <LinearProgress />}
        {usuarios.map((usuario) => (
          <div key={usuario.id} style={{ marginBottom: 24 }}>
            <Typography variant="subtitle1">
              {usuario.firstName} {usuario.lastName} - {usuario.email}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Acciones ocultas</InputLabel>
              <Select
                multiple
                value={usuario.permisosOcultos || []}
                onChange={(e) => handlePermisosChange(usuario.id, e.target.value)}
                renderValue={(selected) => selected.join(', ')}
              >
                {accionesEmpresa.map((accion) => (
                  <MenuItem key={accion} value={accion}>
                    <Checkbox checked={(usuario.permisosOcultos || []).includes(accion)} />
                    <ListItemText primary={accion} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() => guardarPermisos(usuario)}
              sx={{ mt: 1 }}
            >
              Guardar permisos
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
