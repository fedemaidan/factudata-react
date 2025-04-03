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
  Alert
} from '@mui/material';
import Head from 'next/head';
import { useAuthContext } from 'src/contexts/auth-context';
import profileService from 'src/services/profileService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useRouter } from 'next/router';

const PerfilesEmpresaPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user?.empresa) return;

      try {
        const perfiles = await profileService.getProfileByEmpresa(user.empresa.id);
        setProfiles(perfiles);
      } catch (err) {
        console.error(err);
        setAlert({ open: true, message: 'Error al cargar los perfiles', severity: 'error' });
      }
    };

    fetchProfiles();
  }, [user]);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  const eliminarPerfil = async (id) => {
    try {
      await profileService.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setAlert({ open: true, message: 'Perfil eliminado correctamente', severity: 'success' });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al eliminar el perfil', severity: 'error' });
    }
  };

  return (
    <>
      <Head>
        <title>Perfiles de la Empresa</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Perfiles de la Empresa</Typography>

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
