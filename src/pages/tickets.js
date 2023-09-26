import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Button, Autocomplete, TextField } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { TicketTable } from 'src/sections/tickets/ticket-table'; // Asegúrate de importar el componente adecuado
import ticketService from 'src/services/ticketService';
import profileService from 'src/services/profileService';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';


const Page = () => {
  const [ticketsList, setTicketsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soy_privado, setSoyPrivado] = useState(false);
  const [profiles, setProfiles] = useState([]);  // Para guardar la lista de perfiles
  const [selectedProfile, setSelectedProfile] = useState(null);  // Para guardar el perfil seleccionado

  const router = useRouter();
 
  useEffect(() => {
    
    getTicketsList();

  }, []);



  const { user } = useAuthContext();
  
  const getTicketsList = async (userId = null) => {
    try {
      setIsLoading(true);
      
      if (userId) {
        const data = await ticketService.getTicketsForUser(userId); 
        setTicketsList(data);
      }
      else {
        const data = await ticketService.getTicketsForUser(user.id); 
        setTicketsList(data);
      }
        
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = () => {
    router.push('/generarPedido');
  };
  
  const handleSelectedProfile = (event, newValue) => {
    setSelectedProfile(newValue) 
    if (newValue) {
      getTicketsList(newValue.id)
    }
  }

  const handleVerPrivado = (event) => {
    setSoyPrivado(!soy_privado);
    const fetchProfiles = async () => {
        try {
          const profilesData = await profileService.getProfiles();
          setProfiles(profilesData);
        } catch (err) {
          console.error(err);
        }
      };
      fetchProfiles();
  }

  return (
    <>
      <Head>
        <title>Tickets</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="xl">
          {(user.email == "fede.maidan@gmail.com" || user.email == "facundo.ferro@outlook.com") && 
          <Button variant="contained" onClick={handleVerPrivado}>
          Ver privado
        </Button>}
          <Stack spacing={3}>
            <Typography variant="h4">Solicitudes</Typography>
            {soy_privado && <Autocomplete
            id="profile-selector"
            options={profiles}
            getOptionLabel={(option) => option.email} // Asumo que cada perfil tiene un 'name'
            onChange={handleSelectedProfile}
            renderInput={(params) => <TextField {...params} label="Seleccionar Perfil" />}
          />}
            <Button variant="contained" onClick={handleCreateTicket}>
              Crear nueva solicitud
            </Button>
            <TicketTable
              soy_privado={soy_privado}
              items={ticketsList}
              isLoading={isLoading}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
