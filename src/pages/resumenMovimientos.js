import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Card, CardContent, Button, IconButton, Grid } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ticketService from 'src/services/ticketService';
import { useRouter } from 'next/router';
import { getEmpresaById } from 'src/services/empresaService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatTimestamp } from 'src/utils/formatters';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const ResumenMovimientosPage = () => {
    const router = useRouter();
    const { empresaId } = router.query;
    const { user } = useAuthContext();
    const [allMovimientos, setAllMovimientos] = useState([]);

    useEffect(() => {
        const fetchAllMovimientos = async () => {
            let empresa;
            if (!empresaId) {
                empresa = await getEmpresaDetailsFromUser(user);
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
                <Container maxWidth="lg">
                    <Stack spacing={3}>
                        <Typography variant="h4">Movimientos últimos 7 días</Typography>
                        <Grid container spacing={2}>
                            {allMovimientos.map((mov, index) => (
                                <Grid item xs={12} key={index}>
                                    <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ color: mov.type === 'ingreso' ? 'green' : 'red' }}>
                                                {mov.type === 'ingreso' ? `Ingreso: ${formatCurrency(mov.total)}` : `Egreso: ${formatCurrency(mov.total)}`}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'textSecondary', mb: 1 }}>
                                                {formatTimestamp(mov.fecha_factura)}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'textSecondary' }}>
                                                Proyecto: {mov.proyectoNombre}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'textSecondary' }}>
                                                Moneda: {mov.moneda}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'textSecondary', mb: 1 }}>
                                                Observación: {mov.observacion || 'Ninguna'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'textSecondary' }}>
                                                Código de operación: {mov.codigo_operacion || 'Ninguno'}
                                            </Typography>
                                            <Box display="flex" justifyContent="space-between">
                                                <Button
                                                    variant="text"
                                                    color="primary"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => router.push(`/movementForm?movimientoId=${mov.id}&lastPageName=${mov.proyecto_nombre}&proyectoId=${mov.proyecto_id}&proyectoName=${mov.proyecto_nombre}&lastPageUrl=${router.asPath}`)}
                                                >
                                                    Ver / Editar
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
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
