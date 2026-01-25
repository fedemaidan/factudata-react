import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Typography,
  SvgIcon,
  Tooltip,
  useMediaQuery,
  Button,
  Alert,
  Collapse,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { usePopover } from "src/hooks/use-popover";
import { AccountPopover } from "./account-popover";
import { useAuthContext } from "src/contexts/auth-context";
import { useBreadcrumbs } from "src/contexts/breadcrumbs-context";
import Bars3Icon from "@heroicons/react/24/solid/Bars3Icon";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useRouter } from "next/router";

const SIDE_NAV_WIDTH = 280;
const TOP_NAV_HEIGHT = 64;

export const TopNav = (props) => {
  const { onNavOpen, title, updateAvailable, onUpdateClick, navWidth = SIDE_NAV_WIDTH } = props;
  const { breadcrumbs } = useBreadcrumbs();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const accountPopover = usePopover();
  const { user, isSpying, originalUser } = useAuthContext();
  const credit = user?.credit;
  const requiereCargarDatos =
    user?.firstName == "" || user?.lastName == "" || user?.country == "" || user?.state == "";
  const router = useRouter();

  const handleCompleteAccountData = () => {
    router.push("/account");
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          backdropFilter: "blur(6px)",
          backgroundColor: (theme) => alpha(theme.palette.background.default, 0.8),
          position: "sticky",
          left: { lg: `${navWidth}px` },
          top: 0,
          width: { lg: `calc(100% - ${navWidth}px)` },
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        {/* Barra superior */}
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={2}
          sx={{ minHeight: TOP_NAV_HEIGHT, px: 2 }}
        >
          {/* Lado izquierdo: Menú hamburguesa + Título o Breadcrumbs */}
          <Stack alignItems="center" direction="row" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            {!lgUp && (
              <IconButton onClick={onNavOpen} edge="start">
                <SvgIcon fontSize="small">
                  <Bars3Icon />
                </SvgIcon>
              </IconButton>
            )}
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <Breadcrumbs 
                separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
                sx={{ 
                  '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
                  '& .MuiBreadcrumbs-li': { whiteSpace: 'nowrap' },
                  overflow: 'hidden'
                }}
              >
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return isLast ? (
                    <Typography 
                      key={index} 
                      color="text.primary" 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {crumb.icon}
                      {!lgUp && breadcrumbs.length > 2 ? null : crumb.label}
                    </Typography>
                  ) : (
                    <Link 
                      key={index}
                      underline="hover" 
                      color="inherit" 
                      href={crumb.href}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      }}
                    >
                      {crumb.icon}
                      {lgUp && crumb.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            ) : (
              <Typography 
                variant="h6"
                sx={{
                  fontSize: { xs: '0.9rem', sm: '1.25rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: { xs: '180px', sm: '100%' }
                }}
              >
                {isSpying()
                  ? `${title} - Soy ${user.email}`
                  : title}
              </Typography>
            )}
          </Stack>

          {/* Lado derecho: Acciones + Avatar */}
          <Stack alignItems="center" direction="row" spacing={2}>
            {requiereCargarDatos && (
              <Button
                style={{ textTransform: "none", padding: 0 }}
                onClick={handleCompleteAccountData}
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                <Typography variant="body1" color="primary">
                  Completar datos de la cuenta
                </Typography>
              </Button>
            )}
            <Avatar
              onClick={accountPopover.handleOpen}
              ref={accountPopover.anchorRef}
              sx={{ cursor: "pointer", height: 40, width: 40 }}
              src={user?.avatar}
            />
          </Stack>
        </Stack>

        {/* Banner de actualización */}
        <Collapse in={!!updateAvailable} mountOnEnter unmountOnExit>
          <Alert
            severity="info"
            variant="filled"
            icon={false}
            sx={{
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 1, // finito
            }}
            action={
              <Button color="inherit" size="small" onClick={onUpdateClick}>
                Actualizar
              </Button>
            }
          >
            Hay una nueva versión disponible. Actualizá para ver los últimos cambios.
          </Alert>
        </Collapse>
      </Box>

      <AccountPopover
        anchorEl={accountPopover.anchorRef.current}
        open={accountPopover.open}
        onClose={accountPopover.handleClose}
      />
    </>
  );
};

TopNav.propTypes = {
  onNavOpen: PropTypes.func,
  title: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    href: PropTypes.string,
    icon: PropTypes.node
  })),
  updateAvailable: PropTypes.bool,
  onUpdateClick: PropTypes.func,
  navWidth: PropTypes.number,
};
