import Head from 'next/head';
import { Box, Container, Typography, Card, CardContent, Grid, Chip, Button, CircularProgress, Alert, Paper, Stack, TextField, IconButton, InputAdornment } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { formatTimestamp } from 'src/utils/formatters';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

const MovimientosProrrateoPage = () => {
  const router = useRouter();
  const { grupoId } = router.query;
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargarMovimientos = async () => {
      if (!grupoId) return;
      
      setLoading(true);
      try {
        const movs = await movimientosService.getMovimientosByGrupoProrrateo(grupoId);
        setMovimientos(movs);
      } catch (err) {
        console.error('Error cargando movimientos:', err);
        setError('Error al cargar los movimientos relacionados');
      } finally {
        setLoading(false);
      }
    };

    cargarMovimientos();
  }, [grupoId]);

  const formatCurrency = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTotalDistribuido = () => {
    return movimientos.reduce((sum, mov) => sum + Number(mov.total || 0), 0);
  };

  const handleVerMovimiento = (movimientoId, proyectoId, proyectoNombre) => {
    router.push({
      pathname: '/movimiento',
      query: {
        movimientoId,
        lastPageUrl: `/movimientos-prorrateo?grupoId=${grupoId}`,
        lastPageName: 'Movimientos Prorrateo'
      }
    });
  };

  const handleVerProyecto = (proyectoId) => {
    router.push(`/cajaProyecto?proyectoId=${proyectoId}`);
  };

  const handleEditTotal = (movimiento) => {
    setEditingId(movimiento.id);
    setEditValue(movimiento.total.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveTotal = async (movimientoId) => {
    const nuevoTotal = parseFloat(editValue);
    if (isNaN(nuevoTotal) || nuevoTotal < 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
      // Calcular nuevo porcentaje basado en el total actual de todos los movimientos
      const totalOriginal = movimientos.reduce((sum, mov) => sum + Number(mov.total || 0), 0);
      const nuevoPorcentaje = totalOriginal > 0 ? ((nuevoTotal / totalOriginal) * 100).toFixed(2) : 0;

      await movimientosService.updateMovimiento(movimientoId, { 
        total: nuevoTotal,
        prorrateo_porcentaje: nuevoPorcentaje
      });
      
      // Actualizar el movimiento en el estado local
      setMovimientos(prev => prev.map(mov => 
        mov.id === movimientoId 
          ? { ...mov, total: nuevoTotal, prorrateo_porcentaje: nuevoPorcentaje }
          : mov
      ));
      
      setEditingId(null);
      setEditValue('');
    } catch (error) {
      console.error('Error al actualizar total:', error);
      alert('Error al guardar el nuevo total');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Movimientos Prorrateo | Factudata</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => router.back()}
                variant="outlined"
              >
                Volver
              </Button>
              <Chip 
                label="Movimientos Prorrateados" 
                color="primary" 
                icon={<AccountBalanceWalletIcon />}
              />
            </Stack>
            
            <Typography variant="h4" gutterBottom>
              Distribución de Gasto
            </Typography>
            
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              {movimientos.length > 0 && (
                <Typography variant="body1" color="text.secondary">
                  <strong>{movimientos[0]?.nombre_proveedor || 'Proveedor no especificado'}</strong> - {movimientos[0]?.fecha_factura ? formatTimestamp(movimientos[0].fecha_factura) : 'Sin fecha'}
                </Typography>
              )}
              <Chip 
                size="small" 
                label="💡 Haz clic en el ícono ✏️ para editar totales" 
                variant="outlined" 
                color="info" 
              />
            </Stack>
          </Box>

          {/* Resumen */}
          {movimientos.length > 0 && (
            <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="h6" color="primary">
                    {movimientos.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Proyectos involucrados
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(getTotalDistribuido(), movimientos[0]?.moneda)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total distribuido
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="h6" color="primary">
                    {movimientos[0]?.categoria || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Categoría
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="h6" color="primary">
                    {movimientos[0]?.fecha_factura ? formatTimestamp(movimientos[0].fecha_factura) : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fecha
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Lista de movimientos */}
          <Grid container spacing={3}>
            {movimientos.map((movimiento, index) => (
              <Grid item xs={12} md={6} lg={4} key={movimiento.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="h6" noWrap>
                        {movimiento.proyecto || 'Proyecto sin nombre'}
                      </Typography>
                    </Box>
                    
                    <Stack spacing={2}>
                      <Box>
                        {editingId === movimiento.id ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TextField
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveTotal(movimiento.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              size="small"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                              }}
                              sx={{ maxWidth: 150 }}
                              autoFocus
                            />
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleSaveTotal(movimiento.id)}
                              disabled={saving}
                            >
                              {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="h5" color="primary">
                              {formatCurrency(movimiento.total, movimiento.moneda)}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditTotal(movimiento)}
                              sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        )}
                        {movimiento.prorrateo_porcentaje && (
                          <Typography variant="body2" color="text.secondary">
                            {movimiento.prorrateo_porcentaje}% del total
                          </Typography>
                        )}
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Descripción:</strong> {movimiento.descripcion || 'Sin descripción'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Proveedor:</strong> {movimiento.nombre_proveedor || 'No especificado'}
                        </Typography>
                        {movimiento.observacion && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Observación:</strong> {movimiento.observacion}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleVerMovimiento(movimiento.id, movimiento.proyecto_id, movimiento.proyecto)}
                        >
                          Ver Detalle
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleVerProyecto(movimiento.proyecto_id)}
                        >
                          Ver Proyecto
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {movimientos.length === 0 && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No se encontraron movimientos prorrateados
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
};

MovimientosProrrateoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovimientosProrrateoPage;