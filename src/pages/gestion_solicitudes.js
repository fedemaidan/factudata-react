import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Autocomplete, TextField } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { SolicitudesWorkingTable } from 'src/sections/tickets/solicitudes-working-table';
import ticketService from 'src/services/ticketService';
import profileService from 'src/services/profileService';
import { useAuthContext } from 'src/contexts/auth-context';

const DEFAULT_EMAIL = "mariano_cardenes1@hotmail.com";

const Page = () => {
  const [ticketsList, setTicketsList] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const profilesData = await profileService.getProfiles();
      setProfiles(profilesData);

      // Encuentra el perfil por defecto usando el email.
      const defaultProfile = profilesData.find(p => p.email === DEFAULT_EMAIL);
      setSelectedProfile(defaultProfile);

      if (defaultProfile) {
        await getTicketsList(defaultProfile.id);
      }
    };

    fetchInitialData();
  }, []);

  const getTicketsList = async (userId) => {
    try {
      setIsLoading(true);
      const data = await ticketService.getTicketsForUser(userId);
      const pendingTickets = data.filter(ticket => !ticket.completo);
      setTicketsList(pendingTickets);
      setPendingCount(pendingTickets.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectedProfile = (event, newValue) => {
    setSelectedProfile(newValue);
    if (newValue) {
      getTicketsList(newValue.id);
    }
  };

  return (
    <>
      <Head>
        <title>Tickets Pendientes</title>
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
            <Typography variant="h4">
              Solicitudes Pendientes ({pendingCount})
            </Typography>
            <Autocomplete
              id="profile-selector"
              options={profiles}
              getOptionLabel={(option) => option.email} // Asumiendo que cada perfil tiene un email
              value={selectedProfile}
              onChange={handleSelectedProfile}
              renderInput={(params) => <TextField {...params} label="Filtrar por usuario" />}
            />
            <SolicitudesWorkingTable
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
