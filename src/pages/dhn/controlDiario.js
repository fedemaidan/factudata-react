import { useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import TableComponent from 'src/components/TableComponent';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import HistorialModal from 'src/components/dhn/HistorialModal';
import HorasRawModal from 'src/components/dhn/HorasRawModal';
import useTrabajoDiarioPage from 'src/hooks/dhn/useTrabajoDiarioPage';
import ImagenModal from 'src/components/ImagenModal';
import TrabajosDetectadosList from 'src/components/dhn/TrabajosDetectadosList';
import { parseDDMMYYYYAnyToISO, formatDateDDMMYYYY } from 'src/utils/handleDates';

const ControlDiarioPage = () => {
  const router = useRouter();
  const diaParam = useMemo(() => {
    const raw = Array.isArray(router.query.dia) ? router.query.dia[0] : router.query.dia;
    return raw ? String(raw) : null;
  }, [router.query.dia]);

  const diaISO = useMemo(() => {
    if (diaParam) {
      const iso = parseDDMMYYYYAnyToISO(diaParam);
      if (iso) return iso;
    }
    return parseDDMMYYYYAnyToISO(dayjs().format('DD-MM-YYYY'));
  }, [diaParam]);

  const diaLabel = useMemo(() => {
    if (!diaISO) return '-';
    if (!diaParam) return formatDateDDMMYYYY(diaISO);
    return formatDateDDMMYYYY(diaISO || diaParam);
  }, [diaISO, diaParam]);

  useEffect(() => {
    if (!router.isReady) return;
    if (diaParam) return;
    router.replace(
      { pathname: router.pathname, query: { ...router.query, dia: dayjs().format('DD-MM-YYYY') } },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, diaParam, router]);

  const handleChangeDia = useCallback((nv) => {
    const nextDia = (nv || dayjs()).format('DD-MM-YYYY');
    const nextQuery = { ...router.query, dia: nextDia };
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
      const titleBase = nombre ? `${nombre} • ${diaLabel}` : `Fichadas raw • ${diaLabel}`;
      const title = dni ? `${titleBase} • ${dni}` : titleBase;
      setRawModalData(Array.isArray(item?.dataRawExcel) ? item.dataRawExcel : []);
      setRawModalTitle(title);
      setRawModalFileName(comp?.file_name || comp?.fileName || '');
      setRawModalUrl(url || '');
      setRawModalOpen(true);
    }
  }, [diaLabel]);

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
    enabled: router.isReady,
    diaISO,
    incluirTrabajador: true,
    defaultLimit: 200,
    onOpenComprobante: handleOpenComprobante,
  });

  const formatters = useMemo(() => ({
    fecha: (value) => {
      if (!value) return '-';
      const d = new Date(value);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }), []);

  const handleRowClick = useCallback((item) => {
    console.log('[controlDiario] row click _id:', item?._id, item);
  }, []);

  return (
    <DashboardLayout title="Control Diario">
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Día"
                value={dayjs(diaISO)}
                onChange={handleChangeDia}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
              />
              <TextField
                label="Buscar"
                size="small"
                value={filters.qInput}
                onChange={(e) => filters.setQInput(e.target.value)}
                sx={{ width: 200 }}
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
              {error?.message || 'Error al cargar control diario'}
            </Alert>
          )}

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
            onRowClick={handleRowClick}
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

export default ControlDiarioPage;