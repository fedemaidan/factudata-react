import React, { useEffect, useState } from 'react';
import {
  TextField,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Box
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Autocomplete } from '@mui/material';

import AcopioService from 'src/services/acopioService';
import { formatCurrency } from 'src/utils/formatters';

const ProductosFormSelect = ({
  productos = [],
  setProductos,
  valorTotal,              // opcional
  setValorTotal,           // <-- ahora es opcional
  acopioId
}) => {
  const [opcionesMateriales, setOpcionesMateriales] = useState([]);

  useEffect(() => {
    const cargarMateriales = async () => {
      if (!acopioId) return;
      try {
        const materiales = await AcopioService.getMaterialesAcopiados(acopioId);
        setOpcionesMateriales(materiales || []);
      } catch (err) {
        console.error('Error al cargar materiales:', err);
      }
    };
    cargarMateriales();
  }, [acopioId]);

  const safeNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const recalcularTotal = (lista) => {
    const total = (lista || []).reduce(
      (acc, p) => acc + (safeNumber(p.cantidad) * safeNumber(p.valorUnitario)),
      0
    );
    if (typeof setValorTotal === 'function') {
      setValorTotal(total);
    }
  };

  const agregarProducto = () => {
    const next = [...productos, { codigo: '', descripcion: '', cantidad: 1, valorUnitario: 0 }];
    setProductos(next);
    recalcularTotal(next);
  };

  const actualizarProducto = (index, campo, valor) => {
    const nuevos = [...productos];

    if (campo === 'codigo') {
      const seleccionado = opcionesMateriales.find(m => m.codigo === valor);
      if (seleccionado) {
        nuevos[index] = {
          codigo: seleccionado.codigo,
          descripcion: seleccionado.descripcion,
          cantidad: 1,
          valorUnitario: safeNumber(seleccionado.valorUnitario)
        };
      }
    } else if (campo === 'cantidad') {
      nuevos[index].cantidad = safeNumber(valor);
    } else if (campo === 'valorUnitario') {
      nuevos[index].valorUnitario = safeNumber(valor);
    } else {
      nuevos[index][campo] = valor;
    }

    setProductos(nuevos);
    recalcularTotal(nuevos);
  };

  const eliminarProducto = (index) => {
    const nuevos = productos.filter((_, i) => i !== index);
    setProductos(nuevos);
    recalcularTotal(nuevos);
  };

  return (
    <>
      <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell width="140">Código</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell width="100">Cantidad</TableCell>
            <TableCell width="130">V. Unitario</TableCell>
            <TableCell width="100">Total</TableCell>
            <TableCell width="56" />
          </TableRow>
        </TableHead>
        <TableBody>
          {productos.map((prod, index) => (
            <TableRow key={index}>
              <TableCell>
                <Autocomplete
                  freeSolo
                  value={prod.codigo || ''}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      // Texto libre
                      actualizarProducto(index, 'codigo', newValue);
                    } else if (newValue && newValue.codigo) {
                      // Selección de opción
                      actualizarProducto(index, 'codigo', newValue.codigo);
                    }
                  }}
                  onInputChange={(_, newInputValue, reason) => {
                    if (reason === 'input') {
                      actualizarProducto(index, 'codigo', newInputValue);
                    }
                  }}
                  options={opcionesMateriales}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.codigo || '';
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.codigo}>
                      <strong>{option.codigo}</strong>&nbsp;- {option.descripcion}
                    </li>
                  )}
                  renderInput={(params) => <TextField {...params} placeholder="Código" size="small" />}
                  fullWidth
                  size="small"
                />
              </TableCell>

              <TableCell>
                <TextField
                  value={prod.descripcion || ''}
                  onChange={(e) => actualizarProducto(index, 'descripcion', e.target.value)}
                  placeholder="Descripción del material"
                  fullWidth
                  size="small"
                />
              </TableCell>

              <TableCell>
                <TextField
                  type="number"
                  value={prod.cantidad ?? 0}
                  onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  fullWidth
                  size="small"
                />
              </TableCell>

              <TableCell>
                <Tooltip
                  title={`Total línea: ${formatCurrency(safeNumber(prod.valorUnitario) * safeNumber(prod.cantidad))}`}
                  arrow
                >
                  <TextField
                    type="number"
                    value={prod.valorUnitario ?? 0}
                    onChange={(e) => actualizarProducto(index, 'valorUnitario', e.target.value)}
                    inputProps={{ min: 0, step: 'any' }}
                    fullWidth
                    size="small"
                  />
                </Tooltip>
              </TableCell>

              <TableCell align="right">
                <strong>{formatCurrency(safeNumber(prod.valorUnitario) * safeNumber(prod.cantidad))}</strong>
              </TableCell>

              <TableCell align="right">
                <IconButton onClick={() => eliminarProducto(index)} size="small" color="error">
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </Box>
    </>
  );
};

export default ProductosFormSelect;
