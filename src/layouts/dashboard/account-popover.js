import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  MenuList,
  Popover,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from 'src/hooks/use-auth';
import { useAuthContext } from 'src/contexts/auth-context';

export const AccountPopover = (props) => {
  const { anchorEl, onClose, open } = props;
  const router = useRouter();
  const auth = useAuth();
  const { user, updateUserEmail, reauthenticateUser } = useAuthContext();

  // --- Sign out ---
  const handleSignOut = useCallback(() => {
    onClose?.();
    auth.signOut();
    router.push('/auth/login');
  }, [onClose, auth, router]);

  // --- Cambiar email (UI estado) ---
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // --- Reautenticación (UI estado) ---
  const [reauthOpen, setReauthOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  // guardamos el intento para reintentar después de reauth
  const [pendingEmailAfterReauth, setPendingEmailAfterReauth] = useState(null);

  // --- Snackbar feedback ---
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const handleOpenChangeEmail = useCallback(() => {
    setNewEmail(user?.email || '');
    setEmailOpen(true);
  }, [user?.email]);

  const handleCloseChangeEmail = useCallback(() => {
    if (!savingEmail) setEmailOpen(false);
  }, [savingEmail]);

  const emailError = useMemo(() => {
    if (!emailOpen) return '';
    if (!newEmail) return 'El email es obligatorio';
    const re = /\S+@\S+\.\S+/;
    return re.test(newEmail) ? '' : 'Ingresá un email válido';
  }, [emailOpen, newEmail]);

  const handleConfirmChangeEmail = useCallback(async () => {
    if (emailError) return;
    try {
      setSavingEmail(true);
      await updateUserEmail(user.id, newEmail);
      setSnack({ open: true, message: 'Email actualizado correctamente.', severity: 'success' });
      setEmailOpen(false);
    } catch (error) {
      if (error?.code === 'auth/requires-recent-login') {
        // Guardamos el email que queríamos setear y pedimos contraseña
        setPendingEmailAfterReauth(newEmail);
        setReauthOpen(true);
      } else {
        setSnack({
          open: true,
          message: error?.message || 'No se pudo actualizar el email.',
          severity: 'error'
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
      setCurrentPassword('');

      if (pendingEmailAfterReauth) {
        // reintento
        setSavingEmail(true);
        await updateUserEmail(user.id, pendingEmailAfterReauth);
        setSnack({ open: true, message: 'Email actualizado correctamente.', severity: 'success' });
        setEmailOpen(false);
        setPendingEmailAfterReauth(null);
      }
    } catch (error) {
      const msg = error?.code === 'auth/wrong-password'
        ? 'La contraseña es incorrecta.'
        : (error?.message || 'No se pudo confirmar tu identidad.');
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setReauthLoading(false);
      setSavingEmail(false);
    }
  }, [currentPassword, pendingEmailAfterReauth, reauthenticateUser, updateUserEmail, user?.id]);

  return (
    <>
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        onClose={onClose}
        open={open}
        PaperProps={{ sx: { width: 240 } }}
      >
        <Box sx={{ py: 1.5, px: 2 }}>
          <Typography variant="overline">Account</Typography>
          <Typography color="text.secondary" variant="body2">
            {user?.name || user?.firstName || user?.email || 'Usuario'}
          </Typography>
        </Box>
        <Divider />
        <MenuList
          disablePadding
          dense
          sx={{
            p: '8px',
            '& > *': { borderRadius: 1 }
          }}
        >
          <MenuItem onClick={handleOpenChangeEmail}>
            Cambiar email
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={handleSignOut}>
            Sign out
          </MenuItem>
        </MenuList>
      </Popover>

      {/* Modal Cambiar Email */}
      <Dialog open={emailOpen} onClose={handleCloseChangeEmail} fullWidth maxWidth="sm">
        <DialogTitle>Cambiar email</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ingresá tu nuevo correo electrónico. Por seguridad, puede que te pidamos confirmar tu identidad.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nuevo email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError || ' '}
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
            {savingEmail ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Reautenticación */}
      <Dialog open={reauthOpen} onClose={() => !reauthLoading && setReauthOpen(false)} fullWidth maxWidth="sm">
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
            {reauthLoading ? 'Verificando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
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
  open: PropTypes.bool.isRequired
};
