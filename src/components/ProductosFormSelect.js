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
  MenuItem,
  Tooltip
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import AcopioService from 'src/services/acopioService';
import { Autocomplete } from '@mui/material';
import { formatCurrency } from 'src/utils/formatters';

const ProductosFormSelect = ({ productos, setProductos, valorTotal, setValorTotal, acopioId }) => {
  const [opcionesMateriales, setOpcionesMateriales] = useState([]);

  useEffect(() => {
    const cargarMateriales = async () => {
      if (!acopioId) return;
      try {
        const materiales = await AcopioService.getMaterialesAcopiados(acopioId);
        setOpcionesMateriales(materiales);
      } catch (err) {
        console.error('Error al cargar materiales:', err);
      }
    };
    cargarMateriales();
  }, [acopioId]);

  const agregarProducto = () => {
    setProductos([...productos, { codigo: '', descripcion: '', cantidad: 0, valorUnitario: 0 }]);
  };

  const actualizarProducto = (index, campo, valor) => {
    const nuevos = [...productos];

    if (campo === 'codigo') {
      const seleccionado = opcionesMateriales.find(m => m.codigo === valor);
      console.log(seleccionado)
      if (seleccionado) {
        nuevos[index] = {
          codigo: seleccionado.codigo,
          descripcion: seleccionado.descripcion,
          cantidad: 1,
          valorUnitario: seleccionado.valorUnitario || 0
        };
      }
    } else {
      nuevos[index][campo] = campo === 'cantidad' ? parseFloat(valor) : valor;
    }

    setProductos(nuevos);
    recalcularTotal(nuevos);
  };

  const eliminarProducto = (index) => {
    const nuevos = productos.filter((_, i) => i !== index);
    setProductos(nuevos);
    recalcularTotal(nuevos);
  };

  const recalcularTotal = (lista) => {
    const total = lista.reduce((acc, p) => acc + (p.cantidad * p.valorUnitario), 0);
    setValorTotal(total);
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
            <TableCell>Cantidad</TableCell>
            <TableCell>Valor Unitario</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {productos.map((prod, index) => (
            <TableRow key={index}>
                <TableCell sx={{ width: '80%' }}>
                <Autocomplete
                  value={opcionesMateriales.find(opt => opt.codigo === prod.codigo) || null}
                  onChange={(event, newValue) => {
                    if (newValue) {
                      actualizarProducto(index, 'codigo', newValue.codigo);
                    }
                  }}
                  options={opcionesMateriales}
                  getOptionLabel={(option) =>
                    option.codigo + ' - ' + option.descripcion
                  }
                  renderInput={(params) => <TextField {...params} label="Material" fullWidth />}
                  fullWidth
                  isOptionEqualToValue={(option, value) => option.codigo === value.codigo}
                />
              </TableCell>

              <TableCell sx={{ width: '5%' }}>
                <TextField
                  type="number"
                  value={prod.cantidad}
                  onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell sx={{ width: '13%' }}>
               <Tooltip title={`Total: ${formatCurrency(prod.valorUnitario * prod.cantidad)}`} arrow>
                  {formatCurrency(prod.valorUnitario)}
                </Tooltip>
              </TableCell>
              <TableCell sx={{ width: '2%' }}>

                <IconButton onClick={() => eliminarProducto(index)}>
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
