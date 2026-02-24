import React, { useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const statusTexts = {
  idle: 'Listo para importar.',
  uploading: 'Subiendo archivo...',
  analizando: 'Analizando con inteligencia artificial...',
  done: 'Listo para revisar la plantilla.',
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImportarPlantillaDialog = ({
  open,
  onClose,
  importFiles = [],
  onAddFiles,
  onRemoveFile,
  onMoveFile,
  fileGroupError,
  onImport,
  loading,
  nombre,
  tipo,
  onNombreChange,
  onTipoChange,
  status = 'idle',
}) => {
  const draggingIndex = useRef(null);
  const filePreviews = useMemo(
    () =>
      importFiles.map((file) => ({
        file,
        preview: file.type?.startsWith('image/') ? URL.createObjectURL(file) : null,
      })),
    [importFiles]
  );

  useEffect(() => {
    return () => {
      filePreviews.forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [filePreviews]);

  const handleSelectFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length && onAddFiles) {
      onAddFiles(files);
    }
    event.target.value = null;
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length && onAddFiles) {
      onAddFiles(files);
    }
  };

  const handleDragOver = (event) => event.preventDefault();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar plantilla desde archivo</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Subí uno o más archivos Excel (.xlsx), PDF o imágenes. El sistema extraerá rubros,
            tareas y notas del presupuesto.
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

          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              {importFiles.length ? 'Agregar archivos' : 'Seleccionar archivos'}
              <input
                type="file"
                hidden
                multiple
                accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleSelectFiles}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Podés arrastrar y soltar o seleccionar.
            </Typography>
          </Box>

          {fileGroupError && (
            <Typography variant="caption" color="error">
              {fileGroupError}
            </Typography>
          )}

          {importFiles.length > 0 && (
            <Stack spacing={1}>
              {filePreviews.map(({ file, preview }, index) => (
                <Stack
                  key={`${file.name}-${index}`}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    backgroundColor: (theme) =>
                      index % 2 ? theme.palette.action.hover : 'transparent',
                    cursor: 'grab',
                  }}
                  draggable
                  onDragStart={(event) => {
                    draggingIndex.current = index;
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = draggingIndex.current;
                    if (fromIndex == null || fromIndex === index) return;
                    onMoveFile?.(fromIndex, index);
                    draggingIndex.current = null;
                  }}
                >
                  <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      overflow: 'hidden',
                      backgroundColor: 'background.default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {preview ? (
                      <Box
                        component="img"
                        src={preview}
                        alt={file.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <InsertDriveFileIcon fontSize="small" />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(file.size)} ·
                      {file.type ? ` ${file.type.replace('image/', '').toUpperCase()}` : ' Archivo'}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => onRemoveFile?.(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                Reordená las imágenes manteniendo o arrastrando los ítems para reflejar el orden de
                páginas.
              </Typography>
            </Stack>
          )}

          <Typography
            variant="caption"
            color={fileGroupError ? 'error' : 'text.secondary'}
            sx={{ mt: 0.5 }}
          >
            {statusTexts[status] || statusTexts.idle}
          </Typography>

          {loading && <LinearProgress />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={onImport}
          disabled={!importFiles.length || loading || Boolean(fileGroupError)}
        >
          {loading ? <CircularProgress size={20} /> : 'Importar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportarPlantillaDialog;
