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
  const [allFiles, setAllFiles] = useState([]);
  const [pos, setPos] = useState(0);
  const [resultData, setResultData] = useState([]);

  const getnext = () => {
    setFile(allFiles[pos + 1])
    setPos(pos + 1);
  };

  const handleSendData = (data) => {
    const dataString = JSON.stringify(data, null, 2); // Indentación de 2 espacios para una mejor lectura
    alert(`Datos recibidos:\n${dataString}`);
    const resultados = ticketData.archivos.map( (element) => {
      if (file.name == element.name && file.originalName == element.originalName) {
        element.data = data;
      }
      
      return element
      })
    setResultData(resultados)
    ticketService.updateTicketResultRowsById(ticketId,resultados);
    getnext()
  }
  

  useEffect(() => {
    if (ticketId) {
      async function fetchTicketData() {
        const ticket = await ticketService.getTicketById(ticketId);
        setTicketData(ticket);
        createForm(ticket);
        createResultData(ticket);
        setAllFiles(ticket.archivos)
        setFile(ticket.archivos[pos])
      }
      
      fetchTicketData();
    }
  }, [ticketId]);

  
  const createResultData = async (ticket) => {
    let resultados = [];
    if (ticket.resultados)
      resultados = ticket.resultados
    else
      resultados = ticket.archivos.map( (file) => {
        return {
          originalName: file.originalName,
          name: file.name,
        }
      })
      setResultData(resultados)
  }

  const createForm = async (ticket) => {
    let formulario = ticket.tags.map( (item) => {
      return {
        name: item == "" ? "NO_RECONOCIDO": item,
        label: item == "" ? "NO_RECONOCIDO": item
      }
    })
    setFormFields(formulario)
  }

  
  return (
    <>
      <Head>
        <title>Carga de Datos de Imagenn</title>
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
