
import React, { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow , Button,Chip, Select, MenuItem, FormControl, InputLabel} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/router';

const formatNumber = (number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(number);
};


function dameMovimientosDelFile(archivo, proyecto) {
  const fs = require('fs');
  const path = require('path');

  const filePath = path.resolve('src/data', archivo);
  const data = fs.readFileSync(filePath, 'utf8');
  const datosMovimientos = JSON.parse(data);
  return procesarDatosMovimientos(datosMovimientos, proyecto);
}

export async function getServerSideProps(context) {

  const movimientosData76 = dameMovimientosDelFile('movimientosLara76.json','La Martona 92');
  const movimientosFake = dameMovimientosDelFile('movimientoFake.json', "Lares 7633");
  const movimientosFake2 = dameMovimientosDelFile('movimientoFake2.json', "La Martona 259");
  const movimientosFake3 = dameMovimientosDelFile('movimientoFake3.json', "Lares 138");
  const fakeMovimientosData = movimientosData76.concat(movimientosFake).concat(movimientosFake2).concat(movimientosFake3);

  return { props: { fakeMovimientosData } };
  }

function procesarDatosMovimientos(datos, proyecto) {
  return datos.map(movimiento => ({
    fecha: movimiento.FECHA,
    proyecto: proyecto,
    tipo: movimiento.INGRESO ? "ingreso" : "egreso",
    total: movimiento.INGRESO || movimiento.EGRESO,
    descripcion: movimiento.OBS,
    tc: movimiento.TC || null
  }));
}

const getWeekOfYear = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getInicioSemana = (date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // ajuste si el día es domingo
  return new Date(date.setDate(diff));
};

const getFinSemana = (inicioSemana) => {
  return new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6);
};


// Helper function para obtener la clave de agruación basada en el tipo de agrupación
const getGroupKey = (fecha, tipoAgrupacion) => {
  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  let key;
  switch (tipoAgrupacion) {
    case 'dia':
      key = fecha; // la fecha es la clave
      break;
    case 'semana':
      const inicioSemana = getInicioSemana(date);
      const finSemana = getFinSemana(inicioSemana);
      key = `${inicioSemana.toISOString().split('T')[0]} a ${finSemana.toISOString().split('T')[0]}`;
      break;
    case 'mes':
      key = `${year}/${month < 10 ? `0${month}` : month}`;
      break;
    default:
      throw new Error('Tipo de agrupación no soportado');
  }
  return key;
};


const ResumenMovimientosPage = ({ fakeMovimientosData }) => {
    const [movimientos, setMovimientos] = useState(fakeMovimientosData);
    const [claveSeleccionada, setClaveSeleccionada] = useState(null);
    const [filtro, setFiltro] = useState('15'); // valor predeterminado de 15 días
    const [tipoAgrupacion, setTipoAgrupacion] = useState('dia'); // 'dia', 'semana', 'mes'
    const router = useRouter();

    // Manejador del cambio en el filtro
    const handleChangeFiltro = (event) => {
      setFiltro(event.target.value);
    };


    const toggleDetalles = (clave) => {
      console.log(clave)
      setClaveSeleccionada(claveSeleccionada === clave ? null : clave);
    };


    const movimientosFiltrados = useMemo(() => {
      const hoy = new Date();
      const rango = {
        '15': 15,
        '30': 30,
        '60': 60,
        '90': 90,
        '365': 365,
        '730': 730,
      }[filtro];
    
      return movimientos.filter((mov) => {
        const fechaMov = new Date(mov.fecha);
        return (hoy - fechaMov) / (1000 * 60 * 60 * 24) <= rango;
      });
    }, [movimientos, filtro]);
    
    
  // Obtener todos los proyectos únicos
  const proyectosUnicos = useMemo(() => {
    const proyectos = new Set();
    movimientos.forEach(mov => {
      if (mov.tipo === 'egreso') {
        proyectos.add(mov.proyecto);
      }
    });
    return Array.from(proyectos);
  }, [movimientos]);

  // Sumar egresos por día y por proyecto
  const resumenEgresos = useMemo(() => {
    const resumen = {};

    movimientosFiltrados.forEach(({ fecha, proyecto, total, tipo }) => {
      if (tipo === 'egreso') {
        const key = getGroupKey(fecha, tipoAgrupacion);
        if (!resumen[key]) {
          resumen[key] = proyectosUnicos.reduce((acc, proyecto) => {
            acc[proyecto] = 0;
            return acc;
          }, {});
        }
        resumen[key][proyecto] = (resumen[key][proyecto] || 0) + total;
      }
    });

    return resumen;
  }, [movimientosFiltrados, proyectosUnicos, tipoAgrupacion]);



  const compareDates = (a, b) => {
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    return dateB - dateA; // For descending order
  };

  // Transform resumenEgresos into an array, sort it, and then use it for rendering
  const sortedEgresosEntries = useMemo(() => {
    return Object.entries(resumenEgresos).sort(compareDates);
  }, [resumenEgresos]);

  return (
    <>
      <Head>
        <title>Resumen de Egresos por Proyecto</title>
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
                <Typography variant="h4">Vista general de pagos</Typography>

                {/* Stack horizontal para filtros */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControl variant="outlined" sx={{ minWidth: 120 }}>
                    <InputLabel>Filtro</InputLabel>
                    <Select
                      value={filtro}
                      onChange={handleChangeFiltro}
                      label="Filtro"
                    >
                      <MenuItem value="15">Últimos 15 días</MenuItem>
                      <MenuItem value="30">Últimos 30 días</MenuItem>
                      <MenuItem value="60">Últimos 60 días</MenuItem>
                      <MenuItem value="90">Últimos 90 días</MenuItem>
                      <MenuItem value="365">Último año</MenuItem>
                      <MenuItem value="730">Últimos 2 años</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl variant="outlined" sx={{ minWidth: 120 }}>
                    <InputLabel>Agrupación</InputLabel>
                    <Select
                      value={tipoAgrupacion}
                      onChange={(e) => setTipoAgrupacion(e.target.value)}
                      label="Agrupación"
                    >
                      <MenuItem value="dia">Día</MenuItem>
                      <MenuItem value="semana">Semana</MenuItem>
                      <MenuItem value="mes">Mes</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Total</TableCell>
                    {proyectosUnicos.map((proyecto) => (
                      <TableCell key={proyecto}>{proyecto}</TableCell>
                    ))}
                    <TableCell>Ver detalle</TableCell>
                  </TableRow>
                  
                </TableHead>
                <TableBody>
                {sortedEgresosEntries.map(([clave, proyectos]) => {
                    const total = Object.values(proyectos).reduce((sum, value) => sum + value, 0);
                    return (
                      <>
                      <TableRow key={clave}>
                      <TableCell>
                          <Chip label={clave} color="info" size="small" />
                          </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{formatNumber(total)}</TableCell>
                        {proyectosUnicos.map((proyecto) => (
                          <TableCell key={proyecto}>
                            {proyectos[proyecto] ? formatNumber(proyectos[proyecto])  : '-'}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button onClick={() => toggleDetalles(clave)}>
                            {claveSeleccionada === clave ? "Ocultar" : "Ver detalle"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {claveSeleccionada === clave && (
                          <TableRow>
                            <TableCell colSpan={proyectosUnicos.length + 3} style={{ padding: 0 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Proyecto</TableCell>
                                    <TableCell>Total</TableCell>
                                    <TableCell>Descripción</TableCell>
                                    <TableCell>TC</TableCell>
                                    <TableCell>Ver / Editar</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {movimientosFiltrados.filter(mov => {
                                      // Convertir la fecha del movimiento a la misma 'clave' que estamos usando para agrupar
                                      const movDate = new Date(mov.fecha);
                                      const movKey = getGroupKey(mov.fecha, tipoAgrupacion);
                                      return movKey === clave && mov.tipo === 'egreso';
                                    }).map((detalle, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{detalle.fecha}</TableCell>
                                        <TableCell>{detalle.proyecto}</TableCell>
                                        <TableCell>{formatNumber(detalle.total)}</TableCell>
                                        <TableCell>{detalle.descripcion}</TableCell>
                                        <TableCell>{detalle.tc}</TableCell>
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
                                    ))
                                  }
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                  </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

ResumenMovimientosPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default ResumenMovimientosPage;