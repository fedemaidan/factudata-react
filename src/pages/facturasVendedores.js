import { useState, useMemo } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, TextField, InputAdornment } from '@mui/material';
import { useSelection } from 'src/hooks/use-selection';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { VendedoresFacturasTable } from 'src/components/vendedoresFacturasTable';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveAltIcon from '@mui/icons-material/SaveAlt';


const FacturasVendedoresPage = () => {
  const fakeVendedoresFacturasData = [
        {
          id: 2,
          filename: '/assets/facturas/factura2.jpeg',
          usuario: "Veronica",
          fecha: "2024-02-27",
          razonSocial: "El Bravo",
          total: 8800,
          iva: 0,
          facturaA: false,
          estado: "Pendiente"
        },{
          id: 1,
          usuario: "Carlos",
          filename: '/assets/facturas/factura1.png',
          fecha: "2024-03-01",
          razonSocial: "Compañía X",
          total: 1000,
          iva: 210, // 21% del total
          facturaA: true,
          estado: "Aprobado"
        },
        {
            id: 3,
            filename: '/assets/facturas/factura3.jpeg',
            usuario: "Matias",
            fecha: "2024-03-04",
            razonSocial: "Empresa Y",
            total: 100000,
            iva: 21000,
            facturaA: false,
            estado: "Pendiente"
          },
          {
            id: 4,
            filename: '/assets/facturas/factura4.jpeg',
            usuario: "Matias",
            fecha: "2024-03-05",
            razonSocial: "Empresa Y",
            total: 200035,
            iva: 2603,
            facturaA: false,
            estado: "Cancelado"
          },
      ];
      
  const [facturasList, setFacturasList] = useState(fakeVendedoresFacturasData);
  const facturasIds = facturasList.map((factura) => factura.id);
  const facturasSelection = useSelection(facturasIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [startDate, setStartDate] = useState(new Date());

  const [selectedEstado, setSelectedEstado] = useState('');

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const handleVendedorChange = (event) => {
    setSelectedVendedor(event.target.value);
  };

  const handleEstadoChange = (event) => {
    setSelectedEstado(event.target.value);
  };

  // Ejemplo de funciones, deberás implementar la lógica real
  const handleUpload = () => {
    console.log('Subir comprobantes');
    // Aquí va la lógica para subir comprobantes
  };

  const onApproveOne = (id) => {
    const nuevoFake = [
      {
        id: 2,
        filename: '/assets/facturas/factura2.jpeg',
        usuario: "Veronica",
        fecha: "2024-02-27",
        razonSocial: "El Bravo",
        total: 8800,
        iva: 0,
        facturaA: false,
        estado: "Aprobado"
      },{
        id: 1,
        usuario: "Carlos",
        filename: '/assets/facturas/factura1.png',
        fecha: "2024-03-01",
        razonSocial: "Compañía X",
        total: 1000,
        iva: 210, // 21% del total
        facturaA: true,
        estado: "Aprobado"
      },
      {
          id: 3,
          filename: '/assets/facturas/factura3.jpeg',
          usuario: "Matias",
          fecha: "2024-03-04",
          razonSocial: "Empresa Y",
          total: 100000,
          iva: 21000,
          facturaA: false,
          estado: "Pendiente"
        },
        {
          id: 4,
          filename: '/assets/facturas/factura4.jpeg',
          usuario: "Matias",
          fecha: "2024-03-05",
          razonSocial: "Empresa Y",
          total: 200035,
          iva: 2603,
          facturaA: false,
          estado: "Cancelado"
        },
    ];
    console.log('aprobar comprobante');
    setFacturasList(nuevoFake)
  };

  const handleDelete = () => {
    console.log('Eliminar comprobantes');
    // Aquí va la lógica para eliminar comprobantes
  };

  const handleExport = () => {
    console.log('Exportar');
    // Aquí va la lógica para exportar los datos
  };

  const filteredFacturasList = useMemo(() => {
    return facturasList.filter((factura) => {
      return (
        (selectedVendedor ? factura.usuario.includes(selectedVendedor) : true) &&
        (selectedEstado ? factura.estado === selectedEstado : true) &&
        (searchTerm ? factura.razonSocial.toLowerCase().includes(searchTerm) ||
                      factura.usuario.toLowerCase().includes(searchTerm) ||
                      factura.total.toString().includes(searchTerm) : true)
      );
    });
  }, [facturasList, selectedVendedor, selectedEstado, searchTerm]);


  
  return (
    <>
      <Head>
        <title>Facturas de Vendedores</title>
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
              Facturas de Vendedores
            </Typography>
            {/* Aquí agregarías tus componentes de filtro y búsqueda */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Buscar"
                placeholder='Buscar por vendedor, razón social o total'
                variant="outlined"
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Filtrar por vendedor"
                variant="outlined"
                onChange={handleVendedorChange}
              />
              <TextField
                // label="Filtrar por estado"
                variant="outlined"
                onChange={handleEstadoChange}
                select
                SelectProps={{ native: true }}
              >
                <option value="">Todos</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Cancelado">Cancelado</option>
              </TextField>
              <TextField
                // label="Filtrar por fecha"
                variant="outlined"
                onChange={handleEstadoChange}
                select
                SelectProps={{ native: true }}
              >
                <option value="30">Ultimos 30 días</option>
                <option value="60">Ultimos 60 días</option>
                <option value="90">Ultimos 90 días</option>
              </TextField>


              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudUploadIcon />}
                onClick={handleUpload}
              >
                Subir comprobantes
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Eliminar comprobantes
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveAltIcon />}
                onClick={handleExport}
              >
                Exportar
              </Button>

            </Stack>
            <VendedoresFacturasTable
              items={filteredFacturasList}
              selected={facturasSelection.selected}
              onSelectOne={facturasSelection.handleSelectOne}
              onApproveOne={onApproveOne}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};
FacturasVendedoresPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default FacturasVendedoresPage;
