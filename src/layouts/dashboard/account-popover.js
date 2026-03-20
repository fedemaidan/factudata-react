import { useCallback, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  MenuList,
  Popover,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAuth } from "src/hooks/use-auth";
import { useAuthContext } from "src/contexts/auth-context";
import { SpyAccountModal } from "src/components/spyAccountModal";
import SDRService from "src/services/sdrService";
import { clearAllBrowserStorage } from "src/utils/clearBrowserStorage";

export const AccountPopover = (props) => {
  const { anchorEl, onClose, open } = props;
  const router = useRouter();
  const auth = useAuth();
  const {
    user,
    updateUserEmail,
    reauthenticateUser,
    isSpying,
    spyUser,
    returnToOriginalUser,
    originalUser,
  } = useAuthContext();

  // --- Sign out ---
  const handleSignOut = useCallback(() => {
    onClose?.();
    auth.signOut();
    router.push("/auth/login");
    clearAllBrowserStorage().catch(() => {});
  }, [onClose, auth, router]);

  // --- Cambiar email (UI estado) ---
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // --- Reautenticación (UI estado) ---
  const [reauthOpen, setReauthOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);
  // guardamos el intento para reintentar después de reauth
  const [pendingEmailAfterReauth, setPendingEmailAfterReauth] = useState(null);

  // --- Espiar cuenta (UI estado) ---
  const [spyOpen, setSpyOpen] = useState(false);

  // --- Snackbar feedback ---
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const handleOpenChangeEmail = useCallback(() => {
    setNewEmail(user?.email || "");
    setEmailOpen(true);
  }, [user?.email]);

  const handleCloseChangeEmail = useCallback(() => {
    if (!savingEmail) setEmailOpen(false);
  }, [savingEmail]);

  const emailError = useMemo(() => {
    if (!emailOpen) return "";
    if (!newEmail) return "El email es obligatorio";
    const re = /\S+@\S+\.\S+/;
    return re.test(newEmail) ? "" : "Ingresá un email válido";
  }, [emailOpen, newEmail]);

  const handleConfirmChangeEmail = useCallback(async () => {
    if (emailError) return;
    try {
      setSavingEmail(true);
      await updateUserEmail(user.id, newEmail);
      setSnack({ open: true, message: "Email actualizado correctamente.", severity: "success" });
      setEmailOpen(false);
    } catch (error) {
      if (error?.code === "auth/requires-recent-login") {
        // Guardamos el email que queríamos setear y pedimos contraseña
        setPendingEmailAfterReauth(newEmail);
        setReauthOpen(true);
      } else {
        setSnack({
          open: true,
          message: error?.message || "No se pudo actualizar el email.",
          severity: "error",
        });
      }
    } finally {
      setSavingEmail(false);
    }
  }, [emailError, newEmail, updateUserEmail, user?.id]);

  // --- Reautenticar y reintentar el cambio de email ---
  const handleReauthAndRetry = useCallback(async () => {
    try {
      setReauthLoading(true);
      await reauthenticateUser(currentPassword);
      setReauthOpen(false);
      setCurrentPassword("");

      if (pendingEmailAfterReauth) {
        // reintento
        setSavingEmail(true);
        await updateUserEmail(user.id, pendingEmailAfterReauth);
        setSnack({ open: true, message: "Email actualizado correctamente.", severity: "success" });
        setEmailOpen(false);
        setPendingEmailAfterReauth(null);
      }
    } catch (error) {
      const msg =
        error?.code === "auth/wrong-password"
          ? "La contraseña es incorrecta."
          : error?.message || "No se pudo confirmar tu identidad.";
      setSnack({ open: true, message: msg, severity: "error" });
    } finally {
      setReauthLoading(false);
      setSavingEmail(false);
    }
  }, [currentPassword, pendingEmailAfterReauth, reauthenticateUser, updateUserEmail, user?.id]);

  const handleOpenSpyUser = useCallback(() => {
    setSpyOpen(true);
    onClose?.();
  }, [onClose]);

  const handleCloseSpyUser = useCallback(() => {
    setSpyOpen(false);
  }, []);

  const handleSpyUser = useCallback(
    async (selectedUser) => {
      try {
        await spyUser(selectedUser);
      } catch (error) {
        console.error("Error spying user:", error);
      }
    },
    [spyUser]
  );

  const handleReturnToOriginalUser = useCallback(() => {
    returnToOriginalUser();
    onClose?.();
  }, [onClose, returnToOriginalUser]);

  // --- Buscar contacto SDR ---
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [busquedaResultados, setBusquedaResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const busquedaTimer = useRef(null);

  const handleOpenBuscar = useCallback(() => {
    setBuscarOpen(true);
    setBusquedaTexto('');
    setBusquedaResultados([]);
    onClose?.();
  }, [onClose]);

  const handleBuscar = useCallback((texto) => {
    setBusquedaTexto(texto);
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    if (!texto || texto.length < 2) { setBusquedaResultados([]); return; }
    busquedaTimer.current = setTimeout(async () => {
      setBuscando(true);
      try {
        // Admin: buscar sin filtro de empresa para encontrar todos los contactos
        const res = await SDRService.listarContactos({ busqueda: texto, limit: 15 });
        setBusquedaResultados(res.contactos || []);
      } catch (err) {
        console.error('Error buscando contacto:', err);
      } finally {
        setBuscando(false);
      }
    }, 350);
  }, []);

  const handleSeleccionarContacto = useCallback((contacto) => {
    setBuscarOpen(false);
    setBusquedaTexto('');
    setBusquedaResultados([]);
    router.push(`/sdr/contacto/${contacto._id}`);
  }, [router]);

  return (
    <>
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        onClose={onClose}
        open={open}
        PaperProps={{ sx: { width: 240 } }}
      >
        <Box sx={{ py: 1.5, px: 2 }}>
          <Typography variant="overline">Account</Typography>
          <Typography color="text.secondary" variant="body2">
            {user?.name || user?.firstName || user?.email || "Usuario"}
          </Typography>
        </Box>
        <Divider />
        <MenuList
          disablePadding
          dense
          sx={{
            p: "8px",
            "& > *": { borderRadius: 1 },
          }}
        >
          <MenuItem onClick={handleOpenChangeEmail}>Cambiar email</MenuItem>
          {originalUser?.admin &&
            (!isSpying() ? (
              <MenuItem onClick={handleOpenSpyUser}>Espiar cuenta</MenuItem>
            ) : (
              <MenuItem onClick={handleReturnToOriginalUser}>Volver a la cuenta original</MenuItem>
            ))}
          {user?.sdr === true && (
            <MenuItem onClick={handleOpenBuscar}>
              <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
              Buscar contacto SDR
            </MenuItem>
          )}

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        </MenuList>
      </Popover>

      {/* Modal Cambiar Email */}
      <Dialog open={emailOpen} onClose={handleCloseChangeEmail} fullWidth maxWidth="sm">
        <DialogTitle>Cambiar email</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ingresá tu nuevo correo electrónico. Por seguridad, puede que te pidamos confirmar tu
            identidad.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nuevo email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError || " "}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseChangeEmail} disabled={savingEmail}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmChangeEmail}
            variant="contained"
            disabled={!!emailError || savingEmail}
          >
            {savingEmail ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Reautenticación */}
      <Dialog
        open={reauthOpen}
        onClose={() => !reauthLoading && setReauthOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirmar identidad</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Por seguridad, ingresá tu contraseña actual para continuar.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReauthOpen(false)} disabled={reauthLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleReauthAndRetry}
            variant="contained"
            disabled={!currentPassword || reauthLoading}
          >
            {reauthLoading ? "Verificando…" : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      <SpyAccountModal
        open={spyOpen}
        onClose={handleCloseSpyUser}
        onSpyUser={handleSpyUser}
        user={user}
      />

      {/* Modal Buscar Contacto SDR */}
      <Dialog open={buscarOpen} onClose={() => setBuscarOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Buscar contacto SDR</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            placeholder="Nombre, teléfono, empresa o email..."
            value={busquedaTexto}
            onChange={(e) => handleBuscar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && busquedaResultados.length === 1) handleSeleccionarContacto(busquedaResultados[0]);
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: buscando ? <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment> : null,
            }}
            sx={{ mt: 1 }}
          />
          {busquedaResultados.length > 0 && (
            <List dense sx={{ mt: 1, maxHeight: 350, overflow: 'auto' }}>
              {busquedaResultados.map((c) => (
                <ListItemButton key={c._id} onClick={() => handleSeleccionarContacto(c)} sx={{ borderRadius: 1, mb: 0.5 }}>
                  <ListItemText
                    primary={c.nombre}
                    secondary={
                      <Stack direction="row" spacing={1} alignItems="center" component="span" flexWrap="wrap">
                        <Typography variant="caption" component="span" color="text.secondary">{c.telefono}</Typography>
                        {c.empresa && <Typography variant="caption" component="span" color="text.secondary">• {c.empresa}</Typography>}
                        {c.sdrAsignadoNombre && <Typography variant="caption" component="span" color="primary">📋 {c.sdrAsignadoNombre}</Typography>}
                        {c.estado && <Chip label={c.estado} size="small" component="span" sx={{ height: 18, fontSize: '0.65rem' }} />}
                      </Stack>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
          {busquedaTexto && busquedaTexto.length >= 2 && !buscando && busquedaResultados.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Sin resultados
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBuscarOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
};

AccountPopover.propTypes = {
  anchorEl: PropTypes.any,
  onClose: PropTypes.func,
  open: PropTypes.bool.isRequired,
};
