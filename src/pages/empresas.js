import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Snackbar, Alert, TextField, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, LinearProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Head from 'next/head';
import Link from 'next/link';
import { getAllEmpresas, deleteEmpresa, getInfoToDeleteEmpresa } from 'src/services/empresaService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

const EmpresasListPage = () => {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]); // IDs de empresas seleccionadas
  const [infoToDelete, setInfoToDelete] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState('');

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const [filters, setFilters] = useState({
    nombre: '',
    tipo: '',
    proyectos: '',
  });

  useEffect(() => {
    async function fetchEmpresas() {
      try {
        setIsLoading(true);
        const empresasList = await getAllEmpresas();
        setEmpresas(empresasList);
        setFilteredEmpresas(empresasList);
      } catch (error) {
        setAlert({
          open: true,
          message: 'Error al cargar las empresas.',
          severity: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchEmpresas();
  }, []);

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (empresaId) => {
    setSelectedEmpresas((prevSelected) =>
      prevSelected.includes(empresaId)
        ? prevSelected.filter((id) => id !== empresaId)
        : [...prevSelected, empresaId]
    );
  };

  const handleOpenConfirmDialog = async () => {
    const info = await Promise.all(selectedEmpresas.map((id) => getInfoToDeleteEmpresa(id)));
    setInfoToDelete(info);
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setInfoToDelete(null);
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    setDeleteProgress('Comenzando a eliminar empresas seleccionadas...');

    for (let i = 0; i < selectedEmpresas.length; i++) {
      const empresaId = selectedEmpresas[i];
      setDeleteProgress(`Eliminando empresa ${i + 1} de ${selectedEmpresas.length}`);
      
      await deleteEmpresa(empresaId);
      setEmpresas((prevEmpresas) => prevEmpresas.filter((empresa) => empresa.id !== empresaId));
      setFilteredEmpresas((prevFiltered) => prevFiltered.filter((empresa) => empresa.id !== empresaId));

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Pausa de 1 segundo entre eliminaciones
    }

    setDeleteProgress('Todas las empresas seleccionadas han sido eliminadas.');
    setIsDeleting(false);
    setSelectedEmpresas([]);
    setConfirmDialogOpen(false);
    setAlert({ open: true, message: 'Empresas eliminadas con éxito', severity: 'success' });
  };

  useEffect(() => {
    const filtered = empresas.filter((empresa) => {
      const matchesNombre = empresa?.nombre?.toLowerCase().includes(filters.nombre.toLowerCase());
      const matchesTipo = empresa?.tipo?.toLowerCase().includes(filters.tipo.toLowerCase());
      const matchesProyectos = filters.proyectos
        ? empresa?.proyectosIds?.length === parseInt(filters.proyectos, 10)
        : true;

      return matchesNombre && matchesTipo && matchesProyectos;
    });

    setFilteredEmpresas(filtered);
  }, [filters, empresas]);

  return (
    <>
      <Head>
        <title>Listado de Empresas {filteredEmpresas.length}</title>
      </Head>
      <Container maxWidth="lg">
        <Box sx={{ py: 8 }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Listado de Empresas ({filteredEmpresas.length})
          </Typography>

          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              label="Buscar por nombre"
              variant="outlined"
              name="nombre"
              value={filters.nombre}
              onChange={handleFilterChange}
              fullWidth
            />
            <TextField
              label="Buscar por tipo"
              variant="outlined"
              name="tipo"
              value={filters.tipo}
              onChange={handleFilterChange}
              fullWidth
            />
            <TextField
              label="Cantidad de proyectos"
              variant="outlined"
              name="proyectos"
              value={filters.proyectos}
              onChange={handleFilterChange}
              type="number"
              fullWidth
            />
          </Box>

          {isLoading ? (
            <CircularProgress />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedEmpresas.length > 0 && selectedEmpresas.length < filteredEmpresas.length}
                        checked={filteredEmpresas.length > 0 && selectedEmpresas.length === filteredEmpresas.length}
                        onChange={(e) => setSelectedEmpresas(e.target.checked ? filteredEmpresas.map((emp) => emp.id) : [])}
                      />
                    </TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cantidad de Proyectos</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmpresas.map((empresa) => (
                    <TableRow key={empresa.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedEmpresas.includes(empresa.id)}
                          onChange={() => handleCheckboxChange(empresa.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/empresa/?empresaId=${empresa.id}`} passHref>
                          <Typography variant="body1" component="a" sx={{ textDecoration: 'underline', color: 'primary.main' }}>
                            {empresa.nombre}
                          </Typography>
                        </Link>
                      </TableCell>
                      <TableCell>{empresa.tipo}</TableCell>
                      <TableCell>{empresa.proyectosIds?.length || 0}</TableCell>
                      <TableCell align="right">
                        <IconButton color="secondary" onClick={() => handleCheckboxChange(empresa.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Button
            color="secondary"
            variant="contained"
            onClick={handleOpenConfirmDialog}
            disabled={selectedEmpresas.length === 0}
            sx={{ mt: 4 }}
          >
            Borrar Empresas Seleccionadas
          </Button>

          <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
            <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
              {alert.message}
            </Alert>
          </Snackbar>

          {/* Dialog de confirmación */}
          <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog}>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogContent>
              {infoToDelete ? (
                <>
                  <DialogContentText>Empresas a eliminar:</DialogContentText>
                  {infoToDelete.map((info, index) => (
                    <Box key={index} sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="h6">{`Empresa: ${info.nombre}`}</Typography>
                      <Box ml={2}>
                        <Typography variant="body2" fontWeight="bold">Perfiles:</Typography>
                        {info.profiles.map((profile, i) => (
                          <Typography key={i} variant="body2" ml={2}>
                            Email: {profile.email}, Teléfono: {profile.phone}
                          </Typography>
                        ))}
                        <Typography variant="body2" fontWeight="bold" mt={1}>Proyectos:</Typography>
                        {info.proyectos?.map((proyecto, i) => (
                          <Typography key={i} variant="body2" ml={2}>
                            Nombre: {proyecto.nombre}, Movimientos: {proyecto.movimientosCount}, Último: {proyecto.fechaUltimoMovimiento}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </>
              ) : (
                <CircularProgress />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfirmDialog} color="primary">Cancelar</Button>
              <Button onClick={handleDeleteSelected} color="secondary" disabled={isDeleting}>
                Confirmar Eliminación
              </Button>
            </DialogActions>
          </Dialog>

          {/* Progreso de eliminación */}
          {isDeleting && (
            <Box mt={2}>
              <Typography>{deleteProgress}</Typography>
              <LinearProgress />
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
};

EmpresasListPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EmpresasListPage;
