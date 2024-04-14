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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from 'next/router';

function procesarDatosMovimientos(datos, proyecto) {
    return datos.map(movimiento => ({
      fecha: movimiento.FECHA,
      proyecto: proyecto,
      tipo: movimiento.INGRESO ? "ingreso" : "egreso",
      total: movimiento.INGRESO || movimiento.EGRESO,
      descripcion: movimiento.OBS,
      tc: movimiento.TC || null,
      filename: '/assets/facturas/factura1.png'
    }));
  }

function dameMovimientosDelFile(archivo, proyecto) {
    const fs = require('fs');
    const path = require('path');
  
    const filePath = path.resolve('src/data', archivo);
    const data = fs.readFileSync(filePath, 'utf8');
    const datosMovimientos = JSON.parse(data);
    return procesarDatosMovimientos(datosMovimientos, proyecto);
  }

export async function getServerSideProps(context) {

    // Aquí lees el archivo en el servidor y pasas los datos a la página
  const movimientosData = dameMovimientosDelFile('movimientosLara76.json','Lares76');
  const movimientosDataUSD = dameMovimientosDelFile('movimientosLara76USD.json','Lares76');

  // Pasar los datos de movimientos a la página a través de props
  return { props: { movimientosData, movimientosDataUSD } };
  }

const ProyectoMovimientosPage = ({ movimientosData, movimientosDataUSD }) => {
  // Estado para la lista de movimientos
  const [movimientos, setMovimientos] = useState(movimientosData);
  const [movimientosUSD, setMovimientosUSD] = useState(movimientosDataUSD);
  const [tablaActiva, setTablaActiva] = useState('ARS'); 
  const [filtrosActivos, setFiltrosActivos] = useState(false); 
  const [accionesActivas, setAccionesActivas] = useState(false); 
  // Estados para los filtros
  const [filtroDias, setFiltroDias] = useState('30');
  const [filtroObs, setFiltroObs] = useState('');

  const router = useRouter();

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
      if(mov.tipo === 'ingreso') {
        return acc + mov.total;
      } else {
        return acc - mov.total;
      }
    }, 0);
  }, [movimientos]);

  const saldoTotalCajaUSD = 3000;
  // Filtro por días y observación
  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    const filtrados = movimientos.filter((mov) => {
      const fechaMovimiento = new Date(mov.fecha);
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      return diferenciaDias <= filtroDias && (!mov.descripcion || mov.descripcion.toLowerCase().includes(filtroObs.toLowerCase()));
    });
    
  
    // Ordenar de manera descendente por fecha
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });
  
    return filtrados;
  }, [movimientos, filtroDias, filtroObs]);

  const movimientosFiltradosUSD = useMemo(() => {
    const hoy = new Date();
    const filtrados = movimientosUSD.filter((mov) => {
      const fechaMovimiento = new Date(mov.fecha);
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      return diferenciaDias <= filtroDias && (!mov.descripcion || mov.descripcion.toLowerCase().includes(filtroObs.toLowerCase()));
    });
    
  
    // Ordenar de manera descendente por fecha
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });
  
    return filtrados;
  }, [movimientos, filtroDias, filtroObs]);
  

  return (
    <>
      <Head>
        <title>La Martona 92</title>
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
            <Typography variant="h4">La Martona 92</Typography>
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
              <Button
                color="primary"
                startIcon={<MoreVertIcon />}
                onClick={handleAccionesActivas}
              > 
                {accionesActivas ? "Ocultar acciones": "Acciones"}
               </Button>
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
                    <TableCell>Ver / Editar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientosFiltrados.map((mov, index) => (
                    <TableRow key={index}>
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell>
                            {mov.tipo == "ingreso" ? <Chip label={formatCurrency(mov.total)} color="success" size="small" />: ""}
                        </TableCell>
                      <TableCell>
                         {mov.tipo == "egreso" ? <Chip label={formatCurrency(mov.total)} color="error" size="small" />: ""}
                      </TableCell>
                      <TableCell>{mov.descripcion}</TableCell>
                      <TableCell>{mov.tc ? "$ ":""}{mov.tc}</TableCell>
                    
                        <TableCell>
                        <Button
                            color="primary"
                            startIcon={<EditIcon />}
                            onClick={() => router.push('/dataEntryPage?ticketId=111')}
                        >
                            Ver / Editar
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
                    <TableCell>Fechaa</TableCell>
                    <TableCell>Ingreso</TableCell>
                    <TableCell>Egreso</TableCell>
                    <TableCell>Observación</TableCell>
                    <TableCell>Tipo de cambio</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientosFiltradosUSD.map((mov, index) => (
                    <TableRow key={index}>
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell>
                            {mov.tipo == "ingreso" ? <Chip label={formatCurrency(mov.total)} color="success" size="small" />: ""}
                        </TableCell>
                      <TableCell>
                         {mov.tipo == "egreso" ? <Chip label={formatCurrency(mov.total)} color="error" size="small" />: ""}
                      </TableCell>
                      <TableCell>{mov.descripcion}</TableCell>
                      <TableCell>{mov.tc ? "$ ":""}{mov.tc}</TableCell>
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
