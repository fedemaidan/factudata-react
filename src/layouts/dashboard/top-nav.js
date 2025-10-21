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
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { usePopover } from "src/hooks/use-popover";
import { AccountPopover } from "./account-popover";
import { useAuthContext } from "src/contexts/auth-context";
import Bars3Icon from "@heroicons/react/24/solid/Bars3Icon";
import { useRouter } from "next/router";

const SIDE_NAV_WIDTH = 280;
const TOP_NAV_HEIGHT = 64;

export const TopNav = (props) => {
  const { onNavOpen, title, updateAvailable, onUpdateClick } = props; // <-- NUEVO
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
          left: { lg: `${SIDE_NAV_WIDTH}px` },
          top: 0,
          width: { lg: `calc(100% - ${SIDE_NAV_WIDTH}px)` },
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
          <Typography variant="h6">
            {isSpying()
              ? `${title} Soy ${originalUser.email} y estoy espiando a ${user.email}`
              : title}
          </Typography>

          <Stack alignItems="center" direction="row-reverse" spacing={2}>
            {!lgUp && (
              <IconButton onClick={onNavOpen}>
                <SvgIcon fontSize="small">
                  <Bars3Icon />
                </SvgIcon>
              </IconButton>
            )}
          </Stack>

          <Stack alignItems="center" direction="row" spacing={2}>
            {requiereCargarDatos && (
              <Button
                style={{ textTransform: "none", padding: 0 }}
                onClick={handleCompleteAccountData}
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
  updateAvailable: PropTypes.bool,
  onUpdateClick: PropTypes.func,
};
