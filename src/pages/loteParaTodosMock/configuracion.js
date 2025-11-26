// src/pages/loteParaTodosMock/configuracion.js
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import LoteParaTodosLayout from '../../components/layouts/LoteParaTodosLayout';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ConfiguracionPage() {
  const [tabActivo, setTabActivo] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [plantillaEditando, setPlantillaEditando] = useState(null);
  const [plantillas, setPlantillas] = useState([
    {
      id: 1,
      nombre: 'Contrato de Compraventa',
      tipo: 'contrato',
      descripcion: 'Plantilla estándar de contrato de compraventa de lote',
      emprendimientos: [1, 2, 3],
      activo: true,
      fecha_creacion: '2024-01-15',
      url: '/plantillas/contrato-compraventa.docx'
    },
    {
      id: 2,
      nombre: 'Boleto de Reserva',
      tipo: 'boleto',
      descripcion: 'Boleto de reserva temporal del lote',
      emprendimientos: [1, 2],
      activo: true,
      fecha_creacion: '2024-01-15',
      url: '/plantillas/boleto-reserva.docx'
    },
    {
      id: 3,
      nombre: 'Cronograma de Pagos',
      tipo: 'cronograma',
      descripcion: 'Detalle del plan de pagos acordado',
      emprendimientos: [1, 2, 3, 4],
      activo: true,
      fecha_creacion: '2024-02-10',
      url: '/plantillas/cronograma-pagos.xlsx'
    }
  ]);

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'contrato',
    descripcion: '',
    emprendimientos: [],
    activo: true,
    url: ''
  });

  const tiposPlantilla = [
    { value: 'contrato', label: 'Contrato de Compraventa' },
    { value: 'boleto', label: 'Boleto de Reserva' },
    { value: 'cronograma', label: 'Cronograma de Pagos' },
    { value: 'recibo', label: 'Recibo de Pago' },
    { value: 'escritura', label: 'Escritura' },
    { value: 'otro', label: 'Otro Documento' }
  ];

  const abrirDialogNueva = () => {
    setPlantillaEditando(null);
    setFormData({
      nombre: '',
      tipo: 'contrato',
      descripcion: '',
      emprendimientos: [],
      activo: true,
      url: ''
    });
    setOpenDialog(true);
  };

  const abrirDialogEditar = (plantilla) => {
    setPlantillaEditando(plantilla);
    setFormData({ ...plantilla });
    setOpenDialog(true);
  };

  const cerrarDialog = () => {
    setOpenDialog(false);
    setPlantillaEditando(null);
  };

  const guardarPlantilla = () => {
    if (plantillaEditando) {
      // Editar existente
      setPlantillas(plantillas.map(p => 
        p.id === plantillaEditando.id ? { ...formData, id: p.id } : p
      ));
    } else {
      // Nueva plantilla
      const nuevaPlantilla = {
        ...formData,
        id: Math.max(...plantillas.map(p => p.id)) + 1,
        fecha_creacion: new Date().toISOString().split('T')[0]
      };
      setPlantillas([...plantillas, nuevaPlantilla]);
    }
    cerrarDialog();
  };

  const eliminarPlantilla = (id) => {
    if (confirm('¿Está seguro de eliminar esta plantilla?')) {
      setPlantillas(plantillas.filter(p => p.id !== id));
    }
  };

  const duplicarPlantilla = (plantilla) => {
    const nuevaPlantilla = {
      ...plantilla,
      id: Math.max(...plantillas.map(p => p.id)) + 1,
      nombre: `${plantilla.nombre} (Copia)`,
      fecha_creacion: new Date().toISOString().split('T')[0]
    };
    setPlantillas([...plantillas, nuevaPlantilla]);
  };

  return (
    <LoteParaTodosLayout currentModule="configuracion" pageTitle="Plantillas de Documentos">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Plantillas de Documentos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administre las plantillas de documentos del sistema que se utilizarán para generar contratos, boletos y otros documentos
        </Typography>
      </Box>

      <Card>
        <TabPanel value={tabActivo} index={0}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={abrirDialogNueva}
              >
                Nueva Plantilla
              </Button>
            </Box>

            <Alert severity="info">
              Las plantillas se pueden asociar a múltiples emprendimientos. Configure las variables de fusión según sus necesidades.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Nombre</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell><strong>Descripción</strong></TableCell>
                    <TableCell><strong>Emprendimientos</strong></TableCell>
                    <TableCell><strong>Estado</strong></TableCell>
                    <TableCell align="right"><strong>Acciones</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plantillas.map((plantilla) => (
                    <TableRow key={plantilla.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {plantilla.nombre}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={tiposPlantilla.find(t => t.value === plantilla.tipo)?.label || plantilla.tipo}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {plantilla.descripcion}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${plantilla.emprendimientos.length} emprendimientos`}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={plantilla.activo ? 'Activa' : 'Inactiva'}
                          color={plantilla.activo ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Vista previa">
                            <IconButton size="small" onClick={() => alert('Función de vista previa en desarrollo')}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => abrirDialogEditar(plantilla)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Duplicar">
                            <IconButton size="small" onClick={() => duplicarPlantilla(plantilla)}>
                              <FileCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => eliminarPlantilla(plantilla.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </TabPanel>
      </Card>

      {/* Dialog para crear/editar plantilla */}
      <Dialog open={openDialog} onClose={cerrarDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {plantillaEditando ? 'Editar Plantilla' : 'Nueva Plantilla de Documento'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre de la Plantilla"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />

            <TextField
              select
              fullWidth
              label="Tipo de Documento"
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              required
            >
              {tiposPlantilla.map((tipo) => (
                <MenuItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              helperText="Descripción breve de la plantilla y su uso"
            />

            <TextField
              fullWidth
              label="URL de la Plantilla"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              helperText="Ruta donde se encuentra almacenado el archivo de plantilla"
            />

            <Alert severity="info">
              <strong>Variables disponibles:</strong> {'{'}nombre_cliente{'}'}, {'{'}dni{'}'}, {'{'}lote_numero{'}'}, {'{'}manzana{'}'}, {'{'}precio_acordado{'}'}, {'{'}fecha_contrato{'}'}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={guardarPlantilla}
            disabled={!formData.nombre || !formData.tipo}
          >
            {plantillaEditando ? 'Guardar Cambios' : 'Crear Plantilla'}
          </Button>
        </DialogActions>
      </Dialog>
    </LoteParaTodosLayout>
  );
}
