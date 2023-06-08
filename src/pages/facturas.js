import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { subDays, subHours } from 'date-fns';
import ArrowDownOnSquareIcon from '@heroicons/react/24/solid/ArrowDownOnSquareIcon';
import ArrowUpOnSquareIcon from '@heroicons/react/24/solid/ArrowUpOnSquareIcon';
import PlusIcon from '@heroicons/react/24/solid/PlusIcon';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import { Box, Button, Container, Stack, SvgIcon, Typography } from '@mui/material';
import { useSelection } from 'src/hooks/use-selection';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { FacturasTable } from 'src/sections/facturas/facturas-table';
import { CustomersSearch } from 'src/sections/customer/customers-search';
import { applyPagination } from 'src/utils/apply-pagination';
import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, storage } from 'src/config/firebase';
import { ref, uploadBytes } from 'firebase/storage';
const now = new Date();
import { red } from '@mui/material/colors';


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
  const facturasCollectionRef = collection(db, 'facturas');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const facturasIds = useFacturasIds(facturasList);
  const facturasSelection = useSelection(facturasIds);

  const getFacturasList = async () => {
    try{
      const data = await getDocs(facturasCollectionRef);
      const filteredData = data.docs.map( (doc) =>  ({
        ...doc.data(),
        id: doc.id
      }))
      const paginatedData = applyPagination(filteredData, page, rowsPerPage);
      setFacturasList(paginatedData);
    }
    catch(err) {
      console.error(err);
    }
    
  }

  const deleteFactura = async (id) => {
    const facturaDoc = doc(db, "facturas", id);
    await deleteDoc(facturaDoc);
    getFacturasList();
  }
  useEffect(() => {
    getFacturasList();
  }, [])

  const uploadFile = async (files) => {
    if (!files)
      return;
    
    try {
      for(let i = 0; i < files.length;i++) {
        const fileUpload = files[i];
        const filename = `probandoFiles/${fileUpload.name}`;
        const filesFolderRef = ref(storage, filename);
        await uploadBytes(filesFolderRef, fileUpload)
        await addDoc(facturasCollectionRef, {
          tipo: "COMPRA",
          filename: filename
        })
      }
      
      getFacturasList();

    }
    catch(e) {
      console.error(e);
    }
  }

  const handleUploadClick = async () => {
    fileInputRef.current.click();
  }

  const handlePageChange = useCallback(
    (event, value) => {
      setPage(value);
    },
    []
  );

  const handleRowsPerPageChange = useCallback(
    (event) => {
      setRowsPerPage(event.target.value);
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
                <Stack
                  alignItems="center"
                  direction="row"
                  spacing={1}
                >
                  <Button
                    color="inherit"
                    startIcon={(
                      <SvgIcon fontSize="small">
                        <ArrowUpOnSquareIcon />
                      </SvgIcon>
                    )}
                  >
                    Import
                  </Button>
                  <Button
                    color="inherit"
                    startIcon={(
                      <SvgIcon fontSize="small">
                        <ArrowDownOnSquareIcon />
                      </SvgIcon>
                    )}
                  >
                    Export
                  </Button>
                </Stack>
              </Stack>
              <div>
                <input 
                  type='file' 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onClick={(e) => {
                    uploadFile(e.target.files)
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
                >
                  Add
                </Button>
                {facturasSelection.selected.length > 0 ? 
                <Button
                  onClick={() => {
                    if (facturasSelection.selected.length > 0) {
                      facturasSelection.selected.forEach((selectedId) => {
                        deleteFactura(selectedId);
                      });
                    }                
                  }}
                  startIcon={(
                    <SvgIcon fontSize="small">
                      <TrashIcon />
                    </SvgIcon>
                  )}
                  variant="contained"
                  style={{ backgroundColor: red[700], marginLeft: 5 }} 
                >
                  Remove ({facturasSelection.selected.length})
                </Button> : ""}
              </div>
            </Stack>
            <CustomersSearch />
            <FacturasTable
              count={facturasList.length}
              items={facturasList}
              onDeselectAll={facturasSelection.handleDeselectAll}
              onDeselectOne={facturasSelection.handleDeselectOne}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              onSelectAll={facturasSelection.handleSelectAll}
              onSelectOne={facturasSelection.handleSelectOne}
              page={page}
              rowsPerPage={rowsPerPage}
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
