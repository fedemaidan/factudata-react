// pages/MovimientosAcopioPage.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Button, Container, Stack, Typography, Tabs, Tab, Paper, Grid, Snackbar, Alert,
  Dialog, DialogContent, DialogTitle, DialogActions, TextField, Divider, LinearProgress, IconButton, Tooltip,
  List, ListItem, ListItemIcon, ListItemText, Skeleton, Chip
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import CommentIcon from '@mui/icons-material/Comment';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import Switch from '@mui/material/Switch';

import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import AcopioService from 'src/services/acopioService';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { formatCurrency } from 'src/utils/formatters';

// Nuevos componentes:
import HeaderAcopioSummary from 'src/components/headerAcopioSummary';
import MaterialesTableV2 from 'src/components/materialesTableV2';

// Tu tabla actual de Remitos:
import RemitosTable from 'src/components/remitosTable';


// Tooltips de ayuda
import TooltipHelp from 'src/components/TooltipHelp';
import { TOOLTIP_MOVIMIENTOS } from 'src/constant/tooltipTexts';

/** ------------------------------
 *  FLAGS DE FUNCIONALIDAD (configurables)
 *  ------------------------------ */
const ENABLE_HOJA_UPLOAD = false;  // activar cuando backend listo
const ENABLE_HOJA_DELETE = false;  // activar cuando backend listo

function DonutChart({ va, vd, pct, codigo, proveedor, proyecto }) {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  const desacLen = (vd / va) * circumference;
  const dispLen = circumference - desacLen;
  const GAP = 2;

  const handleDownload = () => {
    const disponible = Math.max(0, va - vd);
    const escapeXml = (s) =>
      String(s ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const W = 640;
    const H = 460;
    const colW = (W - 48) / 3;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif">
  <rect width="100%" height="100%" fill="#ffffff"/>

  <!-- Identificación: 3 columnas -->
  <g transform="translate(24, 36)">
    <text x="0" y="0" font-size="11" fill="#999">Código</text>
    <text x="0" y="22" font-size="15" font-weight="bold" fill="#333">${escapeXml(codigo)}</text>
    <text x="${colW}" y="0" font-size="11" fill="#999">Proveedor</text>
    <text x="${colW}" y="22" font-size="15" font-weight="bold" fill="#333">${escapeXml(proveedor)}</text>
    <text x="${colW * 2}" y="0" font-size="11" fill="#999">Proyecto</text>
    <text x="${colW * 2}" y="22" font-size="15" font-weight="bold" fill="#333">${escapeXml(proyecto)}</text>
  </g>

  <line x1="24" y1="80" x2="${W - 24}" y2="80" stroke="#e0e0e0"/>

  <text x="24" y="106" font-size="14" fill="#666">Resumen Financiero</text>

  <!-- Donut -->
  <g transform="translate(${(W - 140) / 2}, 124)">
    <g transform="rotate(-90, 70, 70)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ef5350" stroke-width="16"
        stroke-dasharray="${Math.max(0, desacLen - GAP)} ${circumference}" stroke-dashoffset="0"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#4caf50" stroke-width="16"
        stroke-dasharray="${Math.max(0, dispLen - GAP)} ${circumference}" stroke-dashoffset="${-desacLen}"/>
    </g>
    <text x="70" y="64" text-anchor="middle" font-size="10" fill="#999">Disponible</text>
    <text x="70" y="83" text-anchor="middle" font-size="19" font-weight="bold" fill="#333">${pct.toFixed(1)}%</text>
  </g>

  <!-- Leyenda -->
  <g transform="translate(${W / 2 - 90}, 284)">
    <circle cx="6" cy="6" r="5" fill="#ef5350"/>
    <text x="18" y="10" font-size="11" fill="#666">Desacopiado</text>
    <circle cx="100" cy="6" r="5" fill="#4caf50"/>
    <text x="112" y="10" font-size="11" fill="#666">Disponible</text>
  </g>

  <!-- Datos financieros -->
  <g transform="translate(24, 330)">
    <text x="0"   y="0"  font-size="11" fill="#999">Acopiado</text>
    <text x="0"   y="20" font-size="15" font-weight="bold" fill="#333">${escapeXml(formatCurrency(va))}</text>
    <text x="${(W - 48) / 2}" y="0"  font-size="11" fill="#999">Desacopiado</text>
    <text x="${(W - 48) / 2}" y="20" font-size="15" font-weight="bold" fill="#ef5350">${escapeXml(formatCurrency(vd))}</text>
    <text x="0"   y="50" font-size="11" fill="#999">Disponible</text>
    <text x="0"   y="70" font-size="15" font-weight="bold" fill="${vd > va ? '#ef5350' : '#4caf50'}">${escapeXml(formatCurrency(disponible))}</text>
    <text x="${(W - 48) / 2}" y="50" font-size="11" fill="#999">% Disponible</text>
    <text x="${(W - 48) / 2}" y="70" font-size="15" font-weight="bold" fill="${vd > va ? '#ef5350' : '#4caf50'}">${pct.toFixed(1)}%</text>
  </g>
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acopio-${codigo || 'financiero'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ maxWidth: 200 }}>
      <svg id={`donut-${codigo}`} width="140" height="140" viewBox="0 0 140 140">
        <g transform="rotate(-90, 70, 70)">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef5350" strokeWidth="16"
            strokeDasharray={`${Math.max(0, desacLen - GAP)} ${circumference}`}
            strokeDashoffset="0"
          />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4caf50" strokeWidth="16"
            strokeDasharray={`${Math.max(0, dispLen - GAP)} ${circumference}`}
            strokeDashoffset={-desacLen}
          />
        </g>
        <text x="70" y="64" textAnchor="middle" fontSize="10" fill="#999" fontFamily="inherit">Disponible</text>
        <text x="70" y="83" textAnchor="middle" fontSize="19" fontWeight="bold" fill="#333" fontFamily="inherit">
          {pct.toFixed(1)}%
        </text>
      </svg>
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 0.25 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#ef5350' }} />
          <Typography variant="caption" color="text.secondary">Desacopiado</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#4caf50' }} />
          <Typography variant="caption" color="text.secondary">Disponible</Typography>
        </Stack>
      </Stack>
      <Box sx={{ textAlign: 'center', mt: 0.5 }}>
        <Button size="small" variant="text" onClick={handleDownload}
          startIcon={<DownloadIcon fontSize="small" />}
          sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'none' }}
        >
          Descargar
        </Button>
      </Box>
    </Box>
  );
}

const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId, tab: tabQuery } = router.query;
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();

  // Estado principal
  const TABS_VALIDOS = ['acopio', 'remitos', 'materiales', 'archivos', 'actividad'];
  const [tabActiva, setTabActiva] = useState(() =>
    TABS_VALIDOS.includes(tabQuery) ? tabQuery : 'acopio'
  );
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Para skeleton loaders
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const [acopio, setAcopio] = useState(null);
  const [descripcionDialogOpen, setDescripcionDialogOpen] = useState(false);
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [guardandoDescripcion, setGuardandoDescripcion] = useState(false);
  const [instruccionesDialogOpen, setInstruccionesDialogOpen] = useState(false);
  const [instruccionesEdit, setInstruccionesEdit] = useState('');
  const [guardandoInstrucciones, setGuardandoInstrucciones] = useState(false);
  
  // Conteo para badges en tabs
  const [remitosCount, setRemitosCount] = useState(null); // null = no cargado, 0+ = cargado
  const [materialesCount, setMaterialesCount] = useState(null);
  const [documentosCount, setDocumentosCount] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null); // Timestamp de última actualización
  const [eventos, setEventos] = useState([]); // Historial de eventos
  const [nuevoComentario, setNuevoComentario] = useState(''); // Input de comentario
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Sincronizar tab con URL (router.query llega vacío en el primer render en Next.js)
  useEffect(() => {
    if (tabQuery && TABS_VALIDOS.includes(tabQuery) && tabQuery !== tabActiva) {
      setTabActiva(tabQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabQuery]);

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
  const [editandoDescripcionIdx, setEditandoDescripcionIdx] = useState(null);
  const [descripcionEditando, setDescripcionEditando] = useState('');
  const [docAEliminarIdx, setDocAEliminarIdx] = useState(null);
  const [actividadExpandida, setActividadExpandida] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(false);
  const tabLoadedAt = useRef({});

  // Editor ya no se necesita - la edición se hace en página separada

  // Visor
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

      // Cargar eventos del historial
      setEventos(acopioData.eventos || []);

      if (acopioData.codigo) {
        document.title = `${acopioData.codigo} · Acopio`;
      }

      const comprasData = await AcopioService.obtenerCompras(acopioId);
      setCompras(comprasData || []);

      // Cargar conteos en background; pasamos las compras ya cargadas para evitar doble fetch
      loadCountsInBackground(comprasData);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al obtener información del acopio', severity: 'error' });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [acopioId]);

  // Cargar conteos en background para badges (sin bloquear UI)
  const loadCountsInBackground = useCallback(async (comprasYaCargadas = null) => {
    if (!acopioId) return;

    try {
      const [remitosResp, movimientosResp, docsResp] = await Promise.allSettled([
        AcopioService.obtenerRemitos(acopioId),
        AcopioService.obtenerMovimientos(acopioId),
        AcopioService.obtenerDocumentosComplementarios(acopioId)
      ]);

      if (remitosResp.status === 'fulfilled') {
        setRemitosCount((remitosResp.value || []).length);
      }

      if (movimientosResp.status === 'fulfilled') {
        const { movimientos: movs } = movimientosResp.value || {};
        // Reusar las compras ya cargadas si las tenemos; evita un fetch extra
        const comprasData = comprasYaCargadas ?? await AcopioService.obtenerCompras(acopioId);
        const union = [...(movs || []), ...(comprasData || [])];
        const uniqueKeys = new Set(union.map(m => `${m.codigo || '—'}_${m.descripcion || ''}`));
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

  const openDescripcionDialog = () => {
    setDescripcionEdit(acopio?.descripcion || '');
    setDescripcionDialogOpen(true);
  };

  const closeDescripcionDialog = () => {
    setDescripcionDialogOpen(false);
    setDescripcionEdit('');
  };

  const handleGuardarDescripcionAcopio = async () => {
    if (!acopio) return;
    setGuardandoDescripcion(true);
    try {
      const ok = await AcopioService.editarAcopio(acopioId, {
        proveedor: acopio.proveedor,
        proyecto_id: acopio.proyecto_id || acopio.proyectoId || '',
        codigo: acopio.codigo,
        descripcion: descripcionEdit,
        instrucciones_extraccion: acopio.instrucciones_extraccion,
      });
      if (ok) {
        setAcopio((prev) => ({ ...prev, descripcion: descripcionEdit }));
        setAlert({ open: true, message: 'Descripción actualizada', severity: 'success' });
        closeDescripcionDialog();
      } else {
        setAlert({ open: true, message: 'No se pudo actualizar la descripción', severity: 'error' });
      }
    } catch (error) {
      setAlert({ open: true, message: 'Error al actualizar la descripción', severity: 'error' });
    } finally {
      setGuardandoDescripcion(false);
    }
  };

  const openInstruccionesDialog = () => {
    setInstruccionesEdit(acopio?.instrucciones_extraccion || '');
    setInstruccionesDialogOpen(true);
  };

  const closeInstruccionesDialog = () => {
    setInstruccionesDialogOpen(false);
    setInstruccionesEdit('');
  };

  const handleGuardarInstrucciones = async () => {
    if (!acopio) return;
    setGuardandoInstrucciones(true);
    try {
      const ok = await AcopioService.editarAcopio(acopioId, {
        proveedor: acopio.proveedor,
        proyecto_id: acopio.proyecto_id || acopio.proyectoId || '',
        codigo: acopio.codigo,
        descripcion: acopio.descripcion || '',
        instrucciones_extraccion: instruccionesEdit,
      });
      if (ok) {
        setAcopio((prev) => ({ ...prev, instrucciones_extraccion: instruccionesEdit }));
        setAlert({ open: true, message: 'Aclaraciones actualizadas', severity: 'success' });
        closeInstruccionesDialog();
      } else {
        setAlert({ open: true, message: 'No se pudo actualizar las aclaraciones', severity: 'error' });
      }
    } catch (error) {
      setAlert({ open: true, message: 'Error al actualizar las aclaraciones', severity: 'error' });
    } finally {
      setGuardandoInstrucciones(false);
    }
  };

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
      tituloCell.font = { bold: true, size: 16 };
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
      ws.getCell('D3').font = { bold: true, size: 14 };

      // Fila 4: Espacio
      ws.insertRow(4, []);

      // Fila 5: Encabezados de columna (ya definidos, pero mover a fila 5)
      const headerRow = ws.getRow(5);
      headerRow.values = ['Fecha', 'Nº Remito', 'Estado', 'Material', 'Cantidad', 'Valor Unit.', 'Impacto', 'Saldo Parcial'];
      headerRow.font = { bold: true };
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
              saldo: null
            });

            // Estilo de primera fila del remito (encabezado del remito)
            if (idx === 0) {
              row.getCell('fecha').font = { bold: true };
              row.getCell('remito').font = { bold: true, size: 11 };
              row.getCell('estado').font = { bold: true };
            }

            // Formato de números
            row.getCell('valorUnit').numFmt = '"$"#,##0.00';
            row.getCell('impacto').numFmt = '"$"#,##0.00';
            row.getCell('impacto').font = {};

            currentRow++;
          });

          // Fila de total del remito
          const totalRemitoRow = ws.addRow({
            fecha: '',
            remito: '',
            estado: '',
            material: 'TOTAL REMITO',
            cantidad: '',
            valorUnit: '',
            impacto: impactoRemito,
            saldo: saldoAcumulado
          });
          totalRemitoRow.getCell('material').font = { bold: true, italic: true };
          totalRemitoRow.getCell('impacto').numFmt = '"$"#,##0.00';
          totalRemitoRow.getCell('impacto').font = { bold: true };
          totalRemitoRow.getCell('saldo').numFmt = '"$"#,##0.00';
          totalRemitoRow.getCell('saldo').font = { bold: true };
          currentRow++;
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
          row.getCell('saldo').font = { bold: true };
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
      resumenRow.getCell(8).font = { bold: true, size: 14 };

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
      valorAcopiadoRow.getCell('valor').font = { bold: true };

      const totalDesRow = wsResumen.addRow({ concepto: 'Total Desacopiado', valor: saldoInicial - saldoAcumulado });
      totalDesRow.getCell('valor').numFmt = '"$"#,##0.00';
      totalDesRow.getCell('valor').font = {};

      const saldoDispRow = wsResumen.addRow({ concepto: 'Saldo Disponible', valor: saldoAcumulado });
      saldoDispRow.getCell('valor').numFmt = '"$"#,##0.00';
      saldoDispRow.getCell('valor').font = { bold: true, size: 12 };

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
    const remitoId = remitoAEliminar?.id || remitoAEliminar;
    try {
      const exito = await AcopioService.eliminarRemito(acopioId, remitoId);
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
        await fetchDocumentosComplementarios();
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

  // Tabs: lazy fetch con cache de 60 s por tab
  useEffect(() => {
    if (!acopioId) return;
    const STALE_MS = 60_000;
    const now = Date.now();
    const stale = (tab) => !tabLoadedAt.current[tab] || now - tabLoadedAt.current[tab] > STALE_MS;
    const mark  = (tab) => { tabLoadedAt.current[tab] = Date.now(); };

    if (tabActiva === 'acopio'     && stale('acopio'))     { fetchAcopio();                    mark('acopio'); }
    if (tabActiva === 'remitos'    && stale('remitos'))    { fetchRemitos();                   mark('remitos'); }
    if (tabActiva === 'materiales' && stale('materiales')) { fetchMovimientos();               mark('materiales'); }
    if (tabActiva === 'archivos'   && stale('archivos'))   { fetchDocumentosComplementarios(); mark('archivos'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActiva, acopioId]);

  const handleChangeTab = (_e, v) => setTabActiva(v);

  const handleNuevoRemito = () => {
    router.push(`/gestionRemito?acopioId=${acopioId}`);
  };

  const handleEditAcopio = () => {
    // Redirigir a la página de editar acopio
    router.push(`/editarAcopio?empresaId=${acopio?.empresaId}&acopioId=${acopioId}`);
  };

  const handleUploadFromHeader = () => setTabActiva('archivos');

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
      await fetchAcopio();
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo eliminar la página', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchActualTab = async () => {
    // Invalidar cache del tab actual para forzar refetch
    tabLoadedAt.current[tabActiva] = 0;
    setManualRefresh(true);
    setLastUpdated(new Date());
    if (tabActiva === 'remitos') fetchRemitos();
    else if (tabActiva === 'materiales') fetchMovimientos();
    else if (tabActiva === 'acopio') fetchAcopio();
    else if (tabActiva === 'archivos') fetchDocumentosComplementarios();
  };


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
          onRecalibrarImagenes={() => AcopioService.recalibrarImagenes(acopioId)}
          onRefrescar={fetchActualTab}
          isAdmin={Boolean(user?.admin)}
        />

        {/* Indicador de última sincronización — solo tras refresh manual */}
        {manualRefresh && lastUpdated && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1, color: 'text.secondary' }}>
            <AccessTimeIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption">Actualizado {formatTimeAgo(lastUpdated)}</Typography>
          </Stack>
        )}

        {/* NAVEGACIÓN */}
        <Tabs
          value={tabActiva}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Resumen" value="acopio" />
          <Tab value="remitos"    label={remitosCount   > 0 ? `Remitos · ${remitosCount}`    : 'Remitos'} />
          <Tab value="materiales" label={materialesCount > 0 ? `Materiales · ${materialesCount}` : 'Materiales'} />
          <Tab value="archivos"   label={
            (() => {
              const total = (pages?.length || 0) + (documentosComplementarios?.length || 0);
              return total > 0 ? `Archivos · ${total}` : 'Archivos';
            })()
          } />
          <Tab value="actividad" label={eventos.length > 0 ? `Actividad · ${eventos.length}` : 'Actividad'} />
        </Tabs>

        {/* Alertas de saldo */}
        {acopio && va > 0 && vd > va && (
          <Alert severity="error" icon={<WarningAmberIcon />} sx={{ my: 2 }}>
            <strong>Saldo negativo:</strong> El total desacopiado ({formatCurrency(vd)}) supera el valor acopiado ({formatCurrency(va)}).
          </Alert>
        )}
        {acopio && porcentajeDisponible >= 0 && porcentajeDisponible < 10 && vd <= va && (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ my: 2 }}>
            <strong>Acopio casi agotado:</strong> Solo queda el {porcentajeDisponible.toFixed(1)}% disponible
            ({formatCurrency(va - vd)} de {formatCurrency(va)})
          </Alert>
        )}
        {acopio && porcentajeDisponible >= 10 && porcentajeDisponible < 20 && vd <= va && (
          <Alert severity="info" icon={<WarningAmberIcon />} sx={{ my: 2 }}>
            <strong>Acopio bajo:</strong> Queda el {porcentajeDisponible.toFixed(1)}% disponible
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
            <RemitosTable
              remitos={remitos}
              remitoMovimientos={remitoMovimientos}
              setRemitoMovimientos={setRemitoMovimientos}
              expanded={expanded}
              setExpanded={setExpanded}
              router={router}
              acopioId={acopioId}
              remitosDuplicados={remitosDuplicados}
              setDialogoEliminarAbierto={setDialogoEliminarAbierto}
              setRemitoAEliminar={setRemitoAEliminar}
              onExportarInforme={exportarInformeRemitos}
              onNuevoRemito={handleNuevoRemito}
            />
          </Box>
        )}


        {/* INFO ACOPIO + editor */}
        {tabActiva === 'acopio' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            {acopio && (
              <Paper elevation={2} sx={{ p: 3 }}>
                {/* Toggle activo/inactivo */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {acopio?.activo !== false ? 'Activo' : 'Inactivo'}
                  </Typography>
                  <Tooltip title={acopio?.activo !== false ? 'Desactivar acopio' : 'Activar acopio'}>
                    <Switch
                      checked={acopio?.activo !== false}
                      onChange={handleToggleActivo}
                      disabled={estadoLoading}
                      size="small"
                    />
                  </Tooltip>
                </Stack>

                {/* Descripción destacada / edición rápida */}
                <Box sx={{ mb: 3 }}>
                  {acopio.descripcion ? (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ flex: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                        <Typography variant="body1" color="text.secondary">
                          {acopio.descripcion}
                        </Typography>
                      </Box>
                      <Tooltip title="Editar descripción">
                        <IconButton size="small" onClick={openDescripcionDialog} sx={{ mt: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Button
                      variant="text"
                      size="small"
                      onClick={openDescripcionDialog}
                      startIcon={<EditIcon fontSize="inherit" />}
                      sx={{ px: 0, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                    >
                      Agregar descripción
                    </Button>
                  )}
                </Box>

                {/* Aclaraciones para extracción */}
                <Box sx={{ mb: 3 }}>
                  {acopio.instrucciones_extraccion ? (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ flex: 1, p: 2, bgcolor: 'warning.lighter', borderRadius: 1, borderLeft: '4px solid', borderColor: 'warning.main' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Aclaraciones para el análisis de documentos
                        </Typography>
                        <Typography variant="body2">
                          {acopio.instrucciones_extraccion}
                        </Typography>
                      </Box>
                      <Tooltip title="Editar aclaraciones">
                        <IconButton size="small" onClick={openInstruccionesDialog} sx={{ mt: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Button
                      variant="text"
                      size="small"
                      onClick={openInstruccionesDialog}
                      startIcon={<EditIcon fontSize="inherit" />}
                      sx={{ px: 0, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                    >
                      Agregar aclaraciones para el análisis de documentos
                    </Button>
                  )}
                </Box>

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

                {/* Resumen Financiero con gráfico */}
                {va > 0 && (
                  <Box sx={{ mt: 1, mb: 3 }}>
                    <Divider sx={{ mb: 2.5 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Resumen Financiero
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ sm: 'center' }}>
                      <Grid container spacing={2} sx={{ maxWidth: { sm: 380 } }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Acopiado</Typography>
                          <Typography variant="subtitle1" fontWeight={700}>{formatCurrency(va)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Desacopiado</Typography>
                          <Typography variant="subtitle1" fontWeight={700} color="error.main">
                            {formatCurrency(vd)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Disponible</Typography>
                          <Typography variant="subtitle1" fontWeight={700} color={vd > va ? 'error.main' : 'success.main'}>
                            {formatCurrency(Math.max(0, va - vd))}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">% Disponible</Typography>
                          <Typography variant="subtitle1" fontWeight={700} color={vd > va ? 'error.main' : 'success.main'}>
                            {porcentajeDisponible.toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                      {vd > 0 && vd < va && (
                        <DonutChart va={va} vd={vd} pct={porcentajeDisponible} codigo={acopio?.codigo} proveedor={acopio?.proveedor} proyecto={acopio?.proyecto_nombre} />
                      )}
                    </Stack>
                  </Box>
                )}

              </Paper>
            )}
          </Box>
        )}

        {/* ARCHIVOS — hojas del acopio + documentos complementarios */}
        {tabActiva === 'archivos' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <Paper elevation={2} sx={{ p: 3 }}>

              {/* ── Hojas del acopio ── */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Hojas del acopio
                </Typography>
                {ENABLE_HOJA_UPLOAD && (
                  <>
                    <input
                      id="input-hojas-acopio"
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={handleAcopioFilesSelected}
                    />
                    <label htmlFor="input-hojas-acopio">
                      <Button variant="outlined" size="small" component="span" startIcon={<UploadFileIcon />} disabled={loading}>
                        Subir
                      </Button>
                    </label>
                  </>
                )}
              </Stack>

              {pages.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay hojas cargadas</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {pages.map((page, idx) => {
                    const url = typeof page === 'string' ? page : page.url;
                    const name = typeof page === 'object' && page.nombre ? page.nombre : `Hoja ${idx + 1}`;
                    const isPdf = url?.toLowerCase().includes('.pdf');
                    return (
                      <ListItem
                        key={idx}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Abrir en nueva pestaña">
                              <IconButton size="small" onClick={() => window.open(url, '_blank')}>
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {ENABLE_HOJA_DELETE && (
                              <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => handleEliminarPaginaAcopio(idx)}>
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        }
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => window.open(url, '_blank')}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isPdf ? <PictureAsPdfIcon color="error" fontSize="small" /> : <ImageIcon color="primary" fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={name}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                          secondary={isPdf ? 'PDF' : 'Imagen'}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}

              <Divider sx={{ my: 2.5 }} />

              {/* ── Documentos complementarios ── */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Documentos complementarios
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
                    <Button variant="outlined" size="small" component="span" startIcon={<UploadFileIcon />} disabled={loading}>
                      Subir
                    </Button>
                  </label>
                </Box>
              </Stack>

              {documentosComplementarios.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay documentos complementarios</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {documentosComplementarios.map((doc, index) => {
                    const isPdf = doc.tipo === 'pdf' || doc.url?.toLowerCase().includes('.pdf');
                    return (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Abrir en nueva pestaña">
                              <IconButton size="small" onClick={() => window.open(doc.url, '_blank')}>
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => setDocAEliminarIdx(index)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        }
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 0.75, '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isPdf ? <PictureAsPdfIcon color="error" fontSize="small" /> : <ImageIcon color="primary" fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                {doc.nombre || `Documento ${index + 1}`}
                              </Typography>
                              <Chip size="small" label={isPdf ? 'PDF' : 'Imagen'} variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.5} sx={{ mt: 0.25 }}>
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
                                  <IconButton size="small" color="primary" onClick={() => handleGuardarDescripcion(index)}>
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    {doc.descripcion || 'Sin descripción'}
                                  </Typography>
                                  <IconButton size="small" onClick={() => { setEditandoDescripcionIdx(index); setDescripcionEditando(doc.descripcion || ''); }}>
                                    <EditIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Stack>
                              )}
                              {doc.fecha && (
                                <Typography variant="caption" color="text.disabled">
                                  {new Date(doc.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Paper>
          </Box>
        )}

        {/* ACTIVIDAD */}
        {tabActiva === 'actividad' && !initialLoading && (
          <Box sx={{ mt: 2 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              {/* Agregar nota */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CommentIcon fontSize="small" /> Nueva nota
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Escribí una nota sobre este acopio... (Enter para enviar)"
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEnviarComentario();
                      }
                    }}
                    disabled={enviandoComentario}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    endIcon={enviandoComentario ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                    onClick={handleEnviarComentario}
                    disabled={!nuevoComentario.trim() || enviandoComentario}
                  >
                    Enviar
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                Historial
              </Typography>

              {eventos.length > 0 ? (
                <List dense sx={{ bgcolor: '#fafafa', borderRadius: 1 }}>
                  {[...eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .slice(0, actividadExpandida ? undefined : 10).map((evento, idx) => (
                    <ListItem key={idx} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {evento.tipo === 'creacion'        && <Chip size="small" label="Creado"   color="success"   sx={{ fontSize: 10 }} />}
                        {evento.tipo === 'edicion'         && <Chip size="small" label="Editado"  color="info"      sx={{ fontSize: 10 }} />}
                        {evento.tipo === 'remito_creado'   && <Chip size="small" label="Remito+"  color="primary"   sx={{ fontSize: 10 }} />}
                        {evento.tipo === 'remito_editado'  && <Chip size="small" label="Remito"   color="warning"   sx={{ fontSize: 10 }} />}
                        {evento.tipo === 'remito_eliminado'&& <Chip size="small" label="Remito-"  color="error"     sx={{ fontSize: 10 }} />}
                        {evento.tipo === 'estado_cambio'   && <Chip size="small" label="Estado"   color="default"   sx={{ fontSize: 10 }} />}
                        {evento.tipo === 'comentario'      && <Chip size="small" label="Nota"     color="secondary" sx={{ fontSize: 10 }} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={evento.texto}
                        secondary={`${evento.usuario ? evento.usuario + ' · ' : ''}${evento.fecha ? new Date(evento.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}`}
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
              {eventos.length > 10 && (
                <Button size="small" variant="text" onClick={() => setActividadExpandida(v => !v)} sx={{ mt: 0.5, textTransform: 'none' }}>
                  {actividadExpandida ? 'Ver menos' : `Ver ${eventos.length - 10} más`}
                </Button>
              )}
            </Paper>
          </Box>
        )}

        {/* Confirmación eliminar remito */}
        <Dialog open={dialogoEliminarAbierto} onClose={() => setDialogoEliminarAbierto(false)}>
          <DialogTitle>Eliminar remito</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              ¿Estás seguro de que querés eliminar este remito?
            </Typography>
            {remitoAEliminar && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                {remitoAEliminar.numero_remito && (
                  <Typography variant="body2"><strong>Número:</strong> {remitoAEliminar.numero_remito}</Typography>
                )}
                {remitoAEliminar.fecha && (
                  <Typography variant="body2"><strong>Fecha:</strong> {new Date(remitoAEliminar.fecha).toLocaleDateString('es-AR')}</Typography>
                )}
                {remitoAEliminar.valorOperacion != null && (
                  <Typography variant="body2"><strong>Valor:</strong> {formatCurrency(remitoAEliminar.valorOperacion)}</Typography>
                )}
              </Box>
            )}
            <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogoEliminarAbierto(false)}>Cancelar</Button>
            <Button variant="contained" color="error" startIcon={<DeleteOutlineIcon />} onClick={eliminarRemito}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={descripcionDialogOpen} onClose={closeDescripcionDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Descripción del acopio</DialogTitle>
          <DialogContent>
            <TextField
              value={descripcionEdit}
              onChange={(e) => setDescripcionEdit(e.target.value)}
              placeholder="Agregar una descripción breve"
              fullWidth
              multiline
              minRows={3}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDescripcionDialog}>Cancelar</Button>
            <Button onClick={handleGuardarDescripcionAcopio} variant="contained" disabled={guardandoDescripcion}>
              {guardandoDescripcion ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={instruccionesDialogOpen} onClose={closeInstruccionesDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Aclaraciones para el análisis de documentos</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Estas indicaciones se envían al bot cada vez que analiza remitos, facturas u otros documentos de este acopio.
              Usalo para aclarar particularidades del proveedor (formato de números, unidades, etc.)
            </Typography>
            <TextField
              value={instruccionesEdit}
              onChange={(e) => setInstruccionesEdit(e.target.value)}
              placeholder='Ej: "Este corralón usa la coma para separar decimales con tres ceros atrás (10,000 = 10 unidades). Se maneja solo en kg."'
              fullWidth
              multiline
              minRows={4}
              maxRows={8}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeInstruccionesDialog}>Cancelar</Button>
            <Button onClick={handleGuardarInstrucciones} variant="contained" disabled={guardandoInstrucciones}>
              {guardandoInstrucciones ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmación eliminar documento complementario */}
        <Dialog open={docAEliminarIdx !== null} onClose={() => setDocAEliminarIdx(null)}>
          <DialogTitle>Eliminar documento</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              ¿Estás seguro de que querés eliminar este documento?
            </Typography>
            {docAEliminarIdx !== null && documentosComplementarios[docAEliminarIdx] && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{documentosComplementarios[docAEliminarIdx].nombre || `Documento ${docAEliminarIdx + 1}`}</strong>
                </Typography>
                {documentosComplementarios[docAEliminarIdx].descripcion && (
                  <Typography variant="body2" color="text.secondary">
                    {documentosComplementarios[docAEliminarIdx].descripcion}
                  </Typography>
                )}
              </Box>
            )}
            <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDocAEliminarIdx(null)}>Cancelar</Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => {
                const idx = docAEliminarIdx;
                setDocAEliminarIdx(null);
                handleEliminarDocumentoComplementario(idx);
              }}
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

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

      </Container>
    </Box>
  );
};

MovimientosAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovimientosAcopioPage;
