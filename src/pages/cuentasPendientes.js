import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Container, Typography, Tabs, Tab, LinearProgress, Button, Snackbar, Alert,
  Card, CardContent, Grid, TextField, MenuItem, InputAdornment, SvgIcon
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import CuentasPendientesService from 'src/services/cuentasPendientesService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { useRouter } from 'next/router';
import { getEmpresaById } from 'src/services/empresaService';
import { formatCurrency } from 'src/utils/formatters';
import { CuentasTable } from 'src/components/cuentasTable';
import { CuotasPendientesTable } from 'src/components/cuotasPendientesTable';
import { ProyeccionFinanciera } from 'src/components/proyeccionFinanciera';
import FormularioCuentaNueva from 'src/components/formularioCuentaNueva';

const CuentasPendientesPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;
  const [tabActiva, setTabActiva] = useState('cuentas');
  const [cuentas, setCuentas] = useState([]);
  const [expandedCuentaId, setExpandedCuentaId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');

  // Cálculos de Resumen (KPIs)
  const resumen = useMemo(() => {
    const cobrar = cuentas.filter(c => c.tipo === 'a_cobrar').reduce((acc, c) => acc + (c.monto_total || 0), 0);
    const pagar = cuentas.filter(c => c.tipo === 'a_pagar').reduce((acc, c) => acc + (c.monto_total || 0), 0);
    return { cobrar, pagar, saldo: cobrar - pagar };
  }, [cuentas]);

  // Filtrado de cuentas
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter(cuenta => {
      const cumpleTexto = filtroTexto === '' || 
        cuenta.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        cuenta.proveedor_o_cliente?.toLowerCase().includes(filtroTexto.toLowerCase());
      
      const cumpleProyecto = filtroProyecto === 'todos' || cuenta.proyecto_id === filtroProyecto;

      return cumpleTexto && cumpleProyecto;
    });
  }, [cuentas, filtroTexto, filtroProyecto]);

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

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const cerrarSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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
      mostrarSnackbar('Error al cargar las cuentas', 'error');
    } finally {
      setLoading(false);
    }
  }, [empresaId, tabActiva]);
  

  const cuotasPendientes = useMemo(() => {
    return cuentas.flatMap(c => (c.cuotas || []).map((q, index) => ({
        ...q,
        numero_cuota: index + 1,
        total_cuotas: c.cuotas?.length || 0,
        cuenta_nombre: c.descripcion,
        tipo: c.tipo,
    })))
    .filter(q => !q.pagado)
    .sort((a, b) => {
      const fechaA = new Date(a.fecha_vencimiento);
      const fechaB = new Date(b.fecha_vencimiento);
      if (fechaA.getTime() !== fechaB.getTime()) {
        return fechaA - fechaB;
      }
      return a.numero_cuota - b.numero_cuota;
    });
  }, [cuentas]);


  useEffect(() => {
    fetchCuentas();
  }, [tabActiva, fetchCuentas]);

  const resetNuevaCuenta = () => {
    setNuevaCuenta({
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
  };

  const handleCrearCuenta = async () => {
    // Validaciones
    if (!nuevaCuenta.descripcion.trim()) {
      mostrarSnackbar('La descripción es requerida', 'warning');
      return;
    }
    if (!nuevaCuenta.monto_total || nuevaCuenta.monto_total <= 0) {
      mostrarSnackbar('El monto debe ser mayor a 0', 'warning');
      return;
    }
    if (!nuevaCuenta.proveedor_o_cliente.trim()) {
      mostrarSnackbar('El proveedor/cliente es requerido', 'warning');
      return;
    }
    if (!nuevaCuenta.proyecto_id) {
      mostrarSnackbar('Debe seleccionar un proyecto', 'warning');
      return;
    }

    try {
      const cuentaData = {
        ...nuevaCuenta,
        empresa_id: empresaId,
        fecha_primera_cuota: new Date(nuevaCuenta.fecha_primera_cuota)
      };
      
      await CuentasPendientesService.crearCuentaPendiente(cuentaData);
      setDialogoAbierto(false);
      resetNuevaCuenta();
      mostrarSnackbar('Cuenta creada con éxito', 'success');
      fetchCuentas();
    } catch (e) {
      console.error('Error al crear cuenta:', e);
      mostrarSnackbar('Error al crear la cuenta', 'error');
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h5" sx={{ mb: 2 }}>Gestión de Cuentas Pendientes</Typography>

        {/* KPIs de Resumen */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  Total a Cobrar
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(resumen.cobrar)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  Total a Pagar
                </Typography>
                <Typography variant="h5" color="error.main">
                  {formatCurrency(resumen.pagar)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  Saldo Proyectado
                </Typography>
                <Typography variant="h5" color={resumen.saldo >= 0 ? 'primary.main' : 'warning.main'}>
                  {formatCurrency(resumen.saldo)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2, gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
                    <TextField
                      placeholder="Buscar por descripción o cliente..."
                      size="small"
                      value={filtroTexto}
                      onChange={(e) => setFiltroTexto(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SvgIcon fontSize="small" color="action">
                              <SearchIcon />
                            </SvgIcon>
                          </InputAdornment>
                        )
                      }}
                      sx={{ maxWidth: 400, flexGrow: 1 }}
                    />
                    <TextField
                      select
                      label="Filtrar por Proyecto"
                      value={filtroProyecto}
                      onChange={(e) => setFiltroProyecto(e.target.value)}
                      size="small"
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="todos">Todos los proyectos</MenuItem>
                      {proyectos.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Button variant="contained" onClick={() => setDialogoAbierto(true)}>
                    Nueva Cuenta
                  </Button>
                </Box>

                <CuentasTable
                cuentas={cuentasFiltradas}
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

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={cerrarSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={cerrarSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

CuentasPendientesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default CuentasPendientesPage;
