import { useState, useEffect, useMemo } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Box, IconButton, Chip, Button, TextField, InputAdornment } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import TableComponent from 'src/components/TableComponent';
import TrabajadorService from 'src/services/dhn/TrabajadorService';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import AgregarTrabajadorModal from 'src/components/dhn/AgregarTrabajadorModal';
import EditarTrabajadorModal from 'src/components/dhn/EditarTrabajadorModal';

const TrabajadoresPage = () => {
  const router = useRouter();
  const [trabajadores, setTrabajadores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarTrabajadores();
  }, []);

  const cargarTrabajadores = async () => {
    try {
      setIsLoading(true);
      const data = await TrabajadorService.getAll();
      setTrabajadores(data.data);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (trabajador) => {
    setTrabajadorSeleccionado(trabajador);
    setEditarModalOpen(true);
  };

  const handleRowClick = (trabajador) => {
    router.push(`/dhn/trabajador/${trabajador._id}`);
  };

  const handleSaveNew = async () => {
    try {
      await cargarTrabajadores();
    } catch (error) {
      console.error('Error al recargar trabajadores:', error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await cargarTrabajadores(); 
    } catch (error) {
      console.error('Error al recargar trabajadores:', error);
    }
  };

  const columns = [
    {
      key: 'trabajador',
      label: 'Trabajador',
      sortable: true,
      render: (item) => `${item.nombre || ''} ${item.apellido || ''}`.trim() || '-'
    },
    {
      key: 'dni',
      label: 'DNI',
      sortable: true,
      render: (item) => item.dni ? item.dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '-'
    },
    {
      key: 'active',
      label: 'Activo',
      sortable: true,
      render: (item) => (
        <Chip 
          label={item.active ? 'Sí' : 'No'} 
          color={item.active ? 'success' : 'default'}
          size="small"
        />
      )
    },
    {
      key: 'desde',
      label: 'Desde',
      sortable: true,
      render: (item) => item.desde ? format(new Date(item.desde), 'dd/MM/yyyy') : '-'
    },
    {
      key: 'hasta',
      label: 'Hasta',
      sortable: true,
      render: (item) => item.hasta ? format(new Date(item.hasta), 'dd/MM/yyyy') : '-'
    },
    {
      key: 'acciones',
      label: 'Acciones',
      sortable: false,
      render: (item) => (
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(item);
          }}
          color="primary"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )
    }
  ];

  const trabajadoresFiltrados = useMemo(() => {
    const term = (busqueda || "").toString().trim().toLowerCase();
    if (!term) return trabajadores;
    return (trabajadores || []).filter((t) => {
      const nombre = (t?.nombre || "").toString().toLowerCase();
      const apellido = (t?.apellido || "").toString().toLowerCase();
      const dni = (t?.dni || "").toString().replace(/\./g, "").toLowerCase();
      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        `${nombre} ${apellido}`.includes(term) ||
        `${apellido} ${nombre}`.includes(term) ||
        dni.includes(term)
      );
    });
  }, [trabajadores, busqueda]);

  return (
    <DashboardLayout title="Trabajadores">
      <Box sx={{ px: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Buscar"
            size="small"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            sx={{ width: 200 }}
            InputProps={{
              endAdornment: busqueda.length > 0 && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setBusqueda("")}
                    edge="end"
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAgregarModalOpen(true)}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              boxShadow: 2,
              '&:hover': { boxShadow: 4 },
            }}
          >
            Agregar Trabajador
          </Button>
        </Box>

        <TableComponent
          data={trabajadoresFiltrados}
          columns={columns}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </Box>

      <AgregarTrabajadorModal
        open={agregarModalOpen}
        onClose={() => setAgregarModalOpen(false)}
        onSave={handleSaveNew}
      />

      <EditarTrabajadorModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        onSave={handleSaveEdit}
        trabajador={trabajadorSeleccionado}
      />
    </DashboardLayout>
  );
};

export default TrabajadoresPage;