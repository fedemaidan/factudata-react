import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Tabs, Tab } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';
import { AdminBasico } from 'src/sections/empresa/adminBasico';
import { ProyectosDetails } from 'src/sections/empresa/proyectosDetails';
import { getEmpresaById } from 'src/services/empresaService';

const ConfiguracionBasicaPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { empresaId } = router.query;

  const [empresa, setEmpresa] = useState(null);
  const [currentTab, setCurrentTab] = useState('crear');

  useEffect(() => {
    if (empresaId) {
      getEmpresaById(empresaId).then(setEmpresa);
    }
  }, [empresaId]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (!user || !empresa) return null;

  return (
    <>
      <Head>
        <title>Configuración Básica</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="md">
          <Stack spacing={3}>
            <Typography variant="h4">Configuración Básica</Typography>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Usuarios" value="usuarios" />
              <Tab label="Proyectos" value="proyectos" />
            </Tabs>

            {currentTab === 'usuarios' && <AdminBasico empresa={empresa} />}
            {currentTab === 'proyectos' && <ProyectosDetails empresa={empresa} />}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

ConfiguracionBasicaPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default ConfiguracionBasicaPage;
