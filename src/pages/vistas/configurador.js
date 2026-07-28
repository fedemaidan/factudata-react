// Configurador de Vistas útiles — dos tabs:
//   1. "Nivel empresa"  (solo con permiso ADMIN_USUARIOS): activa/desactiva cada vista
//       para la empresa y elige, usuario por usuario, quién puede verla.
//   2. "Para mí"        (cualquier usuario): oculta/muestra en su propio menú las vistas
//       que la empresa dejó disponibles y que ningún admin le restringió.

import { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import {
  Box, Container, Stack, Typography, Card, CardContent, Switch, Alert,
  LinearProgress, Snackbar, Tabs, Tab, Divider, Button, FormControlLabel,
} from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser, updateEmpresaDetails } from 'src/services/empresaService';
import profileService from 'src/services/profileService';
import {
  VISTAS_UTILES, vistaHabilitadaEmpresa, vistaOcultaUsuario, vistaBloqueadaParaUsuario,
} from 'src/config/vistasUtiles';

function puedeAdministrarUsuarios(user, empresa) {
  if (user?.admin) return true;
  const acc = empresa?.acciones || [];
  const ocultos = user?.permisosOcultos || [];
  return acc.includes('ADMIN_USUARIOS') && !ocultos.includes('ADMIN_USUARIOS');
}

const nombreUsuario = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id;

// ─────────────────────────────────────────────────────────────
//  Tab 1: Nivel empresa
// ─────────────────────────────────────────────────────────────
function TabEmpresa({ empresa, usuarios, empresaCfg, vistasUsuarios, onToggleMaster, onToggleUsuario, onTodos }) {
  return (
    <Stack spacing={2}>
      {VISTAS_UTILES.map((v) => {
        const activa = vistaHabilitadaEmpresa({ vistas_config: empresaCfg }, v.id);
        const ocultosPara = vistasUsuarios?.[v.id]?.ocultosPara || [];
        return (
          <Card key={v.id} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ pr: 2 }}>
                  <Typography variant="subtitle1">{v.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{v.descripcion}</Typography>
                </Box>
                <FormControlLabel
                  labelPlacement="start"
                  control={<Switch checked={activa} onChange={(e) => onToggleMaster(v.id, e.target.checked)} />}
                  label={<Typography variant="caption" color="text.secondary">Activa</Typography>}
                />
              </Stack>

              {activa && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>¿Quién puede verla?</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => onTodos(v.id, true)}>Todos</Button>
                      <Button size="small" color="inherit" onClick={() => onTodos(v.id, false)}>Ninguno</Button>
                    </Stack>
                  </Stack>
                  {usuarios.length === 0 && (
                    <Typography variant="caption" color="text.disabled">No hay usuarios para mostrar.</Typography>
                  )}
                  <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {usuarios.map((u) => (
                      <Stack key={u.id} direction="row" alignItems="center" justifyContent="space-between"
                        sx={{ py: 0.75, borderBottom: '0.5px solid', borderColor: 'divider' }}>
                        <Box>
                          <Typography variant="body2">{nombreUsuario(u)}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                        </Box>
                        <Switch
                          size="small"
                          checked={!ocultosPara.includes(u.id)}
                          onChange={(e) => onToggleUsuario(v.id, u.id, e.target.checked)}
                        />
                      </Stack>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

TabEmpresa.propTypes = {
  empresa: PropTypes.object,
  usuarios: PropTypes.array.isRequired,
  empresaCfg: PropTypes.object.isRequired,
  vistasUsuarios: PropTypes.object.isRequired,
  onToggleMaster: PropTypes.func.isRequired,
  onToggleUsuario: PropTypes.func.isRequired,
  onTodos: PropTypes.func.isRequired,
};

// ─────────────────────────────────────────────────────────────
//  Tab 2: Para mí
// ─────────────────────────────────────────────────────────────
function TabParaMi({ empresa, user, ocultasUsuario, onToggle, esAdmin }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">
          Mostrá u ocultá en tu menú las vistas disponibles.
        </Typography>
        <Box sx={{ mt: 1 }}>
          {VISTAS_UTILES.map((v) => {
            const disponibleEmpresa = vistaHabilitadaEmpresa(empresa, v.id);
            const bloqueadaAdmin = vistaBloqueadaParaUsuario(empresa, v.id, user?.id);
            const restringida = !disponibleEmpresa || bloqueadaAdmin;
            const visible = !restringida && !vistaOcultaUsuario({ vistas_ocultas: ocultasUsuario }, v.id);
            return (
              <Stack key={v.id} direction="row" alignItems="center" justifyContent="space-between"
                sx={{ py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider' }}>
                <Box sx={{ pr: 2 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{v.title}</Typography>
                    {restringida && <LockPersonIcon sx={{ fontSize: 15 }} color="disabled" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {bloqueadaAdmin
                      ? 'Restringida por un administrador'
                      : !disponibleEmpresa
                        ? 'Desactivada para la empresa'
                        : v.descripcion}
                  </Typography>
                </Box>
                <Switch
                  checked={visible}
                  disabled={restringida}
                  onChange={(e) => onToggle(v.id, e.target.checked)}
                />
              </Stack>
            );
          })}
        </Box>
        {!esAdmin && (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
            La disponibilidad a nivel empresa la configura quien administra usuarios.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

TabParaMi.propTypes = {
  empresa: PropTypes.object,
  user: PropTypes.object,
  ocultasUsuario: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
  esAdmin: PropTypes.bool,
};

// ─────────────────────────────────────────────────────────────
//  Página
// ─────────────────────────────────────────────────────────────
function ConfiguradorVistas() {
  const { user, updateUser } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empresaCfg, setEmpresaCfg] = useState({});         // vistas_config
  const [vistasUsuarios, setVistasUsuarios] = useState({}); // vistas_usuarios (bloqueos admin)
  const [usuarios, setUsuarios] = useState([]);
  const [ocultasUsuario, setOcultasUsuario] = useState([]);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState('');

  const esAdmin = useMemo(() => puedeAdministrarUsuarios(user, empresa), [user, empresa]);

  useEffect(() => {
    if (!user) return;
    setOcultasUsuario(user?.vistas_ocultas || []);
    getEmpresaDetailsFromUser(user)
      .then(async (e) => {
        setEmpresa(e || null);
        setEmpresaCfg(e?.vistas_config || {});
        setVistasUsuarios(e?.vistas_usuarios || {});
        if (e?.id && puedeAdministrarUsuarios(user, e)) {
          const perfiles = await profileService.getProfileByEmpresa(e.id).catch(() => []);
          setUsuarios(perfiles || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const saveEmpresa = async (patch, revert) => {
    try {
      await updateEmpresaDetails(empresa.id, patch);
      setToast('Cambios guardados');
    } catch {
      revert();
      setToast('No se pudo guardar el cambio');
    }
  };

  // —— Empresa: master on/off ——
  const onToggleMaster = (id, activa) => {
    const prev = empresaCfg;
    const next = { ...empresaCfg, [id]: activa };
    setEmpresaCfg(next);
    saveEmpresa({ vistas_config: next }, () => setEmpresaCfg(prev));
  };

  // —— Empresa: un usuario puntual puede/no puede ver ——
  const onToggleUsuario = (id, userId, puedeVer) => {
    const prev = vistasUsuarios;
    const prevOcultos = vistasUsuarios[id]?.ocultosPara || [];
    const nextOcultos = puedeVer
      ? prevOcultos.filter((x) => x !== userId)
      : [...new Set([...prevOcultos, userId])];
    const next = { ...vistasUsuarios, [id]: { ...(vistasUsuarios[id] || {}), ocultosPara: nextOcultos } };
    setVistasUsuarios(next);
    saveEmpresa({ vistas_usuarios: next }, () => setVistasUsuarios(prev));
  };

  // —— Empresa: todos / ninguno ——
  const onTodos = (id, todos) => {
    const prev = vistasUsuarios;
    const nextOcultos = todos ? [] : usuarios.map((u) => u.id);
    const next = { ...vistasUsuarios, [id]: { ...(vistasUsuarios[id] || {}), ocultosPara: nextOcultos } };
    setVistasUsuarios(next);
    saveEmpresa({ vistas_usuarios: next }, () => setVistasUsuarios(prev));
  };

  // —— Usuario: mostrar/ocultar para mí ——
  const onToggleParaMi = async (id, mostrar) => {
    const prev = ocultasUsuario;
    const next = mostrar ? ocultasUsuario.filter((x) => x !== id) : [...new Set([...ocultasUsuario, id])];
    setOcultasUsuario(next);
    try {
      await updateUser({ ...user, vistas_ocultas: next });
      setToast('Cambios guardados');
    } catch {
      setOcultasUsuario(prev);
      setToast('No se pudo guardar el cambio');
    }
  };

  return (
    <DashboardLayout title="Configurar vistas">
      <Head><title>Configurar vistas · Sorby</title></Head>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>Configurar vistas útiles</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Elegí qué dashboards aparecen en el menú.
        </Typography>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {esAdmin ? (
          <>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Nivel empresa" />
              <Tab label="Para mí" />
            </Tabs>
            {tab === 0 && (
              <TabEmpresa
                empresa={empresa}
                usuarios={usuarios}
                empresaCfg={empresaCfg}
                vistasUsuarios={vistasUsuarios}
                onToggleMaster={onToggleMaster}
                onToggleUsuario={onToggleUsuario}
                onTodos={onTodos}
              />
            )}
            {tab === 1 && (
              <TabParaMi
                empresa={empresa}
                user={user}
                ocultasUsuario={ocultasUsuario}
                onToggle={onToggleParaMi}
                esAdmin={esAdmin}
              />
            )}
          </>
        ) : (
          <TabParaMi
            empresa={empresa}
            user={user}
            ocultasUsuario={ocultasUsuario}
            onToggle={onToggleParaMi}
            esAdmin={esAdmin}
          />
        )}

        <Snackbar
          open={!!toast}
          autoHideDuration={2500}
          onClose={() => setToast('')}
          message={toast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
    </DashboardLayout>
  );
}

export default ConfiguradorVistas;
