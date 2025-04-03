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
  MenuItem
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import AcopioService from 'src/services/acopioService';

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
              <TableCell>
                <TextField
                  select
                  value={prod.codigo}
                  onChange={(e) => actualizarProducto(index, 'codigo', e.target.value)}
                  fullWidth
                >
                  {opcionesMateriales.map((mat) => (
                    <MenuItem key={mat.codigo} value={mat.codigo}>
                      {mat.codigo} - {mat.descripcion}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={prod.cantidad}
                  onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={prod.valorUnitario}
                  fullWidth
                  disabled
                />
              </TableCell>
              <TableCell>
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
