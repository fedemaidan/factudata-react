import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getPdfPageCount } from '../utils/pdfPageCount';

const MAX_FILES = 50;
const ACCEPT = 'image/*,.pdf,application/pdf';

const dedupeKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;
const isPdfFile = (f) => (f?.type || '') === 'application/pdf' || /\.pdf$/i.test(f?.name || '');

const CargaArchivosStep = ({ files, onFilesChange, pdfSplitPerPage, onPdfSplitPerPageChange }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [pageCounts, setPageCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    const pendingPdfs = files.filter((f) => isPdfFile(f) && pageCounts[dedupeKey(f)] == null);
    if (pendingPdfs.length === 0) return undefined;

    (async () => {
      const updates = {};
      for (const f of pendingPdfs) {
        // Serial para no saturar el worker de pdf.js cuando el usuario sube muchos PDFs juntos.
        // eslint-disable-next-line no-await-in-loop
        const n = await getPdfPageCount(f);
        if (cancelled) return;
        updates[dedupeKey(f)] = n;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setPageCounts((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files, pageCounts]);

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
  const hayPdfMultipagina = files.some((f) => isPdfFile(f) && (pageCounts[dedupeKey(f)] || 1) > 1);

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
              const pdf = isPdfFile(f);
              const pages = pageCounts[key];
              const sufijo = pdf && pages != null ? ` · ${pages} pág${pages === 1 ? '' : 's'}` : '';
              return (
                <Chip
                  key={key}
                  label={`${f.name}${sufijo}`}
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

      {hayPdfMultipagina && (
        <Alert
          severity="info"
          variant="outlined"
          icon={false}
          sx={{ alignItems: 'center', py: 0.5 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Detectamos PDFs con varias páginas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activá si cada página de tus PDFs es un comprobante distinto (no un único comprobante de varias páginas).
              </Typography>
            </Box>
            <FormControlLabel
              sx={{ ml: { sm: 2 }, mr: 0 }}
              control={
                <Switch
                  checked={!!pdfSplitPerPage}
                  onChange={(_e, checked) => onPdfSplitPerPageChange?.(checked)}
                />
              }
              label={pdfSplitPerPage ? 'Una página = un comprobante' : 'Un PDF = un comprobante'}
            />
          </Stack>
        </Alert>
      )}
    </Stack>
  );
};

CargaArchivosStep.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  onFilesChange: PropTypes.func.isRequired,
  pdfSplitPerPage: PropTypes.bool,
  onPdfSplitPerPageChange: PropTypes.func,
};

CargaArchivosStep.defaultProps = {
  pdfSplitPerPage: false,
  onPdfSplitPerPageChange: undefined,
};

export default CargaArchivosStep;
