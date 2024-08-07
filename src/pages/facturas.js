import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import ArrowDownOnSquareIcon from '@heroicons/react/24/solid/ArrowDownOnSquareIcon';
import PlusIcon from '@heroicons/react/24/solid/PlusIcon';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import { Box, Button, Container, Stack, SvgIcon, Typography } from '@mui/material';
import { useSelection } from 'src/hooks/use-selection';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { FacturasTable } from 'src/sections/facturas/facturas-table';
import { CustomersSearch } from 'src/sections/customer/customers-search';
import { red, green } from '@mui/material/colors';
import {
  getFacturas,
  deleteFactura,
  uploadFile,
  getTotalFacturas
} from 'src/services/facturasService'; 

const useFacturasIds = (facturas) => {
  return useMemo(
    () => {
      return facturas.map((factura) => factura.id);
    },
    [facturas]
  );
};

const Page = () => {
  const fileInputRef = useRef(null);
  const [facturasList, setFacturasList] = useState([]);
  const [facturasTotal, setFacturasTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const facturasIds = useFacturasIds(facturasList);
  const facturasSelection = useSelection(facturasIds);
  const [isLoading, setIsLoading] = useState(false);
  let startAfter = 0;

  const getFacturasList = async (page, rowsPerPage) => {
    try {
      const limit = 99; 
      //const data = await getFacturas(startAfter, limit);
      const data = [
        {
          filename: '/assets/facturas/factura1.png',
          fecha: "18/02/2024",
          emisor: "LHS WORLDWISE SA",
          cuit: 30757845573,
          numero_factura: "0001-00001034",
          total: 200000
        },
        {
          filename: '/assets/facturas/factura2.jpeg',
          fecha: "27/02/2024",
          emisor: "El Bravo",
          cuit: 30717858073,
          numero_factura: "0003-00007028",
          total: 8800
        },
        {
          filename: '/assets/facturas/factura3.jpeg',
          fecha: "27/03/2024",
          emisor: "WANG YANZHU",
          cuit: 30887859010,
          numero_factura: "0009-000098918",
          total: 983000
        },
        {
          filename: '/assets/facturas/factura4.jpeg',
          fecha: "10/03/2024",
          emisor: "Dario Company",
          cuit: 30887859010,
          numero_factura: "00030098918",
          total: 333993
        }
      ]
      setFacturasList(data);
      setFacturasTotal(await getTotalFacturas())
    } catch (err) {
      console.error(err);
    }
  };

  
  const handleDeleteFactura = async () => {
    await setIsLoading(true);
    if (facturasSelection.selected.length > 0) {
      facturasSelection.selected.forEach(async (selectedId) => {
        const deleted = await deleteFactura(selectedId); // Llama a la función del servicio de Firebase
        if (deleted) {
          getFacturasList(page, rowsPerPage);
        }
      });
    }  
    await setIsLoading(false);              
  }

  useEffect(() => {
    getFacturasList(page, rowsPerPage);
  }, [])

  const handleUploadFile = async (files) => {
    
    const uploaded = await uploadFile(files); // Llama a la función del servicio de Firebase
    if (uploaded) {
      await getFacturasList(page, rowsPerPage);
    }
    await setIsLoading(false);
  };


  const handleUploadClick = async () => {
    console.log("pase")
    await setIsLoading(true);
    fileInputRef.current.click();
  }

  const handlePageChange = useCallback(
    async (event, value) => {
      if (value > page) // subio de página
        startAfter = facturasList[facturasList.length - 1];
      
      setPage(value);
      await getFacturasList(value, rowsPerPage);
    },
    [rowsPerPage]
  );

  const handleRowsPerPageChange = useCallback(
    (event) => {
      setRowsPerPage(event.target.value);
      getFacturasList(page, event.target.value);
    },
    []
  );

  return (
    <>
      <Head>
        <title>
          Facturas
        </title>
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
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={4}
            >
              <Stack spacing={1}>
                <Typography variant="h4">
                  Facturas
                </Typography>
                {/* <Typography variant="h6" style={{ color: green[700], marginLeft: 5 }} >
                  Prespuesto gastado: $33.000 / $94.000
                </Typography> */}
              </Stack>
              <div>
                
              <Button
                    color="inherit"
                    startIcon={(
                      <SvgIcon fontSize="small">
                        <ArrowDownOnSquareIcon />
                      </SvgIcon>
                    )}
                  >
                    Exportar
                  </Button>
                <input 
                  type='file' 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onClick={(e) => {
                    handleUploadFile(e.target.files)
                  }}
                  multiple
                />
                <Button
                  onClick={handleUploadClick}
                  startIcon={(
                    <SvgIcon fontSize="small">
                      <PlusIcon />
                    </SvgIcon>
                  )}
                  variant="contained"
                  disabled={isLoading} 
                >
                  {isLoading ? 'Cargando...' : 'Subir archivos'}
                </Button>
                {facturasSelection.selected.length > 0 ? 
                <Button
                  onClick={handleDeleteFactura}
                  startIcon={(
                    <SvgIcon fontSize="small">
                      <TrashIcon />
                    </SvgIcon>
                  )}
                  variant="contained"
                  style={{ backgroundColor: red[700], marginLeft: 5 }} 
                >
                   {isLoading ? 'Loading...' : `Borrar (${facturasSelection.selected.length})`}
                </Button> : ""}
              </div>
            </Stack>
            <CustomersSearch />
            <FacturasTable
              count={facturasTotal}
              items={facturasList}
              onDeselectAll={facturasSelection.handleDeselectAll}
              onDeselectOne={facturasSelection.handleDeselectOne}
              // onPageChange={handlePageChange}
              // onRowsPerPageChange={handleRowsPerPageChange}
              onSelectAll={facturasSelection.handleSelectAll}
              onSelectOne={facturasSelection.handleSelectOne}
              // page={page}
              // rowsPerPage={rowsPerPage}
              selected={facturasSelection.selected}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

Page.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default Page;
