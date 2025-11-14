// src/components/MaterialAutocomplete.js
import { useState, useEffect, useCallback } from 'react';
import { 
  Autocomplete, 
  TextField, 
  Box, 
  Typography,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { debounce } from 'lodash';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';

const MaterialAutocomplete = ({
  user,
  value = '', // id del material seleccionado
  onTextChange = () => {}, // (texto) => void - cuando se escribe texto libre
  onMaterialSelect = () => {}, // (materialObj) => void - cuando se selecciona un material completo
  onMaterialCreated = () => {}, // (materialCreado) => void - cuando se crea un material nuevo
  label = 'Material',
  disabled = false,
  fullWidth = true,
  placeholder = 'Buscar material o escribir nombre...',
  showCreateOption = true, // Permitir crear materiales nuevos
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialExists, setMaterialExists] = useState(null); // true/false/null
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Buscar materiales con debounce
  const searchMaterials = useCallback(
    debounce(async (query) => {
      if (!user || !query?.trim()) {
        setOptions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const empresa = await getEmpresaDetailsFromUser(user);
        
        const response = await StockMaterialesService.listarMateriales({
          empresa_id: empresa.id,
          nombre: query.trim(),
          limit: 10,
          page: 0
        });

        const materials = (response.items || []).map(item => ({
          id: item.id || item._id,
          nombre: item.nombre || '',
          SKU: item.SKU || '',
          desc_material: item.desc_material || '',
          stock: item.stock || 0,
          label: `${item.nombre || 'Sin nombre'}${item.SKU ? ` - ${item.SKU}` : ''}`
        }));

        setOptions(materials);
      } catch (error) {
        console.error('[MaterialAutocomplete] Error buscando materiales:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [user]
  );

  // Efecto para buscar cuando cambia el input
  useEffect(() => {
    if (inputValue && inputValue.length >= 2) {
      searchMaterials(inputValue);
    } else {
      setOptions([]);
      setLoading(false);
    }
  }, [inputValue, searchMaterials]);

  // Encontrar material seleccionado por ID
  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find(opt => opt.id === value);
      if (found) {
        setSelectedMaterial(found);
        setInputValue(found.label);
      }
    } else if (!value) {
      setSelectedMaterial(null);
    }
  }, [value, options]);

  const handleInputChange = (event, newInputValue, reason) => {
    setInputValue(newInputValue);
    
    // Si el usuario está escribiendo libremente (no seleccionó una opción)
    if (reason === 'input') {
      // Limpiar selección de material
      setSelectedMaterial(null);
      onTextChange(newInputValue); // actualizar nombre_item
      
      // Determinar si el material existe
      if (newInputValue.trim().length >= 2) {
        const exists = options.some(opt => 
          opt.nombre.toLowerCase() === newInputValue.trim().toLowerCase()
        );
        setMaterialExists(exists);
      } else {
        setMaterialExists(null);
      }
    }
  };

  const handleChange = (event, newValue, reason) => {
    if (reason === 'selectOption' && newValue) {
      // Usuario seleccionó un material de la lista
      setSelectedMaterial(newValue);
      setInputValue(newValue.label);
      setMaterialExists(true);
      onMaterialSelect(newValue); // callback completo
    } else if (reason === 'clear') {
      // Usuario limpió la selección
      setSelectedMaterial(null);
      setInputValue('');
      setMaterialExists(null);
      onTextChange(''); // limpiar nombre_item
    }
  };

  // Función para crear material nuevo
  const handleCreateMaterial = async () => {
    if (!inputValue.trim()) return;

    try {
      setCreateLoading(true);
      const empresa = await getEmpresaDetailsFromUser(user);
      
      const nuevoMaterial = {
        nombre: inputValue.trim(),
        empresa_id: empresa.id,
        SKU: null,
        desc_material: null,
        alias: null,
        empresa_nombre: empresa.nombre || null
      };

      const materialCreado = await StockMaterialesService.crearMaterial(nuevoMaterial);
      
      // Crear objeto para usar en el componente
      const materialObj = {
        id: materialCreado.data?.id_material || materialCreado.data?._id || materialCreado._id || materialCreado.id,
        nombre: nuevoMaterial.nombre,
        SKU: '',
        desc_material: '',
        stock: 0,
        label: nuevoMaterial.nombre
      };

      setSelectedMaterial(materialObj);
      setMaterialExists(true);
      setShowCreateDialog(false);
      
      // Notificar que se creó el material
      onMaterialCreated(materialObj);
      onMaterialSelect(materialObj);
      
    } catch (error) {
      console.error('Error creando material:', error);
      alert(`Error al crear material: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  // Determinar el color del texto basado en si el material existe
  const getTextColor = () => {
    if (selectedMaterial || materialExists === true) return 'success.main';
    if (materialExists === false && inputValue.trim().length >= 2) return 'error.main';
    return 'text.primary';
  };

  return (
    <>
      <Autocomplete
        freeSolo // Permite entrada libre de texto
        options={options}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.label || option.nombre || '';
        }}
        value={selectedMaterial}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleChange}
        loading={loading}
        disabled={disabled}
        fullWidth={fullWidth}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            sx={{
              '& .MuiInputBase-input': {
                color: getTextColor(),
                fontWeight: selectedMaterial ? 600 : 400,
              }
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Botón para crear material si no existe */}
                  {showCreateOption && materialExists === false && inputValue.trim().length >= 2 && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setShowCreateDialog(true)}
                      color="primary"
                      variant="outlined"
                      sx={{ 
                        minWidth: 'auto', 
                        px: 1, 
                        fontSize: '0.75rem',
                        height: 24
                      }}
                    >
                      Crear
                    </Button>
                  )}
                  {/* Indicador de estado */}
                  {selectedMaterial && (
                    <Chip 
                      label="✓" 
                      size="small" 
                      color="success" 
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {materialExists === false && inputValue.trim().length >= 2 && (
                    <Chip 
                      label="Nuevo" 
                      size="small" 
                      color="error" 
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </Box>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2">
                <strong>{option.nombre}</strong>
                {option.SKU && (
                  <Chip 
                    label={option.SKU} 
                    size="small" 
                    sx={{ ml: 1, height: 20 }} 
                  />
                )}
              </Typography>
              {option.desc_material && (
                <Typography variant="caption" color="text.secondary">
                  {option.desc_material}
                </Typography>
              )}
              <Typography variant="caption" color="primary">
                Stock: {option.stock}
              </Typography>
            </Box>
          </Box>
        )}
        noOptionsText={
          inputValue.length < 2 
            ? "Escribe al menos 2 caracteres para buscar"
            : materialExists === false
            ? `Material "${inputValue}" no existe. Puedes crearlo.`
            : "No se encontraron materiales."
        }
      />

      {/* Diálogo para confirmar creación de material */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Material Nuevo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              El material "<strong>{inputValue}</strong>" no existe en el sistema. ¿Deseas crearlo?
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Se creará un material básico con este nombre. Podrás editarlo después para agregar más detalles.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)} disabled={createLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateMaterial} 
            variant="contained" 
            disabled={createLoading}
            startIcon={createLoading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {createLoading ? 'Creando...' : 'Crear Material'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MaterialAutocomplete;