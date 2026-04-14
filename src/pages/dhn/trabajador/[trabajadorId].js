import { useEffect, useMemo, useCallback, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton, Typography } from '@mui/material';
import BackButton from 'src/components/shared/BackButton';
import ClearIcon from '@mui/icons-material/Clear';
import TableComponent from 'src/components/TableComponent';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import useTrabajoDiarioPage from 'src/hooks/dhn/useTrabajoDiarioPage';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import ImagenModal from 'src/components/ImagenModal';
import TrabajosDetectadosList from 'src/components/dhn/TrabajosDetectadosList';
import HistorialModal from 'src/components/dhn/HistorialModal';
import HorasRawModal from 'src/components/dhn/HorasRawModal';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';

const DEFAULT_MES = dayjs().format('YYYY-MM');

const parseMesParam = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  const [y, m] = s.split('-').map(Number);
  if (m < 1 || m > 12) return null;
  return s;
};

const TrabajadorPage = () => {
  const router = useRouter();
  const { trabajadorId } = router.query;
  const mesParam = useMemo(() => {
    const raw = Array.isArray(router.query.mes) ? router.query.mes[0] : router.query.mes;
    return parseMesParam(raw) || null;
  }, [router.query.mes]);

  const mesLabel = useMemo(() => {
    if (!mesParam) return '-';
    const [y, m] = mesParam.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return dayjs(d).locale('en').format('MMMM YYYY');
  }, [mesParam]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!trabajadorId) return;
    if (mesParam) return;
    router.replace(
      { pathname: router.pathname, query: { ...router.query, mes: DEFAULT_MES } },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, trabajadorId, mesParam, router]);

  const handleChangeMes = useCallback((nv) => {
    const nextMes = (nv || dayjs()).format('YYYY-MM');
    const nextQuery = { ...router.query, mes: nextMes };
    delete nextQuery.page;
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const [modalUrl, setModalUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFileName, setModalFileName] = useState("");
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
      const titleBase = nombre ? `${nombre} • ${mesLabel}` : `Fichadas raw • ${mesLabel}`;
      const title = dni ? `${titleBase} • ${dni}` : titleBase;
      setRawModalData(Array.isArray(item?.dataRawExcel) ? item.dataRawExcel : []);
      setRawModalTitle(title);
      setRawModalFileName(comp?.file_name || comp?.fileName || '');
      setRawModalUrl(url || '');
      setRawModalOpen(true);
    }
  }, [mesLabel]);

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

  const {
    data,
    stats,
    error,
    isError,
    isLoading,
    columns,
    table,
    filters,
    logs,
    edit,
  } = useTrabajoDiarioPage({
    enabled: router.isReady && !!trabajadorId,
    mesParam: mesParam || DEFAULT_MES,
    trabajadorId: trabajadorId ? String(trabajadorId) : undefined,
    incluirTrabajador: false,
    defaultLimit: 200,
    defaultSort: 'fecha:asc',
    onOpenComprobante: handleOpenComprobante,
  });

  const formatters = { fecha: formatDateDDMMYYYY };

  const trabajador = useMemo(() => {
    const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return first?.trabajadorId || null;
  }, [data]);

  const handleVolver = useCallback(() => router.back(), [router]);

  const title = useMemo(() => {
    if (trabajador?.apellido || trabajador?.nombre) {
      const ap = String(trabajador?.apellido || '').trim();
      const no = String(trabajador?.nombre || '').trim();
      return `${ap}${ap && no ? ', ' : ''}${no}`.trim();
    }
    return trabajadorId ? String(trabajadorId) : 'Trabajador';
  }, [trabajador, trabajadorId]);

  if (!trabajadorId) {
    return (
      <DashboardLayout title="Trabajador">
        <Container maxWidth="xl">
          <Alert severity="warning">ID de trabajador no especificado</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={title}>
      <Container maxWidth="xl">
        <Stack>
          <BackButton onClick={handleVolver} sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {trabajador?.dni && (
              <Typography variant="body2" color="text.secondary">
                DNI: {trabajador.dni}
              </Typography>
            )}

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <DatePicker
                  label="Month"
                  value={mesParam ? dayjs(`${mesParam}-01`) : dayjs()}
                  onChange={handleChangeMes}
                  views={['month', 'year']}
                  openTo="month"
                  format="MMM YYYY"
                  slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
                />
                <TextField
                  label="Buscar"
                  size="small"
                  value={filters.qInput}
                  onChange={(e) => filters.setQInput(e.target.value)}
                  sx={{ width: 240 }}
                  InputProps={{
                    endAdornment: filters.qInput.length > 0 && (
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
                    ),
                  }}
                />
              </Box>
            </LocalizationProvider>

            <FiltroTrabajoDiario stats={stats} />

            {isError && (
              <Alert severity="error">
                {error?.message || 'Error al cargar los trabajos del trabajador'}
              </Alert>
            )}

            <TableComponent
              data={data}
              columns={columns}
              isLoading={isLoading}
              sortField={table.sortField}
              sortDirection={table.sortDirection}
              onSortChange={table.onSortChange}
              pagination={table.pagination}
              onPageChange={table.onPageChange}
              onRowsPerPageChange={table.onRowsPerPageChange}
              formatters={formatters}
            />
          </Stack>
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

export default TrabajadorPage;