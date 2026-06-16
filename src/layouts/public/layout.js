import PropTypes from 'prop-types';
import NextLink from 'next/link';
import { Box, Container, Stack, Typography, Chip } from '@mui/material';
import { Logo } from 'src/components/logo';

// Layout público liviano (SIN withAuthGuard): para vistas demo accesibles sin login.
// A diferencia del DashboardLayout, no monta el guard ni el sidebar, así que no redirige
// a /auth/login ni dispara llamadas autenticadas al backend.
export const Layout = (props) => {
  const { children, title, rightSlot } = props;

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="header"
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Container maxWidth="xl" sx={{ py: 1.25 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box component={NextLink} href="/" sx={{ display: 'inline-flex', height: 28, width: 28 }}>
                <Logo />
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>Sorbydata</Typography>
              <Chip size="small" label="demo" color="warning" variant="outlined" />
            </Stack>
            {rightSlot
              ? rightSlot
              : title && <Typography variant="caption" color="text.secondary" noWrap>{title}</Typography>}
          </Stack>
        </Container>
      </Box>
      {children}
    </Box>
  );
};

Layout.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  rightSlot: PropTypes.node,
};
