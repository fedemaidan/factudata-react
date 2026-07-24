import { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import TrabajadorService from 'src/services/dhn/TrabajadorService';

const PAGE_SIZE = 500;
const CAMPOS = ['DNI', 'Apellido', 'Nombres', 'categoria'];

const formatearDni = (dni) =>
  dni ? String(dni).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';

const fetchTodosLosTrabajadores = async () => {
  const acumulados = [];
  for (let i = 0; i < 200; i++) {
    const resp = await TrabajadorService.getAll({ limit: PAGE_SIZE, offset: acumulados.length });
    const items = Array.isArray(resp?.data) ? resp.data : [];
    acumulados.push(...items);
    const total = Number(resp?.total) || acumulados.length;
    if (items.length === 0 || acumulados.length >= total || !resp?.hasMore) break;
  }
  return acumulados;
};

// Mismo formato que dev_tools/dhn/trabajadores.csv: DNI,Apellido,Nombres,categoria
const buildFilas = (trabajadores) =>
  trabajadores.map((t) => ({
    DNI: formatearDni(t.dni),
    Apellido: t.apellido || '',
    Nombres: t.nombre || '',
    categoria: t.categoria || '',
  }));

const ExportarTrabajadoresButton = ({ onError }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (formato) => {
    setAnchorEl(null);
    setExporting(true);
    try {
      const trabajadores = await fetchTodosLosTrabajadores();
      const filas = buildFilas(trabajadores);
      const fecha = new Date().toISOString().split('T')[0];

      if (formato === 'csv') {
        const csv = Papa.unparse({
          fields: CAMPOS,
          data: filas.map((fila) => CAMPOS.map((campo) => fila[campo])),
        });
        saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `trabajadores_${fecha}.csv`);
      } else {
        const worksheet = XLSX.utils.json_to_sheet(filas, { header: CAMPOS });
        worksheet['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 28 }, { wch: 10 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Trabajadores');
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `trabajadores_${fecha}.xlsx`);
      }
    } catch (error) {
      console.error('Error al exportar trabajadores:', error);
      onError?.('No se pudieron exportar los trabajadores');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={exporting}
        sx={{ borderRadius: 2, px: 3, py: 1 }}
      >
        {exporting ? 'Exportando...' : 'Exportar'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 180, mt: 0.5, borderRadius: 2 } } }}
      >
        <MenuItem onClick={() => handleExport('xlsx')}>
          <ListItemIcon><GridOnRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon><TableRowsRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="CSV (.csv)" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportarTrabajadoresButton;
