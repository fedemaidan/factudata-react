import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { formatDateDDMMYYYY, parseDDMMYYYYAnyToISO } from 'src/utils/handleDates';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton } from '@mui/material';
import BackButton from 'src/components/shared/BackButton';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import TableComponent from 'src/components/TableComponent';
import HistorialModal from 'src/components/dhn/HistorialModal';
import useTrabajoDiarioPage from 'src/hooks/dhn/useTrabajoDiarioPage';
import ImagenModal from 'src/components/ImagenModal';
import HorasRawModal from 'src/components/dhn/HorasRawModal';
import TrabajosDetectadosList from 'src/components/dhn/TrabajosDetectadosList';
import ClearIcon from '@mui/icons-material/Clear';
import EditarTrabajoDiarioModal from 'src/components/dhn/EditarTrabajoDiarioModal';

const ControlDiaPage = () => {
  const router = useRouter();
  const { dia: diaParam } = router.query;

  const diaFormatoParam = Array.isArray(diaParam) ? diaParam[0] : diaParam;
  const diaISO = parseDDMMYYYYAnyToISO(diaFormatoParam);
  const diaLabel = diaFormatoParam ? formatDateDDMMYYYY(diaISO || diaFormatoParam) : '-';

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
    isError,
    isLoading,
    data,
    stats,
    columns,
    table,
    logs,
    filters,
    edit,
  } = useTrabajoDiarioPage({
    enabled: router.isReady,
    diaISO,
    incluirTrabajador: true,
    defaultLimit: 200,
    onOpenComprobante: handleOpenComprobante,
  });

  const formatters = {
    fecha: formatDateDDMMYYYY,
  };

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    return 'Error al cargar control diario';
  }, [isError]);

  const handleVolver = useCallback(() => router.back(), [router]);

  const handleRowClick = useCallback((item) => {
    console.log('[controlQuincenal/diario] row click _id:', item?._id, item);
  }, []);

  return (
    <DashboardLayout title={`Control Diario - ${diaLabel}`}>
      <Container maxWidth="xl">
        <Stack>
          <BackButton onClick={handleVolver} sx={{ mb: 3 }} />
          
          <Stack spacing={3}>
            <FiltroTrabajoDiario stats={stats} />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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

          {errorMessage && (
            <Alert severity="error">
              {errorMessage}
            </Alert>
          )}

          <TableComponent
            data={data}
            columns={columns}
            isLoading={isLoading}
            formatters={formatters}
            sortField={table.sortField}
            sortDirection={table.sortDirection}
            onSortChange={table.onSortChange}
            pagination={table.pagination}
            onPageChange={table.onPageChange}
            onRowsPerPageChange={table.onRowsPerPageChange}
            onRowClick={handleRowClick}
          />
          </Stack>
        </Stack>
      </Container>

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

      <EditarTrabajoDiarioModal
        open={edit.open}
        onClose={edit.onClose}
        onSave={edit.onSave}
        trabajoDiario={edit.entity}
      />
    </DashboardLayout>
  );
};

export default ControlDiaPage;
