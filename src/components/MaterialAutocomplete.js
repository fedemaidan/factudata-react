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
  Alert,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import { debounce } from 'lodash';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';

const MaterialAutocomplete = ({
  user,
  value = '', // id del material seleccionado
  fallbackText = '', // texto a mostrar si no se encuentra el material por ID
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
  
  // Guardar el texto original del remito (no cambia cuando el usuario escribe)
  const [originalRemitoText, setOriginalRemitoText] = useState('');
  
  // Estado para el diálogo de agregar alias
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [aliasDialogData, setAliasDialogData] = useState(null); // { material, originalText }
  const [aliasLoading, setAliasLoading] = useState(false);
  
  // Guardar el texto original del remito cuando se monta el componente o cambia fallbackText
  useEffect(() => {
    if (fallbackText && !originalRemitoText) {
      setOriginalRemitoText(fallbackText.trim());
    }
  }, [fallbackText, originalRemitoText]);

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
          alias: item.alias || [], // Incluir aliases para verificar duplicados
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

  // Buscar material por ID específico cuando se pasa un value inicial
  const loadMaterialById = useCallback(async (materialId) => {
    if (!materialId || !user) return;
    
    try {
      setLoading(true);
      const empresa = await getEmpresaDetailsFromUser(user);
      
      // Buscar el material específico por ID
      const response = await StockMaterialesService.obtenerMaterial({
        empresa_id: empresa.id,
        material_id: materialId
      });
      
      if (response) {
        const material = {
          id: response.id || response._id,
          nombre: response.nombre || '',
          SKU: response.SKU || '',
          desc_material: response.desc_material || '',
          stock: response.stock || 0,
          alias: response.alias || [], // Incluir aliases para verificar duplicados
          label: `${response.nombre || 'Sin nombre'}${response.SKU ? ` - ${response.SKU}` : ''}`
        };
        
        setSelectedMaterial(material);
        setInputValue(material.label);
        setMaterialExists(true);
        
        // Agregar a las opciones si no está
        setOptions(prev => {
          const exists = prev.some(opt => opt.id === materialId);
          return exists ? prev : [material, ...prev];
        });
      }
    } catch (error) {
      console.error('[MaterialAutocomplete] Error cargando material por ID:', error);
      // Si no se puede cargar, usar fallbackText si está disponible
      if (fallbackText) {
        setInputValue(fallbackText);
        setSelectedMaterial(null);
        setMaterialExists(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user, fallbackText]); // Removed options from dependencies

  // Efecto para cargar material por ID cuando se pasa un value inicial
  useEffect(() => {
    if (value && value !== selectedMaterial?.id) {
      // Si tenemos un ID diferente al material actual, buscarlo
      loadMaterialById(value);
    } else if (!value && selectedMaterial) {
      // Si no hay value pero tenemos un material seleccionado, limpiar
      setSelectedMaterial(null);
      setInputValue('');
      setMaterialExists(null);
    } else if (!value && !selectedMaterial && fallbackText && inputValue !== fallbackText) {
      // Si no hay ID pero sí hay fallbackText (nombre del remito sin conciliar), mostrarlo
      setInputValue(fallbackText);
      setMaterialExists(false); // Indicar que NO está conciliado (chip "Nuevo")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, loadMaterialById, fallbackText]); // Agregamos fallbackText como dependencia

  // Encontrar material seleccionado por ID en opciones existentes (solo si no tenemos selectedMaterial)
  useEffect(() => {
    if (value && options.length > 0 && !selectedMaterial) {
      const found = options.find(opt => opt.id === value);
      if (found) {
        setSelectedMaterial(found);
        setInputValue(found.label);
        setMaterialExists(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]); // Removed selectedMaterial from dependencies to avoid circular updates

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
      
      // Usar el texto original del remito (guardado al montar) para proponer como alias
      // NO usar lo que el usuario escribió parcialmente en el input
      const originalText = originalRemitoText || fallbackText?.trim();
      const materialName = newValue.nombre?.trim()?.toLowerCase();
      
      if (originalText && originalText.toLowerCase() !== materialName) {
        // Verificar que no sea ya un alias existente
        const existingAliases = Array.isArray(newValue.alias) 
          ? newValue.alias 
          : (newValue.alias ? [newValue.alias] : []);
        
        const isAlreadyAlias = existingAliases.some(
          a => a?.toLowerCase() === originalText.toLowerCase()
        );
        
        if (!isAlreadyAlias) {
          // Mostrar diálogo para preguntar si agregar como alias
          setAliasDialogData({ material: newValue, originalText });
          setShowAliasDialog(true);
        }
      }
      
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

  // Función para agregar alias al material
  const handleAddAlias = async () => {
    if (!aliasDialogData) return;
    
    const { material, originalText } = aliasDialogData;
    
    try {
      setAliasLoading(true);
      
      // Obtener aliases existentes y agregar el nuevo
      const existingAliases = Array.isArray(material.alias) 
        ? material.alias 
        : (material.alias ? [material.alias] : []);
      
      const newAliases = [...existingAliases, originalText];
      
      // Usar el endpoint específico para agregar alias
      await StockMaterialesService.agregarAlias(material.id, newAliases);
      
      // Actualizar el material local con los nuevos aliases
      const updatedMaterial = { ...material, alias: newAliases };
      setSelectedMaterial(updatedMaterial);
      
      console.log(`✅ Alias "${originalText}" agregado al material "${material.nombre}"`);
      
      setShowAliasDialog(false);
      setAliasDialogData(null);
      
    } catch (error) {
      console.error('Error agregando alias:', error);
      alert(`Error al agregar alias: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setAliasLoading(false);
    }
  };

  // Función para cerrar el diálogo de alias sin agregar
  const handleSkipAlias = () => {
    setShowAliasDialog(false);
    setAliasDialogData(null);
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

      {/* Diálogo para agregar alias al material */}
      <Dialog open={showAliasDialog} onClose={handleSkipAlias} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookmarkAddIcon color="primary" />
          Agregar como Alias
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              El nombre del remito "<strong>{aliasDialogData?.originalText}</strong>" es diferente al material seleccionado "<strong>{aliasDialogData?.material?.nombre}</strong>".
            </Alert>
            <Typography variant="body2" color="text.secondary">
              ¿Deseas agregar "<strong>{aliasDialogData?.originalText}</strong>" como alias de este material? 
              Así la próxima vez se conciliará automáticamente.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSkipAlias} disabled={aliasLoading}>
            No, gracias
          </Button>
          <Button 
            onClick={handleAddAlias} 
            variant="contained" 
            disabled={aliasLoading}
            startIcon={aliasLoading ? <CircularProgress size={16} /> : <BookmarkAddIcon />}
          >
            {aliasLoading ? 'Guardando...' : 'Sí, agregar alias'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MaterialAutocomplete;