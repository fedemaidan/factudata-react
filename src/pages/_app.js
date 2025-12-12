import React, { useState } from 'react';
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
import 'src/styles/react-datepicker.css';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider, useAlert } from 'src/contexts/alert-context';



const clientSideEmotionCache = createEmotionCache();

const SplashScreen = () => null;

const ReactQueryProvider = ({ children }) => {
  const { notifyError } = useAlert();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            console.error(error);
            notifyError(error);
          },
        }),
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

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
            <AlertProvider>
              <ReactQueryProvider>
                <AuthConsumer>
                  {(auth) =>
                    auth.isLoading ? (
                      <SplashScreen />
                    ) : (
                      getLayout(<Component {...pageProps} />)
                    )
                  }
                </AuthConsumer>
              </ReactQueryProvider>
            </AlertProvider>
          </ThemeProvider>
        </AuthProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
};

export default App;
