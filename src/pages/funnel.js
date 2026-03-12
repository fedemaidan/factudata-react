import React, { useState } from 'react';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Tabs, Tab } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import FunnelConversionProductoTab from 'src/components/funnel/FunnelConversionProductoTab';
import FunnelPipelineComercialTab from 'src/components/funnel/FunnelPipelineComercialTab';

const FunnelPage = () => {
  const [currentTab, setCurrentTab] = useState('conversion');

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      <Head>
        <title>Funnel de Conversión</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: { xs: 4, sm: 8 } }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 6 } }}>
          <Stack spacing={{ xs: 2, sm: 3 }}>
            <Typography variant="h4">Funnel de Conversión</Typography>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                maxWidth: '100%',
                '& .MuiTabs-scroller': { overflowX: 'auto !important' },
                '& .MuiTabs-flexContainer': { flexWrap: 'nowrap' },
              }}
            >
              <Tab label="Conversión Producto" value="conversion" />
              <Tab label="Pipeline Comercial" value="pipeline" />
            </Tabs>

            {currentTab === 'conversion' && <FunnelConversionProductoTab />}
            {currentTab === 'pipeline' && <FunnelPipelineComercialTab />}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

FunnelPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default FunnelPage;
