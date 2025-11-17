import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';

const ExportarStock = ({ 
  open, 
  onClose, 
  materiales = [], 
  proyectos = [],
  user 
}) => {
  const [selectedProyecto, setSelectedProyecto] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedProyecto) return;

    setExporting(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const proyectoSeleccionado = proyectos.find(p => p.id === selectedProyecto);
      
      // Preparar datos para el Excel
      let dataToExport = [];
      
      if (selectedProyecto === 'TODOS') {
        // Exportar todos los proyectos: crear una fila por cada combinación material-proyecto
        // TODOS los materiales deben aparecer para TODOS los proyectos (incluso con stock 0)
        materiales.forEach(material => {
          proyectos.forEach(proyecto => {
            // Buscar si este material tiene stock en este proyecto específico
            const stockProyecto = material.porProyecto?.find(p => p.proyecto_id === proyecto.id);
            const stockActual = stockProyecto?.stock || 0; // Si no existe, es 0
            
            dataToExport.push({
              'ID Material': material._id,
              'Nombre': material.nombre || '',
              'Categoría': material.categoria || '',
              'Subcategoría': material.subcategoria || '',
              'SKU': material.SKU || '',
              'Descripción': material.desc_material || '',
              'Stock Actual': stockActual,
              'Proyecto': proyecto.nombre
            });
          });
          
          // Agregar también el stock sin asignar
          // Buscar específicamente el proyecto "SIN_ASIGNAR" en porProyecto
          const stockSinAsignarProyecto = material.porProyecto?.find(p => p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null);
          const stockSinAsignar = stockSinAsignarProyecto?.stock || 0;
          
          dataToExport.push({
            'ID Material': material._id,
            'Nombre': material.nombre || '',
            'Categoría': material.categoria || '',
            'Subcategoría': material.subcategoria || '',
            'SKU': material.SKU || '',
            'Descripción': material.desc_material || '',
            'Stock Actual': stockSinAsignar,
            'Proyecto': 'Sin asignar'
          });
        });
      } else if (selectedProyecto === 'SIN_ASIGNAR') {
        // Exportar solo materiales sin asignar a proyecto
        dataToExport = materiales.map(material => {
          // Buscar específicamente el proyecto "SIN_ASIGNAR" en porProyecto
          const stockSinAsignarProyecto = material.porProyecto?.find(p => p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null);
          const stockSinAsignar = stockSinAsignarProyecto?.stock || 0;
          
          return {
            'ID Material': material._id,
            'Nombre': material.nombre || '',
            'Categoría': material.categoria || '',
            'Subcategoría': material.subcategoria || '',
            'SKU': material.SKU || '',
            'Descripción': material.desc_material || '',
            'Stock Actual': stockSinAsignar,
            'Proyecto': 'Sin asignar'
          };
        }).filter(item => item['Stock Actual'] > 0); // Solo incluir los que tengan stock sin asignar
      } else {
        // Exportar proyecto específico
        const proyectoSeleccionado = proyectos.find(p => p.id === selectedProyecto);
        dataToExport = materiales.map(material => {
          const stockProyecto = material.porProyecto?.find(p => p.proyecto_id === selectedProyecto);
          const stockActual = stockProyecto?.stock || 0;
          
          return {
            'ID Material': material._id,
            'Nombre': material.nombre || '',
            'Categoría': material.categoria || '',
            'Subcategoría': material.subcategoria || '',
            'SKU': material.SKU || '',
            'Descripción': material.desc_material || '',
            'Stock Actual': stockActual,
            'Proyecto': proyectoSeleccionado?.nombre || 'Proyecto desconocido'
          };
        });
      }

      // Crear workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Configurar anchos de columnas
      const colWidths = [
        { wch: 25 }, // ID Material
        { wch: 30 }, // Nombre
        { wch: 20 }, // Categoría
        { wch: 20 }, // Subcategoría
        { wch: 15 }, // SKU
        { wch: 40 }, // Descripción
        { wch: 12 }, // Stock Actual
        { wch: 30 }  // Proyecto
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Stock');

      // Agregar hoja de instrucciones
      const instrucciones = [
        { 'Instrucciones para el ajuste de stock': '' },
        { 'Instrucciones para el ajuste de stock': '1. Modifique únicamente la columna "Stock Actual" con los nuevos valores' },
        { 'Instrucciones para el ajuste de stock': '2. NO modifique las demás columnas (ID Material, Nombre, Categoría, Subcategoría, SKU, Descripción, Proyecto)' },
        { 'Instrucciones para el ajuste de stock': '3. Las columnas Categoría, Subcategoría y Descripción son OPCIONALES' },
        { 'Instrucciones para el ajuste de stock': '4. Si modifica campos opcionales, se actualizará el material en el sistema' },
        { 'Instrucciones para el ajuste de stock': '5. El sistema comparará automáticamente:' },
        { 'Instrucciones para el ajuste de stock': '   - Stock actual en el sistema vs Stock actual en el Excel' },
        { 'Instrucciones para el ajuste de stock': '   - Y generará los movimientos de ajuste correspondientes' },
        { 'Instrucciones para el ajuste de stock': '6. Ejemplo: Sistema=0, Excel=20 → Movimiento INGRESO +20' },
        { 'Instrucciones para el ajuste de stock': '7. Ejemplo: Sistema=50, Excel=30 → Movimiento EGRESO -20' },
        { 'Instrucciones para el ajuste de stock': '8. Si exportó "Todos los proyectos", se creará una solicitud por proyecto' },
        { 'Instrucciones para el ajuste de stock': '9. Guarde el archivo y luego impórtelo en el sistema' }
      ];
      
      const wsInstrucciones = XLSX.utils.json_to_sheet(instrucciones);
      wsInstrucciones['!cols'] = [{ wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

      // Generar archivo
      const fileName = selectedProyecto === 'TODOS' 
        ? `Stock_TodosLosProyectos_${new Date().toISOString().split('T')[0]}.xlsx`
        : selectedProyecto === 'SIN_ASIGNAR'
        ? `Stock_SinAsignar_${new Date().toISOString().split('T')[0]}.xlsx`
        : `Stock_${proyectos.find(p => p.id === selectedProyecto)?.nombre || 'Proyecto'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      onClose();
    } catch (error) {
      console.error('Error al exportar:', error);
    } finally {
      setExporting(false);
    }
  };

  const selectedProyectoData = proyectos.find(p => p.id === selectedProyecto);
  
  // Para "TODOS", todos los materiales aparecen (no filtrar por stock)
  const materialesConStock = selectedProyecto === 'TODOS'
    ? materiales // Todos los materiales aparecerán
    : selectedProyecto === 'SIN_ASIGNAR'
    ? materiales.filter(m => {
        const stockSinAsignarProyecto = m.porProyecto?.find(p => p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null);
        return (stockSinAsignarProyecto?.stock || 0) > 0;
      })
    : materiales.filter(m => m.porProyecto?.some(p => p.proyecto_id === selectedProyecto));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DownloadIcon />
          Exportar Stock para Ajuste
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          <Alert severity="info">
            Exporte el stock de un proyecto específico para editarlo en Excel y luego reimportarlo.
            El sistema generará automáticamente los movimientos de ajuste necesarios.
          </Alert>

          <FormControl fullWidth>
            <InputLabel>Seleccionar Proyecto</InputLabel>
            <Select
              value={selectedProyecto}
              label="Seleccionar Proyecto"
              onChange={(e) => setSelectedProyecto(e.target.value)}
            >
              <MenuItem value="TODOS">
                <strong>Todos los proyectos</strong>
              </MenuItem>
              <MenuItem value="SIN_ASIGNAR">
                <em>Sin asignar</em>
              </MenuItem>
              {proyectos.map(proyecto => (
                <MenuItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProyecto && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Resumen de la exportación:
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip 
                  label={selectedProyecto === 'TODOS' ? 'Todos los proyectos' : selectedProyecto === 'SIN_ASIGNAR' ? 'Sin asignar' : `Proyecto: ${selectedProyectoData?.nombre}`} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={`${materialesConStock.length} materiales${selectedProyecto === 'TODOS' ? ' × ' + proyectos.length + ' proyectos' : ' con stock'}`} 
                  color="secondary" 
                  size="small" 
                />
                <Chip 
                  label={selectedProyecto === 'TODOS' ? `${materialesConStock.length * proyectos.length} filas totales` : `${materiales.length} materiales totales`} 
                  color="default" 
                  size="small" 
                />
                {selectedProyecto === 'TODOS' && (
                  <Chip 
                    label={`${proyectos.length} proyectos`} 
                    color="info" 
                    size="small" 
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {selectedProyecto === 'TODOS' 
                  ? 'El archivo Excel incluirá TODOS los materiales para TODOS los proyectos (incluso con stock 0). Esto le permitirá ajustar cualquier material en cualquier proyecto sin necesidad de agregar filas manualmente. Al importar, se creará una solicitud de ajuste por cada proyecto modificado.'
                  : 'El archivo Excel incluirá todos los materiales, permitiéndole ajustar tanto materiales existentes como agregar stock a materiales que actualmente no tienen stock en este proyecto.'
                }
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Cancelar
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={!selectedProyecto || exporting}
          startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
        >
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportarStock;