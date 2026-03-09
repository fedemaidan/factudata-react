import { useState, useCallback } from 'react';
import {
  Box,
  Stack,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Switch,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const SEGMENTOS = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'todos', label: 'Todos' },
];

const hoy = new Date();
const defaultDesde = format(startOfMonth(hoy), 'yyyy-MM-dd');
const defaultHasta = format(hoy, 'yyyy-MM-dd');
const defaultDesdeB = format(startOfMonth(subMonths(hoy, 1)), 'yyyy-MM-dd');
const defaultHastaB = format(endOfMonth(subMonths(hoy, 1)), 'yyyy-MM-dd');

export default function FunnelFilters({ onApply, loading, showComparison = false }) {
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);
  const [segmento, setSegmento] = useState('inbound');
  const [comparar, setComparar] = useState(false);
  const [desdeB, setDesdeB] = useState(defaultDesdeB);
  const [hastaB, setHastaB] = useState(defaultHastaB);

  const handleApply = useCallback(() => {
    const params = { desde, hasta, segmento };
    if (showComparison && comparar) {
      params.desdeB = desdeB;
      params.hastaB = hastaB;
    }
    onApply(params);
  }, [desde, hasta, segmento, comparar, desdeB, hastaB, onApply, showComparison]);

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end" flexWrap="wrap">
        {/* Período A */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Desde"
            type="date"
            size="small"
            value={desde}
            onChange={e => setDesde(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            value={hasta}
            onChange={e => setHasta(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
        </Stack>

        {/* Segmento */}
        <FormControl>
          <FormLabel sx={{ fontSize: 12 }}>Segmento</FormLabel>
          <RadioGroup
            row
            value={segmento}
            onChange={e => setSegmento(e.target.value)}
          >
            {SEGMENTOS.map(s => (
              <FormControlLabel
                key={s.value}
                value={s.value}
                control={<Radio size="small" />}
                label={s.label}
                sx={{ '& .MuiFormControlLabel-label': { fontSize: 13 } }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleApply}
          disabled={loading}
          sx={{ height: 40 }}
        >
          {loading ? 'Cargando...' : 'Consultar'}
        </Button>
      </Stack>

      {/* Comparar períodos */}
      {showComparison && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch
              checked={comparar}
              onChange={e => setComparar(e.target.checked)}
              size="small"
            />
            <Typography variant="body2">Comparar con otro período</Typography>
          </Stack>
          {comparar && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField
                label="Desde (B)"
                type="date"
                size="small"
                value={desdeB}
                onChange={e => setDesdeB(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                label="Hasta (B)"
                type="date"
                size="small"
                value={hastaB}
                onChange={e => setHastaB(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
