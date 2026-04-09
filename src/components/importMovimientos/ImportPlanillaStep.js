import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
  Chip,
  Checkbox,
  Paper,
  Alert,
  Link,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import * as XLSX from 'xlsx';
import importMovimientosService from 'src/services/importMovimientosService';

const MAX_TABULAR_FILES = 10;
const VALID_EXT = ['.csv', '.xlsx', '.xls'];

const isExcelFile = (fileName) => {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
};

const readExcelSheetNames = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook.SheetNames || []);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo Excel'));
    reader.readAsArrayBuffer(file);
  });

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
  /** @type {[Record<string, string[]>, Function]} nombres de hoja por nombre de archivo */
  const [hojasDetectadas, setHojasDetectadas] = useState({});
  /** @type {[Record<string, string[]>, Function]} hojas elegidas por el usuario */
  const [hojasSeleccionadas, setHojasSeleccionadas] = useState({});
  const [leyendoHojas, setLeyendoHojas] = useState(false);

  useEffect(() => {
    if (wizardData.archivos?.length) {
      setArchivosAcumulados(wizardData.archivos);
    }
    if (wizardData.analisisCsv) {
      setAnalisisAcumulado(wizardData.analisisCsv);
    }
    if (wizardData.hojasDetectadas && typeof wizardData.hojasDetectadas === 'object') {
      setHojasDetectadas(wizardData.hojasDetectadas);
    }
    if (wizardData.hojasSeleccionadas && typeof wizardData.hojasSeleccionadas === 'object') {
      setHojasSeleccionadas(wizardData.hojasSeleccionadas);
    }
  }, []);

  const handleFileUpload = async (file) => {
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
    setError('');

    if (isExcelFile(file.name)) {
      setLeyendoHojas(true);
      try {
        const sheetNames = await readExcelSheetNames(file);
        if (!sheetNames.length) {
          setError(`El archivo "${file.name}" no tiene hojas legibles.`);
          setLeyendoHojas(false);
          return;
        }
        setArchivosAcumulados((prev) => [...prev, file]);
        setHojasDetectadas((prev) => ({ ...prev, [file.name]: sheetNames }));
        setHojasSeleccionadas((prev) => ({ ...prev, [file.name]: [] }));
      } catch (err) {
        setError(err.message || `No se pudieron leer las hojas de "${file.name}"`);
      } finally {
        setLeyendoHojas(false);
      }
      return;
    }

    setArchivosAcumulados((prev) => [...prev, file]);
  };

  const eliminarArchivo = (index) => {
    const removed = archivosAcumulados[index];
    const nuevos = archivosAcumulados.filter((_, i) => i !== index);
    setArchivosAcumulados(nuevos);
    if (removed && isExcelFile(removed.name)) {
      setHojasDetectadas((prev) => {
        const next = { ...prev };
        delete next[removed.name];
        return next;
      });
      setHojasSeleccionadas((prev) => {
        const next = { ...prev };
        delete next[removed.name];
        return next;
      });
    }
    if (nuevos.length === 0) {
      setAnalisisAcumulado(null);
      setHojasDetectadas({});
      setHojasSeleccionadas({});
      updateWizardData({
        archivos: [],
        analisisCsv: null,
        hojasDetectadas: {},
        hojasSeleccionadas: {},
      });
    }
  };

  const handleToggleHoja = useCallback((fileName, sheetName) => {
    setHojasSeleccionadas((prev) => {
      const current = prev[fileName] || [];
      const has = current.includes(sheetName);
      const nextList = has ? current.filter((h) => h !== sheetName) : [...current, sheetName];
      return { ...prev, [fileName]: nextList };
    });
  }, []);

  const handleSeleccionarTodasHojas = useCallback((fileName) => {
    const todas = hojasDetectadas[fileName] || [];
    setHojasSeleccionadas((prev) => ({ ...prev, [fileName]: [...todas] }));
  }, [hojasDetectadas]);

  const handleQuitarTodasHojas = useCallback((fileName) => {
    setHojasSeleccionadas((prev) => ({ ...prev, [fileName]: [] }));
  }, []);

  const analizarTodosLosArchivos = async () => {
    if (archivosAcumulados.length === 0) {
      setError('Agregá al menos un archivo');
      return;
    }
    for (const f of archivosAcumulados) {
      if (!isExcelFile(f.name)) continue;
      const sel = hojasSeleccionadas[f.name];
      if (!sel || sel.length === 0) {
        setError(`Elegí al menos una hoja para "${f.name}"`);
        return;
      }
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
      const nombresOrden = archivosAcumulados.map((f) => f.name);
      const analisisBasico = {
        archivos: resultado.urls_archivos || [],
        archivos_subidos: resultado.archivos_subidos || archivosAcumulados.length,
        timestamp: resultado.timestamp,
        _archivosUrls: resultado.urls_archivos,
        _archivoNombresOrden: nombresOrden,
        _empresaId: empresa.id,
        _especificacionUsuario: '',
      };
      setAnalisisAcumulado(analisisBasico);
      updateWizardData({
        archivos: archivosAcumulados,
        analisisCsv: analisisBasico,
        hojasDetectadas,
        hojasSeleccionadas,
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
        <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary">
            {archivosAcumulados.length} archivo(s)
          </Typography>
          <Stack spacing={1.5}>
            {archivosAcumulados.map((archivo, index) => (
              <Box key={`${archivo.name}-${index}`}>
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    icon={<DescriptionIcon />}
                    label={`${archivo.name} (${Math.round(archivo.size / 1024)} KB)`}
                    onDelete={() => eliminarArchivo(index)}
                    deleteIcon={<DeleteOutlineIcon />}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                {isExcelFile(archivo.name) && (hojasDetectadas[archivo.name]?.length > 0) && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderColor: (hojasSeleccionadas[archivo.name] || []).length === 0 ? 'warning.light' : 'divider',
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Hojas a importar
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Link
                            component="button"
                            type="button"
                            variant="body2"
                            onClick={() => handleSeleccionarTodasHojas(archivo.name)}
                            sx={{ cursor: 'pointer' }}
                          >
                            Todas
                          </Link>
                          <Typography variant="caption" color="text.disabled">
                            ·
                          </Typography>
                          <Link
                            component="button"
                            type="button"
                            variant="body2"
                            onClick={() => handleQuitarTodasHojas(archivo.name)}
                            sx={{ cursor: 'pointer' }}
                          >
                            Ninguna
                          </Link>
                        </Stack>
                      </Stack>
                      {(hojasSeleccionadas[archivo.name] || []).length === 0 ? (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                          Elegí al menos una hoja para este archivo (por defecto ninguna está seleccionada).
                        </Alert>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {(hojasSeleccionadas[archivo.name] || []).length} de {hojasDetectadas[archivo.name].length}{' '}
                          hoja(s) seleccionada(s)
                        </Typography>
                      )}
                      <FormGroup sx={{ gap: 0.25 }}>
                        {hojasDetectadas[archivo.name].map((nombreHoja) => (
                          <FormControlLabel
                            key={`${archivo.name}-${nombreHoja}`}
                            control={
                              <Checkbox
                                size="small"
                                checked={(hojasSeleccionadas[archivo.name] || []).includes(nombreHoja)}
                                onChange={() => handleToggleHoja(archivo.name, nombreHoja)}
                              />
                            }
                            label={
                              <Typography variant="body2" component="span">
                                {nombreHoja}
                              </Typography>
                            }
                            sx={{ ml: 0, alignItems: 'center', py: 0.25 }}
                          />
                        ))}
                      </FormGroup>
                    </Stack>
                  </Paper>
                )}
              </Box>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              size="small"
              onClick={analizarTodosLosArchivos}
              disabled={analizando || leyendoHojas}
            >
              {analizando ? <CircularProgress size={18} /> : 'Subir a almacenamiento'}
            </Button>
            <Button
              variant="text"
              size="small"
              color="inherit"
              onClick={() => {
                setArchivosAcumulados([]);
                setAnalisisAcumulado(null);
                setHojasDetectadas({});
                setHojasSeleccionadas({});
                updateWizardData({
                  archivos: [],
                  analisisCsv: null,
                  hojasDetectadas: {},
                  hojasSeleccionadas: {},
                });
              }}
            >
              Limpiar
            </Button>
          </Stack>
        </Stack>
      )}

      {(analizando || leyendoHojas) && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {leyendoHojas ? 'Leyendo hojas del Excel…' : 'Subiendo…'}
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
