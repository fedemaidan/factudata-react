import { useState, useEffect, useRef } from 'react';
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
import { formatTimestamp } from 'src/utils/formatters';
import { Timestamp } from 'firebase/firestore';
import { Router } from 'react-router-dom';
import { useRouter } from 'next/router';

const NotaPedidoPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [notas, setNotas] = useState([]);
  const [filteredNotas, setFilteredNotas] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openFilters, setOpenFilters] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false); // Estado para añadir nota
  const [newNoteData, setNewNoteData] = useState({ descripcion: '', proyecto_id: '', proveedor: '' }); // Datos de nueva nota
  const [currentNota, setCurrentNota] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [notasEstados, setNotasEstados] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'fechaCreacion', direction: 'desc' });
  const [comentariosDialogNota, setComentariosDialogNota] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const nuevoComentarioRef = useRef();

const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  const [comentariosCargando, setComentariosCargando] = useState(false);
  const [comentarioEditandoIdx, setComentarioEditandoIdx] = useState(null);
  const [comentarioEditadoTexto, setComentarioEditadoTexto] = useState('');

  

  const [formData, setFormData] = useState({
    descripcion: '', proyecto_id: '', estado: '', owner: '', creador: '', proveedor: ''
  });
  const [filters, setFilters] = useState({ text: '', estado: '', proyecto_id: '', proveedor: '' });
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  
  const sortedNotas = [...filteredNotas].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0; // Evitar errores con valores nulos
  
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
  
    // Si es una fecha, convertir a timestamp
    if (sortConfig.key === 'fechaCreacion') {
      aValue = aValue._seconds || 0;
      bValue = bValue._seconds || 0;
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
  
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  
  const handleGuardarComentarioEditado = async (idx) => {
    if (!comentarioEditadoTexto.trim() || !comentariosDialogNota) return;
  
    const comentariosActualizados = [...comentariosDialogNota.comentarios];
    comentariosActualizados[idx].texto = comentarioEditadoTexto.trim();
  
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
    try {
      await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaActualizada : n))
      );
      setComentariosDialogNota(notaActualizada);
      setComentarioEditandoIdx(null);
      setComentarioEditadoTexto('');
      setAlert({ open: true, message: 'Comentario editado', severity: 'success' });
    } catch (error) {
      console.error('Error al editar comentario:', error);
      setAlert({ open: true, message: 'Error al editar comentario', severity: 'error' });
    }
  };

  const handleEliminarComentario = async (idx) => {
    if (!comentariosDialogNota) return;
  
    const comentariosActualizados = [...comentariosDialogNota.comentarios];
    comentariosActualizados.splice(idx, 1);
  
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
    try {
      await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaActualizada : n))
      );
      setComentariosDialogNota(notaActualizada);
      setAlert({ open: true, message: 'Comentario eliminado', severity: 'success' });
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      setAlert({ open: true, message: 'Error al eliminar comentario', severity: 'error' });
    }
  };

  
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
    const fetchEmpresa = async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const notasEstados = empresa.notas_estados || ["Pendiente", "En proceso", "Completa"]
        setNotasEstados(notasEstados);
      } catch (error) {
        console.error('Error al obtener los estados de nota de pedido:', error);
      }
    };
  
    if (user) {
      fetchEmpresa();
    }
  }, [user]);

  const getEstadoSiguiente = (estado) => {
    const index = notasEstados.indexOf(estado);
    if (index === -1) return null;
    if (index === notasEstados.length - 1) return null;
    return notasEstados[index + 1]; 
  }
  
  const getEstadoColor = (index) => {
    let colors;
    switch (notasEstados.length) {
      case 0:
      case 1:
        return "default";
      case 2:
        colors = ["primary", "success"];
        break
      case 3:
        colors = ["warning", "primary", "success"];
        break;
      case 4:
        colors = ["warning", "info", "primary", "success"];
        break;
      case 5:
        colors = ["default", "warning", "info", "primary", "success"];
        break;
      default:
        return "default";
    }
    
    return colors[index % colors.length]; 
  };
  
  
  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchProyectos();
    }
  }, [user]);
  
  const handleAgregarComentario = async () => {
    const texto = nuevoComentarioRef.current.value.trim();
    if (!comentariosDialogNota || !texto) return;
  
    const nuevo = {
      texto,
      autor: `${user.firstName} ${user.lastName}`,
      fecha: Timestamp.fromDate(new Date()),
    };
  
    const comentariosActualizados = [...(comentariosDialogNota.comentarios || []), nuevo];
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
  
    try {
      setComentariosCargando(true);
      await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
  
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaActualizada : n))
      );
      setComentariosDialogNota(notaActualizada);
      nuevoComentarioRef.current.value = ''; // limpiás el input
      setAlert({ open: true, message: 'Comentario agregado con éxito', severity: 'success' });
    } catch (error) {
      console.error('Error al guardar comentario:', error);
      setAlert({ open: true, message: 'Error al agregar comentario', severity: 'error' });
    } finally {
      setComentariosCargando(false);
    }
  };
  

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
              nota.descripcion.toLowerCase().includes(filters.text.toLowerCase()) ||
              (nota.proveedor && nota.proveedor.toLowerCase().includes(filters.text.toLowerCase()))
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
    setFormData({ descripcion: nota.descripcion, estado: nota.estado, owner: nota.owner, creador: nota.creador, proyecto_id: nota.proyecto_id, proveedor: nota.proveedor });
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
        estado: notasEstados[0],
        empresaId: user.empresa.id,
        creador: user.id,
        creador_name: user.firstName + " " + user.lastName,
        proyecto_id: newNoteData.proyecto_id,
        proyecto_nombre: proyectoObj.nombre,
        proveedor: newNoteData.proveedor || '',
      };
      
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
    const index = notasEstados.indexOf(nota.estado);
    if (index === -1) return;
    if (index === notasEstados.length - 1) return;

    const nuevoEstado = notasEstados[index + 1];
  
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
          <Typography variant="h6">Notas de Pedido {filters.estado}</Typography>
        </Stack>

        <Stack
  direction={isMobile ? 'column' : 'row'}
  spacing={2}
  alignItems={isMobile ? 'center' : 'flex-start'}
  mb={3}
>
  
  {isMobile ? (
    <ButtonGroup variant="text" color="primary" orientation="horizontal">
      {notasEstados.map((estado, index) => (
        <Button
          key={estado}
          variant={filters.estado === estado ? 'contained' : 'outlined'}
          startIcon={
            <Chip
              label={notas.filter((n) => n.estado === estado).length}
              color={getEstadoColor(index)}
            />
          }
          onClick={() => setEstado(estado)}
        >
          {estado.substr(0, 1)}
        </Button>
  ))}
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
    <Stack direction="row" spacing={1}>
  {notasEstados.map((estado, index) => (
    <Button
      key={estado}
      variant={filters.estado === estado ? 'contained' : 'outlined'}
      startIcon={
        <Chip
          label={notas.filter((n) => n.estado === estado).length}
          color={getEstadoColor(index)}
        />
      }
      onClick={() => setEstado(estado)}
    >
      {estado}
    </Button>
  ))}
  <Button
    variant={filters.estado === '' ? 'contained' : 'outlined'}
    startIcon={<Chip label={notas.length} color="default" />}
    onClick={() => setEstado('')}
  >
    Todos
  </Button>
</Stack>


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
                  <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line' }}>
                  {nota.descripcion}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Responsable: {nota.owner_name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Creado el: {formatTimestamp(nota.fechaCreacion)} por {nota.creador_name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Proveedor: {nota.proveedor}
                  </Typography>
                  <Chip
                    label={nota.estado}
                    color={
                      getEstadoColor(notasEstados.indexOf(nota.estado))
                    }
                    sx={{ mt: 1 }}
                  />
                  {nota.notaUrl && nota.notaUrl.trim() !== '' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => window.open(nota.notaUrl, '_blank')}
                    >
                      Ver adjunto
                    </Button>
                  )}
                  <Stack direction="row" spacing={1} mt={2}>
                  {getEstadoSiguiente(nota.estado) && (<Button
                        variant="outlined"
                        color={getEstadoColor(notasEstados.indexOf(nota.estado)+1)}
                        onClick={() => handleChangeEstado(nota)}
                      >
                        Macar en {getEstadoSiguiente(nota.estado)}
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
                <TableCell onClick={() => handleSort('codigo')}>Código
                {sortConfig.key === 'codigo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('proyecto_nombre')}>Proyecto
                {sortConfig.key === 'proyecto_nombre' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('proveedor')}>Proveedor
                {sortConfig.key === 'proveedor' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('owner_name')}>Responsable
                {sortConfig.key === 'owner_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('creador_name')}>Creador
                {sortConfig.key === 'creador_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('descripcion')}>Descripción  
                {sortConfig.key === 'descripcion' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('estado')}>Estado
                  {sortConfig.key === 'estado' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell onClick={() => handleSort('fechaCreacion')}>
                  Fecha Creación {sortConfig.key === 'fechaCreacion' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedNotas.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell>{nota.codigo}</TableCell>
                  <TableCell>{nota.proyecto_nombre}</TableCell>
                  <TableCell>{nota.proveedor}</TableCell>
                  <TableCell>{nota.owner_name}</TableCell>
                  <TableCell>{nota.creador_name}</TableCell>
                  <TableCell>
                    {nota.descripcion?.split('\n').map((item, index) => (
                      ( item.trim() !== '' && (
                          <Typography key={index} variant="body2" sx={{ display: 'block' }}>
                          {item.trim()}
                          </Typography>
                        )
                      )
                    ))}
                    {nota.urlNota && nota.urlNota.trim() !== '' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => window.open(nota.urlNota, '_blank')}
                      >
                        Ver adjunto
                      </Button>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={nota.estado}
                      color={
                        getEstadoColor(notasEstados.indexOf(nota.estado))
                      }
                    />
                  </TableCell>
                  <TableCell>{formatTimestamp(nota.fechaCreacion)}</TableCell>
                  <TableCell>
                      {notasEstados.indexOf(nota.estado) !== (notasEstados.length - 1) && (
                      <Button
                        variant="outlined"
                        color={getEstadoColor(notasEstados.indexOf(nota.estado)+1)}
                        onClick={() => handleChangeEstado(nota)}
                      >
                        Macar en {getEstadoSiguiente(nota.estado)}
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
                      <Button
  variant="text"
  onClick={() => setComentariosDialogNota(nota)}
>
  Ver comentarios ({nota.comentarios?.length || 0})
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
      <TextField
        label="Proveedor"
        value={formData.proveedor}
        onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Estado</InputLabel>
        <Select
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
        >
          {notasEstados.map((estado) => (
            <MenuItem key={estado} value={estado}>
              {estado}
            </MenuItem>
          ))}
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
      <TextField
        label="Proveedor"
        value={newNoteData.proveedor}
        onChange={(e) => setNewNoteData({ ...newNoteData, proveedor: e.target.value })}
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
<Dialog
  open={!!comentariosDialogNota}
  onClose={() => setComentariosDialogNota(null)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Comentarios de la Nota {comentariosDialogNota?.codigo}</DialogTitle>
  <DialogContent>
  {comentariosDialogNota?.comentarios?.length > 0 ? (
    <Stack spacing={2}>
      {comentariosDialogNota.comentarios.map((comentario, idx) => (
  <Box key={idx} sx={{ p: 1, borderBottom: '1px solid #ddd' }}>
    <Typography variant="body2">
      <strong>{formatTimestamp(comentario.fecha)}</strong> 
    </Typography>
      {
        comentario.texto && <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{comentario.autor}: {comentario.texto}</Typography>
      }

    {comentarioEditandoIdx === idx ? (
      <>
        <TextField
          fullWidth
          multiline
          value={comentarioEditadoTexto}
          onChange={(e) => setComentarioEditadoTexto(e.target.value)}
          rows={2}
          sx={{ mt: 1 }}
        />
        <Stack direction="row" spacing={1} mt={1}>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleGuardarComentarioEditado(idx)}
          >
            Guardar
          </Button>
          <Button
            size="small"
            onClick={() => {
              setComentarioEditandoIdx(null);
              setComentarioEditadoTexto('');
            }}
          >
            Cancelar
          </Button>
        </Stack>
      </>
    ) : (
      <>
         <Stack direction="row" spacing={1} mt={1}>
         {comentario.texto &&  <Button size="small" onClick={() => {
            setComentarioEditandoIdx(idx);
            setComentarioEditadoTexto(comentario.texto);
          }}>
            Editar
          </Button>}
          {
          comentario.url && <Button size="small" variant='contained' onClick={() => window.open(comentario.url, '_blank')}>Ver archivo</Button>
        }
          <Button size="small" color="error" onClick={() => handleEliminarComentario(idx)}>
            Eliminar
          </Button>
        </Stack>
      </>
    )}
  </Box>
))}

    </Stack>
  ) : (
    <Typography variant="body2">No hay comentarios aún.</Typography>
  )}

<Box mt={3}>
  <TextField
    label="Nuevo comentario"
    multiline
    rows={3}
    fullWidth
    // value={nuevoComentario}
    // onChange={(e) => setNuevoComentario(e.target.value)}
    inputRef={nuevoComentarioRef}

  />


<Button
  variant="contained"
  onClick={handleAgregarComentario}
  sx={{ mt: 2 }}
  // disabled={!nuevoComentarioRef.current?.value?.trim()}
>
  {comentariosCargando ? 'Guardando...' : 'Agregar comentario'}
</Button>



  <Stack direction="row" spacing={2} alignItems="center" mt={2}>
    <Button
      variant="outlined"
      component="label"
    >
      Seleccionar archivo
      <input
        type="file"
        hidden
        onChange={(e) => setArchivoSeleccionado(e.target.files[0])}
      />
    </Button>
    <Typography variant="body2">
      {archivoSeleccionado?.name || 'Ningún archivo seleccionado'}
    </Typography>
  </Stack>

  <Button
    variant="contained"
    onClick={async () => {
      if (!comentariosDialogNota || !archivoSeleccionado) return;
      try {
        const nota = await notaPedidoService.subirArchivo(comentariosDialogNota.id, archivoSeleccionado);
        if (nota) {
          setNotas(notas.map((n) => (n.id === nota.id ? nota : n)));
          setComentariosDialogNota(nota);
          setAlert({ open: true, message: 'Archivo subido con éxito', severity: 'success' });
        } else {
          setAlert({ open: true, message: 'Error al subir archivo', severity: 'error' });
        }
        setArchivoSeleccionado(null); // reset
      } catch (error) {
        console.error('Error subiendo archivo:', error);
        setAlert({ open: true, message: 'Error al subir archivo', severity: 'error' });
      }
    }}
    disabled={!archivoSeleccionado}
    sx={{ mt: 1 }}
  >
    Subir archivo
  </Button>
</Box>

</DialogContent>

<DialogActions>
  <Button onClick={() => setComentariosDialogNota(null)}>Cerrar</Button>
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
                  {notasEstados.map((estado) => (
                    <MenuItem key={estado} value={estado}>
                      {estado}
                    </MenuItem>
                  ))}
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
