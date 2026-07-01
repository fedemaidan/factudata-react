import { useState, useEffect } from 'react';
import {
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Box,
  Typography,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import { exportControlPresupuestoXLSX } from 'src/utils/controlPresupuesto/exportControlPresupuestoXLSX';

/**
 * Botón "Excel" gemelo de ExportarPdfMenu: exporta SOLO la tabla de movimientos del
 * control de presupuesto (las mismas columnas que el recibo PDF) a un .xlsx, con el
 * mismo selector de modo (Pesos nominales / CAC a hoy / USD). No hay plantillas ni
 * encabezado: solo la tabla, tal cual la muestra el PDF.
 *
 * Comparte la firma de datos con ExportarPdfMenu: `buildData({ modo })` devuelve el
 * objeto de buildControlPresupuestoData; de ahí sale la tabla.
 */
const MODO_LABELS = { nominal: 'Pesos nominales', cac: 'CAC a hoy', usd: 'USD' };

export default function ExportarExcelMenu({
  buildData,
  fileName = 'control-presupuesto',
  disabled = false,
  onError,
  modosDisponibles = [],
  modoDefault = 'nominal',
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [modo, setModo] = useState(modoDefault);
  const open = Boolean(anchorEl);

  useEffect(() => { setModo(modoDefault); }, [modoDefault]);

  const mostrarSelectorModo = Array.isArray(modosDisponibles) && modosDisponibles.length > 1;

  const exportar = (modoElegido) => {
    try {
      const data = buildData(mostrarSelectorModo ? { modo: modoElegido } : undefined);
      exportControlPresupuestoXLSX(data, fileName);
    } catch (err) {
      console.error('Error exportando a Excel:', err);
      onError?.('No se pudo exportar a Excel');
    }
  };

  const handleClick = (e) => {
    // Con un solo modo no hace falta menú: se exporta directo.
    if (!mostrarSelectorModo) { exportar(modo); return; }
    setAnchorEl(e.currentTarget);
  };

  const cerrar = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Exportar a Excel" arrow>
        <Chip
          icon={<GridOnRoundedIcon sx={{ fontSize: 15 }} />}
          label="Excel"
          size="small"
          variant="outlined"
          color="success"
          disabled={disabled}
          onClick={handleClick}
          sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 22, '& .MuiChip-icon': { ml: 0.6 } }}
        />
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={cerrar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 256, mt: 0.5, borderRadius: 2 } } }}
      >
        <ListSubheader sx={{ lineHeight: '32px', fontWeight: 700, color: 'text.secondary' }}>
          Exportar tabla a Excel
        </ListSubheader>

        <Box
          sx={{ px: 2, pt: 0.5, pb: 1 }}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Mostrar importes en
          </Typography>
          <ToggleButtonGroup
            value={modo}
            exclusive
            size="small"
            fullWidth
            onChange={(e, v) => { if (v) setModo(v); }}
          >
            {modosDisponibles.map((m) => (
              <ToggleButton key={m} value={m} sx={{ fontSize: '0.65rem', py: 0.4, textTransform: 'none' }}>
                {MODO_LABELS[m] || m}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <MenuItem onClick={() => { cerrar(); exportar(modo); }} sx={{ py: 1 }}>
          <ListItemIcon><TableRowsRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Exportar tabla"/>
        </MenuItem>
      </Menu>
    </>
  );
}
