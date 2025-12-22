import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { formatDateDDMMYYYY, parseDDMMYYYYAnyToISO } from 'src/utils/handleDates';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton } from '@mui/material';
import BackButton from 'src/components/shared/BackButton';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import TableComponent from 'src/components/TableComponent';
import HistorialModal from 'src/components/dhn/HistorialModal';
import useTrabajoDiarioPage from 'src/hooks/dhn/useTrabajoDiarioPage';
import ClearIcon from '@mui/icons-material/Clear';

const ControlDiaPage = () => {
  const router = useRouter();
  const { dia: diaParam } = router.query;

  const diaFormatoParam = Array.isArray(diaParam) ? diaParam[0] : diaParam;
  const diaISO = parseDDMMYYYYAnyToISO(diaFormatoParam);
  const diaLabel = diaFormatoParam ? formatDateDDMMYYYY(diaISO || diaFormatoParam) : '-';

  const {
    error,
    isError,
    isLoading,
    data,
    stats,
    columns,
    table,
    logs,
    filters,
  } = useTrabajoDiarioPage({
    enabled: router.isReady,
    diaISO: diaISO ? `${diaISO}T12:00:00` : null,
    incluirTrabajador: true,
    enableEdit: false,
    defaultLimit: 200,
  });

  const formatters = {
    fecha: formatDateDDMMYYYY,
  };

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    return 'Error al cargar control diario';
  }, [isError]);

  const handleVolver = useCallback(() => router.back(), [router]);

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
    </DashboardLayout>
  );
};

export default ControlDiaPage;
