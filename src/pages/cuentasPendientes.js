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
import { ProyeccionFinanciera } from 'src/components/proyeccionFinanciera';
import FormularioCuentaNueva from 'src/components/formularioCuentaNueva';

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
    frecuencia_indexacion: '',
    cantidad_cuotas: 1,
    proyecto_id: '',
    proyecto_nombre: '',
    subproyecto_id: '',
    subproyecto_nombre: '',
    fecha_primera_cuota: new Date().toISOString().substring(0, 10)
  });
  

  const handleChangeTab = (_, value) => setTabActiva(value);


  const fetchCuentas = useCallback(async (conCuotas = tabActiva !== 'cuentas') => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const empresa = await getEmpresaById(empresaId);
      setProyectos(await getProyectosByEmpresa(empresa));
      const data = await CuentasPendientesService.listarCuentasPorEmpresa(empresaId, conCuotas);
      setCuentas(data);
    } catch (e) {
      console.error('Error al cargar cuentas:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, tabActiva]);
  

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
        nuevaCuenta.fecha_primera_cuota = new Date(nuevaCuenta.fecha_primera_cuota);
        
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

        <Tabs value={tabActiva} onChange={handleChangeTab}>
          <Tab label="Proyección" value="proyeccion" />
          <Tab label="Cuentas" value="cuentas" />
          <Tab label="Cuotas Pendientes" value="cuotas" />
          

        </Tabs>

        {tabActiva === 'proyeccion' && (
          <ProyeccionFinanciera cuotas={cuotasPendientes} />
        )}


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
                setCuentas={setCuentas}
                />
            </>
            )}

            {tabActiva === 'cuotas' && (
                <CuotasPendientesTable cuotas={cuotasPendientes} />
            )}

<FormularioCuentaNueva
  abierta={dialogoAbierto}
  onCerrar={() => setDialogoAbierto(false)}
  onCrear={handleCrearCuenta}
  nuevaCuenta={nuevaCuenta}
  setNuevaCuenta={setNuevaCuenta}
  proyectos={proyectos}
/>

      </Container>
    </Box>
  );
};

CuentasPendientesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default CuentasPendientesPage;
