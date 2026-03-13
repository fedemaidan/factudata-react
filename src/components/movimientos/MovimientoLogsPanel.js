import React, { useState } from 'react';
import { Alert, Box, Button, Collapse, Divider, Stack, Typography } from '@mui/material';
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

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const formatNestedValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const MovimientoLogsPanel = ({ logs = [] }) => {
  const [collapsedLogs, setCollapsedLogs] = useState(() => new Set());

  if (!Array.isArray(logs) || logs.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1 }}>
        Sin cambios registrados.
      </Alert>
    );
  }

  const handleToggleLog = (logKey) => {
    setCollapsedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logKey)) {
        next.delete(logKey);
      } else {
        next.add(logKey);
      }
      return next;
    });
  };

  return (
    <Stack spacing={0} sx={{ position: 'relative' }}>
      {logs.map((log, idx) => {
        const author = log?.userName || log?.userId || 'Sistema';
        const createdAtText = formatShortDate(log?.createdAt);
        const changes = Array.isArray(log?.changes) ? log.changes : [];
        const filteredChanges = changes.filter((change) => change?.field !== 'equivalencias');

        if (filteredChanges.length === 0) return null;

        const logKey = log?.id || `${author}-${idx}`;
        const isCollapsed = collapsedLogs.has(logKey);

        return (
          <Box
            key={logKey}
            sx={{
              borderBottom: idx < logs.length - 1 ? 1 : 0,
              borderColor: 'divider',
              pb: 2,
              mb: idx < logs.length - 1 ? 2 : 0,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                  }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {author}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {createdAtText}
                </Typography>
                <Button size="small" variant="text" onClick={() => handleToggleLog(logKey)}>
                  {isCollapsed ? 'Mostrar' : 'Ocultar'} cambios
                </Button>
              </Stack>
            </Stack>

            <Collapse in={!isCollapsed}>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                {filteredChanges.map((change, i) => {
                  const label = getFieldLabel(change?.field);
                  const fromIsObject = isPlainObject(change?.from);
                  const toIsObject = isPlainObject(change?.to);
                  const fromText = formatValueByField(change?.field || '', change?.from);
                  const toText = formatValueByField(change?.field || '', change?.to);
                  const isMeaningful = fromText !== '—' || toText !== '—';
                  if (!label || !isMeaningful) return null;

                  return (
                    <Box
                      key={`${change?.field}-${i}`}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                        backgroundColor: 'background.paper',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600}>
                          {label}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            Antes:
                          </Typography>
                          <Typography variant="body2">{fromText}</Typography>
                          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            Ahora:
                          </Typography>
                          <Typography variant="body2">{toText}</Typography>
                        </Stack>
                      </Stack>

                      {fromIsObject && (
                        <Stack spacing={0.4} sx={{ mt: 1, pl: 1.5, borderLeft: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">
                            Antes (detalle)
                          </Typography>
                          {Object.entries(change.from || {}).map(([key, val]) => (
                            <Stack key={`from-${key}-${i}`} direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
                                {key}:
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                                {formatNestedValue(val)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                      {toIsObject && (
                        <Stack spacing={0.4} sx={{ mt: 1, pl: 1.5, borderLeft: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">
                            Ahora (detalle)
                          </Typography>
                          {Object.entries(change.to || {}).map(([key, val]) => (
                            <Stack key={`to-${key}-${i}`} direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
                                {key}:
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                                {formatNestedValue(val)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
    </Stack>
  );
};

export default MovimientoLogsPanel;
