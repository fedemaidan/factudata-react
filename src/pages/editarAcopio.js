import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Autocomplete,
  TextField,
  MenuItem,
  Dialog,
  Chip,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip,
  Slider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PercentIcon from '@mui/icons-material/Percent';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { useRouter } from 'next/router';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import EditIcon from '@mui/icons-material/Edit';

import AcopioService from 'src/services/acopioService';
import { getEmpresaById, updateEmpresaDetails } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatCurrency } from 'src/utils/formatters';
import { toNumber } from 'src/utils/importar/numbers';
import { fmtMoney } from 'src/utils/importar/money';
import { applyPriceFormulaToValue } from 'src/utils/importar/priceFormula';
import { codeFromDescription } from 'src/utils/importar/codeFromDescription';
import TooltipHelp from 'src/components/TooltipHelp';
import { TOOLTIP_EDITAR_ACOPIO, TOOLTIP_REVISION_FINAL } from 'src/constant/tooltipTexts';

export default function EditarAcopioPage() {
  const router = useRouter();
  const { empresaId, acopioId } = router.query;
  const { setBreadcrumbs } = useBreadcrumbs();

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [proveedoresOptions, setProveedoresOptions] = useState([]);
  const [proyectosOptions, setProyectosOptions] = useState([]);

  const [codigo, setCodigo] = useState('');

  // Setear breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Acopios', href: `/acopios?empresaId=${empresaId}`, icon: <InventoryIcon fontSize="small" /> },
      { label: codigo || 'Editar Acopio', icon: <EditIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [codigo, empresaId, setBreadcrumbs]);
  const [proveedor, setProveedor] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoLista, setTipoLista] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [actualizacionAutomatica, setActualizacionAutomatica] = useState(false); // Por defecto manual
  const [productos, setProductos] = useState([]);
  const [urls, setUrls] = useState([]);

  const [selectionModel, setSelectionModel] = useState([]);
  const [formula, setFormula] = useState('');
  const [prefix, setPrefix] = useState('');
  const [maxLen, setMaxLen] = useState(16);

  const [openPreview, setOpenPreview] = useState(false);

  // Estado para tracking de cambios no guardados
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  
  // Estado para preview de fórmula
  const [formulaPreviewAnchor, setFormulaPreviewAnchor] = useState(null);
  const [formulaPreviewData, setFormulaPreviewData] = useState([]);
  
  // Estados para acciones rápidas
  const [porcentaje, setPorcentaje] = useState('');
  const [montoFijo, setMontoFijo] = useState('');
  const [accionesExpanded, setAccionesExpanded] = useState(false);
  
  // Estados para visor de documento
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

const [currentIdx, setCurrentIdx] = useState(0);

const isPdf = (u = '') =>
  typeof u === 'string' &&
  (u.toLowerCase().endsWith('.pdf') || u.toLowerCase().startsWith('data:application/pdf'));

const safeSrc = (u = '') => u; // por si luego querés firmar URLs o pasar por proxy

const openAt = (idx) => {
  setCurrentIdx(idx);
  setOpenPreview(true);
};

const goPrev = () => setCurrentIdx((i) => (i - 1 + (urls?.length || 0)) % (urls?.length || 0));
const goNext = () => setCurrentIdx((i) => (i + 1) % (urls?.length || 0));

  // 📦 Cargar datos
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!empresaId || !acopioId) return;
        const empresa = await getEmpresaById(empresaId);
        setProveedoresOptions(empresa?.proveedores || []);
        const proyectos = await getProyectosByEmpresa(empresa);
        setProyectosOptions(proyectos);

        const acopio = await AcopioService.obtenerAcopio(acopioId);
        console.log('Acopio cargado:', acopio); // Para debug
        
        // El backend devuelve { acopio: {...} } o directamente el objeto acopio
        const acopioData = acopio?.acopio || acopio;
        
        setCodigo(acopioData.codigo || '');
        setTipoLista(acopioData.tipo || acopioData.tipoLista || 'materiales');
        setProveedor(acopioData.proveedor || '');
        setProyecto(acopioData.proyecto_id || acopioData.proyectoId || '');
        setDescripcion(acopioData.descripcion || '');
        
        // Usar el campo correcto del backend
        const valorAcopio = acopioData.valor_acopio || acopioData.valorTotal || acopioData.valor_total || 0;
        setValorTotal(valorAcopio);
        
        // Manejar las URLs de imágenes con el nombre correcto
        const imageUrls = acopioData.url_image || acopioData.url_imagen_compra || acopioData.urls || [];
        setUrls(Array.isArray(imageUrls) ? imageUrls : []);
        setCurrentIdx(0);
        
        console.log('Datos mapeados:', {
          codigo: acopioData.codigo,
          tipo: acopioData.tipo,
          proveedor: acopioData.proveedor,
          proyecto_id: acopioData.proyecto_id,
          valor_acopio: valorAcopio,
          url_image: imageUrls
        });

        // Obtener productos desde compras solamente
        let productosData = [];
        
        try {
          const compras = await AcopioService.obtenerCompras(acopioId);
          console.log('Compras cargadas:', compras);
          
          if (Array.isArray(compras) && compras.length > 0) {
            // Las compras son directamente los productos/materiales
            console.log('Procesando compras como productos directos');
            productosData = compras;
          } else {
            console.log('No hay compras o el array está vacío');
            // Si no hay compras, empezar con productos vacíos para permitir agregar manualmente
            productosData = [];
          }
        } catch (err) {
          console.error('Error al cargar compras:', err);
          productosData = [];
        }
        
        console.log('Productos finales desde compras:', productosData);
        
        const productosFinales = productosData.map((compra, i) => {
          // Calcular cantidad desde valorOperacion / valorUnitario si no existe cantidad
          const valorUnitario = compra.valorUnitario || 0;
          const valorOperacion = compra.valorOperacion || 0;
          const cantidadCalculada = valorUnitario > 0 ? valorOperacion / valorUnitario : 1;
          
          return {
            id: `${acopioId}-${i}-${compra.id || Math.random()}`,
            codigo: compra.codigo || '',
            descripcion: compra.descripcion || '',
            cantidad: compra.cantidad || cantidadCalculada || 1,
            valorUnitario: valorUnitario,
            valorTotal: compra.valorTotal || valorOperacion || 0,
          };
        });

        setProductos(productosFinales);

        // Guardar datos originales para detectar cambios
        setOriginalData({
          codigo: acopioData.codigo || '',
          proveedor: acopioData.proveedor || '',
          proyecto: acopioData.proyecto_id || acopioData.proyectoId || '',
          tipoLista: acopioData.tipo || acopioData.tipoLista || 'materiales',
          valorTotal: valorAcopio,
          productos: JSON.stringify(productosFinales),
        });
        setHasUnsavedChanges(false);

        // Verificar si el valor del backend coincide con la suma calculada
        const sumaCalculada = productosFinales.reduce(
          (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
          0
        );
        
        const valorDelBackend = valorAcopio;
        const coincide = Math.abs(sumaCalculada - valorDelBackend) < 0.01;
        
        console.log('Verificando modo inicial:', {
          valorDelBackend,
          sumaCalculada,
          coincide,
          modoInicial: coincide ? 'automático' : 'manual'
        });
        
        // Solo activar modo automático si los valores coinciden
        if (coincide) {
          setActualizacionAutomatica(true);
        } else {
          setActualizacionAutomatica(false);
        }
      } catch (err) {
        console.error(err);
        setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [empresaId, acopioId]);

  // 🔄 Actualizar valorTotal cuando cambien los productos (solo si está en modo automático)
  useEffect(() => {
    if (actualizacionAutomatica && productos.length > 0) {
      const nuevoValorTotal = productos.reduce(
        (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
        0
      );
      if (Math.abs(nuevoValorTotal - valorTotal) > 0.01) {
        setValorTotal(nuevoValorTotal);
      }
    }
  }, [productos, actualizacionAutomatica, valorTotal]);

  // 🔍 Detectar cambios no guardados
  useEffect(() => {
    if (!originalData) return;
    
    const currentData = {
      codigo,
      proveedor,
      proyecto,
      tipoLista,
      valorTotal,
      productos: JSON.stringify(productos),
    };
    
    const hasChanges = 
      currentData.codigo !== originalData.codigo ||
      currentData.proveedor !== originalData.proveedor ||
      currentData.proyecto !== originalData.proyecto ||
      currentData.tipoLista !== originalData.tipoLista ||
      Math.abs(currentData.valorTotal - originalData.valorTotal) > 0.01 ||
      currentData.productos !== originalData.productos;
    
    setHasUnsavedChanges(hasChanges);
  }, [codigo, proveedor, proyecto, tipoLista, valorTotal, productos, originalData]);

  // ⚠️ Confirmación al salir con cambios no guardados
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tenés cambios sin guardar. ¿Estás seguro de que querés salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 🔍 Interceptar navegación de Next.js
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (hasUnsavedChanges && !window.confirm('Tenés cambios sin guardar. ¿Estás seguro de que querés salir?')) {
        router.events.emit('routeChangeError');
        throw 'Navegación cancelada por el usuario';
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [hasUnsavedChanges, router]);

  // ⌨️ Atajos de teclado: Ctrl+S para guardar, Esc para volver
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S o Cmd+S para guardar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!guardando) {
          guardarCambios();
        }
      }
      // Esc para volver (solo si no hay diálogo abierto)
      if (e.key === 'Escape' && !openPreview) {
        if (hasUnsavedChanges) {
          if (window.confirm('Tenés cambios sin guardar. ¿Estás seguro de que querés salir?')) {
            router.push(`/movimientosAcopio?acopioId=${acopioId}&empresaId=${empresaId}`);
          }
        } else {
          router.push(`/movimientosAcopio?acopioId=${acopioId}&empresaId=${empresaId}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guardando, hasUnsavedChanges, openPreview, acopioId, empresaId, router]);

  // 💾 Guardar cambios
  const guardarCambios = async () => {
    try {
      setGuardando(true);

      // 1. Actualizar proveedores si es necesario
      if (proveedor && !proveedoresOptions.includes(proveedor)) {
        const nuevos = [...proveedoresOptions, proveedor];
        await updateEmpresaDetails(empresaId, { proveedores: nuevos });
      }

      // 2. Actualizar datos básicos del acopio (proveedor, proyecto, codigo, descripcion)
      const datosBasicos = {
        proveedor,
        proyecto_id: proyecto,
        codigo,
        descripcion,
      };
      
      console.log('1. Actualizando datos básicos:', datosBasicos);
      const resultadoBasicos = await AcopioService.editarAcopio(acopioId, datosBasicos);
      
      if (!resultadoBasicos) {
        throw new Error('Falló la actualización de datos básicos');
      }

      // 3. Sincronizar productos (una sola llamada - el backend gestiona crear/actualizar/eliminar)
      const productosParaSync = productos.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: Number(p.cantidad) || 0,
        valorUnitario: Number(p.valorUnitario) || 0,
      }));
      
      console.log('2. Sincronizando productos:', productosParaSync.length);
      const resultadoSync = await AcopioService.sincronizarProductosAcopio(acopioId, productosParaSync);
      console.log('2. Resultado sincronización:', resultadoSync);
      
      if (!resultadoSync.success && resultadoSync.errores?.length > 0) {
        console.warn('Algunos productos tuvieron errores:', resultadoSync.errores);
      }
      
      // 4. Actualizar campos del acopio (PATCH) - tipo, valor_acopio, url_image
      const camposAcopio = {
        tipo: tipoLista,
        valor_acopio: Number(valorTotal) || 0,
        url_image: urls,
      };
      
      console.log('3. Actualizando campos del acopio:', camposAcopio);
      const resultadoCampos = await AcopioService.actualizarCamposAcopio(acopioId, camposAcopio);
      
      if (!resultadoCampos) {
        throw new Error('Falló la actualización de campos del acopio');
      }

      // Construir mensaje de resultado
      let mensaje = '✅ Acopio actualizado con éxito.';
      if (resultadoSync.creados > 0 || resultadoSync.actualizados > 0 || resultadoSync.eliminados > 0) {
        mensaje += ` (${resultadoSync.creados} creados, ${resultadoSync.actualizados} actualizados, ${resultadoSync.eliminados} eliminados)`;
      }
      
      setAlert({ open: true, message: mensaje, severity: 'success' });
      setHasUnsavedChanges(false); // Marcar como guardado
      setTimeout(() => router.push(`/movimientosAcopio?acopioId=${acopioId}&empresaId=${empresaId}`), 1500);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: '❌ Error al guardar cambios', severity: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  // ✏️ Edición de filas (solo actualiza estado local, se guarda al tocar Guardar)
  const processRowUpdate = (newRow, oldRow) => {
    const updated = { ...newRow };
    const cantidad = toNumber(updated.cantidad);
    const valorUnitario = toNumber(updated.valorUnitario);
    if (tipoLista === 'materiales') {
      updated.valorTotal = cantidad * valorUnitario;
    }
    
    setProductos((rows) => {
      const updatedRows = rows.map((r) => (String(r.id) === String(updated.id) ? updated : r));
      
      // Actualizar valorTotal del acopio automáticamente solo si está en modo automático
      if (actualizacionAutomatica) {
        const nuevoValorTotal = updatedRows.reduce(
          (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
          0
        );
        setValorTotal(nuevoValorTotal);
      }
      
      return updatedRows;
    });
    
    return updated;
  };

  // ⚙️ Ediciones masivas
  const onApplyPriceFormula = (formula, scope = 'all') => {
    if (!formula?.trim()) return;
    setFormulaPreviewAnchor(null); // Cerrar preview al aplicar
    setProductos((rows) => {
      const setSelected = new Set(selectionModel.map(String));
      const updatedRows = rows.map((r, i) => {
        const id = String(r.id ?? `${i}`);
        if (scope === 'selected' && !setSelected.has(id)) return r;
        const nuevoVU = applyPriceFormulaToValue(r.valorUnitario, formula);
        const actualizado = { ...r, valorUnitario: nuevoVU };
        if (tipoLista === 'materiales') {
          const cant = toNumber(actualizado.cantidad);
          actualizado.valorTotal = cant * toNumber(nuevoVU);
        }
        return actualizado;
      });
      
      // Actualizar valorTotal automáticamente si está en modo automático
      if (actualizacionAutomatica) {
        const nuevoValorTotal = updatedRows.reduce(
          (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
          0
        );
        setValorTotal(nuevoValorTotal);
      }
      
      return updatedRows;
    });
  };

  const onGenerateMissingCodes = () => {
    setProductos((rows) => {
      const used = new Set(rows.map((r) => String(r.codigo || '').trim()).filter(Boolean));
      const updatedRows = rows.map((r) => {
        const codigo = String(r.codigo || '').trim();
        if (codigo) return r;
        const nuevo = codeFromDescription(r.descripcion, { prefix, maxLen }, used);
        return { ...r, codigo: nuevo };
      });
      
      // No afecta valorTotal, pero mantenemos consistencia
      return updatedRows;
    });
  };

  const handleBulkDelete = () => {
    if (!selectionModel.length) return;
    setProductos((rows) => rows.filter((r) => !selectionModel.includes(String(r.id))));
    setSelectionModel([]);
  };

  const handleBulkPriceUpdate = () => {
    const mode = window.prompt('Escribí "%10" para aumentar 10%, o "=1500" para fijar a 1500.');
    if (!mode) return;
    setProductos((rows) =>
      rows.map((r) => {
        const id = String(r.id);
        if (!selectionModel.includes(id)) return r;
        let nuevoVU = toNumber(r.valorUnitario);
        if (mode.startsWith('%')) {
          const pct = toNumber(mode.slice(1)) / 100;
          nuevoVU = nuevoVU * (1 + pct);
        } else if (mode.startsWith('=')) {
          nuevoVU = toNumber(mode.slice(1));
        }
        const actualizado = { ...r, valorUnitario: nuevoVU };
        if (tipoLista === 'materiales')
          actualizado.valorTotal = toNumber(actualizado.cantidad) * nuevoVU;
        return actualizado;
      })
    );
  };

  // 🔍 Generar preview de fórmula
  const handleFormulaPreview = (event, scope = 'all') => {
    if (!formula?.trim()) return;
    
    const setSelected = new Set(selectionModel.map(String));
    const filteredProducts = scope === 'selected' && selectionModel.length > 0
      ? productos.filter((r, i) => setSelected.has(String(r.id ?? `${i}`)))
      : productos;
    
    const previewRows = filteredProducts
      .slice(0, 10) // Mostrar máximo 10 filas en preview
      .map((r) => {
        const valorActual = toNumber(r.valorUnitario);
        const valorNuevo = applyPriceFormulaToValue(valorActual, formula);
        const diferencia = valorNuevo - valorActual;
        const porcentajeCambio = valorActual > 0 ? ((diferencia / valorActual) * 100) : 0;
        return {
          codigo: r.codigo || 'Sin código',
          descripcion: (r.descripcion || '').substring(0, 30) + ((r.descripcion || '').length > 30 ? '...' : ''),
          valorActual,
          valorNuevo,
          diferencia,
          porcentajeCambio,
        };
      });
    
    setFormulaPreviewData(previewRows);
    setFormulaPreviewAnchor(event.currentTarget);
  };

  // Acciones rápidas de IVA
  const aplicarIVA = (quitar = false) => {
    const formula = quitar ? '/1.21' : '*1.21';
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  // Aplicar porcentaje
  const aplicarPorcentaje = (aumentar = true) => {
    if (!porcentaje) return;
    const formula = aumentar ? `%${porcentaje}` : `%-${porcentaje}`;
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  // Aplicar monto fijo
  const aplicarMontoFijo = (sumar = true) => {
    if (!montoFijo) return;
    const formula = sumar ? `+${montoFijo}` : `-${montoFijo}`;
    onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
  };

  const cantidadSeleccionados = selectionModel.length;
  const textoAplicar = cantidadSeleccionados > 0 
    ? `a ${cantidadSeleccionados} seleccionados` 
    : 'a todos';

  const handleAddItem = (position = 'end') => {
    setProductos((rows) => {
      const nuevo = {
        id: `nuevo-${Date.now()}`,
        codigo: '',
        descripcion: '',
        cantidad: tipoLista === 'materiales' ? 1 : undefined,
        valorUnitario: 0,
        valorTotal: tipoLista === 'materiales' ? 0 : undefined,
      };

      if (position === 'start') {
        return [nuevo, ...rows];
      }

      if (typeof position === 'number' && position >= 0 && position < rows.length) {
        const copia = [...rows];
        copia.splice(position + 1, 0, nuevo);
        return copia;
      }

      return [...rows, nuevo];
    });
  };

  const moveColumnValues = (field, fromIndex, direction = 'up') => {
    setProductos((rows) => {
      if (!rows.length) return rows;
      if (fromIndex == null || fromIndex < 0 || fromIndex >= rows.length) {
        return rows;
      }
      const safeIndex = fromIndex;

      const updated = rows.map((row) => ({ ...row }));
      const lastIndex = updated.length - 1;

      if (direction === 'up') {
        for (let i = safeIndex; i < lastIndex; i += 1) {
          updated[i][field] = rows[i + 1]?.[field] ?? '';
        }
        updated[lastIndex][field] = '';
      } else {
        for (let i = lastIndex; i > safeIndex; i -= 1) {
          updated[i][field] = rows[i - 1]?.[field] ?? '';
        }
        updated[0][field] = '';
      }

      if (tipoLista === 'materiales' && field === 'valorUnitario') {
        for (let i = 0; i < updated.length; i += 1) {
          const cantidad = toNumber(updated[i].cantidad);
          const valorUnitario = toNumber(updated[i].valorUnitario);
          updated[i].valorTotal = cantidad * valorUnitario;
        }
      }

      return updated;
    });
  };

  // 📊 Config columnas
  const columns = React.useMemo(() => {
    const base = [
      { field: 'codigo', headerName: 'Código', flex: 1, editable: true },
      { field: 'descripcion', headerName: 'Descripción', flex: 2, editable: true },
    ];
    if (tipoLista === 'materiales') {
      base.push(
        {
          field: 'cantidad',
          headerName: 'Cantidad',
          type: 'number',
          align: 'right',
          flex: 0.7,
          editable: true,
        },
        {
          field: 'valorUnitario',
          headerName: 'Valor unitario',
          align: 'right',
          flex: 1,
          editable: true,
          valueFormatter: ({ value }) => formatCurrency(value),
        },
        {
          field: 'valorTotal',
          headerName: 'Valor total',
          align: 'right',
          flex: 1,
          editable: true,
          valueFormatter: ({ value }) => formatCurrency(value),
        }
      );
    } else {
      base.push({
        field: 'valorUnitario',
        headerName: 'Valor unitario',
        align: 'right',
        flex: 1,
        editable: true,
        valueFormatter: ({ value }) => formatCurrency(value),
      });
    }
    return base;
  }, [tipoLista]);

  const suma = productos.reduce(
    (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
    0
  );
  const coincide = Math.abs(suma - valorTotal) < 0.01;

  if (cargando) {
    return (
      <Box sx={{ p: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando acopio...</Typography>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
      <Container maxWidth="xl">
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h5">
            ✏️ Editar Acopio {codigo ? `(${codigo})` : ''}
          </Typography>
          {hasUnsavedChanges && (
            <Chip 
              icon={<WarningAmberIcon />}
              label="Cambios sin guardar" 
              color="warning" 
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
{/* Panel izquierdo: Visor de documento mejorado */}
{urls?.length > 0 && (
  <Paper
    sx={{
      width: { xs: '100%', md: '35%' },
      minWidth: { md: 300 },
      maxWidth: { md: 450 },
      position: { md: 'sticky' },
      top: { md: 80 },
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #e0e0e0',
      borderRadius: 2,
      overflow: 'hidden',
      flexShrink: 0,
    }}
  >
    {/* Barra de herramientas del visor */}
    <Box sx={{ 
      p: 1, 
      bgcolor: '#f5f5f5', 
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      flexWrap: 'wrap'
    }}>
      <Tooltip title="Alejar">
        <IconButton size="small" onClick={() => setZoom(z => Math.max(25, z - 25))}>
          <ZoomOutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Slider
        value={zoom}
        onChange={(_, v) => setZoom(v)}
        min={25}
        max={200}
        step={25}
        sx={{ width: 60, mx: 1 }}
        size="small"
      />
      <Tooltip title="Acercar">
        <IconButton size="small" onClick={() => setZoom(z => Math.min(200, z + 25))}>
          <ZoomInIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Rotar izquierda">
        <IconButton size="small" onClick={() => setRotation(r => r - 90)}>
          <RotateLeftIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Rotar derecha">
        <IconButton size="small" onClick={() => setRotation(r => r + 90)}>
          <RotateRightIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Resetear">
        <IconButton size="small" onClick={() => { setZoom(100); setRotation(0); }}>
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Pantalla completa">
        <IconButton size="small" onClick={() => openAt(currentIdx)}>
          <OpenInFullIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>

    {/* Contenedor de imagen/PDF */}
    <Box
      sx={{
        height: { xs: 300, md: 'calc(100vh - 280px)' },
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fafafa',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
      }}
    >
      {isPdf(urls[currentIdx]) ? (
        <embed 
          src={safeSrc(urls[currentIdx])} 
          type="application/pdf" 
          width="100%" 
          height="100%" 
        />
      ) : (
        <img
          src={safeSrc(urls[currentIdx])}
          alt={`Vista previa ${currentIdx + 1}/${urls.length}`}
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            maxWidth: zoom > 100 ? 'none' : '100%',
            maxHeight: zoom > 100 ? 'none' : '100%',
            objectFit: 'contain',
            transition: 'transform 0.2s ease',
          }}
        />
      )}
    </Box>

    {/* Navegación de páginas */}
    {urls.length > 1 && (
      <Box sx={{ 
        p: 1, 
        bgcolor: '#f5f5f5', 
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1
      }}>
        <IconButton 
          size="small" 
          onClick={goPrev}
          disabled={currentIdx === 0}
        >
          <NavigateBeforeIcon />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
          {currentIdx + 1} / {urls.length}
        </Typography>
        <IconButton 
          size="small" 
          onClick={goNext}
          disabled={currentIdx >= urls.length - 1}
        >
          <NavigateNextIcon />
        </IconButton>
      </Box>
    )}

    {/* Tira de miniaturas */}
    {urls.length > 1 && (
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          overflowX: 'auto',
          p: 1,
          bgcolor: '#fff',
          borderTop: '1px solid #eee',
        }}
      >
        {urls.map((u, idx) => (
          <Box
            key={`${u}-${idx}`}
            onClick={() => setCurrentIdx(idx)}
            sx={{
              flex: '0 0 auto',
              width: 56,
              height: 56,
              borderRadius: 1,
              border: idx === currentIdx ? '2px solid #1976d2' : '1px solid #ddd',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#fafafa',
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: '#1976d2' },
            }}
          >
            {isPdf(u) ? (
              <Typography variant="caption" sx={{ fontSize: 10 }}>PDF</Typography>
            ) : (
              <img
                src={safeSrc(u)}
                alt={`thumb-${idx}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </Box>
        ))}
      </Box>
    )}
  </Paper>
)}


<Dialog
  open={openPreview}
  onClose={() => setOpenPreview(false)}
  maxWidth="xl"
  onKeyDown={(e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }}
>
  <Box
    sx={{
      bgcolor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: '90vw',
      height: '90vh',
      outline: 'none',
    }}
    tabIndex={0}
  >
    {/* Botón previo */}
    {urls.length > 1 && (
      <Button
        onClick={goPrev}
        sx={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          minWidth: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.15)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}
      >
        ←
      </Button>
    )}

    {/* Contenido */}
    {isPdf(urls[currentIdx]) ? (
      <embed src={safeSrc(urls[currentIdx])} type="application/pdf" width="100%" height="100%" />
    ) : (
      <img
        src={safeSrc(urls[currentIdx])}
        alt={`preview-${currentIdx}`}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />
    )}

    {/* Botón siguiente */}
    {urls.length > 1 && (
      <Button
        onClick={goNext}
        sx={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          minWidth: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.15)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}
      >
        →
      </Button>
    )}

    {/* Indicador */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        bgcolor: 'rgba(0,0,0,0.4)',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        fontSize: 12,
      }}
    >
      {currentIdx + 1} / {urls.length}
    </Box>
  </Box>
</Dialog>


          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={2}>
              {/* Datos generales */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} size="small" />
                <TextField
                  select
                  label="Tipo"
                  value={tipoLista}
                  onChange={(e) => setTipoLista(e.target.value)}
                  size="small"
                >
                  <MenuItem value="materiales">Materiales</MenuItem>
                  <MenuItem value="lista_precios">Lista de precios</MenuItem>
                </TextField>
                <Autocomplete
                  freeSolo
                  options={proveedoresOptions}
                  value={proveedor}
                  onInputChange={(_, v) => setProveedor(v)}
                  renderInput={(p) => <TextField {...p} label="Proveedor" size="small" />}
                />
                <TextField
                  select
                  label="Proyecto"
                  value={proyecto}
                  onChange={(e) => setProyecto(e.target.value)}
                  size="small"
                  fullWidth
                >
                  {proyectosOptions.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {/* Descripción */}
              <TextField
                label="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                size="small"
                fullWidth
                placeholder="Descripción breve para identificar el acopio"
                helperText="Esta descripción se mostrará en el listado de acopios"
              />

              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Valor acopiado"
                  value={valorTotal}
                  onChange={(e) => {
                    setValorTotal(toNumber(e.target.value));
                    setActualizacionAutomatica(false); // Cambiar a modo manual al editar
                  }}
                  size="small"
                  fullWidth
                  disabled={actualizacionAutomatica}
                  helperText={actualizacionAutomatica ? "Se calcula automáticamente" : "Valor manual"}
                />
                <Button
                  variant={actualizacionAutomatica ? "contained" : "outlined"}
                  size="small"
                  onClick={() => {
                    const nuevoModo = !actualizacionAutomatica;
                    setActualizacionAutomatica(nuevoModo);
                    
                    if (nuevoModo) {
                      // Al cambiar A automático, recalcular inmediatamente
                      const nuevoValorTotal = productos.reduce(
                        (acc, r) => acc + toNumber(r.valorTotal || r.cantidad * r.valorUnitario),
                        0
                      );
                      setValorTotal(nuevoValorTotal);
                    }
                    // Al cambiar A manual, mantener el valor actual (no hacer nada)
                  }}
                  sx={{ minWidth: 120 }}
                >
                  {actualizacionAutomatica ? "🔄 Auto" : "✏️ Manual"}
                </Button>
              </Stack>

              {/* Acciones masivas - Accordion colapsable */}
              <Accordion 
                expanded={accionesExpanded} 
                onChange={() => setAccionesExpanded(!accionesExpanded)}
                sx={{ 
                  border: '1px solid #e0e0e0',
                  '&:before': { display: 'none' },
                  boxShadow: 'none'
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <CalculateIcon color="primary" />
                    <Typography fontWeight={600}>Acciones rápidas</Typography>
                    {cantidadSeleccionados > 0 && (
                      <Chip 
                        size="small" 
                        label={`${cantidadSeleccionados} seleccionados`} 
                        color="primary" 
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {/* IVA rápido */}
                    <Paper sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <PercentIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={500}>IVA:</Typography>
                        <Button size="small" variant="outlined" onClick={() => aplicarIVA(false)}>
                          +21% {textoAplicar}
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => aplicarIVA(true)}>
                          -21% {textoAplicar}
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <TextField
                          size="small"
                          label="% personalizado"
                          placeholder="10"
                          value={porcentaje}
                          onChange={(e) => setPorcentaje(e.target.value)}
                          sx={{ width: 100 }}
                        />
                        <Button size="small" variant="outlined" onClick={() => aplicarPorcentaje(true)} disabled={!porcentaje}>
                          +{porcentaje || '?'}%
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => aplicarPorcentaje(false)} disabled={!porcentaje}>
                          -{porcentaje || '?'}%
                        </Button>
                      </Stack>
                    </Paper>

                    {/* Monto fijo */}
                    <Paper sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <CalculateIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={500}>Monto fijo:</Typography>
                        <TextField
                          size="small"
                          label="Monto"
                          placeholder="100"
                          value={montoFijo}
                          onChange={(e) => setMontoFijo(e.target.value)}
                          sx={{ width: 100 }}
                        />
                        <Button size="small" variant="outlined" onClick={() => aplicarMontoFijo(true)} disabled={!montoFijo}>
                          +${montoFijo || '?'} {textoAplicar}
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => aplicarMontoFijo(false)} disabled={!montoFijo}>
                          -${montoFijo || '?'} {textoAplicar}
                        </Button>
                      </Stack>
                    </Paper>

                    {/* Fórmula personalizada */}
                    <Paper sx={{ p: 1.5, bgcolor: '#e3f2fd' }}>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <TextField
                            label="Fórmula"
                            placeholder="%10 | -100 | *1.21 | /2"
                            value={formula}
                            onChange={(e) => setFormula(e.target.value)}
                            size="small"
                            sx={{ minWidth: 200 }}
                          />
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={(e) => handleFormulaPreview(e, selectionModel.length ? 'selected' : 'all')}
                            disabled={!formula?.trim()}
                          >
                            Preview
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => onApplyPriceFormula(formula, 'selected')}
                            disabled={!selectionModel.length || !formula?.trim()}
                          >
                            Aplicar a seleccionados
                          </Button>
                          <Button 
                            variant="outlined"
                            size="small"
                            onClick={() => onApplyPriceFormula(formula, 'all')}
                            disabled={!formula?.trim()}
                          >
                            Aplicar a todos
                          </Button>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Ejemplos: %10 (aumenta 10%), *1.21 (multiplica), +500 (suma), -100 (resta), /2 (divide)
                        </Typography>
                      </Stack>
                    </Paper>

                    <Divider />

                    {/* Códigos */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <TextField
                        label="Prefijo código"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        size="small"
                        sx={{ width: 120 }}
                      />
                      <TextField
                        type="number"
                        label="Largo máx"
                        value={maxLen}
                        onChange={(e) => setMaxLen(parseInt(e.target.value || '16', 10))}
                        size="small"
                        sx={{ width: 80 }}
                      />
                      <Button variant="outlined" size="small" onClick={onGenerateMissingCodes}>
                        Generar códigos faltantes
                      </Button>
                    </Stack>

                    {/* Mover valores */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!selectionModel.length}
                        onClick={() => {
                          const firstId = selectionModel[0];
                          const fromIndex = productos.findIndex((p) => String(p.id) === String(firstId));
                          moveColumnValues('valorUnitario', fromIndex, 'up');
                        }}
                      >
                        ⬆️ Subir precios
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!selectionModel.length}
                        onClick={() => {
                          const firstId = selectionModel[0];
                          const fromIndex = productos.findIndex((p) => String(p.id) === String(firstId));
                          moveColumnValues('valorUnitario', fromIndex, 'down');
                        }}
                      >
                        ⬇️ Bajar precios
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!selectionModel.length}
                        onClick={() => {
                          const firstId = selectionModel[0];
                          const fromIndex = productos.findIndex((p) => String(p.id) === String(firstId));
                          moveColumnValues('codigo', fromIndex, 'up');
                        }}
                      >
                        ⬆️ Subir códigos
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!selectionModel.length}
                        onClick={() => {
                          const firstId = selectionModel[0];
                          const fromIndex = productos.findIndex((p) => String(p.id) === String(firstId));
                          moveColumnValues('codigo', fromIndex, 'down');
                        }}
                      >
                        ⬇️ Bajar códigos
                      </Button>
                    </Stack>

                    {/* Agregar/Eliminar */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        disabled={!selectionModel.length}
                        onClick={handleBulkDelete}
                      >
                        Eliminar ({cantidadSeleccionados})
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => handleAddItem('start')}
                      >
                        Al inicio
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={!selectionModel.length}
                        onClick={() => {
                          const firstId = selectionModel[0];
                          const firstIndex = productos.findIndex((p) => String(p.id) === String(firstId));
                          handleAddItem(firstIndex);
                        }}
                      >
                        Debajo del seleccionado
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => handleAddItem('end')}
                      >
                        Al final
                      </Button>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Popover de preview de fórmula */}
              <Popover
                open={Boolean(formulaPreviewAnchor)}
                anchorEl={formulaPreviewAnchor}
                onClose={() => setFormulaPreviewAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, maxWidth: 600 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    🔍 Preview: Fórmula "{formula}" ({formulaPreviewData.length} de {productos.length} items)
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Actual</TableCell>
                        <TableCell align="right">Nuevo</TableCell>
                        <TableCell align="right">Cambio</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formulaPreviewData.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.codigo}</TableCell>
                          <TableCell>{row.descripcion}</TableCell>
                          <TableCell align="right">{fmtMoney(row.valorActual)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {fmtMoney(row.valorNuevo)}
                          </TableCell>
                          <TableCell 
                            align="right" 
                            sx={{ 
                              color: row.diferencia >= 0 ? 'success.main' : 'error.main',
                              fontWeight: 'bold' 
                            }}
                          >
                            {row.diferencia >= 0 ? '+' : ''}{row.porcentajeCambio.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
                    <Button size="small" onClick={() => setFormulaPreviewAnchor(null)}>
                      Cancelar
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained" 
                      onClick={() => {
                        onApplyPriceFormula(formula, selectionModel.length ? 'selected' : 'all');
                        setFormulaPreviewAnchor(null);
                      }}
                    >
                      ✅ Aplicar
                    </Button>
                  </Stack>
                </Box>
              </Popover>

              {/* Grilla */}
              <Box sx={{ height: { xs: 450, md: 'calc(100vh - 320px)' }, minHeight: 400 }}>
                <DataGrid
                  rows={productos}
                  getRowId={(r) => r.id}
                  columns={columns}
                  checkboxSelection
                  onRowSelectionModelChange={(m) => setSelectionModel(m.map(String))}
                  rowSelectionModel={selectionModel}
                  processRowUpdate={processRowUpdate}
                  disableRowSelectionOnClick
                  experimentalFeatures={{ newEditingApi: true }}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } },
                  }}
                  density="compact"
                />
              </Box>

              {/* Suma total */}
              {tipoLista === 'materiales' && (
                <Box
                  sx={{
                    p: 2,
                    border: '1px dashed #ccc',
                    borderRadius: 2,
                    bgcolor: coincide ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.06)',
                  }}
                >
                  <Typography variant="body2">
                    <strong>Suma total:</strong> {fmtMoney(suma)} —{' '}
                    <strong>Valor acopiado:</strong> {fmtMoney(valorTotal)}{' '}
                    {coincide ? '✅ Coinciden' : '⚠️ No coinciden'}
                  </Typography>
                </Box>
              )}

              {/* Botón guardar */}
              <TooltipHelp {...TOOLTIP_EDITAR_ACOPIO.guardar}>
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={guardando}
                    startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : null}
                    onClick={guardarCambios}
                  >
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </span>
              </TooltipHelp>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

EditarAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
