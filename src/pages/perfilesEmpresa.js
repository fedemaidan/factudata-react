// pages/perfiles.js
import { useState, useEffect, useMemo } from 'react';
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
  TableSortLabel,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Head from 'next/head';
import { useAuthContext } from 'src/contexts/auth-context';
import profileService from 'src/services/profileService';
import cajaChicaService from 'src/services/cajaChica/cajaChicaService';
import TransferenciaModal from 'src/components/cajaChica/TransferenciaModal';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';

const formatCurrency = (amount, moneda = 'ARS') => {
  if (!amount) return moneda === 'USD' ? 'US$ 0' : '$ 0';
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
  });
};

const PerfilesEmpresaPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);
  const [saldosMap, setSaldosMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [soloActivas, setSoloActivas] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  const profilesVisibles = useMemo(() => {
    let lista = soloActivas
      ? profiles.filter(p => !(p.permisosOcultos || []).includes('VER_MI_CAJA_CHICA'))
      : profiles;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    }

    lista = [...lista].sort((a, b) => {
      const saldoA = saldosMap[a.phone]?.saldo_ars || 0;
      const saldoB = saldosMap[b.phone]?.saldo_ars || 0;
      return sortDir === 'desc' ? saldoB - saldoA : saldoA - saldoB;
    });

    return lista;
  }, [profiles, soloActivas, busqueda, saldosMap, sortDir]);

  const totalFondos = useMemo(() => {
    return Object.values(saldosMap).reduce((acc, s) => acc + (s.saldo_ars || 0), 0);
  }, [saldosMap]);

  const totalFondosUsd = useMemo(() => {
    return Object.values(saldosMap).reduce((acc, s) => acc + (s.saldo_usd || 0), 0);
  }, [saldosMap]);

  const fetchData = async () => {
    if (!user?.empresa) return;
    setIsLoading(true);
    try {
      const [perfiles, saldos] = await Promise.all([
        profileService.getProfileByEmpresa(user.empresa.id),
        cajaChicaService.getSaldosPorEmpresa(user.empresa.id),
      ]);
      setProfiles(perfiles);
      const map = {};
      saldos.forEach(s => { map[s.user_phone] = s; });
      setSaldosMap(map);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al cargar los datos', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      
      await fetchData();
      
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

            {/* Cards resumen */}
            <Stack direction="row" spacing={2}>
              <Card sx={{ minWidth: 200 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Total fondos ARS</Typography>
                  <Typography variant="h5">{formatCurrency(totalFondos, 'ARS')}</Typography>
                </CardContent>
              </Card>
              {totalFondosUsd !== 0 && (
                <Card sx={{ minWidth: 200 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Total fondos USD</Typography>
                    <Typography variant="h5">{formatCurrency(totalFondosUsd, 'USD')}</Typography>
                  </CardContent>
                </Card>
              )}
              <Card sx={{ minWidth: 200 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Cajas activas</Typography>
                  <Typography variant="h5">{profilesVisibles.length}</Typography>
                </CardContent>
              </Card>
            </Stack>

            <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
              <TextField
                size="small"
                placeholder="Buscar persona..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              <Box display="flex" gap={1}>
                <Button
                  variant={soloActivas ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSoloActivas(!soloActivas)}
                >
                  {soloActivas ? 'Solo activas' : 'Todas'}
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleOpenTransferModal}
                  disabled={profilesVisibles.length < 2}
                >
                  Transferir
                </Button>
                <Button variant="outlined" onClick={fetchData}>
                  Refrescar
                </Button>
              </Box>
            </Box>

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress />
              </Box>
            ) : profilesVisibles.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {busqueda ? 'No se encontraron resultados' : 'No hay cajas chicas activas'}
                </Typography>
              </Paper>
            ) : (
              <Paper>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>
                        <TableSortLabel
                          active
                          direction={sortDir}
                          onClick={() => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
                        >
                          Saldo ARS
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Movimientos</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profilesVisibles.map((profile) => {
                      const saldoData = saldosMap[profile.phone] || {};
                      const saldo = saldoData.saldo_ars || 0;
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>{`${profile.firstName} ${profile.lastName}`}</TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>{profile.phone}</TableCell>
                          <TableCell>
                            <Chip
                              label={formatCurrency(saldo, 'ARS')}
                              color={saldo > 0 ? 'success' : saldo < 0 ? 'error' : 'default'}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{saldoData.cant_movimientos || 0}</TableCell>
                          <TableCell>
                            <Button
                              color="primary"
                              onClick={() => router.push(`/cajaChica?userId=${profile.id}`)}
                            >
                              Ver caja
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
          usuarioFijo={null}
          saldosMap={saldosMap}
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
