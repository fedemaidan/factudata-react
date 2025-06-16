import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Typography, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody,
  Collapse, LinearProgress, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import CuentasPendientesService from 'src/services/cuentasPendientesService';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { useRouter } from 'next/router';
import { getEmpresaById } from 'src/services/empresaService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { CuentasResumen } from 'src/components/cuentasResumen';
import { CuentasTable } from 'src/components/cuentasTable';
import { CuotasPendientesTable } from 'src/components/cuotasPendientesTable';

const CuentasPendientesPage = () => {
    const router = useRouter();
  const { empresaId, acopioId } = router.query;
  const [tabActiva, setTabActiva] = useState('cuentas');
  const [cuentas, setCuentas] = useState([]);
  const [expandedCuentaId, setExpandedCuentaId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [mostrarResumen, setMostrarResumen] = useState(true);


  const [nuevaCuenta, setNuevaCuenta] = useState({
    tipo: 'a_cobrar',
    descripcion: '',
    monto_total: '',
    moneda_nominal: 'ARS',
    proveedor_o_cliente: '',
    unidad_indexacion: '',
    frecuencia_indexacion: ''
  });

  const handleChangeTab = (_, value) => setTabActiva(value);

  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
        const empresa = await getEmpresaById(empresaId);
        setProyectos(await getProyectosByEmpresa(empresa));
      const data = await CuentasPendientesService.listarCuentasPorEmpresa(empresaId);
      console.log(data)
      setCuentas(data);
    } catch (e) {
      console.error('Error al cargar cuentas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const cuotasPendientes = cuentas.flatMap(c => (c.cuotas || []).map(q => ({
        ...q,
        cuenta_nombre: c.descripcion,
        tipo: c.tipo,
    })))
    .filter(q => !q.pagado)
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));


  useEffect(() => {
    fetchCuentas();
  }, [tabActiva, fetchCuentas]);

  const formatDate = (fecha) => new Date(fecha).toLocaleDateString();

  const handleCrearCuenta = async () => {
    try {
        nuevaCuenta.empresa_id = empresaId; // Asegurarse de que la empresa_id esté definida
      await CuentasPendientesService.crearCuentaPendiente(nuevaCuenta);
      setDialogoAbierto(false);
      setNuevaCuenta({
        empresa_id: empresaId,
        tipo: 'a_cobrar',
        descripcion: '',
        monto_total: '',
        moneda_nominal: 'ARS',
        proveedor_o_cliente: '',
        unidad_indexacion: '',
        frecuencia_indexacion: ''
      });
      fetchCuentas();
    } catch (e) {
      console.error('Error al crear cuenta:', e);
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h5" sx={{ mb: 2 }}>Gestión de Cuentas Pendientes</Typography>
        <Box sx={{ mb: 2 }}>
        <Button onClick={() => setMostrarResumen(!mostrarResumen)} size="small">
            {mostrarResumen ? 'Ocultar resumen' : 'Mostrar resumen'}
        </Button>

        {mostrarResumen && <CuentasResumen cuentas={cuentas} />}
        </Box>

        <Tabs value={tabActiva} onChange={handleChangeTab}>
          <Tab label="Cuentas" value="cuentas" />
          <Tab label="Cuotas Pendientes" value="cuotas" />
        </Tabs>

        {loading && <LinearProgress sx={{ my: 2 }} />}
        {tabActiva === 'cuentas' && (
            <>
                <Button variant="contained" onClick={() => setDialogoAbierto(true)} sx={{ my: 2 }}>
                Nueva Cuenta
                </Button>
                <CuentasTable
                cuentas={cuentas}
                expandedCuentaId={expandedCuentaId}
                setExpandedCuentaId={setExpandedCuentaId}
                onEliminar={CuentasPendientesService.eliminarCuenta}
                fetchCuentas={fetchCuentas}
                />
            </>
            )}

            {tabActiva === 'cuotas' && (
                <CuotasPendientesTable cuotas={cuotasPendientes} />
            )}

        <Dialog open={dialogoAbierto} onClose={() => setDialogoAbierto(false)}>
          <DialogTitle>Nueva Cuenta Pendiente</DialogTitle>
          <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Tipo</InputLabel>
            <Select
                value={nuevaCuenta.tipo || ''}
                label="Tipo"
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, tipo: e.target.value })}
            >
                <MenuItem value="a_pagar">A pagar</MenuItem>
                <MenuItem value="a_cobrar">A cobrar</MenuItem>
            </Select>
            </FormControl>

            <TextField
            margin="dense"
            fullWidth
            label="Descripción"
            value={nuevaCuenta.descripcion}
            onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, descripcion: e.target.value })}
            />

            <TextField
            margin="dense"
            fullWidth
            label="Monto total"
            type="number"
            value={nuevaCuenta.monto_total}
            onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, monto_total: parseFloat(e.target.value) })}
            />

            <FormControl fullWidth margin="dense">
            <InputLabel>Moneda</InputLabel>
            <Select
                value={nuevaCuenta.moneda_nominal || 'ARS'}
                label="Moneda"
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, moneda_nominal: e.target.value })}
            >
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
            </Select>
            </FormControl>

            <TextField
            margin="dense"
            fullWidth
            label="Proveedor o Cliente"
            value={nuevaCuenta.proveedor_o_cliente}
            onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, proveedor_o_cliente: e.target.value })}
            />

            <FormControl fullWidth margin="dense">
            <InputLabel>Unidad de Indexación</InputLabel>
            <Select
                value={nuevaCuenta.unidad_indexacion || ''}
                label="Unidad de Indexación"
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, unidad_indexacion: e.target.value })}
            >
                <MenuItem value="">Ninguna</MenuItem>
                <MenuItem value="UVA">UVA</MenuItem>
                <MenuItem value="CER">CER</MenuItem>
                <MenuItem value="CAC">CAC</MenuItem>
                <MenuItem value="IPC">IPC</MenuItem>
            </Select>
            </FormControl>

            {nuevaCuenta.unidad_indexacion && (
            <FormControl fullWidth margin="dense">
                <InputLabel>Frecuencia de Indexación</InputLabel>
                <Select
                value={nuevaCuenta.frecuencia_indexacion || ''}
                label="Frecuencia"
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, frecuencia_indexacion: e.target.value })}
                >
                <MenuItem value="diaria">Diaria</MenuItem>
                <MenuItem value="mensual">Mensual</MenuItem>
                <MenuItem value="cada_2_meses">Cada 2 meses</MenuItem>
                <MenuItem value="anual">Anual</MenuItem>
                </Select>
            </FormControl>
            )}

<TextField
  margin="dense"
  fullWidth
  label="Cantidad de Cuotas"
  type="number"
  value={nuevaCuenta.cantidad_cuotas}
  onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, cantidad_cuotas: parseInt(e.target.value) || 1 })}
/>


          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogoAbierto(false)}>Cancelar</Button>
            <Button onClick={handleCrearCuenta} variant="contained">Crear</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

CuentasPendientesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default CuentasPendientesPage;
