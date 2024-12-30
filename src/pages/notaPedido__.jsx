import { useState, useEffect } from 'react';
import { Box, Container, Stack, Typography, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
// import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuthContext } from 'src/contexts/auth-context';
import notaPedidoService from 'src/services/notaPedidoService';
import profileService from 'src/services/profileService';
import NotasTable from 'src/components/notasTable';
// import NotasCardList from './NotasCardList';
import NotasForm from 'src/components/notasForm';
import DeleteConfirmationDialog from 'src/components/deleteConfirmationDialog';
import FiltersBar from 'src/components/filtersBar';
import Alerts from 'src/components/alerts';

const NotaPedidoPage = () => {
  const { user } = useAuthContext();
  const [notas, setNotas] = useState([]);
  const [filteredNotas, setFilteredNotas] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [filters, setFilters] = useState({ text: '', estado: '' });


  const fetchProfiles = async () => {
    try {
      const profilesData = await profileService.getProfileByEmpresa(user.empresa.id);
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error al obtener perfiles:', error);
    }
  };

  const fetchNotas = async () => {
    try {
      const notasData = await notaPedidoService.getNotasByEmpresa(user.empresa.id);
      setNotas(notasData);
      setFilteredNotas(notasData);
    } catch (error) {
      console.error('Error al obtener notas:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchNotas();
    }
  }, [user]);

  const handleFilterChange = (updatedFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...updatedFilters,
    }));
  };
  

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Notas de Pedido</Typography>
        </Stack>
        <FiltersBar
            notas={notas}
            filters={filters}
            onFiltersChange={handleFilterChange}
            resetFilters={() => setFilters({ text: '', estado: '' })}
        />
        {/** Aquí decides entre mostrar `NotasTable` o `NotasCardList` según `isMobile` */}
        <NotasTable
          filteredNotas={filteredNotas}
          onEdit={() => {}}
          onDelete={() => {}}
          onChangeEstado={() => {}}
        />
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setOpenAddDialog(true)}
          sx={{ position: 'fixed', bottom: 96, right: 16 }}
        >
          <AddIcon />
        </Fab>
        <NotasForm
          open={openAddDialog}
          onSubmit={() => {}}
          onCancel={() => setOpenAddDialog(false)}
          profiles={profiles}
        />
        <DeleteConfirmationDialog
          open={openDeleteDialog}
          nota={notaToDelete}
          onConfirm={() => {}}
          onCancel={() => setOpenDeleteDialog(false)}
        />
        <Alerts alert={alert} onClose={() => setAlert({ ...alert, open: false })} />
      </Container>
    </Box>
  );
};

export default NotaPedidoPage;
