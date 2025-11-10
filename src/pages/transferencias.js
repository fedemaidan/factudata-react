import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import TransferenciaInternaDialog from 'src/components/TransferenciaInternaDialog';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import { useRouter } from 'next/router';

const TransferenciasPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [proyectos, setProyectos] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  // Datos de ejemplo para mostrar transferencias recientes
  const transferenciasEjemplo = [
    {
      id: 1,
      fecha: new Date(),
      proyectoEmisor: 'Lares 138',
      proyectoReceptor: 'La Martona 259',
      monto: 150000,
      moneda: 'ARS',
      usuario: user?.nombre || 'Usuario',
      estado: 'Completada'
    },
    {
      id: 2,
      fecha: new Date(Date.now() - 86400000), // Ayer
      proyectoEmisor: 'CC / Capri',
      proyectoReceptor: 'Lares 146',
      monto: 2500,
      moneda: 'USD',
      usuario: user?.nombre || 'Usuario',
      estado: 'Completada'
    }
  ];

  const fetchProyectos = useCallback(async () => {
    if (!user?.empresaId) return;
    
    try {
      setLoading(true);
      const result = await getProyectosByEmpresa(user.empresaId);
      if (result && !result.error) {
        setProyectos(result);
      }
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      showAlert('Error al cargar los proyectos', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.empresaId]);

  useEffect(() => {
    fetchProyectos();
  }, [fetchProyectos]);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
    setTimeout(() => setAlert({ open: false, message: '', severity: 'success' }), 5000);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleTransferenciaSuccess = (result) => {
    showAlert('Transferencia interna realizada con éxito', 'success');
    // Aquí podrías refrescar la lista de transferencias si tienes una API para eso
    // También podrías navegar a la página de movimientos o mostrar los detalles
  };

  const handleVerMovimientos = (proyectoId) => {
    router.push(`/cajaProyecto?proyectoId=${proyectoId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Cargando proyectos...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Transferencias Internas | SorbyData</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            {/* Header */}
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={4}
              alignItems="center"
            >
              <Stack spacing={1}>
                <Typography variant="h4">
                  Transferencias Internas
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Transfiere dinero entre proyectos de forma rápida y sencilla
                </Typography>
              </Stack>
              <div>
                <Button
                  onClick={handleOpenDialog}
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="large"
                >
                  Nueva Transferencia
                </Button>
              </div>
            </Stack>

            {/* Alert */}
            {alert.open && (
              <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, open: false })}>
                {alert.message}
              </Alert>
            )}

            {/* Información */}
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <SwapHorizIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h6">
                      ¿Cómo funcionan las transferencias internas?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Las transferencias internas mueven dinero entre proyectos creando automáticamente 
                      un egreso en el proyecto emisor y un ingreso en el proyecto receptor por el mismo monto.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Resumen de proyectos */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Proyectos Disponibles ({proyectos.length})
                </Typography>
                <Grid container spacing={2}>
                  {proyectos.slice(0, 6).map((proyecto) => (
                    <Grid item xs={12} sm={6} md={4} key={proyecto.id}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.50' }
                        }}
                        onClick={() => handleVerMovimientos(proyecto.id)}
                      >
                        <Typography variant="subtitle1" noWrap>
                          {proyecto.nombre}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {proyecto.totalARS && (
                            <Chip 
                              size="small" 
                              label={formatCurrencyWithCode(proyecto.totalARS, 'ARS')}
                              color={proyecto.totalARS >= 0 ? 'success' : 'error'}
                            />
                          )}
                          {proyecto.totalDolares && (
                            <Chip 
                              size="small" 
                              label={formatCurrencyWithCode(proyecto.totalDolares, 'USD')}
                              color={proyecto.totalDolares >= 0 ? 'success' : 'error'}
                            />
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                {proyectos.length > 6 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Y {proyectos.length - 6} proyectos más...
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Transferencias Recientes (ejemplo) */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transferencias Recientes
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Desde</TableCell>
                        <TableCell>Hacia</TableCell>
                        <TableCell align="right">Monto</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Usuario</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transferenciasEjemplo.map((transferencia) => (
                        <TableRow key={transferencia.id}>
                          <TableCell>
                            {formatTimestamp(transferencia.fecha)}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <TrendingDownIcon color="error" fontSize="small" />
                              <Typography variant="body2">
                                {transferencia.proyectoEmisor}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <TrendingUpIcon color="success" fontSize="small" />
                              <Typography variant="body2">
                                {transferencia.proyectoReceptor}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrencyWithCode(transferencia.monto, transferencia.moneda)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={transferencia.estado}
                              color="success"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {transferencia.usuario}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* Dialog de Nueva Transferencia */}
      <TransferenciaInternaDialog
        open={openDialog}
        onClose={handleCloseDialog}
        proyectos={proyectos}
        onSuccess={handleTransferenciaSuccess}
        userPhone={user?.phone}
      />
    </>
  );
};

TransferenciasPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default TransferenciasPage;