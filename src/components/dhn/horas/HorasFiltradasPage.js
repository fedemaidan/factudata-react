import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Alert,
  Box,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import BackButton from 'src/components/shared/BackButton';
import TableComponent from 'src/components/TableComponent';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import HistorialModal from 'src/components/dhn/HistorialModal';
import HorasRawModal from 'src/components/dhn/HorasRawModal';
import ImagenModal from 'src/components/ImagenModal';
import TrabajosDetectadosList from 'src/components/dhn/TrabajosDetectadosList';
import useTrabajoDiarioPage from 'src/hooks/dhn/useTrabajoDiarioPage';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';
import { safeRouterReplace } from 'src/utils/safeRouter';

const getDefaultRange = () => {
  const today = dayjs();
  return {
    desde: today.startOf('month').format('YYYY-MM-DD'),
    hasta: today.format('YYYY-MM-DD'),
  };
};

const readQS = (raw) => (Array.isArray(raw) ? raw[0] : raw);

const DATE_PICKER_SLOT_PROPS = {
  textField: { size: 'small', sx: { width: 180 } },
};

const HorasFiltradasPage = ({ filtroFijo, title, descripcion }) => {
  const router = useRouter();

  const desdeParam = useMemo(() => {
    const raw = readQS(router.query.desde);
    return raw ? String(raw) : null;
  }, [router.query.desde]);

  const hastaParam = useMemo(() => {
    const raw = readQS(router.query.hasta);
    return raw ? String(raw) : null;
  }, [router.query.hasta]);

  useEffect(() => {
    if (!router.isReady) return;
    if (desdeParam && hastaParam) return;
    const def = getDefaultRange();
    safeRouterReplace(
      router,
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          desde: desdeParam || def.desde,
          hasta: hastaParam || def.hasta,
        },
      },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, desdeParam, hastaParam, router]);

  const fromISO = useMemo(
    () => (desdeParam ? dayjs(desdeParam).toISOString() : null),
    [desdeParam]
  );
  const toISO = useMemo(
    () => (hastaParam ? dayjs(hastaParam).toISOString() : null),
    [hastaParam]
  );

  const handleChangeDesde = useCallback(
    (nv) => {
      const v = (nv || dayjs()).format('YYYY-MM-DD');
      const nextQuery = { ...router.query, desde: v };
      delete nextQuery.page;
      safeRouterReplace(router, { pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router]
  );

  const handleChangeHasta = useCallback(
    (nv) => {
      const v = (nv || dayjs()).format('YYYY-MM-DD');
      const nextQuery = { ...router.query, hasta: v };
      delete nextQuery.page;
      safeRouterReplace(router, { pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router]
  );

  const [modalUrl, setModalUrl] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFileName, setModalFileName] = useState('');
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawModalData, setRawModalData] = useState([]);
  const [rawModalTitle, setRawModalTitle] = useState('');
  const [rawModalFileName, setRawModalFileName] = useState('');
  const [rawModalUrl, setRawModalUrl] = useState('');

  const handleOpenComprobante = useCallback((comp, item) => {
    if (!comp) return;
    const url = comp?.url || comp?.url_storage || '';
    if (comp.type === 'parte') {
      if (!url) return;
      setModalUrl(url);
      setModalFileName(comp?.file_name || comp?.fileName || '');
      setModalOpen(true);
      return;
    }
    if (comp.type === 'horas') {
      const trabajador = item?.trabajadorId || {};
      const nombre = `${trabajador?.apellido || ''} ${trabajador?.nombre || ''}`.trim();
      const dni = trabajador?.dni ? `DNI: ${trabajador.dni}` : '';
      const titleBase = nombre || 'Fichadas raw';
      const t = dni ? `${titleBase} • ${dni}` : titleBase;
      setRawModalData(Array.isArray(item?.dataRawExcel) ? item.dataRawExcel : []);
      setRawModalTitle(t);
      setRawModalFileName(comp?.file_name || comp?.fileName || '');
      setRawModalUrl(url || '');
      setRawModalOpen(true);
    }
  }, []);

  const handleCloseParteModal = useCallback(() => {
    setModalOpen(false);
    setModalUrl('');
    setModalFileName('');
  }, []);

  const handleCloseRawModal = useCallback(() => {
    setRawModalOpen(false);
    setRawModalData([]);
    setRawModalTitle('');
    setRawModalFileName('');
    setRawModalUrl('');
  }, []);

  const {
    data,
    error,
    isError,
    isLoading,
    columns,
    table,
    filters,
    logs,
    edit,
  } = useTrabajoDiarioPage({
    enabled: router.isReady && Boolean(fromISO && toISO),
    fromISO,
    toISO,
    incluirTrabajador: true,
    defaultLimit: 200,
    onOpenComprobante: handleOpenComprobante,
    filtroFijo,
  });

  const formatters = useMemo(() => ({ fecha: formatDateDDMMYYYY }), []);

  return (
    <DashboardLayout title={title}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <BackButton onClick={() => router.back()} />

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {descripcion ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {descripcion}
              </Typography>
            ) : null}
          </Box>

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Desde"
                value={desdeParam ? dayjs(desdeParam) : null}
                onChange={handleChangeDesde}
                format="DD/MM/YYYY"
                slotProps={DATE_PICKER_SLOT_PROPS}
              />
              <DatePicker
                label="Hasta"
                value={hastaParam ? dayjs(hastaParam) : null}
                onChange={handleChangeHasta}
                format="DD/MM/YYYY"
                slotProps={DATE_PICKER_SLOT_PROPS}
              />
              <TextField
                label="Buscar"
                size="small"
                value={filters.qInput}
                onChange={(e) => filters.setQInput(e.target.value)}
                sx={{ width: 240 }}
                InputProps={{
                  endAdornment: filters.qInput.length > 0 ? (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => filters.setQInput('')}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>
          </LocalizationProvider>

          {isError ? (
            <Alert severity="error">
              {error?.message || 'Error al cargar las filas'}
            </Alert>
          ) : null}

          <TableComponent
            data={data}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
            sortField={table.sortField}
            sortDirection={table.sortDirection}
            onSortChange={table.onSortChange}
            pagination={table.pagination}
            onPageChange={table.onPageChange}
            onRowsPerPageChange={table.onRowsPerPageChange}
          />
        </Stack>
      </Container>

      <EditarTrabajoDiarioModal
        open={edit.open}
        onClose={edit.onClose}
        onSave={edit.onSave}
        trabajoDiario={edit.entity}
      />

      <HistorialModal
        open={logs.open}
        onClose={logs.onClose}
        entity={logs.entity}
        title="Historial de cambios"
        entityLabel="Trabajo diario"
        getEntityTitle={logs.getEntityTitle}
        getEntitySubtitle={logs.getEntitySubtitle}
      />

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
    </DashboardLayout>
  );
};

export default HorasFiltradasPage;
