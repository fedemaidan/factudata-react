import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router'; // Nota: Cambiado a useRouter de 'next/router'
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Box, Button, CircularProgress, Link, Stack, TextField, Typography, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { Layout as AuthLayout } from 'src/layouts/auth/layout';
import { useAuth } from 'src/hooks/use-auth';
import profileService from 'src/services/profileService';
import { useState, useEffect } from 'react';

const Page = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasCode, setHasCode] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [empresaName, setEmpresaName] = useState('');
  const router = useRouter();
  const auth = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      code: '',
      submit: null
    },
    validationSchema: Yup.object({
      email: Yup
        .string()
        .email('Debe ser un correo válido')
        .max(255)
        .required('El correo es requerido'),
      password: Yup
        .string()
        .max(255)
        .required('La contraseña es requerida'),
      code: Yup
        .string()
        .when('hasCode', {
          is: true,
          then: Yup.string().required('El código es requerido')
        })
    }),
    onSubmit: async (values, helpers) => {
      try {
        setIsLoading(true);
        if (hasCode) {
          await auth.signUpWithCode(values.email, values.password, values.code);
        } else {
          await auth.signUp(values.email, values.password);
        }
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

  const handleCodeChange = async (event) => {
    const code = event.target.value;
    formik.setFieldValue('code', code);
    if (code.length > 0) {
      setIsLoading(true);
      const profile = await profileService.getProfileByCode(code);

      if (profile) {
        setIsCodeValid(true);
        formik.setFieldValue('email', profile.email);
        setEmpresaName(profile.empresaData.nombre);
      } else {
        setIsCodeValid(false);
        setEmpresaName('');
      }
      setIsLoading(false);
    } else {
      setIsCodeValid(false);
      setEmpresaName('');
    }
  };

  useEffect(() => {
    const { code } = router.query;
    if (code) {
      setHasCode(true);
      handleCodeChange({ target: { value: code } });
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>
          Register | Devias Kit
        </title>
      </Head>
      <Box
        sx={{
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
            <Stack
              spacing={1}
              sx={{ mb: 3 }}
            >
              <Typography variant="h4">
                Register
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
              >
                ¿Ya tienes una cuenta?
                &nbsp;
                <Link
                  component={NextLink}
                  href="/auth/login"
                  underline="hover"
                  variant="subtitle2"
                >
                  Iniciar sesión
                </Link>
              </Typography>
            </Stack>
            <RadioGroup
              row
              value={hasCode}
              onChange={(event) => {
                setHasCode(event.target.value === 'true');
                formik.setFieldValue('code', '');
                setIsCodeValid(false);
                setEmpresaName('');
              }}
            >
              <FormControlLabel value={false} control={<Radio />} label="Nueva Empresa" />
              <FormControlLabel value={true} control={<Radio />} label="Tengo un Código" />
            </RadioGroup>
            <form
              noValidate
              onSubmit={formik.handleSubmit}
            >
              <Stack spacing={3}>
                {hasCode && (
                  <>
                    <TextField
                      error={!!(formik.touched.code && formik.errors.code)}
                      fullWidth
                      helperText={formik.touched.code && formik.errors.code}
                      label="Código de Empresa"
                      name="code"
                      onBlur={formik.handleBlur}
                      onChange={handleCodeChange}
                      type="text"
                      value={formik.values.code}
                    />
                    {isCodeValid && (
                      <Typography variant="body2" color="textSecondary">
                        Registrate para unirte a {empresaName}
                      </Typography>
                    )}
                  </>
                )}
                <TextField
                  error={!!(formik.touched.email && formik.errors.email)}
                  fullWidth
                  helperText={formik.touched.email && formik.errors.email}
                  label="Correo Electrónico"
                  name="email"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type="email"
                  value={formik.values.email}
                  disabled={hasCode && !isCodeValid}
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
                  disabled={hasCode && !isCodeValid}
                />
              </Stack>
              {formik.errors.submit && (
                <Typography
                  color="error"
                  sx={{ mt: 3 }}
                  variant="body2"
                >
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
                {!isLoading && <Button
                  fullWidth
                  size="large"
                  sx={{ mt: 3 }}
                  type="submit"
                  variant="contained"
                  disabled={hasCode && !isCodeValid}
                >
                  Continuar
                </Button>}
                {isLoading && <CircularProgress sx={{ mt: 3 }}/>}
              </Box>
            </form>
          </div>
        </Box>
      </Box>
    </>
  );
};

Page.getLayout = (page) => (
  <AuthLayout>
    {page}
  </AuthLayout>
);

export default Page;
