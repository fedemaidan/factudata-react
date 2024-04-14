import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase'; 
import Head from 'next/head';
import { Box, Container, Stack, Typography, Tab, Tabs, TextField, Button } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { NumerosTelefonoDetails } from 'src/sections/empresa/numerosTelefonoDetails';
import { ProyectosDetails } from 'src/sections/empresa/proyectosDetails';
import { CategoriasDetails } from 'src/sections/empresa/categoriasDetails';
import { ProveedoresDetails } from 'src/sections/empresa/proveedoresDetails';
import { updateEmpresaDetails, getEmpresaDetailsFromUser } from 'src/services/empresaService'; // Asegúrate de que la ruta es correcta
import { useAuthContext } from 'src/contexts/auth-context';


const EmpresaPage = () => {
  const { user } = useAuthContext();
  
  const [currentTab, setCurrentTab] = useState('telefonos');
  const [empresa, setEmpresa] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  

  const tabs = [
    { value: 'telefonos', label: 'Números de Teléfono' },
    { value: 'proyectos', label: 'Proyectos' },
    { value: 'categorias', label: 'Categorías' },
    { value: 'proveedores', label: 'Proveedores' },
  ];

  useEffect(() => {
    const fetchEmpresaData = async () => {
      const empresa = await getEmpresaDetailsFromUser(user)
      setEmpresa(empresa)
    };

    fetchEmpresaData();
  }, [user]);


  const handleTabsChange = (event, value) => {
    setCurrentTab(value);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Llama a la función updateEmpresaDetails para guardar el nuevo nombre
    const updated = await updateEmpresaDetails(empresa.id, { nombre: empresa.nombre });
    if (updated) {
      console.log('Nombre de la empresa actualizado correctamente');
    } else {
      console.error('Error al actualizar el nombre de la empresa');
    }
    setIsEditing(false);
  };

  const handleChange = (event) => {
    const updatedEmpresa = { ...empresa, nombre: event.target.value };
    setEmpresa(updatedEmpresa);
  };

  return (
    <>
      <Head>
        <title>Datos de la Empresa</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3}>
            {isEditing ? (
              <>
                <TextField
                  label="Nombre de la Empresa"
                  value={empresa?.nombre}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleSave}
                >
                  Guardar
                </Button>
              </>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h4">
                    {empresa?.nombre}
                  </Typography>
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={handleEdit}
                  >
                    Editar nombre
                  </Button>
                </Stack>
                <Tabs
                  value={currentTab}
                  onChange={handleTabsChange}
                  textColor="primary"
                  indicatorColor="primary"
                >
                  {tabs.map((tab) => (
                    <Tab key={tab.value} label={tab.label} value={tab.value} />
                  ))}
                </Tabs>
              </>
            )}
            {currentTab === 'telefonos' && <NumerosTelefonoDetails />}
            {currentTab === 'proyectos' && <ProyectosDetails />}
            {currentTab === 'categorias' && <CategoriasDetails empresa={empresa}/>}
            {currentTab === 'proveedores' && <ProveedoresDetails empresa={empresa}/>}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EmpresaPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default EmpresaPage;
