import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SickIcon from '@mui/icons-material/Sick';

export const EstadoCell = ({ item }) => {
  const estado = item.estado || 'ok';
  if (estado === 'ok') return <Chip size="small" label="OK" color="success" />;
  if (estado === 'incompleto') return <Chip size="small" label="⚠ Incompleto" color="warning" />;
  if (estado === 'advertencia') return <Chip size="small" label="✖ Error" color="error" />;
  return <Chip size="small" label={estado} color="default" />;
};

export const LicenciaCell = ({ item }) => {
  if (item.fechaLicencia) {
    return <Chip size="small" label="Licencia" color="warning" variant="outlined" />;
  }
  return <Typography variant="caption" color="textSecondary">-</Typography>;
};

export const HorasExcelCell = ({ item }) => {
  if (!item.horasTrabajadasExcel) {
    return <Typography variant="caption" color="textSecondary">-</Typography>;
  }
  const { fichadas, total } = item.horasTrabajadasExcel;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {fichadas && fichadas.length > 0 ? (
        <>
          {fichadas.map((fichada, idx) => (
            <Chip
              key={idx}
              label={`${fichada.entradaReal}-${fichada.salidaReal} (${fichada.horasTrabajadas})`}
              size="small"
              sx={{
                fontSize: '0.65rem',
                height: 20,
                width: 'fit-content',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiChip-label': { px: 2 }
              }}
            />
          ))}
          <Chip
            label={`Total: ${total}h`}
            size="small"
            color="primary"
            sx={{
              fontSize: '0.65rem',
              height: 20,
              fontWeight: 'bold',
              width: 'fit-content',
              '& .MuiChip-label': { px: 2 }
            }}
          />
        </>
      ) : (
        <Typography variant="caption" color="textSecondary">Sin fichadas</Typography>
      )}
    </Box>
  );
};

export const PartesCell = ({ item }) => {
  const tiposHoras = [
    { key: 'horasNormales', label: 'Normales', color: 'default' },
    { key: 'horas50', label: '50%', color: 'primary' },
    { key: 'horas100', label: '100%', color: 'success' },
    { key: 'horasAltura', label: 'Altura', color: 'warning' },
    { key: 'horasHormigon', label: 'Hormigón', color: 'info' },
    { key: 'horasZanjeo', label: 'Zanjeo', color: 'secondary' },
  ];
  const horasConValor = tiposHoras.filter((tipo) => item[tipo.key] != null && item[tipo.key] > 0);
  if (horasConValor.length === 0) {
    return <Typography variant="caption" color="textSecondary">-</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {horasConValor.map((tipo) => (
        <Chip
          key={tipo.key}
          label={`${tipo.label}: ${item[tipo.key]}h`}
          size="small"
          color={tipo.color}
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20, width: 'fit-content', '& .MuiChip-label': { px: 2 } }}
        />
      ))}
    </Box>
  );
};

export const TotalPartesCell = ({ item }) => {
  const total = (
    (item.horasNormales || 0) +
    (item.horas50 || 0) +
    (item.horas100 || 0) +
    (item.horasAltura || 0) +
    (item.horasHormigon || 0) +
    (item.horasZanjeo || 0)
  );
  if (total === 0) return <Typography variant="caption" color="textSecondary">-</Typography>;
  return (
    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
      {total.toFixed(2)}h
    </Typography>
  );
};

export const ComprobantesCell = ({ item }) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
    {item.comprobantes && item.comprobantes.length > 0 ? (
      item.comprobantes.map((comp) => (
        <Chip
          key={comp.type}
          label={comp.type}
          size="small"
          color={
            comp.type === 'horas' ? 'primary' :
            comp.type === 'parte' ? 'success' :
            comp.type === 'licencia' ? 'warning' : 'default'
          }
          variant="outlined"
          component="a"
          href={comp.url}
          target="_blank"
          rel="noopener noreferrer"
          clickable
          icon={
            comp.type === 'horas' ? <TableViewIcon fontSize="small" /> :
            comp.type === 'parte' ? <AssignmentIcon fontSize="small" /> :
            comp.type === 'licencia' ? <SickIcon fontSize="small" /> : null
          }
          sx={{ cursor: 'pointer', textDecoration: 'none', '&:hover': { backgroundColor: 'action.hover' }, '& .MuiChip-icon': { fontSize: '1rem' } }}
        />
      ))
    ) : (
      <Typography variant="caption" color="textSecondary">-</Typography>
    )}
  </Box>
);

export const buildTrabajoRegistradoColumns = () => ([
  { key: 'estado', label: 'Estado', sortable: true, render: (item) => <EstadoCell item={item} /> },
  { key: 'licencia', label: 'Licencia', sortable: true, render: (item) => <LicenciaCell item={item} /> },
  { key: 'fecha', label: 'Fecha', sortable: true },
  { key: 'horasExcel', label: 'Horas Excel', sortable: false, render: (item) => <HorasExcelCell item={item} /> },
  { key: 'partes', label: 'Partes', sortable: false, render: (item) => <PartesCell item={item} /> },
  { key: 'totalHoras', label: 'Total Partes', sortable: true, render: (item) => <TotalPartesCell item={item} /> },
  { key: 'comprobantes', label: 'Comprobantes', sortable: false, render: (item) => <ComprobantesCell item={item} /> },
]);


