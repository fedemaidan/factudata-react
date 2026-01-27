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
import { CategoriasMaterialesDetails } from 'src/sections/empresa/categoriasMaterialesDetails';

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

   const refreshEmpresa = async () => {
    if (!empresaId) return;
    const nueva = await getEmpresaById(empresaId);
    setEmpresa(nueva);
  };

  const patchEmpresa = (partial) => {
    setEmpresa(prev => (prev ? { ...prev, ...partial } : prev));
  };

  if (!user || !empresa) return null;

  return (
    <>
      <Head>
        <title>Configuración Básica</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: { xs: 4, sm: 8 }
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 6 } }}>
          <Stack spacing={{ xs: 2, sm: 3 }}>
            <Typography variant="h4">Configuración Básica</Typography>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              aria-label="Secciones de configuración básica"
              sx={{
                maxWidth: '100%',
                '& .MuiTabs-scroller': { overflowX: 'auto !important' },
                '& .MuiTabs-flexContainer': { flexWrap: 'nowrap' }
              }}
            >
              <Tab label="Usuarios" value="usuarios" />
              <Tab label="Proyectos" value="proyectos" />
              <Tab label="Proveedores" value="proveedores" />
              <Tab label="Categorias" value="categorias" />
              <Tab label="Categorias Materiales" value="categorias_materiales" />
              <Tab label="Etapas" value="etapas" />
              <Tab label="Medios de pago" value="medios_pago" />
              <Tab label="Impuestos" value="impuestos" />
            </Tabs>

            {currentTab === 'usuarios' && <AdminBasico empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>}
            {currentTab === 'proyectos' && <ProyectosDetails empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>}
            {currentTab === 'proveedores' && <ProveedoresDetails empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>}
            {currentTab === 'categorias' && <CategoriasDetails empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>}
            {currentTab === 'categorias_materiales' && <CategoriasMaterialesDetails empresa={empresa} refreshEmpresa={refreshEmpresa}/>}
            {currentTab === 'etapas' && <EtapasDetails empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>} 
            {currentTab === 'medios_pago' && <MediosPagoDetails empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>}
            {currentTab === 'impuestos' && <ImpuestosDetails empresa={empresa} onEmpresaChange={patchEmpresa} refreshEmpresa={refreshEmpresa}/>}
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
