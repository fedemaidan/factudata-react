import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  Link,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Layout as AuthLayout } from 'src/layouts/auth/layout';
import { useAuth } from 'src/hooks/use-auth';
import { useCallback, useMemo, useState } from 'react';

const Page = () => {
  const [isLoading, setIsLoading] = useState(false);

  // --- Forgot Password UI state ---
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSended, setForgotSended] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const router = useRouter();
  const auth = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      submit: null
    },
    validationSchema: Yup.object({
      email: Yup
        .string()
        .email('Debe ser un email válido')
        .max(255)
        .required('El email es obligatorio'),
      password: Yup
        .string()
        .max(255)
        .required('La contraseña es obligatoria')
    }),
    onSubmit: async (values, helpers) => {
      try {
        setIsLoading(true);
        await auth.classicSignIn(values.email, values.password);
        router.push('/');
        setIsLoading(false);
      } catch (err) {
        helpers.setStatus({ success: false });
        helpers.setErrors({ submit: err.message });
        helpers.setSubmitting(false);
        setIsLoading(false);
      }
    }
  });

  // Sincronizá el email del login con el del modal por comodidad
  const handleOpenForgot = useCallback(() => {
    setForgotEmail(formik.values.email || '');
    setForgotOpen(true);
  }, [formik.values.email]);

  const handleCloseForgot = useCallback(() => {
    if (!forgotSending) setForgotOpen(false);
  }, [forgotSending]);

  const forgotEmailError = useMemo(() => {
    if (!forgotOpen) return '';
    if (!forgotEmail) return 'El email es obligatorio';
    // Validación simple de email
    const re = /\S+@\S+\.\S+/;
    return re.test(forgotEmail) ? '' : 'Ingresá un email válido';
  }, [forgotOpen, forgotEmail]);

  const handleSendReset = useCallback(async () => {
    if (forgotEmailError) return;
    setForgotSended(true);
    try {
      setForgotSending(true);
      // Si tenés página propia de reset, tu AuthProvider ya puede estar enviando con actionCodeSettings.
      await auth.sendResetPasswordEmail(forgotEmail);
      setSnack({
        open: true,
        message: 'Te enviamos un correo para restablecer tu contraseña desde el email "noreply@factudata-3afdf.firebaseapp.com". Revisa tu bandeja de spam.',
        severity: 'success'
      });
      setForgotOpen(false);
    } catch (error) {
      setSnack({
        open: true,
        message: error?.message || 'No pudimos enviar el email de restablecimiento.',
        severity: 'error'
      });
    } finally {
      setForgotSending(false);
    }
  }, [auth, forgotEmail, forgotEmailError]);

  return (
    <>
      <Head>
        <title>
          Login | Sorbydata
        </title>
      </Head>

      <Box
        sx={{
          backgroundColor: 'background.paper',
          flex: '1 1 auto',
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Box
          sx={{
            maxWidth: 550,
            px: 3,
            py: '100px',
            width: '100%'
          }}
        >
          <div>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h4">
                Login
              </Typography>

              <Typography color="text.secondary" variant="body2">
                ¿No estás registrado? &nbsp;
                <Link
                  component={NextLink}
                  href="/auth/register"
                  underline="hover"
                  variant="subtitle2"
                >
                  Registrarme
                </Link>
              </Typography>
              {forgotSended && <Typography color="text.secondary" variant="body2">
                Revisa tu bandeja de spam si no ves el email de restablecimiento. Llega del email "noreply@factudata-3afdf.firebaseapp.com".
              </Typography>}
            </Stack>

            <form noValidate onSubmit={formik.handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  error={!!(formik.touched.email && formik.errors.email)}
                  fullWidth
                  helperText={formik.touched.email && formik.errors.email}
                  label="Email"
                  name="email"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type="email"
                  value={formik.values.email}
                />

                <TextField
                  error={!!(formik.touched.password && formik.errors.password)}
                  fullWidth
                  helperText={formik.touched.password && formik.errors.password}
                  label="Contraseña"
                  name="password"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type="password"
                  value={formik.values.password}
                />

                {/* Link "Olvidaste tu contraseña" */}
                <Box sx={{ textAlign: 'right', mt: -1 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleOpenForgot}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </Box>
              </Stack>

              {formik.errors.submit && (
                <Typography color="error" sx={{ mt: 3 }} variant="body2">
                  {formik.errors.submit}
                </Typography>
              )}

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mt: 3,
                }}
              >
                {!isLoading && (
                  <Button
                    fullWidth
                    size="large"
                    sx={{ mt: 3 }}
                    type="submit"
                    variant="contained"
                  >
                    Continuar
                  </Button>
                )}
                {isLoading && <CircularProgress sx={{ mt: 3 }} />}
              </Box>
            </form>
          </div>
        </Box>
      </Box>

      {/* Modal de "Olvidé mi contraseña" */}
      <Dialog open={forgotOpen} onClose={handleCloseForgot} fullWidth maxWidth="sm">
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Email"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            error={!!forgotEmailError}
            helperText={forgotEmailError || ' '}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseForgot} disabled={forgotSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendReset}
            variant="contained"
            disabled={!!forgotEmailError || forgotSending}
            startIcon={forgotSending ? <CircularProgress size={18} /> : null}
          >
            {forgotSending ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de feedback */}
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

Page.getLayout = (page) => (
  <AuthLayout>
    {page}
  </AuthLayout>
);

export default Page;
