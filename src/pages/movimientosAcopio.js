// pages/MovimientosAcopioPage.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Button, Container, Stack, Typography, Tabs, Tab, Paper, Grid, Snackbar, Alert,
  Dialog, DialogContent, TextField, Divider, LinearProgress, IconButton, Tooltip,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, Skeleton, Chip, ButtonGroup
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import CommentIcon from '@mui/icons-material/Comment';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import AcopioService from 'src/services/acopioService';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { formatCurrency } from 'src/utils/formatters';

// Nuevos componentes:
import HeaderAcopioSummary from 'src/components/headerAcopioSummary';
import MaterialesTableV2 from 'src/components/materialesTableV2';
import AcopioVisor from 'src/components/acopioVisor';

// Tu tabla actual de Remitos:
import RemitosTable from 'src/components/remitosTable';

// Buscador (para lista de precios)
import ListaPreciosBuscador from 'src/components/listaPreciosBuscador';

// Tooltips de ayuda
import TooltipHelp from 'src/components/TooltipHelp';
import { TOOLTIP_MOVIMIENTOS } from 'src/constant/tooltipTexts';

/** ------------------------------
 *  FLAGS DE FUNCIONALIDAD (configurables)
 *  ------------------------------ */
const ENABLE_HOJA_UPLOAD = false;  // activar cuando backend listo
const ENABLE_HOJA_DELETE = false;  // activar cuando backend listo

const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();

  // Estado principal
  const [tabActiva, setTabActiva] = useState('acopio');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Para skeleton loaders
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [acopio, setAcopio] = useState(null);
  
  // Conteo para badges en tabs
  const [remitosCount, setRemitosCount] = useState(null); // null = no cargado, 0+ = cargado
  const [materialesCount, setMaterialesCount] = useState(null);
  const [documentosCount, setDocumentosCount] = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null); // Timestamp de última actualización
  const [eventos, setEventos] = useState([]); // Historial de eventos
  const [nuevoComentario, setNuevoComentario] = useState(''); // Input de comentario
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Setear breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Acopios', href: `/acopios?empresaId=${acopio?.empresaId || ''}`, icon: <InventoryIcon fontSize="small" /> },
      { label: acopio?.codigo || 'Movimientos', icon: <VisibilityIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [acopio?.codigo, acopio?.empresaId, setBreadcrumbs]);
  const [compras, setCompras] = useState([]);
  const [remitos, setRemitos] = useState([]);
  const [remitoMovimientos, setRemitoMovimientos] = useState({});
  const [remitosDuplicados, setRemitosDuplicados] = useState(new Set());

  const [materialesAgrupados, setMaterialesAgrupados] = useState({});
  const [estadoLoading, setEstadoLoading] = useState(false);

  // Documentos complementarios
  const [documentosComplementarios, setDocumentosComplementarios] = useState([]);
  const [docPageIdx, setDocPageIdx] = useState(0);
  const [editandoDescripcionIdx, setEditandoDescripcionIdx] = useState(null);
  const [descripcionEditando, setDescripcionEditando] = useState('');

  // Editor ya no se necesita - la edición se hace en página separada

  // Visor
  const [pageIdx, setPageIdx] = useState(0);
  const acopioFileInputRef = useRef(null);

  // Remitos: expand + eliminar
  const [expanded, setExpanded] = useState(null);
  const [remitoAEliminar, setRemitoAEliminar] = useState(null);
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false);

  // Helpers
  const pages = useMemo(
    () => (Array.isArray(acopio?.url_image) ? acopio.url_image.filter(Boolean) : []),
    [acopio]
  );
  const totalPages = pages.length;
  const hasAcopioPages = totalPages > 0;
  const nextUrl = hasAcopioPages ? pages[(pageIdx + 1) % totalPages] : null;

  const va = Number(acopio?.valor_acopio) || 0;
  const vd = Number(acopio?.valor_desacopio) || 0;
  const porcentajeDisponible = va > 0 ? Math.max(0, Math.min(100, (1 - vd / va) * 100)) : 0;

  // Formatear tiempo relativo
  const formatTimeAgo = (date) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    
    if (diffSec < 60) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) =>
    amount ? Number(amount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }) : '$ 0';

  // Fetchers
  const fetchAcopio = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const acopioData = await AcopioService.obtenerAcopio(acopioId);

      acopioData.tipo = acopioData.tipo || 'materiales';
      if (typeof acopioData.activo !== 'boolean') {
        acopioData.activo = (acopioData.estado || '').toLowerCase() !== 'inactivo';
      }

      setAcopio(acopioData);
      setLastUpdated(new Date()); // Marcar momento de actualización
      
      // Cargar eventos del historial
      setEventos(acopioData.eventos || []);

      const comprasData = await AcopioService.obtenerCompras(acopioId);
      setCompras(comprasData || []);
      setPageIdx(0);
      
      // Cargar conteos en background para los badges
      loadCountsInBackground();
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener información del acopio', severity: 'error' });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [acopioId]);

  // Cargar conteos en background para badges (sin bloquear UI)
  const loadCountsInBackground = useCallback(async () => {
    if (!acopioId) return;
    
    try {
      // Cargar todos los conteos en paralelo
      const [remitosResp, movimientosResp, docsResp] = await Promise.allSettled([
        AcopioService.obtenerRemitos(acopioId),
        AcopioService.obtenerMovimientos(acopioId),
        AcopioService.obtenerDocumentosComplementarios(acopioId)
      ]);
      
      // Actualizar conteos
      if (remitosResp.status === 'fulfilled') {
        setRemitosCount((remitosResp.value || []).length);
      }
      
      if (movimientosResp.status === 'fulfilled') {
        const { movimientos: movs } = movimientosResp.value || {};
        // Contar materiales únicos
        const comprasData = await AcopioService.obtenerCompras(acopioId);
        const union = [...(movs || []), ...(comprasData || [])];
        const uniqueKeys = new Set();
        union.forEach(mov => {
          const key = (mov.codigo || '—') + "_" + (mov.descripcion || '');
          uniqueKeys.add(key);
        });
        setMaterialesCount(uniqueKeys.size);
      }
      
      if (docsResp.status === 'fulfilled') {
        setDocumentosCount((docsResp.value?.documentos || []).length);
      }
    } catch (err) {
      console.error('Error cargando conteos en background:', err);
    }
  }, [acopioId]);

  const fetchRemitos = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const remitosResp = await AcopioService.obtenerRemitos(acopioId);
      setRemitos(remitosResp || []);
      setRemitosCount((remitosResp || []).length);
      setRemitosDuplicados(detectarDuplicados(remitosResp || []));
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener remitos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  // Función para exportar informe de remitos a Excel con estilos
  const exportarInformeRemitos = async () => {
    if (!acopioId || !acopio) return;
    
    try {
      setLoading(true);
      setAlert({ open: true, message: 'Generando informe...', severity: 'info' });

      // Ordenar remitos por fecha (más antiguo primero para calcular saldo parcial)
      const remitosOrdenados = [...remitos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      
      // Obtener movimientos de cada remito
      const remitosConMovimientos = await Promise.all(
        remitosOrdenados.map(async (remito) => {
          const movs = await AcopioService.obtenerMovimientosDeRemito(acopioId, remito.id);
          return { ...remito, movimientos: movs || [] };
        })
      );

      // Calcular saldo inicial (valor_acopio)
      const saldoInicial = acopio?.valor_acopio || 0;
      let saldoAcumulado = saldoInicial;

      // Crear workbook con ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Factudata';
      workbook.created = new Date();

      // ========== HOJA PRINCIPAL: INFORME REMITOS ==========
      const ws = workbook.addWorksheet('Informe Remitos');

      // Definir columnas
      ws.columns = [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Nº Remito', key: 'remito', width: 22 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Material', key: 'material', width: 45 },
        { header: 'Cantidad', key: 'cantidad', width: 12 },
        { header: 'Valor Unit.', key: 'valorUnit', width: 14 },
        { header: 'Impacto', key: 'impacto', width: 16 },
        { header: 'Saldo Parcial', key: 'saldo', width: 18 },
      ];

      // ===== ENCABEZADO DEL ACOPIO (primeras filas) =====
      // Fila 1: Título
      ws.insertRow(1, []);
      ws.mergeCells('A1:H1');
      const tituloCell = ws.getCell('A1');
      tituloCell.value = `INFORME DE REMITOS - ${acopio.codigo || 'Acopio'}`;
      tituloCell.font = { bold: true, size: 16, color: { argb: 'FF2E7D32' } };
      tituloCell.alignment = { horizontal: 'center' };

      // Fila 2: Info del acopio
      ws.insertRow(2, []);
      ws.mergeCells('A2:D2');
      ws.getCell('A2').value = `Proveedor: ${acopio.proveedor || '-'} | Proyecto: ${acopio.proyecto_nombre || '-'}`;
      ws.getCell('A2').font = { italic: true, size: 11 };

      // Fila 3: Saldo inicial destacado
      ws.insertRow(3, []);
      ws.mergeCells('A3:C3');
      ws.getCell('A3').value = 'VALOR INICIAL ACOPIADO:';
      ws.getCell('A3').font = { bold: true, size: 12 };
      ws.mergeCells('D3:E3');
      ws.getCell('D3').value = saldoInicial;
      ws.getCell('D3').numFmt = '"$"#,##0.00';
      ws.getCell('D3').font = { bold: true, size: 14, color: { argb: 'FF1565C0' } };
      ws.getCell('D3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };

      // Fila 4: Espacio
      ws.insertRow(4, []);

      // Fila 5: Encabezados de columna (ya definidos, pero mover a fila 5)
      const headerRow = ws.getRow(5);
      headerRow.values = ['Fecha', 'Nº Remito', 'Estado', 'Material', 'Cantidad', 'Valor Unit.', 'Impacto', 'Saldo Parcial'];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF424242' } };
      headerRow.alignment = { horizontal: 'center' };
      headerRow.height = 22;

      let currentRow = 6;

      // Agregar remitos
      remitosConMovimientos.forEach((remito, remitoIdx) => {
        const impactoRemito = remito.movimientos.reduce((acc, mov) => {
          const valor = mov.valorOperacion || (mov.cantidad * mov.valorUnitario) || 0;
          return acc + valor;
        }, 0);
        
        // Restar del saldo
        saldoAcumulado -= impactoRemito;

        // Determinar color del saldo
        const porcentajeRestante = saldoInicial > 0 ? (saldoAcumulado / saldoInicial) * 100 : 0;
        let saldoColor = 'FF2E7D32'; // Verde por defecto
        let saldoBgColor = 'FFE8F5E9';
        if (saldoAcumulado < 0) {
          saldoColor = 'FFC62828'; // Rojo
          saldoBgColor = 'FFFFEBEE';
        } else if (porcentajeRestante <= 20) {
          saldoColor = 'FFF57C00'; // Naranja
          saldoBgColor = 'FFFFF3E0';
        } else if (porcentajeRestante <= 40) {
          saldoColor = 'FFFBC02D'; // Amarillo
          saldoBgColor = 'FFFFFDE7';
        }

        if (remito.movimientos.length > 0) {
          remito.movimientos.forEach((mov, idx) => {
            const valorOperacion = mov.valorOperacion || (mov.cantidad * mov.valorUnitario) || 0;
            const row = ws.addRow({
              fecha: idx === 0 ? new Date(remito.fecha).toLocaleDateString('es-AR') : '',
              remito: idx === 0 ? (remito.numero_remito || remito.id?.slice(0, 8)) : '',
              estado: idx === 0 ? (remito.estado || '') : '',
              material: `${mov.codigo || ''} - ${mov.descripcion || 'Sin descripción'}`.trim(),
              cantidad: mov.cantidad || 0,
              valorUnit: mov.valorUnitario || 0,
              impacto: valorOperacion,
              saldo: idx === remito.movimientos.length - 1 ? saldoAcumulado : null
            });

            // Estilo de primera fila del remito (encabezado del remito)
            if (idx === 0) {
              row.getCell('fecha').font = { bold: true };
              row.getCell('remito').font = { bold: true, size: 11 };
              row.getCell('estado').font = { bold: true };
              // Color de fondo para la fila principal del remito
              row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
              });
            }

            // Formato de números
            row.getCell('valorUnit').numFmt = '"$"#,##0.00';
            row.getCell('impacto').numFmt = '"$"#,##0.00';
            row.getCell('impacto').font = { color: { argb: 'FFC62828' } }; // Rojo para impacto

            // Última fila del remito: mostrar saldo con color
            if (idx === remito.movimientos.length - 1) {
              const saldoCell = row.getCell('saldo');
              saldoCell.numFmt = '"$"#,##0.00';
              saldoCell.font = { bold: true, color: { argb: saldoColor } };
              saldoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: saldoBgColor } };
            }

            currentRow++;
          });
        } else {
          // Remito sin movimientos
          const row = ws.addRow({
            fecha: new Date(remito.fecha).toLocaleDateString('es-AR'),
            remito: remito.numero_remito || remito.id?.slice(0, 8),
            estado: remito.estado || '',
            material: '(Sin materiales)',
            cantidad: '',
            valorUnit: '',
            impacto: 0,
            saldo: saldoAcumulado
          });
          row.getCell('fecha').font = { bold: true };
          row.getCell('remito').font = { bold: true };
          row.getCell('saldo').numFmt = '"$"#,##0.00';
          row.getCell('saldo').font = { bold: true, color: { argb: saldoColor } };
          row.getCell('saldo').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: saldoBgColor } };
          currentRow++;
        }

        // Agregar fila vacía entre remitos (separador)
        if (remitoIdx < remitosConMovimientos.length - 1) {
          const separadorRow = ws.addRow([]);
          separadorRow.height = 8;
          currentRow++;
        }
      });

      // Fila final: Resumen
      ws.addRow([]);
      const resumenRow = ws.addRow(['', '', '', '', '', '', 'SALDO FINAL:', saldoAcumulado]);
      resumenRow.getCell(7).font = { bold: true, size: 12 };
      resumenRow.getCell(8).numFmt = '"$"#,##0.00';
      resumenRow.getCell(8).font = { bold: true, size: 14, color: { argb: saldoAcumulado < 0 ? 'FFC62828' : 'FF2E7D32' } };
      resumenRow.getCell(8).fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: saldoAcumulado < 0 ? 'FFFFEBEE' : 'FFE8F5E9' } 
      };

      // ========== HOJA DE RESUMEN ==========
      const wsResumen = workbook.addWorksheet('Resumen');
      wsResumen.columns = [
        { header: 'Concepto', key: 'concepto', width: 30 },
        { header: 'Valor', key: 'valor', width: 35 },
      ];

      // Título
      wsResumen.insertRow(1, []);
      wsResumen.mergeCells('A1:B1');
      wsResumen.getCell('A1').value = 'RESUMEN DEL ACOPIO';
      wsResumen.getCell('A1').font = { bold: true, size: 14 };
      wsResumen.getCell('A1').alignment = { horizontal: 'center' };

      wsResumen.addRow([]);
      wsResumen.addRow({ concepto: 'Código Acopio', valor: acopio.codigo });
      wsResumen.addRow({ concepto: 'Descripción', valor: acopio.descripcion || '-' });
      wsResumen.addRow({ concepto: 'Proveedor', valor: acopio.proveedor || '-' });
      wsResumen.addRow({ concepto: 'Proyecto', valor: acopio.proyecto_nombre || '-' });
      wsResumen.addRow([]);

      const valorAcopiadoRow = wsResumen.addRow({ concepto: 'Valor Acopiado', valor: saldoInicial });
      valorAcopiadoRow.getCell('valor').numFmt = '"$"#,##0.00';
      valorAcopiadoRow.getCell('valor').font = { bold: true, color: { argb: 'FF1565C0' } };

      const totalDesRow = wsResumen.addRow({ concepto: 'Total Desacopiado', valor: saldoInicial - saldoAcumulado });
      totalDesRow.getCell('valor').numFmt = '"$"#,##0.00';
      totalDesRow.getCell('valor').font = { color: { argb: 'FFC62828' } };

      const saldoDispRow = wsResumen.addRow({ concepto: 'Saldo Disponible', valor: saldoAcumulado });
      saldoDispRow.getCell('valor').numFmt = '"$"#,##0.00';
      saldoDispRow.getCell('valor').font = { bold: true, size: 12, color: { argb: saldoAcumulado < 0 ? 'FFC62828' : 'FF2E7D32' } };
      saldoDispRow.getCell('valor').fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: saldoAcumulado < 0 ? 'FFFFEBEE' : 'FFE8F5E9' } 
      };

      wsResumen.addRow([]);
      wsResumen.addRow({ concepto: 'Cantidad de Remitos', valor: remitos.length });
      wsResumen.addRow({ concepto: 'Fecha del Informe', valor: new Date().toLocaleString('es-AR') });

      // Exportar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `informe-${acopio.codigo || 'acopio'}-${new Date().toISOString().split('T')[0]}.xlsx`);

      setAlert({ open: true, message: '✅ Informe generado correctamente', severity: 'success' });
    } catch (error) {
      console.error('Error al generar informe:', error);
      setAlert({ open: true, message: 'Error al generar el informe', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimientos = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const { movimientos: movs, error } = await AcopioService.obtenerMovimientos(acopioId);
      if (error) throw new Error('Error al obtener movimientos');
      const comprasData = await AcopioService.obtenerCompras(acopioId);
      const union = [...(movs || []), ...(comprasData || [])];

      // Agrupar
      const agrupados = union.reduce((acc, mov) => {
        const key = (mov.codigo || '—') + "_" + (mov.descripcion || '');
        if (!acc[key]) {
          acc[key] = {
            codigo: mov.codigo || "Sin código",
            descripcion: mov.descripcion || '',
            valorUnitario: mov.valorUnitario || 0,
            cantidadAcopiada: 0,
            cantidadDesacopiada: 0,
            valorTotalAcopiado: 0,
            valorTotalDesacopiado: 0,
            detalles: []
          };
        }
        if (mov.tipo === 'acopio') {
          acc[key].cantidadAcopiada += parseInt(mov.cantidad, 10) || 0;
          acc[key].valorTotalAcopiado += Number(mov.valorOperacion) || 0;
        } else if (mov.tipo === 'desacopio') {
          acc[key].cantidadDesacopiada += parseInt(mov.cantidad, 10) || 0;
          acc[key].valorTotalDesacopiado += Number(mov.valorOperacion) || 0;
        }
        acc[key].detalles.push(mov);
        return acc;
      }, {});
      setMaterialesAgrupados(agrupados);
      setMaterialesCount(Object.keys(agrupados).length);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener los movimientos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  // Fetch documentos complementarios
  const fetchDocumentosComplementarios = useCallback(async () => {
    if (!acopioId) return;
    try {
      setLoading(true);
      const resp = await AcopioService.obtenerDocumentosComplementarios(acopioId);
      setDocumentosComplementarios(resp?.documentos || []);
      setDocumentosCount((resp?.documentos || []).length);
      setDocPageIdx(0);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener documentos complementarios', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  // Duplicados por número y por valor/fecha
  const detectarDuplicados = (lista) => {
    const porNumero = {};
    const porVF = {};
    lista.forEach((r) => {
      if (r.numero_remito) {
        const k = r.numero_remito.trim().toLowerCase();
        porNumero[k] = porNumero[k] || [];
        porNumero[k].push(r.id);
      }
      const k2 = `${r.valorOperacion}_${new Date(r.fecha).toISOString().split('T')[0]}`;
      porVF[k2] = porVF[k2] || [];
      porVF[k2].push(r.id);
    });
    const set = new Set();
    Object.values(porNumero).forEach(ids => { if (ids.length > 1) ids.forEach(id => set.add(id)); });
    Object.values(porVF).forEach(ids => { if (ids.length > 1) ids.forEach(id => set.add(id)); });
    return set;
  };

  // Toggle activo
  const handleToggleActivo = async () => {
    if (!acopio) return;
    try {
      setEstadoLoading(true);
      const nuevoActivo = !(acopio.activo !== false);
      const resp = await AcopioService.cambiarEstadoAcopio(acopioId, nuevoActivo);
      setAcopio(prev => ({ ...prev, activo: nuevoActivo, estado: nuevoActivo ? 'activo' : 'inactivo' }));
      setAlert({ open: true, message: resp?.message || `Acopio ${nuevoActivo ? 'activado' : 'desactivado'}`, severity: 'success' });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo cambiar el estado del acopio', severity: 'error' });
    } finally {
      setEstadoLoading(false);
    }
  };

  // Eliminar remito
  const eliminarRemito = async () => {
    try {
      const exito = await AcopioService.eliminarRemito(acopioId, remitoAEliminar);
      if (exito) {
        setAlert({ open: true, message: 'Remito eliminado con éxito', severity: 'success' });
        await fetchRemitos();
      } else {
        setAlert({ open: true, message: 'No se pudo eliminar el remito', severity: 'error' });
      }
    } catch (error) {
      console.error('Error al eliminar remito:', error);
      setAlert({ open: true, message: 'Error al eliminar remito', severity: 'error' });
    } finally {
      setDialogoEliminarAbierto(false);
      setRemitoAEliminar(null);
    }
  };

  // Enviar comentario
  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim()) return;
    
    try {
      setEnviandoComentario(true);
      const exito = await AcopioService.agregarComentario(
        acopioId, 
        nuevoComentario.trim(),
        user?.name || user?.email || 'Usuario'
      );
      
      if (exito) {
        setNuevoComentario('');
        // Recargar eventos
        await fetchAcopio();
        setAlert({ open: true, message: 'Comentario agregado', severity: 'success' });
      } else {
        setAlert({ open: true, message: 'No se pudo agregar el comentario', severity: 'error' });
      }
    } catch (error) {
      console.error('Error al enviar comentario:', error);
      setAlert({ open: true, message: 'Error al enviar comentario', severity: 'error' });
    } finally {
      setEnviandoComentario(false);
    }
  };

  // Handler para subir documentos complementarios
  const handleSubirDocumentosComplementarios = async (e) => {
    const files = e.target?.files;
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      await AcopioService.subirDocumentosComplementarios(acopioId, files);
      setAlert({ open: true, message: 'Documentos complementarios subidos correctamente', severity: 'success' });
      await fetchDocumentosComplementarios();
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudieron subir los documentos complementarios', severity: 'error' });
    } finally {
      if (e.target) e.target.value = '';
      setLoading(false);
    }
  };

  // Handler para eliminar documento complementario
  const handleEliminarDocumentoComplementario = async (index) => {
    try {
      setLoading(true);
      const exito = await AcopioService.eliminarDocumentoComplementario(acopioId, index);
      if (exito) {
        setAlert({ open: true, message: 'Documento eliminado correctamente', severity: 'success' });
        const wasLast = index === (documentosComplementarios.length - 1);
        await fetchDocumentosComplementarios();
        if (wasLast) setDocPageIdx((p) => Math.max(0, p - 1));
      } else {
        setAlert({ open: true, message: 'No se pudo eliminar el documento', severity: 'error' });
      }
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al eliminar documento', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handler para guardar descripción de documento complementario
  const handleGuardarDescripcion = async (index) => {
    try {
      const exito = await AcopioService.actualizarDescripcionDocumentoComplementario(
        acopioId, 
        index, 
        descripcionEditando
      );
      if (exito) {
        // Actualizar localmente sin refetch
        setDocumentosComplementarios(prev => 
          prev.map((doc, i) => i === index ? { ...doc, descripcion: descripcionEditando } : doc)
        );
        setAlert({ open: true, message: 'Descripción actualizada', severity: 'success' });
      } else {
        setAlert({ open: true, message: 'No se pudo actualizar la descripción', severity: 'error' });
      }
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al actualizar descripción', severity: 'error' });
    } finally {
      setEditandoDescripcionIdx(null);
      setDescripcionEditando('');
    }
  };

  // Tabs: lazy fetch
  useEffect(() => {
    if (!acopioId) return;
    if (tabActiva === 'acopio') fetchAcopio();
    if (tabActiva === 'remitos') fetchRemitos();
    if (tabActiva === 'materiales') fetchMovimientos();
    if (tabActiva === 'documentos') fetchDocumentosComplementarios();
  }, [tabActiva, acopioId, fetchAcopio, fetchRemitos, fetchMovimientos, fetchDocumentosComplementarios]);

  const handleChangeTab = (_e, v) => setTabActiva(v);

  const handleEditAcopio = () => {
    // Redirigir a la página de editar acopio
    router.push(`/editarAcopio?empresaId=${acopio?.empresaId}&acopioId=${acopioId}`);
  };

  const handleUploadFromHeader = () => {
    // Lleva a HOJAS; la subida se hace dentro del visor
    setTabActiva('hojas');
  };

  const handleAcopioFilesSelected = async (e) => {
    const files = e.target?.files;
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      await AcopioService.subirHojasAcopio(acopioId, files);
      setAlert({ open: true, message: 'Hojas del acopio subidas correctamente', severity: 'success' });
      await fetchAcopio();
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudieron subir las hojas del acopio', severity: 'error' });
    } finally {
      if (e.target) e.target.value = '';
      setLoading(false);
    }
  };

  const handleEliminarPaginaAcopio = async (index) => {
    try {
      setLoading(true);
      await AcopioService.eliminarHojaAcopio(acopioId, index);
      setAlert({ open: true, message: 'Página eliminada', severity: 'success' });
      const wasLast = index === (pages.length - 1);
      await fetchAcopio();
      if (wasLast) setPageIdx((p) => Math.max(0, p - 1));
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo eliminar la página', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchActualTab = async () => {
    if (tabActiva === 'remitos') fetchRemitos();
    else if (tabActiva === 'materiales') fetchMovimientos();
    else if (tabActiva === 'acopio') fetchAcopio();
    else if (tabActiva === 'documentos') fetchDocumentosComplementarios();
  };

  // Navegación con teclado en HOJAS
  useEffect(() => {
    if (tabActiva !== 'hojas') return;
    const onKey = (e) => {
      if (!hasAcopioPages) return;
      if (e.key === 'ArrowRight') setPageIdx((i) => (i + 1) % totalPages);
      if (e.key === 'ArrowLeft') setPageIdx((i) => (i - 1 + totalPages) % totalPages);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabActiva, hasAcopioPages, totalPages]);

  // Render
  return (
    <Box component="main">
      <Container maxWidth="xl">
        {/* HEADER */}
        <HeaderAcopioSummary
          acopio={acopio}
          porcentajeDisponible={porcentajeDisponible}
          onVolver={() => router.push(`/acopios?empresaId=${acopio?.empresaId || ''}`)}
          onEditar={handleEditAcopio}
          onUploadClick={handleUploadFromHeader}
          onRecalibrarImagenes={() => AcopioService.recalibrarImagenes(acopioId)}
          onRefrescar={() => { fetchActualTab(); setLastUpdated(new Date()); }}
          isAdmin={Boolean(user?.admin)}
        />

        {/* Indicador de última sincronización */}
        {lastUpdated && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1, color: 'text.secondary' }}>
            <AccessTimeIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption">{formatTimeAgo(lastUpdated)}</Typography>
          </Stack>
        )}

        {/* NAVEGACIÓN - Botones con contadores */}
        <ButtonGroup variant="outlined" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Button
            variant={tabActiva === 'acopio' ? 'contained' : 'outlined'}
            onClick={() => handleChangeTab(null, 'acopio')}
          >
            Info Acopio
          </Button>
          <Button
            variant={tabActiva === 'remitos' ? 'contained' : 'outlined'}
            onClick={() => handleChangeTab(null, 'remitos')}
          >
            Remitos{remitosCount > 0 ? ` (${remitosCount})` : ''}
          </Button>
          <Button
            variant={tabActiva === 'materiales' ? 'contained' : 'outlined'}
            onClick={() => handleChangeTab(null, 'materiales')}
          >
            Materiales{materialesCount > 0 ? ` (${materialesCount})` : ''}
          </Button>
          {acopio?.tipo === 'lista_precios' && (
            <Button
              variant={tabActiva === 'buscar' ? 'contained' : 'outlined'}
              onClick={() => handleChangeTab(null, 'buscar')}
            >
              Buscar materiales
            </Button>
          )}
          {hasAcopioPages && (
            <Button
              variant={tabActiva === 'hojas' ? 'contained' : 'outlined'}
              onClick={() => handleChangeTab(null, 'hojas')}
            >
              {acopio?.tipo === 'lista_precios' ? 'Lista original' : 'Comprobante'}
            </Button>
          )}
          <Button
            variant={tabActiva === 'documentos' ? 'contained' : 'outlined'}
            onClick={() => handleChangeTab(null, 'documentos')}
            startIcon={<AttachFileIcon fontSize="small" />}
          >
            Docs{documentosCount > 0 ? ` (${documentosCount})` : ''}
          </Button>
        </ButtonGroup>

        {/* Alerta de acopio bajo */}
        {acopio && porcentajeDisponible < 10 && porcentajeDisponible >= 0 && (
          <Alert 
            severity="warning" 
            icon={<WarningAmberIcon />}
            sx={{ my: 2 }}
          >
            <strong>⚠️ Acopio casi agotado:</strong> Solo queda el {porcentajeDisponible.toFixed(1)}% disponible 
            ({formatCurrency(va - vd)} de {formatCurrency(va)})
          </Alert>
        )}

        {/* Skeleton loaders durante carga inicial */}
        {initialLoading && (
          <Box sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width="33%" height={100} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="33%" height={100} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="33%" height={100} sx={{ borderRadius: 1 }} />
              </Stack>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
            </Stack>
          </Box>
        )}

        {/* Loading indicator para recargas (no inicial) */}
        {loading && !initialLoading && (
          <LinearProgress sx={{ my: 1 }} />
        )}

        {/* MATERIALS */}
        {tabActiva === 'materiales' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <MaterialesTableV2 materialesAgrupados={materialesAgrupados} loading={loading} tipo={acopio?.tipo || 'materiales'} />
          </Box>
        )}

        {/* REMITOS */}
        {tabActiva === 'remitos' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
              <TooltipHelp {...TOOLTIP_MOVIMIENTOS.exportarInforme}>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={exportarInformeRemitos}
                    disabled={loading || remitos.length === 0}
                  >
                    Exportar Informe
                  </Button>
                </span>
              </TooltipHelp>
            </Stack>
            <RemitosTable
              remitos={remitos}
              remitoMovimientos={remitoMovimientos}
              expanded={expanded}
              setExpanded={setExpanded}
              router={router}
              acopioId={acopioId}
              remitosDuplicados={remitosDuplicados}
              setDialogoEliminarAbierto={setDialogoEliminarAbierto}
              setRemitoAEliminar={setRemitoAEliminar}
            />
          </Box>
        )}

        {/* BUSCAR (para lista de precios) */}
        {tabActiva === 'buscar' && acopio?.tipo === 'lista_precios' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <ListaPreciosBuscador acopioId={acopioId} />
          </Box>
        )}

        {/* INFO ACOPIO + editor */}
        {tabActiva === 'acopio' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            {acopio && (
              <Paper elevation={2} sx={{ p: 3 }}>
                {/* Estado + toggle + edición */}
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Chip
                    size="small"
                    label={acopio?.activo === false ? 'Inactivo' : 'Activo'}
                    color={acopio?.activo === false ? 'default' : 'success'}
                    variant="outlined"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={acopio?.activo !== false}
                        onChange={handleToggleActivo}
                        disabled={estadoLoading}
                      />
                    }
                    label={acopio?.activo !== false ? 'Desactivar' : 'Activar'}
                  />
                  <Button variant="outlined" onClick={handleEditAcopio}>Editar Acopio</Button>
                </Stack>

                {/* Descripción destacada (si existe) */}
                {acopio.descripcion && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                    <Typography variant="body1" color="text.secondary">
                      {acopio.descripcion}
                    </Typography>
                  </Box>
                )}

                {/* Datos del Acopio */}
                <Typography variant="h6" gutterBottom>Información General</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Código</Typography>
                    <Typography variant="body1" fontWeight="medium">{acopio.codigo || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Proveedor</Typography>
                    <Typography variant="body1" fontWeight="medium">{acopio.proveedor || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Proyecto</Typography>
                    <Typography variant="body1" fontWeight="medium">{acopio.proyecto_nombre || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Tipo</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                      {(acopio.tipo || 'materiales').replace('_', ' ')}
                    </Typography>
                  </Grid>
                </Grid>

                {/* KPIs en cards */}
                <Typography variant="h6" gutterBottom>Resumen Financiero</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Valor Acopiado</Typography>
                      <Typography variant="h5" color="success.main" fontWeight="bold">
                        {formatCurrency(acopio?.valor_acopio)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Valor Desacopiado</Typography>
                      <Typography variant="h5" color="error.main" fontWeight="bold">
                        {formatCurrency(acopio?.valor_desacopio)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ p: 2, bgcolor: porcentajeDisponible < 20 ? 'warning.lighter' : 'info.lighter', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Disponible</Typography>
                      <Typography variant="h5" color={porcentajeDisponible < 20 ? 'warning.main' : 'info.main'} fontWeight="bold">
                        {porcentajeDisponible.toFixed(1)}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.max(0, Math.min(100, porcentajeDisponible))} 
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                        color={porcentajeDisponible < 20 ? 'warning' : 'info'}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {/* Historial de eventos */}
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                    Actividad Reciente
                  </Typography>
                  
                  {/* Input para agregar comentario */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Agregar una nota o comentario..."
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEnviarComentario();
                        }
                      }}
                      disabled={enviandoComentario}
                      InputProps={{
                        startAdornment: <CommentIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                      }}
                    />
                    <IconButton 
                      color="primary" 
                      onClick={handleEnviarComentario}
                      disabled={!nuevoComentario.trim() || enviandoComentario}
                    >
                      {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                    </IconButton>
                  </Stack>

                  {eventos.length > 0 ? (
                    <List dense sx={{ bgcolor: '#fafafa', borderRadius: 1 }}>
                      {[...eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5).map((evento, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {evento.tipo === 'creacion' && <Chip size="small" label="Creado" color="success" sx={{ fontSize: 10 }} />}
                            {evento.tipo === 'edicion' && <Chip size="small" label="Editado" color="info" sx={{ fontSize: 10 }} />}
                            {evento.tipo === 'remito_creado' && <Chip size="small" label="Remito+" color="primary" sx={{ fontSize: 10 }} />}
                            {evento.tipo === 'remito_editado' && <Chip size="small" label="Remito" color="warning" sx={{ fontSize: 10 }} />}
                            {evento.tipo === 'remito_eliminado' && <Chip size="small" label="Remito-" color="error" sx={{ fontSize: 10 }} />}
                            {evento.tipo === 'estado_cambio' && <Chip size="small" label="Estado" color="default" sx={{ fontSize: 10 }} />}
                            {evento.tipo === 'comentario' && <Chip size="small" label="Nota" color="secondary" sx={{ fontSize: 10 }} />}
                          </ListItemIcon>
                          <ListItemText
                            primary={evento.texto}
                            secondary={`${evento.usuario ? evento.usuario + ' · ' : ''}${evento.fecha ? new Date(evento.fecha).toLocaleString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No hay actividad registrada aún.
                    </Typography>
                  )}
                  {eventos.length > 5 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      ... y {eventos.length - 5} eventos más
                    </Typography>
                  )}
                </>
              </Paper>
            )}
          </Box>
        )}

        {/* VISOR */}
        {tabActiva === 'hojas' && hasAcopioPages && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <AcopioVisor
              pages={pages}
              pageIdx={pageIdx}
              setPageIdx={setPageIdx}
              onUploadFiles={handleAcopioFilesSelected}
              onDeletePage={handleEliminarPaginaAcopio}
              enableUpload={ENABLE_HOJA_UPLOAD}
              enableDelete={ENABLE_HOJA_DELETE}
              nextPreviewUrl={nextUrl}
            />
          </Box>
        )}

        {/* DOCUMENTOS COMPLEMENTARIOS */}
        {tabActiva === 'documentos' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Documentos Complementarios ({documentosComplementarios.length})
                </Typography>
                <Box>
                  <input
                    id="input-docs-complementarios"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleSubirDocumentosComplementarios}
                  />
                  <label htmlFor="input-docs-complementarios">
                    <Button 
                      variant="contained" 
                      component="span" 
                      startIcon={<UploadFileIcon />}
                      disabled={loading}
                    >
                      Subir documentos
                    </Button>
                  </label>
                </Box>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Agregá documentos adicionales como vencimientos, direcciones, condiciones comerciales u otros datos relevantes.
              </Typography>

              <Divider sx={{ mb: 2 }} />

              {documentosComplementarios.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <AttachFileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No hay documentos complementarios cargados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subí imágenes o PDFs con información adicional del acopio
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'background.paper' }}>
                  {documentosComplementarios.map((doc, index) => {
                    const isPdf = doc.tipo === 'pdf' || doc.url?.toLowerCase().includes('.pdf');
                    return (
                      <ListItem
                        key={index}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon>
                          {isPdf ? (
                            <PictureAsPdfIcon color="error" />
                          ) : (
                            <ImageIcon color="primary" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle2">
                                {doc.nombre || `Documento ${index + 1}`}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={isPdf ? 'PDF' : 'Imagen'} 
                                variant="outlined"
                                sx={{ fontSize: 10 }}
                              />
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                              {editandoDescripcionIdx === index ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Agregar descripción..."
                                    value={descripcionEditando}
                                    onChange={(e) => setDescripcionEditando(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleGuardarDescripcion(index);
                                      if (e.key === 'Escape') setEditandoDescripcionIdx(null);
                                    }}
                                  />
                                  <IconButton 
                                    size="small" 
                                    color="primary"
                                    onClick={() => handleGuardarDescripcion(index)}
                                  >
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="body2" color="text.secondary">
                                    {doc.descripcion || 'Sin descripción'}
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => {
                                      setEditandoDescripcionIdx(index);
                                      setDescripcionEditando(doc.descripcion || '');
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              )}
                              <Typography variant="caption" color="text.disabled">
                                {doc.fecha 
                                  ? new Date(doc.fecha).toLocaleDateString('es-AR', { 
                                      day: '2-digit', month: 'short', year: 'numeric' 
                                    })
                                  : ''}
                              </Typography>
                            </Stack>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Abrir documento">
                              <IconButton 
                                edge="end" 
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                <OpenInNewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton 
                                edge="end" 
                                color="error"
                                onClick={() => handleEliminarDocumentoComplementario(index)}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Paper>
          </Box>
        )}

        {/* Confirmación eliminar remito */}
        {dialogoEliminarAbierto && (
          <Dialog open={dialogoEliminarAbierto} onClose={() => setDialogoEliminarAbierto(false)}>
            <DialogContent>
              <Typography variant="h6" gutterBottom>
                ¿Estás seguro de que querés eliminar este remito?
              </Typography>
              <Stack direction="row" spacing={2} mt={2}>
                <Button variant="outlined" onClick={() => setDialogoEliminarAbierto(false)}>Cancelar</Button>
                <Button variant="contained" color="error" startIcon={<DeleteOutlineIcon />} onClick={eliminarRemito}>
                  Eliminar
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>
        )}

        {/* Snackbar */}
        <Snackbar
          open={alert.open}
          autoHideDuration={5000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Botón actualizar flotante */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchActualTab}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            Actualizar
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

MovimientosAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovimientosAcopioPage;
