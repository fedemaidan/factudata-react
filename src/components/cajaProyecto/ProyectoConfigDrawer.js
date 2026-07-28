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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import SquareFootOutlinedIcon from '@mui/icons-material/SquareFootOutlined';
import { updateProyecto } from 'src/services/proyectosService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import profileService from 'src/services/profileService';
import { MONEDAS } from 'src/components/presupuestosProfesionales/constants';

const DRAWER_WIDTH = 400;

export default function ProyectoConfigDrawer({ open, onClose, proyecto, empresa, onProyectoUpdated, initialTab = 0 }) {
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { severity, message }

  // ── Tab 0: Nombre ──
  const [nombre, setNombre] = useState('');

  // ── Tab 1: Datos cliente ──
  const [datosCliente, setDatosCliente] = useState('');

  // ── Tab: Costo por m² (TAR-439) ──
  const [superficieM2, setSuperficieM2] = useState('');
  const [costoObjetivoM2, setCostoObjetivoM2] = useState('');
  const [costoMaximoM2, setCostoMaximoM2] = useState('');
  const [monedaObjetivo, setMonedaObjetivo] = useState('ARS');

  // ── Tab 2: Usuarios ──
  const [usuarios, setUsuarios] = useState([]); // todos los de la empresa
  const [usuariosAsignados, setUsuariosAsignados] = useState([]); // IDs seleccionados
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Cargar datos cuando se abre el drawer
  useEffect(() => {
    if (!open || !proyecto) return;
    setNombre(proyecto.nombre || '');
    setDatosCliente(proyecto.datos_facturacion_cliente || '');
    setSuperficieM2(proyecto.superficie_total_m2 ?? '');
    setCostoObjetivoM2(proyecto.costo_objetivo_m2 ?? '');
    setCostoMaximoM2(proyecto.costo_maximo_m2 ?? '');
    setMonedaObjetivo(proyecto.moneda_objetivo || 'ARS');
    setFeedback(null);
    setTab(initialTab);
  }, [open, proyecto, initialTab]);

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

  // ── Guardar costo por m² (TAR-439) ──
  const handleGuardarCostoM2 = useCallback(async () => {
    if (!proyecto?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      // Normalizar '' → null y sellar la fecha solo si cambió algún dato de costo.
      const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
      const superficie = numOrNull(superficieM2);
      const objetivoM2 = numOrNull(costoObjetivoM2);
      const maximoM2 = numOrNull(costoMaximoM2);
      const moneda = monedaObjetivo || 'ARS';
      const costosCambiaron =
        superficie !== (proyecto.superficie_total_m2 ?? null) ||
        objetivoM2 !== (proyecto.costo_objetivo_m2 ?? null) ||
        maximoM2 !== (proyecto.costo_maximo_m2 ?? null) ||
        moneda !== (proyecto.moneda_objetivo ?? 'ARS');
      const fechaActualizacionCostos = costosCambiaron
        ? new Date().toISOString()
        : (proyecto.fecha_actualizacion_costos ?? null);

      const cambios = {
        superficie_total_m2: superficie,
        costo_objetivo_m2: objetivoM2,
        costo_maximo_m2: maximoM2,
        moneda_objetivo: moneda,
        fecha_actualizacion_costos: fechaActualizacionCostos,
      };
      await updateProyecto(proyecto.id, { ...proyecto, ...cambios });
      setFeedback({ severity: 'success', message: 'Valores por m² actualizados' });
      onProyectoUpdated?.({ ...proyecto, ...cambios });
    } catch (e) {
      console.error(e);
      setFeedback({ severity: 'error', message: 'Error al actualizar los valores por m²' });
    } finally {
      setSaving(false);
    }
  }, [proyecto, superficieM2, costoObjetivoM2, costoMaximoM2, monedaObjetivo, onProyectoUpdated]);

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
          <Tab icon={<SquareFootOutlinedIcon />} label="m²" iconPosition="start" sx={{ minHeight: 48 }} />
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

          {/* Tab 2 – Costo por m² (TAR-439) */}
          {tab === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Datos para seguir el gasto por metro cuadrado de la obra. Todos opcionales; la superficie es la que habilita el cálculo.
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Superficie total"
                value={superficieM2}
                onChange={(e) => setSuperficieM2(e.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end">m²</InputAdornment> }}
              />
              <TextField
                fullWidth
                type="number"
                label="Costo objetivo por m²"
                value={costoObjetivoM2}
                onChange={(e) => setCostoObjetivoM2(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{monedaObjetivo === 'USD' ? 'U$S' : '$'}</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/m²</InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                type="number"
                label="Tope máximo por m²"
                value={costoMaximoM2}
                onChange={(e) => setCostoMaximoM2(e.target.value)}
                helperText={
                  (costoMaximoM2 !== '' && costoObjetivoM2 !== '' &&
                    Number(costoMaximoM2) < Number(costoObjetivoM2))
                    ? 'El tope es menor que el objetivo'
                    : undefined
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">{monedaObjetivo === 'USD' ? 'U$S' : '$'}</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/m²</InputAdornment>,
                }}
              />
              <FormControl fullWidth>
                <InputLabel id="drawer-moneda-objetivo-label">Moneda del valor objetivo</InputLabel>
                <Select
                  labelId="drawer-moneda-objetivo-label"
                  label="Moneda del valor objetivo"
                  value={monedaObjetivo || 'ARS'}
                  onChange={(e) => setMonedaObjetivo(e.target.value)}
                >
                  {MONEDAS.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Última actualización:{' '}
                {proyecto?.fecha_actualizacion_costos
                  ? new Date(proyecto.fecha_actualizacion_costos).toLocaleDateString('es-AR')
                  : '—'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleGuardarCostoM2}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar valores por m²'}
              </Button>
            </Stack>
          )}

          {/* Tab 3 – Usuarios */}
          {tab === 3 && (
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
