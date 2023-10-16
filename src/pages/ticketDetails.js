import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Typography, Container, Box, Button, Tooltip } from '@mui/material';
import ticketService from 'src/services/ticketService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import TicketInfo from 'src/components/ticketInfo';
import { useAuthContext } from 'src/contexts/auth-context';
import { useAuth } from 'src/hooks/use-auth';

const TicketDetailsPage = () => {
  const router = useRouter();
  const { ticketId } = router.query; 
  const { user } = useAuthContext();
  const auth = useAuth();
  const [ticketData, setTicketData] = useState(null);
  const userCredits = user?.credit; // Supongamos que esta es la cantidad de créditos del usuario. Reemplácelo con el valor real.
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ticketId) {
      async function fetchTicketData() {
        const ticket = await ticketService.getTicketById(ticketId);
        setTicketData(ticket);
      }
      
      fetchTicketData();
    }
  }, [ticketId]);

  // Actions for buttons
  const handleConfirm = async () => {
    await ticketService.confirmTicketById(ticketId,ticketData.archivos.length, user.id);
    await auth.refreshUser(user);
    router.push('/solicitudes');
  };
  
  const handleBuyCredit = () => {
    router.push('/buyCredits?credits='+ticketData.archivos.length+'&ticketId='+ticketId)
  };
  
  const handleDelete = async () => {
    await ticketService.cancelTicketById(ticketId);
  };

  const shouldDisableConfirm = ticketData?.archivos?.length > userCredits;

  const handleRemoveFile = async (fileToRemove) => { 
    setIsLoading(true);
    try {
      await ticketService.removeFileToTicket(ticketId, fileToRemove);
      const updatedTicketData = { ...ticketData };
      updatedTicketData.archivos = updatedTicketData.archivos.filter(file => file.name !== fileToRemove.name);
      setTicketData(updatedTicketData);
    } catch (error) {
      console.error(error);
      // Handle the error appropriately.
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveResultFile = async (fileToRemove) => { 
    setIsLoading(true);
    try {
      await ticketService.removeResultFileToTicket(ticketId, fileToRemove);
      const updatedTicketData = { ...ticketData };
      updatedTicketData.resultado = updatedTicketData.resultado.filter(file => file.name !== fileToRemove.name);
      setTicketData(updatedTicketData);
    } catch (error) {
      console.error(error);
      // Handle the error appropriately.
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmNewFiles = async (files) => {
    setIsLoading(true);
    try {
      await ticketService.addFilesToTicket(ticketId, files);
      const updatedTicketData = { ...ticketData };
      updatedTicketData.archivos = updatedTicketData.archivos.concat(files);
      setTicketData(updatedTicketData);
    } catch (error) {
      console.error(error);
      // Handle the error appropriately.
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddResult = async (files) => {
    setIsLoading(true);
    try {
      await ticketService.addResultToTicket(ticketId, files);
      const updatedTicketData = { ...ticketData };
      if (!updatedTicketData.resultado)
        updatedTicketData.resultado = []
      updatedTicketData.resultado = updatedTicketData.resultado.concat(files);
      setTicketData(updatedTicketData);
    } catch (error) {
      console.error(error);
      // Handle the error appropriately.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      {ticketData ? (
        <TicketInfo
          estimatedPrice={ticketData.precioEstimado}
          selectedTags={ticketData.tags}
          selectedFiles={ticketData.archivos}
          fileType={ticketData.tipo}
          status={ticketData.estado}
          resultFiles={ticketData.resultado}
          eta={ticketData.eta}
          comentarios={ticketData.comentarios}
          onConfirmNewFiles={handleConfirmNewFiles}
          onRemoveFile={handleRemoveFile}
          onRemoveResultFile={handleRemoveResultFile}
          onAddResult={handleAddResult}
          isLoading={isLoading}
        />
      ) : (
        <Typography variant="body1">Cargando...</Typography>
      )}
      <Box mb={3}>
      {ticketData?.estado === 'Borrador' && (
          <Tooltip title={shouldDisableConfirm ? "No puedes confirmar porque no tienes suficiente crédito" : ""}>
            <span> {/* Envuelve el botón con un elemento span para que Tooltip funcione incluso cuando el botón esté deshabilitado */}
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mx: 1 }} 
                disabled={shouldDisableConfirm}
                onClick={handleConfirm}
              >
                Confirmar solicitud
              </Button>
            </span>
          </Tooltip>
        )}
        {ticketData?.estado === 'Borrador' && shouldDisableConfirm && (
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mx: 1 }} 
            onClick={handleBuyCredit}
          >
            Comprar crédito
          </Button>
        )}
        {ticketData?.estado === 'Borrador' && (
        <Button 
          variant="outlined" 
          sx={{ mx: 1, borderColor: 'red', color: 'red' }} 
          onClick={handleDelete}
        >
          Cancelar pedido
        </Button>
        )}
      </Box>
    </Container>
  );
};

TicketDetailsPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default TicketDetailsPage;
