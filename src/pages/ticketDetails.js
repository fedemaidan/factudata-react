// pages/ticket/[ticketId].js

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Typography, Container, Box } from '@mui/material';
import ticketService from 'src/services/ticketService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import TicketInfo from 'src/components/ticketInfo';

const TicketDetailsPage = () => {
  const router = useRouter();
  const { ticketId } = router.query; 

  const [ticketData, setTicketData] = useState(null);

  useEffect(() => {
    if (ticketId) {
      async function fetchTicketData() {
        const ticket = await ticketService.getTicketById(ticketId);
        setTicketData(ticket);
        console.log(ticket)
      }
      
      fetchTicketData();
    }
  }, [ticketId]);

  return (
    <Container maxWidth="md">
      {ticketData ? (
        <TicketInfo
          estimatedPrice={ticketData.precioEstimado}
          selectedTags={ticketData.tags}
          selectedFiles={ticketData.archivos}
          fileType={ticketData.tipo}
          status={ticketData.estado}
        />
      ) : (
        <Typography variant="body1">Cargando...</Typography>
      )}
    </Container>
  );
};

TicketDetailsPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default TicketDetailsPage;
