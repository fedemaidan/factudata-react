import { useEffect, useMemo, useCallback, useState } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
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
import { parseDDMMYYYYAnyToISO } from 'src/utils/handleDates';
import { formatDateDDMMYYYY } from 'src/utils/handleDates';

const TrabajadorPage = () => {
  const router = useRouter();
  const { trabajadorId } = router.query;
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

  useEffect(() => {
    if (!router.isReady) return;
    if (!trabajadorId) return;
    if (diaParam) return;
    router.replace(
      { pathname: router.pathname, query: { ...router.query, dia: dayjs().format('DD-MM-YYYY') } },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, trabajadorId, diaParam, router]);

  const handleChangeDia = useCallback((nv) => {
    const nextDia = (nv || dayjs()).format('DD-MM-YYYY');
    const nextQuery = { ...router.query, dia: nextDia };
    delete nextQuery.page;
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const [modalUrl, setModalUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFileName, setModalFileName] = useState("");

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
    diaISO,
    trabajadorId: trabajadorId ? String(trabajadorId) : undefined,
    incluirTrabajador: false,
    defaultLimit: 200,
    onOpenComprobante: handleOpenParteModal,
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
    </DashboardLayout>
  );
};

export default TrabajadorPage;