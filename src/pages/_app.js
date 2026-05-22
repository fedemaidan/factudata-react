import React, { useEffect, useState } from 'react';
import Router from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import { CacheProvider } from '@emotion/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { AuthConsumer, AuthProvider, useAuthContext } from 'src/contexts/auth-context';
import { useNProgress } from 'src/hooks/use-nprogress';
import { createTheme } from 'src/theme';
import { createEmotionCache } from 'src/utils/create-emotion-cache';
import { BreadcrumbsProvider } from 'src/contexts/breadcrumbs-context';
import 'simplebar-react/dist/simplebar.min.css';
import 'src/styles/react-datepicker.css';
import 'src/styles/tailwind.css';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider, useAlert } from 'src/contexts/alert-context';

const clientSideEmotionCache = createEmotionCache();

const SplashScreen = () => null;

/**
 * Identifica al usuario logueado en Clarity para poder filtrar
 * grabaciones por usuario / email / empresa desde el panel.
 * Sin esto, Clarity sólo ve sesiones anónimas.
 */
const ClarityIdentifier = () => {
  const { user } = useAuthContext() || {};
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.clarity !== 'function') return;
    if (!user?.id) return;
    try {
      window.clarity('identify', String(user.id), undefined, undefined, user.email || user.name || undefined);
      if (user.email) window.clarity('set', 'email', String(user.email));
      if (user.empresaId) window.clarity('set', 'empresaId', String(user.empresaId));
      if (user.admin) window.clarity('set', 'role', 'admin');
    } catch (_) {}
  }, [user?.id, user?.email, user?.empresaId, user?.admin]);
  return null;
};

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

  // Recuperar de errores de carga de chunks tras un deploy.
  // Firebase Hosting sirve index.html (HTML) cuando se pide un chunk viejo que ya no existe en /out,
  // y el browser revienta con "Unexpected token '<'" al parsearlo como JS.
  useEffect(() => {
    const RELOAD_FLAG = 'sorby-chunk-reloaded-at';
    const isChunkError = (msg, filename) => {
      if (!msg) return false;
      const m = String(msg);
      if (m.includes('ChunkLoadError') || m.includes('Loading chunk') || m.includes('Loading CSS chunk')) {
        return true;
      }
      // SyntaxError típico cuando un chunk devuelve HTML
      if (m.includes("Unexpected token '<'") || m.includes('Unexpected token <')) {
        if (!filename) return true;
        return /\/_next\/static\//.test(filename);
      }
      return false;
    };
    const reloadOnce = () => {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      // si ya recargamos hace menos de 30s, no loopear
      if (Date.now() - last < 30000) return;
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    };

    const onError = (event) => {
      if (isChunkError(event?.message, event?.filename)) reloadOnce();
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      const msg = reason?.message || reason;
      if (isChunkError(msg, reason?.fileName)) reloadOnce();
    };
    const handleRouteError = (err, url) => {
      if (isChunkError(err?.message)) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.href = url;
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    Router.events.on('routeChangeError', handleRouteError);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      Router.events.off('routeChangeError', handleRouteError);
    };
  }, []);

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
      {/*
        Microsoft Clarity — session replay para el dashboard.
        Project ID separado del de la landing (wutf5eai8c).
        strategy="afterInteractive" para no bloquear render.
      */}
      <Script
        id="clarity-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wutikur0d0");
          `,
        }}
      />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AlertProvider>
              <BreadcrumbsProvider>
                <ReactQueryProvider>
                  <ClarityIdentifier />
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
              </BreadcrumbsProvider>
            </AlertProvider>
          </ThemeProvider>
        </AuthProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
};

export default App;
