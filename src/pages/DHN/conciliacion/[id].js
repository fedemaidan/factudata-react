import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Container, Stack, Alert, Box, TextField, InputAdornment, IconButton, Chip, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ClearIcon from '@mui/icons-material/Clear';
import TableViewIcon from '@mui/icons-material/TableView';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SickIcon from '@mui/icons-material/Sick';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TableComponent from 'src/components/TableComponent';
import FiltroTrabajoDiario from 'src/components/dhn/FiltroTrabajoDiario';
import conciliacionService from 'src/services/dhn/conciliacionService';

const ConciliacionDetallePage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, okAutomatico: 0, incompleto: 0, advertencia: 0, pendiente: 0, error: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoInfo, setPeriodoInfo] = useState('-');
  const [sheetId, setSheetId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rowToEdit, setRowToEdit] = useState(null);
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

  const estadoFiltro = useMemo(() => {
    return router.query.estado || 'todos';
  }, [router.query.estado]);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await conciliacionService.getConciliacionRows(id, {
        estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
        text: searchTerm?.trim() ? searchTerm.trim() : undefined,
        limit: 1000
      });
      setRows(res.data || []);
      setStats(res.stats || { total: 0, okAutomatico: 0, incompleto: 0, advertencia: 0, pendiente: 0, error: 0 });
      setPeriodoInfo(res.periodo || '-');
      setSheetId(res.sheetId || null);
      setError(null);
    } catch (e) {
      setError('Error al cargar detalle de conciliación');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, estadoFiltro]);

  const getEstadoChipProps = (estado) => {
    const e = (estado || '').toString().toLowerCase();
    if (['ok', 'okautomatico', 'ok_automatico', 'completo'].includes(e)) {
      return { label: 'OK', color: 'success' };
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
      'Noc.': '#546e7a', // blueGrey-600
    };
    const c = colorMap[k] || theme.palette.grey[600];
    return {
      bgcolor: alpha(c, 0.12),
      color: c,
      borderColor: alpha(c, 0.28),
    };
  };

  const formatDni = (value) => {
    if (!value || value === '-') return '-';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const columns = useMemo(() => ([
    { key: 'fecha', label: 'Fecha' },
    { key: 'trabajador', label: 'Trabajador' },
    { key: 'dni', label: 'DNI', render: (row) => formatDni(row.dni) },
    { key: 'licencia', label: 'Licencia', render: (row) => {
      const lic = (row?.sheetHoras?.fechaLicencia ?? row?.licencia ?? false) ? true : false;
      return lic ? 'Sí' : 'No';
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
          { k: 'Noc.', v: Number(db.horasNocturnas || 0), color: 'info' },
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
          { k: 'Noc.', v: Number(sh.horasNocturnas || 0) },
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
              return (
                <Chip
                  key={`${comp.type}-${idx}`}
                  label={comp.type}
                  size="small"
                  color={color}
                  variant="outlined"
                  component="a"
                  href={comp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  clickable
                  icon={icon}
                />
              );
            })}
          </Stack>
        );
      }
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (row) => {
        const { label, color } = getEstadoChipProps(row.estado);
        return <Chip size="small" color={color} label={label} />;
      }
    },
    { key: 'observacion', label: 'Observación', sx: { maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
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
  ]), []);

  const formatters = useMemo(() => ({
    fecha: (value) => {
      if (!value) return '-';
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }), []);

  return (
    <DashboardLayout title={`Conciliación - ${periodoInfo}`}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="start">
          <Button
            variant="text"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
          >
            Volver
          </Button>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Buscar"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 240 }}
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
                if (e.key === 'Enter') fetchData();
              }}
              onBlur={fetchData}
            />
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

          <FiltroTrabajoDiario stats={stats} />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableComponent
            data={rows}
            columns={columns}
            formatters={formatters}
            isLoading={isLoading}
            onRowClick={(row) => {
              console.log('conciliacion.row', row);
            }}
          />
        </Stack>
      </Container>

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
                await fetchData();
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


