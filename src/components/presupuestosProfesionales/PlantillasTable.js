import React from 'react';
import {
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { formatDate } from './constants';

const PlantillasTable = ({
  plantillas,
  plantillasLoading,
  sorbyRubrosCount,
  onImportarArchivo,
  onNuevaPlantilla,
  onDuplicarSorbyData,
  onEditarPlantilla,
  onDuplicarPlantilla,
  onEliminarPlantilla,
}) => {
  return (
    <>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Plantillas de rubros reutilizables para tus presupuestos.
          </Typography>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={onImportarArchivo}>
            Importar archivo
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevaPlantilla}>
            Nueva plantilla
          </Button>
        </Stack>
      </Paper>

      {plantillasLoading && <LinearProgress sx={{ mb: 1 }} />}

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="center">Rubros</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Creada</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  Plantilla SorbyData
                </Typography>
              </TableCell>
              <TableCell>—</TableCell>
              <TableCell align="center">{sorbyRubrosCount}</TableCell>
              <TableCell>
                <Chip label="Sistema" color="info" size="small" variant="outlined" />
              </TableCell>
              <TableCell>—</TableCell>
              <TableCell align="center">
                <Tooltip title="Duplicar como nuevo presupuesto">
                  <IconButton size="small" onClick={onDuplicarSorbyData}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>

            {plantillas.length === 0 && !plantillasLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No hay plantillas propias. Creá una, importá desde un archivo o usá Plantilla
                    SorbyData.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {plantillas.map((pl) => (
              <TableRow key={pl._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {pl.nombre}
                  </Typography>
                </TableCell>
                <TableCell>{pl.tipo || '—'}</TableCell>
                <TableCell align="center">{(pl.rubros || []).length}</TableCell>
                <TableCell>
                  <Chip
                    label={pl.activa ? 'Activa' : 'Inactiva'}
                    color={pl.activa ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(pl.createdAt)}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0} justifyContent="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => onEditarPlantilla(pl)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicar como nuevo presupuesto">
                      <IconButton size="small" onClick={() => onDuplicarPlantilla(pl)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => onEliminarPlantilla(pl)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
};

export default PlantillasTable;
