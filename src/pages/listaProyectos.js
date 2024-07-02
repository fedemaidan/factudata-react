import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService'; 
import { useRouter } from 'next/router';
import EditIcon from '@mui/icons-material/Edit';

const formatCurrency = (amount) => {
  if (amount)
    return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
  else
    return "$ 0";
};

const ListaProyectosPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;
  const { user } = useAuthContext();
  const [proyectos, setProyectos] = useState([]);

  useEffect(() => {
    const fetchProyectos = async () => {
      
      if (user) {
        let empresa;
            if (!empresaId) {
                console.log(user)
                empresa = await getEmpresaDetailsFromUser(user)
                console.log(empresa)
            } else {
                empresa = await getEmpresaById(empresaId);
            }
        let proyectosData = await getProyectosByEmpresa(empresa);
        
        setProyectos(proyectosData);
      }
    };

    fetchProyectos();
  }, [user]);

  return (
    <>
      <Head>
        <title>Lista de Proyectos</title>
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
            <Typography variant="h4">Proyectos</Typography>
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre del Proyecto</TableCell>
                    <TableCell>Total en Pesos</TableCell>
                    <TableCell>Total en Dólares</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Ver proyecto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proyectos.map((proyecto) => (
                    <TableRow key={proyecto.id}>
                      <TableCell>{proyecto.nombre}</TableCell>
                      <TableCell>{formatCurrency(proyecto.totalPesos)}</TableCell>
                      <TableCell>{formatCurrency(proyecto.totalDolares)}</TableCell>
                      <TableCell>{proyecto.activo ? 'Activo' : 'Inactivo'}</TableCell>
                      <TableCell><Button
                            color="primary"
                            startIcon={<EditIcon />}
                            onClick={() => router.push('/cajaProyecto/?proyectoId=' + proyecto.id)}
                          >
                            Ver proyecto
                          </Button></TableCell>
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

ListaProyectosPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default ListaProyectosPage;
