import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import MedicalInformationRoundedIcon from '@mui/icons-material/MedicalInformationRounded';

export const TrabajadorCell = ({ item }) => {
  if (!item.trabajadorId) {
    return <Typography variant="caption" color="textSecondary">-</Typography>;
  }
  const { apellido, nombre } = item.trabajadorId;
  return (
    <Typography variant="body2">
      {apellido}, {nombre}
    </Typography>
  );
};

export const DNICell = ({ item }) => {
  if (!item.trabajadorId?.dni) {
    return <Typography variant="caption" color="textSecondary">-</Typography>;
  }
  const dni = item.trabajadorId.dni;
  const dniFormateado = dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (
    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
      {dniFormateado}
    </Typography>
  );
};

export const EstadoCell = ({ item }) => {
  const estado = (item?.estado || '-').toString();

  const formatEstadoLabel = (value) => {
    const raw = (value || '-').toString();
    if (raw === 'ok') return 'OK';
    if (raw === 'okAutomatico') return 'OK Automático';
    if (raw === 'okManual') return 'OK Manual';
    if (raw === '-' || raw.trim() === '') return '-';

    const withSpaces = raw
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .trim();

    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  };

  if (['ok', 'okAutomatico', 'okManual'].includes(estado)) {
    return <Chip size="small" label={formatEstadoLabel(estado)} color="success" />;
  }
  if (estado === 'incompleto') return <Chip size="small" label="⚠ Incompleto" color="warning" />;
  if (estado === 'advertencia') return <Chip size="small" label="✖ Error" color="error" />;
  return <Chip size="small" label={formatEstadoLabel(estado)} color="default" />;
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
    { key: 'horasNocturnas', label: 'Nocturnas', color: 'default', sx: { borderColor: '#5c6bc0', color: '#5c6bc0' } },
    { key: 'horasNocturnas50', label: 'Noct. 50%', color: 'default', sx: { borderColor: '#ab47bc', color: '#ab47bc' } },
    { key: 'horasNocturnas100', label: 'Noct. 100%', color: 'default', sx: { borderColor: '#ec407a', color: '#ec407a' } },
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
          sx={{ fontSize: '0.65rem', height: 20, width: 'fit-content', '& .MuiChip-label': { px: 2 }, ...tipo.sx }}
        />
      ))}
    </Box>
  );
};

export const ComprobantesCell = ({ item, onOpen }) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
    {item.comprobantes && item.comprobantes.length > 0 ? (
      item.comprobantes.map((comp, compIndex) => (
        (() => {
          const url = comp.url || comp.url_storage || null;
          const handleClick = (event) => {
            if (comp.type === 'parte' && onOpen && url) {
              event.preventDefault();
              event.stopPropagation();
              onOpen(url, comp);
            }
          };
          return (
            <Chip
              key={`${comp.type}-${url || comp.id || compIndex}`}
              label={comp.type.charAt(0).toUpperCase() + comp.type.slice(1).toLowerCase()}
              size="small"
              color={
                comp.type === 'horas' ? 'primary' :
                comp.type === 'parte' ? 'success' :
                comp.type === 'licencia' ? 'warning' : 'default'
              }
              variant="filled"
              component="a"
              href={url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              clickable
              icon={
                comp.type === 'horas' ? <AccessTimeRoundedIcon fontSize="small" /> :
                comp.type === 'parte' ? <DescriptionRoundedIcon fontSize="small" /> :
                comp.type === 'licencia' ? <MedicalInformationRoundedIcon fontSize="small" /> : null
              }
              sx={{
                cursor: 'pointer',
                textDecoration: 'none',
                fontWeight: 600,
                boxShadow: 1,
                transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-1px)',
                  filter: 'brightness(1.02)',
                },
                '&:active': { transform: 'translateY(0)' },
                '& .MuiChip-icon': { fontSize: '1rem' },
                '& .MuiChip-label': { px: 1.5 },
              }}
              onClick={handleClick}
            />
          );
        })()
      ))
    ) : (
      <Typography variant="caption" color="textSecondary">-</Typography>
    )}
  </Box>
);

export const buildTrabajoRegistradoColumns = (onEdit, incluirTrabajador = false, onOpenComprobante) => ([
  ...(incluirTrabajador ? [
    { key: 'trabajador', label: 'Trabajador', sortable: true, render: (item) => <TrabajadorCell item={item} /> },
    { key: 'dni', label: 'DNI', sortable: true, render: (item) => <DNICell item={item} /> },
  ] : []),
  { key: 'estado', label: 'Estado', sortable: true, render: (item) => <EstadoCell item={item} /> },
  { key: 'licencia', label: 'Licencia', sortable: true, render: (item) => <LicenciaCell item={item} /> },
  { key: 'fecha', label: 'Fecha', sortable: true },
  { key: 'horas', label: 'Horas', sortable: false, render: (item) => <PartesCell item={item} /> },
  { key: 'comprobantes', label: 'Comprobantes', sortable: false, render: (item) => (
    <ComprobantesCell item={item} onOpen={onOpenComprobante} />
  ) },
  ...(onEdit ? [{ 
    key: 'acciones', 
    label: 'Acciones', 
    sortable: false, 
    render: (item) => onEdit(item) 
  }] : []),
]);


