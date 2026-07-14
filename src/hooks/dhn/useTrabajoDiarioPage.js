import { useMemo, useState } from 'react';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import { AccionesTrabajoDiario } from 'src/components/dhn/TrabajoDiarioAcciones';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import useFetch from 'src/hooks/useFetch';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';
import useTrabajoDiarioFilters from 'src/hooks/dhn/useTrabajoDiarioFilters';
import { useExportTrabajoDiarioPdf } from 'src/hooks/dhn/useExportTrabajoDiarioPdf';

const DEFAULT_STATS = {
  total: 0,
  ok: 0,
  okAutomatico: 0,
  okManual: 0,
  incompleto: 0,
  advertencia: 0,
  sinParte: 0,
  sinHoras: 0,
  sinLicencia: 0,
  conLicencia: 0,
};

const buildInitialData = {
  data: [],
  total: 0,
  limit: 0,
  offset: 0,
  hasMore: false,
  stats: DEFAULT_STATS,
};

const getMonthRange = (mesParam) => {
  if (!mesParam || typeof mesParam !== 'string') return null;
  const [yearStr, monthStr] = mesParam.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
};

const getDayRange = (diaISO) => {
  if (!diaISO) return null;
  const d = new Date(diaISO);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
};

const getCustomRange = (fromISO, toISO) => {
  if (!fromISO || !toISO) return null;
  const start = new Date(fromISO);
  const end = new Date(toISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
};

const trabajadorKey = (doc) => {
  const tid = doc?.trabajadorId;
  if (tid && typeof tid === 'object') return String(tid._id || tid.id || '');
  return String(tid || '');
};

const fechaKey = (doc) => {
  if (!doc?.fecha) return '';
  const d = new Date(doc.fecha);
  return Number.isNaN(d.getTime()) ? String(doc.fecha) : d.toISOString().slice(0, 10);
};

// Normalmente hay un solo TrabajoDiarioRegistrado por trabajador+día, pero cuando
// se resuelve una licencia con "agregar ambos" quedan dos documentos (cada uno con
// su PDF). Para que la fila del día muestre ambos comprobantes (chips en la tabla y
// tabs en el modal de editar) agrupamos por trabajador+fecha y fusionamos los
// `comprobantes`. Para días sin duplicados es un no-op (grupo de 1). El `total`/stats
// siguen viniendo del server (cuenta documentos), así que la paginación puede diferir
// en unas pocas filas cuando hay duplicados; es aceptable dado lo infrecuente.
const agruparPorTrabajadorFecha = (docs) => {
  const grupos = new Map();
  const orden = [];
  for (const doc of docs) {
    const key = `${trabajadorKey(doc)}|${fechaKey(doc)}`;
    if (!grupos.has(key)) {
      grupos.set(key, []);
      orden.push(key);
    }
    grupos.get(key).push(doc);
  }
  return orden.map((key) => {
    const grupo = grupos.get(key);
    if (grupo.length === 1) return grupo[0];
    // Primario para acciones/edición: el que tenga horas (no solo licencia); si no, el primero.
    const primario = grupo.find((d) => !d.fechaLicencia) || grupo[0];
    const vistos = new Set();
    const comprobantes = [];
    for (const d of grupo) {
      for (const comp of d.comprobantes || []) {
        const url = comp?.url || comp?.url_storage;
        const dedupKey = url || `${comp?.type}-${comprobantes.length}`;
        if (vistos.has(dedupKey)) continue;
        vistos.add(dedupKey);
        comprobantes.push(comp);
      }
    }
    return { ...primario, comprobantes, _grupoIds: grupo.map((d) => d._id) };
  });
};

export default function useTrabajoDiarioPage(options = {}) {
  const {
    enabled = true,
    mesParam,
    diaISO,
    fromISO,
    toISO,
    trabajadorId,
    incluirTrabajador = true,
    defaultLimit = 200,
    defaultSort,
    onOpenComprobante,
    filtroFijo,
  } = options || {};

  const {
    estado,
    filtro,
    q,
    qInput,
    setQInput,
    page,
    limit,
    offset,
    sortField,
    sortDirection,
    sort,
    setPage,
    setLimit,
    setSort,
  } = useTrabajoDiarioFilters({
    defaultLimit,
    ...(defaultSort ? { defaultSort } : {}),
  });

  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsTrabajo, setLogsTrabajo] = useState(null);

  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [trabajoDiarioSeleccionado, setTrabajoDiarioSeleccionado] = useState(null);

  const { handleExportPdf, exportingRowId } = useExportTrabajoDiarioPdf();

  const handleOpenLogs = (item) => {
    if (!item?._id) return;
    setLogsTrabajo(item);
    setLogsModalOpen(true);
  };

  const handleCloseLogs = () => {
    setLogsModalOpen(false);
    setLogsTrabajo(null);
  };

  const handleEdit = (item) => {
    if (!item?._id) return;
    setTrabajoDiarioSeleccionado(item);
    setEditarModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditarModalOpen(false);
    setTrabajoDiarioSeleccionado(null);
  };

  const monthRange = getMonthRange(mesParam);
  const dayRange = getDayRange(diaISO);
  const customRange = getCustomRange(fromISO, toISO);
  const range = monthRange || dayRange || customRange;

  const filtroAplicado = filtroFijo || filtro;

  const fetchData = async () => {
    if (!enabled) return buildInitialData;
    if (!range) return buildInitialData;

    const params = {
      limit,
      offset,
      sort,
      ...(estado && estado !== 'todos' ? { estado } : {}),
      ...(filtroAplicado ? { filtro: filtroAplicado } : {}),
      ...(q?.trim() ? { q: q.trim() } : {}),
    };

    if (trabajadorId) {
      return await TrabajoRegistradoService.getTrabajoRegistradoByTrabajadorId(trabajadorId, {
        ...params,
        from: range.from,
        to: range.to,
      });
    }

    if (dayRange) {
      return await TrabajoRegistradoService.getByDay(diaISO, params);
    }
    return await TrabajoRegistradoService.getByRange(range.from, range.to, params);
  };

  const {
    data: response,
    error,
    isError,
    isLoading,
    refetch,
  } = useFetch(
    fetchData,
    [enabled, mesParam, diaISO, range?.from, range?.to, trabajadorId, estado, filtroAplicado, limit, offset, sort, q],
    {
      enabled,
      initialData: buildInitialData,
      keepPreviousData: true,
    }
  );

  const data = useMemo(
    () => agruparPorTrabajadorFecha(Array.isArray(response?.data) ? response.data : []),
    [response?.data]
  );
  const stats = response?.stats || DEFAULT_STATS;
  const total = Number.isFinite(response?.total) ? response.total : Number(response?.total) || 0;

  const handleSaveEdit = async () => {
    await refetch();
  };

  const columns = useMemo(
    () =>
      buildTrabajoRegistradoColumns(
        (item) => (
          <AccionesTrabajoDiario
            item={item}
            onEdit={handleEdit}
            onOpenLogs={handleOpenLogs}
            onExportPdf={handleExportPdf}
            exportingRowId={exportingRowId}
          />
        ),
        incluirTrabajador,
        onOpenComprobante
      ),
    [incluirTrabajador, onOpenComprobante, handleExportPdf, exportingRowId]
  );

  const pagination = {
    total,
    page,
    rowsPerPage: limit,
    rowsPerPageOptions: [25, 50, 100, 200, 500],
  };

  const handleChangePage = (_e, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e) => {
    const next = Number.parseInt(e?.target?.value, 10);
    setLimit(next);
  };

  const handleSortChange = (field) => {
    setSort(field);
  };

  const getEntityTitle = (t) => {
    const trabajador = t?.trabajadorId || {};
    const apellido = (trabajador?.apellido || '').toString();
    const nombre = (trabajador?.nombre || '').toString();
    const full = `${apellido} ${nombre}`.trim();
    return full || t?._id || '-';
  };

  const getEntitySubtitle = (t) => {
    const fecha = t?.fecha ? formatDateDDMMYYYY(t.fecha) : '-';
    const estadoTxt = (t?.estado || '-').toString();
    const dni = t?.trabajadorId?.dni ? ` • DNI: ${t.trabajadorId.dni}` : '';
    return `Fecha: ${fecha} • Estado: ${estadoTxt}${dni}`;
  };

  return {
    data,
    stats,
    total,
    error,
    isError,
    isLoading,
    refetch,
    columns,
    table: {
      sortField,
      sortDirection,
      onSortChange: handleSortChange,
      pagination,
      onPageChange: handleChangePage,
      onRowsPerPageChange: handleChangeRowsPerPage,
    },
    filters: {
      estado,
      filtro,
      qInput,
      setQInput,
      page,
      limit,
    },
    logs: {
      open: logsModalOpen,
      entity: logsTrabajo,
      onOpen: handleOpenLogs,
      onClose: handleCloseLogs,
      getEntityTitle,
      getEntitySubtitle,
    },
    edit: {
      open: editarModalOpen,
      entity: trabajoDiarioSeleccionado,
      onOpen: handleEdit,
      onClose: handleCloseEdit,
      onSave: handleSaveEdit,
    },
  };
}


