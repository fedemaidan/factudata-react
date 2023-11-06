// pages/image-data-entry.js
import Head from 'next/head';
import { Box, Container, Typography, Button } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import ImageDataEntry from 'src/components/ImageDataEntry'; 
import ticketService from 'src/services/ticketService';

const ImageDataEntryPage = () => {

  const router = useRouter();
  const { ticketId } = router.query; 
  const [ticketData, setTicketData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [file, setFile] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [pos, setPos] = useState(0);

  const getnext = () => {
    setIsPdf(allFiles[pos + 1].originalName.endsWith('.pdf'))
    setFile(allFiles[pos + 1])
    setPos(pos + 1);
  };

  const handleSendData = (data) => {
    const dataString = JSON.stringify(data, null, 2); // Indentación de 2 espacios para una mejor lectura
    alert(`Datos recibidos:\n${dataString}`);
    getnext()
  }


  useEffect(() => {
    if (ticketId) {
      async function fetchTicketData() {
        const ticket = await ticketService.getTicketById(ticketId);
        setTicketData(ticket);
        let formulario = ticket.tags.map( (item) => {
          return {
            name: item,
            label: item
          }
        })
        setIsPdf(ticket.archivos[pos].originalName.endsWith('.pdf'))
        console.log(ticket.archivos[pos].originalName.endsWith('.pdf'))
        setFormFields(formulario)
        setAllFiles(ticket.archivos)
        setFile(ticket.archivos[pos])
      }
      
      fetchTicketData();
    }
  }, [ticketId]);


  
  return (
    <>
      <Head>
        <title>Carga de Datos de Imagen</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="lg">
        <Typography variant="h4">
          {file?.originalName} ({pos} de {allFiles.length})
        </Typography>
        <ImageDataEntry
            url={file?.name}
            formFields={formFields}
            originalName={file?.originalName}
            handleSendData={handleSendData}
            />
        </Container>
      </Box>
    </>
  );
};

ImageDataEntryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ImageDataEntryPage;
