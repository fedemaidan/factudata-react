import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  IconButton,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import importMovimientosService from 'src/services/importMovimientosService';

const PasoRevisarCategorias = forwardRef(({
  empresa,
  wizardData,
  updateWizardData,
  onNext,
  onBack,
  setLoading,
  setError,
  hideNavigation = false,
}, ref) => {
  const [mapeosCategorias, setMapeosCategorias] = useState([]);
  const [mapeosSubcategorias, setMapeosSubcategorias] = useState([]);
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [editandoSubcategoria, setEditandoSubcategoria] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState('');
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);
  const [agregandoSubcategoria, setAgregandoSubcategoria] = useState(null);
  const [especificacionUsuario, setEspecificacionUsuario] = useState('');

  useEffect(() => {
    if (wizardData.analisisCsv && empresa.categorias) {
      // Inicializar el estado con la especificación del wizardData si existe
      const especificacionExistente = wizardData.analisisCsv?._especificacionUsuario || '';
      setEspecificacionUsuario(especificacionExistente);
      
      cargarAnalisisCategorias();
    }
  }, [wizardData.analisisCsv, empresa.categorias, empresa.subcategorias]);

  const cargarAnalisisCategorias = async (especificacionPersonalizada = null) => {
    try {
      setLoading(true);
      console.log('[PasoRevisarCategorias] Extrayendo categorías de archivos subidos');
      
      const archivosUrls = wizardData.analisisCsv?._archivosUrls;
      const empresaId = wizardData.analisisCsv?._empresaId || empresa.id;
      
      // Usar especificación personalizada si se proporciona, sino la del wizardData
      const especificacionFinal = especificacionPersonalizada !== null 
        ? especificacionPersonalizada 
        : (wizardData.analisisCsv?._especificacionUsuario || '');
      
      console.log('[PasoRevisarCategorias] Especificación a usar:', especificacionFinal);
      
      if (!archivosUrls || archivosUrls.length === 0) {
        throw new Error('No se encontraron URLs de archivos. Regrese al paso anterior.');
      }
      
      // Extraer categorías específicamente del backend
      const analisisCategorias = await importMovimientosService.extraerCategorias(
        archivosUrls,
        empresaId, 
        especificacionFinal
      );
      
      console.log('[PasoRevisarCategorias] Categorías extraídas:', analisisCategorias);
      console.log('[PasoRevisarCategorias] Categorías extraídas - STRINGIFY:', JSON.stringify(analisisCategorias, null, 2));
      
      // El controller envuelve los datos en una estructura {success, message, data}
      // Necesitamos extraer los datos reales
      const datosReales = analisisCategorias.data || analisisCategorias;
      
      console.log('[PasoRevisarCategorias] Datos reales extraídos:', datosReales);
      
      if (!datosReales.success) {
        throw new Error(datosReales.error || 'Error extrayendo categorías');
      }
      
      // DEBUG: Logs para diagnosticar el problema
      console.log('[PasoRevisarCategorias] DEBUG - categorias_detectadas:', datosReales.categorias_detectadas);
      console.log('[PasoRevisarCategorias] DEBUG - subcategorias_detectadas:', datosReales.subcategorias_detectadas);
      console.log('[PasoRevisarCategorias] DEBUG - relacion_categoria_subcategoria:', datosReales.relacion_categoria_subcategoria);
      console.log('[PasoRevisarCategorias] DEBUG - datosReales COMPLETOS:', JSON.stringify(datosReales, null, 2));
      
      // Usar la comparación que ya viene del backend
      const comparacion = datosReales.comparacion || { categorias: [], subcategorias: [] };
      
      // El backend ahora devuelve la relación directa en analisisCategorias
      let categorias_detectadas = datosReales.categorias_detectadas || [];
      let subcategorias_detectadas = datosReales.subcategorias_detectadas || [];
      let relacion_categoria_subcategoria = datosReales.relacion_categoria_subcategoria || {};
      
      // Validar que las categorías detectadas son strings válidos
      categorias_detectadas = categorias_detectadas.filter(cat => 
        cat && typeof cat === 'string' && cat.trim() !== ''
      );
      
      // Validar que las subcategorías detectadas son strings válidos
      subcategorias_detectadas = subcategorias_detectadas.filter(sub => 
        sub && typeof sub === 'string' && sub.trim() !== ''
      );
      
      console.log('[PasoRevisarCategorias] DEBUG - categorias_detectadas validadas:', categorias_detectadas);
      console.log('[PasoRevisarCategorias] DEBUG - subcategorias_detectadas validadas:', subcategorias_detectadas);
      
      // FALLBACK: Si los arrays principales están vacíos, usar datos de comparacion
      if (categorias_detectadas.length === 0 && comparacion.categorias && comparacion.categorias.length > 0) {
        console.log('[PasoRevisarCategorias] Usando datos de comparacion como fallback');
        categorias_detectadas = comparacion.categorias.map(cat => {
          // Manejar diferentes formatos: string, {nombre}, {name}
          if (typeof cat === 'string') return cat;
          return cat.nombre || cat.name || '';
        }).filter(c => c && c.trim());
        console.log('[PasoRevisarCategorias] Categorías obtenidas de comparacion:', categorias_detectadas);
      }
      
      if (subcategorias_detectadas.length === 0 && comparacion.subcategorias && comparacion.subcategorias.length > 0) {
        subcategorias_detectadas = comparacion.subcategorias.map(sub => {
          // Manejar diferentes formatos: string, {nombre}, {name}
          if (typeof sub === 'string') return sub;
          return sub.nombre || sub.name || '';
        }).filter(s => s && s.trim());
        console.log('[PasoRevisarCategorias] Subcategorías obtenidas de comparacion:', subcategorias_detectadas);
      }
      
      // Construir relación desde comparacion si está vacía
      if (Object.keys(relacion_categoria_subcategoria).length === 0) {
        console.log('[PasoRevisarCategorias] Construyendo relación desde comparacion');
        
        // Inicializar todas las categorías con arrays vacíos
        categorias_detectadas.forEach(catNombre => {
          relacion_categoria_subcategoria[catNombre] = [];
        });
        
        // Agregar subcategorías a sus categorías correspondientes
        subcategorias_detectadas.forEach(subNombre => {
          // Por ahora, todas las subcategorías van sin categoría padre específica
          // porque el backend no está devolviendo esta relación correctamente
        });
        
        console.log('[PasoRevisarCategorias] Relación construida:', relacion_categoria_subcategoria);
      } else {
        console.log('[PasoRevisarCategorias] Usando relación del backend directamente:', relacion_categoria_subcategoria);
      }
      
      console.log('[PasoRevisarCategorias] DEBUG - categorias procesadas:', categorias_detectadas.length);
      console.log('[PasoRevisarCategorias] DEBUG - subcategorias procesadas:', subcategorias_detectadas.length);
      console.log('[PasoRevisarCategorias] DEBUG - relaciones procesadas:', Object.keys(relacion_categoria_subcategoria).length);
      
      // Crear el mapeo correcto usando la relación del backend
      const categoriasConSubcategorias = categorias_detectadas.map(nombreCategoria => {
        const subcategoriasDeEstaCategoria = (relacion_categoria_subcategoria[nombreCategoria] || []).map(subNombre => {
          // Validar que subNombre existe y no es undefined
          if (!subNombre || typeof subNombre !== 'string') {
            console.warn(`[PasoRevisarCategorias] subNombre inválido:`, subNombre);
            return null;
          }
          
          // Buscar si existe como subcategoría independiente
          const subcategoriaIndependiente = empresa.subcategorias?.find(sub => 
            sub?.name && sub.name.toLowerCase() === subNombre.toLowerCase()
          );
          
          // Buscar si existe como subcategoría anidada en alguna categoría
          let subcategoriaAnidada = null;
          if (!subcategoriaIndependiente && empresa.categorias) {
            for (const categoria of empresa.categorias) {
              if (categoria.subcategorias) {
                subcategoriaAnidada = categoria.subcategorias.find(sub => {
                  // Manejar tanto strings como objetos
                  const subName = typeof sub === 'string' ? sub : sub?.name;
                  return subName && subName.toLowerCase() === subNombre.toLowerCase();
                });
                if (subcategoriaAnidada) break;
              }
            }
          }
          
          const subcategoriaExistente = subcategoriaIndependiente || subcategoriaAnidada;
          
          // Obtener el nombre de la subcategoría existente (puede ser string u objeto)
          const nombreExistente = subcategoriaExistente 
            ? (typeof subcategoriaExistente === 'string' ? subcategoriaExistente : subcategoriaExistente.name)
            : subNombre;
          
          return {
            nombre: subNombre,
            estado: subcategoriaExistente ? 'existe' : 'nueva',
            accion: subcategoriaExistente ? 'usar_existente' : 'crear_nueva', 
            mapeoA: nombreExistente,
            categoria_padre: nombreCategoria
          };
        }).filter(sub => sub !== null); // Filtrar elementos inválidos
        
        console.log(`[PasoRevisarCategorias] DEBUG - Categoria "${nombreCategoria}" tiene ${subcategoriasDeEstaCategoria.length} subcategorías:`, subcategoriasDeEstaCategoria);
        
        // Buscar si la categoría existe en la empresa
        const categoriaExistente = empresa.categorias?.find(cat => 
          cat?.name && nombreCategoria && cat.name.toLowerCase() === nombreCategoria.toLowerCase()
        );
        
        return {
          nombre: nombreCategoria,
          estado: categoriaExistente ? 'existe' : 'nueva',
          accion: categoriaExistente ? 'usar_existente' : 'crear_nueva',
          mapeoA: categoriaExistente ? categoriaExistente.name : nombreCategoria,
          subcategorias: subcategoriasDeEstaCategoria
        };
      });
      
      console.log('[PasoRevisarCategorias] DEBUG - categoriasConSubcategorias final:', categoriasConSubcategorias);
      
      
      setMapeosCategorias(categoriasConSubcategorias);
      
      // Las subcategorías ahora están incluidas en las categorías
      const todasSubcategorias = Object.values(relacion_categoria_subcategoria).flat().map(subNombre => ({
        nombre: subNombre,
        estado: 'nueva'
      }));
      
      console.log('[PasoRevisarCategorias] DEBUG - todasSubcategorias:', todasSubcategorias);
      
      setMapeosSubcategorias(todasSubcategorias);
      
      // Si se usó una especificación personalizada, actualizar el wizardData
      if (especificacionPersonalizada !== null) {
        updateWizardData({
          analisisCsv: {
            ...wizardData.analisisCsv,
            _especificacionUsuario: especificacionPersonalizada
          }
        });
      }
      
    } catch (error) {
      console.error('[PasoRevisarCategorias] Error cargando análisis:', error);
      setError(`Error cargando categorías: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCambioAccion = (index, nuevaAccion) => {
    const nuevosMapeos = [...mapeosCategorias];
    nuevosMapeos[index].accion = nuevaAccion;
    
    if (nuevaAccion === 'crear_nueva') {
      nuevosMapeos[index].mapeoA = nuevosMapeos[index].nombre;
      nuevosMapeos[index].categoriaDestino = null;
    } else if (nuevaAccion === 'mapear_a_existente') {
      // Limpiar mapeoA y preparar para seleccionar categoría destino
      nuevosMapeos[index].mapeoA = null;
      nuevosMapeos[index].categoriaDestino = null;
    }
    
    setMapeosCategorias(nuevosMapeos);
  };

  const handleCambioCategoriaDestino = (index, categoriaDestino) => {
    const nuevosMapeos = [...mapeosCategorias];
    nuevosMapeos[index].categoriaDestino = categoriaDestino;
    setMapeosCategorias(nuevosMapeos);
  };

  const handleCambioMapeo = (index, nuevoMapeo) => {
    const nuevosMapeos = [...mapeosCategorias];
    nuevosMapeos[index].mapeoA = nuevoMapeo;
    setMapeosCategorias(nuevosMapeos);
  };

  const handleEditarCategoria = (index) => {
    setEditandoCategoria(index);
    setNuevaCategoria(mapeosCategorias[index].mapeoA);
  };

  const handleGuardarEdicion = () => {
    if (nuevaCategoria.trim()) {
      const nuevosMapeos = [...mapeosCategorias];
      nuevosMapeos[editandoCategoria].nombre = nuevaCategoria.trim();
      nuevosMapeos[editandoCategoria].estado = 'nueva';
      nuevosMapeos[editandoCategoria].accion = 'crear_nueva';
      nuevosMapeos[editandoCategoria].mapeoA = nuevaCategoria.trim();
      setMapeosCategorias(nuevosMapeos);
    }
    setEditandoCategoria(null);
    setNuevaCategoria('');
  };

  const handleCancelarEdicion = () => {
    setEditandoCategoria(null);
    setEditandoSubcategoria(null);
    setNuevaCategoria('');
    setNuevaSubcategoria('');
  };

  const handleGuardarEdicionSubcategoria = (categoriaIndex, subcategoriaIndex) => {
    if (nuevaSubcategoria.trim()) {
      const nuevosMapeos = [...mapeosCategorias];
      nuevosMapeos[categoriaIndex].subcategorias[subcategoriaIndex].nombre = nuevaSubcategoria.trim();
      nuevosMapeos[categoriaIndex].subcategorias[subcategoriaIndex].estado = 'nueva';
      nuevosMapeos[categoriaIndex].subcategorias[subcategoriaIndex].accion = 'crear_nueva';
      nuevosMapeos[categoriaIndex].subcategorias[subcategoriaIndex].mapeoA = nuevaSubcategoria.trim();
      setMapeosCategorias(nuevosMapeos);
    }
    setEditandoSubcategoria(null);
    setNuevaSubcategoria('');
  };

  const handleEliminarCategoria = (index) => {
    const nuevosMapeos = mapeosCategorias.filter((_, i) => i !== index);
    setMapeosCategorias(nuevosMapeos);
  };

  const handleEliminarSubcategoria = (categoriaIndex, subcategoriaIndex) => {
    const nuevosMapeos = [...mapeosCategorias];
    nuevosMapeos[categoriaIndex].subcategorias = nuevosMapeos[categoriaIndex].subcategorias.filter((_, i) => i !== subcategoriaIndex);
    setMapeosCategorias(nuevosMapeos);
  };

  const handleAgregarCategoria = () => {
    if (nuevaCategoria.trim()) {
      const nuevaCategoriaMapeada = {
        nombre: nuevaCategoria.trim(),
        estado: 'nueva',
        coincidencia: null,
        confianza: 0,
        subcategorias: []
      };
      setMapeosCategorias([...mapeosCategorias, nuevaCategoriaMapeada]);
      setNuevaCategoria('');
      setAgregandoCategoria(false);
    }
  };

  const handleAgregarSubcategoria = (categoriaIndex) => {
    if (nuevaSubcategoria.trim()) {
      const nuevosMapeos = [...mapeosCategorias];
      const nuevaSubcategoriaMapeada = {
        nombre: nuevaSubcategoria.trim(),
        estado: 'nueva',
        coincidencia: null,
        confianza: 0,
        categoria_padre: nuevosMapeos[categoriaIndex].nombre
      };
      nuevosMapeos[categoriaIndex].subcategorias.push(nuevaSubcategoriaMapeada);
      setMapeosCategorias(nuevosMapeos);
      setNuevaSubcategoria('');
      setAgregandoSubcategoria(null);
    }
  };

  const handleContinuar = useCallback(async ({ skipOnNext = false } = {}) => {
    try {
      setLoading(true);
      console.log('[PasoRevisarCategorias] Persistiendo categorías y subcategorías');
      
      const empresaId = wizardData.analisisCsv?._empresaId || empresa.id;
      
      // MANTENER LA ESTRUCTURA JERÁRQUICA: No aplanar los datos
      const mapeosCategoriasCompletos = mapeosCategorias.map(categoria => ({
        nombre: categoria.nombre,
        mapeoA: categoria.mapeoA || categoria.nombre,
        accion: categoria.accion || (categoria.estado === 'nueva' ? 'crear_nueva' : 'usar_existente'),
        estado: categoria.estado,
        subcategorias: (categoria.subcategorias || []).map(subcategoria => ({
          nombre: subcategoria.nombre,
          mapeoA: subcategoria.mapeoA || subcategoria.nombre,
          accion: subcategoria.accion || (subcategoria.estado === 'nueva' ? 'crear_nueva' : 'usar_existente'),
          estado: subcategoria.estado,
          categoria_padre: categoria.nombre
        }))
      }));
      
      // Subcategorías independientes (que no están asociadas a ninguna categoría específica)
      const mapeosSubcategoriasIndependientes = mapeosSubcategorias.filter(sub => 
        !sub.categoria_padre || sub.categoria_padre === ''
      ).map(mapeo => ({
        nombre: mapeo.nombre,
        mapeoA: mapeo.mapeoA || mapeo.nombre,
        accion: mapeo.accion || (mapeo.estado === 'nueva' ? 'crear_nueva' : 'usar_existente'),
        estado: mapeo.estado
      }));
      
      console.log('[PasoRevisarCategorias] mapeosCategoriasCompletos:', mapeosCategoriasCompletos);
      console.log('[PasoRevisarCategorias] mapeosSubcategoriasIndependientes:', mapeosSubcategoriasIndependientes);
      
      // Persistir categorías y subcategorías en el backend
      const resultadoPersistencia = await importMovimientosService.persistirCategorias(
        empresaId,
        mapeosCategoriasCompletos,
        mapeosSubcategoriasIndependientes
      );
      
      console.log('[PasoRevisarCategorias] Persistencia exitosa:', resultadoPersistencia);
      
      // Actualizar wizard data con los mapeos finales
      updateWizardData({ 
        mapeosCategorias: mapeosCategoriasCompletos,
        mapeosSubcategorias: mapeosSubcategoriasIndependientes,
        categoriasPersistidas: true,
        mapeosFinaleCategorias: resultadoPersistencia.mapeos_finales
      });
      
      if (!skipOnNext) {
        onNext();
      }
    } catch (error) {
      console.error('[PasoRevisarCategorias] Error persistiendo:', error);
      setError(`Error persistiendo categorías: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    mapeosCategorias,
    mapeosSubcategorias,
    wizardData,
    empresa,
    updateWizardData,
    onNext,
    setLoading,
    setError,
  ]);

  useImperativeHandle(ref, () => ({
    submitStep: () => handleContinuar({ skipOnNext: true }),
  }), [handleContinuar]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'nueva': return 'warning';
      default: return 'success'; // Para 'existe' o cualquier otro estado
    }
  };

  const getAccionColor = (accion) => {
    switch (accion) {
      case 'usar_existente': return 'success';
      case 'crear_nueva': return 'info';
      case 'mapear_a_existente': return 'secondary';
      default: return 'default';
    }
  };

  // Recalcular contadores dinámicamente basado en el estado actual
  const categoriasACrear = mapeosCategorias.filter(m => m.accion === 'crear_nueva').length;
  const categoriasExistentes = mapeosCategorias.filter(m => m.accion === 'usar_existente' && m.estado !== 'nueva').length;
  const categoriasMapeadas = mapeosCategorias.filter(m => m.accion === 'mapear_a_existente').length;
  const todasSubcategorias = mapeosCategorias.flatMap(cat => cat.subcategorias || []);
  const subcategoriasACrear = todasSubcategorias.filter(m => m.accion === 'crear_nueva').length;
  const subcategoriasExistentes = todasSubcategorias.filter(m => m.accion === 'usar_existente' && m.estado !== 'nueva').length;

  return (
    <Box>
      {/* Campo de especificaciones del usuario */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Especificaciones adicionales (opcional)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Proporciona instrucciones específicas para el análisis de categorías. Ejemplo: "las categorías están como CAT-'categoria real', no tomes en cuenta el CAT-"
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={especificacionUsuario}
            onChange={(e) => setEspecificacionUsuario(e.target.value)}
            placeholder="Ej: Las categorías tienen el prefijo 'CAT-' que debe ignorarse, las subcategorías aparecen en otra columna..."
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              console.log('[PasoRevisarCategorias] Reanalizar con nueva especificación:', especificacionUsuario);
              cargarAnalisisCategorias(especificacionUsuario.trim());
            }}
            disabled={!especificacionUsuario.trim()}
          >
            Volver a analizar con especificaciones
          </Button>
        </CardContent>
      </Card>

      {/* Resumen */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {mapeosCategorias.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categorías
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main">
                {todasSubcategorias.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Subcategorías
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {categoriasExistentes + subcategoriasExistentes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usar existentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {categoriasACrear + subcategoriasACrear}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crear nuevas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {categoriasMapeadas > 0 && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'secondary.light' }}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="secondary.dark">
                  🔄 {categoriasMapeadas} categoría(s) se mapearán a existentes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estas categorías del archivo se interpretarán como categorías existentes de tu empresa
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {(categoriasACrear > 0 || subcategoriasACrear > 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Se crearán {categoriasACrear} categorías y {subcategoriasACrear} subcategorías nuevas en tu empresa.
        </Alert>
      )}

      {/* Tabla de categorías y subcategorías */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Categorías y Subcategorías detectadas
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setAgregandoCategoria(true)}
              variant="outlined"
              size="small"
            >
              Agregar Categoría
            </Button>
          </Box>
          
          {agregandoCategoria && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <TextField
                label="Nueva categoría"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                size="small"
                sx={{ mr: 2 }}
              />
              <Button
                onClick={handleAgregarCategoria}
                variant="contained"
                size="small"
                sx={{ mr: 1 }}
              >
                Agregar
              </Button>
              <Button
                onClick={() => {
                  setAgregandoCategoria(false);
                  setNuevaCategoria('');
                }}
                variant="outlined"
                size="small"
              >
                Cancelar
              </Button>
            </Box>
          )}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Categoría / Subcategoría</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mapeosCategorias.map((categoria, categoriaIndex) => (
                  <React.Fragment key={categoriaIndex}>
                    {/* Fila de la categoría */}
                    <TableRow>
                      <TableCell>
                        {editandoCategoria === categoriaIndex ? (
                          <TextField
                            value={nuevaCategoria}
                            onChange={(e) => setNuevaCategoria(e.target.value)}
                            size="small"
                            autoFocus
                          />
                        ) : (
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            📁 {categoria.nombre}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Chip
                            icon={categoria.estado !== 'nueva' ? <CheckCircleIcon /> : <WarningIcon />}
                            label={
                              categoria.accion === 'mapear_a_existente' 
                                ? 'Mapear a existente' 
                                : (categoria.estado !== 'nueva' ? 'Existe en Sorby' : 'Nueva - Se creará')
                            }
                            color={
                              categoria.accion === 'mapear_a_existente' 
                                ? 'secondary' 
                                : getEstadoColor(categoria.estado)
                            }
                            size="small"
                          />
                          
                          {/* Selector para categorías nuevas: crear o mapear */}
                          {categoria.estado === 'nueva' && (
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                              <Select
                                value={categoria.accion || 'crear_nueva'}
                                onChange={(e) => handleCambioAccion(categoriaIndex, e.target.value)}
                                size="small"
                              >
                                <MenuItem value="crear_nueva">✨ Crear nueva</MenuItem>
                                <MenuItem value="mapear_a_existente">🔄 Mapear a existente</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                          
                          {/* Selector de categoría destino cuando se elige mapear */}
                          {categoria.accion === 'mapear_a_existente' && (
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                              <InputLabel>Categoría destino</InputLabel>
                              <Select
                                value={categoria.categoriaDestino?.id || ''}
                                onChange={(e) => {
                                  const catDestino = empresa.categorias.find(c => c.id === e.target.value);
                                  handleCambioCategoriaDestino(categoriaIndex, catDestino);
                                }}
                                label="Categoría destino"
                                size="small"
                              >
                                {empresa.categorias?.map((cat) => (
                                  <MenuItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        {editandoCategoria === categoriaIndex ? (
                          <Box>
                            <Button
                              onClick={handleGuardarEdicion}
                              variant="contained"
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              Guardar
                            </Button>
                            <Button
                              onClick={handleCancelarEdicion}
                              variant="outlined"
                              size="small"
                            >
                              Cancelar
                            </Button>
                          </Box>
                        ) : (
                          <Box>
                            <IconButton
                              onClick={() => {
                                setEditandoCategoria(categoriaIndex);
                                setNuevaCategoria(categoria.nombre);
                              }}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => handleEliminarCategoria(categoriaIndex)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => setAgregandoSubcategoria(categoriaIndex)}
                              variant="outlined"
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              + Sub
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Formulario para agregar subcategoría */}
                    {agregandoSubcategoria === categoriaIndex && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Box sx={{ pl: 4, py: 2, bgcolor: 'grey.50' }}>
                            <TextField
                              label="Nueva subcategoría"
                              value={nuevaSubcategoria}
                              onChange={(e) => setNuevaSubcategoria(e.target.value)}
                              size="small"
                              sx={{ mr: 2 }}
                            />
                            <Button
                              onClick={() => handleAgregarSubcategoria(categoriaIndex)}
                              variant="contained"
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              Agregar
                            </Button>
                            <Button
                              onClick={() => {
                                setAgregandoSubcategoria(null);
                                setNuevaSubcategoria('');
                              }}
                              variant="outlined"
                              size="small"
                            >
                              Cancelar
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Filas de las subcategorías */}
                    {(categoria.subcategorias || []).map((subcategoria, subIndex) => (
                      <TableRow key={`sub-${categoriaIndex}-${subIndex}`}>
                        <TableCell sx={{ pl: 4 }}>
                          {editandoSubcategoria === `${categoriaIndex}-${subIndex}` ? (
                            <TextField
                              value={nuevaSubcategoria}
                              onChange={(e) => setNuevaSubcategoria(e.target.value)}
                              size="small"
                              autoFocus
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              └── {subcategoria.nombre}
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            icon={subcategoria.estado !== 'nueva' ? <CheckCircleIcon /> : <WarningIcon />}
                            label={subcategoria.estado !== 'nueva' ? 'Existe' : 'Nueva'}
                            color={getEstadoColor(subcategoria.estado)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        
                        <TableCell>
                          {editandoSubcategoria === `${categoriaIndex}-${subIndex}` ? (
                            <Box>
                              <Button
                                onClick={() => handleGuardarEdicionSubcategoria(categoriaIndex, subIndex)}
                                variant="contained"
                                size="small"
                                sx={{ mr: 1 }}
                              >
                                Guardar
                              </Button>
                              <Button
                                onClick={handleCancelarEdicion}
                                variant="outlined"
                                size="small"
                              >
                                Cancelar
                              </Button>
                            </Box>
                          ) : (
                            <Box>
                              <IconButton
                                onClick={() => {
                                  setEditandoSubcategoria(`${categoriaIndex}-${subIndex}`);
                                  setNuevaSubcategoria(subcategoria.nombre);
                                }}
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                onClick={() => handleEliminarSubcategoria(categoriaIndex, subIndex)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {!hideNavigation && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={onBack} size="large">
            Volver
          </Button>
          <Button variant="contained" onClick={() => handleContinuar({ skipOnNext: false })} size="large">
            Continuar con Proveedores
          </Button>
        </Box>
      )}
    </Box>
  );
});

PasoRevisarCategorias.displayName = 'PasoRevisarCategorias';

export default PasoRevisarCategorias;