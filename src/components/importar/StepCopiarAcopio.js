import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Stack, Paper, 
  CircularProgress, Chip, InputAdornment, Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import AcopioService from 'src/services/acopioService';
import { formatCurrency } from 'src/utils/formatters';

export default function StepCopiarAcopio({ 
  empresaId, 
  proveedor,
  onSelectAcopio,
  onNext 
}) {
  const [acopios, setAcopios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [selectedAcopio, setSelectedAcopio] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      if (!empresaId) return;
      try {
        setLoading(true);
        const lista = await AcopioService.listarAcopios(empresaId);
        setAcopios(lista || []);
      } catch (err) {
        console.error('Error cargando acopios:', err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [empresaId]);

  const acopiosFiltrados = acopios.filter(a => {
    const texto = busqueda.toLowerCase();
    return (
      (a.codigo || '').toLowerCase().includes(texto) ||
      (a.proveedor || '').toLowerCase().includes(texto)
    );
  });

  // Priorizar acopios del mismo proveedor
  const acopiosOrdenados = [...acopiosFiltrados].sort((a, b) => {
    if (a.proveedor === proveedor && b.proveedor !== proveedor) return -1;
    if (a.proveedor !== proveedor && b.proveedor === proveedor) return 1;
    return 0;
  });

  const handleSelect = async (acopio) => {
    setSelectedAcopio(acopio);
    try {
      const materiales = await AcopioService.obtenerCompras(acopio.id);
      if (onSelectAcopio) {
        onSelectAcopio(materiales || []);
      }
      if (onNext) onNext();
    } catch (err) {
      console.error('Error cargando materiales del acopio:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Elegí un acopio para copiar
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Se copiarán todos los materiales y precios al nuevo acopio
      </Typography>

      <TextField
        fullWidth
        placeholder="Buscar por código o proveedor..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {acopiosOrdenados.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No hay acopios disponibles para copiar
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ maxHeight: 400, overflow: 'auto' }}>
          {acopiosOrdenados.map((a) => (
            <Paper
              key={a.id}
              onClick={() => handleSelect(a)}
              sx={{
                p: 2,
                cursor: 'pointer',
                border: selectedAcopio?.id === a.id ? '2px solid' : '1px solid',
                borderColor: selectedAcopio?.id === a.id ? 'primary.main' : 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <InventoryIcon color="action" />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight="bold">
                      {a.codigo || 'Sin código'}
                    </Typography>
                    {a.proveedor === proveedor && (
                      <Chip label="Mismo proveedor" size="small" color="primary" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {a.proveedor} • {formatCurrency(a.valorTotal || 0)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
