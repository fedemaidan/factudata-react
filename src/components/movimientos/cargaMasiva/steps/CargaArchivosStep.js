import { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const MAX_FILES = 50;
const ACCEPT = 'image/*,.pdf,application/pdf';

const CargaArchivosStep = ({ files, onFilesChange }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const dedupeKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;

  const mergeFiles = useCallback(
    (incoming) => {
      const map = new Map();
      files.forEach((f) => map.set(dedupeKey(f), f));
      incoming.forEach((f) => map.set(dedupeKey(f), f));
      const merged = Array.from(map.values()).slice(0, MAX_FILES);
      onFilesChange(merged);
    },
    [files, onFilesChange],
  );

  const handleInputChange = (e) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length) mergeFiles(list);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const list = Array.from(e.dataTransfer.files || []).filter((f) => {
      const t = f.type || '';
      return t.startsWith('image/') || t === 'application/pdf';
    });
    if (list.length) mergeFiles(list);
  };

  const handleRemove = (key) => {
    onFilesChange(files.filter((f) => dedupeKey(f) !== key));
  };

  const progress = (files.length / MAX_FILES) * 100;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Subí hasta {MAX_FILES} imágenes o PDF. Los PDF se convierten a imágenes en el servidor.
      </Typography>
      <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 1 }} />

      <Box
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: dragOver ? 'action.hover' : 'grey.50',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CloudUploadIcon color="primary" sx={{ fontSize: 48 }} />
          <Typography variant="subtitle1">Arrastrá archivos acá o elegí desde tu equipo</Typography>
          <Button variant="contained" onClick={() => inputRef.current?.click()}>
            Seleccionar archivos
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </Stack>
      </Box>

      {files.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {files.length} archivo(s)
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ maxHeight: 220, overflow: 'auto' }}>
            {files.map((f) => {
              const key = dedupeKey(f);
              return (
                <Chip
                  key={key}
                  label={f.name}
                  onDelete={() => handleRemove(key)}
                  deleteIcon={<DeleteOutlineIcon />}
                  size="small"
                  variant="outlined"
                />
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

CargaArchivosStep.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  onFilesChange: PropTypes.func.isRequired,
};

export default CargaArchivosStep;
