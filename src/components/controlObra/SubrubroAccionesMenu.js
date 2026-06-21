import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete, Box, Button, Divider, ListItemIcon, Menu, MenuItem, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaidIcon from '@mui/icons-material/Paid';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ControlObraService from 'src/services/controlObra/controlObraService';
import proveedorService from 'src/services/proveedorService';
import profileService from 'src/services/profileService';
import NuevoCertificadoDialog from 'src/components/controlObra/NuevoCertificadoDialog';
import ImputarGastoDialog from 'src/components/controlObra/ImputarGastoDialog';
import EditarTareaDrawer from 'src/components/controlObra/EditarTareaDrawer';

// Menú de acciones sobre una tarea (sub-rubro) de Ejecución.
export default function SubrubroAccionesMenu({ obra, subrubro, empresaId, anchorEl, onClose }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null); // 'avance' | 'editar' | 'certificar' | 'imputar'
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const cerrarTodo = () => { setDialog(null); onClose(); };

  if (!subrubro) return null;

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && !dialog} onClose={onClose}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {subrubro.nombre} · físico {subrubro.avance_pct}% · cert {subrubro.cert_pct || 0}%
            {subrubro.responsable ? ` · 🙋 ${subrubro.responsable.nombre}` : ''}
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => setDialog('avance')}>
          <ListItemIcon><TimelineIcon fontSize="small" /></ListItemIcon>Registrar avance físico
        </MenuItem>
        <MenuItem onClick={() => setDialog('certificar')}>
          <ListItemIcon><AssignmentTurnedInIcon fontSize="small" /></ListItemIcon>Certificar avance
        </MenuItem>
        <MenuItem onClick={() => setDialog('imputar')}>
          <ListItemIcon><PaidIcon fontSize="small" /></ListItemIcon>Imputar gasto
        </MenuItem>
        <MenuItem onClick={() => setDialog('responsable')}>
          <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
          {subrubro.responsable ? 'Editar responsable' : 'Asignar responsable'}
        </MenuItem>
        <MenuItem onClick={() => setDialog('contrato')}>
          <ListItemIcon><EngineeringIcon fontSize="small" /></ListItemIcon>
          {subrubro.contrato_proveedor ? 'Editar proveedor / contrato' : 'Asignar proveedor / contrato'}
        </MenuItem>
        <MenuItem onClick={() => setDialog('editar')}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Editar tarea
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setDialog('eliminar')} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>Eliminar tarea
        </MenuItem>
      </Menu>

      {dialog === 'avance' && (
        <RegistrarAvanceDialog obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'editar' && (
        <EditarTareaDrawer obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'certificar' && (
        <NuevoCertificadoDialog open obra={obra} empresaId={empresaId} subrubroUid={subrubro.uid} onClose={cerrarTodo} onCreated={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'imputar' && (
        <ImputarGastoDialog open obra={obra} empresaId={empresaId} subrubroUid={subrubro.uid} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'responsable' && (
        <ResponsableDrawer obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'contrato' && (
        <ContratoProveedorDrawer obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'eliminar' && (
        <EliminarSubrubroDialog obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
    </>
  );
}

function EliminarSubrubroDialog({ obra, subrubro, empresaId, onClose, onDone }) {
  const [error, setError] = useState(null);
  const borrar = useMutation({
    mutationFn: () => ControlObraService.eliminarSubrubro(obra._id, subrubro.uid, empresaId),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  return (
    <FormDrawer
      open onClose={onClose} title="Eliminar tarea"
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={borrar.isPending} onClick={() => { setError(null); borrar.mutate(); }}>Eliminar</Button>
        </>
      )}
    >
      <Typography variant="body2">¿Eliminar <b>{subrubro.nombre}</b>? Queda registrado en el historial.</Typography>
      {(subrubro.cert_pct || 0) > 0 && <Typography variant="caption" color="error" display="block" mt={1}>No se puede: tiene avance certificado.</Typography>}
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}

function RegistrarAvanceDialog({ obra, subrubro, empresaId, onClose, onDone }) {
  const [pct, setPct] = useState(String(subrubro.avance_pct ?? 0));
  const [error, setError] = useState(null);
  const guardar = useMutation({
    mutationFn: () => ControlObraService.registrarAvance(obra._id, subrubro.uid, empresaId, Number(pct)),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  return (
    <FormDrawer
      open onClose={onClose} title={`Registrar avance · ${subrubro.nombre}`}
      subtitle={`% de avance físico acumulado (lo ejecutado en obra). Mínimo: lo ya certificado (${subrubro.cert_pct || 0}%).`}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={guardar.isPending} onClick={() => { setError(null); guardar.mutate(); }}>Guardar</Button>
        </>
      )}
    >
      <TextField type="number" label="Avance físico %" value={pct} onChange={(e) => setPct(e.target.value)} fullWidth size="small" inputProps={{ min: subrubro.cert_pct || 0, max: 100 }} />
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}

const nombreProfile = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim() || p?.email || '';
const fmtArs = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// Asigna el responsable interno de la tarea: un miembro del equipo (Profile) o
// un nombre de texto libre.
function ResponsableDrawer({ obra, subrubro, empresaId, onClose, onDone }) {
  const r = subrubro.responsable || null;
  const [valor, setValor] = useState(r ? { _id: r.user_id, nombre: r.nombre } : null);
  const [error, setError] = useState(null);

  const equipoQ = useQuery({
    queryKey: ['profiles', empresaId],
    queryFn: () => profileService.getProfileByEmpresa(empresaId),
    enabled: !!empresaId,
  });
  const equipo = Array.isArray(equipoQ.data) ? equipoQ.data : [];

  const guardar = useMutation({
    mutationFn: () => ControlObraService.asignarResponsable(obra._id, subrubro.uid, empresaId, {
      user_id: valor?._id || valor?.user_id || null,
      nombre: typeof valor === 'string' ? valor : (valor?.nombre || nombreProfile(valor)),
    }),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  const quitar = useMutation({
    mutationFn: () => ControlObraService.asignarResponsable(obra._id, subrubro.uid, empresaId, null),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const nombreFinal = typeof valor === 'string' ? valor.trim() : (valor?.nombre || nombreProfile(valor)).trim();

  return (
    <FormDrawer
      open onClose={onClose} title="Responsable de la tarea"
      subtitle={subrubro.nombre}
      actions={(
        <>
          {r && <Button color="error" disabled={quitar.isPending} onClick={() => { setError(null); quitar.mutate(); }} sx={{ mr: 'auto' }}>Quitar</Button>}
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={guardar.isPending || !nombreFinal} onClick={() => { setError(null); guardar.mutate(); }}>Guardar</Button>
        </>
      )}
    >
      <Autocomplete
        freeSolo
        options={equipo}
        loading={equipoQ.isLoading}
        getOptionLabel={(p) => (typeof p === 'string' ? p : (p?.nombre || nombreProfile(p)))}
        value={valor}
        onChange={(_, v) => setValor(typeof v === 'string' ? { _id: null, nombre: v } : v)}
        onInputChange={(_, v, reason) => { if (reason === 'input') setValor({ _id: null, nombre: v }); }}
        isOptionEqualToValue={(o, v) => (o._id || o.nombre) === (v._id || v.nombre)}
        renderInput={(params) => <TextField {...params} label="Responsable" size="small" helperText="Elegí un miembro del equipo o escribí un nombre" />}
      />
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}

// Asigna el contrato del contratista que ejecuta esta tarea: costo + modalidad
// de devengo (avance físico o certificado). Es la base de las órdenes de pago.
function ContratoProveedorDrawer({ obra, subrubro, empresaId, onClose, onDone }) {
  const c = subrubro.contrato_proveedor || null;
  const [proveedor, setProveedor] = useState(c ? { _id: c.proveedor_id, nombre: c.proveedor_nombre } : null);
  const [monto, setMonto] = useState(c ? String(c.monto ?? '') : '');
  const [modalidad, setModalidad] = useState(c?.modalidad || 'avance_fisico');
  const [error, setError] = useState(null);

  const proveedoresQ = useQuery({
    queryKey: ['proveedores', empresaId],
    queryFn: () => proveedorService.getByEmpresa(empresaId),
    enabled: !!empresaId,
  });
  const proveedores = Array.isArray(proveedoresQ.data) ? proveedoresQ.data : [];

  const guardar = useMutation({
    mutationFn: () => ControlObraService.asignarContrato(obra._id, subrubro.uid, empresaId, {
      proveedor_id: proveedor?._id || null,
      proveedor_nombre: proveedor?.nombre || proveedor?.razon_social || '',
      monto: Number(monto) || 0,
      modalidad,
    }),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  const quitar = useMutation({
    mutationFn: () => ControlObraService.asignarContrato(obra._id, subrubro.uid, empresaId, null),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const nombreValido = !!(proveedor?.nombre || proveedor?.razon_social);

  return (
    <FormDrawer
      open onClose={onClose} title="Proveedor / contrato"
      subtitle={`${subrubro.nombre} · contrato con el cliente ${(subrubro.contrato || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}`}
      width={460}
      actions={(
        <>
          {c && <Button color="error" disabled={quitar.isPending} onClick={() => { setError(null); quitar.mutate(); }} sx={{ mr: 'auto' }}>Quitar</Button>}
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={guardar.isPending || !nombreValido} onClick={() => { setError(null); guardar.mutate(); }}>Guardar</Button>
        </>
      )}
    >
      <Stack spacing={2}>
        <Autocomplete
          freeSolo
          options={proveedores}
          loading={proveedoresQ.isLoading}
          getOptionLabel={(p) => (typeof p === 'string' ? p : (p?.nombre || p?.razon_social || ''))}
          value={proveedor}
          onChange={(_, v) => setProveedor(typeof v === 'string' ? { _id: null, nombre: v } : v)}
          onInputChange={(_, v, reason) => { if (reason === 'input') setProveedor({ _id: null, nombre: v }); }}
          isOptionEqualToValue={(o, v) => (o._id || o.nombre) === (v._id || v.nombre)}
          renderInput={(params) => <TextField {...params} label="Contratista / proveedor" size="small" helperText="Elegí uno existente o escribí un nombre nuevo" />}
        />
        <TextField
          label="Costo del contrato" type="number" size="small" value={monto}
          onChange={(e) => setMonto(e.target.value)}
          helperText="Lo que se le paga al contratista por esta tarea (su costo, no el precio al cliente)"
        />
        {(() => {
          const precio = subrubro.contrato || 0;
          const costo = Number(monto) || 0;
          const margen = precio - costo;
          const margenPct = precio > 0 ? Math.round((margen / precio) * 1000) / 10 : null;
          return (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Precio al cliente</Typography>
                <Typography variant="caption">{fmtArs(precio)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Costo planificado (proveedor)</Typography>
                <Typography variant="caption">{fmtArs(costo)}</Typography>
              </Stack>
              <Divider sx={{ my: 0.75 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" fontWeight={600}>Margen de la tarea</Typography>
                <Typography variant="caption" fontWeight={600} color={margen >= 0 ? 'success.main' : 'error.main'}>
                  {fmtArs(margen)}{margenPct != null ? ` · ${margenPct}%` : ''}
                </Typography>
              </Stack>
            </Box>
          );
        })()}
        <div>
          <Typography variant="caption" color="text.secondary">Devengar el pago por…</Typography>
          <ToggleButtonGroup exclusive size="small" value={modalidad} onChange={(_, v) => v && setModalidad(v)} sx={{ mt: 0.5, display: 'flex' }}>
            <ToggleButton value="avance_fisico" sx={{ flex: 1 }}>Avance físico</ToggleButton>
            <ToggleButton value="certificado" sx={{ flex: 1 }}>Certificado</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {modalidad === 'avance_fisico'
              ? 'La orden se sugiere según lo ejecutado en obra (avance físico).'
              : 'La orden se sugiere según lo certificado al cliente.'}
          </Typography>
        </div>
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}

