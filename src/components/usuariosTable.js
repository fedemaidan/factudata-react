// En src/sections/usuarios/usuarios-table.js
import { Table, TableBody, TableCell, TableHead, TableRow, Checkbox } from '@mui/material';

export const UsuariosTable = ({ items, selected, onSelectOne }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox">
            <Checkbox
              // Controla el checkbox para seleccionar todos los usuarios
            />
          </TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Whatsapp</TableCell>
          <TableCell>Sincronizado</TableCell>
          <TableCell>Método</TableCell>
          <TableCell>Tope</TableCell>
          <TableCell>Rinde gastos a</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            selected={selected.includes(item.id)}
          >
            <TableCell padding="checkbox">
              <Checkbox
                checked={selected.includes(item.id)}
                onChange={(event) => onSelectOne(event, item.id)}
              />
            </TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.whatsapp}</TableCell>
            <TableCell>{item.sincronizado ? 'Sí' : 'No'}</TableCell>
            <TableCell>{item.metodo}</TableCell>
            <TableCell>${item.tope}</TableCell>
            <TableCell>{item.jefe}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
