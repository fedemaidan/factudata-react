import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Stack,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const STOCK_CONFIG_DEFAULT = {
  acopio_habilitado: false,
  caja_a_stock: false,
  destino_desacopio: false,
  distribucion_por_linea: false,
  validacion_movimientos: false,
  extraccion_automatica: false,
};

const StockConfigDetails = ({ empresa, updateEmpresaData }) => {
  const tieneConfig = Boolean(empresa?.stock_config);
  const [habilitado, setHabilitado] = useState(tieneConfig);
  const [config, setConfig] = useState({
    ...STOCK_CONFIG_DEFAULT,
    ...(empresa?.stock_config || {}),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const tiene = Boolean(empresa?.stock_config);
    setHabilitado(tiene);
    setConfig({
      ...STOCK_CONFIG_DEFAULT,
      ...(empresa?.stock_config || {}),
    });
  }, [empresa]);

  const handleToggleHabilitado = (e) => {
    setHabilitado(e.target.checked);
  };

  const handleToggle = (key) => (e) => {
    setConfig((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedData = habilitado
        ? { stock_config: config }
        : { stock_config: null };

      await updateEmpresaData(empresa.id, updatedData);
      setSnackbar({ open: true, message: 'Configuración de stock guardada.', severity: 'success' });
    } catch (error) {
      console.error('Error al guardar stock_config:', error);
      setSnackbar({ open: true, message: 'Error al guardar la configuración.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const ejes = [
    {
      key: 'acopio_habilitado',
      label: 'Acopio habilitado',
      description: 'Permite crear acopios desde facturas y habilita el desacopio con destino.',
      icon: <InventoryIcon fontSize="small" />,
    },
    {
      key: 'caja_a_stock',
      label: 'Caja → Stock / Acopio',
      description: 'Al cargar una factura de materiales en caja, muestra opciones para enviar los materiales a stock, obra o acopio.',
      icon: <WarehouseIcon fontSize="small" />,
    },
    {
      key: 'destino_desacopio',
      label: 'Destino al desacopiar',
      description: 'Al desacopiar, pregunta a dónde van los materiales (depósito, obra) y los registra en stock.',
      icon: <WarehouseIcon fontSize="small" />,
    },
    {
      key: 'distribucion_por_linea',
      label: 'Distribución por línea',
      description: 'Cada línea de material puede ir a un destino diferente (obra, depósito, acopio).',
      icon: <WarehouseIcon fontSize="small" />,
    },
    {
      key: 'validacion_movimientos',
      label: 'Validación de movimientos',
      description: 'Los movimientos quedan en estado pendiente hasta que alguien confirma. El material ya cuenta en stock.',
      icon: <CheckCircleIcon fontSize="small" />,
    },
    {
      key: 'extraccion_automatica',
      label: 'Extracción automática de materiales',
      description: 'Al cargar una factura con imagen, intenta extraer materiales automáticamente con IA.',
      icon: <SmartToyIcon fontSize="small" />,
    },
  ];

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <WarehouseIcon color="primary" />
              <Typography variant="h6">Configuración de Stock / Materiales</Typography>
            </Stack>
            <Chip
              label={habilitado ? 'Activo' : 'Inactivo'}
              color={habilitado ? 'success' : 'default'}
              size="small"
            />
          </Stack>

          <FormControlLabel
            control={
              <Switch checked={habilitado} onChange={handleToggleHabilitado} color="primary" />
            }
            label={
              <Stack>
                <Typography variant="body1" fontWeight={600}>
                  Habilitar módulo de stock para esta empresa
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Activa el tab de materiales en compras y las acciones de destino (depósito, obra, pendiente).
                </Typography>
              </Stack>
            }
            sx={{ ml: 0 }}
          />

          {habilitado && (
            <>
              <Divider />

              <Typography variant="subtitle2" color="text.secondary">
                Ejes independientes
              </Typography>

              <Stack spacing={2}>
                {ejes.map((eje) => (
                  <Box
                    key={eje.key}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: config[eje.key] ? 'primary.light' : 'divider',
                      bgcolor: config[eje.key] ? 'primary.50' : 'transparent',
                      opacity: eje.disabled ? 0.6 : 1,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config[eje.key] || false}
                          onChange={handleToggle(eje.key)}
                          disabled={eje.disabled}
                          size="small"
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {eje.icon}
                          <Stack>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body2" fontWeight={600}>
                                {eje.label}
                              </Typography>
                              {eje.disabledLabel && (
                                <Chip label={eje.disabledLabel} size="small" variant="outlined" />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {eje.description}
                            </Typography>
                          </Stack>
                        </Stack>
                      }
                      sx={{ ml: 0, width: '100%' }}
                    />
                  </Box>
                ))}
              </Stack>

              {!config.acopio_habilitado && (
                <Alert severity="info" variant="outlined">
                  Sin acopio: las opciones de destino son depósito, obra, pendiente de asignar y no hacer nada.
                </Alert>
              )}
            </>
          )}

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={18} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isLoading}
            >
              Guardar configuración
            </Button>
          </Stack>
        </Stack>
      </CardContent>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default StockConfigDetails;
