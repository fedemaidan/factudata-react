// pages/image-data-entry.js
import Head from 'next/head';
import { Box, Container, Typography, Button } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import ImageDataEntry from 'src/components/imageDataEntry'; 
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
    // if (ticketId) {
      async function fetchTicketData() {
        // const ticket = await ticketService.getTicketById(ticketId);
        const ticket = {
          archivos: [ { filename: '/assets/facturas/ejemplo_corralon.png', originalName: '/assets/facturas/ejemplo_corralon.png'}]
        }
        setTicketData(ticket);
        createForm(ticket);
        createResultData(ticket);
        setAllFiles(ticket.archivos)
        // setFile(ticket.archivos[pos])
        setFile(ticket.archivos[0])
      // }
      
      fetchTicketData();
    }
  // }, [ticketId]);
}, []);

  
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
    formulario = [
      {
        name: "fecha",
        label: "Fecha"
      },{
        name: "emisor",
        label: "Emisor"
      },{
        name: "cuit",
        label: "CUIT"
      },{
        name: "numero",
        label: "Número de factura"
      },{
        name: "total",
        label: "Total"
      }
    ]
    setFormFields(formulario)
  }

  
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
        {/* <Typography variant="h4">
          {file?.originalName} ({pos} de {allFiles.length})
        </Typography> */}
        <ImageDataEntry
            url='/assets/facturas/ejemplo_corralon.png'
            formFields={[
              {
                name: "fecha_factura",
                label: "Fecha factura",
                type: "date"
              },{
                name: "nombre_proveedor",
                label: "Proveedor",
                type: "select",
                elements: ["FERRETERIA MODULO 4","FERRETERIA MODULO 3","FERRETERIA MODULO 1","Wilson","Corralon Catan", "Otro"]
              },{
                name: "cuit",
                label: "CUIT",
                type: "text"
              },{
                name: "numero_factura",
                label: "Número de factura",
                type: "text"
              },{
                name: "proyecto",
                label: "Proyecto",
                type: "select",
                elements: ["La Martona 259","La Martona 196","LM 786","CC / Capri","Lares 138", "Lares 146","Lares 147",	"Lares 76",	"Stefanello Obra pesos",	"Alameda 113", "Alameda 225"]
              },{
                name: "categoria",
                label: "Categoría",
                type: "text"
              }
              ,{
                name: "items",
                label: "Items",
                type: "array"
              },{
                name: "total",
                label: "Total",
                type: "number"
              }
            ]}
            originalName='/assets/facturas/ejemplo_corralon.png'
            // handleSendData={x}
            />
        </Container>
      </Box>
    </>
  );
};

ImageDataEntryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ImageDataEntryPage;
