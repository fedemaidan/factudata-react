/**
 * EgresoDesdeRemito.js
 * 
 * Componente Dialog para extraer materiales de un remito de entrega usando IA
 * y crear automáticamente una solicitud de egreso del stock.
 * 
 * Flujo:
 * 1. Usuario sube imagen de remito (archivo)
 * 2. IA extrae los materiales del remito
 * 3. Sistema intenta conciliar con materiales existentes
 * 4. Usuario revisa, edita y confirma
 * 5. Se crea la solicitud de EGRESO
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, Box, Paper,
  Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Chip, Tooltip, Alert, LinearProgress,
  FormControl, InputLabel, Select, MenuItem, Divider,
  CircularProgress, Stepper, Step, StepLabel, Collapse,
  InputAdornment
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';
import movimientosService from 'src/services/movimientosService';

const STEPS = ['Subir Remito', 'Revisar Materiales', 'Confirmar Egreso'];

export default function EgresoDesdeRemito({ 
  open, 
  onClose, 
  onSuccess, 
  user, 
  proyectos = [] 
}) {
  // Estado del stepper
  const [activeStep, setActiveStep] = useState(0);
  
  // Estado para el remito (archivo)
  const [archivoRemito, setArchivoRemito] = useState(null);
  const [urlRemito, setUrlRemito] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  // Datos extraídos del remito
  const [datosRemito, setDatosRemito] = useState(null);
  const [materiales, setMateriales] = useState([]);
  const [estadoConciliacion, setEstadoConciliacion] = useState(null);
  
  // Datos de la solicitud
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState('');
  const [fechaEgreso, setFechaEgreso] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [observacion, setObservacion] = useState('');
  
  // Estado de empresa
  const [empresaId, setEmpresaId] = useState('');

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setArchivoRemito(null);
      setUrlRemito('');
      setPreviewUrl('');
      setIsUploading(false);
      setIsProcessing(false);
      setError('');
      setDatosRemito(null);
      setMateriales([]);
      setEstadoConciliacion(null);
      setProyectoSeleccionado('');
      setFechaEgreso(new Date().toISOString().split('T')[0]);
      setObservacion('');
      
      // Limpiar el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Cargar empresa_id
      if (user) {
        getEmpresaDetailsFromUser(user).then(emp => {
          setEmpresaId(emp?.id || '');
        }).catch(console.error);
      }
    }
  }, [open, user]);

  // Manejar selección de archivo
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setArchivoRemito(file);
      setError('');
      
      // Crear preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Subir archivo y extraer datos
  const handleSubirYExtraer = async () => {
    if (!archivoRemito) {
      setError('Por favor seleccioná una imagen del remito');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // 1. Subir imagen a Firebase Storage
      const uploadResult = await movimientosService.subirImagenTemporal(archivoRemito);
      const urlSubida = uploadResult.url_imagen;
      
      if (!urlSubida) {
        throw new Error('No se pudo obtener la URL de la imagen subida');
      }
      
      setUrlRemito(urlSubida);
      console.log('[EgresoDesdeRemito] Imagen subida:', urlSubida);

      // 2. Extraer datos con IA
      setIsUploading(false);
      setIsProcessing(true);
      
      const datos = await StockSolicitudesService.extraerDatosRemito(urlSubida);
      
      console.log('[EgresoDesdeRemito] Datos extraídos:', datos);
      
      if (!datos || !datos.success) {
        throw new Error(datos?.error || 'No se pudieron extraer datos del remito');
      }

      setDatosRemito(datos);
      
      // Preparar materiales para edición
      const materialesExtraidos = (datos.materiales || []).map((mat, idx) => ({
        id: idx + 1,
        nombre_item: mat.Nombre || mat.nombre || '',
        cantidad: parseFloat(mat.cantidad) || 0,
        unidad: mat.unidad || 'u',
        sku_original: mat.SKU || '',
        id_material: null,
        conciliado: false,
        _conciliacion_info: null
      }));

      setMateriales(materialesExtraidos);

      // 3. Intentar conciliar automáticamente
      if (empresaId && materialesExtraidos.length > 0) {
        try {
          const resultado = await StockSolicitudesService.conciliarMaterialesEgreso(
            materialesExtraidos.map(m => ({
              Nombre: m.nombre_item,
              cantidad: m.cantidad,
              SKU: m.sku_original,
              unidad: m.unidad
            })),
            empresaId
          );

          console.log('[EgresoDesdeRemito] Resultado conciliación:', resultado);

          if (resultado.materiales) {
            const materialesActualizados = materialesExtraidos.map((mat, idx) => {
              const matConciliado = resultado.materiales[idx];
              return {
                ...mat,
                id_material: matConciliado?.id_material || null,
                nombre_item: matConciliado?.nombre_item || mat.nombre_item,
                conciliado: !!matConciliado?.id_material,
                stock_disponible: matConciliado?.stock_disponible || null,
                _conciliacion_info: matConciliado?._conciliacion_info || null
              };
            });
            setMateriales(materialesActualizados);
          }

          setEstadoConciliacion({
            total: resultado.total,
            conciliados: resultado.conciliados,
            sinConciliar: resultado.sinConciliar,
            porcentaje: resultado.porcentajeConciliado
          });

        } catch (concError) {
          console.warn('[EgresoDesdeRemito] Error en conciliación:', concError);
        }
      }

      // Generar observación automática
      const obsPartes = [];
      if (datos.numero_remito && datos.numero_remito !== 'No legible') {
        obsPartes.push(`Remito: ${datos.numero_remito}`);
      }
      if (datos.destinatario && datos.destinatario !== 'No legible') {
        obsPartes.push(`Dest: ${datos.destinatario}`);
      }
      if (datos.obra && datos.obra !== 'No legible') {
        obsPartes.push(`Obra: ${datos.obra}`);
      }
      if (obsPartes.length > 0) {
        setObservacion(obsPartes.join(' | '));
      }

      // Avanzar al siguiente paso
      setActiveStep(1);

    } catch (err) {
      console.error('[EgresoDesdeRemito] Error:', err);
      setError(err?.message || 'Error al procesar el remito');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // Actualizar un material
  const handleUpdateMaterial = (id, field, value) => {
    setMateriales(prev => prev.map(mat => 
      mat.id === id ? { ...mat, [field]: value } : mat
    ));
  };

  // Eliminar un material
  const handleRemoveMaterial = (id) => {
    setMateriales(prev => prev.filter(mat => mat.id !== id));
  };

  // Agregar material manualmente
  const handleAddMaterial = () => {
    const newId = materiales.length > 0 ? Math.max(...materiales.map(m => m.id)) + 1 : 1;
    setMateriales(prev => [...prev, {
      id: newId,
      nombre_item: '',
      cantidad: 1,
      unidad: 'u',
      sku_original: '',
      id_material: null,
      conciliado: false,
      stock_disponible: null,
      _conciliacion_info: null
    }]);
  };

  // Crear la solicitud de egreso
  const handleCrearEgreso = async () => {
    if (materiales.length === 0) {
      setError('Agregá al menos un material para continuar');
      return;
    }

    // Validar que todos tengan nombre y cantidad
    const materialesInvalidos = materiales.filter(m => !m.nombre_item || !m.cantidad || m.cantidad <= 0);
    if (materialesInvalidos.length > 0) {
      setError('Todos los materiales deben tener nombre y cantidad mayor a 0');
      return;
    }

    // Validar que haya stock disponible (opcional - solo warning)
    const sinStock = materiales.filter(m => m.conciliado && m.stock_disponible !== null && m.cantidad > m.stock_disponible);
    if (sinStock.length > 0) {
      const nombres = sinStock.map(m => m.nombre_item).join(', ');
      // Solo mostrar warning, no bloquear
      console.warn(`[EgresoDesdeRemito] Materiales con stock insuficiente: ${nombres}`);
    }

    setIsProcessing(true);
    setError('');

    try {
      // Preparar el proyecto
      const proyectoId = proyectoSeleccionado || null;
      const proyectoNombre = proyectoId 
        ? proyectos.find(p => p.id === proyectoId)?.nombre || 'Sin asignar'
        : 'Sin asignar';

      // Preparar movimientos (las cantidades van positivas, el backend las convierte a negativas)
      const movimientos = materiales.map(mat => ({
        nombre_item: mat.nombre_item,
        cantidad: Math.abs(parseFloat(mat.cantidad) || 0),
        tipo: 'EGRESO',
        subtipo: 'ENTREGA',
        fecha_movimiento: fechaEgreso,
        proyecto_id: proyectoId,
        proyecto_nombre: proyectoNombre,
        observacion: null,
        id_material: mat.id_material || null
      }));

      // Preparar documentos - usar urlRemito (URL de Firebase), no previewUrl (base64 local)
      const urlDocumento = urlRemito || '';
      const documentos = urlDocumento ? [urlDocumento] : [];

      // Crear solicitud
      const form = {
        tipo: 'EGRESO',
        subtipo: 'ENTREGA',
        fecha: fechaEgreso,
        responsable: user?.email || '',
        destinatario: datosRemito?.destinatario || '',
        obra: datosRemito?.obra || '',
        url_doc: urlDocumento,
        documentos: documentos,
        proyecto_id: proyectoId,
        proyecto_nombre: proyectoNombre,
        observacion: observacion
      };

      const resultado = await StockSolicitudesService.guardarSolicitud({
        user,
        form,
        movs: movimientos,
        editMode: false,
        editId: null
      });

      console.log('[EgresoDesdeRemito] Solicitud creada:', resultado);

      // Éxito - cerrar y notificar
      if (onSuccess) {
        onSuccess(resultado);
      }
      onClose();

    } catch (err) {
      console.error('[EgresoDesdeRemito] Error creando solicitud:', err);
      setError(err?.message || 'Error al crear la solicitud de egreso');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reintentar extracción
  const handleReintentar = () => {
    setActiveStep(0);
    setArchivoRemito(null);
    setUrlRemito('');
    setPreviewUrl('');
    setDatosRemito(null);
    setMateriales([]);
    setEstadoConciliacion(null);
    setError('');
    
    // Limpiar el input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Contenido del Step 1: Subir Remito
  const renderStepSubirRemito = () => (
    <Stack spacing={3}>
      <Alert severity="info" icon={<LocalShippingIcon />}>
        Subí una imagen de tu remito de entrega y la IA extraerá automáticamente los materiales
      </Alert>

      {/* Input de archivo */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          border: '2px dashed',
          borderColor: archivoRemito ? 'warning.main' : 'divider',
          bgcolor: archivoRemito ? 'warning.lighter' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <Stack spacing={2} alignItems="center">
          <CloudUploadIcon sx={{ fontSize: 48, color: archivoRemito ? 'warning.main' : 'text.secondary' }} />
          
          {archivoRemito ? (
            <>
              <Typography variant="body1" color="warning.main" fontWeight={500}>
                ✓ Archivo seleccionado
              </Typography>
              <Chip 
                label={archivoRemito.name} 
                color="warning" 
                onDelete={() => {
                  setArchivoRemito(null);
                  setPreviewUrl('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary">
                Hacé clic para seleccionar una imagen de remito
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos soportados: JPG, PNG, PDF
              </Typography>
            </>
          )}
        </Stack>
      </Paper>

      {/* Preview de la imagen */}
      {previewUrl && (
        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Vista previa
          </Typography>
          <Box
            component="img"
            src={previewUrl}
            alt="Preview de remito"
            sx={{
              maxWidth: '100%',
              maxHeight: 300,
              objectFit: 'contain',
              borderRadius: 1,
              mt: 1
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </Paper>
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}
    </Stack>
  );

  // Contenido del Step 2: Revisar Materiales
  const renderStepRevisarMateriales = () => (
    <Stack spacing={3}>
      {/* Info del remito */}
      {datosRemito && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Stack direction="row" spacing={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Destinatario</Typography>
              <Typography variant="body1" fontWeight={500}>
                {datosRemito.destinatario || 'No identificado'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Nº Remito</Typography>
              <Typography variant="body1" fontWeight={500}>
                {datosRemito.numero_remito || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Fecha</Typography>
              <Typography variant="body1" fontWeight={500}>
                {datosRemito.fecha || '—'}
              </Typography>
            </Box>
            {datosRemito.obra && (
              <Box>
                <Typography variant="caption" color="text.secondary">Obra</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {datosRemito.obra || '—'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Estado de conciliación */}
      {estadoConciliacion && (
        <Alert 
          severity={estadoConciliacion.conciliados > 0 ? "success" : "warning"}
          icon={estadoConciliacion.conciliados > 0 ? <CheckCircleIcon /> : <WarningIcon />}
        >
          <strong>Conciliación automática:</strong>{' '}
          {estadoConciliacion.conciliados} de {estadoConciliacion.total} materiales 
          ({estadoConciliacion.porcentaje}%) coinciden con tu inventario
        </Alert>
      )}

      {/* Tabla de materiales */}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40}>#</TableCell>
              <TableCell>Material</TableCell>
              <TableCell align="right" width={100}>Cantidad</TableCell>
              <TableCell width={80}>Unidad</TableCell>
              <TableCell align="right" width={100}>Stock Disp.</TableCell>
              <TableCell width={100}>Estado</TableCell>
              <TableCell width={60}>Acc.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materiales.map((mat, idx) => (
              <TableRow key={mat.id} hover>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <MaterialAutocomplete
                    user={user}
                    value={mat.id_material || ''}
                    fallbackText={mat.nombre_item || ''}
                    onTextChange={(text) => {
                      handleUpdateMaterial(mat.id, 'nombre_item', text);
                      handleUpdateMaterial(mat.id, 'id_material', null);
                      handleUpdateMaterial(mat.id, 'conciliado', false);
                      handleUpdateMaterial(mat.id, 'stock_disponible', null);
                    }}
                    onMaterialSelect={(material) => {
                      handleUpdateMaterial(mat.id, 'id_material', material.id);
                      handleUpdateMaterial(mat.id, 'nombre_item', material.nombre || material.label);
                      handleUpdateMaterial(mat.id, 'conciliado', true);
                      handleUpdateMaterial(mat.id, 'stock_disponible', material.stock_total || material.stock || null);
                    }}
                    onMaterialCreated={(materialCreado) => {
                      handleUpdateMaterial(mat.id, 'id_material', materialCreado.id);
                      handleUpdateMaterial(mat.id, 'nombre_item', materialCreado.nombre);
                      handleUpdateMaterial(mat.id, 'conciliado', true);
                      handleUpdateMaterial(mat.id, 'stock_disponible', 0);
                    }}
                    label=""
                    size="small"
                    showCreateOption={true}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={mat.cantidad}
                    onChange={(e) => handleUpdateMaterial(mat.id, 'cantidad', parseFloat(e.target.value) || 0)}
                    size="small"
                    sx={{ width: 80 }}
                    inputProps={{ min: 0, step: 0.1 }}
                    error={mat.conciliado && mat.stock_disponible !== null && mat.cantidad > mat.stock_disponible}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={mat.unidad || 'u'}
                    onChange={(e) => handleUpdateMaterial(mat.id, 'unidad', e.target.value)}
                    size="small"
                    sx={{ width: 60 }}
                  />
                </TableCell>
                <TableCell align="right">
                  {mat.conciliado && mat.stock_disponible !== null ? (
                    <Chip 
                      label={mat.stock_disponible} 
                      size="small" 
                      color={mat.cantidad > mat.stock_disponible ? 'error' : 'default'}
                      variant="outlined"
                    />
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {mat.conciliado ? (
                    <Chip 
                      label="Conciliado" 
                      size="small" 
                      color="success" 
                      icon={<CheckCircleIcon />}
                    />
                  ) : (
                    <Chip 
                      label="Nuevo" 
                      size="small" 
                      color="warning" 
                      icon={<WarningIcon />}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleRemoveMaterial(mat.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {materiales.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3 }}>
                  <Typography color="text.secondary">
                    No hay materiales. Agregá uno manualmente.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Warning de stock insuficiente */}
      {materiales.some(m => m.conciliado && m.stock_disponible !== null && m.cantidad > m.stock_disponible) && (
        <Alert severity="warning">
          Algunos materiales tienen cantidad mayor al stock disponible. Podrás continuar, pero el stock quedará en negativo.
        </Alert>
      )}

      <Button 
        startIcon={<AddIcon />} 
        variant="outlined" 
        onClick={handleAddMaterial}
      >
        Agregar material manualmente
      </Button>

      {/* Selector de proyecto y fecha */}
      <Divider />
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Proyecto / Obra destino</InputLabel>
          <Select
            label="Proyecto / Obra destino"
            value={proyectoSeleccionado}
            onChange={(e) => setProyectoSeleccionado(e.target.value)}
          >
            <MenuItem value="">
              <em>Sin asignar</em>
            </MenuItem>
            {proyectos.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          type="date"
          label="Fecha de egreso"
          value={fechaEgreso}
          onChange={(e) => setFechaEgreso(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      <TextField
        fullWidth
        label="Observación"
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
        multiline
        rows={2}
        helperText="Se incluirá en la solicitud de egreso"
      />

      {error && (
        <Alert severity="error">{error}</Alert>
      )}
    </Stack>
  );

  // Contenido del Step 3: Confirmar (ya no se usa como step separado)
  const renderStepConfirmar = () => renderStepRevisarMateriales();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <LocalShippingIcon color="warning" />
          <Typography variant="h6">Egreso desde Remito de Entrega</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Loading */}
        {(isUploading || isProcessing) && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress color="warning" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {isUploading 
                ? 'Subiendo imagen...' 
                : (activeStep === 0 
                    ? 'Extrayendo datos del remito con IA...' 
                    : 'Procesando...'
                  )
              }
            </Typography>
          </Box>
        )}

        {/* Contenido según step */}
        {activeStep === 0 && renderStepSubirRemito()}
        {activeStep >= 1 && renderStepRevisarMateriales()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isUploading || isProcessing}>
          Cancelar
        </Button>
        
        {activeStep === 0 && (
          <Button 
            variant="contained" 
            onClick={handleSubirYExtraer}
            disabled={isUploading || isProcessing || !archivoRemito}
            startIcon={(isUploading || isProcessing) ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            color="warning"
          >
            {isUploading ? 'Subiendo...' : (isProcessing ? 'Extrayendo...' : 'Subir y Extraer Materiales')}
          </Button>
        )}

        {activeStep >= 1 && (
          <>
            <Button 
              onClick={handleReintentar}
              disabled={isProcessing}
              startIcon={<RefreshIcon />}
            >
              Cargar otro remito
            </Button>
            <Button 
              variant="contained" 
              onClick={handleCrearEgreso}
              disabled={isProcessing || materiales.length === 0}
              startIcon={isProcessing ? <CircularProgress size={20} /> : <ExitToAppIcon />}
              color="warning"
            >
              {isProcessing ? 'Creando...' : 'Crear Egreso'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
