import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import {
  Box, Container, Typography, Grid, Card, CardContent, CardActions,
  Button, Chip, TextField, MenuItem, Stack, InputAdornment, Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HomeIcon from '@mui/icons-material/Home';

import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
import VentaWizard from 'src/components/loteParaTodos/ventas/VentaWizard';
import { 
  mockLotes, 
  mockEmprendimientos,
  getEmprendimientosActivos 
} from 'src/data/loteParaTodos/index';

const VentasPage = () => {
  const [openWizard, setOpenWizard] = useState(false);
  const [filtros, setFiltros] = useState({
    emprendimiento: '',
    precioMax: '',
    superficieMin: ''
  });

  const emprendimientos = useMemo(() => getEmprendimientosActivos(), []);

  // Filtrar solo lotes disponibles y aplicar filtros de usuario
  const lotesDisponibles = useMemo(() => {
    return mockLotes.filter(lote => {
      // Condición base: Disponible y sin bloqueos legales
      if (lote.estado !== 'DISPONIBLE') return false;
      if (lote.estado_legal === 'BLOQUEADO') return false;

      // Filtros de usuario
      if (filtros.emprendimiento && lote.emprendimiento_id !== parseInt(filtros.emprendimiento)) return false;
      if (filtros.precioMax && lote.precio_base > parseFloat(filtros.precioMax)) return false;
      if (filtros.superficieMin && lote.superficie < parseFloat(filtros.superficieMin)) return false;

      return true;
    });
  }, [filtros]);

  const handleIniciarVenta = (lote) => {
    // Aquí podríamos pre-cargar el lote en el wizard si quisiéramos
    // Por ahora abrimos el wizard genérico
    setOpenWizard(true);
  };

  const handleVentaSuccess = (contrato) => {
    alert(`¡Venta iniciada con éxito! Contrato #${Math.floor(Math.random() * 1000)} creado.`);
    // Aquí se actualizaría el estado global o se recargaría la data
  };

  return (
    <LoteParaTodosLayout title="Catálogo de Ventas">
      <Head>
        <title>Ventas | Lote Para Todos</title>
      </Head>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Catálogo de Lotes Vendibles
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Seleccione un lote disponible para iniciar el proceso de reserva o venta.
          </Typography>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <TextField
              select
              label="Emprendimiento"
              value={filtros.emprendimiento}
              onChange={(e) => setFiltros({ ...filtros, emprendimiento: e.target.value })}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HomeIcon color="action" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">Todos los emprendimientos</MenuItem>
              {emprendimientos.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>{emp.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Precio Máximo"
              type="number"
              value={filtros.precioMax}
              onChange={(e) => setFiltros({ ...filtros, precioMax: e.target.value })}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoneyIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Superficie Mínima (m²)"
              type="number"
              value={filtros.superficieMin}
              onChange={(e) => setFiltros({ ...filtros, superficieMin: e.target.value })}
              fullWidth
            />
            
            <Button 
              variant="outlined" 
              startIcon={<FilterListIcon />}
              onClick={() => setFiltros({ emprendimiento: '', precioMax: '', superficieMin: '' })}
            >
              Limpiar
            </Button>
          </Stack>
        </Paper>

        {/* Grilla de Lotes */}
        <Grid container spacing={3}>
          {lotesDisponibles.length > 0 ? (
            lotesDisponibles.map((lote) => {
              const emprendimiento = emprendimientos.find(e => e.id === lote.emprendimiento_id);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={lote.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                    <Box sx={{ height: 140, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="h3" color="text.secondary" fontWeight="bold">
                        {lote.numero}
                      </Typography>
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Chip 
                        label="DISPONIBLE" 
                        color="success" 
                        size="small" 
                        sx={{ mb: 1 }} 
                      />
                      <Typography variant="h6" gutterBottom>
                        Lote {lote.numero} - Mz {lote.manzana}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {emprendimiento?.nombre || 'Emprendimiento Desconocido'}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Superficie:</Typography>
                          <Typography variant="body2" fontWeight="bold">{lote.superficie} m²</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Precio Lista:</Typography>
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            ${lote.precio_base?.toLocaleString()}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button 
                        variant="contained" 
                        fullWidth 
                        onClick={() => handleIniciarVenta(lote)}
                      >
                        Iniciar Venta
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })
          ) : (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  No se encontraron lotes disponibles con los filtros seleccionados.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Wizard de Venta */}
      <VentaWizard 
        open={openWizard} 
        onClose={() => setOpenWizard(false)}
        onSuccess={handleVentaSuccess}
      />
    </LoteParaTodosLayout>
  );
};

export default VentasPage;
