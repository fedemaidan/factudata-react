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
      const dataToExport = materiales.map(material => {
        // Encontrar el stock del proyecto seleccionado
        const stockProyecto = material.porProyecto?.find(p => p.proyecto_id === selectedProyecto);
        const stockActual = stockProyecto?.stock || 0;
        
        return {
          'ID Material': material._id,
          'Nombre': material.nombre || '',
          'SKU': material.SKU || '',
          'Descripción': material.desc_material || '',
          'Stock Actual': stockActual,
          'Proyecto ID': selectedProyecto
        };
      });

      // Crear workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Configurar anchos de columnas
      const colWidths = [
        { wch: 25 }, // ID Material
        { wch: 30 }, // Nombre
        { wch: 15 }, // SKU
        { wch: 40 }, // Descripción
        { wch: 12 }, // Stock Actual
        { wch: 25 }  // Proyecto ID
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Stock');

      // Agregar hoja de instrucciones
      const instrucciones = [
        { 'Instrucciones para el ajuste de stock': '' },
        { 'Instrucciones para el ajuste de stock': '1. Modifique únicamente la columna "Stock Actual" con los nuevos valores' },
        { 'Instrucciones para el ajuste de stock': '2. NO modifique las demás columnas (ID Material, Nombre, SKU, Descripción, Proyecto ID)' },
        { 'Instrucciones para el ajuste de stock': '3. El sistema comparará automáticamente:' },
        { 'Instrucciones para el ajuste de stock': '   - Stock actual en el sistema vs Stock actual en el Excel' },
        { 'Instrucciones para el ajuste de stock': '   - Y generará los movimientos de ajuste correspondientes' },
        { 'Instrucciones para el ajuste de stock': '4. Ejemplo: Sistema=0, Excel=20 → Movimiento INGRESO +20' },
        { 'Instrucciones para el ajuste de stock': '5. Ejemplo: Sistema=50, Excel=30 → Movimiento EGRESO -20' },
        { 'Instrucciones para el ajuste de stock': '6. Guarde el archivo y luego impórtelo en el sistema' }
      ];
      
      const wsInstrucciones = XLSX.utils.json_to_sheet(instrucciones);
      wsInstrucciones['!cols'] = [{ wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

      // Generar archivo
      const fileName = `Stock_${proyectoSeleccionado?.nombre || 'Proyecto'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      onClose();
    } catch (error) {
      console.error('Error al exportar:', error);
    } finally {
      setExporting(false);
    }
  };

  const selectedProyectoData = proyectos.find(p => p.id === selectedProyecto);
  const materialesConStock = materiales.filter(m => 
    m.porProyecto?.some(p => p.proyecto_id === selectedProyecto)
  );

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
                  label={`Proyecto: ${selectedProyectoData?.nombre}`} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={`${materialesConStock.length} materiales con stock`} 
                  color="secondary" 
                  size="small" 
                />
                <Chip 
                  label={`${materiales.length} materiales totales`} 
                  color="default" 
                  size="small" 
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                El archivo Excel incluirá todos los materiales, permitiéndole ajustar tanto 
                materiales existentes como agregar stock a materiales que actualmente no 
                tienen stock en este proyecto.
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