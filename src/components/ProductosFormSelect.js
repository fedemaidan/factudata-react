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
  Tooltip
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
      <Button startIcon={<Add />} onClick={agregarProducto} sx={{ mb: 2 }}>
        Agregar material
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
            <TableCell width="120">Cantidad</TableCell>
            <TableCell width="160">Valor Unitario</TableCell>
            <TableCell width="56" />
          </TableRow>
        </TableHead>
        <TableBody>
          {productos.map((prod, index) => (
            <TableRow key={index}>
              <TableCell>
                <Autocomplete
                  value={opcionesMateriales.find(opt => opt.codigo === prod.codigo) || null}
                  onChange={(_, newValue) => {
                    if (newValue) actualizarProducto(index, 'codigo', newValue.codigo);
                  }}
                  options={opcionesMateriales}
                  getOptionLabel={(option) => `${option.codigo} - ${option.descripcion}`}
                  renderInput={(params) => <TextField {...params} label="Material" fullWidth />}
                  fullWidth
                  isOptionEqualToValue={(option, value) => option.codigo === value.codigo}
                />
              </TableCell>

              <TableCell>
                <TextField
                  type="number"
                  value={prod.cantidad ?? 0}
                  onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  fullWidth
                />
              </TableCell>

              <TableCell>
                <Tooltip
                  title={`Total línea: ${formatCurrency(safeNumber(prod.valorUnitario) * safeNumber(prod.cantidad))}`}
                  arrow
                >
                  <span>{formatCurrency(safeNumber(prod.valorUnitario))}</span>
                </Tooltip>
              </TableCell>

              <TableCell align="right">
                <IconButton onClick={() => eliminarProducto(index)} size="small">
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default ProductosFormSelect;
