import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  Fab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';
import notaPedidoService from 'src/services/notaPedidoService';
import { useAuthContext } from 'src/contexts/auth-context';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import DeleteIcon from '@mui/icons-material/Delete';
import profileService from 'src/services/profileService';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCallback } from 'react';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';


const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp._seconds * 1000);
  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const day = `0${date.getDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
};

const NotaPedidoPage = () => {
  const { user } = useAuthContext();
  const [notas, setNotas] = useState([]);
  const [filteredNotas, setFilteredNotas] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openFilters, setOpenFilters] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false); // Estado para añadir nota
  const [newNoteData, setNewNoteData] = useState({ descripcion: '', proyecto_id: '' }); // Datos de nueva nota
  const [currentNota, setCurrentNota] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [proyectos, setProyectos] = useState([]);


  const [formData, setFormData] = useState({
    descripcion: '', proyecto_id: '', estado: '', owner: '', creador: '',
  });
  const [filters, setFilters] = useState({ text: '', estado: '', proyecto_id: '' });
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
 
  const fetchProfiles = async () => {
    try {
      const profilesData = await profileService.getProfileByEmpresa(user.empresa.id);
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error al obtener perfiles:', error);
    }
  };

  const fetchProyectos = useCallback(async () => {
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const proyectosData = await getProyectosByEmpresa(empresa);
      console.log(proyectosData)
      setProyectos(proyectosData);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
    }
  }, [user?.empresa?.id]);
  
  
  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchProyectos();
    }
  }, [user]);
  
  const fetchNotas = useCallback(async () => {
    try {
      const notasData = await notaPedidoService.getNotasByEmpresa(user.empresa.id);
      setNotas(notasData);
      setFilteredNotas(notasData);

    } catch (error) {
      console.error('Error al obtener notas:', error);
    }
  }, [user?.empresa?.id]);
  

  const applyFilters = () => {
    let filtered = notas;
    if (filters.text) {
      filtered = filtered.filter(
        (nota) =>
          nota.descripcion.toLowerCase().includes(filters.text.toLowerCase())
      );
    }

    if (filters.estado) {
      filtered = filtered.filter((nota) => nota.estado === filters.estado);
    }

    if (filters.proyecto_id) {
      filtered = filtered.filter((nota) => nota.proyecto_id === filters.proyecto_id);
    }
  
    setFilteredNotas(filtered);
  };

  const setEstado = (estado) => {
    if (estado === filters.estado) {
      setFilters({ ...filters, estado: '' });
    } else {
      setFilters({ ...filters, estado });
    }
  };

  const handleEdit = (nota) => {
    setCurrentNota(nota);
    setFormData({ descripcion: nota.descripcion, estado: nota.estado, owner: nota.owner, creador: nota.creador, proyecto_id: nota.proyecto_id });
    setIsEditing(true);
  };

  const handleSaveNewNote = async () => {
    try {
      const ownerObj = profiles.filter( (p) => p.id === newNoteData.owner)[0]
      const proyectoObj = proyectos.filter( (p) => p.id === newNoteData.proyecto_id)[0]
      const newNote = {
        ...newNoteData,
        owner: newNoteData.owner || user.id,
        owner_name: ownerObj.firstName + " " + ownerObj.lastName,
        estado: 'Pendiente',
        empresaId: user.empresa.id,
        creador: user.id,
        creador_name: user.firstName + " " + user.lastName,
        proyecto_id: newNoteData.proyecto_id,
        proyecto_nombre: proyectoObj.nombre,
      };
      console.log(newNote)
      const savedNote = await notaPedidoService.createNota(newNote);
      setNotas([savedNote, ...notas]);
      setAlert({ open: true, message: 'Nota añadida con éxito', severity: 'success' });
      setOpenAddDialog(false);
      setNewNoteData({  descripcion: '' }); // Reiniciar formulario
    } catch (error) {
      console.error('Error al añadir nota:', error);
      setAlert({ open: true, message: 'Error al añadir la nota', severity: 'error' });
    }
  };
  
  const openDeleteConfirmation = (nota) => {
    setNotaToDelete(nota);
    setOpenDeleteDialog(true);
  };
  
  const closeDeleteConfirmation = () => {
    setNotaToDelete(null);
    setOpenDeleteDialog(false);
  };
  

  const handleSaveEdit = async () => {
    try {
      console.log("currentNota", currentNota)
      console.log("formData", formData)
      if (formData?.owner) {
        const ownerObj = profiles.filter( (p) => p.id === formData.owner)[0]
        formData.owner_name = ownerObj.firstName + " " + ownerObj.lastName
      }

      if (formData?.proyecto_id) {
        const proyectoObj = proyectos.filter( (p) => p.id === formData.proyecto_id)[0]
        formData.proyecto_nombre = proyectoObj.nombre
      }

      if (formData?.proyecto_id === '') {
        formData.proyecto_nombre = null;
        formData.proyecto_id = null;
      }

      const updatedNota = { ...currentNota, ...formData };
      console.log("updatedNota", updatedNota)
      
      const success = await notaPedidoService.updateNota(currentNota.id, updatedNota);
      if (success) {
        setNotas(notas.map((n) => (n.id === currentNota.id ? updatedNota : n)));
        setAlert({ open: true, message: 'Nota actualizada con éxito', severity: 'success' });
      } else {
        setAlert({ open: true, message: 'Error al actualizar la nota', severity: 'error' });
      }
      setIsEditing(false);
      setCurrentNota(null);
    } catch (error) {
      console.error('Error al actualizar la nota:', error);
      setAlert({ open: true, message: 'Error al actualizar la nota', severity: 'error' });
    }
  };

  const handleChangeEstado = async (nota) => {
    const nuevoEstado =
      nota.estado === 'Pendiente' ? 'En proceso' : nota.estado === 'En proceso' ? 'Completa' : null;
  
    if (!nuevoEstado) return; // Si ya está en "Completa", no cambiar más.
  
    try {
      const updatedNota = { ...nota, estado: nuevoEstado };
      const success = await notaPedidoService.updateNota(nota.id, updatedNota);
  
      if (success) {
        setNotas(notas.map((n) => (n.id === nota.id ? updatedNota : n)));
        setAlert({ open: true, message: `Estado cambiado a "${nuevoEstado}"`, severity: 'success' });
      } else {
        setAlert({ open: true, message: 'Error al cambiar el estado', severity: 'error' });
      }
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      setAlert({ open: true, message: 'Error al cambiar el estado', severity: 'error' });
    }
  };
  

  useEffect(() => {
    if (user) fetchNotas();
  }, [user, fetchNotas]);
  

  useEffect(() => {
    applyFilters();
  }, [filters, notas]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Notas de Pedido</Typography>
        </Stack>

        <Stack
  direction={isMobile ? 'column' : 'row'}
  spacing={2}
  alignItems={isMobile ? 'center' : 'flex-start'}
  mb={3}
>
  
  {isMobile ? (
    <ButtonGroup variant="text" color="primary" orientation="horizontal">
      <Button
        startIcon={<Chip label={notas.filter((n) => n.estado === 'Pendiente').length} color="warning" />}
        onClick={() => setEstado('Pendiente')}
        sx={{ fontSize: '0.8rem' }}
      >
        P
      </Button>
      <Button
        startIcon={<Chip label={notas.filter((n) => n.estado === 'En proceso').length} color="primary" />}
        onClick={() => setEstado('En proceso')}
        sx={{ fontSize: '0.8rem' }}
      >
        H
      </Button>
      <Button
        startIcon={<Chip label={notas.filter((n) => n.estado === 'Completa').length} color="success" />}
        onClick={() => setEstado('Completa')}
        sx={{ fontSize: '0.8rem' }}
      >
        C
      </Button>
      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={fetchNotas}
      ></Button>
    </ButtonGroup>
  ) : (
    <>
    
  <Box
    sx={{
      display: 'flex',
      gap: 2,
      alignItems: 'center',
      mb: 3,
      p: 2,
      backgroundColor: 'background.paper',
      borderRadius: 1,
      boxShadow: 1,
    }}
  >
    <FormControl size="small">
      <InputLabel>Proyecto</InputLabel>
      <Select
        value={filters.proyecto_id}
        onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })}
      >
        <MenuItem value="">Todos</MenuItem>
        {proyectos.map((proyecto) => (
          <MenuItem key={proyecto.id} value={proyecto.id}>
            {proyecto.nombre}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    <TextField
      label="Buscar por texto"
      value={filters.text}
      onChange={(e) => setFilters({ ...filters, text: e.target.value })}
      size="small"
    />
    <Button
        variant={filters.estado === 'Pendiente' ? 'contained' : 'outlined'}
        startIcon={<Chip label={notas.filter((n) => n.estado === 'Pendiente').length} color="warning" />}
        onClick={() => setEstado('Pendiente')}
        color="warning"
      >
        Pendiente
      </Button>
      <Button
        variant={filters.estado === 'En proceso' ? 'contained' : 'outlined'}
        startIcon={<Chip label={notas.filter((n) => n.estado === 'En proceso').length} color="primary" />}
        onClick={() => setEstado('En proceso')}
        color="primary"
      >
        En proceso
      </Button>
      <Button
        variant={filters.estado === 'Completa' ? 'contained' : 'outlined'}
        startIcon={<Chip label={notas.filter((n) => n.estado === 'Completa').length} color="success" />}
        onClick={() => setEstado('Completa')}
        color="success"
      >
        Completa
      </Button>
      <Button
        variant={filters.estado === '' ? 'contained' : 'outlined'}
        startIcon={<Chip label={notas.length} color="default" />}
        onClick={() => setEstado('')}
      >
        Todos
      </Button>
    <Button
      variant="contained"
      startIcon={<RefreshIcon />}
      onClick={fetchNotas}
    >
      Actualizar
    </Button>
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={setOpenAddDialog}
    >
      Agregar nota
    </Button>
  </Box>
    </>
  )}
</Stack>


        {isMobile ? (
          <Stack spacing={2}>
            {filteredNotas.map((nota) => (
              <Card key={nota.id}>
                <CardContent>
                  <Typography variant="h6">Código: {nota.codigo} - {nota.proyecto_nombre}</Typography>
                  <Typography variant="body2" color="textSecondary">
                  {nota.descripcion}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Responsable: {nota.owner_name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Creado el: {formatTimestamp(nota.fechaCreacion)} por {nota.creador_name}
                  </Typography>
                  <Chip
                    label={nota.estado}
                    color={
                      nota.estado === 'Pendiente'
                        ? 'warning'
                        : nota.estado === 'En proceso'
                        ? 'primary'
                        : 'success'
                    }
                    sx={{ mt: 1 }}
                  />
                  <Stack direction="row" spacing={1} mt={2}>
                  {nota.estado !== 'Completa' && (<Button
                        variant="outlined"
                        color={nota.estado === 'Pendiente' ? 'primary' : 'success'}
                        onClick={() => handleChangeEstado(nota)}
                      >
                        {nota.estado === 'Pendiente'
                          ? 'Marcar En proceso'
                          : 'Marcar Completa'
                          }
                      </Button>)}
                      <Button
                        startIcon={<EditIcon />}
                        color="secondary"
                        onClick={() => handleEdit(nota)}
                      >

                      </Button>
                      <Button
                        startIcon={<DeleteIcon />}
                        color="error"
                        onClick={() => openDeleteConfirmation(nota)}
                      >
                      </Button>

                    </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Proyecto</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell>Creador</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha Creación</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNotas.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell>{nota.codigo}</TableCell>
                  <TableCell>{nota.proyecto_nombre}</TableCell>
                  <TableCell>{nota.owner_name}</TableCell>
                  <TableCell>{nota.creador_name}</TableCell>
                  <TableCell>{nota.descripcion}</TableCell>
                  <TableCell>
                    <Chip
                      label={nota.estado}
                      color={
                        nota.estado === 'Pendiente'
                          ? 'warning'
                          : nota.estado === 'En proceso'
                          ? 'primary'
                          : 'success'
                      }
                    />
                  </TableCell>
                  <TableCell>{formatTimestamp(nota.fechaCreacion)}</TableCell>
                  <TableCell>
                      {nota.estado !== 'Completa' && (
                      <Button
                        variant="outlined"
                        color={nota.estado === 'Pendiente' ? 'primary' : 'success'}
                        onClick={() => handleChangeEstado(nota)}
                      >
                        {nota.estado === 'Pendiente'
                          ? 'Marcar En proceso'
                          : 'Marcar Completa'}
                      </Button>)}
                      <Button
                        startIcon={<EditIcon />}
                        color="secondary"
                        onClick={() => handleEdit(nota)}
                      >
                        Editar
                      </Button>
                      <Button
                        startIcon={<DeleteIcon />}
                        color="error"
                        onClick={() => openDeleteConfirmation(nota)}
                      >
                        Eliminar
                      </Button>

                    </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
  {isMobile && (
    <>
        <Fab
          color="primary"
          aria-label="filter"
          onClick={() => setOpenFilters(true)}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <FilterListIcon />
        </Fab>

        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setOpenAddDialog(true)}
          sx={{ position: 'fixed', bottom: 96, right: 16 }}
        >
          <AddIcon />
        </Fab>
        </>
  )}

        <Dialog open={isEditing} onClose={() => setIsEditing(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Editar Nota</DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <TextField
        label="Descripción"
        value={formData.descripcion}
        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
        multiline
        rows={3}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Estado</InputLabel>
        <Select
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
        >
          <MenuItem value="Pendiente">Pendiente</MenuItem>
          <MenuItem value="En proceso">En proceso</MenuItem>
          <MenuItem value="Completa">Completa</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
  <InputLabel>Asignar a</InputLabel>
  <Select
    value={formData.owner || ''}
    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
  >
    {profiles.map((profile) => (
      <MenuItem key={profile.id} value={profile.id}>
        {profile.firstName + " "+ profile.lastName}
      </MenuItem>
    ))}
  </Select>
</FormControl>
<FormControl fullWidth>
  <InputLabel>Proyecto</InputLabel>
  <Select
    value={formData.proyecto_id || ''}
    onChange={(e) => setFormData({ ...formData, proyecto_id: e.target.value })}
  >
    {proyectos.map((proyecto) => (
      <MenuItem key={proyecto.id} value={proyecto.id}>
        {proyecto.nombre}
      </MenuItem>
    ))}
    <MenuItem key='no-definido' value=''>
        No definido
      </MenuItem>
  </Select>
</FormControl>

    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setIsEditing(false)}>Cancelar</Button>
    <Button onClick={handleSaveEdit} variant="contained">
      Guardar Cambios
    </Button>
  </DialogActions>
</Dialog>

        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Añadir Nota</DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <TextField
        label="Descripción"
        value={newNoteData.descripcion}
        onChange={(e) => setNewNoteData({ ...newNoteData, descripcion: e.target.value })}
        multiline
        rows={3}
        fullWidth
      />
      <FormControl fullWidth>
  <InputLabel>Asignar a</InputLabel>
  <Select
    value={newNoteData.owner || ''}
    onChange={(e) => setNewNoteData({ ...newNoteData, owner: e.target.value })}
  >
    {profiles.map((profile) => (
      <MenuItem key={profile.id} value={profile.id}>
        {profile.firstName + " "+ profile.lastName}
      </MenuItem>
    ))}
  </Select>
</FormControl>
<FormControl fullWidth>
  <InputLabel>Proyecto</InputLabel>
  <Select
    value={newNoteData.proyecto_id}
    onChange={(e) => setNewNoteData({ ...newNoteData, proyecto_id: e.target.value })}
  >
    {proyectos.map((proyecto) => (
      <MenuItem key={proyecto.id} value={proyecto.id}>
        {proyecto.nombre}
      </MenuItem>
    ))}
  </Select>
</FormControl>


    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenAddDialog(false)}>Cancelar</Button>
    <Button onClick={handleSaveNewNote} variant="contained">
      Guardar
    </Button>
  </DialogActions>
</Dialog>

<Dialog open={openDeleteDialog} onClose={closeDeleteConfirmation}>
  <DialogTitle>Confirmar eliminación</DialogTitle>
  <DialogContent>
    <Typography>
      ¿Estás seguro de que deseas eliminar la nota con código <strong>&quot;{notaToDelete?.codigo}&quot;</strong>? Esta acción no se puede deshacer.
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={closeDeleteConfirmation}>Cancelar</Button>
    <Button
      color="error"
      variant="contained"
      onClick={async () => {
        try {
          const success = await notaPedidoService.deleteNota(notaToDelete.id);
          if (success) {
            setNotas(notas.filter((n) => n.id !== notaToDelete.id));
            setAlert({ open: true, message: 'Nota eliminada con éxito', severity: 'success' });
          } else {
            setAlert({ open: true, message: 'Error al eliminar la nota', severity: 'error' });
          }
        } catch (error) {
          console.error('Error al eliminar nota:', error);
          setAlert({ open: true, message: 'Error al eliminar la nota', severity: 'error' });
        }
        closeDeleteConfirmation();
      }}
    >
      Eliminar
    </Button>
  </DialogActions>
</Dialog>

        <Dialog open={openFilters} onClose={() => setOpenFilters(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Filtros</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                label="Buscar por texto"
                value={filters.text}
                onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.estado}
                  onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="Pendiente">Pendiente</MenuItem>
                  <MenuItem value="En proceso">En proceso</MenuItem>
                  <MenuItem value="Completa">Completa</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={filters.proyecto_id}
                  onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })}
                >
                  <MenuItem value="">No definido</MenuItem>
                    {proyectos.map((proyecto) => (
                      <MenuItem key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFilters(false)}>Cerrar</Button>
            <Button
              onClick={() => {
                applyFilters();
                setOpenFilters(false);
              }}
              variant="contained"
            >
              Aplicar
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

NotaPedidoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default NotaPedidoPage;
