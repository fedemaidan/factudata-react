import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Box, Button, Container, Stack, TextField, Typography, Snackbar, Alert, MenuItem } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import bejermanService from 'src/services/bejermanService';

const emptyConfig = {
  wsUrl: '',
  wsNamespace: 'http://localhost:57213/',
  usuario: '',
  clave: '',
  codigoEmpresa: '',
  puestoTrabajo: '',
  codigoSucursal: '',
  tipoBase: 'gestion',
  ejercicioContable: ''
};

const BejermanConfigPage = () => {
  const { user } = useAuthContext();
  const empresaId = useMemo(() => user?.empresa?.id, [user]);
  const [config, setConfig] = useState(emptyConfig);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  const loadConfig = async () => {
    if (!empresaId) return;
    const data = await bejermanService.getConfig(empresaId);
    if (data) {
      setConfig({
        wsUrl: data.wsUrl || '',
        wsNamespace: data.wsNamespace || 'http://localhost:57213/',
        usuario: data.usuario || '',
        clave: data.clave || '',
        codigoEmpresa: data.codigoEmpresa || '',
        puestoTrabajo: data.puestoTrabajo || '',
        codigoSucursal: data.codigoSucursal || '',
        tipoBase: data.tipoBase || 'gestion',
        ejercicioContable: data.ejercicioContable || ''
      });
    }
  };

  useEffect(() => {
    loadConfig();
  }, [empresaId]);

  const handleChange = (field) => (event) => {
    setConfig((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      await bejermanService.saveConfig(empresaId, config);
      setAlert({ open: true, message: 'Configuración guardada', severity: 'success' });
    } catch (error) {
      setAlert({ open: true, message: error.message || 'Error guardando', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Bejerman - Configuración</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="md">
          <Stack spacing={3}>
            <Typography variant="h4">Bejerman | Configuración</Typography>

            <TextField label="WS URL" value={config.wsUrl} onChange={handleChange('wsUrl')} fullWidth />
            <TextField label="WS Namespace" value={config.wsNamespace} onChange={handleChange('wsNamespace')} fullWidth />
            <TextField label="Usuario" value={config.usuario} onChange={handleChange('usuario')} fullWidth />
            <TextField label="Clave" type="password" value={config.clave} onChange={handleChange('clave')} fullWidth />
            <TextField label="Código Empresa" value={config.codigoEmpresa} onChange={handleChange('codigoEmpresa')} fullWidth />
            <TextField label="Puesto de trabajo" value={config.puestoTrabajo} onChange={handleChange('puestoTrabajo')} fullWidth />
            <TextField label="Código Sucursal" value={config.codigoSucursal} onChange={handleChange('codigoSucursal')} fullWidth />
            <TextField select label="Tipo Base" value={config.tipoBase} onChange={handleChange('tipoBase')} fullWidth>
              <MenuItem value="gestion">Gestión</MenuItem>
              <MenuItem value="contable">Contable</MenuItem>
            </TextField>
            <TextField label="Ejercicio contable" value={config.ejercicioContable} onChange={handleChange('ejercicioContable')} fullWidth disabled={config.tipoBase !== 'contable'} />

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSave} disabled={isLoading}>Guardar</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
};

BejermanConfigPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default BejermanConfigPage;
