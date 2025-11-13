import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';

export default function MaterialAutocomplete({ 
  value, // material_id
  onChange, 
  onMaterialSelect,
  onTextChange,
  user, 
  label = 'Material',
  disabled = false,
  fullWidth = true 
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Cargar material existente cuando cambia el value
  useEffect(() => {
    // Si no hay value, limpiar selección
    if (!value || !user) {
      setSelectedMaterial(null);
      setSearchInput('');
      return;
    }

    // Si ya tenemos ese material seleccionado, no recargar
    if (selectedMaterial && selectedMaterial.id === value) {
      return;
    }

    const loadExistingMaterial = async () => {
      setIsLoadingExisting(true);
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const resp = await StockMaterialesService.obtenerMaterial({ 
          empresa_id: empresa.id, 
          material_id: value 
        });
        
        if (resp) {
          const materialOption = {
            id: resp._id || resp.id_material || resp.id || '',
            label: `${resp.nombre || '(sin nombre)'} - ${resp.SKU || '—'} - ${resp.desc_material || ''}`.trim(),
            nombre: resp.nombre || '',
            sku: resp.SKU || '',
            descripcion: resp.desc_material || '',
            _raw: resp,
          };
          setSelectedMaterial(materialOption);
          setSearchInput(materialOption.nombre);
        } else {
          console.warn('[MaterialAutocomplete] No se encontró material con id:', value);
          setSelectedMaterial(null);
          setSearchInput('');
        }
      } catch (e) {
        console.error('[MaterialAutocomplete] Error cargando material existente:', e);
        setSelectedMaterial(null);
        setSearchInput('');
      } finally {
        setIsLoadingExisting(false);
      }
    };

    loadExistingMaterial();
  }, [user, value]); // Eliminamos selectedMaterial de las dependencias para evitar loop

  // Buscar materiales según el input
  useEffect(() => {
    if (!user || !searchInput?.trim()) {
      setOptions([]);
      return;
    }

    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const params = {
          empresa_id: empresa.id,
          nombre: searchInput.trim(),
          limit: 20,
          page: 0,
          sort: 'nombre:asc',
        };
        const resp = await StockMaterialesService.listarMateriales(params);
        const items = (resp.items || []).map(m => ({
          id: m._id || m.id_material || m.id || '',
          label: `${m.nombre || '(sin nombre)'} - ${m.SKU || '—'} - ${m.desc_material || ''}`.trim(),
          nombre: m.nombre || '',
          sku: m.SKU || '',
          descripcion: m.desc_material || '',
          _raw: m,
        }));
        setOptions(items);
      } catch (e) {
        console.error('[MaterialAutocomplete] Error en búsqueda:', e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchMaterials, 400);
    return () => clearTimeout(timer);
  }, [user, searchInput]);

  return (
    <Autocomplete
      fullWidth={fullWidth}
      options={options}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option?.nombre || option?.label || '(sin nombre)';
      }}
      isOptionEqualToValue={(option, value) => {
        if (!option || !value) return false;
        return option.id === value.id;
      }}
      value={selectedMaterial}
      onChange={(e, newValue) => {
        setSelectedMaterial(newValue);
        if (newValue) {
          onChange(newValue.id || '');
          if (onMaterialSelect) {
            onMaterialSelect(newValue);
          }
        } else {
          onChange('');
          if (onTextChange) {
            onTextChange('');
          }
        }
      }}
      onInputChange={(e, val, reason) => {
        // Solo actualizar searchInput si el usuario está escribiendo
        if (reason === 'input') {
          setSearchInput(val);
          if (onTextChange && !val) {
            onTextChange('');
          }
        }
        // Si el reason es 'reset', mantener el searchInput actual
      }}
      inputValue={searchInput}
      loading={loading || isLoadingExisting}
      disabled={disabled}
      freeSolo={false}
      selectOnFocus
      clearOnBlur={false}
      handleHomeEndKeys
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Buscar por nombre, SKU o descripción…"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(loading || isLoadingExisting) ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box {...props} component="li" key={option.id}>
          <Box>
            <Typography variant="body2" fontWeight={600}>{option.nombre}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              SKU: {option.sku || '—'} | {option.descripcion || '—'}
            </Typography>
          </Box>
        </Box>
      )}
      noOptionsText="Sin materiales. Buscá por nombre, SKU o descripción."
    />
  );
}