import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Alerts from 'src/components/alerts';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton, Chip, Button, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SickIcon from '@mui/icons-material/Sick';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TableSelectComponent from 'src/components/TableSelectComponent';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import conciliacionService from 'src/services/dhn/conciliacionService';
import ImagenModal from 'src/components/ImagenModal';
import TrabajosDetectadosList from 'src/components/dhn/TrabajosDetectadosList';
import HorasRawModal from 'src/components/dhn/HorasRawModal';
import CorreccionConciliacionModal from 'src/components/dhn/CorreccionConciliacionModal';
import { getHourChipSx } from 'src/components/dhn/hourChipStyles';

const DEFAULT_PAGE_SIZE = 200;
const HORAS_EXCEL_FIELDS = [
  "horasNormales",
  "horas50",
  "horas100",
  "horasNocturnas",
  "horasNocturnas50",
  "horasNocturnas100",
];
const CHIP_LIMIT_SX = {
  maxWidth: 140,
  textAlign: "center",
  justifyContent: "center",
  whiteSpace: "normal",
  px: 1,
};

const INITIAL_STATS = {
  total: 0,
  okAutomatico: 0,
  okManual: 0,
  incompleto: 0,
  advertencia: 0,
  pendiente: 0,
  error: 0,
};

const ConciliacionDetallePage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);
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
  const [alert, setAlert] = useState({ open: false, severity: 'success', message: '' });

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

  const showAlert = useCallback((message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
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
        const [rowsRes, statsRes] = await Promise.all([
          conciliacionService.getConciliacionRows(id, params),
          conciliacionService.getConciliacionStats(id),
        ]);
        setRows(rowsRes.data || []);
        const normalizedStats = statsRes?.stats || statsRes || {};
        setStats({
          total: normalizedStats.total ?? 0,
          okAutomatico: normalizedStats.okAutomatico ?? 0,
          okManual: normalizedStats.okManual ?? 0,
          incompleto: normalizedStats.incompleto ?? 0,
          advertencia: normalizedStats.advertencia ?? 0,
          pendiente: normalizedStats.pendiente ?? 0,
          error: normalizedStats.error ?? 0,
        });
        setPeriodoInfo(rowsRes.periodo || '-');
        setSheetId(rowsRes.sheetId || null);
        setTotalRows(rowsRes.total ?? rowsRes.data?.length ?? 0);
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
      showAlert("Se aplicaron las horas del sistema correctamente");
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
      showAlert("Se aplicaron las horas NASA correctamente");
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

  const handleGuardarHoras = useCallback(async () => {
    if (!id || !rowToEdit?._id) return;
    try {
      await conciliacionService.updateConciliacionRow(id, rowToEdit._id, {
        dataTrabajoDiario: { ...formHoras },
      });
      setEditOpen(false);
      await reloadRows();
      showAlert("Cambios guardados correctamente");
    } catch (error) {
      console.error("Error actualizando horas", error);
    }
  }, [id, rowToEdit, formHoras, reloadRows]);

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

  const formatDni = (value) => {
    if (!value || value === '-') return '-';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getTrabajadorDisplayData = (row) => {
    const source = row?.trabajadorId || row?.trabajador || {};
    let nombre = '';
    let dniValue = '';

    if (typeof source === 'string') {
      nombre = source;
      dniValue = row?.dni || '';
    } else if (source && typeof source === 'object') {
      const apellido = source.apellido ? source.apellido : '';
      const nombreProp = source.nombre ? source.nombre : '';
      nombre = `${apellido} ${nombreProp}`.trim();
      dniValue = source.dni || row?.dni || '';
    }

    if (!nombre) {
      nombre = row?.trabajador || '-';
      dniValue = row?.dni || dniValue;
    }

    return { nombre: nombre || '-', dni: dniValue };
  };

  const columns = useMemo(() => ([
    { key: 'fecha', label: 'Fecha', sortable: true, render: (row) => formatFechaLabel(row.fecha) },
    {
      key: 'trabajador',
      label: 'Trabajador',
      sortable: true,
      render: (row) => {
        const { nombre, dni } = getTrabajadorDisplayData(row);
        const dniLabel = formatDni(dni);
        return (
          <Box>
            <Typography variant="body2">{nombre}</Typography>
            {dniLabel && dniLabel !== '-' ? (
              <Typography variant="caption" color="text.secondary">
                DNI: {dniLabel}
              </Typography>
            ) : null}
          </Box>
        );
      },
    },
    {
      key: 'horas',
      label: 'Horas Sistema',
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
        const tieneLicencia = Boolean(db?.fechaLicencia);
        const licenciaTipo = db?.tipoLicencia;
        const licenciaLabel = licenciaTipo ? `Licencia (${licenciaTipo})` : 'Licencia';
        if (!tieneLicencia && items.length === 0) return '-';
        return (
          <Stack direction="column" spacing={0.5}>
            {items.map(({ k, v }) => (
              <Chip
                key={k}
                label={`${k} ${v} hs`}
                size="small"
                variant="outlined"
                sx={(theme) => ({
                  ...getHourChipSx(k)(theme),
                  ...CHIP_LIMIT_SX,
                  fontWeight: 600,
                })}
              />
            ))}
            {tieneLicencia && (
              <Chip
                label={licenciaLabel}
                size="small"
                variant="outlined"
                color="warning"
                icon={<SickIcon fontSize="small" />}
                sx={CHIP_LIMIT_SX}
              />
            )}
          </Stack>
        );
      }
    },
    {
      key: 'sheetHoras',
      label: 'Horas NASA',
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
        const tieneLicenciaSheet = Boolean(sh.fechaLicencia ?? row?.licencia);
        const licenciaTipoSheet = sh.tipoLicencia ?? row?.tipoLicencia;
        const licenciaLabelSheet = licenciaTipoSheet ? `Licencia (${licenciaTipoSheet})` : 'Licencia';
        if (!tieneLicenciaSheet && items.length === 0) return '-';
        return (
          <Stack direction="column" spacing={0.5}>
            {items.map(({ k, v }) => (
              <Chip
                key={k}
                label={`${k} ${v} hs`}
                size="small"
                variant="outlined"
                sx={(theme) => ({
                  ...getHourChipSx(k)(theme),
                  ...CHIP_LIMIT_SX,
                  fontWeight: 600,
                })}
              />
            ))}
            {tieneLicenciaSheet && (
              <Chip
                label={licenciaLabelSheet}
                size="small"
                variant="outlined"
                color="warning"
                icon={<SickIcon fontSize="small" />}
                sx={CHIP_LIMIT_SX}
              />
            )}
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
  ]), [handleOpenParteModal]);

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

          <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
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
            <Alerts alert={alert} onClose={handleAlertClose} />
          </Box>
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

      <CorreccionConciliacionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        row={rowToEdit}
        formHoras={formHoras}
        onFormHorasChange={setFormHoras}
        onSelectExcel={handleSeleccionHorasExcel}
        onSelectSistema={handleSeleccionHorasSistema}
        selectionLoading={selectionLoading}
        onSave={handleGuardarHoras}
      />
    </DashboardLayout>
  );
};

export default ConciliacionDetallePage;


