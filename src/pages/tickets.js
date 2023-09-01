import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { TicketTable } from 'src/sections/tickets/ticket-table'; // Asegúrate de importar el componente adecuado
import ticketService from 'src/services/ticketService';
import { useAuthContext } from 'src/contexts/auth-context';

const Page = () => {
  const [ticketsList, setTicketsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuthContext();
  const getTicketsList = async () => {
    try {
      setIsLoading(true);
      const data = await ticketService.getTicketsForUser(user.id); 
      setTicketsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getTicketsList();
  }, []);

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
          <Stack spacing={3}>
            <Typography variant="h4">Tickets</Typography>
            {/* Aquí puedes agregar botones u opciones relacionadas con los tickets */}
            <TicketTable
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
