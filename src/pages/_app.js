import React from 'react';
import Head from 'next/head';
import { CacheProvider } from '@emotion/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { AuthConsumer, AuthProvider } from 'src/contexts/auth-context';
import { useNProgress } from 'src/hooks/use-nprogress';
import { createTheme } from 'src/theme';
import { createEmotionCache } from 'src/utils/create-emotion-cache';
import 'simplebar-react/dist/simplebar.min.css';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { TicketDetails } from 'src/pages/ticketDetails'; // Ajusta la ruta a tu estructura de carpetas
import 'src/styles/react-datepicker.css';



const clientSideEmotionCache = createEmotionCache();

const SplashScreen = () => null;

const App = (props) => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  useNProgress();

  const getLayout = Component.getLayout ?? ((page) => page);

  const theme = createTheme({
    palette: {
      mode: 'light', // Cambia a 'dark' si quieres un tema oscuro
    },
  });
  
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>Sorbydata - Admin</title>
        <meta
          name="viewport"
          content="initial-scale=1, width=device-width"
        />
      </Head>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthConsumer>
              {(auth) =>
                auth.isLoading ? (
                  <SplashScreen />
                ) : (
                  getLayout(<Component {...pageProps} />)
                )
              }
            </AuthConsumer>
           
          </ThemeProvider>
        </AuthProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
};

export default App;
