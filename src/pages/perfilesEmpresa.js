// pages/perfiles.js
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import Head from 'next/head';
import { useAuthContext } from 'src/contexts/auth-context';
import profileService from 'src/services/profileService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';

const PerfilesEmpresaPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const fetchProfiles = async () => {
    if (!user?.empresa) return;
    setIsLoading(true);
    try {
      const perfiles = await profileService.getProfileByEmpresa(user.empresa.id);
      setProfiles(perfiles);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al cargar los perfiles', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  return (
    <>
      <Head>
        <title>Perfiles de la Empresa</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Perfiles de la Empresa</Typography>

            <Box display="flex" justifyContent="flex-end">
              <Button variant="outlined" onClick={fetchProfiles}>
                Refrescar
              </Button>
            </Box>

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress />
              </Box>
            ) : (
              <Paper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>{`${profile.firstName} ${profile.lastName}`}</TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>{profile.phone}</TableCell>
                        <TableCell>
                          <Button
                            color="primary"
                            onClick={() => router.push(`/cajaChica?userId=${profile.id}`)}
                          >
                            Ver caja
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Container>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

PerfilesEmpresaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PerfilesEmpresaPage;
