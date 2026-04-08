import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import importMovimientosService from 'src/services/importMovimientosService';

const MAX_TABULAR_FILES = 10;
const VALID_EXT = ['.csv', '.xlsx', '.xls'];

/**
 * Paso 1 del import tabular: tipo de importación + subida CSV/Excel.
 * Reutilizable en la página importMovimientos y en CargaMasivaDialog.
 */
function ImportPlanillaStep({
  empresa,
  wizardData,
  updateWizardData,
  onNext,
  setLoading,
  setError,
  hideNavigation,
  title,
  subtitle,
}) {
  const [dragging, setDragging] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [archivosAcumulados, setArchivosAcumulados] = useState([]);
  const [analisisAcumulado, setAnalisisAcumulado] = useState(null);

  useEffect(() => {
    if (wizardData.archivos?.length) {
      setArchivosAcumulados(wizardData.archivos);
    }
    if (wizardData.analisisCsv) {
      setAnalisisAcumulado(wizardData.analisisCsv);
    }
  }, []);

  const handleFileUpload = (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const ok = VALID_EXT.some((ext) => lower.endsWith(ext));
    if (!ok) {
      setError('Usá CSV o Excel (.csv, .xlsx, .xls)');
      return;
    }
    if (archivosAcumulados.length >= MAX_TABULAR_FILES) {
      setError(`Máximo ${MAX_TABULAR_FILES} archivos por lote.`);
      return;
    }
    setArchivosAcumulados((prev) => [...prev, file]);
    setError('');
  };

  const eliminarArchivo = (index) => {
    const nuevos = archivosAcumulados.filter((_, i) => i !== index);
    setArchivosAcumulados(nuevos);
    if (nuevos.length === 0) {
      setAnalisisAcumulado(null);
      updateWizardData({ archivos: [], analisisCsv: null });
    }
  };

  const analizarTodosLosArchivos = async () => {
    if (archivosAcumulados.length === 0) {
      setError('Agregá al menos un archivo');
      return;
    }
    setAnalizando(true);
    setLoading(true);
    setError('');
    try {
      const resultado = await importMovimientosService.subirArchivos(
        archivosAcumulados,
        empresa.id,
        '',
      );
      const analisisBasico = {
        archivos: resultado.urls_archivos || [],
        archivos_subidos: resultado.archivos_subidos || archivosAcumulados.length,
        timestamp: resultado.timestamp,
        _archivosUrls: resultado.urls_archivos,
        _empresaId: empresa.id,
        _especificacionUsuario: '',
      };
      setAnalisisAcumulado(analisisBasico);
      updateWizardData({
        archivos: archivosAcumulados,
        analisisCsv: analisisBasico,
      });
    } catch (error) {
      setError(error.message || 'Error al subir archivos');
    } finally {
      setAnalizando(false);
      setLoading(false);
    }
  };

  const analisisCsv = analisisAcumulado || wizardData.analisisCsv;
  const { tipoImportacion, proyectoSeleccionado } = wizardData;

  return (
    <Stack spacing={2.5}>
      {title && (
        <Typography variant={hideNavigation ? 'subtitle1' : 'h5'} fontWeight={600}>
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Tipo de importación
        </Typography>
        <RadioGroup
          value={tipoImportacion || 'general'}
          onChange={(e) => updateWizardData({ tipoImportacion: e.target.value })}
        >
          <FormControlLabel
            value="general"
            control={<Radio size="small" />}
            label={
              <Typography variant="body2">
                General: el proyecto por fila viene del archivo
              </Typography>
            }
          />
          <FormControlLabel
            value="proyecto_especifico"
            control={<Radio size="small" />}
            label={
              <Typography variant="body2">
                Un solo proyecto para todos los movimientos
              </Typography>
            }
          />
        </RadioGroup>
        {tipoImportacion === 'proyecto_especifico' && (
          <FormControl fullWidth size="small" sx={{ mt: 1.5, maxWidth: 360 }}>
            <InputLabel>Proyecto</InputLabel>
            <Select
              value={proyectoSeleccionado?.id || ''}
              label="Proyecto"
              onChange={(e) => {
                const id = e.target.value;
                const p = empresa.proyectos?.find((x) => x.id === id);
                updateWizardData({
                  proyectoSeleccionado: p ? { id: p.id, nombre: p.nombre } : null,
                });
              }}
            >
              {(empresa.proyectos || []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Box
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          Array.from(e.dataTransfer.files || []).forEach(handleFileUpload);
        }}
        sx={{
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: dragging ? 'action.hover' : 'grey.50',
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('import-planilla-input')?.click()}
        role="presentation"
      >
        <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle2">Arrastrá archivos o hacé clic</Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          .csv, .xlsx, .xls · hasta {MAX_TABULAR_FILES} archivos · máx. 10 MB c/u
        </Typography>
        <input
          id="import-planilla-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          hidden
          onChange={(e) => {
            Array.from(e.target.files || []).forEach(handleFileUpload);
            e.target.value = '';
          }}
        />
      </Box>

      {archivosAcumulados.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {archivosAcumulados.length} archivo(s)
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
            {archivosAcumulados.map((archivo, index) => (
              <Chip
                key={`${archivo.name}-${index}`}
                icon={<DescriptionIcon />}
                label={`${archivo.name} (${Math.round(archivo.size / 1024)} KB)`}
                onDelete={() => eliminarArchivo(index)}
                deleteIcon={<DeleteOutlineIcon />}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" size="small" onClick={analizarTodosLosArchivos} disabled={analizando}>
              {analizando ? <CircularProgress size={18} /> : 'Subir a almacenamiento'}
            </Button>
            <Button
              variant="text"
              size="small"
              color="inherit"
              onClick={() => {
                setArchivosAcumulados([]);
                setAnalisisAcumulado(null);
                updateWizardData({ archivos: [], analisisCsv: null });
              }}
            >
              Limpiar
            </Button>
          </Stack>
        </Stack>
      )}

      {analizando && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Subiendo…
          </Typography>
        </Stack>
      )}

      {analisisCsv && !hideNavigation && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
          <Button
            variant="contained"
            onClick={onNext}
            disabled={tipoImportacion === 'proyecto_especifico' && !proyectoSeleccionado}
          >
            Continuar
          </Button>
        </Box>
      )}
    </Stack>
  );
}

ImportPlanillaStep.propTypes = {
  empresa: PropTypes.object.isRequired,
  wizardData: PropTypes.object.isRequired,
  updateWizardData: PropTypes.func.isRequired,
  onNext: PropTypes.func,
  setLoading: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  hideNavigation: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

ImportPlanillaStep.defaultProps = {
  onNext: undefined,
  hideNavigation: false,
  title: null,
  subtitle: null,
};

export default ImportPlanillaStep;
