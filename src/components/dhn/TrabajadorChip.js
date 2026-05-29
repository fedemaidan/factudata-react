import { Chip } from '@mui/material';

const chipSx = {
  cursor: 'pointer',
  borderColor: 'primary.main',
  color: 'primary.main',
  transition: 'all .2s ease',
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.12)',
    color: 'primary.dark',
    borderColor: 'primary.dark',
  },
};

const formatLabel = (trabajador) => {
  const nombre = trabajador?.nombre || '';
  const apellido = trabajador?.apellido || '';
  const dni = trabajador?.dni;
  const nombreCompleto = `${nombre} ${apellido}`.trim() || '(sin nombre)';
  return dni ? `${nombreCompleto} (${dni})` : `${nombreCompleto} (sin DNI)`;
};

const TrabajadorChip = ({ trabajador, onClick, size = 'small' }) => (
  <Chip
    label={formatLabel(trabajador)}
    size={size}
    variant="outlined"
    color="primary"
    onClick={(event) => {
      event.stopPropagation();
      if (onClick) onClick(trabajador, event);
    }}
    sx={chipSx}
  />
);

export default TrabajadorChip;
