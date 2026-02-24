import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const statusTexts = {
  idle: 'Listo para importar.',
  uploading: 'Subiendo archivo...',
  analizando: 'Analizando con inteligencia artificial...',
  done: 'Listo para revisar la plantilla.',
};

const ImportarPlantillaDialog = ({
  open,
  onClose,
  importFile,
  onImportFileChange,
  onImport,
  loading,
  nombre,
  tipo,
  onNombreChange,
  onTipoChange,
  status = 'idle',
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Importar plantilla desde archivo</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Typography variant="body2">
          Subí un archivo Excel (.xlsx), PDF o imagen con rubros y tareas. El sistema intentará
          extraer la estructura automáticamente.
        </Typography>
        {status === 'done' && (
          <Stack spacing={1}>
            <TextField
              label="Nombre de plantilla"
              value={nombre}
              onChange={(e) => onNombreChange?.(e.target.value)}
              placeholder="Ej: Residencial estándar"
              fullWidth
            />
            <TextField
              label="Tipo (opcional)"
              value={tipo}
              onChange={(e) => onTipoChange?.(e.target.value)}
              placeholder="Ej: residencial, refacción"
              fullWidth
            />
          </Stack>
        )}
        <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
          {importFile ? importFile.name : 'Seleccionar archivo'}
          <input
            type="file"
            hidden
            accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => onImportFileChange(e.target.files?.[0] || null)}
          />
        </Button>
        {importFile && (
          <Typography variant="caption">
            {importFile.name} · {(importFile.size / 1024).toFixed(0)} KB
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {statusTexts[status] || statusTexts.idle}
        </Typography>
        {loading && <LinearProgress />}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" onClick={onImport} disabled={!importFile || loading}>
        {loading ? <CircularProgress size={20} /> : 'Importar'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ImportarPlantillaDialog;
