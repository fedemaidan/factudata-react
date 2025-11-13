import React, { useState, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as XLSX from 'xlsx';

const ImportarStock = ({ 
  open, 
  onClose, 
  onConfirmAjustes,
  materiales = [], // Materiales actuales del sistema para comparar
  user 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [ajustesPreview, setAjustesPreview] = useState([]);
  const [errores, setErrores] = useState([]);
  const fileInputRef = useRef();

  const steps = ['Seleccionar archivo', 'Revisar cambios', 'Confirmar ajustes'];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file) => {
    setProcessing(true);
    setErrores([]);
    setAjustesPreview([]);

    try {
      const data = await readExcelFile(file);
      const result = validateAndProcessData(data);
      
      if (result.errores.length > 0) {
        setErrores(result.errores);
        setActiveStep(0);
      } else {
        // Comparar con stock del sistema y generar diferencias
        const ajustesConDiferencias = compararConSistema(result.ajustes);
        setFileData(data);
        setAjustesPreview(ajustesConDiferencias);
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      setErrores([`Error al procesar el archivo: ${error.message}`]);
    } finally {
      setProcessing(false);
    }
  };

  const compararConSistema = (ajustesExcel) => {
    return ajustesExcel.map(ajusteExcel => {
      // Buscar el material en el sistema
      const materialSistema = materiales.find(m => m._id === ajusteExcel.materialId);
      
      if (!materialSistema) {
        console.warn(`Material no encontrado en sistema: ${ajusteExcel.materialId}`);
        return null; // Se filtrará después
      }

      // Buscar stock actual en el proyecto
      const stockProyecto = materialSistema.porProyecto?.find(p => p.proyecto_id === ajusteExcel.proyectoId);
      const stockSistema = stockProyecto?.stock || 0;
      
      // Calcular diferencia: Excel - Sistema
      const diferencia = ajusteExcel.stockExcel - stockSistema;
      
      // Solo incluir si hay diferencia
      if (diferencia === 0) {
        return null; // No hay cambios
      }

      return {
        ...ajusteExcel,
        stockSistema, // Stock actual en el sistema
        diferencia,   // Diferencia calculada
        tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
        cantidad: Math.abs(diferencia),
        // Datos adicionales del material del sistema
        empresaId: materialSistema.empresa_id,
        proyectoNombre: stockProyecto?.proyecto_nombre || 'Proyecto desconocido'
      };
    }).filter(Boolean); // Filtrar nulls
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateAndProcessData = (data) => {
    const errores = [];
    const ajustes = [];

    // Validar estructura del archivo
    const requiredColumns = [
      'ID Material', 'Nombre', 'SKU', 'Descripción', 'Stock Actual', 'Proyecto ID'
    ];

    if (!data || data.length === 0) {
      errores.push('El archivo está vacío o no tiene datos válidos');
      return { errores, ajustes };
    }

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    if (missingColumns.length > 0) {
      errores.push(`Faltan las siguientes columnas: ${missingColumns.join(', ')}`);
      return { errores, ajustes };
    }

    // Procesar cada fila
    data.forEach((row, index) => {
      const lineNumber = index + 2; // +2 porque Excel empieza en 1 y hay header
      
      try {
        const stockExcel = Number(row['Stock Actual']) || 0; // Stock modificado en Excel
        
        const ajuste = {
          materialId: row['ID Material'],
          materialNombre: row['Nombre'],
          sku: row['SKU'] || '',
          descripcion: row['Descripción'] || '',
          stockExcel, // Stock que viene del Excel (modificado por el usuario)
          proyectoId: row['Proyecto ID'],
          lineNumber
        };

        // Validaciones básicas
        if (!ajuste.materialId) {
          errores.push(`Línea ${lineNumber}: ID Material es requerido`);
          return;
        }

        if (!ajuste.materialNombre?.trim()) {
          errores.push(`Línea ${lineNumber}: Nombre del material es requerido`);
          return;
        }

        if (!ajuste.proyectoId) {
          errores.push(`Línea ${lineNumber}: Proyecto ID es requerido`);
          return;
        }

        if (!Number.isFinite(stockExcel) || stockExcel < 0) {
          errores.push(`Línea ${lineNumber}: Stock Actual debe ser un número válido mayor o igual a 0`);
          return;
        }

        // Siempre agregar para poder comparar después con el sistema
        ajustes.push(ajuste);
      } catch (error) {
        errores.push(`Línea ${lineNumber}: Error al procesar - ${error.message}`);
      }
    });

    return { errores, ajustes };
  };

  const handleConfirmAjustes = async () => {
    setProcessing(true);
    try {
      await onConfirmAjustes(ajustesPreview);
      setActiveStep(2);
      
      // Auto-cerrar después de 3 segundos
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      console.error('Error al procesar ajustes:', error);
      setErrores([`Error al procesar ajustes: ${error.message}`]);
      setActiveStep(1);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFileData(null);
    setAjustesPreview([]);
    setErrores([]);
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const getTipoColor = (tipo) => {
    return tipo === 'INGRESO' ? 'success' : 'error';
  };

  const totalIngresos = ajustesPreview.filter(a => a.tipo === 'INGRESO').length;
  const totalEgresos = ajustesPreview.filter(a => a.tipo === 'EGRESO').length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <UploadFileIcon />
          Importar Ajustes de Stock
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 0: Seleccionar archivo */}
          {activeStep === 0 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Seleccione un archivo Excel exportado desde el sistema. El sistema comparará automáticamente 
                el stock modificado en Excel vs el stock actual del sistema para generar los ajustes necesarios.
              </Alert>

              <Box display="flex" justifyContent="center" p={3}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={processing ? <CircularProgress size={16} /> : <UploadFileIcon />}
                  disabled={processing}
                  size="large"
                >
                  {processing ? 'Procesando...' : 'Seleccionar archivo Excel'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    hidden
                  />
                </Button>
              </Box>

              {errores.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Errores encontrados:
                  </Typography>
                  {errores.map((error, idx) => (
                    <Typography key={idx} variant="body2">
                      • {error}
                    </Typography>
                  ))}
                </Alert>
              )}
            </Box>
          )}

          {/* Step 1: Revisar cambios */}
          {activeStep === 1 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Revise cuidadosamente los cambios detectados. El sistema comparó el stock del Excel 
                vs el stock actual del sistema. Se crearán {ajustesPreview.length} movimientos de ajuste.
              </Alert>

              <Box display="flex" gap={1} mb={2}>
                <Chip 
                  label={`${totalIngresos} Ingresos`} 
                  color="success" 
                  size="small" 
                />
                <Chip 
                  label={`${totalEgresos} Egresos`} 
                  color="error" 
                  size="small" 
                />
              </Box>

              <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Stock Sistema</TableCell>
                      <TableCell>Stock Excel</TableCell>
                      <TableCell>Diferencia</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Cantidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ajustesPreview.map((ajuste, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{ajuste.materialNombre}</TableCell>
                        <TableCell>{ajuste.sku}</TableCell>
                        <TableCell>{ajuste.stockSistema}</TableCell>
                        <TableCell>{ajuste.stockExcel}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {ajuste.diferencia > 0 ? '+' : ''}{ajuste.diferencia}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ajuste.tipo} 
                            color={getTipoColor(ajuste.tipo)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{ajuste.cantidad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* Step 2: Confirmación */}
          {activeStep === 2 && (
            <Box textAlign="center" py={3}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Ajustes procesados exitosamente
              </Typography>
              <Typography color="text.secondary">
                Se han creado {ajustesPreview.length} movimientos de ajuste.
                El diálogo se cerrará automáticamente.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={processing}>
          Cancelar
        </Button>
        {activeStep === 1 && (
          <Button
            onClick={handleConfirmAjustes}
            variant="contained"
            disabled={processing || ajustesPreview.length === 0}
            startIcon={processing ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {processing ? 'Procesando...' : `Confirmar ${ajustesPreview.length} ajustes`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportarStock;