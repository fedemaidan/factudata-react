import { useMemo, useState } from 'react';
import { buildTrabajoRegistradoColumns } from 'src/components/dhn/TrabajoRegistradoCells';
import { AccionesTrabajoDiario } from 'src/components/dhn/TrabajoDiarioAcciones';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import useFetch from 'src/hooks/useFetch';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';
import useTrabajoDiarioFilters from 'src/hooks/dhn/useTrabajoDiarioFilters';

const DEFAULT_STATS = {
  total: 0,
  ok: 0,
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

export default function useTrabajoDiarioPage(options = {}) {
  const {
    enabled = true,
    diaISO,
    trabajadorId,
    incluirTrabajador = true,
    defaultLimit = 200,
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
  } = useTrabajoDiarioFilters({ defaultLimit });

  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsTrabajo, setLogsTrabajo] = useState(null);

  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [trabajoDiarioSeleccionado, setTrabajoDiarioSeleccionado] = useState(null);

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

  const fetchData = async () => {
    if (!enabled) return buildInitialData;
    if (!diaISO) return buildInitialData;

    const params = {
      limit,
      offset,
      sort,
      ...(estado && estado !== 'todos' ? { estado } : {}),
      ...(filtro ? { filtro } : {}),
      ...(q?.trim() ? { q: q.trim() } : {}),
    };

    if (trabajadorId) {
      const start = new Date(diaISO);
      start.setHours(0, 0, 0, 0);
      const end = new Date(diaISO);
      end.setHours(23, 59, 59, 999);
      return await TrabajoRegistradoService.getTrabajoRegistradoByTrabajadorId(trabajadorId, {
        ...params,
        from: start.toISOString(),
        to: end.toISOString(),
      });
    }

    return await TrabajoRegistradoService.getByDay(diaISO, params);
  };

  const {
    data: response,
    error,
    isError,
    isLoading,
    refetch,
  } = useFetch(
    fetchData,
    [enabled, diaISO, trabajadorId, estado, filtro, limit, offset, sort, q],
    {
      enabled,
      initialData: buildInitialData,
      keepPreviousData: true,
    }
  );

  const data = Array.isArray(response?.data) ? response.data : [];
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
          />
        ),
        incluirTrabajador
      ),
    [incluirTrabajador]
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


