import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Tabs, Tab } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';
import { AdminBasico } from 'src/sections/empresa/adminBasico';
import { ProyectosDetails } from 'src/sections/empresa/proyectosDetails';
import { getEmpresaById } from 'src/services/empresaService';
import { ProveedoresDetails } from 'src/sections/empresa/proveedoresDetails';
import { CategoriasDetails } from 'src/sections/empresa/categoriasDetails';
import { EtapasDetails } from 'src/sections/empresa/etapasDetails';
import { MediosPagoDetails } from 'src/sections/empresa/mediosPagoDetails';
import { ImpuestosDetails } from 'src/sections/empresa/impuestosDetails';

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
              <Tab label="Proveedores" value="proveedores" />
              <Tab label="Categorias" value="categorias" />
              <Tab label="Etapas" value="etapas" />
              <Tab label="Medios de pago" value="medios_pago" />
              <Tab label="Impuestos" value="impuestos" />
            </Tabs>

            {currentTab === 'usuarios' && <AdminBasico empresa={empresa} />}
            {currentTab === 'proyectos' && <ProyectosDetails empresa={empresa} />}
            {currentTab === 'proveedores' && <ProveedoresDetails empresa={empresa} />}
            {currentTab === 'categorias' && <CategoriasDetails empresa={empresa} />}
            {currentTab === 'etapas' && <EtapasDetails empresa={empresa} />} 
            {currentTab === 'medios_pago' && <MediosPagoDetails empresa={empresa} />}
            {currentTab === 'impuestos' && <ImpuestosDetails empresa={empresa} />}
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
