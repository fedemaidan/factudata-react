import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Button } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { MensajesProgramadosTable } from 'src/sections/mensajes-programados/mensajes-programados-table';
import { MensajeProgramadoDialog } from 'src/components/MensajeProgramadoDialog';
import mensajesProgramadosService from 'src/services/mensajesProgramadosService';
import PlusIcon from '@heroicons/react/24/solid/PlusIcon';
import { SvgIcon } from '@mui/material';
import { useAuthContext } from 'src/contexts/auth-context';

const Page = () => {
  const { user } = useAuthContext();
  const [mensajes, setMensajes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMensaje, setCurrentMensaje] = useState(null);

  const fetchMensajes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await mensajesProgramadosService.getMensajes();
      setMensajes(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMensajes();
  }, [fetchMensajes]);

  const handleCreate = () => {
    setCurrentMensaje(null);
    setDialogOpen(true);
  };

  const handleEdit = (mensaje) => {
    setCurrentMensaje(mensaje);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este mensaje programado?')) {
      try {
        await mensajesProgramadosService.deleteMensaje(id);
        fetchMensajes();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (data) => {
    try {
      if (currentMensaje) {
        await mensajesProgramadosService.updateMensaje(currentMensaje._id, data);
      } else {
        await mensajesProgramadosService.createMensaje(data);
      }
      setDialogOpen(false);
      fetchMensajes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Head>
        <title>Mensajes Programados</title>
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
              <Stack spacing={1}>
                <Typography variant="h4">
                  Mensajes Programados
                </Typography>
              </Stack>
              <div>
                <Button
                  startIcon={(
                    <SvgIcon fontSize="small">
                      <PlusIcon />
                    </SvgIcon>
                  )}
                  variant="contained"
                  onClick={handleCreate}
                >
                  Nuevo Mensaje
                </Button>
              </div>
            </Stack>
            <MensajesProgramadosTable
              items={mensajes}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Stack>
        </Container>
      </Box>
      <MensajeProgramadoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        mensaje={currentMensaje}
        currentUser={user}
      />
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
