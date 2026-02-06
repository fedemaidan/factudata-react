import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton, Chip, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ClearIcon from '@mui/icons-material/Clear';
import TableViewIcon from '@mui/icons-material/TableView';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SickIcon from '@mui/icons-material/Sick';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TableSelectComponent from 'src/components/TableSelectComponent';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import conciliacionService from 'src/services/dhn/conciliacionService';
import ImagenModal from 'src/components/ImagenModal';
import TrabajosDetectadosList from 'src/components/dhn/TrabajosDetectadosList';
import HorasRawModal from 'src/components/dhn/HorasRawModal';

const DEFAULT_PAGE_SIZE = 200;
const HORAS_EXCEL_FIELDS = [
  "horasNormales",
  "horas50",
  "horas100",
  "horasNocturnas",
  "horasNocturnas50",
  "horasNocturnas100",
];

const ConciliacionDetallePage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, okAutomatico: 0, okManual: 0, incompleto: 0, advertencia: 0, pendiente: 0, error: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoInfo, setPeriodoInfo] = useState('-');
  const [sheetId, setSheetId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState('fecha');
  const [sortDirection, setSortDirection] = useState('desc');
  const [editOpen, setEditOpen] = useState(false);
  const [rowToEdit, setRowToEdit] = useState(null);
  const [selectedRowsMap, setSelectedRowsMap] = useState(() => new Map());
  const [formHoras, setFormHoras] = useState({
    horasNormales: null,
    horas50: null,
    horas100: null,
    horasAltura: null,
    horasHormigon: null,
    horasZanjeo: null,
    horasNocturnas: null,
    fechaLicencia: false,
  });
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [bulkSelectionLoading, setBulkSelectionLoading] = useState(false);

  const [modalUrl, setModalUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFileName, setModalFileName] = useState("");
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawModalData, setRawModalData] = useState([]);
  const [rawModalTitle, setRawModalTitle] = useState('');
  const [rawModalFileName, setRawModalFileName] = useState('');
  const [rawModalUrl, setRawModalUrl] = useState('');

  const handleOpenParteModal = useCallback((url, comp) => {
    if (!url) return;
    setModalUrl(url);
    setModalFileName(comp?.file_name || comp?.fileName || "");
    setModalOpen(true);
  }, []);

  const handleCloseParteModal = useCallback(() => {
    setModalOpen(false);
    setModalUrl("");
    setModalFileName("");
  }, []);

  const handleCloseRawModal = useCallback(() => {
    setRawModalOpen(false);
    setRawModalData([]);
    setRawModalTitle('');
    setRawModalFileName('');
    setRawModalUrl('');
  }, []);

  const getRowId = useCallback((row) => row?._id ?? row?.id, []);

  const selectedRows = useMemo(() => {
    return Array.from(selectedRowsMap.values());
  }, [selectedRowsMap]);

  const formatFechaLabel = useCallback((value) => {
    if (!value) return '-';
    const fecha = new Date(value);
    if (isNaN(fecha.getTime())) return '-';
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }, []);

  const handleOpenComprobante = useCallback((comp, row) => {
    if (!comp) return;
    const url = comp?.url || comp?.url_storage || '';
    if (comp.type === 'parte') {
      if (!url) return;
      handleOpenParteModal(url, comp);
      return;
    }
    if (comp.type === 'horas') {
      const trabajador = (row?.trabajadorId || row?.trabajador || {});
      const nombre = `${trabajador?.apellido || ''} ${trabajador?.nombre || ''}`.trim();
      const dni = trabajador?.dni ? `DNI: ${trabajador.dni}` : '';
      const diaLabel = formatFechaLabel(row?.fecha);
      const titleBase = nombre ? `${nombre} • ${diaLabel}` : `Fichadas • ${diaLabel}`;
      const title = dni ? `${titleBase} • ${dni}` : titleBase;
      setRawModalData(Array.isArray(row?.dataRawExcel) ? row.dataRawExcel : []);
      setRawModalTitle(title);
      setRawModalFileName(comp?.file_name || comp?.fileName || '');
      setRawModalUrl(url || '');
      setRawModalOpen(true);
    }
  }, [formatFechaLabel, handleOpenParteModal]);

  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);

  const fetchRows = useCallback(
    async ({ page: targetPage = 0, rowsPerPage: limit = DEFAULT_PAGE_SIZE, text, estado, sortField: sortKey, sortDirection: sortDir } = {}) => {
      if (!id) return;
      setIsLoading(true);
      try {
        const normalizedPage = Number.isNaN(Number(targetPage)) ? 0 : Math.max(0, Number(targetPage));
        const normalizedLimit = Number.isNaN(Number(limit)) || Number(limit) <= 0 ? DEFAULT_PAGE_SIZE : Number(limit);
        const offset = normalizedPage * normalizedLimit;
        const params = {
          limit: normalizedLimit,
          offset,
        };
        if (estado && estado !== 'todos') {
          params.estado = estado;
        }
        if (text && text.trim()) {
          params.text = text.trim();
        }
        if (sortKey) {
          params.sortField = sortKey;
        }
        if (sortDir) {
          params.sortDirection = sortDir;
        }
        const res = await conciliacionService.getConciliacionRows(id, params);
        setRows(res.data || []);
        setStats(res.stats || { total: 0, okAutomatico: 0, okManual: 0, incompleto: 0, advertencia: 0, pendiente: 0, error: 0 });
        setPeriodoInfo(res.periodo || '-');
        setSheetId(res.sheetId || null);
        setTotalRows(res.total ?? res.data?.length ?? 0);
        setError(null);
      } catch (e) {
        setError('Error al cargar detalle de conciliación');
      } finally {
        setIsLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchRows({
      page,
      rowsPerPage,
      text: appliedSearchTerm,
      estado: estadoFiltro,
      sortField,
      sortDirection,
    });
  }, [fetchRows, page, rowsPerPage, appliedSearchTerm, estadoFiltro, searchTrigger, sortField, sortDirection]);

  const handleApplySearch = useCallback(() => {
    const trimmed = (searchTerm || '').trim();
    setPage(0);
    setAppliedSearchTerm(trimmed);
    setSearchTrigger((prev) => prev + 1);
  }, [searchTerm]);

  const handlePageChange = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    const value = Number(event.target.value);
    const next = Number.isNaN(value) || value <= 0 ? DEFAULT_PAGE_SIZE : value;
    setRowsPerPage(next);
    setPage(0);
  }, []);

  const handleSortChange = useCallback((field) => {
    setPage(0);
    setSortField(field);
    setSortDirection((prevDirection) => {
      if (sortField === field) {
        return prevDirection === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    });
  }, [sortField]);

  const reloadRows = useCallback(() => {
    return fetchRows({
      page,
      rowsPerPage,
      text: appliedSearchTerm,
      estado: estadoFiltro,
      sortField,
      sortDirection,
    });
  }, [fetchRows, page, rowsPerPage, appliedSearchTerm, estadoFiltro, sortField, sortDirection]);

  const buildSheetSelectionPayload = useCallback((row) => {
    if (!row) return null;
    const sheet = row.sheetHoras || {};
    const normalizeValue = (value) => {
      if (value === undefined || value === null) return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const horasExcel = HORAS_EXCEL_FIELDS.reduce((acc, key) => {
      acc[key] = normalizeValue(sheet[key]);
      return acc;
    }, {});

    return {
      dataTrabajoDiario: {
        horasExcel,
        horasAltura: normalizeValue(sheet.horasAltura),
        horasHormigon: normalizeValue(sheet.horasHormigon),
        horasZanjeo: normalizeValue(sheet.horasZanjeo),
        fechaLicencia: Boolean(sheet.fechaLicencia),
      },
      estado: "okManual",
    };
  }, []);

  const createSheetSelectionPayload = useCallback(() => {
    return buildSheetSelectionPayload(rowToEdit);
  }, [buildSheetSelectionPayload, rowToEdit]);

  const handleSeleccionHorasSistema = useCallback(async () => {
    if (!id || !rowToEdit?._id) return;
    setSelectionLoading(true);
    try {
      await conciliacionService.seleccionarHorasSistema(id, rowToEdit._id);
      setEditOpen(false);
      await reloadRows();
    } catch (error) {
      console.error("Error aplicando horas sistema", error);
    } finally {
      setSelectionLoading(false);
    }
  }, [id, rowToEdit, reloadRows]);

  const handleSeleccionHorasExcel = useCallback(async () => {
    if (!id || !rowToEdit?._id) return;
    const payload = createSheetSelectionPayload();
    if (!payload) return;
    setSelectionLoading(true);
    try {
      await conciliacionService.seleccionarHorasExcel(id, rowToEdit._id, payload);
      setEditOpen(false);
      await reloadRows();
    } catch (error) {
      console.error("Error aplicando horas sheet", error);
    } finally {
      setSelectionLoading(false);
    }
  }, [id, rowToEdit, createSheetSelectionPayload, reloadRows]);

  const handleSelectionChange = useCallback((selectedInPage) => {
    const selectedItems = Array.isArray(selectedInPage) ? selectedInPage : [];
    const selectedIdsInPage = new Set(selectedItems.map(getRowId).filter(Boolean));
    setSelectedRowsMap((prev) => {
      const next = new Map(prev);
      (Array.isArray(rows) ? rows : []).forEach((item) => {
        const rowId = getRowId(item);
        if (!rowId) return;
        if (selectedIdsInPage.has(rowId)) {
          next.set(rowId, item);
          return;
        }
        next.delete(rowId);
      });
      return next;
    });
  }, [rows, getRowId]);

  const handleSeleccionHorasSistemaBulk = useCallback(async () => {
    if (!id || selectedRows.length === 0) return;
    setBulkSelectionLoading(true);
    try {
      const rowIds = selectedRows.map((row) => row?._id).filter(Boolean);
      if (rowIds.length === 0) return;
      await conciliacionService.seleccionarHorasSistemaBulk(id, rowIds);
      setSelectedRowsMap(new Map());
      await reloadRows();
    } catch (error) {
      console.error("Error aplicando horas sistema en bloque", error);
    } finally {
      setBulkSelectionLoading(false);
    }
  }, [id, selectedRows, reloadRows]);

  const handleSeleccionHorasExcelBulk = useCallback(async () => {
    if (!id || selectedRows.length === 0) return;
    const items = selectedRows
      .map((row) => {
        const payload = buildSheetSelectionPayload(row);
        if (!payload || !row?._id) return null;
        return { rowId: row._id, payload };
      })
      .filter(Boolean);
    if (items.length === 0) return;
    setBulkSelectionLoading(true);
    try {
      await conciliacionService.seleccionarHorasExcelBulk(id, items);
      setSelectedRowsMap(new Map());
      await reloadRows();
    } catch (error) {
      console.error("Error aplicando horas excel en bloque", error);
    } finally {
      setBulkSelectionLoading(false);
    }
  }, [id, selectedRows, buildSheetSelectionPayload, reloadRows]);

  const getEstadoChipProps = (estado) => {
    const e = (estado || '').toString().toLowerCase();
    if (['ok', 'completo'].includes(e)) {
      return { label: 'OK', color: 'success' };
    }
    if (['okautomatico'].includes(e)) {
      return { label: 'OK automático', color: 'success' };
    }
    if (['okmanual', 'ok_manual'].includes(e)) {
      return { label: 'OK manual', color: 'success' };
    }
    if (['incompleto'].includes(e)) {
      return { label: 'Incompleto', color: 'warning' };
    }
    if (['advertencia', 'warn', 'warning'].includes(e)) {
      return { label: 'Advertencia', color: 'error' };
    }
    if (['pendiente', 'pendiente_revision', 'pendienterevision'].includes(e)) {
      return { label: 'Pendiente', color: 'info' };
    }
    if (['error', 'errores'].includes(e)) {
      return { label: 'Error', color: 'error' };
    }
    return { label: estado || '-', color: 'default' };
  };

  const getHourChipSx = (k) => (theme) => {
    const colorMap = {
      'Norm.': theme.palette.grey[700],
      '50%': theme.palette.primary.main,
      '100%': theme.palette.secondary.main,
      'Aº': '#00897b',   // teal-600
      'Hº': '#ef6c00',   // orange-800
      'Zº/M°': '#5e35b1', // deepPurple-600
      'Noct.': '#283593', // indigo-900
      'Noct. 50%': '#1e88e5', // blue-600
      'Noct. 100%': '#0d47a1', // blue-900
    };
    const c = colorMap[k] || theme.palette.grey[600];
    return {
      bgcolor: alpha(c, 0.12),
      color: c,
      borderColor: alpha(c, 0.28),
      whiteSpace: 'nowrap',
      textTransform: 'none',
      minWidth: 110,
      textAlign: 'center',
      fontSize: '0.7rem',
    };
  };

  const formatDni = (value) => {
    if (!value || value === '-') return '-';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const columns = useMemo(() => ([
    { key: 'fecha', label: 'Fecha', sortable: true, render: (row) => formatFechaLabel(row.fecha) },
    { key: 'trabajador', label: 'Trabajador', sortable: true },
    { key: 'dni', label: 'DNI', sortable: true, render: (row) => formatDni(row.dni) },
    { key: 'licencia', label: 'Licencia', render: (row) => {
      const lic = (row?.sheetHoras?.fechaLicencia ?? row?.licencia ?? false) ? true : false;
      return (
        <Chip
          label={lic ? 'Licencia: Sí' : 'Licencia: No'}
          size="small"
          variant="outlined"
          color={lic ? 'warning' : 'default'}
        />
      );
    }},
    {
      key: 'horas',
      label: 'Horas',
      render: (row) => {
        const db = row.dbHoras || null;
        const items = db ? [
          { k: 'Norm.', v: Number(db.horasNormales || 0), color: 'default' },
          { k: '50%', v: Number(db.horas50 || 0), color: 'warning' },
          { k: '100%', v: Number(db.horas100 || 0), color: 'error' },
          { k: 'Aº', v: Number(db.horasAltura || 0), color: 'info' },
          { k: 'Hº', v: Number(db.horasHormigon || 0), color: 'info' },
          { k: 'Zº/M°', v: Number(db.horasZanjeo || 0), color: 'info' },
          { k: 'Noct.', v: Number(db.horasNocturnas || 0), color: 'info' },
          { k: 'Noct. 50%', v: Number(db.horasNocturnas50 || 0), color: 'info' },
          { k: 'Noct. 100%', v: Number(db.horasNocturnas100 || 0), color: 'info' },
        ].filter(i => i.v > 0) : [];
        if (items.length === 0) return '-';
        return (
          <Stack direction="column" spacing={0.5}>
            {items.map(({ k, v }) => (
              <Chip
                key={k}
                label={`${k} ${v} hs`}
                size="small"
                variant="outlined"
                sx={getHourChipSx(k)}
              />
            ))}
          </Stack>
        );
      }
    },
    {
      key: 'sheetHoras',
      label: 'Sheet',
      render: (row) => {
        const sh = row.sheetHoras || {};
        const items = [
          { k: 'Norm.', v: Number(sh.horasNormales || 0) },
          { k: '50%', v: Number(sh.horas50 || 0) },
          { k: '100%', v: Number(sh.horas100 || 0) },
          { k: 'Aº', v: Number(sh.horasAltura || 0) },
          { k: 'Hº', v: Number(sh.horasHormigon || 0) },
          { k: 'Zº/M°', v: Number(sh.horasZanjeo || 0) },
          { k: 'Noct.', v: Number(sh.horasNocturnas || 0) },
          { k: 'Noct. 50%', v: Number(sh.horasNocturnas50 || 0) },
          { k: 'Noct. 100%', v: Number(sh.horasNocturnas100 || 0) },
        ].filter(i => i.v > 0);
        if (items.length === 0) return '-';
        return (
          <Stack direction="column" spacing={0.5}>
            {items.map(({ k, v }) => (
              <Chip
                key={k}
                label={`${k} ${v} hs`}
                size="small"
                variant="outlined"
                sx={getHourChipSx(k)}
              />
            ))}
          </Stack>
        );
      }
    },
    {
      key: 'comprobantes',
      label: 'Comprobantes',
      render: (row) => {
        const comps = Array.isArray(row.comprobantes) ? row.comprobantes : [];
        if (comps.length === 0) return '-';
        return (
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {comps.map((comp, idx) => {
              const color =
                comp.type === 'horas' ? 'primary' :
                comp.type === 'parte' ? 'success' :
                comp.type === 'licencia' ? 'warning' : 'default';
              const icon =
                comp.type === 'horas' ? <TableViewIcon fontSize="small" /> :
                comp.type === 'parte' ? <AssignmentIcon fontSize="small" /> :
                comp.type === 'licencia' ? <SickIcon fontSize="small" /> : null;
              return (() => {
                const url = comp.url || comp.url_storage || null;
                const handleClick = (event) => {
                  if ((comp.type === 'parte' || comp.type === 'horas') && url) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                  if (comp.type === 'parte') {
                    handleOpenParteModal(url, comp);
                  }
                  if (comp.type === 'horas') {
                    handleOpenComprobante(comp, row);
                  }
                };
                return (
                  <Chip
                    key={`${comp.type}-${idx}`}
                    label={comp.type}
                    size="small"
                    color={color}
                    variant="outlined"
                    component="a"
                    href={url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    clickable
                    icon={icon}
                    onClick={handleClick}
                  />
                );
              })();
            })}
          </Stack>
        );
      }
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      render: (row) => {
        const { label, color } = getEstadoChipProps(row.estado);
        return <Chip size="small" color={color} label={label} />;
      }
    },
    {
      key: 'observacion',
      label: 'Observación',
      render: (row) => {
        const text = row?.observacion || '-';
        if (text === '-') return text;
        return (
          <Tooltip title={text} placement="left" arrow>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                display: 'block',
              }}
            >
              {text}
            </Typography>
          </Tooltip>
        );
      },
      sx: {
        maxWidth: 320,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      },
    },
    {
      key: 'acciones',
      label: '',
      render: (row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            const initial = {
              horasNormales: row?.dbHoras?.horasNormales ?? null,
              horas50: row?.dbHoras?.horas50 ?? null,
              horas100: row?.dbHoras?.horas100 ?? null,
              horasAltura: row?.dbHoras?.horasAltura ?? null,
              horasHormigon: row?.dbHoras?.horasHormigon ?? null,
              horasZanjeo: row?.dbHoras?.horasZanjeo ?? null,
              horasNocturnas: row?.dbHoras?.horasNocturnas ?? null,
              fechaLicencia: row?.dbHoras?.fechaLicencia ?? false,
            };
            setFormHoras(initial);
            setRowToEdit(row);
            setEditOpen(true);
          }}
          color="primary"
          aria-label="Editar horas"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )
    }
  ]), [handleOpenParteModal, handleOpenComprobante]);

  const formatters = useMemo(() => ({
    fecha: formatFechaLabel,
  }), [formatFechaLabel]);

  useEffect(() => {
    setSelectedRowsMap(new Map());
  }, [id, appliedSearchTerm, estadoFiltro, sortField, sortDirection]);

  return (
    <DashboardLayout title={`Conciliación - ${periodoInfo}`}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
            <Button
              variant="text"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
            >
              Volver
            </Button>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                gap: 1,
                alignItems: "center",
              }}
            >
              <TextField
                label="Buscar"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flex: 1, minWidth: 240, maxWidth: 240}}
                InputProps={{
                  endAdornment: searchTerm.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setSearchTerm('')}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplySearch();
                  }
                }}
                onBlur={handleApplySearch}
              />
              {selectedRows.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSeleccionHorasSistemaBulk}
                    disabled={bulkSelectionLoading || isLoading}
                    sx={{ textTransform: "none" }}
                  >
                    Elegir sistema
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSeleccionHorasExcelBulk}
                    disabled={bulkSelectionLoading || isLoading}
                    sx={{ textTransform: "none" }}
                  >
                    Elegir excel
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
                    {selectedRows.length} seleccionado{selectedRows.length !== 1 ? "s" : ""}
                  </Typography>
                </Stack>
              )}
            </Box>

            {sheetId ? (
              <Button
                variant="outlined"
                color="primary"
                component="a"
                href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir Google Sheet
              </Button>
            ) : null}
          </Stack>

          <FiltroTrabajoDiario stats={stats} excludeKeys={['sinParte', 'sinHoras', 'conLicencia']} />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableSelectComponent
            data={rows}
            columns={columns}
            isLoading={isLoading}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            getRowId={getRowId}
            onSelectionChange={handleSelectionChange}
            selectedItems={selectedRows}
            emptyMessage="No hay filas disponibles"
            pagination={{
              total: totalRows,
              page,
              rowsPerPage,
              rowsPerPageOptions: [DEFAULT_PAGE_SIZE],
            }}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Stack>
      </Container>

    <ImagenModal
      open={modalOpen}
      onClose={handleCloseParteModal}
      imagenUrl={modalUrl}
      fileName={modalFileName}
      leftContent={modalUrl ? <TrabajosDetectadosList urlStorage={modalUrl} /> : null}
    />

      <HorasRawModal
        open={rawModalOpen}
        onClose={handleCloseRawModal}
        data={rawModalData}
        title={rawModalTitle}
        fileName={rawModalFileName}
        downloadUrl={rawModalUrl}
      />

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Editar horas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {rowToEdit?.trabajador || ''} · {formatters.fecha(rowToEdit?.fecha)}
            </Typography>
          </Box>
        </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Elegir
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleSeleccionHorasExcel}
              disabled={selectionLoading || isLoading}
              sx={{ textTransform: "none" }}
            >
              Horas Excel
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleSeleccionHorasSistema}
              disabled={selectionLoading || isLoading}
              sx={{ textTransform: "none" }}
            >
              Horas Sistema
            </Button>
          </Stack>
        </Box>
          <Box sx={{ py: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Typography variant="subtitle2" gutterBottom>En sistema</Typography>
                <Stack spacing={1.5}>
                  {[
                    { k: 'horasNormales', label: 'Normales' },
                    { k: 'horas50', label: '50%' },
                    { k: 'horas100', label: '100%' },
                    { k: 'horasAltura', label: 'Altura' },
                    { k: 'horasHormigon', label: 'Hormigón' },
                    { k: 'horasZanjeo', label: 'Zanjeo' },
                    { k: 'horasNocturnas', label: 'Nocturnas' },
                  ].map((f) => (
                    <TextField
                      key={f.k}
                      label={f.label}
                      type="number"
                      inputProps={{ step: '0.5', min: 0 }}
                      value={formHoras[f.k] ?? ''}
                      onChange={(e) => setFormHoras((prev) => ({ ...prev, [f.k]: e.target.value === '' ? null : Number(e.target.value) }))}
                      size="small"
                      fullWidth
                    />
                  ))}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">Licencia</Typography>
                    <Chip
                      label={formHoras.fechaLicencia ? 'Sí' : 'No'}
                      color={formHoras.fechaLicencia ? 'warning' : 'default'}
                      variant="outlined"
                      onClick={() => setFormHoras((p) => ({ ...p, fechaLicencia: !p.fechaLicencia }))}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Typography variant="subtitle2" gutterBottom>En sheet</Typography>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                  {(() => {
                    const sh = rowToEdit?.sheetHoras || {};
                    const items = [
                      { k: 'Norm.', v: Number(sh.horasNormales || 0) },
                      { k: '50%', v: Number(sh.horas50 || 0) },
                      { k: '100%', v: Number(sh.horas100 || 0) },
                      { k: 'Aº', v: Number(sh.horasAltura || 0) },
                      { k: 'Hº', v: Number(sh.horasHormigon || 0) },
                      { k: 'Zº/M°', v: Number(sh.horasZanjeo || 0) },
                      { k: 'Noc.', v: Number(sh.horasNocturnas || 0) },
                    ].filter(i => i.v > 0);
                    if (items.length === 0) {
                      return <Typography variant="caption" color="text.secondary">Sin horas en sheet</Typography>;
                    }
                    return items.map(({ k, v }) => (
                      <Chip
                        key={k}
                        label={`${k} ${v} hs`}
                        size="small"
                        variant="outlined"
                        sx={getHourChipSx(k)}
                      />
                    ));
                  })()}
                </Stack>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Licencia: {(rowToEdit?.sheetHoras?.fechaLicencia ? 'Sí' : 'No')}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!rowToEdit?._id || !id) return;
              try {
                await conciliacionService.updateConciliacionRow(id, rowToEdit._id, {
                  dataTrabajoDiario: { ...formHoras },
                });
                setEditOpen(false);
                await fetchRows({
                  page,
                  rowsPerPage,
                  text: appliedSearchTerm,
                  estado: estadoFiltro,
                  sortField,
                  sortDirection,
                });
              } catch (e) {
                console.error('Error actualizando horas', e);
              }
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ConciliacionDetallePage;


