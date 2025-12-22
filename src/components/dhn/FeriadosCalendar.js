import React, { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  Chip
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';

const toYmd = (dateObj) => {
  try {
    return format(dateObj, 'yyyy-MM-dd');
  } catch (_) {
    return null;
  }
};

const FeriadoDay = (props) => {
  const { day, outsideCurrentMonth, feriadosSet, ...other } = props;
  const ymd = toYmd(day);
  const isFeriado = Boolean(ymd) && !outsideCurrentMonth && feriadosSet?.has(ymd);

  return (
    <Badge
      key={String(day)}
      overlap="circular"
      variant={isFeriado ? 'dot' : 'standard'}
      color="error"
    >
      <PickersDay
        {...other}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        sx={isFeriado ? { bgcolor: 'rgba(211, 47, 47, 0.12)' } : undefined}
      />
    </Badge>
  );
};

const FeriadosCalendar = ({
  feriadosFechas,
  onAddFeriado,
  onRemoveFeriado,
  loading,
}) => {
  const feriadosSet = useMemo(() => new Set(feriadosFechas || []), [feriadosFechas]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState('add'); // "add" | "remove"
  const [dialogFecha, setDialogFecha] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCloseDialog = useCallback(() => {
    if (saving) return;
    setDialogOpen(false);
    setDialogFecha(null);
    setError('');
  }, [saving]);

  const openConfirmForFecha = useCallback((fecha) => {
    if (!fecha) return;
    const isFeriado = feriadosSet.has(fecha);
    setDialogAction(isFeriado ? 'remove' : 'add');
    setDialogFecha(fecha);
    setDialogOpen(true);
  }, [feriadosSet]);

  const handleDaySelect = useCallback((newValue) => {
    setSelectedDate(newValue);
    const fecha = toYmd(newValue);
    openConfirmForFecha(fecha);
  }, [openConfirmForFecha]);

  const handleConfirm = useCallback(async () => {
    if (!dialogFecha) return;
    try {
      setSaving(true);
      setError('');
      if (dialogAction === 'remove') {
        await onRemoveFeriado(dialogFecha);
      } else {
        await onAddFeriado(dialogFecha);
      }
      setDialogOpen(false);
      setDialogFecha(null);
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar el feriado');
    } finally {
      setSaving(false);
    }
  }, [dialogAction, dialogFecha, onAddFeriado, onRemoveFeriado]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Feriados</Typography>
            <Typography variant="body2" color="text.secondary">
              Click en un día para {`agregar/eliminar`} feriado.
            </Typography>
          </Stack>

          {loading ? (
            <Alert severity="info" variant="outlined">
              Cargando feriados…
            </Alert>
          ) : null}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
          >
            <Box sx={{ flex: 0, minWidth: 320 }}>
              <DateCalendar
                value={selectedDate}
                onChange={handleDaySelect}
                slots={{ day: FeriadoDay }}
                slotProps={{
                  day: () => ({
                    feriadosSet,
                  }),
                }}
              />
            </Box>

            <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />

            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Fechas cargadas
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {(feriadosFechas || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay feriados cargados.
                  </Typography>
                ) : (
                  (feriadosFechas || []).map((f) => (
                    <Chip
                      key={f}
                      label={f}
                      color="default"
                      variant="outlined"
                      onDelete={() => openConfirmForFecha(f)}
                      disabled={saving}
                    />
                  ))
                )}
              </Stack>
            </Box>
          </Stack>

          <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xs">
            <DialogTitle>
              {dialogAction === 'remove' ? 'Eliminar feriado' : 'Agregar feriado'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={1}>
                <Typography variant="body2">
                  {dialogAction === 'remove'
                    ? `¿Querés eliminar el feriado ${dialogFecha}?`
                    : `¿Querés agregar el feriado ${dialogFecha}?`}
                </Typography>
                {error ? <Alert severity="error">{error}</Alert> : null}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleConfirm} disabled={saving}>
                {dialogAction === 'remove' ? 'Eliminar' : 'Agregar'}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FeriadosCalendar;

