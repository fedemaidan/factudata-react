// Este componente mejora la vista de remitos
// ✅ Acciones contextualizadas
// ✅ Indicador de duplicado más limpio
// ✅ Mejor estructura y responsividad
// ✅ Filtros por estado y fecha
// ✅ Exportación a Excel

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Collapse,
  Tooltip,
  Menu,
  MenuItem,
  TextField,
  Stack,
  Typography,
  MenuItem as MuiMenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import AcopioService from 'src/services/acopioService';
import { useRouter } from 'next/router';

const RemitosTable = ({ remitos, remitoMovimientos, expanded, setExpanded, router, acopioId, remitosDuplicados, setDialogoEliminarAbierto, setRemitoAEliminar }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRemito, setSelectedRemito] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroNumeroRemito, setFiltroNumeroRemito] = useState('');
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event, remito) => {
    setAnchorEl(event.currentTarget);
    setSelectedRemito(remito.id);
    setSelectedUrl(remito.url_remito[0] || remito.url_remito);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const exportarExcel = () => {
    const data = remitosFiltrados.map(r => ({
      Numero: r.numero_remito,
      Fecha: new Date(r.fecha).toLocaleDateString(),
      Estado: r.estado,
      ValorOperacion: r.valorOperacion,
      Link: r.url_remito
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remitos');
  
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'remitos.xlsx');
  };
  

  const remitosFiltrados = remitos.filter(r => {
    const fecha = new Date(r.fecha);
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const hasta = filtroFechaHasta ? new Date(filtroFechaHasta) : null;
    const coincideEstado = filtroEstado ? r.estado === filtroEstado : true;
    const coincideDesde = desde ? fecha >= desde : true;
    const coincideHasta = hasta ? fecha <= hasta : true;
    const coincideNumero = filtroNumeroRemito
      ? r.numero_remito?.toLowerCase().includes(filtroNumeroRemito.toLowerCase())
      : true;
    return coincideEstado && coincideDesde && coincideHasta && coincideNumero;
  });

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ my: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            label="Estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <MuiMenuItem value="">Todos</MuiMenuItem>
            <MuiMenuItem value="pendiente">Pendiente</MuiMenuItem>
            <MuiMenuItem value="confirmado">Confirmado</MuiMenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Desde"
          type="date"
          value={filtroFechaDesde}
          onChange={(e) => setFiltroFechaDesde(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Hasta"
          type="date"
          value={filtroFechaHasta}
          onChange={(e) => setFiltroFechaHasta(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Buscar número"
          value={filtroNumeroRemito}
          onChange={(e) => setFiltroNumeroRemito(e.target.value)}
        />
        <Button variant="outlined" onClick={exportarExcel}>Exportar Excel</Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => router.push(`/gestionRemito?acopioId=${acopioId}`)}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          Agregar
        </Button>
      </Stack>

      <Table size="small" sx={{ overflowX: 'auto' }}>
        <TableHead>
          <TableRow>
            <TableCell>Número remito</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Valor Operación</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {remitosFiltrados.map((remito) => (
            <React.Fragment key={remito.id}>
              <TableRow
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
                onClick={async () => {
                  if (expanded === remito.id) {
                    setExpanded(null);
                  } else {
                    setExpanded(remito.id);
                    if (!remitoMovimientos[remito.id]) {
                      const movimientos = await AcopioService.obtenerMovimientosDeRemito(acopioId, remito.id);
                      remitoMovimientos[remito.id] = movimientos;
                    }
                  }
                }}
              >
                <TableCell>
                  {remito.numero_remito}
                  {remitosDuplicados.has(remito.id) && (
                    <Tooltip title="Posible duplicado">
                      <Chip label="Duplicado" color="warning" size="small" sx={{ ml: 1 }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{new Date(remito.fecha).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip label={remito.estado} color="default" size="small" />
                </TableCell>
                <TableCell>{remito.valorOperacion?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e) => handleMenuClick(e, remito)}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
                    <MenuItem onClick={() => {
                      router.push(`/gestionRemito?acopioId=${acopioId}&remitoId=${selectedRemito}`);
                      handleCloseMenu();
                    }}>Editar</MenuItem>
                    <MenuItem onClick={() => {
                      setRemitoAEliminar(selectedRemito);
                      setDialogoEliminarAbierto(true);
                      handleCloseMenu();
                    }}>Eliminar</MenuItem>
                    <MenuItem onClick={() => {window.open(selectedUrl, '_blank');}
                    }>Ver</MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} sx={{ p: 0 }}>
                  <Collapse in={expanded === remito.id} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1">Movimientos del Remito</Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Código</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell>Cantidad</TableCell>
                            <TableCell>Valor Unitario</TableCell>
                            <TableCell>Valor Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(remitoMovimientos[remito.id] || []).map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                              <TableCell>{mov.codigo}</TableCell>
                              <TableCell>{mov.descripcion}</TableCell>
                              <TableCell>{mov.cantidad}</TableCell>
                              <TableCell>{mov.valorUnitario?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</TableCell>
                              <TableCell>{mov.valorOperacion?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default RemitosTable;