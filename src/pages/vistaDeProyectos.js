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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from 'next/router';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';


const uData = [4000, 3000, 2000, 2780, 1890, 2390, 3490];
const xLabels = [
  'Page A',
  'Page B',
  'Page C',
  'Page D',
  'Page E',
  'Page F',
  'Page G',
];

const base = {
    fecha: '2024-03-15',
    proveedor: "Corralon Catan",
    categoria: "Materiales",
    proyecto: "La Martona 92",
    tipo: "egreso",
    total: 81862.12,
    descripcion: "",
    tc: 1030,
    filename: '/assets/facturas/factura1.png'
  }


function procesarDatosMovimientos(datos, proyecto) {
    const proveedores = ["Corralon Ezeiza", "Corralon Catan", "Martinez and Martinez"];
    const categorias = ["Materiales", "Caños", "Mano de obra"];
    datos.push({
        fecha: new Date('2024-03-15'),
        proveedor: "Corralon Catan",
        categoria: "Materiales",
        proyecto: "La Martona 92",
        tipo: "egreso",
        total: 81862.12,
        descripcion: "",
        tc: 1030,
        filename: '/assets/facturas/factura1.png'
      })
    return datos.filter(mov => (mov.EGRESO)).map(movimiento => ({
      fecha: movimiento.FECHA,
      proveedor: proveedores[Math.floor(Math.random() * proveedores.length)],
      categoria: categorias[Math.floor(Math.random() * categorias.length)],
      proyecto: proyecto,
      tipo: movimiento.INGRESO ? "ingreso" : "egreso",
      total: movimiento.INGRESO || movimiento.EGRESO,
      descripcion: movimiento.OBS,
      tc: movimiento.TC || 900,
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
  const [tablaActiva, setTablaActiva] = useState('USD'); 
  const [filtrosActivos, setFiltrosActivos] = useState(false); 
  const [accionesActivas, setAccionesActivas] = useState(false); 
  // Estados para los filtros
  const [filtroDias, setFiltroDias] = useState('30');
  const [filtroObs, setFiltroObs] = useState('');

  const router = useRouter();

  const datosParaGrafico = useMemo(() => {
    const acumuladoPorMes = {};
  
    // Asumiendo que 'movimientos' ya contiene todos los movimientos que deseas visualizar
    movimientos.forEach(mov => {
      const fecha = new Date(mov.fecha);
      const mesYAnio = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`; // Formato YYYY-MM
    
      if (!acumuladoPorMes[mesYAnio]) {
        acumuladoPorMes[mesYAnio] = 0;
      }
      if (mov.tipo === 'egreso') {
        acumuladoPorMes[mesYAnio] += parseInt(mov.total / mov.tc);
      }
    });
  
  const meses = Object.keys(acumuladoPorMes).sort();
  const gastosPorMes = meses.map(mes => acumuladoPorMes[mes]);

  let acumulado = 0; // Variable para llevar el total acumulado
  const gastosAcumuladosPorMes = meses.map(mes => {
    acumulado += acumuladoPorMes[mes];
    return acumulado; // Este es el valor acumulado hasta el mes actual
  });
  console.log(meses,gastosPorMes,gastosAcumuladosPorMes)
    
    return {
      meses,
      gastosPorMes,
      gastosAcumuladosPorMes
    };
  }, [movimientos]);
  

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
  const saldoTotalCajaUSD = useMemo(() => {
    return movimientos.reduce((acc, mov) => {
        return acc + parseInt((mov.total / mov.tc));  
    }, 0);
  }, [movimientos]);

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
                variant={tablaActiva === 'USD' ? "contained" : "outlined"}
                color="primary"
                onClick={() => setTablaActiva('USD')}
                sx={{ flexGrow: 1, py: 2 }}
              >
                Gastos totales: US {saldoTotalCajaUSD > 0? formatCurrency(saldoTotalCajaUSD): "(" +formatCurrency(saldoTotalCajaUSD) + ")"}{}
              </Button>
              <Button
                variant={tablaActiva === 'DATA' ? "contained" : "outlined"}
                color="primary"
                onClick={() => setTablaActiva('DATA')}
                sx={{ flexGrow: 1, py: 2 }}
              >
                Ver gráfico
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
              
              label="Buscar por Proveedor"
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
                tablaActiva === "DATA" && 
                <>
                <LineChart
                    width={1000}
                    height={300}
                    series={[{  data: datosParaGrafico.gastosAcumuladosPorMes, label: 'Gastos acumulados en USD', area: true, showMark: false }]}
                    xAxis={[{  scaleType: 'point', data: datosParaGrafico.meses }]}
                    sx={{
                        '.MuiLineElement-root': {
                        display: 'none',
                        },
                    }}
                    />
                <BarChart
                    xAxis={[{  scaleType: 'band', data: datosParaGrafico.meses }]}
                    series={[{  label: 'Gastos mensuales en USD', data: datosParaGrafico.gastosPorMes }]}
                    width={1000}
                    height={300}
                    />
            </>
            }
            {
                tablaActiva === "USD" &&
            <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Gasto</TableCell>
                    <TableCell>Tipo de cambio</TableCell>
                    <TableCell>Valor USD</TableCell>
                    <TableCell>Ver gasto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                
                    <TableRow key={1}>
                      <TableCell>{base.fecha}</TableCell>
                      <TableCell>{base.proveedor}</TableCell>
                      <TableCell>{base.categoria}</TableCell>
                      <TableCell>{formatCurrency(base.total)}</TableCell>
                      <TableCell>{base.tc ? "$ ":""}{base.tc}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>US {formatCurrency(base.total / base.tc)}</TableCell>
                      <TableCell>
                        <Button
                            color="primary"
                            startIcon={<VisibilityIcon />}
                            onClick={() => router.push('/dataEntryPage?ticketId=111')}
                        >
                            Ver
                        </Button>
                        </TableCell>
                    </TableRow>
                  
                  {movimientosFiltrados.map((mov, index) => (
                    <TableRow key={index}>
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell>{mov.proveedor}</TableCell>
                      <TableCell>{mov.categoria}</TableCell>
                      <TableCell>{formatCurrency(mov.total)}</TableCell>
                      <TableCell>{mov.tc ? "$ ":""}{mov.tc}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>US {formatCurrency(mov.total / mov.tc)}</TableCell>
                      <TableCell>
                        <Button
                            color="primary"
                            startIcon={<VisibilityIcon />}
                            onClick={() => router.push('/dataEntryPage?ticketId=111')}
                        >
                            Ver
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
