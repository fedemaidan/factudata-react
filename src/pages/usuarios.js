import { useCallback, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Box, Button, Container, Stack, SvgIcon, Typography, Checkbox, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import ArrowDownOnSquareIcon from '@heroicons/react/24/solid/ArrowDownOnSquareIcon';
import PlusIcon from '@heroicons/react/24/solid/PlusIcon';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import { useSelection } from 'src/hooks/use-selection';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { red, blue, white } from '@mui/material/colors';

// Simulando datos falsos para usuarios
const fakeUsersData = [
  {
    id: 1,
    email: "usuario1@example.com",
    whatsapp: "+541234567890",
    sincronizado: true,
    metodo: "Caja Chica",
    tope: 5000,
    jefe: "Usuario Jefe 1"
  },
  {
    id: 2,
    email: "usuario2@example.com",
    whatsapp: "+541234567891",
    sincronizado: false,
    metodo: "Tarjeta Corporativa",
    tope: 7000,
    jefe: "Usuario Jefe 2"
  },
  {
    id: 3,
    email: "usuario3@marketing.com",
    whatsapp: "+541234567892",
    sincronizado: true,
    metodo: "Caja Chica",
    tope: 6000,
    jefe: "Usuario Jefe Marketing"
  },
  {
    id: 4,
    email: "usuario4@marketing.com",
    whatsapp: "+541234567893",
    sincronizado: false,
    metodo: "Caja Chica",
    tope: 5500,
    jefe: "Usuario Jefe Marketing"
  },
  {
    id: 5,
    email: "usuario5@ventas.com",
    whatsapp: "+541234567894",
    sincronizado: true,
    metodo: "Tarjeta Corporativa",
    tope: 8000,
    jefe: "Usuario Jefe Ventas"
  },
  {
    id: 6,
    email: "usuario6@ventas.com",
    whatsapp: "+541234567895",
    sincronizado: false,
    metodo: "Tarjeta Corporativa",
    tope: 7500,
    jefe: "Usuario Jefe Ventas"
  }
];


const useUsuariosIds = (usuarios) => {
  return usuarios.map((usuario) => usuario.id);
};

const UsuariosTable = ({ items, selected, onSelectOne }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox">
            {/* Placeholder para checkbox de selección múltiple */}
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

const UsuariosPage = () => {
  const [usuariosList, setUsuariosList] = useState(fakeUsersData);
  const usuariosIds = useUsuariosIds(usuariosList);
  const usuariosSelection = useSelection(usuariosIds);

  // Placeholder para acciones como eliminar usuarios, etc.
  const handleDeleteUsuario = async () => {
    // Implementa la lógica para eliminar usuarios seleccionados aquí
  };

  // Considera implementar funciones para cargar usuarios desde un backend,
  // manejar paginación, etc.

  return (
    <>
      <Head>
        <title>Usuarios</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={4}
            >
              <Typography variant="h4">
                Usuarios
              </Typography>
              <Stack direction="row" spacing={2}> {/* Ajusta el espaciado aquí */}
                <Button
                  startIcon={<SvgIcon fontSize="small"><TrashIcon /></SvgIcon>}
                  variant="contained"
                  style={{ backgroundColor: red[700] }}
                  onClick={handleDeleteUsuario}
                  // disabled={usuariosSelection.selected.length === 0} // Asegúrate de que esta propiedad esté activa
                >
                  Borrar ({usuariosSelection.selected.length})
                </Button>
                <Button
                  startIcon={<SvgIcon fontSize="small"><PlusIcon /></SvgIcon>}
                  variant="contained"
                  style={{ backgroundColor: blue[700] }}
                >
                  Agregar
                </Button>
              </Stack>
            </Stack>
            {/* Aquí puedes incluir cualquier otro componente UI como un buscador de usuarios */}
            <UsuariosTable
              items={usuariosList}
              selected={usuariosSelection.selected}
              onSelectOne={usuariosSelection.handleSelectOne}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

UsuariosPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default UsuariosPage;
