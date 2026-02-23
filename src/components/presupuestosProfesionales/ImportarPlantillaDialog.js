import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const ImportarPlantillaDialog = ({
  open,
  onClose,
  importFile,
  onImportFileChange,
  onImport,
  loading,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Importar plantilla desde archivo</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Subí un archivo Excel (.xlsx), PDF o imagen con rubros y tareas. El sistema intentará
        extraer la estructura automáticamente.
      </Typography>
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
        <Typography variant="caption" sx={{ ml: 1 }}>
          {importFile.name} ({(importFile.size / 1024).toFixed(0)} KB)
        </Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button
        variant="contained"
        onClick={onImport}
        disabled={!importFile || loading}
      >
        {loading ? <CircularProgress size={20} /> : 'Importar'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ImportarPlantillaDialog;
