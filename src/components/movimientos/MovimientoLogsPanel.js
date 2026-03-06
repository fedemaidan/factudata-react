import React from 'react';
import { Alert, Box, Stack, Tooltip, Typography } from '@mui/material';
import { formatCurrency } from 'src/utils/formatters';

const FIELD_LABELS = {
  total: 'Total',
  subtotal: 'Subtotal',
  total_original: 'Total original',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  estado: 'Estado',
  medio_pago: 'Medio de pago',
  observacion: 'Observación',
  fecha_factura: 'Fecha de factura',
  fecha_pago: 'Fecha de pago',
  moneda: 'Moneda',
  nombre_proveedor: 'Proveedor',
  tags_extra: 'Tags',
  caja_chica: 'Caja chica',
  obra: 'Obra',
  cliente: 'Cliente',
  factura_cliente: 'Factura cliente',
  impuestos: 'Impuestos',
  materiales: 'Materiales',
  etapa: 'Etapa',
  type: 'Tipo',
};

const AMOUNT_FIELDS = new Set(['total', 'subtotal', 'total_original']);
const SUMMARY_ARRAY_FIELDS = new Set(['impuestos', 'materiales']);

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  if (typeof seconds === 'number') return new Date(seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatShortDate = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatValueByField = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (AMOUNT_FIELDS.has(field)) return formatCurrency(value, 2);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (field.startsWith('fecha_')) return formatDateTime(value);
  if (Array.isArray(value)) {
    if (field === 'tags_extra' && value.length > 0) return value.join(', ');
    if (SUMMARY_ARRAY_FIELDS.has(field)) return `${value.length} ítem(s)`;
    return `${value.length} ítem(s)`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  const str = String(value);
  return str.length > 60 ? `${str.slice(0, 60)}…` : str;
};

const getFieldLabel = (field) => FIELD_LABELS[field] || field;

const MovimientoLogsPanel = ({ logs = [] }) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1 }}>
        Sin cambios registrados.
      </Alert>
    );
  }

  return (
    <Stack spacing={0} sx={{ position: 'relative' }}>
      {logs.map((log, idx) => {
        const author = log?.userName || log?.userId || 'Sistema';
        const createdAtText = formatShortDate(log?.createdAt);
        const changes = Array.isArray(log?.changes) ? log.changes : [];

        if (changes.length === 0) return null;

        return (
          <Box
            key={log?.id || `${author}-${idx}`}
            sx={{
              display: 'flex',
              gap: 1.5,
              py: 1.5,
              borderBottom: idx < logs.length - 1 ? 1 : 0,
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 0 },
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                flexShrink: 0,
                mt: 0.75,
              }}
            />
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={0.5}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {author}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {createdAtText}
                </Typography>
              </Stack>
              <Stack spacing={0.25} sx={{ pl: 0 }}>
                {changes.map((change, i) => {
                  const label = getFieldLabel(change?.field);
                  const fromStr = formatValueByField(change?.field || '', change?.from);
                  const toStr = formatValueByField(change?.field || '', change?.to);
                  const fromEmpty = fromStr === '—';
                  const toEmpty = toStr === '—';

                  let text;
                  if (fromEmpty && toEmpty) return null;
                  if (fromEmpty) text = `${label}: ${toStr}`;
                  else if (toEmpty) text = `${label}: ${fromStr} → (vacío)`;
                  else text = `${label}: ${fromStr} → ${toStr}`;

                  const fullText = `${label}: ${fromStr} → ${toStr}`;
                  const needsTooltip = fullText.length > 80;

                  return (
                    <Typography
                      key={`${change?.field}-${i}`}
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: '0.8125rem' }}
                    >
                      {needsTooltip ? (
                        <Tooltip title={fullText} arrow placement="top-start">
                          <span>{text}</span>
                        </Tooltip>
                      ) : (
                        text
                      )}
                    </Typography>
                  );
                })}
              </Stack>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

export default MovimientoLogsPanel;
