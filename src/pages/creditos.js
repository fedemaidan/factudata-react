import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Button } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { CreditTable } from 'src/sections/credits/credit-table'; // Asegúrate de importar el componente adecuado
import { getCreditsForUser } from 'src/services/creditService'; // Importar el servicio de créditos
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';

const CreditsPage = () => {
  const [creditsList, setCreditsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuthContext();

  const getCreditsList = async () => {
    try {
      setIsLoading(true);
      const data = await getCreditsForUser(user.id); 
      console.log(data)
      setCreditsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCreditsList();
  }, []);

  return (
    <>
      <Head>
        <title>Créditos</title>
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
            <Typography variant="h4">Mis Créditos</Typography>
            <CreditTable
              items={creditsList}
              isLoading={isLoading}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

CreditsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CreditsPage;
