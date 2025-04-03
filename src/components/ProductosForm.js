import React, { useState } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Button,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import Papa from 'papaparse';

const ProductosForm = ({ productos, setProductos, valorTotal, setValorTotal }) => {

  const [formatoNumerico, setFormatoNumerico] = useState('AR');


  const agregarProducto = () => {
    setProductos([...productos, { codigo: '', descripcion: '', cantidad: 0, valorUnitario: 0 }]);
  };


  const actualizarProducto = (index, campo, valor) => {
    const nuevosProductos = [...productos];
    nuevosProductos[index][campo] = campo === 'cantidad' || campo === 'valorUnitario' ? parseFloat(valor) : valor;
    setProductos(nuevosProductos);
    recalcularTotal(nuevosProductos);
  };

  const eliminarProducto = (index) => {
    const nuevosProductos = productos.filter((_, i) => i !== index);
    setProductos(nuevosProductos);
    recalcularTotal(nuevosProductos);
  };

  const recalcularTotal = (productos) => {
    const total = productos.reduce((acc, p) => acc + (p.cantidad * p.valorUnitario), 0);
    setValorTotal(total);
  };

  const manejarArchivoCSV = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
  
    const texto = await archivo.text();
    const resultado = Papa.parse(texto, {
      header: true,
      skipEmptyLines: true
    });
  
    const nuevosProductos = resultado.data.map(row => {
      return {
        codigo: row['codigo'].trim(),
        descripcion: row['descripcion'] ? row['descripcion'].trim() : row['descripción'].trim(),
        cantidad: parseValorUnitario(parseFloat(row['cantidad']), formatoNumerico),
        valorUnitario: parseValorUnitario(row['valorUnitario'], formatoNumerico)
      };
    });
  
    setProductos(nuevosProductos);
    recalcularTotal(nuevosProductos);
  };
  
  const parseValorUnitario = (valorRaw, formato) => {
    if (!valorRaw) return 0;
    let valor = valorRaw.toString().replace(/\s|"/g, '');

    if (formato === 'AR') {
      valor = valor.replace(/\./g, '').replace(',', '.');
    } else if (formato === 'INT') {
      valor = valor.replace(/,/g, '');
    }

    const parsed = parseFloat(valor);
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <>
      <Button component="label" variant="outlined">
        Cargar productos desde CSV
        <input type="file" accept=".csv" hidden onChange={manejarArchivoCSV} />
      </Button>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Formato numérico del CSV</Typography>
        <Select
          value={formatoNumerico}
          onChange={(e) => setFormatoNumerico(e.target.value)}
        >
          <MenuItem value="AR">Argentina (10.000,50)</MenuItem>
          <MenuItem value="INT">Internacional (10,000.50)</MenuItem>
        </Select>
      </FormControl>


      <Typography variant="h6">Productos</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Código</TableCell>
            <TableCell>Descripción</TableCell>
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
                  value={prod.codigo}
                  onChange={(e) => actualizarProducto(index, 'codigo', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={prod.descripcion}
                  onChange={(e) => actualizarProducto(index, 'descripcion', e.target.value)}
                  fullWidth
                />
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
                  onChange={(e) => actualizarProducto(index, 'valorUnitario', e.target.value)}
                  fullWidth
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

      <Button startIcon={<Add />} onClick={agregarProducto} sx={{ mt: 2 }}>
        Agregar producto
      </Button>
    </>
  );
};

export default ProductosForm;
