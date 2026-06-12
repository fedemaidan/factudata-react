import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Card,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BuildIcon from '@mui/icons-material/Build';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import BotService from 'src/services/botService';

const BotUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Estado para el diálogo de confirmación
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);

  // Estado para reinicio manual
  const [manualResetDialogOpen, setManualResetDialogOpen] = useState(false);
  const [manualPhoneNumber, setManualPhoneNumber] = useState('');

  // Estado para detección de conversaciones colgadas
  const [inconsistentes, setInconsistentes] = useState(null); // null = no se corrió aún
  const [detectando, setDetectando] = useState(false);

  const handleDetectarInconsistentes = async () => {
    setDetectando(true);
    try {
      const data = await BotService.detectarInconsistentes(10);
      setInconsistentes(data.users || []);
      setAlert({
        open: true,
        message: data.count > 0
          ? `Se detectaron ${data.count} conversaciones posiblemente colgadas`
          : 'No se detectaron conversaciones colgadas',
        severity: data.count > 0 ? 'warning' : 'success'
      });
    } catch (error) {
      setAlert({ open: true, message: 'Error al detectar conversaciones colgadas', severity: 'error' });
    } finally {
      setDetectando(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Si hay texto en el filtro, lo usamos para buscar en el backend (opcional, o filtramos en front)
      // Aquí asumimos que el backend filtra si le pasamos 'phone', pero también filtramos en front para mayor reactividad
      const data = await BotService.listarUsuarios(filtroTexto);
      setUsers(data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      setAlert({ open: true, message: 'Error al obtener usuarios del bot', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filtroTexto]);

  useEffect(() => {
    // Debounce simple para no llamar a la API en cada tecla si decidimos filtrar en backend
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleResetClick = (user) => {
    setUserToReset(user);
    setConfirmDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!userToReset) return;
    try {
      await BotService.resetearEstado(userToReset.from);
      setAlert({ open: true, message: `Estado reiniciado para ${userToReset.from}`, severity: 'success' });
      // Sacar de la lista de colgadas si estaba ahí
      setInconsistentes((prev) => prev ? prev.filter((u) => u.from !== userToReset.from) : prev);
      fetchUsers(); // Recargar la lista
    } catch (error) {
      setAlert({ open: true, message: 'Error al reiniciar el estado', severity: 'error' });
    } finally {
      setConfirmDialogOpen(false);
      setUserToReset(null);
    }
  };

  const handleManualReset = async () => {
    if (!manualPhoneNumber) return;
    try {
      await BotService.resetearEstado(manualPhoneNumber);
      setAlert({ open: true, message: `Estado reiniciado para ${manualPhoneNumber}`, severity: 'success' });
      fetchUsers();
    } catch (error) {
      setAlert({ open: true, message: 'Error al reiniciar el estado', severity: 'error' });
    } finally {
      setManualResetDialogOpen(false);
      setManualPhoneNumber('');
    }
  };

  // Filtrado y ordenamiento en frontend
  // Ordenamos por _id descendente (ObjectId contiene timestamp, los más recientes primero)
  const usersFiltrados = users
    .filter(u => u.from?.toLowerCase().includes(filtroTexto.toLowerCase()))
    .sort((a, b) => {
      // Ordenar por _id descendente (más reciente primero)
      if (a._id && b._id) {
        return b._id.localeCompare(a._id);
      }
      return 0;
    });

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
          <Typography variant="h4">Usuarios del Bot (Estados Activos)</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={detectando ? <CircularProgress size={18} /> : <ReportProblemIcon />}
              onClick={handleDetectarInconsistentes}
              disabled={detectando}
            >
              Detectar colgadas
            </Button>
            <Button variant="outlined" startIcon={<BuildIcon />} onClick={() => setManualResetDialogOpen(true)}>
              Reiniciar Manual
            </Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchUsers}>
              Actualizar
            </Button>
          </Stack>
        </Stack>

        <TextField
          placeholder="Buscar por número de teléfono"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 3 }}
        />

        {inconsistentes !== null && (
          <Card sx={{ mb: 3, p: 2, border: '1px solid', borderColor: inconsistentes.length > 0 ? 'warning.main' : 'success.main' }}>
            <Typography variant="h6" gutterBottom>
              ⚠️ Conversaciones posiblemente colgadas ({inconsistentes.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Usuarios con estado activo cuyo último mensaje es entrante y lleva más de 10 minutos sin respuesta del bot
              (típico de envíos que fallaron por errores de Meta).
            </Typography>
            {inconsistentes.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Último mensaje (entrante)</TableCell>
                    <TableCell>Hace</TableCell>
                    <TableCell>Estado activo</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inconsistentes.map((u) => (
                    <TableRow key={u.from}>
                      <TableCell><Typography variant="subtitle2">{u.from}</Typography></TableCell>
                      <TableCell>
                        <Tooltip title={u.lastMessage?.message || ''}>
                          <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            [{u.lastMessage?.type}] {u.lastMessage?.message}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={u.minutesSinceLastMessage > 60 ? 'error' : 'warning'}
                          label={u.minutesSinceLastMessage > 90
                            ? `${Math.round(u.minutesSinceLastMessage / 60)} h`
                            : `${u.minutesSinceLastMessage} min`}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 300 }}>
                          {(u.stateKeys || []).slice(0, 4).map((k) => (
                            <Chip key={k} label={k} size="small" variant="outlined" />
                          ))}
                          {(u.stateKeys || []).length > 4 && (
                            <Chip label={`+${u.stateKeys.length - 4}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<RestartAltIcon />}
                          onClick={() => handleResetClick(u)}
                        >
                          Reiniciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Card sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650, tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 180 }}>Teléfono (ID)</TableCell>
                  <TableCell>Datos de Estado</TableCell>
                  <TableCell align="center" sx={{ width: 130 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersFiltrados.length > 0 ? (
                  usersFiltrados.map((user) => (
                    <TableRow key={user._id || user.from}>
                      <TableCell sx={{ width: 180 }}>
                        <Typography variant="subtitle2">{user.from}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 0, overflow: 'hidden' }}>
                        {/* Mostramos algunas propiedades relevantes del estado */}
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5,
                          maxHeight: 100,
                          overflowY: 'auto'
                        }}>
                          {Object.entries(user).map(([key, value]) => {
                            if (key === '_id' || key === 'from') return null;
                            // Convertir valor a string legible si es objeto
                            const displayValue = typeof value === 'object' ? JSON.stringify(value).slice(0, 30) + '...' : String(value).slice(0, 30);
                            return (
                              <Tooltip key={key} title={`${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`}>
                                <Chip 
                                  label={`${key}: ${displayValue}`} 
                                  size="small" 
                                  variant="outlined" 
                                  sx={{ maxWidth: 200 }}
                                />
                              </Tooltip>
                            );
                          })}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ width: 130 }}>
                        <Button 
                          variant="outlined" 
                          color="error" 
                          size="small"
                          startIcon={<RestartAltIcon />}
                          onClick={() => handleResetClick(user)}
                        >
                          Reiniciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No se encontraron usuarios activos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Diálogo de Confirmación */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <Card sx={{ p: 3, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              ¿Reiniciar estado del usuario?
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Esto borrará el progreso actual del usuario <b>{userToReset?.from}</b> y lo devolverá al inicio del flujo.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setConfirmDialogOpen(false)} variant="outlined">
                Cancelar
              </Button>
              <Button onClick={handleConfirmReset} variant="contained" color="error">
                Reiniciar
              </Button>
            </Stack>
          </Card>
        </Dialog>

        {/* Diálogo de Reinicio Manual */}
        <Dialog open={manualResetDialogOpen} onClose={() => setManualResetDialogOpen(false)}>
          <Card sx={{ p: 3, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              Reiniciar Estado Manualmente
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Ingresa el número de teléfono (con código de país) para forzar el reinicio de su estado.
            </Typography>
            <TextField
              label="Número de Teléfono"
              fullWidth
              value={manualPhoneNumber}
              onChange={(e) => setManualPhoneNumber(e.target.value)}
              placeholder="Ej: 5491123456789"
              sx={{ mb: 3 }}
            />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setManualResetDialogOpen(false)} variant="outlined">
                Cancelar
              </Button>
              <Button onClick={handleManualReset} variant="contained" color="error" disabled={!manualPhoneNumber}>
                Reiniciar
              </Button>
            </Stack>
          </Card>
        </Dialog>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

BotUsersPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default BotUsersPage;
