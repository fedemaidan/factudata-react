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
import StockMaterialesService from '../../services/stock/stockMaterialesService';
import { getEmpresaDetailsFromUser } from '../../services/empresaService';

const ImportarStock = ({ 
  open, 
  onClose, 
  onConfirmAjustes,
  materiales = [], // Materiales actuales del sistema para comparar
  proyectos = [], // Proyectos para convertir nombres a IDs
  user 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [ajustesPreview, setAjustesPreview] = useState([]);
  const [errores, setErrores] = useState([]);
  const [materialesNuevos, setMaterialesNuevos] = useState([]);
  const [showMaterialesNuevos, setShowMaterialesNuevos] = useState(false);
  const [crearMateriales, setCrearMateriales] = useState(false);
  const fileInputRef = useRef();

  const steps = ['Seleccionar archivo', 'Materiales nuevos', 'Revisar cambios', 'Confirmar ajustes'];

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
    setMaterialesNuevos([]);
    setShowMaterialesNuevos(false);

    try {
      const data = await readExcelFile(file);
      const result = validateAndProcessData(data);
      
      if (result.errores.length > 0) {
        setErrores(result.errores);
        setActiveStep(0);
      } else if (result.materialesNuevos.length > 0) {
        // Hay materiales nuevos, preguntar al usuario
        setFileData(data);
        setMaterialesNuevos(result.materialesNuevos);
        setAjustesPreview(result.ajustes); // Guardar ajustes para procesarlos después
        setShowMaterialesNuevos(true);
        setActiveStep(1); // Ir al step de materiales nuevos
      } else {
        // No hay materiales nuevos, procesar normalmente
        const ajustesConDiferencias = compararConSistema(result.ajustes);
        setFileData(data);
        setAjustesPreview(ajustesConDiferencias);
        setActiveStep(2); // Saltar el step de materiales nuevos
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
      // Función auxiliar para verificar si hay cambios en campos opcionales
      const verificarCambiosCamposOpcionales = (materialSistema, ajusteExcel) => {
        const cambios = {};
        let hayCambios = false;
        
        // Verificar categoría
        if (ajusteExcel.categoria && ajusteExcel.categoria !== (materialSistema.categoria || '')) {
          cambios.categoria = ajusteExcel.categoria;
          hayCambios = true;
        }
        
        // Verificar subcategoría
        if (ajusteExcel.subcategoria && ajusteExcel.subcategoria !== (materialSistema.subcategoria || '')) {
          cambios.subcategoria = ajusteExcel.subcategoria;
          hayCambios = true;
        }
        
        // Verificar descripción
        if (ajusteExcel.descripcion && ajusteExcel.descripcion !== (materialSistema.desc_material || '')) {
          cambios.desc_material = ajusteExcel.descripcion;
          hayCambios = true;
        }
        
        return { hayCambios, cambios };
      };

      // Manejar proyecto especial "Sin asignar"
      if (ajusteExcel.proyectoNombre === 'Sin asignar') {
        // Buscar el material en el sistema
        const materialSistema = materiales.find(m => m._id === ajusteExcel.materialId);
        
        // Si no encontramos el material en la lista local, es porque es recién creado
        if (!materialSistema && ajusteExcel.materialId) {
          console.log('📝 Material recién creado (Sin asignar):', ajusteExcel.materialNombre);
          // Para materiales recién creados, el stock del sistema es 0
          const diferencia = ajusteExcel.stockExcel - 0; // Stock sistema = 0 para material nuevo
          
          return {
            ...ajusteExcel,
            proyectoId: null, // null indica "sin asignar"
            stockSistema: 0,
            diferencia,
            tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
            cantidad: Math.abs(diferencia),
            empresaId: ajusteExcel.empresaId // Usar el empresaId que ya debe estar definido
          };
        }
        
        if (!materialSistema) {
          console.warn(`Material no encontrado en sistema: ${ajusteExcel.materialId}`);
          return null;
        }

        // Buscar específicamente el proyecto "SIN_ASIGNAR" en porProyecto
        const stockSinAsignarProyecto = materialSistema.porProyecto?.find(p => p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null);
        const stockSinAsignarActual = stockSinAsignarProyecto?.stock || 0;
        
        // Calcular diferencia: Excel - Sistema
        const diferencia = ajusteExcel.stockExcel - stockSinAsignarActual;
        
        // Solo incluir si hay diferencia
        if (diferencia === 0) {
          return null;
        }

        return {
          ...ajusteExcel,
          proyectoId: null, // null indica "sin asignar"
          stockSistema: stockSinAsignarActual,
          diferencia,
          tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
          cantidad: Math.abs(diferencia),
          empresaId: materialSistema.empresa_id
        };
      }
      
      // Buscar el proyecto por nombre (caso normal)
      const proyecto = proyectos.find(p => p.nombre === ajusteExcel.proyectoNombre);
      if (!proyecto) {
        console.warn(`Proyecto no encontrado: ${ajusteExcel.proyectoNombre}`);
        return null; // Se filtrará después
      }

      // Buscar el material en el sistema
      const materialSistema = materiales.find(m => m._id === ajusteExcel.materialId);
      
      // Si no encontramos el material en la lista local, es porque es recién creado
      if (!materialSistema && ajusteExcel.materialId) {
        console.log('📝 Material recién creado:', ajusteExcel.materialNombre, 'en proyecto:', proyecto.nombre);
        // Para materiales recién creados, el stock del sistema es 0
        const diferencia = ajusteExcel.stockExcel - 0; // Stock sistema = 0 para material nuevo
        
        // Solo incluir si hay diferencia (evitar movimientos con saldo 0)
        if (diferencia === 0) {
          console.log('⚠️ Material recién creado con stock 0, no se genera movimiento:', ajusteExcel.materialNombre);
          return null;
        }
        
        return {
          ...ajusteExcel,
          proyectoId: proyecto.id,
          stockSistema: 0,
          diferencia,
          tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
          cantidad: Math.abs(diferencia),
          empresaId: ajusteExcel.empresaId // Usar empresaId que debe estar definido
        };
      }
      
      if (!materialSistema) {
        console.warn(`Material no encontrado en sistema: ${ajusteExcel.materialId}`);
        return null; // Se filtrará después
      }

      // Buscar stock actual en el proyecto
      const stockProyecto = materialSistema.porProyecto?.find(p => p.proyecto_id === proyecto.id);
      const stockSistema = stockProyecto?.stock || 0;
      
      // Calcular diferencia: Excel - Sistema
      const diferencia = ajusteExcel.stockExcel - stockSistema;
      
      // Solo incluir si hay diferencia
      if (diferencia === 0) {
        return null; // No hay cambios
      }

      return {
        ...ajusteExcel,
        proyectoId: proyecto.id, // Agregar el ID del proyecto
        stockSistema, // Stock actual en el sistema
        diferencia,   // Diferencia calculada
        tipo: diferencia > 0 ? 'INGRESO' : 'EGRESO',
        cantidad: Math.abs(diferencia),
        // Datos adicionales del material del sistema
        empresaId: materialSistema.empresa_id
      };
    }).filter(Boolean); // Filtrar nulls
  };

  // Función para crear materiales nuevos
  const crearMaterialesNuevos = async (materialesParaCrear) => {
    try {
      const materialesCreados = [];
      
      // Obtener empresa del usuario usando la misma función que stockMateriales
      const empresa = await getEmpresaDetailsFromUser(user);
      console.log('🏢 Empresa obtenida:', empresa);
      
      for (const material of materialesParaCrear) {
        const nuevoMaterial = {
          nombre: material.nombre,
          empresa_id: empresa.id, // Usar empresa.id en lugar de user.empresa_id
          // Campos opcionales
          SKU: material.sku || null,
          desc_material: material.descripcion || null,
          categoria: material.categoria || null,
          subcategoria: material.subcategoria || null,
          alias: null, // Array o null, según el helper
          empresa_nombre: empresa.nombre || null // Usar empresa.nombre
        };

        console.log('📤 Enviando al backend:', nuevoMaterial);
        
        const materialCreado = await StockMaterialesService.crearMaterial(nuevoMaterial);
        
        console.log('✅ Material creado:', materialCreado);
        
        materialesCreados.push({
          ...material,
          materialId: materialCreado.data?.id_material || materialCreado.data?._id || materialCreado._id || materialCreado.id,
          empresaId: empresa.id // Agregar empresaId para usar en ajustes
        });
      }

      return materialesCreados;
    } catch (error) {
      console.error('❌ Error creando materiales:', error);
      console.error('📋 Response data:', error.response?.data);
      throw new Error(`Error al crear materiales: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  // Función para manejar la confirmación de materiales nuevos
  const handleMaterialesNuevosConfirmation = async (crear) => {
    setCrearMateriales(crear);
    
    if (crear) {
      try {
        setProcessing(true);
        
        // Crear los materiales nuevos
        console.log('🔄 Creando materiales nuevos:', materialesNuevos);
        const materialesCreados = await crearMaterialesNuevos(materialesNuevos);
        console.log('✅ Materiales creados exitosamente:', materialesCreados);
        
        // Convertir los materiales nuevos a ajustes con sus IDs generados
        const ajustesDeMaterialesNuevos = materialesCreados.map(material => ({
          materialId: material.materialId, // ID generado por el backend
          materialNombre: material.nombre,
          sku: material.sku,
          descripcion: material.descripcion,
          stockExcel: material.stockExcel,
          proyectoNombre: material.proyectoNombre,
          lineNumber: material.lineNumber,
          empresaId: material.empresaId // Incluir empresaId
        }));
        
        console.log('🔄 Ajustes de materiales nuevos:', ajustesDeMaterialesNuevos);

        // Combinar ajustes existentes con los nuevos materiales
        const todosLosAjustes = [...ajustesPreview, ...ajustesDeMaterialesNuevos];
        console.log('📋 Todos los ajustes combinados:', todosLosAjustes);
        
        // Comparar con sistema y continuar (esto calculará las diferencias)
        const ajustesConDiferencias = compararConSistema(todosLosAjustes);
        console.log('📊 Ajustes con diferencias calculadas:', ajustesConDiferencias);
        
        setAjustesPreview(ajustesConDiferencias);
        setActiveStep(2); // Ir a revisar cambios
        
      } catch (error) {
        console.error('Error creando materiales:', error);
        setErrores([`Error al crear materiales: ${error.message}`]);
        setActiveStep(0);
      } finally {
        setProcessing(false);
      }
    } else {
      // No crear materiales, procesar solo como nombres
      const empresa = await getEmpresaDetailsFromUser(user); // Obtener empresa para materiales sin ID
      
      const ajustesComoNombres = materialesNuevos
        .filter(material => {
          // Filtrar materiales con stock 0 para evitar movimientos innecesarios
          if (material.stockExcel === 0) {
            console.log('⚠️ Material sin crear con stock 0, se omite movimiento:', material.nombre);
            return false;
          }
          return true;
        })
        .map(material => {
          // Buscar el proyecto para obtener su ID
          const proyecto = proyectos.find(p => p.nombre === material.proyectoNombre);
          
          return {
            materialId: null, // Sin ID, se procesará como nombre
            materialNombre: material.nombre,
            sku: material.sku,
            descripcion: material.descripcion,
            stockExcel: material.stockExcel,
            proyectoNombre: material.proyectoNombre,
            proyectoId: material.proyectoNombre === 'Sin asignar' ? null : (proyecto?.id || null),
            lineNumber: material.lineNumber,
            // Campos adicionales para movimientos sin ID
            esSinId: true,
            tipo: material.stockExcel > 0 ? 'INGRESO' : 'EGRESO',
            cantidad: Math.abs(material.stockExcel),
            diferencia: material.stockExcel,
            stockSistema: 0,
            empresaId: empresa.id // ✅ AGREGAR empresaId para materiales sin ID
          };
        });

      console.log('📝 Ajustes como nombres (sin crear materiales):', ajustesComoNombres);

      // Combinar con ajustes existentes procesados
      const ajustesExistentesConDiferencias = compararConSistema(ajustesPreview);
      const todosLosAjustes = [...ajustesExistentesConDiferencias, ...ajustesComoNombres];
      
      setAjustesPreview(todosLosAjustes);
      setActiveStep(2); // Ir a revisar cambios
    }
    
    setShowMaterialesNuevos(false);
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
    const materialesNuevosDetectados = [];

    // Validar estructura del archivo
    const requiredColumns = [
      'Nombre', 'SKU', 'Stock Actual', 'Proyecto'
    ];
    
    // Columnas opcionales
    const optionalColumns = ['ID Material', 'Categoría', 'Subcategoría', 'Descripción'];

    if (!data || data.length === 0) {
      errores.push('El archivo está vacío o no tiene datos válidos');
      return { errores, ajustes, materialesNuevos: materialesNuevosDetectados };
    }

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    if (missingColumns.length > 0) {
      errores.push(`Faltan las siguientes columnas: ${missingColumns.join(', ')}`);
      return { errores, ajustes, materialesNuevos: materialesNuevosDetectados };
    }

    // Procesar cada fila
    data.forEach((row, index) => {
      const lineNumber = index + 2; // +2 porque Excel empieza en 1 y hay header
      
      try {
        const materialId = row['ID Material']?.toString().trim();
        const stockExcel = Number(row['Stock Actual']) || 0;
        const proyectoNombre = row['Proyecto'];
        const materialNombre = row['Nombre']?.toString().trim() || '';
        const categoria = row['Categoría']?.toString().trim() || ''; // Opcional
        const subcategoria = row['Subcategoría']?.toString().trim() || ''; // Opcional
        const sku = row['SKU']?.toString().trim() || '';
        const descripcion = row['Descripción']?.toString().trim() || ''; // Opcional
        
        // Si no tiene ID de material, es un material nuevo potencial
        if (!materialId) {
          if (!materialNombre) {
            errores.push(`Línea ${lineNumber}: Nombre del material es requerido para materiales nuevos`);
            return;
          }
          
          if (!proyectoNombre?.trim()) {
            errores.push(`Línea ${lineNumber}: Proyecto es requerido`);
            return;
          }

          if (!Number.isFinite(stockExcel) || stockExcel < 0) {
            errores.push(`Línea ${lineNumber}: Stock Actual debe ser un número válido mayor o igual a 0`);
            return;
          }
          
          materialesNuevosDetectados.push({
            lineNumber,
            nombre: materialNombre,
            categoria,
            subcategoria,
            sku,
            descripcion,
            stockExcel,
            proyectoNombre,
            fila: row
          });
          return; // No procesamos como ajuste todavía
        }
        
        const ajuste = {
          materialId,
          materialNombre,
          categoria,
          subcategoria,
          sku,
          descripcion,
          stockExcel,
          proyectoNombre,
          lineNumber
        };

        // Validaciones para materiales existentes
        if (!materialNombre) {
          errores.push(`Línea ${lineNumber}: Nombre del material es requerido`);
          return;
        }

        if (!proyectoNombre?.trim()) {
          errores.push(`Línea ${lineNumber}: Proyecto es requerido`);
          return;
        }

        if (!Number.isFinite(stockExcel) || stockExcel < 0) {
          errores.push(`Línea ${lineNumber}: Stock Actual debe ser un número válido mayor o igual a 0`);
          return;
        }

        // Validar que el material existe en el sistema
        const materialExistente = materiales.find(m => m._id === materialId);
        if (!materialExistente) {
          errores.push(`Línea ${lineNumber}: Material con ID ${materialId} no existe en el sistema`);
          return;
        }

        ajustes.push(ajuste);
      } catch (error) {
        errores.push(`Línea ${lineNumber}: Error al procesar - ${error.message}`);
      }
    });

    return { errores, ajustes, materialesNuevos: materialesNuevosDetectados };
  };

  const handleConfirmAjustes = async () => {
    setProcessing(true);
    try {
      // Asegurar que todos los ajustes tengan empresaId
      const empresa = await getEmpresaDetailsFromUser(user);
      
      // Filtrar ajustes con diferencia 0 para evitar errores
      const ajustesValidos = ajustesPreview.filter(ajuste => {
        if (ajuste.diferencia === 0 || ajuste.cantidad === 0) {
          console.log(`⚠️ Omitiendo movimiento con diferencia 0:`, ajuste.materialNombre);
          return false;
        }
        return true;
      });
      
      const ajustesConEmpresa = ajustesValidos.map(ajuste => ({
        ...ajuste,
        empresaId: ajuste.empresaId || empresa.id // Asegurar que siempre tenga empresaId
      }));
      
      const ajustesOmitidos = ajustesPreview.length - ajustesValidos.length;
      
      console.log(`🚀 Enviando ${ajustesValidos.length} ajustes al padre (${ajustesOmitidos} omitidos por diferencia 0):`, ajustesConEmpresa);
      
      await onConfirmAjustes(ajustesConEmpresa);
      setActiveStep(3);
      
      // Auto-cerrar después de 3 segundos
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      console.error('Error al procesar ajustes:', error);
      setErrores([`Error al procesar ajustes: ${error.message}`]);
      setActiveStep(2);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFileData(null);
    setAjustesPreview([]);
    setErrores([]);
    setMaterialesNuevos([]);
    setShowMaterialesNuevos(false);
    setCrearMateriales(false);
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const getTipoColor = (tipo) => {
    return tipo === 'INGRESO' ? 'success' : 'error';
  };

  // Filtrar ajustes válidos para mostrar conteos correctos
  const ajustesValidos = ajustesPreview.filter(a => a.diferencia !== 0 && a.cantidad !== 0);
  const totalIngresos = ajustesValidos.filter(a => a.tipo === 'INGRESO').length;
  const totalEgresos = ajustesValidos.filter(a => a.tipo === 'EGRESO').length;

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
                Seleccione un archivo Excel exportado desde el sistema o creado manualmente para carga inicial. 
                El sistema comparará automáticamente el stock modificado en Excel vs el stock actual del sistema 
                para generar los ajustes necesarios. Para carga inicial, puede dejar la columna "ID Material" 
                vacía y el sistema le permitirá crear los materiales automáticamente.
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

          {/* Step 1: Materiales nuevos detectados */}
          {activeStep === 1 && showMaterialesNuevos && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Se detectaron {materialesNuevos.length} materiales sin ID (nuevos materiales). 
                Para carga inicial de stock, puede crearlos automáticamente en el sistema o 
                procesarlos como texto plano para crear movimientos sin conciliar.
              </Alert>

              <Paper sx={{ maxHeight: 400, overflow: 'auto', mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Línea</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Subcategoría</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Proyecto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materialesNuevos.map((material, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{material.lineNumber}</TableCell>
                        <TableCell><strong>{material.nombre}</strong></TableCell>
                        <TableCell>{material.categoria}</TableCell>
                        <TableCell>{material.subcategoria}</TableCell>
                        <TableCell>{material.sku}</TableCell>
                        <TableCell>{material.descripcion}</TableCell>
                        <TableCell>{material.stockExcel}</TableCell>
                        <TableCell>{material.proyectoNombre}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="primary"
                  disabled={processing}
                  onClick={() => handleMaterialesNuevosConfirmation(true)}
                  startIcon={processing ? <CircularProgress size={16} /> : null}
                >
                  {processing ? 'Creando materiales...' : 'Crear materiales en el sistema'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={processing}
                  onClick={() => handleMaterialesNuevosConfirmation(false)}
                >
                  Procesar como texto plano (sin conciliar)
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 2: Revisar cambios */}
          {activeStep === 2 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Revise cuidadosamente los cambios detectados. El sistema comparó el stock del Excel 
                vs el stock actual del sistema. Se crearán {ajustesValidos.length} movimientos de ajuste
                {ajustesPreview.length !== ajustesValidos.length && 
                  ` (${ajustesPreview.length - ajustesValidos.length} omitidos por diferencia 0)`}.
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
                      <TableCell>Categoría</TableCell>
                      <TableCell>Subcategoría</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Proyecto</TableCell>
                      <TableCell>Stock Sistema</TableCell>
                      <TableCell>Stock Excel</TableCell>
                      <TableCell>Diferencia</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Cantidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ajustesPreview.map((ajuste, idx) => {
                      const seOmite = ajuste.diferencia === 0 || ajuste.cantidad === 0;
                      return (
                        <TableRow 
                          key={idx}
                          sx={{ 
                            opacity: seOmite ? 0.5 : 1,
                            backgroundColor: seOmite ? 'action.hover' : 'transparent'
                          }}
                        >
                          <TableCell>
                            {ajuste.materialNombre}
                            {ajuste.esSinId && <Chip label="Nuevo" size="small" color="info" sx={{ ml: 1 }} />}
                            {seOmite && <Chip label="Omitido" size="small" color="default" sx={{ ml: 1 }} />}
                          </TableCell>
                          <TableCell>{ajuste.categoria}</TableCell>
                          <TableCell>{ajuste.subcategoria}</TableCell>
                          <TableCell>{ajuste.sku}</TableCell>
                          <TableCell>{ajuste.proyectoNombre}</TableCell>
                          <TableCell>{ajuste.stockSistema}</TableCell>
                          <TableCell>{ajuste.stockExcel}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {ajuste.diferencia > 0 ? '+' : ''}{ajuste.diferencia}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {!seOmite && (
                              <Chip 
                                label={ajuste.tipo} 
                                color={getTipoColor(ajuste.tipo)} 
                                size="small" 
                              />
                            )}
                            {seOmite && (
                              <Chip 
                                label="Sin movimiento" 
                                color="default" 
                                size="small" 
                              />
                            )}
                          </TableCell>
                          <TableCell>{seOmite ? '-' : ajuste.cantidad}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* Step 3: Confirmación */}
          {activeStep === 3 && (
            <Box textAlign="center" py={3}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Ajustes procesados exitosamente
              </Typography>
              <Typography color="text.secondary">
                Se han creado {ajustesValidos.length} movimientos de ajuste.
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
        {activeStep === 2 && (
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