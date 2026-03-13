import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Divider,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import { updateProyecto } from 'src/services/proyectosService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import profileService from 'src/services/profileService';

const DRAWER_WIDTH = 400;

export default function ProyectoConfigDrawer({ open, onClose, proyecto, empresa, onProyectoUpdated }) {
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { severity, message }

  // ── Tab 0: Nombre ──
  const [nombre, setNombre] = useState('');

  // ── Tab 1: Datos cliente ──
  const [datosCliente, setDatosCliente] = useState('');

  // ── Tab 2: Usuarios ──
  const [usuarios, setUsuarios] = useState([]); // todos los de la empresa
  const [usuariosAsignados, setUsuariosAsignados] = useState([]); // IDs seleccionados
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Cargar datos cuando se abre el drawer
  useEffect(() => {
    if (!open || !proyecto) return;
    setNombre(proyecto.nombre || '');
    setDatosCliente(proyecto.datos_facturacion_cliente || '');
    setFeedback(null);
  }, [open, proyecto]);

  // Cargar usuarios de la empresa
  useEffect(() => {
    if (!open || !empresa?.id) return;
    let cancelled = false;

    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      try {
        const perfiles = await profileService.getProfileByEmpresa(empresa.id);
        const perfilesConProyectos = await Promise.all(
          perfiles.map(async (prof) => {
            prof.proyectosData = await getProyectosFromUser(prof);
            return prof;
          })
        );
        if (cancelled) return;
        setUsuarios(perfilesConProyectos);

        // Marcar los que ya tienen acceso a este proyecto
        const asignados = perfilesConProyectos
          .filter((u) => u.proyectosData?.some((p) => p?.id === proyecto?.id))
          .map((u) => u.id);
        setUsuariosAsignados(asignados);
      } catch (e) {
        console.error('Error cargando usuarios:', e);
      } finally {
        if (!cancelled) setLoadingUsuarios(false);
      }
    };

    fetchUsuarios();
    return () => { cancelled = true; };
  }, [open, empresa?.id, proyecto?.id]);

  const toggleUsuario = (userId) => {
    setUsuariosAsignados((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // ── Guardar nombre ──
  const handleGuardarNombre = useCallback(async () => {
    if (!proyecto?.id || !nombre.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateProyecto(proyecto.id, { ...proyecto, nombre: nombre.trim() });
      setFeedback({ severity: 'success', message: 'Nombre actualizado' });
      onProyectoUpdated?.({ ...proyecto, nombre: nombre.trim() });
    } catch (e) {
      console.error(e);
      setFeedback({ severity: 'error', message: 'Error al actualizar nombre' });
    } finally {
      setSaving(false);
    }
  }, [proyecto, nombre, onProyectoUpdated]);

  // ── Guardar datos cliente ──
  const handleGuardarDatosCliente = useCallback(async () => {
    if (!proyecto?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateProyecto(proyecto.id, { ...proyecto, datos_facturacion_cliente: datosCliente });
      setFeedback({ severity: 'success', message: 'Datos del cliente actualizados' });
      onProyectoUpdated?.({ ...proyecto, datos_facturacion_cliente: datosCliente });
    } catch (e) {
      console.error(e);
      setFeedback({ severity: 'error', message: 'Error al actualizar datos del cliente' });
    } finally {
      setSaving(false);
    }
  }, [proyecto, datosCliente, onProyectoUpdated]);

  // ── Guardar usuarios ──
  const handleGuardarUsuarios = useCallback(async () => {
    if (!proyecto?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updatePromises = usuarios.map(async (usuario) => {
        const currentProjects = usuario.proyectosData?.map((p) => p?.id).filter(Boolean) || [];
        const tieneProyecto = currentProjects.includes(proyecto.id);
        const deberíaTener = usuariosAsignados.includes(usuario.id);

        if (deberíaTener && !tieneProyecto) {
          return profileService.updateProfile(usuario.id, {
            proyectos: [...currentProjects, proyecto.id],
          });
        } else if (!deberíaTener && tieneProyecto) {
          return profileService.updateProfile(usuario.id, {
            proyectos: currentProjects.filter((id) => id !== proyecto.id),
          });
        }
        return null;
      });
      await Promise.all(updatePromises);
      setFeedback({ severity: 'success', message: 'Usuarios actualizados' });
    } catch (e) {
      console.error(e);
      setFeedback({ severity: 'error', message: 'Error al actualizar usuarios' });
    } finally {
      setSaving(false);
    }
  }, [proyecto, usuarios, usuariosAsignados]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: DRAWER_WIDTH, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Configurar proyecto
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setFeedback(null); }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<EditIcon />} label="Nombre" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<DescriptionIcon />} label="Cliente" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<PeopleIcon />} label="Usuarios" iconPosition="start" sx={{ minHeight: 48 }} />
        </Tabs>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Feedback */}
          {feedback && (
            <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
              {feedback.message}
            </Alert>
          )}

          {/* Tab 0 – Nombre */}
          {tab === 0 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Cambiá el nombre del proyecto.
              </Typography>
              <TextField
                fullWidth
                label="Nombre del proyecto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleGuardarNombre}
                disabled={saving || !nombre.trim() || nombre.trim() === proyecto?.nombre}
              >
                {saving ? 'Guardando…' : 'Guardar nombre'}
              </Button>
            </Stack>
          )}

          {/* Tab 1 – Datos cliente */}
          {tab === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Razón social, CUIT u otros datos del cliente que ayuden al bot a identificar si una factura es del cliente de este proyecto.
              </Typography>
              <TextField
                fullWidth
                label="Datos de facturación del cliente"
                value={datosCliente}
                onChange={(e) => setDatosCliente(e.target.value)}
                multiline
                rows={4}
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleGuardarDatosCliente}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar datos'}
              </Button>
            </Stack>
          )}

          {/* Tab 2 – Usuarios */}
          {tab === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Seleccioná qué usuarios tienen acceso a este proyecto.
              </Typography>

              {loadingUsuarios ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : usuarios.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay usuarios registrados en la empresa.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {usuarios.map((u) => (
                    <ListItem
                      key={u.id}
                      dense
                      button
                      onClick={() => toggleUsuario(u.id)}
                      sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                      <Checkbox
                        edge="start"
                        checked={usuariosAsignados.includes(u.id)}
                        disableRipple
                        size="small"
                      />
                      <ListItemText
                        primary={`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                        secondary={u.email}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleGuardarUsuarios}
                disabled={saving || loadingUsuarios}
              >
                {saving ? 'Guardando…' : 'Guardar usuarios'}
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
