import React from 'react';
import { Box, Button, Stack, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const reportToSentry = (error, errorInfo, context) => {
  if (typeof window === 'undefined') return;
  const Sentry = window.Sentry;
  if (!Sentry || typeof Sentry.captureException !== 'function') return;
  try {
    Sentry.withScope((scope) => {
      if (context) scope.setTag('boundary', context);
      if (errorInfo?.componentStack) scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });
  } catch (_) {
    // Sentry no disponible o falla al reportar; no debe romper la UI.
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', this.props.context || 'app', error, errorInfo);
    reportToSentry(error, errorInfo, this.props.context);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') this.props.onReset();
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
        : this.props.fallback;
    }

    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, maxWidth: 720, mx: 'auto' }}>
          <Stack spacing={2} alignItems="flex-start">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ErrorOutlineIcon color="error" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Algo salió mal al mostrar esta sección
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Reportamos el error automáticamente. Podés reintentar o recargar la página.
            </Typography>
            {this.state.error?.message && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {String(this.state.error.message).slice(0, 240)}
              </Typography>
            )}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={this.handleReset}>Reintentar</Button>
              <Button variant="outlined" onClick={this.handleReload}>Recargar</Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}

export default ErrorBoundary;
