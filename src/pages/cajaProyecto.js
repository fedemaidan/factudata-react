import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, TextField, InputAdornment, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddCircle from '@mui/icons-material/AddCircle';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import ticketService from 'src/services/ticketService';
import {getProyectoById} from 'src/services/proyectosService';
import movimientosService from 'src/services/movimientosService';

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2); // getMonth() devuelve un índice basado en cero, así que se agrega 1
  const day = `0${date.getDate()}`.slice(-2);

  return `${year}-${month}-${day}`; // Formato YYYY-MM-DD
};


const ProyectoMovimientosPage = ({ }) => {
  // Estado para la lista de movimientos
  const [movimientos, setMovimientos] = useState([]);
  const [movimientosUSD, setMovimientosUSD] = useState([]);
  const [tablaActiva, setTablaActiva] = useState('ARS'); 
  const [filtrosActivos, setFiltrosActivos] = useState(false); 
  const [accionesActivas, setAccionesActivas] = useState(false); 
  const [proyecto, setProyecto] = useState(null); 
  // Estados para los filtros
  const [filtroDias, setFiltroDias] = useState('730');
  const [filtroObs, setFiltroObs] = useState('');

  const router = useRouter();
  const { proyectoId } = router.query; 

  const eliminarMovimiento = async (movimientoId) => {
    const confirmado = window.confirm('¿Estás seguro de que quieres eliminar este movimiento?');
    if (confirmado) {
      // setIsLoading(true);
      const resultado = await movimientosService.deleteMovimientoById(movimientoId);
      if (resultado) {
        setMovimientos(movimientos.filter(mov => mov.id !== movimientoId));
        setMovimientosUSD(movimientosUSD.filter(mov => mov.id !== movimientoId));
        console.log('Movimiento eliminado.');
        // Opcional: Mostrar una notificación de éxito
      } else {
        console.error('Error al eliminar el movimiento.');
        // Opcional: Mostrar una notificación de error
      }
      // setIsLoading(false);
    }
  };

  useEffect(() => {
    if (proyectoId) {
      async function fetchMovimientosData() {
        const proyecto = await getProyectoById(proyectoId);
        setProyecto(proyecto)
        const movs = await ticketService.getMovimientosForProyecto(proyectoId, 'ARS');
        const movsUsd = await ticketService.getMovimientosForProyecto(proyectoId, 'USD');
        setMovimientos(movs);
        setMovimientosUSD(movsUsd);
      }
      
      fetchMovimientosData();
    }
  }, [proyectoId]);

  // Función para formatear números como moneda
  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
  };

  const handleFiltrosActivos  = () => {
    setFiltrosActivos(filtrosActivos ? false : true);
  }

  const handleAccionesActivas  = () => {
    setAccionesActivas(accionesActivas ? false : true);
  }

  // Calcular el saldo total de la caja
  const saldoTotalCaja = useMemo(() => {
    return movimientos.reduce((acc, mov) => {
      if(mov.type === 'ingreso') {
        return acc + mov.total;
      } else {
        return acc - mov.total;
      }
    }, 0);
  }, [movimientos]);

  const saldoTotalCajaUSD = useMemo(() => {
    return movimientosUSD.reduce((acc, mov) => {
      if(mov.type === 'ingreso') {
        return acc + mov.total;
      } else {
        return acc - mov.total;
      }
    }, 0);
  }, [movimientosUSD]);

  // Filtro por días y observación
  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    const filtrados = movimientos.filter((mov) => {
      const fechaMovimiento = new Date(formatTimestamp(mov.fecha_factura));
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      mov.observacion = mov.observacion ? mov.observacion : "";
      return diferenciaDias <= filtroDias && (mov.observacion.toLowerCase().includes(filtroObs.toLowerCase()));
    });
    
  
    // Ordenar de manera descendente por fecha
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });
  
    // return filtrados;
    return filtrados;
  }, [movimientos, filtroDias, filtroObs]);

  const movimientosFiltradosUSD = useMemo(() => {
    const hoy = new Date();
    const filtrados = movimientosUSD.filter((mov) => {
      const fechaMovimiento = new Date(formatTimestamp(mov.fecha_factura));
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      mov.observacion = mov.observacion ? mov.observacion : "";
      return diferenciaDias <= filtroDias && (mov.observacion.toLowerCase().includes(filtroObs.toLowerCase()));
    });
    
  
    // Ordenar de manera descendente por fecha
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });
  
    return filtrados;
  }, [movimientosUSD, filtroDias, filtroObs]);
  

  return (
    <>
      <Head>
        <title>{proyecto?.nombre}</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">{proyecto?.nombre}</Typography>
            {/* <Typography>Saldo Total Caja: {formatCurrency(saldoTotalCaja)}</Typography> */}
            <Stack direction="row" spacing={2}>
              <Button
                variant={tablaActiva === 'ARS' ? "contained" : "outlined"}
                color="primary"
                onClick={() => setTablaActiva('ARS')}
                sx={{ flexGrow: 1, py: 2 }}
              >
                Caja en Pesos:   {saldoTotalCaja > 0? formatCurrency(saldoTotalCaja): "(" +formatCurrency(saldoTotalCaja) + ")"}
              </Button>
              <Button
                variant={tablaActiva === 'USD' ? "contained" : "outlined"}
                color="primary"
                onClick={() => setTablaActiva('USD')}
                sx={{ flexGrow: 1, py: 2 }}
              >
                Caja en Dólares: US {saldoTotalCajaUSD > 0? formatCurrency(saldoTotalCajaUSD): "(" +formatCurrency(saldoTotalCajaUSD) + ")"}{}
              </Button>
              <Button
                color="primary"
                startIcon={filtrosActivos ? <FilterListOffIcon />: <FilterListIcon />}
                onClick={handleFiltrosActivos}
              >
                {filtrosActivos ? "Ocultar filtro": "Filtrar"}
              </Button>
              {/* <Button
                color="primary"
                startIcon={<MoreVertIcon />}
                onClick={handleAccionesActivas}
              > 
                {accionesActivas ? "Ocultar acciones": "Acciones"}
               </Button> */}
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              {filtrosActivos && 
               <>
              <FormControl >
              <InputLabel>Filtrar por días</InputLabel>
              <Select
                value={filtroDias}
                onChange={(e) => setFiltroDias(e.target.value)}
                label="Filtrar por días"
              >
                <MenuItem value="15">Últimos 15 días</MenuItem>
                <MenuItem value="30">Últimos 30 días</MenuItem>
                <MenuItem value="60">Últimos 60 días</MenuItem>
                <MenuItem value="90">Últimos 90 días</MenuItem>
                <MenuItem value="365">Último año</MenuItem>
                <MenuItem value="730">Últimos 2 años</MenuItem>
              </Select>
            </FormControl>
            <TextField
              
              label="Buscar por Observación"
              variant="outlined"
              onChange={(e) => setFiltroObs(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            </>}
            {accionesActivas && 
               <>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddCircle />}
                onClick={console.log("ingreso")}
              >
                Registrar ingreso
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloudUploadIcon />}
                onClick={console.log("egreso")}
              >
                Registrar egreso
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveAltIcon />}
                onClick={console.log("exportar")}
              >
                Exportar
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CurrencyExchangeIcon />}
                onClick={console.log("cambiar")}
              >
                Cambiar $$ / USD
              </Button>
              </>}
            </Stack>

            <Paper>
              {
                tablaActiva === "ARS" &&
                <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Ingreso</TableCell>
                    <TableCell>Egreso</TableCell>
                    <TableCell>Observación</TableCell>
                    <TableCell>Tipo de cambio</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientosFiltrados.map((mov, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                      <TableCell>
                            {mov.type == "ingreso" ? <Chip label={formatCurrency(mov.total)} color="success" size="small" />: ""}
                        </TableCell>
                      <TableCell>
                         {mov.type == "egreso" ? <Chip label={formatCurrency(mov.total)} color="error" size="small" />: ""}
                      </TableCell>
                      <TableCell>{mov.observacion}</TableCell>
                      <TableCell>{mov.tc ? "$ ":""}{mov.tc}</TableCell>
                    
                      <TableCell>
                        <Button
                            color="primary"
                            startIcon={<EditIcon />}
                            onClick={() => router.push('/movimiento?movimientoId='+mov.id)}
                        >
                            Ver / Editar
                        </Button>
                        <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => eliminarMovimiento(mov.id)}
                        >
                            Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
            {
                tablaActiva === "USD" &&
            <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Ingreso</TableCell>
                    <TableCell>Egreso</TableCell>
                    <TableCell>Observación</TableCell>
                    <TableCell>Tipo de cambio</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientosFiltradosUSD.map((mov, index) => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                      <TableCell>
                            {mov.type == "ingreso" ? <Chip label={formatCurrency(mov.total)} color="success" size="small" />: ""}
                        </TableCell>
                      <TableCell>
                         {mov.type == "egreso" ? <Chip label={formatCurrency(mov.total)} color="error" size="small" />: ""}
                      </TableCell>
                      <TableCell>{mov.observacion}</TableCell>
                      <TableCell>{mov.tc ? "$ ":""}{mov.tc}</TableCell>
                      <TableCell>
                        <Button
                            color="primary"
                            startIcon={<EditIcon />}
                            onClick={() => router.push('/movimiento?movimientoId='+mov.id)}
                        >
                            Ver / Editar
                        </Button>
                        <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => eliminarMovimiento(mov.id)}
                        >
                            Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               } 
            </Paper>
          </Stack>
        </Container>
      </Box>
      
    </>
  );
};

ProyectoMovimientosPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default ProyectoMovimientosPage;
