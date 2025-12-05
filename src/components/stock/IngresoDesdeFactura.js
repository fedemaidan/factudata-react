/**
 * IngresoDesdeFactura.js
 * 
 * Componente Dialog para extraer materiales de una factura de compra usando IA
 * y crear automáticamente una solicitud de ingreso al stock.
 * 
 * Flujo:
 * 1. Usuario sube imagen de factura (archivo)
 * 2. IA extrae los materiales de la factura
 * 3. Sistema intenta conciliar con materiales existentes
 * 4. Usuario revisa, edita y confirma
 * 5. Se crea la solicitud de INGRESO
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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';
import movimientosService from 'src/services/movimientosService';

const STEPS = ['Subir Factura', 'Revisar Materiales', 'Confirmar Ingreso'];

export default function IngresoDesdeFactura({ 
  open, 
  onClose, 
  onSuccess, 
  user, 
  proyectos = [] 
}) {
  // Estado del stepper
  const [activeStep, setActiveStep] = useState(0);
  
  // Estado para la factura (archivo)
  const [archivoFactura, setArchivoFactura] = useState(null);
  const [urlFactura, setUrlFactura] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  // Datos extraídos de la factura
  const [datosFactura, setDatosFactura] = useState(null);
  const [materiales, setMateriales] = useState([]);
  const [estadoConciliacion, setEstadoConciliacion] = useState(null);
  
  // Datos de la solicitud
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(() => {
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
      setArchivoFactura(null);
      setUrlFactura('');
      setPreviewUrl('');
      setIsUploading(false);
      setIsProcessing(false);
      setError('');
      setDatosFactura(null);
      setMateriales([]);
      setEstadoConciliacion(null);
      setProyectoSeleccionado('');
      setFechaIngreso(new Date().toISOString().split('T')[0]);
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
      setArchivoFactura(file);
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
    if (!archivoFactura) {
      setError('Por favor seleccioná una imagen de factura');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // 1. Subir imagen a Firebase Storage
      const uploadResult = await movimientosService.subirImagenTemporal(archivoFactura);
      const urlSubida = uploadResult.url_imagen;
      
      if (!urlSubida) {
        throw new Error('No se pudo obtener la URL de la imagen subida');
      }
      
      setUrlFactura(urlSubida);
      console.log('[IngresoDesdeFactura] Imagen subida:', urlSubida);

      // 2. Extraer datos con IA
      setIsUploading(false);
      setIsProcessing(true);
      
      const datos = await StockSolicitudesService.extraerDatosFactura(urlSubida);
      
      console.log('[IngresoDesdeFactura] Datos extraídos:', datos);
      
      if (!datos || !datos.success) {
        throw new Error(datos?.error || 'No se pudieron extraer datos de la factura');
      }

      setDatosFactura(datos);
      
      // Preparar materiales para edición
      const materialesExtraidos = (datos.materiales || []).map((mat, idx) => ({
        id: idx + 1,
        nombre_item: mat.Nombre || mat.nombre || '',
        cantidad: parseFloat(mat.cantidad) || 0,
        unidad: mat.unidad || 'u',
        precio_unitario: mat.precio_unitario || null,
        subtotal: mat.subtotal || null,
        sku_original: mat.SKU || '',
        id_material: null,
        conciliado: false,
        _conciliacion_info: null
      }));

      setMateriales(materialesExtraidos);

      // 3. Intentar conciliar automáticamente
      if (empresaId && materialesExtraidos.length > 0) {
        try {
          const resultado = await StockSolicitudesService.conciliarMateriales(
            materialesExtraidos.map(m => ({
              Nombre: m.nombre_item,
              cantidad: m.cantidad,
              SKU: m.sku_original,
              unidad: m.unidad,
              precio_unitario: m.precio_unitario
            })),
            empresaId
          );

          console.log('[IngresoDesdeFactura] Resultado conciliación:', resultado);

          if (resultado.materiales) {
            const materialesActualizados = materialesExtraidos.map((mat, idx) => {
              const matConciliado = resultado.materiales[idx];
              return {
                ...mat,
                id_material: matConciliado?.id_material || null,
                nombre_item: matConciliado?.nombre_item || mat.nombre_item,
                conciliado: !!matConciliado?.id_material,
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
          console.warn('[IngresoDesdeFactura] Error en conciliación:', concError);
        }
      }

      // Generar observación automática
      const obsPartes = [];
      if (datos.numero_factura && datos.numero_factura !== 'No legible') {
        obsPartes.push(`Factura: ${datos.numero_factura}`);
      }
      if (datos.proveedor && datos.proveedor !== 'No legible') {
        obsPartes.push(`Prov: ${datos.proveedor}`);
      }
      if (obsPartes.length > 0) {
        setObservacion(obsPartes.join(' | '));
      }

      // Avanzar al siguiente paso
      setActiveStep(1);

    } catch (err) {
      console.error('[IngresoDesdeFactura] Error:', err);
      setError(err?.message || 'Error al procesar la factura');
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
      precio_unitario: null,
      subtotal: null,
      sku_original: '',
      id_material: null,
      conciliado: false,
      _conciliacion_info: null
    }]);
  };

  // Crear la solicitud de ingreso
  const handleCrearIngreso = async () => {
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

    setIsProcessing(true);
    setError('');

    try {
      // Preparar el proyecto
      const proyectoId = proyectoSeleccionado || null;
      const proyectoNombre = proyectoId 
        ? proyectos.find(p => p.id === proyectoId)?.nombre || 'Sin asignar'
        : 'Sin asignar';

      // Preparar movimientos
      const movimientos = materiales.map(mat => ({
        nombre_item: mat.nombre_item,
        cantidad: Math.abs(parseFloat(mat.cantidad) || 0),
        tipo: 'INGRESO',
        subtipo: 'COMPRA',
        fecha_movimiento: fechaIngreso,
        proyecto_id: proyectoId,
        proyecto_nombre: proyectoNombre,
        observacion: mat.precio_unitario ? `PU: $${mat.precio_unitario}` : null,
        id_material: mat.id_material || null
      }));

      // Preparar documentos - usar urlFactura (URL de Firebase), no previewUrl (base64 local)
      const urlDocumento = urlFactura || '';
      const documentos = urlDocumento ? [urlDocumento] : [];

      // Crear solicitud
      const form = {
        tipo: 'INGRESO',
        subtipo: 'COMPRA',
        fecha: fechaIngreso,
        responsable: user?.email || '',
        proveedor_nombre: datosFactura?.proveedor || '',
        proveedor_cuit: datosFactura?.cuit_proveedor || '',
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

      console.log('[IngresoDesdeFactura] Solicitud creada:', resultado);

      // Éxito - cerrar y notificar
      if (onSuccess) {
        onSuccess(resultado);
      }
      onClose();

    } catch (err) {
      console.error('[IngresoDesdeFactura] Error creando solicitud:', err);
      setError(err?.message || 'Error al crear la solicitud de ingreso');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reintentar extracción
  const handleReintentar = () => {
    setActiveStep(0);
    setArchivoFactura(null);
    setUrlFactura('');
    setPreviewUrl('');
    setDatosFactura(null);
    setMateriales([]);
    setEstadoConciliacion(null);
    setError('');
    
    // Limpiar el input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Contenido del Step 1: Subir Factura
  const renderStepSubirFactura = () => (
    <Stack spacing={3}>
      <Alert severity="info" icon={<ReceiptLongIcon />}>
        Subí una imagen de tu factura de compra y la IA extraerá automáticamente los materiales
      </Alert>

      {/* Input de archivo */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          border: '2px dashed',
          borderColor: archivoFactura ? 'success.main' : 'divider',
          bgcolor: archivoFactura ? 'success.lighter' : 'background.paper',
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
          <CloudUploadIcon sx={{ fontSize: 48, color: archivoFactura ? 'success.main' : 'text.secondary' }} />
          
          {archivoFactura ? (
            <>
              <Typography variant="body1" color="success.main" fontWeight={500}>
                ✓ Archivo seleccionado
              </Typography>
              <Chip 
                label={archivoFactura.name} 
                color="success" 
                onDelete={() => {
                  setArchivoFactura(null);
                  setPreviewUrl('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary">
                Hacé clic para seleccionar una imagen de factura
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
            alt="Preview de factura"
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
      {/* Info de la factura */}
      {datosFactura && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Stack direction="row" spacing={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Proveedor</Typography>
              <Typography variant="body1" fontWeight={500}>
                {datosFactura.proveedor || 'No identificado'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Nº Factura</Typography>
              <Typography variant="body1" fontWeight={500}>
                {datosFactura.numero_factura || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Fecha</Typography>
              <Typography variant="body1" fontWeight={500}>
                {datosFactura.fecha || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="body1" fontWeight={500}>
                ${datosFactura.total || '—'}
              </Typography>
            </Box>
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
              <TableCell align="right" width={100}>P.Unit</TableCell>
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
                    }}
                    onMaterialSelect={(material) => {
                      handleUpdateMaterial(mat.id, 'id_material', material.id);
                      handleUpdateMaterial(mat.id, 'nombre_item', material.nombre || material.label);
                      handleUpdateMaterial(mat.id, 'conciliado', true);
                    }}
                    onMaterialCreated={(materialCreado) => {
                      handleUpdateMaterial(mat.id, 'id_material', materialCreado.id);
                      handleUpdateMaterial(mat.id, 'nombre_item', materialCreado.nombre);
                      handleUpdateMaterial(mat.id, 'conciliado', true);
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
                  {mat.precio_unitario ? `$${mat.precio_unitario}` : '—'}
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
          <InputLabel>Proyecto destino</InputLabel>
          <Select
            label="Proyecto destino"
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
          label="Fecha de ingreso"
          value={fechaIngreso}
          onChange={(e) => setFechaIngreso(e.target.value)}
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
        helperText="Se incluirá en la solicitud de ingreso"
      />

      {error && (
        <Alert severity="error">{error}</Alert>
      )}
    </Stack>
  );

  // Contenido del Step 3: Confirmar (ya no se usa como step separado, pero dejamos por si acaso)
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
          <ReceiptLongIcon color="primary" />
          <Typography variant="h6">Ingreso desde Factura de Compra</Typography>
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
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {isUploading 
                ? 'Subiendo imagen...' 
                : (activeStep === 0 
                    ? 'Extrayendo datos de la factura con IA...' 
                    : 'Procesando...'
                  )
              }
            </Typography>
          </Box>
        )}

        {/* Contenido según step */}
        {activeStep === 0 && renderStepSubirFactura()}
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
            disabled={isUploading || isProcessing || !archivoFactura}
            startIcon={(isUploading || isProcessing) ? <CircularProgress size={20} /> : <CloudUploadIcon />}
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
              Cargar otra factura
            </Button>
            <Button 
              variant="contained" 
              onClick={handleCrearIngreso}
              disabled={isProcessing || materiales.length === 0}
              startIcon={isProcessing ? <CircularProgress size={20} /> : <SaveIcon />}
              color="success"
            >
              {isProcessing ? 'Creando...' : 'Crear Ingreso'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
