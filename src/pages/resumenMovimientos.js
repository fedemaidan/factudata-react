import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ticketService from 'src/services/ticketService';
import { useRouter } from 'next/router';
import { getEmpresaById } from 'src/services/empresaService'; 
import { getEmpresaDetailsFromUser } from 'src/services/empresaService'; 
import { useAuthContext } from 'src/contexts/auth-context';

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
    const date = new Date(timestamp.seconds * 1000);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

const ResumenMovimientosPage = () => {
    const router = useRouter();
    const { empresaId } = router.query;
    const { user } = useAuthContext();
    const [allMovimientos, setAllMovimientos] = useState([]);
    // const [columnVisibility, setColumnVisibility] = useState({
    //     fecha: true,
    //     proyecto: true,
    //     ingreso: true,
    //     egreso: true,
    //     observacion: true,
    //     categoria: true,
    //     subcategoria: true
    // });

    // const handleColumnVisibilityChange = (column) => {
    //     setColumnVisibility(prev => ({
    //         ...prev,
    //         [column]: !prev[column]
    //     }));
    // };


    useEffect(() => {
        const fetchAllMovimientos = async () => {
            let empresa;
            if (!empresaId) {
                empresa = await getEmpresaDetailsFromUser(user)
            } else {
                empresa = await getEmpresaById(empresaId);
            }
            const proyectos = await getProyectosByEmpresa(empresa);
            
            const allMovs = [];

            for (const proyecto of proyectos) {
                const movs = await ticketService.getLastMovimientosForProyecto(proyecto.id);
                allMovs.push(...movs.map(mov => ({ ...mov, proyectoNombre: proyecto.nombre })));
            }

            allMovs.sort((a, b) => b.fecha_factura.seconds - a.fecha_factura.seconds);
            setAllMovimientos(allMovs);
        };

        fetchAllMovimientos();
    }, [empresaId]);

    return (
        <>
            <Head>
                <title>Movimientos últimos 7 días</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
                <Container maxWidth="xl">
                    <Stack spacing={3}>
                        <Typography variant="h4">Movimientos últimos 7 días</Typography>
                        {/* <FormGroup row>
                            {Object.keys(columnVisibility).map((key) => (
                                <FormControlLabel
                                    control={<Checkbox checked={columnVisibility[key]} onChange={() => handleColumnVisibilityChange(key)} />}
                                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                                    key={key}
                                />
                            ))}
                        </FormGroup> */}
                        <Paper sx={{ my: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Proyecto</TableCell>
                                        <TableCell>Ingreso</TableCell>
                                        <TableCell>Egreso</TableCell>
                                        <TableCell>Moneda</TableCell>
                                        <TableCell>Observación</TableCell>
                                        {/* <TableCell>Categoria</TableCell>
                                        <TableCell>Subcategoria</TableCell> */}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allMovimientos.map((mov, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                                            <TableCell>{mov.proyectoNombre}</TableCell>
                                            <TableCell>{mov.type == "ingreso" ? <Chip label={formatCurrency(mov.total)} color="success" size="small" />: ""}</TableCell>
                                            <TableCell>{mov.type == "egreso" ? <Chip label={formatCurrency(mov.total)} color="error" size="small" />: ""}</TableCell>
                                            <TableCell>{mov.moneda}</TableCell>
                                            <TableCell>{mov.observacion}</TableCell>
                                            {/* <TableCell>{mov.categoria}</TableCell>
                                            <TableCell>{mov.subcategoria}</TableCell> */}
                                        </TableRow>
                                    ))}
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
    <DashboardLayout>{page}</DashboardLayout>
);

export default ResumenMovimientosPage;
