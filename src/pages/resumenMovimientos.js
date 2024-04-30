import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Chip,Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ticketService from 'src/services/ticketService';
import { useRouter } from 'next/router';
import { getEmpresaById } from 'src/services/empresaService'; 

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,  // Define el mínimo de dígitos fraccionarios a 0
      maximumFractionDigits: 0   // Define el máximo de dígitos fraccionarios a 0
    }).format(amount);
  };
  
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
const ResumenMovimientosPage = () => {
    const router = useRouter();
    const { empresaId } = router.query;

    const [proyectos, setProyectos] = useState([]);
    const [movimientos, setMovimientos] = useState({});
    const [expandedProyectos, setExpandedProyectos] = useState({});

    useEffect(() => {
        const fetchProyectos = async () => {
            const empresa = await getEmpresaById(empresaId)
            const fetchedProyectos = await getProyectosByEmpresa(empresa);
            setProyectos(fetchedProyectos);
            fetchedProyectos.forEach(async (proyecto) => {
                const movs = await ticketService.getLastMovimientosForProyecto(proyecto.id);
                setMovimientos(prevMovimientos => ({ ...prevMovimientos, [proyecto.id]: movs }));
                setExpandedProyectos({...expandedProyectos, [proyecto.id]: false})
            });
        };

        fetchProyectos();
    }, [empresaId]);

    const toggleProyecto = (proyectoId) => {
        setExpandedProyectos(prev => ({
            ...prev,
            [proyectoId]: !prev[proyectoId]
        }));
    };

    return (
        <>
            <Head>
                <title>Movimientos por Proyecto</title>
            </Head>
            <Box
                component="main"
                sx={{ flexGrow: 1, py: 8 }}
            >
                <Container maxWidth="xl">
                    <Stack spacing={3}>
                        <Typography variant="h4">Movimientos por Proyecto</Typography>
                        {proyectos.map((proyecto) => (
                            <Paper key={proyecto.id} sx={{ my: 2 }}>
                                <Typography variant="h6" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => toggleProyecto(proyecto.id)}>
                                    {proyecto.nombre} / Caja ARS: {formatCurrency(proyecto.totalPesos,0)} / Caja USD: {formatCurrency(proyecto.totalDolares)}
                                    <IconButton>
                                        {expandedProyectos[proyecto.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                </Typography>
                                {expandedProyectos[proyecto.id] && (
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                            <TableCell>Fecha</TableCell>
                                            <TableCell>Ingreso</TableCell>
                                            <TableCell>Egreso</TableCell>
                                            <TableCell>Categoría</TableCell>
                                            <TableCell>Subcategoría</TableCell>
                                            <TableCell>Observación</TableCell>
                                            <TableCell>Tipo de cambio</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {movimientos[proyecto.id] && movimientos[proyecto.id].map((mov) => (
                                                <TableRow key={mov.id}>
                                                    <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                                                        <TableCell>
                                                                {mov.type == "ingreso" ? <Chip label={formatCurrency(mov.total)} color="success" size="small" />: ""}
                                                            </TableCell>
                                                        <TableCell>
                                                            {mov.type == "egreso" ? <Chip label={formatCurrency(mov.total)} color="error" size="small" />: ""}
                                                        </TableCell>
                                                        <TableCell>{mov.categoria}</TableCell>
                                                        <TableCell>{mov.subcategoria}</TableCell>
                                                        <TableCell>{mov.observacion}</TableCell>
                                                        <TableCell>{mov.tc ? "$ ":""}{mov.tc}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </Paper>
                        ))}
                    </Stack>
                </Container>
            </Box>
        </>
    );
};

ResumenMovimientosPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default ResumenMovimientosPage;
