import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  Box,
} from '@mui/material';
import { useRouter } from 'next/router';
import materialService from 'src/services/materialService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

const MaterialesPage = () => {
  const [materiales, setMateriales] = useState([]);
  const [filteredMateriales, setFilteredMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const router = useRouter();

  const fetchMateriales = async () => {
    setLoading(true);
    const data = await materialService.getAllMateriales();
    setMateriales(data);
    setFilteredMateriales(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await materialService.deleteMaterialById(id);
      setAlert({ open: true, message: 'Material eliminado con éxito', severity: 'success' });
      fetchMateriales();
    } catch {
      setAlert({ open: true, message: 'Error al eliminar el material', severity: 'error' });
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = materiales.filter((m) =>
      `${m.nombre} ${m.SKU}`.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredMateriales(filtered);
  };

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  useEffect(() => {
    fetchMateriales();
  }, []);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Materiales
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <TextField
          label="Buscar por nombre o SKU"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          size="small"
          sx={{ width: 300 }}
        />
        <Button variant="contained" color="primary" onClick={() => router.push('/materiales/nuevo')}>
          Crear nuevo material
        </Button>
      </Box>

      {loading ? (
        <CircularProgress sx={{ mt: 3 }} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Rubro</TableCell>
              <TableCell>Zona</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMateriales.map((material) => (
              <TableRow key={material.id}>
                <TableCell>{material.nombre}</TableCell>
                <TableCell>{material.SKU}</TableCell>
                <TableCell>{material.marca}</TableCell>
                <TableCell>{material.producto}</TableCell>
                <TableCell>{material.rubro}</TableCell>
                <TableCell>{material.zona}</TableCell>
                <TableCell>
                  <Button onClick={() => router.push(`/materiales/${material.id}`)}>Editar</Button>
                  <Button color="error" onClick={() => handleDelete(material.id)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

MaterialesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MaterialesPage;
