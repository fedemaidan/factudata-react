import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';
import { Scrollbar } from 'src/components/scrollbar';
import { extraerDataFactura } from 'src/services/extraerService'
export const FacturasTable = (props) => {
  const {
    count = 0,
    items = [],
    onDeselectAll,
    onDeselectOne,
    onPageChange = () => {},
    onRowsPerPageChange,
    onSelectAll,
    onSelectOne,
    page = 0,
    rowsPerPage = 0,
    selected = []
  } = props;

  const selectedSome = (selected.length > 0) && (selected.length < items.length);
  const selectedAll = (items.length > 0) && (selected.length === items.length);
  const [updatedItems, setItems] = useState(items);

  const handleImageClick = (e) => {
    e.preventDefault();
    window.open(e.target.src, '_blank');
  };

  

  const handleCargarDatos = async (factura) => {
    try {
      const data = await extraerDataFactura(factura.filename, factura.id);
      // Actualizar los datos de la factura correspondiente en items
      const updatedItems = updatedItems.map((item) => {
        if (item.id === factura.id) {
          // Actualizar los campos de la factura con los datos extraídos
          return {
            ...item,
            ...data,
            // ...otros campos actualizados
          };
        }
        return item;
      });
      // Actualizar el estado de los items con los datos actualizados
      setItems(updatedItems);
      console.log(updatedItems)
    } catch (error) {
      console.error(error);
      // Manejo de errores
    }
  };

  
  return (
    <Card>
      <Scrollbar>
        <Box sx={{ minWidth: 800 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedAll}
                    indeterminate={selectedSome}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSelectAll?.();
                      } else {
                        onDeselectAll?.();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  Archivo
                </TableCell>
                <TableCell>
                  Tipo
                </TableCell>
                <TableCell>
                  Emisor
                </TableCell>
                <TableCell>
                  Número factura
                </TableCell>
                <TableCell>
                  Condición IVA
                </TableCell>
                <TableCell>
                  Fecha
                </TableCell>
                <TableCell>
                  Neto
                </TableCell>
                <TableCell>
                  IVA 21%
                </TableCell>
                <TableCell>
                  IVA 10.5%
                </TableCell>
                <TableCell>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((factura) => {
                const isSelected = selected.includes(factura.id);

                return (
                  <TableRow
                    hover
                    key={factura.id}
                    selected={isSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            onSelectOne?.(factura.id);
                          } else {
                            onDeselectOne?.(factura.id);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Link to={factura.filename} onClick={handleImageClick}>
                        <img src={factura.filename} alt="Factura" style={{ width: '100px', height: '150px' }} />
                      </Link>
                      <Button onClick={() => handleCargarDatos(factura)}>
                        Cargar datos
                      </Button>
                    </TableCell>
                    <TableCell>
                      {factura.tipo}
                    </TableCell>
                    <TableCell>
                    {factura.nombre_emisor}
                    </TableCell>
                    <TableCell>
                    {factura.numero_factura}
                    </TableCell>
                    <TableCell>
                      {factura.condicion_iva}
                    </TableCell>
                    <TableCell>
                      {factura.fecha}
                    </TableCell>
                    <TableCell>
                      ${ factura.valor_neto_sin_iva ? factura.valor_neto_sin_iva.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : ""}
                    </TableCell>
                    <TableCell>
                      ${ factura.iva_21 ? factura.iva_21.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : ""}
                    </TableCell>
                    <TableCell>
                      ${ factura.iva_10_5 ? factura.iva_10_5.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : ""}
                    </TableCell>
                    <TableCell>
                      ${ factura.total ? factura.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
      {/* <TablePagination
        component="div"
        count={count}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      /> */}
    </Card>
  );
};

FacturasTable.propTypes = {
  count: PropTypes.number,
  items: PropTypes.array,
  onDeselectAll: PropTypes.func,
  onDeselectOne: PropTypes.func,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  onSelectAll: PropTypes.func,
  onSelectOne: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  selected: PropTypes.array
};
