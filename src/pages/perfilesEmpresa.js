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
import cajaChicaService from 'src/services/cajaChica/cajaChicaService';
import TransferenciaModal from 'src/components/cajaChica/TransferenciaModal';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';

const PerfilesEmpresaPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
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

  const handleOpenTransferModal = () => {
    setTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false);
  };

  const handleCreateTransfer = async (transferData) => {
    setIsTransferLoading(true);
    try {
      console.log('Creando transferencia:', transferData);
      const response = await cajaChicaService.crearTransferencia(transferData);
      console.log('Transferencia creada:', response);
      
      setAlert({ 
        open: true, 
        message: 'Transferencia creada exitosamente', 
        severity: 'success' 
      });
      setTransferModalOpen(false);
      
      // Opcional: Refrescar la lista si tienes una funcionalidad para mostrar transferencias
      // await fetchTransferencias();
      
    } catch (error) {
      console.error('Error al crear transferencia:', error);
      setAlert({ 
        open: true, 
        message: error.message || 'Error al crear la transferencia', 
        severity: 'error' 
      });
    } finally {
      setIsTransferLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Cajas Chicas de la Empresa</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Cajas Chicas de la Empresa</Typography>

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleOpenTransferModal}
                disabled={profiles.length < 2}
              >
                Transferir
              </Button>
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

        <TransferenciaModal
          open={transferModalOpen}
          onClose={handleCloseTransferModal}
          onSubmit={handleCreateTransfer}
          profiles={profiles}
          userActual={user}
          isLoading={isTransferLoading}
          usuarioFijo={null} // En perfiles, seleccionar origen y destino
        />

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
